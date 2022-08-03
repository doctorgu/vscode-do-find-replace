import vscode from "vscode";

import { IConfiguration, VscodeWorkspaceConfiguration } from "./configuration";
import { IStorage, GivenStorage, VscodeGlobalStorage } from "./storage";

export interface ExtensionSettings {
  preserveSearch: boolean;
}

export interface SavedSearch {
  latestSearch: string;
}

export interface SavedContext {
  latestContext: string;
}

export interface IDependencyRegistry {
  readonly configuration: IConfiguration<ExtensionSettings>;
  readonly searchStorage: IStorage<SavedSearch>;
}

// IMPORTANT: Keep this in sync with package.json
export const DEFAULT_SETTINGS: Readonly<ExtensionSettings> = {
  preserveSearch: true,
};

/* istanbul ignore next */
export class DependencyRegistry implements IDependencyRegistry {
  private static SEARCH_STORAGE = new GivenStorage({ latestSearch: "" });

  // @override
  readonly configuration = new VscodeWorkspaceConfiguration(
    vscode.workspace.getConfiguration("findReplace"),
    DEFAULT_SETTINGS
  );

  // @override
  readonly searchStorage = DependencyRegistry.SEARCH_STORAGE;
  // @override
  readonly contextStorage: IStorage<SavedContext>;

  constructor(context: vscode.ExtensionContext) {
    this.contextStorage = new VscodeGlobalStorage(context.globalState, {
      latestContext: "",
    });
  }
}
