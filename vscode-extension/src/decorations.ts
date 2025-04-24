import * as vscode from "vscode";

let potentialConflictDecoration: vscode.TextEditorDecorationType;

export function registerDecorations(context: vscode.ExtensionContext): void {
  // Create decoration type for potential conflicts
  potentialConflictDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: "rgba(255, 200, 0, 0.2)",
    isWholeLine: true,
    overviewRulerColor: "rgba(255, 200, 0, 0.8)",
    overviewRulerLane: vscode.OverviewRulerLane.Right,
    after: {
      margin: "0 0 0 1em",
      contentText: "⚠️ Potential conflict",
      color: "rgba(255, 200, 0, 0.8)",
    },
  });

  // Register command to update decorations
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "GitTracker.updateDecorations",
      (fileConflicts: any[]) => {
        updateDecorations(fileConflicts);
      }
    )
  );

  // Update decorations when active editor changes
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        // Get conflicts for current file
        vscode.commands.executeCommand(
          "GitTracker.getFileConflicts",
          editor.document.uri.fsPath
        );
      }
    })
  );

  // Register command to get conflicts for a file
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "GitTracker.getFileConflicts",
      async (filePath: string) => {
        try {
          const axios = require("axios");
          const response = await axios.get(
            "http://localhost:5000/file-conflicts",
            {
              params: { file: filePath },
            }
          );

          updateDecorations(response.data.conflicts);
        } catch (error) {
          console.error("Failed to get file conflicts:", error);
        }
      }
    )
  );
}

function updateDecorations(fileConflicts: any[]): void {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const decorations: vscode.DecorationOptions[] = [];

  fileConflicts.forEach((conflict) => {
    // Create range for conflict
    const startLine = Math.max(0, conflict.lineStart - 1);
    const endLine = conflict.lineEnd - 1;

    const startPos = new vscode.Position(startLine, 0);
    const endPos = new vscode.Position(
      endLine,
      editor.document.lineAt(endLine).text.length
    );
    const range = new vscode.Range(startPos, endPos);

    // Create hover message
    const hoverMessage = new vscode.MarkdownString();
    hoverMessage.appendMarkdown(`**Potential Conflict**\n\n`);
    hoverMessage.appendMarkdown(
      `Between branches: \`${conflict.branch1}\` and \`${conflict.branch2}\`\n\n`
    );
    hoverMessage.appendMarkdown(`#### Changes in \`${conflict.branch1}\`:\n`);
    hoverMessage.appendCodeblock(conflict.content1, "typescript");
    hoverMessage.appendMarkdown(`\n#### Changes in \`${conflict.branch2}\`:\n`);
    hoverMessage.appendCodeblock(conflict.content2, "typescript");

    decorations.push({
      range,
      hoverMessage,
    });
  });

  // Apply decorations
  editor.setDecorations(potentialConflictDecoration, decorations);
}
