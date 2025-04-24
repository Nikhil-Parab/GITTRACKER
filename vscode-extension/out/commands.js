"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCommands = registerCommands;
const vscode = __importStar(require("vscode"));
function registerCommands(context, GitTracker) {
    // Register refresh command
    context.subscriptions.push(vscode.commands.registerCommand("GitTracker.refresh", async () => {
        vscode.window.showInformationMessage("GitTracker: Refreshing conflict analysis...");
        await GitTracker.analyzeRepository();
    }));
    // Register show conflicts command
    context.subscriptions.push(vscode.commands.registerCommand("GitTracker.showConflicts", async () => {
        await GitTracker.showConflicts();
    }));
    // Register compare changes command
    context.subscriptions.push(vscode.commands.registerCommand("GitTracker.compareChanges", async (branch1, branch2, file) => {
        try {
            const axios = require("axios");
            const response = await axios.get("http://localhost:5000/compare", {
                params: { branch1, branch2, file },
            });
            // Create a diff editor
            const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (!workspaceRoot) {
                return;
            }
            // Create temporary files for diff view
            const fs = require("fs");
            const path = require("path");
            const os = require("os");
            const tempDir = path.join(os.tmpdir(), "GitTracker");
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir);
            }
            const leftFile = path.join(tempDir, `${branch1}-${path.basename(file)}`);
            const rightFile = path.join(tempDir, `${branch2}-${path.basename(file)}`);
            fs.writeFileSync(leftFile, response.data.content1);
            fs.writeFileSync(rightFile, response.data.content2);
            // Open diff editor
            const leftUri = vscode.Uri.file(leftFile);
            const rightUri = vscode.Uri.file(rightFile);
            vscode.commands.executeCommand("vscode.diff", leftUri, rightUri, `${branch1} ↔ ${branch2}: ${file}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`GitTracker: Failed to compare changes: ${error}`);
        }
    }));
    // Register configure Python command
    context.subscriptions.push(vscode.commands.registerCommand("GitTracker.configurePython", async () => {
        await GitTracker.configurePythonBackend();
    }));
    // Add a context menu command for branch items in the tree view
    context.subscriptions.push(vscode.commands.registerCommand("GitTracker.viewBranchConflicts", (branchItem) => {
        vscode.window.showInformationMessage(`Viewing conflicts for branch: ${branchItem.label}`);
        // Future implementation
    }));
    // Add commands for conflict resolution suggestions
    context.subscriptions.push(vscode.commands.registerCommand("GitTracker.suggestResolution", async (conflict) => {
        try {
            const axios = require("axios");
            const response = await axios.post("http://localhost:5000/suggest-resolution", {
                conflict,
            });
            const suggestion = response.data.suggestion;
            // Show suggestion in a new editor
            const document = await vscode.workspace.openTextDocument({
                content: suggestion,
                language: "typescript", // Adjust based on file type
            });
            await vscode.window.showTextDocument(document);
        }
        catch (error) {
            vscode.window.showErrorMessage(`GitTracker: Failed to suggest resolution: ${error}`);
        }
    }));
}
//# sourceMappingURL=commands.js.map