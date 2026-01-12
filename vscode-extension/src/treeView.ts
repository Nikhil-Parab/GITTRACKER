import * as vscode from "vscode";
import * as path from "path";

class BranchItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly conflicts: any[]
  ) {
    super(label, collapsibleState);

    this.tooltip = `Branch '${label}' has potential conflicts`;
    this.description = `${conflicts.length} conflict${
      conflicts.length === 1 ? "" : "s"
    }`;
    this.iconPath = new vscode.ThemeIcon("git-branch");

    this.contextValue = "branch";
  }
}

class FileItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly filePath: string,
    public readonly conflicts: any[]
  ) {
    super(label, vscode.TreeItemCollapsibleState.Collapsed);

    this.tooltip = `File '${label}' has potential conflicts`;
    this.description = `${conflicts.length} conflict${
      conflicts.length === 1 ? "" : "s"
    }`;
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
  constructor(public readonly conflict: any, public readonly filePath: string) {
    super(
      `Lines ${conflict.lineStart}-${conflict.lineEnd}`,
      vscode.TreeItemCollapsibleState.None
    );

    this.tooltip = `Conflict between branches '${conflict.branch1}' and '${conflict.branch2}'`;
    this.description = `${conflict.branch1} ↔ ${conflict.branch2}`;
    this.iconPath = new vscode.ThemeIcon("warning");

    this.contextValue = "conflict";
    this.command = {
      command: "GitTracker.showConflicts",
      arguments: [], 
      title: "View Conflict Details",
    };
  }
}

export class GitTrackerTreeProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    vscode.TreeItem | undefined | null | void
  > = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    vscode.TreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private conflicts: any[] = [];
  private workspaceRoot: string | undefined;

  constructor() {
    this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  updateConflicts(conflicts: any[]): void {
    this.conflicts = conflicts;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
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

  private getBranchItems(): Thenable<BranchItem[]> {
    // Group conflicts by branch
    const branchMap = new Map<string, any[]>();

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
    const branches: BranchItem[] = [];
    branchMap.forEach((branchConflicts, branchName) => {
      branches.push(
        new BranchItem(
          branchName,
          vscode.TreeItemCollapsibleState.Collapsed,
          branchConflicts
        )
      );
    });

    return Promise.resolve(branches);
  }

  private getFileItems(branchName: string): Thenable<FileItem[]> {
    // Get conflicts for this branch
    const branchConflicts = this.conflicts.filter(
      (conflict) =>
        conflict.branch1 === branchName || conflict.branch2 === branchName
    );

    // Group by file
    const fileMap = new Map<string, any[]>();
    branchConflicts.forEach((conflict) => {
      if (!fileMap.has(conflict.file)) {
        fileMap.set(conflict.file, []);
      }
      fileMap.get(conflict.file)?.push(conflict);
    });

    // Create file items
    const files: FileItem[] = [];
    fileMap.forEach((fileConflicts, filePath) => {
      const fullPath = path.join(this.workspaceRoot || "", filePath);
      files.push(new FileItem(filePath, fullPath, fileConflicts));
    });

    return Promise.resolve(files);
  }

  private getConflictItems(
    fileName: string,
    filePath: string
  ): Thenable<ConflictItem[]> {
    // Get conflicts for this file
    const fileConflicts = this.conflicts.filter(
      (conflict) => conflict.file === fileName
    );

    // Create conflict items
    const conflicts = fileConflicts.map(
      (conflict) => new ConflictItem(conflict, filePath)
    );

    return Promise.resolve(conflicts);
  }
}
