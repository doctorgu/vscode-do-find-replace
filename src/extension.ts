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

interface ReplaceLinesArgs {
  searchAndReplace: Map<string, string>;
}

interface FindReplaceArgs {
  output_type?: OutputType;
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
        const { searchAndReplace = new Map<string, string>() } =
          (args as ReplaceLinesArgs) || {};
        const registry = DI.getRegistry(extensionContext);
        replaceText(registry, editor, edit, searchAndReplace);
      })
    ),
    vscode.commands.registerTextEditorCommand(
      "findReplace.filterText",
      catchErrors((editor, edit, args) => {
        const { output_type = "matched", needle = "" } =
          (args as FindReplaceArgs) || {};
        const registry = DI.getRegistry(extensionContext);
        filterText(registry, editor, edit, needle, output_type);
      })
    )
  );
}

function getSearchAndReplace(searchText: string): Map<string, string> {
  function encode(value: string) {
    return value.replace(/,,/g, "&comma;").replace(/::/g, "&colon;");
  }
  function decode(value: string) {
    return value.replace(/&comma;/g, ",").replace(/&colon;/g, ":");
  }

  let map = new Map<string, string>();
  if (!searchText) return map;

  // Row delimeter is comma when user input, line separator when file.
  let rowDelim = /,/;
  try {
    const workspaceFolder = getWorkspaceFolder();
    const folder =
      !searchText.includes(":") && !!workspaceFolder
        ? `${workspaceFolder}/${searchText}`
        : searchText;
    const valueInFile = fs.readFileSync(folder, "utf-8");
    searchText = valueInFile;
    rowDelim = /\r*\n/;
  } catch (ex) {
    console.log(ex);
  }

  const kvList = [];
  const value = encode(searchText);
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
  const searchText = await promptForSearchText(registry, editor, outputType);
  if (searchText == null) return;

  if (registry.configuration.get("preserveSearch"))
    registry.searchStorage.set("latestSearch", searchText);

  if (outputType === "replace") {
    let searchAndReplace = new Map<string, string>();
    try {
      searchAndReplace = getSearchAndReplace(searchText);
    } catch (ex: any) {
      vscode.window.showErrorMessage(`${ex?.name}, ${ex?.message}`);
      return;
    }
    const args: ReplaceLinesArgs = {
      searchAndReplace,
    };
    vscode.commands.executeCommand("findReplace.replaceText", args);
  } else {
    const args: FindReplaceArgs = {
      output_type: outputType,
      needle: searchText,
    };
    vscode.commands.executeCommand("findReplace.filterText", args);
  }
}

function promptForSearchText(
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

  let searchText = registry.configuration.get("preserveSearch")
    ? registry.searchStorage.get("latestSearch")
    : "(?gm)";

  return vscode.window.showInputBox({
    prompt,
    value: searchText,
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

function constructSearchRegExp(
  config: IConfiguration<ExtensionSettings>,
  searchText: string
): RegExp {
  if (!/^\(\?([gmiyusd]+)\)/.test(searchText)) {
    const defaultFlags = "gm";
    return new RegExp(searchText, defaultFlags);
  }

  const ret = /^\(\?([gmiyusd]+)\)(.+)/.exec(searchText);
  if (!ret) {
    throw new Error(`Wrong searchText: ${searchText}`);
  }

  const flags = ret[1];
  const pattern = ret[2];

  return new RegExp(pattern, flags);
}

async function replaceText(
  registry: IDependencyRegistry,
  editor: vscode.TextEditor,
  edit: vscode.TextEditorEdit,
  searchAndReplace: Map<string, string>
) {
  const config = registry.configuration;

  const text = getSelectedOrAll(editor);

  let textNew = text;
  for (let [toSearch, toReplace] of searchAndReplace) {
    const re = constructSearchRegExp(config, toSearch);
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
  searchText: string,
  outputType: OutputType
) {
  const config = registry.configuration;

  const re = constructSearchRegExp(config, searchText);

  const founds: string[] = [];

  const text = getSelectedOrAll(editor);

  for (let m = re.exec(text); (m = re.exec(text)); m !== null) {
    let text = "";
    switch (outputType) {
      case "matched":
      case "group":
        if (outputType === "matched") {
          text = m[0];
        } else if (outputType === "group") {
          text = m.slice(1, m.length).join("\n");
        }
        break;
      default:
        throw new Error(`Wrong outputType: ${outputType}`);
    }

    founds.push(text);
  }

  const doc = await vscode.workspace.openTextDocument({
    language: editor.document.languageId,
    content: founds.join(""),
  });
  await vscode.window.showTextDocument(doc);
}
