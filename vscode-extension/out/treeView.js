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
exports.GitTrackerTreeProvider = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
class BranchItem extends vscode.TreeItem {
    constructor(label, collapsibleState, conflicts) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.conflicts = conflicts;
        this.tooltip = `Branch '${label}' has potential conflicts`;
        this.description = `${conflicts.length} conflict${conflicts.length === 1 ? "" : "s"}`;
        this.iconPath = new vscode.ThemeIcon("git-branch");
        this.contextValue = "branch";
    }
}
class FileItem extends vscode.TreeItem {
    constructor(label, filePath, conflicts) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
        this.label = label;
        this.filePath = filePath;
        this.conflicts = conflicts;
        this.tooltip = `File '${label}' has potential conflicts`;
        this.description = `${conflicts.length} conflict${conflicts.length === 1 ? "" : "s"}`;
        this.iconPath = new vscode.ThemeIcon("file");
        this.contextValue = "file";
        this.command = {
            command: "vscode.open",
            arguments: [vscode.Uri.file(filePath)],
            title: "Open File",
        };
    }
}
class ConflictItem extends vscode.TreeItem {
    constructor(conflict, filePath) {
        super(`Lines ${conflict.lineStart}-${conflict.lineEnd}`, vscode.TreeItemCollapsibleState.None);
        this.conflict = conflict;
        this.filePath = filePath;
        this.tooltip = `Conflict between branches '${conflict.branch1}' and '${conflict.branch2}'`;
        this.description = `${conflict.branch1} ↔ ${conflict.branch2}`;
        this.iconPath = new vscode.ThemeIcon("warning");
        this.contextValue = "conflict";
        this.command = {
            command: "vscode.open",
            arguments: [
                vscode.Uri.file(filePath),
                {
                    selection: new vscode.Range(conflict.lineStart - 1, 0, conflict.lineEnd - 1, 0),
                },
            ],
            title: "Go to Conflict",
        };
    }
}
class GitTrackerTreeProvider {
    constructor() {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.conflicts = [];
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }
    updateConflicts(conflicts) {
        this.conflicts = conflicts;
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!this.workspaceRoot) {
            return Promise.resolve([]);
        }
        if (!element) {
            // Root level - show branches with conflicts
            return this.getBranchItems();
        }
        if (element instanceof BranchItem) {
            // Branch level - show files with conflicts in this branch
            return this.getFileItems(element.label);
        }
        if (element instanceof FileItem) {
            // File level - show conflicts in this file
            return this.getConflictItems(element.label, element.filePath);
        }
        return Promise.resolve([]);
    }
    getBranchItems() {
        // Group conflicts by branch
        const branchMap = new Map();
        this.conflicts.forEach((conflict) => {
            // Add conflicts for both branches involved
            if (!branchMap.has(conflict.branch1)) {
                branchMap.set(conflict.branch1, []);
            }
            branchMap.get(conflict.branch1)?.push(conflict);
            if (!branchMap.has(conflict.branch2)) {
                branchMap.set(conflict.branch2, []);
            }
            branchMap.get(conflict.branch2)?.push(conflict);
        });
        // Create branch items
        const branches = [];
        branchMap.forEach((branchConflicts, branchName) => {
            branches.push(new BranchItem(branchName, vscode.TreeItemCollapsibleState.Collapsed, branchConflicts));
        });
        return Promise.resolve(branches);
    }
    getFileItems(branchName) {
        // Get conflicts for this branch
        const branchConflicts = this.conflicts.filter((conflict) => conflict.branch1 === branchName || conflict.branch2 === branchName);
        // Group by file
        const fileMap = new Map();
        branchConflicts.forEach((conflict) => {
            if (!fileMap.has(conflict.file)) {
                fileMap.set(conflict.file, []);
            }
            fileMap.get(conflict.file)?.push(conflict);
        });
        // Create file items
        const files = [];
        fileMap.forEach((fileConflicts, filePath) => {
            const fullPath = path.join(this.workspaceRoot || "", filePath);
            files.push(new FileItem(filePath, fullPath, fileConflicts));
        });
        return Promise.resolve(files);
    }
    getConflictItems(fileName, filePath) {
        // Get conflicts for this file
        const fileConflicts = this.conflicts.filter((conflict) => conflict.file === fileName);
        // Create conflict items
        const conflicts = fileConflicts.map((conflict) => new ConflictItem(conflict, filePath));
        return Promise.resolve(conflicts);
    }
}
exports.GitTrackerTreeProvider = GitTrackerTreeProvider;
//# sourceMappingURL=treeView.js.map