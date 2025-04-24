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
exports.registerCommands = registerCommands;
var vscode = require("vscode");
function registerCommands(context, GitTracker) {
    var _this = this;
    // Register refresh command
    context.subscriptions.push(vscode.commands.registerCommand("GitTracker.refresh", function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    vscode.window.showInformationMessage("GitTracker: Refreshing conflict analysis...");
                    return [4 /*yield*/, GitTracker.analyzeRepository()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }));
    // Register show conflicts command
    context.subscriptions.push(vscode.commands.registerCommand("GitTracker.showConflicts", function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, GitTracker.showConflicts()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }));
    // Register compare changes command
    context.subscriptions.push(vscode.commands.registerCommand("GitTracker.compareChanges", function (branch1, branch2, file) { return __awaiter(_this, void 0, void 0, function () {
        var axios, response, workspaceRoot, fs, path, os, tempDir, leftFile, rightFile, leftUri, rightUri, error_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    axios = require("axios");
                    return [4 /*yield*/, axios.get("http://localhost:5000/compare", {
                            params: { branch1: branch1, branch2: branch2, file: file },
                        })];
                case 1:
                    response = _c.sent();
                    workspaceRoot = (_b = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.uri.fsPath;
                    if (!workspaceRoot) {
                        return [2 /*return*/];
                    }
                    fs = require("fs");
                    path = require("path");
                    os = require("os");
                    tempDir = path.join(os.tmpdir(), "GitTracker");
                    if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir);
                    }
                    leftFile = path.join(tempDir, "".concat(branch1, "-").concat(path.basename(file)));
                    rightFile = path.join(tempDir, "".concat(branch2, "-").concat(path.basename(file)));
                    fs.writeFileSync(leftFile, response.data.content1);
                    fs.writeFileSync(rightFile, response.data.content2);
                    leftUri = vscode.Uri.file(leftFile);
                    rightUri = vscode.Uri.file(rightFile);
                    vscode.commands.executeCommand("vscode.diff", leftUri, rightUri, "".concat(branch1, " \u2194 ").concat(branch2, ": ").concat(file));
                    return [3 /*break*/, 3];
                case 2:
                    error_1 = _c.sent();
                    vscode.window.showErrorMessage("GitTracker: Failed to compare changes: ".concat(error_1));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    }); }));
    // Register configure Python command
    context.subscriptions.push(vscode.commands.registerCommand("GitTracker.configurePython", function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, GitTracker.configurePythonBackend()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); }));
    // Add a context menu command for branch items in the tree view
    context.subscriptions.push(vscode.commands.registerCommand("GitTracker.viewBranchConflicts", function (branchItem) {
        vscode.window.showInformationMessage("Viewing conflicts for branch: ".concat(branchItem.label));
        // Future implementation
    }));
    // Add commands for conflict resolution suggestions
    context.subscriptions.push(vscode.commands.registerCommand("GitTracker.suggestResolution", function (conflict) { return __awaiter(_this, void 0, void 0, function () {
        var axios, response, suggestion, document_1, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 4, , 5]);
                    axios = require("axios");
                    return [4 /*yield*/, axios.post("http://localhost:5000/suggest-resolution", {
                            conflict: conflict,
                        })];
                case 1:
                    response = _a.sent();
                    suggestion = response.data.suggestion;
                    return [4 /*yield*/, vscode.workspace.openTextDocument({
                            content: suggestion,
                            language: "typescript", // Adjust based on file type
                        })];
                case 2:
                    document_1 = _a.sent();
                    return [4 /*yield*/, vscode.window.showTextDocument(document_1)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 5];
                case 4:
                    error_2 = _a.sent();
                    vscode.window.showErrorMessage("GitTracker: Failed to suggest resolution: ".concat(error_2));
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); }));
}
