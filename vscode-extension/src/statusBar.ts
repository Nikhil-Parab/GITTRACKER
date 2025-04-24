import * as vscode from "vscode";

export class GitTrackerStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private isAnalyzing: boolean = false;
  private hasError: boolean = false;
  private conflictCount: number = 0;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.statusBarItem.command = "GitTracker.showConflicts";
  }

  initialize(context: vscode.ExtensionContext): void {
    this.updateStatusBar();
    this.statusBarItem.show();
    context.subscriptions.push(this.statusBarItem);
  }

  setAnalyzing(analyzing: boolean): void {
    this.isAnalyzing = analyzing;
    this.updateStatusBar();
  }

  setError(error: boolean): void {
    this.hasError = error;
    this.updateStatusBar();
  }

  updateConflicts(count: number): void {
    this.conflictCount = count;
    this.updateStatusBar();
  }

  private updateStatusBar(): void {
    if (this.isAnalyzing) {
      this.statusBarItem.text = "$(sync~spin) GitTracker: Analyzing...";
      this.statusBarItem.tooltip =
        "Analyzing repository for potential conflicts";
      return;
    }

    if (this.hasError) {
      this.statusBarItem.text = "$(error) GitTracker";
      this.statusBarItem.tooltip = "Error analyzing repository";
      return;
    }

    if (this.conflictCount > 0) {
      this.statusBarItem.text = `$(warning) GitTracker: ${
        this.conflictCount
      } conflict${this.conflictCount === 1 ? "" : "s"}`;
      this.statusBarItem.tooltip = `${
        this.conflictCount
      } potential merge conflict${
        this.conflictCount === 1 ? "" : "s"
      } detected`;
      return;
    }

    this.statusBarItem.text = "$(check) GitTracker";
    this.statusBarItem.tooltip = "No potential conflicts detected";
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}
