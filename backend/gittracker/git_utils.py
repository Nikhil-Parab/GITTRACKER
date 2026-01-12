import os
import subprocess
import json
from typing import List, Dict, Any, Tuple, Optional

class GitUtils:
    """Utility class for Git operations"""
    
    def __init__(self, repo_path: str):
        """Initialize with repository path"""
        self.repo_path = repo_path
        
        # Verify this is a git repository
        if not os.path.exists(os.path.join(repo_path, '.git')):
            raise ValueError(f"Not a git repository: {repo_path}")
    
    def _run_git_command(self, command: List[str]) -> str:
        """Run a git command and return its output"""
        try:
            result = subprocess.run(
                ['git'] + command,
                cwd=self.repo_path,
                check=True,
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='replace'
            )
            return result.stdout.strip()
        except subprocess.CalledProcessError as e:
            print(f"Git command failed: {e}")
            print(f"Error output: {e.stderr}")
            return ""
    
    def get_all_branches(self) -> List[str]:
        """Get all branches in the repository"""
        local_branches = self._run_git_command(['branch', '--format=%(refname:short)']).split('\n')
        remote_branches = self._run_git_command(['branch', '-r', '--format=%(refname:short)']).split('\n')
        
        # Filter out empty strings
        local_branches = [b for b in local_branches if b]
        remote_branches = [b for b in remote_branches if b]
        
        # Remove 'origin/' prefix from remote branches
        remote_branches = [b.replace('origin/', '') for b in remote_branches]
        
        # Combine and remove duplicates
        all_branches = list(set(local_branches + remote_branches))
        
        return all_branches
    
    def get_current_branch(self) -> str:
        """Get the current branch name"""
        return self._run_git_command(['rev-parse', '--abbrev-ref', 'HEAD'])
    
    def get_branch_tracking_info(self, branch: str) -> Dict[str, str]:
        """Get the tracking information for a branch"""
        tracking_branch = self._run_git_command(['rev-parse', '--abbrev-ref', f'{branch}@{{upstream}}'])
        
        if not tracking_branch:
            return {'tracking': None}
        
        # Remove 'origin/' prefix if present
        if '/' in tracking_branch:
            tracking_branch = tracking_branch.split('/', 1)[1]
        
        return {'tracking': tracking_branch}
    
    def get_merge_base(self, branch1: str, branch2: str) -> str:
        """Get the common ancestor (merge base) of two branches"""
        return self._run_git_command(['merge-base', branch1, branch2])
    
    def get_branch_files(self, branch: str) -> List[str]:
        """Get list of files in a branch"""
        files = self._run_git_command(['ls-tree', '-r', '--name-only', branch])
        return files.split('\n') if files else []
    
    def get_file_content(self, branch: str, file_path: str) -> str:
        """Get content of a file in a specific branch"""
        return self._run_git_command(['show', f'{branch}:{file_path}'])
    
    def get_diff_between_branches(self, branch1: str, branch2: str, file_path: Optional[str] = None) -> str:
        """Get the diff between two branches, optionally for a specific file"""
        if file_path:
            return self._run_git_command(['diff', branch1, branch2, '--', file_path])
        else:
            return self._run_git_command(['diff', branch1, branch2])
    
    def get_modified_files_between_branches(self, branch1: str, branch2: str) -> List[str]:
        """Get list of files modified between two branches"""
        diff_output = self._run_git_command(['diff', '--name-only', branch1, branch2])
        return diff_output.split('\n') if diff_output else []
    
    def get_commit_history(self, branch: str, max_count: int = 50) -> List[Dict[str, Any]]:
        """Get commit history for a branch"""
        format_str = '{{"hash":"%H","subject":"%s","author":"%an","date":"%ad","email":"%ae"}}'
        log_output = self._run_git_command([
            'log', f'--format={format_str}', '--date=iso', f'--max-count={max_count}', branch
        ])
        
        commits = []
        for line in log_output.split('\n'):
            if line:
                try:
                    commit = json.loads(line)
                    commits.append(commit)
                except json.JSONDecodeError:
                    print(f"Failed to parse commit: {line}")
        
        return commits
    
    def get_file_blame(self, file_path: str, branch: str) -> List[Dict[str, Any]]:
        """Get blame information for a file"""
        blame_output = self._run_git_command([
            'blame', '-l', '--line-porcelain', branch, '--', file_path
        ])
        
        if not blame_output:
            return []
        
        # Parse the blame output
        lines = blame_output.split('\n')
        blame_info = []
        current_blame = None
        
        for line in lines:
            if line.startswith('\t'):
                # This is the code line
                if current_blame:
                    current_blame['code'] = line[1:]  # Remove the tab
                    blame_info.append(current_blame)
                    current_blame = None
            elif ' ' in line:
                key, value = line.split(' ', 1)
                if key == 'author':
                    current_blame = {'author': value, 'line': len(blame_info) + 1}
                elif current_blame and key in ['author-mail', 'author-time', 'author-tz', 'committer', 'summary']:
                    current_blame[key] = value
        
        return blame_info
    
    def fetch_latest_changes(self) -> bool:
        """Fetch latest changes from remote"""
        try:
            self._run_git_command(['fetch', '--all'])
            return True
        except Exception as e:
            print(f"Failed to fetch changes: {e}")
            return False
    
    def parse_diff_to_lines(self, diff_output: str) -> Dict[str, List[Tuple[int, int]]]:
        """Parse git diff output to get line ranges of changes"""
        changes = {}
        current_file = None
        
        lines = diff_output.split('\n')
        line_idx = 0
        
        while line_idx < len(lines):
            line = lines[line_idx]
            
            # Find file headers
            if line.startswith('diff --git'):
                # Extract filename
                parts = line.split()
                file_path = parts[2][2:]  # Remove 'a/' prefix
                current_file = file_path
                changes[current_file] = []
                
            # Find hunks
            elif line.startswith('@@'):
                # Parse hunk header
                parts = line.split()
                if len(parts) >= 3:
                    # Extract line range information
                    range_info = parts[2][1:]  # Remove '+' prefix
                    if ',' in range_info:
                        start, count = map(int, range_info.split(','))
                    else:
                        start = int(range_info)
                        count = 1
                    
                    end = start + count - 1
                    if current_file:
                        changes[current_file].append((start, end))
            
            line_idx += 1
        
        return changes