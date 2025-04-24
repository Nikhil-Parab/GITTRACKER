"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitTrackerStatusBar = void 0;
var vscode = require("vscode");
var GitTrackerStatusBar = /** @class */ (function () {
    function GitTrackerStatusBar() {
        this.isAnalyzing = false;
        this.hasError = false;
        this.conflictCount = 0;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.command = "GitTracker.showConflicts";
    }
    GitTrackerStatusBar.prototype.initialize = function (context) {
        this.updateStatusBar();
        this.statusBarItem.show();
        context.subscriptions.push(this.statusBarItem);
    };
    GitTrackerStatusBar.prototype.setAnalyzing = function (analyzing) {
        this.isAnalyzing = analyzing;
        this.updateStatusBar();
    };
    GitTrackerStatusBar.prototype.setError = function (error) {
        this.hasError = error;
        this.updateStatusBar();
    };
    GitTrackerStatusBar.prototype.updateConflicts = function (count) {
        this.conflictCount = count;
        this.updateStatusBar();
    };
    GitTrackerStatusBar.prototype.updateStatusBar = function () {
        if (this.isAnalyzing) {
            this.statusBarItem.text = "$(sync~spin) GitTracker: Analyzing...";
            this.statusBarItem.tooltip =
                "Analyzing repository for potential conflicts";
            return;
        }
        if (this.hasError) {
            this.statusBarItem.text = "$(error) GitTracker";
            this.statusBarItem.tooltip = "Error analyzing repository";
            return;
        }
        if (this.conflictCount > 0) {
            this.statusBarItem.text = "$(warning) GitTracker: ".concat(this.conflictCount, " conflict").concat(this.conflictCount === 1 ? "" : "s");
            this.statusBarItem.tooltip = "".concat(this.conflictCount, " potential merge conflict").concat(this.conflictCount === 1 ? "" : "s", " detected");
            return;
        }
        this.statusBarItem.text = "$(check) GitTracker";
        this.statusBarItem.tooltip = "No potential conflicts detected";
    };
    GitTrackerStatusBar.prototype.dispose = function () {
        this.statusBarItem.dispose();
    };
    return GitTrackerStatusBar;
}());
exports.GitTrackerStatusBar = GitTrackerStatusBar;
