import vscode from "vscode";
import fs from "fs";

import { escapeRegexp, getWorkspaceFolder, catchErrors } from "./utils";
import {
  IDependencyRegistry,
  ExtensionSettings,
  DependencyRegistry,
} from "./di";
import { IConfiguration } from "./configuration";

type OutputType = "matched" | "group" | "replace";

interface PromptFindReplaceArgs {
  output_type?: OutputType;
}

interface ReplaceTextArgs {
  flags: string;
  findAndReplace: Map<string, string>;
}

interface FindTextArgs {
  output_type?: OutputType;
  flags: string;
  find: string;
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
      "findReplace.replaceList",
      catchErrors((editor, edit, args) => {
        const args_: PromptFindReplaceArgs = {
          output_type: "replace",
        };
        vscode.commands.executeCommand("findReplace.promptFindReplace", args_);
      })
    ),
    vscode.commands.registerTextEditorCommand(
      "findReplace.includeMatched",
      catchErrors((editor, edit, args) => {
        const args_: PromptFindReplaceArgs = {
          output_type: "matched",
        };
        vscode.commands.executeCommand("findReplace.promptFindReplace", args_);
      })
    ),
    vscode.commands.registerTextEditorCommand(
      "findReplace.includeMatchedGroup",
      catchErrors((editor, edit, args) => {
        const args_: PromptFindReplaceArgs = {
          output_type: "group",
        };
        vscode.commands.executeCommand("findReplace.promptFindReplace", args_);
      })
    ),

    vscode.commands.registerTextEditorCommand(
      "findReplace.promptFindReplace",
      catchErrors((editor, edit, args) => {
        const { output_type = "matched" } =
          (args as PromptFindReplaceArgs) || {};
        const registry = DI.getRegistry(extensionContext);
        promptFindReplace(registry, editor, edit, output_type).then();
      })
    ),

    vscode.commands.registerTextEditorCommand(
      "findReplace.replaceText",
      catchErrors((editor, edit, args) => {
        const { flags, findAndReplace } = (args as ReplaceTextArgs) || {};
        const registry = DI.getRegistry(extensionContext);
        replaceText(registry, editor, edit, flags, findAndReplace);
      })
    ),
    vscode.commands.registerTextEditorCommand(
      "findReplace.filterText",
      catchErrors((editor, edit, args) => {
        const {
          flags,
          find,
          output_type = "matched",
        } = (args as FindTextArgs) || {};
        const registry = DI.getRegistry(extensionContext);
        filterText(registry, editor, edit, flags, find, output_type);
      })
    )
  );
}

function getFindAndReplace(find: string): Map<string, string> {
  function encode(value: string) {
    return value.replace(/,,/g, "&comma;").replace(/::/g, "&colon;");
  }
  function decode(value: string) {
    return value.replace(/&comma;/g, ",").replace(/&colon;/g, ":");
  }

  let map = new Map<string, string>();
  if (!find) return map;

  // Row delimeter is comma when user input, line separator when file.
  let rowDelim = /,/;
  try {
    const workspaceFolder = getWorkspaceFolder();
    const folder =
      !find.includes(":") && !!workspaceFolder
        ? `${workspaceFolder}/${find}`
        : find;
    const valueInFile = fs.readFileSync(folder, "utf-8");
    find = valueInFile;
    rowDelim = /\r*\n/;
  } catch (ex) {
    console.log(ex);
  }

  const kvList = [];
  const value = encode(find);
  const rows = value.split(rowDelim);
  for (let rw = 0; rw < rows.length; rw += 1) {
    const [k, v] = rows[rw].split(":");
    if (k && v) {
      const key = decode(k);
      const value = decode(v);
      kvList.push([key, value]);
    }
  }

  const keyValues = kvList.sort(([a], [b]) => a.localeCompare(b)).reverse();
  map = new Map(keyValues as [string, string][]);
  return map;
}

