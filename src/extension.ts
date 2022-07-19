import vscode from "vscode";

import { escapeRegexp, catchErrors } from "./utils";
import {
  IDependencyRegistry,
  ExtensionSettings,
  DependencyRegistry,
} from "./di";
import { IConfiguration } from "./configuration";

type OutputType = "matched" | "group" | "line";

interface PromptFilterLinesArgs {
  output_type?: OutputType;
  invert_search?: boolean;
}

interface FilterLinesArgs {
  output_type?: OutputType;
  invert_search?: boolean;
  needle: string;
}

export const DI = {
  /* istanbul ignore next */
  getRegistry(context: vscode.ExtensionContext): IDependencyRegistry {
    return new DependencyRegistry(context);
  },
};

export function activate(
  this: void,
  extensionContext: vscode.ExtensionContext
) {
  extensionContext.subscriptions.push(
    // Provide wrapper commands to be bound in package.json > "contributes" > "commands".
    // If one command is bound several times with different "args", VS Code only displays the last entry in the Ctrl-Shift-P menu.
    vscode.commands.registerTextEditorCommand(
      "filterlines.includeMatched",
      catchErrors((editor, edit, args) => {
        const args_: PromptFilterLinesArgs = {
          invert_search: false,
          output_type: "matched",
        };
        vscode.commands.executeCommand("filterlines.promptFilterLines", args_);
      })
    ),
    vscode.commands.registerTextEditorCommand(
      "filterlines.includeMatchedGroup",
      catchErrors((editor, edit, args) => {
        const args_: PromptFilterLinesArgs = {
          invert_search: false,
          output_type: "group",
        };
        vscode.commands.executeCommand("filterlines.promptFilterLines", args_);
      })
    ),
    vscode.commands.registerTextEditorCommand(
      "filterlines.includeLine",
      catchErrors((editor, edit, args) => {
        const args_: PromptFilterLinesArgs = {
          invert_search: false,
          output_type: "line",
        };
        vscode.commands.executeCommand("filterlines.promptFilterLines", args_);
      })
    ),

    vscode.commands.registerTextEditorCommand(
      "filterlines.promptFilterLines",
      catchErrors((editor, edit, args) => {
        const { output_type = "matched", invert_search = false } =
          (args as PromptFilterLinesArgs) || {};
        const registry = DI.getRegistry(extensionContext);
        promptFilterLines(
          registry,
          editor,
          edit,
          output_type,
          invert_search
        ).then();
      })
    ),

    vscode.commands.registerTextEditorCommand(
      "filterlines.filterLines",
      catchErrors((editor, edit, args) => {
        const {
          output_type = "matched",
          invert_search = false,
          needle = "",
        } = (args as FilterLinesArgs) || {};
        const registry = DI.getRegistry(extensionContext);
        filterLines(registry, editor, edit, needle, output_type, invert_search);
      })
    )
  );
}

async function promptFilterLines(
  registry: IDependencyRegistry,
  editor: vscode.TextEditor,
  edit: vscode.TextEditorEdit,
  outputType: OutputType,
  invertSearch: boolean
): Promise<void> {
  const searchText = await promptForSearchText(
    registry,
    editor,
    outputType,
    invertSearch
  );
  if (searchText == null) return;

  if (registry.configuration.get("preserveSearch"))
    registry.searchStorage.set("latestSearch", searchText);

  const args: FilterLinesArgs = {
    output_type: outputType,
    invert_search: invertSearch,
    needle: searchText,
  };
  vscode.commands.executeCommand("filterlines.filterLines", args);
}

function promptForSearchText(
  registry: IDependencyRegistry,
  editor: vscode.TextEditor,
  outputType: OutputType,
  invertSearch: boolean
): Thenable<string | undefined> {
  const prompt = `Filter ${invertSearch ? "not " : ""}${
    (outputType === "matched" && "matching") ||
    (outputType === "group" && "matching group") ||
    (outputType === "line" && "matching line")
  }: `;

  let searchText = registry.configuration.get("preserveSearch")
    ? registry.searchStorage.get("latestSearch")
    : "";
  if (!searchText) {
    // Use word under cursor
    const wordRange = editor.document.getWordRangeAtPosition(
      editor.selection.active
    );
    if (wordRange) searchText = editor.document.getText(wordRange);
  }

  return vscode.window.showInputBox({
    prompt,
    value: searchText,
  });
}

async function filterLines(
  registry: IDependencyRegistry,
  editor: vscode.TextEditor,
  edit: vscode.TextEditorEdit,
  searchText: string,
  outputType: OutputType,
  invertSearch: boolean
) {
  const config = registry.configuration;
  const lineNumbers = config.get("lineNumbers");

  const re = constructSearchRegExp(config, searchText, outputType);

  const matchingLines: number[] = [];
  const texts: string[] = [];
  for (let lineno = 0; lineno < editor.document.lineCount; ++lineno) {
    const lineText = editor.document.lineAt(lineno).text;
    const ret = re.exec(lineText);
    if (!!ret !== invertSearch) {
      // Put context lines into `matchingLines`
      matchingLines.push(lineno);

      const regRet: RegExpExecArray = ret as RegExpExecArray;
      let text = "";
      switch (outputType) {
        case "matched":
          text = regRet[0];
          break;
        case "group":
          text = regRet.slice(1, regRet.length).join("\n");
          break;
        case "line":
          text = editor.document.lineAt(lineno).text;
          break;
        default:
          throw new Error(`Wrong outputType: ${outputType}`);
      }

      texts.push(text);
    }
  }

  const content: string[] = [];
  for (let i = 0; i < matchingLines.length; i += 1) {
    const lineno = matchingLines[i];
    const text = texts[i];

    formatLine(editor, lineno, null, lineNumbers, text, content);
    content.push("\n");
  }

  const doc = await vscode.workspace.openTextDocument({
    language: editor.document.languageId,
    content: content.join(""),
  });
  await vscode.window.showTextDocument(doc);
}

function constructSearchRegExp(
  config: IConfiguration<ExtensionSettings>,
  searchText: string,
  outputType: OutputType
): RegExp {
  let flags = "";
  if (!config.get("caseSensitiveRegexSearch")) flags += "i";
  return new RegExp(searchText, flags);
}

function formatLine(
  editor: vscode.TextEditor,
  lineno: number,
  indentation: string | null,
  lineNumbers: boolean,
  text: string,
  acc: string[]
): void {
  if (indentation) acc.push(indentation);
  if (lineNumbers) acc.push(formatLineNumber(lineno));
  acc.push(text);
}

function formatLineNumber(lineno: number): string {
  return `${String(lineno).padStart(5)}: `;
}

function getIndentation(editor: vscode.TextEditor): string {
  return editor.options.insertSpaces
    ? " ".repeat(editor.options.tabSize as number)
    : "\t";
}
