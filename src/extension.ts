import vscode from "vscode";
import fs from "fs";

import { escapeRegexp, getWorkspaceFolder, catchErrors } from "./utils";
import {
  IDependencyRegistry,
  ExtensionSettings,
  DependencyRegistry,
} from "./di";
import { IConfiguration } from "./configuration";

type OutputType = "matched" | "group" | "line" | "replace";

interface PromptFilterLinesArgs {
  output_type?: OutputType;
}

interface ReplaceLinesArgs {
  searchAndReplace: Map<string, string>;
}

interface FilterLinesArgs {
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
      "filterlines.replaceList",
      catchErrors((editor, edit, args) => {
        const args_: PromptFilterLinesArgs = {
          output_type: "replace",
        };
        vscode.commands.executeCommand("filterlines.promptFilterLines", args_);
      })
    ),
    vscode.commands.registerTextEditorCommand(
      "filterlines.includeMatched",
      catchErrors((editor, edit, args) => {
        const args_: PromptFilterLinesArgs = {
          output_type: "matched",
        };
        vscode.commands.executeCommand("filterlines.promptFilterLines", args_);
      })
    ),
    vscode.commands.registerTextEditorCommand(
      "filterlines.includeMatchedGroup",
      catchErrors((editor, edit, args) => {
        const args_: PromptFilterLinesArgs = {
          output_type: "group",
        };
        vscode.commands.executeCommand("filterlines.promptFilterLines", args_);
      })
    ),
    vscode.commands.registerTextEditorCommand(
      "filterlines.includeLine",
      catchErrors((editor, edit, args) => {
        const args_: PromptFilterLinesArgs = {
          output_type: "line",
        };
        vscode.commands.executeCommand("filterlines.promptFilterLines", args_);
      })
    ),

    vscode.commands.registerTextEditorCommand(
      "filterlines.promptFilterLines",
      catchErrors((editor, edit, args) => {
        const { output_type = "matched" } =
          (args as PromptFilterLinesArgs) || {};
        const registry = DI.getRegistry(extensionContext);
        promptFilterLines(registry, editor, edit, output_type).then();
      })
    ),

    vscode.commands.registerTextEditorCommand(
      "filterlines.replaceLines",
      catchErrors((editor, edit, args) => {
        const { searchAndReplace = new Map<string, string>() } =
          (args as ReplaceLinesArgs) || {};
        const registry = DI.getRegistry(extensionContext);
        replaceLines(registry, editor, edit, searchAndReplace);
      })
    ),
    vscode.commands.registerTextEditorCommand(
      "filterlines.filterLines",
      catchErrors((editor, edit, args) => {
        const { output_type = "matched", needle = "" } =
          (args as FilterLinesArgs) || {};
        const registry = DI.getRegistry(extensionContext);
        filterLines(registry, editor, edit, needle, output_type);
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

async function promptFilterLines(
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
    vscode.commands.executeCommand("filterlines.replaceLines", args);
  } else {
    const args: FilterLinesArgs = {
      output_type: outputType,
      needle: searchText,
    };
    vscode.commands.executeCommand("filterlines.filterLines", args);
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
      (outputType === "group" && "matching group") ||
      (outputType === "line" && "matching line")
    }: `;
  }

  let searchText = registry.configuration.get("preserveSearch")
    ? registry.searchStorage.get("latestSearch")
    : "";
  // if (!searchText) {
  //   // Use word under cursor
  //   const wordRange = editor.document.getWordRangeAtPosition(
  //     editor.selection.active
  //   );
  //   if (wordRange) searchText = editor.document.getText(wordRange);
  // }

  return vscode.window.showInputBox({
    prompt,
    value: searchText,
  });
}

function getSelectedOrAll(editor: vscode.TextEditor): string[] {
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
  const lines = text.split(/\r*\n/);
  return lines;
}

async function filterLines(
  registry: IDependencyRegistry,
  editor: vscode.TextEditor,
  edit: vscode.TextEditorEdit,
  searchText: string,
  outputType: OutputType
) {
  const config = registry.configuration;
  const lineNumbers = config.get("lineNumbers");

  const re = constructSearchRegExp(config, searchText, outputType);

  const matchingLines: number[] = [];
  const texts: string[] = [];

  const lines = getSelectedOrAll(editor);

  for (let lineno = 0; lineno < lines.length; ++lineno) {
    const lineText = lines[lineno];

    const ret = re.exec(lineText);
    if (!ret) {
      continue;
    }

    matchingLines.push(lineno);

    let text = "";
    switch (outputType) {
      case "matched":
      case "group":
        const regRet: RegExpExecArray = ret as RegExpExecArray;
        if (outputType === "matched") {
          text = regRet[0];
        } else if (outputType === "group") {
          text = regRet.slice(1, regRet.length).join("\n");
        }
        break;
      case "line":
        text = lineText;
        break;
      default:
        throw new Error(`Wrong outputType: ${outputType}`);
    }

    texts.push(text);
  }

  const content: string[] = [];
  for (let i = 0; i < matchingLines.length; i += 1) {
    const lineno = matchingLines[i];
    const text = texts[i];

    formatLine(editor, lineno, lineNumbers, text, content);
    content.push("\n");
  }

  const doc = await vscode.workspace.openTextDocument({
    language: editor.document.languageId,
    content: content.join(""),
  });
  await vscode.window.showTextDocument(doc);
}

async function replaceLines(
  registry: IDependencyRegistry,
  editor: vscode.TextEditor,
  edit: vscode.TextEditorEdit,
  searchAndReplace: Map<string, string>
) {
  const config = registry.configuration;
  const lineNumbers = config.get("lineNumbers");

  const matchingLines: number[] = [];
  const texts: string[] = [];

  const lines = getSelectedOrAll(editor);

  for (let lineno = 0; lineno < lines.length; ++lineno) {
    let lineText = lines[lineno];

    searchAndReplace.forEach((toReplace, toSearch) => {
      const re = constructSearchRegExp(config, toSearch, "replace");
      lineText = lineText.replace(re, toReplace);
    });

    matchingLines.push(lineno);
    texts.push(lineText);
  }

  const content: string[] = [];
  for (let i = 0; i < matchingLines.length; i += 1) {
    const lineno = matchingLines[i];
    const text = texts[i];

    formatLine(editor, lineno, lineNumbers, text, content);
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
  if (outputType === "replace") flags += "g";
  return new RegExp(searchText, flags);
}

function formatLine(
  editor: vscode.TextEditor,
  lineno: number,
  lineNumbers: boolean,
  text: string,
  acc: string[]
): void {
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
