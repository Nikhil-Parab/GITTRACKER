import * as vscode from "vscode";

export function registerCommands(
  context: vscode.ExtensionContext,
  gitTracker: any
): void {
  // Register refresh command
  context.subscriptions.push(
    vscode.commands.registerCommand("gittracker.refresh", async () => {
      vscode.window.showInformationMessage(
        "GitTracker: Refreshing conflict analysis..."
      );
      await gitTracker.analyzeRepository();
    })
  );

  // Register show conflicts command
  context.subscriptions.push(
    vscode.commands.registerCommand("gittracker.showConflicts", async () => {
      await gitTracker.showConflicts();
    })
  );

  // Register compare changes command
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "gittracker.compareChanges",
      async (branch1: string, branch2: string, file: string) => {
        try {
          const axios = require("axios");
          const response = await axios.get("http://localhost:5000/compare", {
            params: { branch1, branch2, file },
          });

          // Create a diff editor
          const workspaceRoot =
            vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
          if (!workspaceRoot) {
            return;
          }

          // Create temporary files for diff view
          const fs = require("fs");
          const path = require("path");
          const os = require("os");

          const tempDir = path.join(os.tmpdir(), "gittracker");
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
          }

          const leftFile = path.join(
            tempDir,
            `${branch1}-${path.basename(file)}`
          );
          const rightFile = path.join(
            tempDir,
            `${branch2}-${path.basename(file)}`
          );

          fs.writeFileSync(leftFile, response.data.content1);
          fs.writeFileSync(rightFile, response.data.content2);

          // Open diff editor
          const leftUri = vscode.Uri.file(leftFile);
          const rightUri = vscode.Uri.file(rightFile);

          vscode.commands.executeCommand(
            "vscode.diff",
            leftUri,
            rightUri,
            `${branch1} ↔ ${branch2}: ${file}`
          );
        } catch (error) {
          vscode.window.showErrorMessage(
            `GitTracker: Failed to compare changes: ${error}`
          );
        }
      }
    )
  );

  // Register configure Python command
  context.subscriptions.push(
    vscode.commands.registerCommand("gittracker.configurePython", async () => {
      await gitTracker.configurePythonBackend();
    })
  );

  // Add a context menu command for branch items in the tree view
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "gittracker.viewBranchConflicts",
      (branchItem: any) => {
        vscode.window.showInformationMessage(
          `Viewing conflicts for branch: ${branchItem.label}`
        );
        // Future implementation
      }
    )
  );

  // Add commands for conflict resolution suggestions
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "gittracker.suggestResolution",
      async (conflict: any) => {
        try {
          const axios = require("axios");
          const response = await axios.post(
            "http://localhost:5000/suggest-resolution",
            {
              conflict,
            }
          );

          const suggestion = response.data.suggestion;

          // Show suggestion in a new editor
          const document = await vscode.workspace.openTextDocument({
            content: suggestion,
            language: "typescript", // Adjust based on file type
          });

          await vscode.window.showTextDocument(document);
        } catch (error) {
          vscode.window.showErrorMessage(
            `GitTracker: Failed to suggest resolution: ${error}`
          );
        }
      }
    )
  );
}
