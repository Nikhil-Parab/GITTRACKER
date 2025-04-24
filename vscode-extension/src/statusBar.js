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
exports.GitTrackerStatusBar = void 0;
const vscode = __importStar(require("vscode"));
class GitTrackerStatusBar {
    constructor() {
        this.isAnalyzing = false;
        this.hasError = false;
        this.conflictCount = 0;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.command = "gittracker.showConflicts";
    }
    initialize(context) {
        this.updateStatusBar();
        this.statusBarItem.show();
        context.subscriptions.push(this.statusBarItem);
    }
    setAnalyzing(analyzing) {
        this.isAnalyzing = analyzing;
        this.updateStatusBar();
    }
    setError(error) {
        this.hasError = error;
        this.updateStatusBar();
    }
    updateConflicts(count) {
        this.conflictCount = count;
        this.updateStatusBar();
    }
    updateStatusBar() {
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
            this.statusBarItem.text = `$(warning) GitTracker: ${this.conflictCount} conflict${this.conflictCount === 1 ? "" : "s"}`;
            this.statusBarItem.tooltip = `${this.conflictCount} potential merge conflict${this.conflictCount === 1 ? "" : "s"} detected`;
            return;
        }
        this.statusBarItem.text = "$(check) GitTracker";
        this.statusBarItem.tooltip = "No potential conflicts detected";
    }
    dispose() {
        this.statusBarItem.dispose();
    }
}
exports.GitTrackerStatusBar = GitTrackerStatusBar;