async function promptFindReplace(
  registry: IDependencyRegistry,
  editor: vscode.TextEditor,
  edit: vscode.TextEditorEdit,
  outputType: OutputType
): Promise<void> {
  const input = await promptForFindText(registry, editor, outputType);
  if (input == null) return;

  const { flags, find } = getFlagsAndFind(input);

  if (registry.configuration.get("preserveSearch"))
    registry.searchStorage.set("latestSearch", input);

  if (outputType === "replace") {
    let findAndReplace = new Map<string, string>();
    try {
      findAndReplace = getFindAndReplace(find);
    } catch (ex: any) {
      vscode.window.showErrorMessage(`${ex?.name}, ${ex?.message}`);
      return;
    }
    const args: ReplaceTextArgs = {
      flags,
      findAndReplace,
    };
    vscode.commands.executeCommand("findReplace.replaceText", args);
  } else {
    const args: FindTextArgs = {
      output_type: outputType,
      flags,
      find,
    };
    vscode.commands.executeCommand("findReplace.filterText", args);
  }
}

function promptForFindText(
  registry: IDependencyRegistry,
  editor: vscode.TextEditor,
  outputType: OutputType
): Thenable<string | undefined> {
  let prompt = "";
  if (outputType === "replace") {
    prompt = `List of Search and replace. Use two comma or colon to escape (ex: 'a:1,b:2,c::c:3,,000')`;
  } else {
    prompt = `Filter ${
      (outputType === "matched" && "matching") ||
      (outputType === "group" && "matching group")
    }: `;
  }

  let findText =
    (registry.configuration.get("preserveSearch") &&
      registry.searchStorage.get("latestSearch")) ||
    "(?gm)";

  return vscode.window.showInputBox({
    prompt,
    value: findText,
  });
}

function getSelectedOrAll(editor: vscode.TextEditor): string {
  let text = editor.document.getText(editor.selection);
  if (!text) {
    const firstLine = editor.document.lineAt(0);
    const lastLine = editor.document.lineAt(editor.document.lineCount - 1);
    const textRange = new vscode.Range(
      firstLine.range.start,
      lastLine.range.end
    );
    text = editor.document.getText(textRange);
  }
  return text;
}

function getFlagsAndFind(
  findText: string,
  defaultFlags = "gm"
): { flags: string; find: string } {
  const re = /^\(\?([gmiyusd]+)\)(.+)/;
  if (!re.test(findText)) {
    return { flags: defaultFlags, find: findText };
  }

  const ret = re.exec(findText);
  if (!ret) {
    throw new Error(`Wrong findText: ${findText}`);
  }

  const flags = ret[1];
  const find = ret[2];

  return { flags, find };
}

async function replaceText(
  registry: IDependencyRegistry,
  editor: vscode.TextEditor,
  edit: vscode.TextEditorEdit,
  flags: string,
  findAndReplace: Map<string, string>
) {
  const text = getSelectedOrAll(editor);

  let textNew = text;
  for (let [toSearch, toReplace] of findAndReplace) {
    const { flags: flagsCur, find } = getFlagsAndFind(toSearch, flags);
    const re = new RegExp(find, flagsCur);
    textNew = textNew.replace(re, toReplace);
  }

  const doc = await vscode.workspace.openTextDocument({
    language: editor.document.languageId,
    content: textNew,
  });
  await vscode.window.showTextDocument(doc);
}

async function filterText(
  registry: IDependencyRegistry,
  editor: vscode.TextEditor,
  edit: vscode.TextEditorEdit,
  flags: string,
  find: string,
  outputType: OutputType
) {
  const re = new RegExp(find, flags);

  const founds: string[] = [];

  const text = getSelectedOrAll(editor);

  let m: RegExpExecArray | null = null;
  while ((m = re.exec(text)) !== null) {
    let found = "";
    switch (outputType) {
      case "matched":
      case "group":
        if (outputType === "matched") {
          found = m[0];
        } else if (outputType === "group") {
          found = m.slice(1, m.length).join("\n");
        }
        break;
      default:
        throw new Error(`Wrong outputType: ${outputType}`);
    }

    founds.push(found);

    if (!re.flags.includes("g")) break;
  }

  const doc = await vscode.workspace.openTextDocument({
    language: editor.document.languageId,
    content: founds.join("\n"),
  });
  await vscode.window.showTextDocument(doc);
}
