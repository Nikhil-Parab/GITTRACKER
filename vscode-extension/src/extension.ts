import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as cp from "child_process";
import axios from "axios";

import { GitTrackerStatusBar } from "./statusBar";
import { GitTrackerTreeProvider } from "./treeView";
import { registerDecorations } from "./decorations";
import { registerCommands } from "./commands";

export class GitTracker {
  private context: vscode.ExtensionContext;
  private statusBar: GitTrackerStatusBar;

  private treeProvider: GitTrackerTreeProvider;
  private pythonProcess: cp.ChildProcess | undefined;
  private serverUrl: string = "http://localhost:5000";
  private analyzeInterval: NodeJS.Timeout | undefined;
  private workspaceRoot: string | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.statusBar = new GitTrackerStatusBar();
    this.treeProvider = new GitTrackerTreeProvider();
  }

  async activate(): Promise<void> {
    this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    if (!this.workspaceRoot) {
      vscode.window.showInformationMessage(
        "GitTracker: No workspace folder open"
      );
      return;
    }

    // Check if this is a git repository
    if (!this.isGitRepository(this.workspaceRoot)) {
      vscode.window.showInformationMessage("GitTracker: Not a git repository");
      return;
    }

    // Register UI components
    this.statusBar.initialize(this.context);

    // Register tree view
    vscode.window.createTreeView("GitTracker-branches", {
      treeDataProvider: this.treeProvider,
    });

    // Register decorations
    registerDecorations(this.context);

    // Register commands
    registerCommands(this.context, this);

    // Start Python backend
    await this.startPythonBackend();

    // Initial analysis
    await this.analyzeRepository();

    // Set up interval for periodic analysis
    const config = vscode.workspace.getConfiguration("GitTracker");
    const frequency = config.get<number>("analysisFrequency", 300); // seconds
    this.analyzeInterval = setInterval(
      () => this.analyzeRepository(),
      frequency * 1000
    );
  }

  async deactivate(): Promise<void> {
    // Clear interval
    if (this.analyzeInterval) {
      clearInterval(this.analyzeInterval);
    }

    // Stop Python backend
    this.stopPythonBackend();

    // Clean up status bar
    this.statusBar.dispose();
  }

  private isGitRepository(dir: string): boolean {
    return fs.existsSync(path.join(dir, ".git"));
  }

  async startPythonBackend(): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration("GitTracker");
      let pythonPath = config.get<string>("pythonPath", "");

      if (!pythonPath) {
        // Try to find Python in path
        pythonPath = "python";

        // On Windows, try python3 if python is not found
        if (process.platform === "win32") {
          try {
            cp.execSync("python --version");
          } catch {
            pythonPath = "python3";
          }
        }

        // On Unix-like systems (macOS, Linux), try python3 first
        if (process.platform === "darwin" || process.platform === "linux") {
          try {
            cp.execSync("python3 --version");
            pythonPath = "python3";
          } catch {
            // Fallback to python
          }
        }
      }

      // Locate backend directory
      const extensionPath = this.context.extensionPath;
      const backendPath = path.join(extensionPath, "..", "backend");

      // Check if backend exists
      if (!fs.existsSync(backendPath)) {
        vscode.window.showErrorMessage(
          "GitTracker: Backend directory not found"
        );
        return;
      }

      // Start server
      this.pythonProcess = cp.spawn(
        pythonPath,
        ["-m", "GitTracker.server", "--workspace", this.workspaceRoot || ""],
        {
          cwd: backendPath,
          env: { ...process.env, PYTHONPATH: backendPath },
        }
      );

      this.pythonProcess.stdout?.on("data", (data) => {
        console.log(`GitTracker backend: ${data}`);
      });

      this.pythonProcess.stderr?.on("data", (data) => {
        console.error(`GitTracker backend error: ${data}`);
      });

      // Wait for server to start
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Check if server is running
      try {
        const response = await axios.get(`${this.serverUrl}/status`);
        if (response.data.status === "ready") {
          vscode.window.showInformationMessage(
            "GitTracker: Backend started successfully"
          );
        }
      } catch (error) {
        vscode.window.showErrorMessage(
          "GitTracker: Failed to connect to backend server"
        );
        console.error(error);
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `GitTracker: Failed to start backend: ${error}`
      );
      console.error(error);
    }
  }

  stopPythonBackend(): void {
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      this.pythonProcess = undefined;
    }
  }

  async analyzeRepository(): Promise<void> {
    try {
      // Update status bar to show analysis in progress
      this.statusBar.setAnalyzing(true);

      // Call backend API to analyze repository
      const response = await axios.post(`${this.serverUrl}/analyze`, {
        workspace: this.workspaceRoot,
      });

      // Process results
      const conflicts = response.data.conflicts;

      // Update UI with results
      this.treeProvider.updateConflicts(conflicts);
      this.statusBar.updateConflicts(conflicts.length);

      // Update editor decorations if active editor is affected
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor) {
        const filePath = activeEditor.document.uri.fsPath;
        const fileConflicts = conflicts.filter(
          (c: any) =>
            c.file === path.relative(this.workspaceRoot || "", filePath)
        );

        if (fileConflicts.length > 0) {
          // Trigger decoration update
          vscode.commands.executeCommand(
            "GitTracker.updateDecorations",
            fileConflicts
          );
        }
      }
    } catch (error) {
      console.error("Failed to analyze repository:", error);
      this.statusBar.setError(true);
    } finally {
      // Reset status bar
      this.statusBar.setAnalyzing(false);
    }
  }

  async configurePythonBackend(): Promise<void> {
    const pythonPath = await vscode.window.showInputBox({
      prompt: "Enter path to Python executable",
      placeHolder: "e.g., /usr/bin/python3 or C:\\Python39\\python.exe",
    });

    if (pythonPath) {
      const config = vscode.workspace.getConfiguration("GitTracker");
      await config.update(
        "pythonPath",
        pythonPath,
        vscode.ConfigurationTarget.Global
      );

      // Restart backend
      this.stopPythonBackend();
      await this.startPythonBackend();
    }
  }

  async showConflicts(): Promise<void> {
    try {
      const response = await axios.get(`${this.serverUrl}/conflicts`);
      const conflicts = response.data.conflicts;

      // Show conflicts in a webview panel
      const panel = vscode.window.createWebviewPanel(
        "GitTrackerConflicts",
        "GitTracker: Potential Conflicts",
        vscode.ViewColumn.One,
        {
          enableScripts: true,
        }
      );

      // Generate HTML content for webview
      panel.webview.html = this.generateConflictsHtml(conflicts);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to fetch conflicts: ${error}`);
    }
  }

  private generateConflictsHtml(conflicts: any[]): string {
    // HTML generation code for conflict details
    let conflictItems = "";

    if (conflicts.length === 0) {
      conflictItems =
        '<div class="no-conflicts">No potential conflicts detected</div>';
    } else {
      conflicts.forEach((conflict, index) => {
        conflictItems += `
                <div class="conflict-item">
                    <h3>Conflict #${index + 1}: ${conflict.file}</h3>
                    <div class="branches">
                        <span>Between branches: <strong>${
                          conflict.branch1
                        }</strong> and <strong>${
          conflict.branch2
        }</strong></span>
                    </div>
                    <div class="lines">
                        <span>Lines: ${conflict.lineStart} - ${
          conflict.lineEnd
        }</span>
                    </div>
                    <pre class="code"><code>${this.escapeHtml(
                      conflict.content1
                    )}</code></pre>
                    <div class="separator">vs.</div>
                    <pre class="code"><code>${this.escapeHtml(
                      conflict.content2
                    )}</code></pre>
                </div>
                `;
      });
    }

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>GitTracker Conflicts</title>
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    padding: 20px;
                }
                h2 {
                    color: var(--vscode-editor-foreground);
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 10px;
                }
                .conflict-item {
                    margin-bottom: 30px;
                    padding: 15px;
                    background-color: var(--vscode-editor-background);
                    border-radius: 5px;
                }
                .conflict-item h3 {
                    margin-top: 0;
                    color: var(--vscode-editorWarning-foreground);
                }
                .branches, .lines {
                    margin-bottom: 10px;
                }
                .code {
                    background-color: var(--vscode-textCodeBlock-background);
                    padding: 10px;
                    border-radius: 5px;
                    overflow: auto;
                    font-family: var(--vscode-editor-font-family);
                    font-size: var(--vscode-editor-font-size);
                }
                .separator {
                    text-align: center;
                    margin: 10px 0;
                    font-weight: bold;
                    color: var(--vscode-editorWarning-foreground);
                }
                .no-conflicts {
                    padding: 20px;
                    text-align: center;
                    font-style: italic;
                    color: var(--vscode-disabledForeground);
                }
            </style>
        </head>
        <body>
            <h2>GitTracker Potential Conflicts</h2>
            <div class="conflicts-container">
                ${conflictItems}
            </div>
        </body>
        </html>
        `;
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

let gitTrackerInstance: GitTracker | undefined;

export function activate(context: vscode.ExtensionContext) {
  gitTrackerInstance = new GitTracker(context);
  gitTrackerInstance.activate();
}

export function deactivate() {
  if (gitTrackerInstance) {
    gitTrackerInstance.deactivate();
  }
}
