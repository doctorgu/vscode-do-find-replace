import sinon from "sinon";
import vscode from "vscode";

import { LIPSUM } from "./test-data";
import { REGISTRY } from "./test-di";
import { setEditorText, invokeFindReplace, reopenEditor } from "./test-utils";

suite("Saved search", () => {
  test("Preserved search works", async () => {
    REGISTRY.updateSettings({ preserveSearch: true });

    let editor = vscode.window.activeTextEditor!;
    await setEditorText(editor, LIPSUM);
    await invokeFindReplace("findReplace.includeMatched", ".*ipsum.*");

    editor = await reopenEditor();

    await invokeFindReplace(
      "findReplace.includeMatched",
      sinon.match({ value: ".*ipsum.*" }),
      undefined
    );
  });

  test("Preserved search can be turned off", async () => {
    REGISTRY.updateSettings({ preserveSearch: false });

    let editor = vscode.window.activeTextEditor!;
    await setEditorText(editor, LIPSUM);
    await invokeFindReplace("findReplace.includeMatched", ".*ipsum.*");

    editor = await reopenEditor();

    await invokeFindReplace(
      "findReplace.includeMatched",
      sinon.match({ value: "" }),
      undefined
    );
  });

  // VSCode API doesn't allow to get a reference to the new window
  test.skip("Preserved search disappears after window is closed", async () => {
    REGISTRY.updateSettings({ preserveSearch: true });

    const editor = vscode.window.activeTextEditor!;
    setEditorText(editor, LIPSUM);
    await invokeFindReplace("findReplace.includeMatched", ".*ipsum.*");

    await vscode.commands.executeCommand("vscode.openFolder");

    await invokeFindReplace(
      "findReplace.includeMatched",
      sinon.match({ value: sinon.match((value) => value !== "ipsum") }),
      undefined
    );
  });
});
