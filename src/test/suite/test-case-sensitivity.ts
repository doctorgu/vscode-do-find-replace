import assert from "assert";
import vscode from "vscode";

import { LIPSUM } from "./test-data";
import { REGISTRY } from "./test-di";
import { setEditorText, invokeFilterLines, reopenEditor } from "./test-utils";

suite("Case sensitivity", () => {
  test("Regex search", async () => {
    let editor = vscode.window.activeTextEditor!;
    await setEditorText(editor, LIPSUM);

    REGISTRY.updateSettings({
      caseSensitiveRegexSearch: true,
    }); // defaults

    await invokeFilterLines("filterlines.includeLine", "Ipsum");
    editor = vscode.window.activeTextEditor!;
    assert.equal(editor.document.getText().trim(), "");

    editor = await reopenEditor();
    await setEditorText(editor, LIPSUM);

    REGISTRY.updateSettings({
      caseSensitiveRegexSearch: false,
    });

    await invokeFilterLines("filterlines.includeLine", "Ipsum");
    editor = vscode.window.activeTextEditor!;
    assert.notEqual(editor.document.getText().trim(), "");
  });
});
