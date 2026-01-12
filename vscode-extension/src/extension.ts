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
        ["-m", "gittracker.server", "--workspace", this.workspaceRoot || ""],
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
        repo_path: this.workspaceRoot,
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

      const panel = vscode.window.createWebviewPanel(
        "GitTrackerConflicts",
        "GitTracker: Potential Conflicts",
        vscode.ViewColumn.One,
        {
          enableScripts: true,
        }
      );

      panel.webview.onDidReceiveMessage(
        async (message) => {
          switch (message.command) {
            case "suggestResolution":
              // Call command and get result
              const suggestion = await vscode.commands.executeCommand(
                "GitTracker.suggestResolution",
                message.conflict
              );
              
              if (suggestion) {
                // Send back to webview
                panel.webview.postMessage({
                    command: 'displaySuggestion',
                    conflictId: message.conflictId,
                    suggestion: suggestion
                });
              }
              return;

            case "applyResolution":
                await this.applyConflictResolution(message.conflict, message.suggestion);
                // Close webview or refresh? Refresh list
                await this.analyzeRepository();
                // Notify webview to update UI? simpler to just refresh the view or close
                vscode.window.showInformationMessage("Conflict resolved!");
                panel.dispose(); // Close panel as state has changed invalidating the view
                // Re-open if there are remaining conflicts?
                // await this.showConflicts();
                return;
          }
        },
        undefined,
        this.context.subscriptions
      );

      panel.webview.html = this.generateConflictsHtml(conflicts);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to fetch conflicts: ${error}`);
    }
  }

  async applyConflictResolution(conflict: any, suggestion: string): Promise<void> {
      if (!this.workspaceRoot) return;

      const filePath = path.join(this.workspaceRoot, conflict.file);
      const uri = vscode.Uri.file(filePath);

      const edit = new vscode.WorkspaceEdit();
      // Replace the conflict range. 
      // conflict.lineStart and lineEnd are 1-based.
      // We want to replace from start of lineStart to end of lineEnd?
      // Or typically just the lines.
      // VS Code Range is 0-based.
      const startLine = conflict.lineStart - 1;
      const endLine = conflict.lineEnd; // -1 for 0-based, +1 to include the line... actually if it's inclusive 1-based, it's 0-based index.
      // Example: Lines 1-2. 1-based. 
      // 0-based: Line 0. Line 1.
      // We want to replace Line 0 start to Line 2 start (exclusive of Line 2 content? No, inclusive).
      // Let's assume inclusive.
      // Range(startRes, startCol, endRow, endCol)
      
      const range = new vscode.Range(startLine, 0, endLine, 0); 
      // Note: This replaces up to the *start* of the line *after* lineEnd.
      
      edit.replace(uri, range, suggestion + '\n'); // Add newline to match replaced block structure? 
      // Suggestion usually doesn't have trailing newline? 
      
      await vscode.workspace.applyEdit(edit);
      await vscode.workspace.saveAll(); // Save to persist
  }

  private generateConflictsHtml(conflicts: any[]): string {
    let conflictItems = "";

    if (conflicts.length === 0) {
      conflictItems =
        '<div class="no-conflicts">No potential conflicts detected</div>';
    } else {
      conflicts.forEach((conflict, index) => {
        // Create unique ID for this conflict 
        const conflictId = `conflict-${index}`;
        
        conflictItems += `
                <div class="conflict-item" id="${conflictId}">
                    <div class="header">
                        <h3>Conflict #${index + 1}: ${conflict.file}</h3>
                        <button class="resolve-btn" onclick='suggestResolution(${JSON.stringify(conflict)}, "${conflictId}")'>Suggest Resolution (AI)</button>
                    </div>
                    <div class="branches">
                        <span>Between branches: <strong>${conflict.branch1}</strong> and <strong>${conflict.branch2}</strong></span>
                    </div>
                    <div class="lines">
                        <span>Lines: ${conflict.lineStart} - ${conflict.lineEnd}</span>
                    </div>
                    
                    <div class="code-comparison">
                        <pre class="code"><code>${this.escapeHtml(conflict.content1)}</code></pre>
                        <div class="separator">vs.</div>
                        <pre class="code"><code>${this.escapeHtml(conflict.content2)}</code></pre>
                    </div>

                    <div id="${conflictId}-suggestion" class="suggestion-box" style="display:none;">
                        <h4>AI Suggestion:</h4>
                        <div class="spinner" id="${conflictId}-spinner">Thinking...</div>
                        <pre class="code suggestion-code" id="${conflictId}-code"></pre>
                        <div class="actions">
                            <button class="apply-btn" onclick='applyResolution("${conflictId}")'>Apply Fix</button>
                            <button class="cancel-btn" onclick='cancelResolution("${conflictId}")'>Discard</button>
                        </div>
                    </div>
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
                h2, h4 {
                    color: var(--vscode-editor-foreground);
                }
                .conflict-item {
                    margin-bottom: 30px;
                    padding: 15px;
                    background-color: var(--vscode-editor-background);
                    border: 1px solid var(--vscode-panel-border);
                    border-radius: 5px;
                }
                .code {
                    background-color: var(--vscode-textCodeBlock-background);
                    padding: 10px;
                    border-radius: 5px;
                    overflow: auto;
                    font-family: var(--vscode-editor-font-family);
                    white-space: pre-wrap;
                }
                .suggestion-box {
                    margin-top: 15px;
                    padding: 10px;
                    background-color: var(--vscode-sideBar-background); /* Distinct background */
                    border: 1px solid var(--vscode-focusBorder);
                    border-radius: 5px;
                }
                .suggestion-code {
                    border-left: 3px solid var(--vscode-gitDecoration-addedResourceForeground);
                }
                .separator { text-align: center; margin: 10px 0; font-weight: bold; }
                .header { display: flex; justify-content: space-between; align-items: center; }
                
                button {
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 6px 12px;
                    cursor: pointer;
                    border-radius: 2px;
                }
                button:hover { background-color: var(--vscode-button-hoverBackground); }
                
                .apply-btn { background-color: var(--vscode-gitDecoration-addedResourceForeground); color: white; margin-right: 10px;}
                .cancel-btn { background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
                
                .actions { margin-top: 10px; display: none; } 
            </style>
            <script>
                const vscode = acquireVsCodeApi();
                
                // Store conflicts map
                const conflictData = {};

                function suggestResolution(conflict, id) {
                    conflictData[id] = { conflict: conflict, suggestion: null };
                    
                    // Show loading UI
                    document.getElementById(id + '-suggestion').style.display = 'block';
                    document.getElementById(id + '-spinner').style.display = 'block';
                    document.getElementById(id + '-code').innerText = '';
                    document.querySelector('#' + id + ' .actions').style.display = 'none';

                    vscode.postMessage({
                        command: 'suggestResolution',
                        conflict: conflict,
                        conflictId: id
                    });
                }

                function applyResolution(id) {
                    vscode.postMessage({
                        command: 'applyResolution',
                        conflict: conflictData[id].conflict,
                        suggestion: conflictData[id].suggestion
                    });
                }

                function cancelResolution(id) {
                    document.getElementById(id + '-suggestion').style.display = 'none';
                }

                // Handle messages from extension
                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'displaySuggestion':
                            const id = message.conflictId;
                            // Store suggestion
                            if (conflictData[id]) {
                                conflictData[id].suggestion = message.suggestion;
                            }
                            
                            // Update UI
                            document.getElementById(id + '-spinner').style.display = 'none';
                            document.getElementById(id + '-code').innerText = message.suggestion;
                            document.querySelector('#' + id + ' .actions').style.display = 'block';
                            break;
                    }
                });
            </script>
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
