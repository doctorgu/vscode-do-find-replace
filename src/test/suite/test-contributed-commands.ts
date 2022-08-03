import assert from "assert";
import sinon from "sinon";
import vscode from "vscode";

import { NUMBERS, NUMBERS_WITH_TEXT } from "./test-data";
import { setEditorText, invokeFindReplace } from "./test-utils";

suite("Contributed commands", () => {
  test('"Replace List"', async () => {
    let editor = vscode.window.activeTextEditor!;
    await setEditorText(editor, NUMBERS_WITH_TEXT);

    await invokeFindReplace(
      "findReplace.replaceList",
      sinon.match({
        prompt: "Replace text by list of search and replace: ",
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

    await invokeFindReplace(
      "findReplace.includeMatched",
      sinon.match({
        prompt: "Filter to text matching matched: ",
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

    await invokeFindReplace(
      "findReplace.includeMatchedGroup",
      sinon.match({
        prompt: "Filter to text matching matched group: ",
        value: sinon.match.any,
      }),
      "([23])"
    );

    editor = vscode.window.activeTextEditor!;
    assert.equal(editor.document.getText(), "2\n3\n2\n");
  });
});
