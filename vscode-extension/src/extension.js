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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitTracker = void 0;
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const cp = __importStar(require("child_process"));
const axios_1 = __importDefault(require("axios"));
const statusBar_1 = require("./statusBar");
const treeView_1 = require("./treeView");
const decorations_1 = require("./decorations");
const commands_1 = require("./commands");
class GitTracker {
    constructor(context) {
        this.serverUrl = "http://localhost:5000";
        this.context = context;
        this.statusBar = new statusBar_1.GitTrackerStatusBar();
        this.treeProvider = new treeView_1.GitTrackerTreeProvider();
    }
    activate() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            this.workspaceRoot = (_b = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.uri.fsPath;
            if (!this.workspaceRoot) {
                vscode.window.showInformationMessage("GitTracker: No workspace folder open");
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
            vscode.window.createTreeView("gittracker-branches", {
                treeDataProvider: this.treeProvider,
            });
            // Register decorations
            (0, decorations_1.registerDecorations)(this.context);
            // Register commands
            (0, commands_1.registerCommands)(this.context, this);
            // Start Python backend
            yield this.startPythonBackend();
            // Initial analysis
            yield this.analyzeRepository();
            // Set up interval for periodic analysis
            const config = vscode.workspace.getConfiguration("gittracker");
            const frequency = config.get("analysisFrequency", 300); // seconds
            this.analyzeInterval = setInterval(() => this.analyzeRepository(), frequency * 1000);
        });
    }
    deactivate() {
        return __awaiter(this, void 0, void 0, function* () {
            // Clear interval
            if (this.analyzeInterval) {
                clearInterval(this.analyzeInterval);
            }
            // Stop Python backend
            this.stopPythonBackend();
            // Clean up status bar
            this.statusBar.dispose();
        });
    }
    isGitRepository(dir) {
        return fs.existsSync(path.join(dir, ".git"));
    }
    startPythonBackend() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const config = vscode.workspace.getConfiguration("gittracker");
                let pythonPath = config.get("pythonPath", "");
                if (!pythonPath) {
                    // Try to find Python in path
                    pythonPath = "python";
                    // On Windows, try python3 if python is not found
                    if (process.platform === "win32") {
                        try {
                            cp.execSync("python --version");
                        }
                        catch (_c) {
                            pythonPath = "python3";
                        }
                    }
                    // On Unix-like systems (macOS, Linux), try python3 first
                    if (process.platform === "darwin" || process.platform === "linux") {
                        try {
                            cp.execSync("python3 --version");
                            pythonPath = "python3";
                        }
                        catch (_d) {
                            // Fallback to python
                        }
                    }
                }
                // Locate backend directory
                const extensionPath = this.context.extensionPath;
                const backendPath = path.join(extensionPath, "..", "backend");
                // Check if backend exists
                if (!fs.existsSync(backendPath)) {
                    vscode.window.showErrorMessage("GitTracker: Backend directory not found");
                    return;
                }
                // Start server
                this.pythonProcess = cp.spawn(pythonPath, ["-m", "gittracker.server", "--workspace", this.workspaceRoot || ""], {
                    cwd: backendPath,
                    env: Object.assign(Object.assign({}, process.env), { PYTHONPATH: backendPath }),
                });
                (_a = this.pythonProcess.stdout) === null || _a === void 0 ? void 0 : _a.on("data", (data) => {
                    console.log(`GitTracker backend: ${data}`);
                });
                (_b = this.pythonProcess.stderr) === null || _b === void 0 ? void 0 : _b.on("data", (data) => {
                    console.error(`GitTracker backend error: ${data}`);
                });
                // Wait for server to start
                yield new Promise((resolve) => setTimeout(resolve, 2000));
                // Check if server is running
                try {
                    const response = yield axios_1.default.get(`${this.serverUrl}/status`);
                    if (response.data.status === "ready") {
                        vscode.window.showInformationMessage("GitTracker: Backend started successfully");
                    }
                }
                catch (error) {
                    vscode.window.showErrorMessage("GitTracker: Failed to connect to backend server");
                    console.error(error);
                }
            }
            catch (error) {
                vscode.window.showErrorMessage(`GitTracker: Failed to start backend: ${error}`);
                console.error(error);
            }
        });
    }
    stopPythonBackend() {
        if (this.pythonProcess) {
            this.pythonProcess.kill();
            this.pythonProcess = undefined;
        }
    }
    analyzeRepository() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Update status bar to show analysis in progress
                this.statusBar.setAnalyzing(true);
                // Call backend API to analyze repository
                const response = yield axios_1.default.post(`${this.serverUrl}/analyze`, {
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
                    const fileConflicts = conflicts.filter((c) => c.file === path.relative(this.workspaceRoot || "", filePath));
                    if (fileConflicts.length > 0) {
                        // Trigger decoration update
                        vscode.commands.executeCommand("gittracker.updateDecorations", fileConflicts);
                    }
                }
            }
            catch (error) {
                console.error("Failed to analyze repository:", error);
                this.statusBar.setError(true);
            }
            finally {
                // Reset status bar
                this.statusBar.setAnalyzing(false);
            }
        });
    }
    configurePythonBackend() {
        return __awaiter(this, void 0, void 0, function* () {
            const pythonPath = yield vscode.window.showInputBox({
                prompt: "Enter path to Python executable",
                placeHolder: "e.g., /usr/bin/python3 or C:\\Python39\\python.exe",
            });
            if (pythonPath) {
                const config = vscode.workspace.getConfiguration("gittracker");
                yield config.update("pythonPath", pythonPath, vscode.ConfigurationTarget.Global);
                // Restart backend
                this.stopPythonBackend();
                yield this.startPythonBackend();
            }
        });
    }
    showConflicts() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.get(`${this.serverUrl}/conflicts`);
                const conflicts = response.data.conflicts;
                // Show conflicts in a webview panel
                const panel = vscode.window.createWebviewPanel("gitTrackerConflicts", "GitTracker: Potential Conflicts", vscode.ViewColumn.One, {
                    enableScripts: true,
                });
                // Generate HTML content for webview
                panel.webview.html = this.generateConflictsHtml(conflicts);
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to fetch conflicts: ${error}`);
            }
        });
    }
    generateConflictsHtml(conflicts) {
        // HTML generation code for conflict details
        let conflictItems = "";
        if (conflicts.length === 0) {
            conflictItems =
                '<div class="no-conflicts">No potential conflicts detected</div>';
        }
        else {
            conflicts.forEach((conflict, index) => {
                conflictItems += `
                <div class="conflict-item">
                    <h3>Conflict #${index + 1}: ${conflict.file}</h3>
                    <div class="branches">
                        <span>Between branches: <strong>${conflict.branch1}</strong> and <strong>${conflict.branch2}</strong></span>
                    </div>
                    <div class="lines">
                        <span>Lines: ${conflict.lineStart} - ${conflict.lineEnd}</span>
                    </div>
                    <pre class="code"><code>${this.escapeHtml(conflict.content1)}</code></pre>
                    <div class="separator">vs.</div>
                    <pre class="code"><code>${this.escapeHtml(conflict.content2)}</code></pre>
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
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}
exports.GitTracker = GitTracker;
let gitTracker;
function activate(context) {
    gitTracker = new GitTracker(context);
    gitTracker.activate();
}
function deactivate() {
    if (gitTracker) {
        gitTracker.deactivate();
    }
}
