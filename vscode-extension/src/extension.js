"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.GitTracker = void 0;
exports.activate = activate;
exports.deactivate = deactivate;
var vscode = require("vscode");
var path = require("path");
var fs = require("fs");
var cp = require("child_process");
var axios_1 = require("axios");
var statusBar_1 = require("./statusBar");
var treeView_1 = require("./treeView");
var decorations_1 = require("./decorations");
var commands_1 = require("./commands");
var GitTracker = /** @class */ (function () {
    function GitTracker(context) {
        this.serverUrl = "http://localhost:5000";
        this.context = context;
        this.statusBar = new statusBar_1.GitTrackerStatusBar();
        this.treeProvider = new treeView_1.GitTrackerTreeProvider();
    }
    GitTracker.prototype.activate = function () {
        return __awaiter(this, void 0, void 0, function () {
            var config, frequency;
            var _this = this;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        this.workspaceRoot = (_b = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.uri.fsPath;
                        if (!this.workspaceRoot) {
                            vscode.window.showInformationMessage("GitTracker: No workspace folder open");
                            return [2 /*return*/];
                        }
                        // Check if this is a git repository
                        if (!this.isGitRepository(this.workspaceRoot)) {
                            vscode.window.showInformationMessage("GitTracker: Not a git repository");
                            return [2 /*return*/];
                        }
                        // Register UI components
                        this.statusBar.initialize(this.context);
                        // Register tree view
                        vscode.window.createTreeView("GitTracker-branches", {
                            treeDataProvider: this.treeProvider,
                        });
                        // Register decorations
                        (0, decorations_1.registerDecorations)(this.context);
                        // Register commands
                        (0, commands_1.registerCommands)(this.context, this);
                        // Start Python backend
                        return [4 /*yield*/, this.startPythonBackend()];
                    case 1:
                        // Start Python backend
                        _c.sent();
                        // Initial analysis
                        return [4 /*yield*/, this.analyzeRepository()];
                    case 2:
                        // Initial analysis
                        _c.sent();
                        config = vscode.workspace.getConfiguration("GitTracker");
                        frequency = config.get("analysisFrequency", 300);
                        this.analyzeInterval = setInterval(function () { return _this.analyzeRepository(); }, frequency * 1000);
                        return [2 /*return*/];
                }
            });
        });
    };
    GitTracker.prototype.deactivate = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Clear interval
                if (this.analyzeInterval) {
                    clearInterval(this.analyzeInterval);
                }
                // Stop Python backend
                this.stopPythonBackend();
                // Clean up status bar
                this.statusBar.dispose();
                return [2 /*return*/];
            });
        });
    };
    GitTracker.prototype.isGitRepository = function (dir) {
        return fs.existsSync(path.join(dir, ".git"));
    };
    GitTracker.prototype.startPythonBackend = function () {
        return __awaiter(this, void 0, void 0, function () {
            var config, pythonPath, extensionPath, backendPath, response, error_1, error_2;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 6, , 7]);
                        config = vscode.workspace.getConfiguration("GitTracker");
                        pythonPath = config.get("pythonPath", "");
                        if (!pythonPath) {
                            // Try to find Python in path
                            pythonPath = "python";
                            // On Windows, try python3 if python is not found
                            if (process.platform === "win32") {
                                try {
                                    cp.execSync("python --version");
                                }
                                catch (_d) {
                                    pythonPath = "python3";
                                }
                            }
                            // On Unix-like systems (macOS, Linux), try python3 first
                            if (process.platform === "darwin" || process.platform === "linux") {
                                try {
                                    cp.execSync("python3 --version");
                                    pythonPath = "python3";
                                }
                                catch (_e) {
                                    // Fallback to python
                                }
                            }
                        }
                        extensionPath = this.context.extensionPath;
                        backendPath = path.join(extensionPath, "..", "backend");
                        // Check if backend exists
                        if (!fs.existsSync(backendPath)) {
                            vscode.window.showErrorMessage("GitTracker: Backend directory not found");
                            return [2 /*return*/];
                        }
                        // Start server
                        this.pythonProcess = cp.spawn(pythonPath, ["-m", "GitTracker.server", "--workspace", this.workspaceRoot || ""], {
                            cwd: backendPath,
                            env: __assign(__assign({}, process.env), { PYTHONPATH: backendPath }),
                        });
                        (_a = this.pythonProcess.stdout) === null || _a === void 0 ? void 0 : _a.on("data", function (data) {
                            console.log("GitTracker backend: ".concat(data));
                        });
                        (_b = this.pythonProcess.stderr) === null || _b === void 0 ? void 0 : _b.on("data", function (data) {
                            console.error("GitTracker backend error: ".concat(data));
                        });
                        // Wait for server to start
                        return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 2000); })];
                    case 1:
                        // Wait for server to start
                        _c.sent();
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, axios_1.default.get("".concat(this.serverUrl, "/status"))];
                    case 3:
                        response = _c.sent();
                        if (response.data.status === "ready") {
                            vscode.window.showInformationMessage("GitTracker: Backend started successfully");
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _c.sent();
                        vscode.window.showErrorMessage("GitTracker: Failed to connect to backend server");
                        console.error(error_1);
                        return [3 /*break*/, 5];
                    case 5: return [3 /*break*/, 7];
                    case 6:
                        error_2 = _c.sent();
                        vscode.window.showErrorMessage("GitTracker: Failed to start backend: ".concat(error_2));
                        console.error(error_2);
                        return [3 /*break*/, 7];
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    GitTracker.prototype.stopPythonBackend = function () {
        if (this.pythonProcess) {
            this.pythonProcess.kill();
            this.pythonProcess = undefined;
        }
    };
    GitTracker.prototype.analyzeRepository = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, conflicts, activeEditor, filePath_1, fileConflicts, error_3;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, 3, 4]);
                        // Update status bar to show analysis in progress
                        this.statusBar.setAnalyzing(true);
                        return [4 /*yield*/, axios_1.default.post("".concat(this.serverUrl, "/analyze"), {
                                workspace: this.workspaceRoot,
                            })];
                    case 1:
                        response = _a.sent();
                        conflicts = response.data.conflicts;
                        // Update UI with results
                        this.treeProvider.updateConflicts(conflicts);
                        this.statusBar.updateConflicts(conflicts.length);
                        activeEditor = vscode.window.activeTextEditor;
                        if (activeEditor) {
                            filePath_1 = activeEditor.document.uri.fsPath;
                            fileConflicts = conflicts.filter(function (c) {
                                return c.file === path.relative(_this.workspaceRoot || "", filePath_1);
                            });
                            if (fileConflicts.length > 0) {
                                // Trigger decoration update
                                vscode.commands.executeCommand("GitTracker.updateDecorations", fileConflicts);
                            }
                        }
                        return [3 /*break*/, 4];
                    case 2:
                        error_3 = _a.sent();
                        console.error("Failed to analyze repository:", error_3);
                        this.statusBar.setError(true);
                        return [3 /*break*/, 4];
                    case 3:
                        // Reset status bar
                        this.statusBar.setAnalyzing(false);
                        return [7 /*endfinally*/];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    GitTracker.prototype.configurePythonBackend = function () {
        return __awaiter(this, void 0, void 0, function () {
            var pythonPath, config;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, vscode.window.showInputBox({
                            prompt: "Enter path to Python executable",
                            placeHolder: "e.g., /usr/bin/python3 or C:\\Python39\\python.exe",
                        })];
                    case 1:
                        pythonPath = _a.sent();
                        if (!pythonPath) return [3 /*break*/, 4];
                        config = vscode.workspace.getConfiguration("GitTracker");
                        return [4 /*yield*/, config.update("pythonPath", pythonPath, vscode.ConfigurationTarget.Global)];
                    case 2:
                        _a.sent();
                        // Restart backend
                        this.stopPythonBackend();
                        return [4 /*yield*/, this.startPythonBackend()];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    GitTracker.prototype.showConflicts = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, conflicts, panel, error_4;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, axios_1.default.get("".concat(this.serverUrl, "/conflicts"))];
                    case 1:
                        response = _a.sent();
                        conflicts = response.data.conflicts;
                        panel = vscode.window.createWebviewPanel("GitTrackerConflicts", "GitTracker: Potential Conflicts", vscode.ViewColumn.One, {
                            enableScripts: true,
                        });
                        // Generate HTML content for webview
                        panel.webview.html = this.generateConflictsHtml(conflicts);
                        return [3 /*break*/, 3];
                    case 2:
                        error_4 = _a.sent();
                        vscode.window.showErrorMessage("Failed to fetch conflicts: ".concat(error_4));
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    GitTracker.prototype.generateConflictsHtml = function (conflicts) {
        var _this = this;
        // HTML generation code for conflict details
        var conflictItems = "";
        if (conflicts.length === 0) {
            conflictItems =
                '<div class="no-conflicts">No potential conflicts detected</div>';
        }
        else {
            conflicts.forEach(function (conflict, index) {
                conflictItems += "\n                <div class=\"conflict-item\">\n                    <h3>Conflict #".concat(index + 1, ": ").concat(conflict.file, "</h3>\n                    <div class=\"branches\">\n                        <span>Between branches: <strong>").concat(conflict.branch1, "</strong> and <strong>").concat(conflict.branch2, "</strong></span>\n                    </div>\n                    <div class=\"lines\">\n                        <span>Lines: ").concat(conflict.lineStart, " - ").concat(conflict.lineEnd, "</span>\n                    </div>\n                    <pre class=\"code\"><code>").concat(_this.escapeHtml(conflict.content1), "</code></pre>\n                    <div class=\"separator\">vs.</div>\n                    <pre class=\"code\"><code>").concat(_this.escapeHtml(conflict.content2), "</code></pre>\n                </div>\n                ");
            });
        }
        return "\n        <!DOCTYPE html>\n        <html lang=\"en\">\n        <head>\n            <meta charset=\"UTF-8\">\n            <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n            <title>GitTracker Conflicts</title>\n            <style>\n                body {\n                    font-family: var(--vscode-font-family);\n                    color: var(--vscode-foreground);\n                    padding: 20px;\n                }\n                h2 {\n                    color: var(--vscode-editor-foreground);\n                    border-bottom: 1px solid var(--vscode-panel-border);\n                    padding-bottom: 10px;\n                }\n                .conflict-item {\n                    margin-bottom: 30px;\n                    padding: 15px;\n                    background-color: var(--vscode-editor-background);\n                    border-radius: 5px;\n                }\n                .conflict-item h3 {\n                    margin-top: 0;\n                    color: var(--vscode-editorWarning-foreground);\n                }\n                .branches, .lines {\n                    margin-bottom: 10px;\n                }\n                .code {\n                    background-color: var(--vscode-textCodeBlock-background);\n                    padding: 10px;\n                    border-radius: 5px;\n                    overflow: auto;\n                    font-family: var(--vscode-editor-font-family);\n                    font-size: var(--vscode-editor-font-size);\n                }\n                .separator {\n                    text-align: center;\n                    margin: 10px 0;\n                    font-weight: bold;\n                    color: var(--vscode-editorWarning-foreground);\n                }\n                .no-conflicts {\n                    padding: 20px;\n                    text-align: center;\n                    font-style: italic;\n                    color: var(--vscode-disabledForeground);\n                }\n            </style>\n        </head>\n        <body>\n            <h2>GitTracker Potential Conflicts</h2>\n            <div class=\"conflicts-container\">\n                ".concat(conflictItems, "\n            </div>\n        </body>\n        </html>\n        ");
    };
    GitTracker.prototype.escapeHtml = function (unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    };
    return GitTracker;
}());
exports.GitTracker = GitTracker;
var gitTrackerInstance;
function activate(context) {
    gitTrackerInstance = new GitTracker(context);
    gitTrackerInstance.activate();
}
function deactivate() {
    if (gitTrackerInstance) {
        gitTrackerInstance.deactivate();
    }
}
