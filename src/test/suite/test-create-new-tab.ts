import assert from "assert";
import vscode from "vscode";

import { NUMBERS } from "./test-data";
import { REGISTRY } from "./test-di";
import { setEditorText, invokeFilterLines, trimmed } from "./test-utils";

suite("New tab", async () => {
  test("New tab with line numbers", async () => {
    REGISTRY.updateSettings({ createNewTab: true, lineNumbers: true });

    let editor = vscode.window.activeTextEditor!;
    await setEditorText(editor, NUMBERS);
    await invokeFilterLines("filterlines.includeLinesWithRegex", "2");

    assert.equal(vscode.workspace.textDocuments.length, 2);
    editor = vscode.window.activeTextEditor!;
    assert.equal(
      editor.document.getText().trimRight(),
      trimmed(`
      |    1: 2
      |    3: 2
    `)
    );
  });
});
