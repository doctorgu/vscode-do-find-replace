import vscode from 'vscode';
import fs from 'fs';
import path from 'path';

import {
  escapeRegexp,
  getWorkspaceFolder,
  getFolderFile,
  testWildcardFileName,
  catchErrors,
} from './utils';
import {
  IDependencyRegistry,
  ExtensionSettings,
  DependencyRegistry,
} from './di';
import { IConfiguration } from './configuration';

type OutputType = 'matched' | 'group' | 'replace';

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
      'findReplace.replaceList',
      catchErrors((editor, edit, args) => {
        const args_: PromptFindReplaceArgs = {
          output_type: 'replace',
        };
        vscode.commands.executeCommand('findReplace.promptFindReplace', args_);
      })
    ),
    vscode.commands.registerTextEditorCommand(
      'findReplace.includeMatched',
      catchErrors((editor, edit, args) => {
        const args_: PromptFindReplaceArgs = {
          output_type: 'matched',
        };
        vscode.commands.executeCommand('findReplace.promptFindReplace', args_);
      })
    ),
    vscode.commands.registerTextEditorCommand(
      'findReplace.includeMatchedGroup',
      catchErrors((editor, edit, args) => {
        const args_: PromptFindReplaceArgs = {
          output_type: 'group',
        };
        vscode.commands.executeCommand('findReplace.promptFindReplace', args_);
      })
    ),

    vscode.commands.registerTextEditorCommand(
      'findReplace.promptFindReplace',
      catchErrors((editor, edit, args) => {
        const { output_type = 'matched' } =
          (args as PromptFindReplaceArgs) || {};
        const registry = DI.getRegistry(extensionContext);
        promptFindReplace(registry, editor, edit, output_type).then();
      })
    ),

    vscode.commands.registerTextEditorCommand(
      'findReplace.replaceText',
      catchErrors((editor, edit, args) => {
        const { flags, findAndReplace } = (args as ReplaceTextArgs) || {};
        const registry = DI.getRegistry(extensionContext);
        replaceText(registry, editor, edit, flags, findAndReplace);
      })
    ),
    vscode.commands.registerTextEditorCommand(
      'findReplace.filterText',
      catchErrors((editor, edit, args) => {
        const {
          flags,
          find,
          output_type = 'matched',
        } = (args as FindTextArgs) || {};
        const registry = DI.getRegistry(extensionContext);
        filterText(registry, editor, edit, flags, find, output_type);
      })
    )
  );
}

function getFindAndReplace(isPath: boolean, find: string): Map<string, string> {
  function encode(value: string) {
    return value.replace(/,,/g, '&comma;').replace(/::/g, '&colon;');
  }
  function decode(value: string) {
    return value.replace(/&comma;/g, ',').replace(/&colon;/g, ':');
  }

  let toFind = find;

  let map = new Map<string, string>();
  if (!toFind) return map;

  // Row delimeter is comma when user input, line separator when file.
  let rowDelim = /,/;
  if (isPath) {
    try {
      const workspaceFolder = getWorkspaceFolder();

      const toFinds: string[] = [];
      const pathsPlus = toFind.split('+');
      for (let i = 0; i < pathsPlus.length; i += 1) {
        const pathPlusCur = pathsPlus[i];
        const fullPathPlus =
          !pathPlusCur.includes(':') && !!workspaceFolder
            ? path.resolve(workspaceFolder, pathPlusCur)
            : pathPlusCur;

        const { folder, file: pattern } = getFolderFile(fullPathPlus);
        const fileNames = fs.readdirSync(folder);
        for (let j = 0; j < fileNames.length; j += 1) {
          const fileNameCur = fileNames[j];
          const fullPathCur = path.resolve(folder, fileNameCur);
          if (testWildcardFileName(pattern, fileNameCur, true)) {
            const valueInFile = fs.readFileSync(fullPathCur, 'utf-8');
            toFinds.push(valueInFile);
          }
        }
      }
      toFind = toFinds.join('\n');

      rowDelim = /\r*\n/;
    } catch (ex) {
      console.log(ex);
    }
  }

  const kvList: [string, string][] = [];
  const value = encode(toFind);
  const rows = value.split(rowDelim);
  for (let rw = 0; rw < rows.length; rw += 1) {
    const [k, v] = rows[rw].split(':');
    if (k && v) {
      const key = decode(k);
      const value = decode(v);
      kvList.push([key, value]);
    }
  }

  return new Map(kvList);
}

