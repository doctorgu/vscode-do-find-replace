import assert from "assert";
import sinon from "sinon";
import vscode from "vscode";

import { escapeRegexp } from "../../../utils";

export { trimmed } from "./trimmed";

/**
 * Get a selection range spanning the whole document
 */
function getWholeDocumentRange(document: vscode.TextDocument): vscode.Range {
  const firstLine = document.lineAt(0);
  const lastLine = document.lineAt(document.lineCount - 1);
  return new vscode.Range(firstLine.range.start, lastLine.range.end);
}

/**
 * Set editor text
 */
export function setEditorText(
  editor: vscode.TextEditor,
  edit: vscode.TextEditorEdit,
  text: string
): void;
export function setEditorText(
  editor: vscode.TextEditor,
  text: string
): Thenable<void>;
export function setEditorText(
  editor: vscode.TextEditor,
  editOrText: vscode.TextEditorEdit | string,
  optionalText?: string
): void | Thenable<void> {
  if (typeof editOrText === "string") {
    const text = editOrText;
    return editor
      .edit((edit) => {
        setEditorText(editor, edit, text);
      })
      .then(() => {});
  } else {
    const edit = editOrText;
    const text = optionalText!;
    edit.replace(getWholeDocumentRange(editor.document), text);
  }
}

/**
 * Run the given callback with emulated `vscode.window.showInputBox`
 *
 * @param expectedOptions Expected options of `vscode.window.showInputBox`
 * @param value Text to enter into the emulated input box
 * @param cb
 */
export async function withInputBox(
  expectedOptions: sinon.SinonMatcher,
  value: string | undefined,
  cb: () => void | Thenable<void>
): Promise<void> {
  // Sinon doesn't allow to bind two stubs to a single function by design.
  // https://stackoverflow.com/questions/42404854/possible-to-stub-method-twice-within-a-single-test-to-return-different-results
  //
  //const showInputBox = sinon.stub(vscode.window, 'showInputBox');
  //try {
  //  showInputBox.resolves(findText);
  //
  //  await cb();
  //
  //  sinon.assert.calledOnce(showInputBox);
  //  if (options !== undefined)
  //    sinon.assert.calledWith(showInputBox, options);
  //}
  //finally {
  //  showInputBox.restore();
  //}

  let called = false;
  let options: vscode.InputBoxOptions | undefined;

  const original = vscode.window.showInputBox;
  vscode.window.showInputBox = (_options) => {
    called = true;
    options = _options;
    vscode.window.showInputBox = original;
    return Promise.resolve(value);
  };
  try {
    await cb();
    // IMPORTANT: Make assertions here rather than inside the overridden `showInputBox`. The `showInputBox` function is
    // expected to be called from the given `cb`, which isn't under out control and which might swallow assertion error,
    // causing tests to pass even if assertion checks fail.
    assert.ok(called, "Expected showInputBox to have been called exactly once");
    sinon.assert.match(options, expectedOptions);
  } finally {
    if (!called) vscode.window.showInputBox = original;
  }
}

/**
 * Call this method after invoking the extension to wait until the extension finishes its work.
 *
 * The fact that the extension uses `vscode.commands.executeCommand` inside seems to cause race conditions
 * between the extension and the extension host running somewhere inside VS Code.  Somehow they get different
 * idea of the active text editor, and the extension host rejects the request to execute a command because,
 * in its opinion, there is no active text editor.
 *
 * The extension can't do without `vscode.commands.executeCommand` inside, because due to the use of an
 * interactive input box the extension's code is asynchronous, and the `edit` object is only valid during
 * command callback execution.
 *
 * Change 200ms to something less like 10ms to watch tests fail.
 */
export function untilStable(): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, 200);
  });
}

export type FindReplaceCommand =
  | "findReplace.replaceList"
  | "findReplace.includeMatched"
  | "findReplace.includeMatchedGroup";

/**
 * Invoke one of "Find Replace" commands
 */
export async function invokeFindReplace(
  command: FindReplaceCommand,
  findText: string | undefined
): Promise<void>;
export async function invokeFindReplace(
  command: FindReplaceCommand,
  findTextOptions: sinon.SinonMatcher,
  findText: string | undefined
): Promise<void>;
export async function invokeFindReplace(
  command: FindReplaceCommand,
  findTextOptionsOrFindText: sinon.SinonMatcher | string | undefined,
  optionalFindText?: string | undefined
): Promise<void> {
  let findTextOptions: sinon.SinonMatcher;
  let findText: string | undefined;
  if (
    typeof findTextOptionsOrFindText === "string" ||
    findTextOptionsOrFindText == null
  ) {
    findTextOptions = sinon.match.any;
    findText = findTextOptionsOrFindText;
  } else {
    findTextOptions = findTextOptionsOrFindText;
    findText = optionalFindText;
  }

  await withInputBox(findTextOptions, findText, async () => {
    await vscode.commands.executeCommand(command);
    if (findText != null) await untilStable();
  });
}

/**
 * Returns the document position specified by the search string `needle`.
 *
 * The search string is any string with '|' marker.
 *
 * For example, given a document with the following content:
 *
 *   abc
 *   def
 *
 * the call to `findPosition('de|f') will return Position(line=1, character=2).
 */
export function findPosition(
  document: vscode.TextDocument,
  needle: string
): vscode.Position {
  const markerPos = needle.indexOf("|");
  if (markerPos < 0)
    throw new Error(
      `Expected the search string '${needle}' to contain marker '|'`
    );

  const position = findPositionRaw(
    document,
    needle.substring(0, markerPos) + needle.substring(markerPos + 1)
  );
  return position.translate({ characterDelta: markerPos });
}

/**
 * Returns the position of the given search string in the document.
 */
export function findPositionRaw(
  document: vscode.TextDocument,
  needle: string
): vscode.Position {
  // Compile the search string to regexp for hopefully better performance.
  const re = new RegExp(escapeRegexp(needle), "g");

  for (let lineno = 0; lineno < document.lineCount; ++lineno) {
    const line = document.lineAt(lineno);
    const text = document.getText(line.range);
    const match = re.exec(text);
    if (match) return new vscode.Position(lineno, match.index);
  }

  throw new Error(`Not found: ${needle}`);
}

/**
 * Close the active editor
 */
export async function closeEditor() {
  await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
}

/**
 * Open a new blank editor
 */
export async function openEditor(): Promise<vscode.TextEditor> {
  const doc = await vscode.workspace.openTextDocument();
  const editor = await vscode.window.showTextDocument(doc);
  return editor;
}

export async function reopenEditor(): Promise<vscode.TextEditor> {
  await closeEditor();
  const editor = await openEditor();
  return editor;
}
