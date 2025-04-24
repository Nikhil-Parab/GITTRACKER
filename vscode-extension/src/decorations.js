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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDecorations = registerDecorations;
const vscode = __importStar(require("vscode"));
let potentialConflictDecoration;
function registerDecorations(context) {
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
    context.subscriptions.push(vscode.commands.registerCommand("gittracker.updateDecorations", (fileConflicts) => {
        updateDecorations(fileConflicts);
    }));
    // Update decorations when active editor changes
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (editor) {
            // Get conflicts for current file
            vscode.commands.executeCommand("gittracker.getFileConflicts", editor.document.uri.fsPath);
        }
    }));
    // Register command to get conflicts for a file
    context.subscriptions.push(vscode.commands.registerCommand("gittracker.getFileConflicts", (filePath) => __awaiter(this, void 0, void 0, function* () {
        try {
            const axios = require("axios");
            const response = yield axios.get("http://localhost:5000/file-conflicts", {
                params: { file: filePath },
            });
            updateDecorations(response.data.conflicts);
        }
        catch (error) {
            console.error("Failed to get file conflicts:", error);
        }
    })));
}
function updateDecorations(fileConflicts) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    const decorations = [];
    fileConflicts.forEach((conflict) => {
        // Create range for conflict
        const startLine = Math.max(0, conflict.lineStart - 1);
        const endLine = conflict.lineEnd - 1;
        const startPos = new vscode.Position(startLine, 0);
        const endPos = new vscode.Position(endLine, editor.document.lineAt(endLine).text.length);
        const range = new vscode.Range(startPos, endPos);
        // Create hover message
        const hoverMessage = new vscode.MarkdownString();
        hoverMessage.appendMarkdown(`**Potential Conflict**\n\n`);
        hoverMessage.appendMarkdown(`Between branches: \`${conflict.branch1}\` and \`${conflict.branch2}\`\n\n`);
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