async function promptFindReplace(
  registry: IDependencyRegistry,
  editor: vscode.TextEditor,
  edit: vscode.TextEditorEdit,
  outputType: OutputType
): Promise<void> {
  const input = await promptForFindText(registry, editor, outputType);
  if (input == null) return;

  const { flags, isPath, find } = getFlagsAndFind(registry, input);

  if (registry.configuration.get('preserveSearch'))
    registry.searchStorage.set('latestSearch', input);

  if (outputType === 'replace') {
    let findAndReplace = new Map<string, string>();
    try {
      findAndReplace = getFindAndReplace(isPath, find);
    } catch (ex: any) {
      vscode.window.showErrorMessage(`${ex?.name}, ${ex?.message}`);
      return;
    }
    const args: ReplaceTextArgs = {
      flags,
      findAndReplace,
    };
    vscode.commands.executeCommand('findReplace.replaceText', args);
  } else {
    const args: FindTextArgs = {
      output_type: outputType,
      flags,
      find,
    };
    vscode.commands.executeCommand('findReplace.filterText', args);
  }
}

function promptForFindText(
  registry: IDependencyRegistry,
  editor: vscode.TextEditor,
  outputType: OutputType
): Thenable<string | undefined> {
  const defaultFlags = registry.configuration.get('defaultFlags');
  let prompt = '';
  if (outputType === 'replace') {
    prompt = `List of Search and replace. escape: ',,' for ',', '::' for ':', p: path, c: change(k:v to v:k), w: word`;
  } else {
    prompt = `Filter ${
      (outputType === 'matched' && 'matching') ||
      (outputType === 'group' && 'matching group')
    }: `;
  }
  prompt += ` (Using '(?${defaultFlags})' flags if not specified)`;

  let findText =
    (registry.configuration.get('preserveSearch') &&
      registry.searchStorage.get('latestSearch')) ||
    '';

  return vscode.window.showInputBox({
    prompt,
    value: findText,
  });
}

function getSelectedOrAllRnToN(editor: vscode.TextEditor): string {
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

  return text.replace(/\r\n/g, '\n');
}

function getFlagsAndFind(
  registry: IDependencyRegistry,
  findText: string,
  flagsDefault: string = ''
): {
  flags: string;
  flagsRegOnly: string;
  isPath: boolean;
  isChange: boolean;
  isWord: boolean;
  find: string;
} {
  const re = /^\(\?([gmiyusdpcw]+)\)(.+)/;

  let flags = '';
  let flagsRegOnly = '';
  let find = '';

  if (!re.test(findText)) {
    flags = flagsDefault || registry.configuration.get('defaultFlags') || 'gm';
    flagsRegOnly = flags;
    find = findText;
  } else {
    const ret = re.exec(findText) as RegExpExecArray;
    flags = ret[1];
    flagsRegOnly = flags;
    find = ret[2];
  }

  let isPath = false;
  if (flagsRegOnly.includes('p')) {
    flagsRegOnly = flagsRegOnly.replace('p', '');
    isPath = true;
  }

  let isChange = false;
  if (flagsRegOnly.includes('c')) {
    flagsRegOnly = flagsRegOnly.replace('c', '');
    isChange = true;
  }

  let isWord = false;
  if (flagsRegOnly.includes('w')) {
    flagsRegOnly = flagsRegOnly.replace('w', '');
    isWord = true;
  }

  return { flags, flagsRegOnly, isPath, isChange, isWord, find };
}

async function replaceText(
  registry: IDependencyRegistry,
  editor: vscode.TextEditor,
  edit: vscode.TextEditorEdit,
  flags: string,
  findAndReplace: Map<string, string>
) {
  const text = getSelectedOrAllRnToN(editor);

  let textNew = text;
  for (let [toSearch, toReplace] of findAndReplace) {
    const {
      flagsRegOnly: flagsCur,
      isChange,
      isWord,
      find,
    } = getFlagsAndFind(registry, toSearch, flags);

    const boundary = registry.configuration.get('defaultBoundary');
    const prefix = `(?<=${boundary}|^)`;
    const postfix = `(?=${boundary}|$)`;

    if (!isChange) {
      const re = new RegExp(
        isWord ? `${prefix}${find}${postfix}` : find,
        flagsCur
      );
      textNew = textNew.replace(re, toReplace);
    } else {
      const re = new RegExp(
        isWord ? `${prefix}${toReplace}${postfix}` : toReplace,
        flagsCur
      );
      textNew = textNew.replace(re, find);
    }
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

  const text = getSelectedOrAllRnToN(editor);

  let m: RegExpExecArray | null = null;
  while ((m = re.exec(text)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (m.index === re.lastIndex) {
      re.lastIndex++;
    }

    let found = '';
    switch (outputType) {
      case 'matched':
      case 'group':
        if (outputType === 'matched') {
          found = m[0];
        } else if (outputType === 'group') {
          found = m.slice(1, m.length).join('\n');
        }
        break;
      default:
        throw new Error(`Wrong outputType: ${outputType}`);
    }

    founds.push(found);

    if (!re.flags.includes('g')) break;
  }

  const doc = await vscode.workspace.openTextDocument({
    language: editor.document.languageId,
    content: founds.join('\n'),
  });
  await vscode.window.showTextDocument(doc);
}
