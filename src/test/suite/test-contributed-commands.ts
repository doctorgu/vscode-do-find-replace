import assert from "assert";
import sinon from "sinon";
import vscode from "vscode";

import { NUMBERS, NUMBERS_WITH_TEXT } from "./test-data";
import { setEditorText, invokeFilterLines } from "./test-utils";

suite("Contributed commands", () => {
  test('"Include Matched"', async () => {
    const editor = vscode.window.activeTextEditor!;
    await setEditorText(editor, NUMBERS_WITH_TEXT);

    await invokeFilterLines(
      "filterlines.includeMatched",
      sinon.match({
        prompt: "Filter to lines matching matched: ",
        value: sinon.match.any,
      }),
      "[23]"
    );

    assert.equal(editor.document.getText(), "2\n3\n2\n");
  });

  test('"Include Matched Group"', async () => {
    const editor = vscode.window.activeTextEditor!;
    await setEditorText(editor, NUMBERS);

    await invokeFilterLines(
      "filterlines.includeMatchedGroup",
      sinon.match({
        prompt: "Filter to lines matching: ",
        value: sinon.match.any,
      }),
      "([23])"
    );

    assert.equal(editor.document.getText(), "2\n3\n2\n");
  });

  test('"Include Line"', async () => {
    const editor = vscode.window.activeTextEditor!;
    await setEditorText(editor, NUMBERS);

    await invokeFilterLines(
      "filterlines.includeLine",
      sinon.match({
        prompt: "Filter to lines matching: ",
        value: sinon.match.any,
      }),
      "[23]"
    );

    assert.equal(editor.document.getText(), "2\n3\n2\n");
  });
});
