import assert from "assert";
import vscode from "vscode";

import { NUMBERS } from "./test-data";
import { REGISTRY } from "./test-di";
import { setEditorText, invokeFilterLines, trimmed } from "./test-utils";

suite("Line numbers", async () => {
  test("Line numbers", async () => {
    REGISTRY.updateSettings({ lineNumbers: true });

    let editor = vscode.window.activeTextEditor!;
    await setEditorText(editor, NUMBERS);
    await invokeFilterLines("filterlines.includeLine", "2");
    // Line numbers should be padded to 5 chars with spaces
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
