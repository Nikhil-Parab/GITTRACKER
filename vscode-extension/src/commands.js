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
exports.registerCommands = registerCommands;
const vscode = __importStar(require("vscode"));
function registerCommands(context, gitTracker) {
    // Register refresh command
    context.subscriptions.push(vscode.commands.registerCommand("gittracker.refresh", () => __awaiter(this, void 0, void 0, function* () {
        vscode.window.showInformationMessage("GitTracker: Refreshing conflict analysis...");
        yield gitTracker.analyzeRepository();
    })));
    // Register show conflicts command
    context.subscriptions.push(vscode.commands.registerCommand("gittracker.showConflicts", () => __awaiter(this, void 0, void 0, function* () {
        yield gitTracker.showConflicts();
    })));
    // Register compare changes command
    context.subscriptions.push(vscode.commands.registerCommand("gittracker.compareChanges", (branch1, branch2, file) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        try {
            const axios = require("axios");
            const response = yield axios.get("http://localhost:5000/compare", {
                params: { branch1, branch2, file },
            });
            // Create a diff editor
            const workspaceRoot = (_b = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.uri.fsPath;
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
    })));
    // Register configure Python command
    context.subscriptions.push(vscode.commands.registerCommand("gittracker.configurePython", () => __awaiter(this, void 0, void 0, function* () {
        yield gitTracker.configurePythonBackend();
    })));
    // Add a context menu command for branch items in the tree view
    context.subscriptions.push(vscode.commands.registerCommand("gittracker.viewBranchConflicts", (branchItem) => {
        vscode.window.showInformationMessage(`Viewing conflicts for branch: ${branchItem.label}`);
        // Future implementation
    }));
    // Add commands for conflict resolution suggestions
    context.subscriptions.push(vscode.commands.registerCommand("gittracker.suggestResolution", (conflict) => __awaiter(this, void 0, void 0, function* () {
        try {
            const axios = require("axios");
            const response = yield axios.post("http://localhost:5000/suggest-resolution", {
                conflict,
            });
            const suggestion = response.data.suggestion;
            // Show suggestion in a new editor
            const document = yield vscode.workspace.openTextDocument({
                content: suggestion,
                language: "typescript", // Adjust based on file type
            });
            yield vscode.window.showTextDocument(document);
        }
        catch (error) {
            vscode.window.showErrorMessage(`GitTracker: Failed to suggest resolution: ${error}`);
        }
    })));
}
