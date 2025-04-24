"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitTrackerTreeProvider = void 0;
var vscode = require("vscode");
var path = require("path");
var BranchItem = /** @class */ (function (_super) {
    __extends(BranchItem, _super);
    function BranchItem(label, collapsibleState, conflicts) {
        var _this = _super.call(this, label, collapsibleState) || this;
        _this.label = label;
        _this.collapsibleState = collapsibleState;
        _this.conflicts = conflicts;
        _this.tooltip = "Branch '".concat(label, "' has potential conflicts");
        _this.description = "".concat(conflicts.length, " conflict").concat(conflicts.length === 1 ? "" : "s");
        _this.iconPath = new vscode.ThemeIcon("git-branch");
        _this.contextValue = "branch";
        return _this;
    }
    return BranchItem;
}(vscode.TreeItem));
var FileItem = /** @class */ (function (_super) {
    __extends(FileItem, _super);
    function FileItem(label, filePath, conflicts) {
        var _this = _super.call(this, label, vscode.TreeItemCollapsibleState.Collapsed) || this;
        _this.label = label;
        _this.filePath = filePath;
        _this.conflicts = conflicts;
        _this.tooltip = "File '".concat(label, "' has potential conflicts");
        _this.description = "".concat(conflicts.length, " conflict").concat(conflicts.length === 1 ? "" : "s");
        _this.iconPath = new vscode.ThemeIcon("file");
        _this.contextValue = "file";
        _this.command = {
            command: "vscode.open",
            arguments: [vscode.Uri.file(filePath)],
            title: "Open File",
        };
        return _this;
    }
    return FileItem;
}(vscode.TreeItem));
var ConflictItem = /** @class */ (function (_super) {
    __extends(ConflictItem, _super);
    function ConflictItem(conflict, filePath) {
        var _this = _super.call(this, "Lines ".concat(conflict.lineStart, "-").concat(conflict.lineEnd), vscode.TreeItemCollapsibleState.None) || this;
        _this.conflict = conflict;
        _this.filePath = filePath;
        _this.tooltip = "Conflict between branches '".concat(conflict.branch1, "' and '").concat(conflict.branch2, "'");
        _this.description = "".concat(conflict.branch1, " \u2194 ").concat(conflict.branch2);
        _this.iconPath = new vscode.ThemeIcon("warning");
        _this.contextValue = "conflict";
        _this.command = {
            command: "vscode.open",
            arguments: [
                vscode.Uri.file(filePath),
                {
                    selection: new vscode.Range(conflict.lineStart - 1, 0, conflict.lineEnd - 1, 0),
                },
            ],
            title: "Go to Conflict",
        };
        return _this;
    }
    return ConflictItem;
}(vscode.TreeItem));
var GitTrackerTreeProvider = /** @class */ (function () {
    function GitTrackerTreeProvider() {
        var _a, _b;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.conflicts = [];
        this.workspaceRoot = (_b = (_a = vscode.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.uri.fsPath;
    }
    GitTrackerTreeProvider.prototype.updateConflicts = function (conflicts) {
        this.conflicts = conflicts;
        this._onDidChangeTreeData.fire();
    };
    GitTrackerTreeProvider.prototype.getTreeItem = function (element) {
        return element;
    };
    GitTrackerTreeProvider.prototype.getChildren = function (element) {
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
    };
    GitTrackerTreeProvider.prototype.getBranchItems = function () {
        // Group conflicts by branch
        var branchMap = new Map();
        this.conflicts.forEach(function (conflict) {
            var _a, _b;
            // Add conflicts for both branches involved
            if (!branchMap.has(conflict.branch1)) {
                branchMap.set(conflict.branch1, []);
            }
            (_a = branchMap.get(conflict.branch1)) === null || _a === void 0 ? void 0 : _a.push(conflict);
            if (!branchMap.has(conflict.branch2)) {
                branchMap.set(conflict.branch2, []);
            }
            (_b = branchMap.get(conflict.branch2)) === null || _b === void 0 ? void 0 : _b.push(conflict);
        });
        // Create branch items
        var branches = [];
        branchMap.forEach(function (branchConflicts, branchName) {
            branches.push(new BranchItem(branchName, vscode.TreeItemCollapsibleState.Collapsed, branchConflicts));
        });
        return Promise.resolve(branches);
    };
    GitTrackerTreeProvider.prototype.getFileItems = function (branchName) {
        var _this = this;
        // Get conflicts for this branch
        var branchConflicts = this.conflicts.filter(function (conflict) {
            return conflict.branch1 === branchName || conflict.branch2 === branchName;
        });
        // Group by file
        var fileMap = new Map();
        branchConflicts.forEach(function (conflict) {
            var _a;
            if (!fileMap.has(conflict.file)) {
                fileMap.set(conflict.file, []);
            }
            (_a = fileMap.get(conflict.file)) === null || _a === void 0 ? void 0 : _a.push(conflict);
        });
        // Create file items
        var files = [];
        fileMap.forEach(function (fileConflicts, filePath) {
            var fullPath = path.join(_this.workspaceRoot || "", filePath);
            files.push(new FileItem(filePath, fullPath, fileConflicts));
        });
        return Promise.resolve(files);
    };
    GitTrackerTreeProvider.prototype.getConflictItems = function (fileName, filePath) {
        // Get conflicts for this file
        var fileConflicts = this.conflicts.filter(function (conflict) { return conflict.file === fileName; });
        // Create conflict items
        var conflicts = fileConflicts.map(function (conflict) { return new ConflictItem(conflict, filePath); });
        return Promise.resolve(conflicts);
    };
    return GitTrackerTreeProvider;
}());
exports.GitTrackerTreeProvider = GitTrackerTreeProvider;
