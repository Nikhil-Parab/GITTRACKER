"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDecorations = registerDecorations;
var vscode = require("vscode");
var potentialConflictDecoration;
function registerDecorations(context) {
    var _this = this;
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
    context.subscriptions.push(vscode.commands.registerCommand("GitTracker.updateDecorations", function (fileConflicts) {
        updateDecorations(fileConflicts);
    }));
    // Update decorations when active editor changes
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(function (editor) {
        if (editor) {
            // Get conflicts for current file
            vscode.commands.executeCommand("GitTracker.getFileConflicts", editor.document.uri.fsPath);
        }
    }));
    // Register command to get conflicts for a file
    context.subscriptions.push(vscode.commands.registerCommand("GitTracker.getFileConflicts", function (filePath) { return __awaiter(_this, void 0, void 0, function () {
        var axios, response, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    axios = require("axios");
                    return [4 /*yield*/, axios.get("http://localhost:5000/file-conflicts", {
                            params: { file: filePath },
                        })];
                case 1:
                    response = _a.sent();
                    updateDecorations(response.data.conflicts);
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _a.sent();
                    console.error("Failed to get file conflicts:", error_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); }));
}
function updateDecorations(fileConflicts) {
    var editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    var decorations = [];
    fileConflicts.forEach(function (conflict) {
        // Create range for conflict
        var startLine = Math.max(0, conflict.lineStart - 1);
        var endLine = conflict.lineEnd - 1;
        var startPos = new vscode.Position(startLine, 0);
        var endPos = new vscode.Position(endLine, editor.document.lineAt(endLine).text.length);
        var range = new vscode.Range(startPos, endPos);
        // Create hover message
        var hoverMessage = new vscode.MarkdownString();
        hoverMessage.appendMarkdown("**Potential Conflict**\n\n");
        hoverMessage.appendMarkdown("Between branches: `".concat(conflict.branch1, "` and `").concat(conflict.branch2, "`\n\n"));
        hoverMessage.appendMarkdown("#### Changes in `".concat(conflict.branch1, "`:\n"));
        hoverMessage.appendCodeblock(conflict.content1, "typescript");
        hoverMessage.appendMarkdown("\n#### Changes in `".concat(conflict.branch2, "`:\n"));
        hoverMessage.appendCodeblock(conflict.content2, "typescript");
        decorations.push({
            range: range,
            hoverMessage: hoverMessage,
        });
    });
    // Apply decorations
    editor.setDecorations(potentialConflictDecoration, decorations);
}
