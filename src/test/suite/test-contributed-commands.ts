import assert from "assert";
import sinon from "sinon";
import vscode from "vscode";

import { NUMBERS, NUMBERS_WITH_TEXT } from "./test-data";
import { setEditorText, invokeFilterLines } from "./test-utils";

suite("Contributed commands", () => {
  test('"Replace List"', async () => {
    let editor = vscode.window.activeTextEditor!;
    await setEditorText(editor, NUMBERS_WITH_TEXT);

    await invokeFilterLines(
      "filterlines.replaceList",
      sinon.match({
        prompt: "Replace lines by list of search and replace: ",
        value: sinon.match.any,
      }),
      "1=10&2=20"
    );

    editor = vscode.window.activeTextEditor!;
    assert.equal(editor.document.getText(), "10a\n20a\n3a\n20a\n4a");
  });

  test('"Include Matched"', async () => {
    let editor = vscode.window.activeTextEditor!;
    await setEditorText(editor, NUMBERS_WITH_TEXT);

    await invokeFilterLines(
      "filterlines.includeMatched",
      sinon.match({
        prompt: "Filter to lines matching matched: ",
        value: sinon.match.any,
      }),
      "[23]"
    );

    editor = vscode.window.activeTextEditor!;
    assert.equal(editor.document.getText(), "2\n3\n2\n");
  });

  test('"Include Matched Group"', async () => {
    let editor = vscode.window.activeTextEditor!;
    await setEditorText(editor, NUMBERS);

    await invokeFilterLines(
      "filterlines.includeMatchedGroup",
      sinon.match({
        prompt: "Filter to lines matching matched group: ",
        value: sinon.match.any,
      }),
      "([23])"
    );

    editor = vscode.window.activeTextEditor!;
    assert.equal(editor.document.getText(), "2\n3\n2\n");
  });

  test('"Include Line"', async () => {
    let editor = vscode.window.activeTextEditor!;
    await setEditorText(editor, NUMBERS);

    await invokeFilterLines(
      "filterlines.includeLine",
      sinon.match({
        prompt: "Filter to lines matching line: ",
        value: sinon.match.any,
      }),
      "[23]"
    );

    editor = vscode.window.activeTextEditor!;
    assert.equal(editor.document.getText(), "2\n3\n2\n");
  });
});
