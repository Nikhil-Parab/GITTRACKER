import os
import time
import threading
from typing import Callable, Dict, List, Set
import logging

from gittracker.git_utils import GitUtils

class RepoWatcher:
    """Watches a Git repository for changes"""
    
    def __init__(self, repo_path: str, callback: Callable = None, interval: int = 60):
        """
        Initialize the repository watcher
        
        Args:
            repo_path: Path to the Git repository
            callback: Function to call when changes are detected
            interval: How often to check for changes (in seconds)
        """
        self.repo_path = repo_path
        self.git = GitUtils(repo_path)
        self.callback = callback
        self.interval = interval
        self.running = False
        self.thread = None
        self.last_state: Dict = {}
    
    def start(self):
        """Start watching the repository"""
        if self.running:
            return
        
        self.running = True
        self._capture_initial_state()
        
        self.thread = threading.Thread(target=self._watch_loop)
        self.thread.daemon = True
        self.thread.start()
        
        logging.info(f"Started watching repository: {self.repo_path}")
    
    def stop(self):
        """Stop watching the repository"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5.0)
            self.thread = None
        
        logging.info(f"Stopped watching repository: {self.repo_path}")
    
    def _capture_initial_state(self):
        """Capture the initial state of the repository"""
        self.last_state = {
            'branches': set(self.git.get_all_branches()),
            'head_commits': self._get_head_commits(),
            'timestamp': time.time()
        }
    
    def _get_head_commits(self) -> Dict[str, str]:
        """Get the commit hashes for all branch heads"""
        branches = self.git.get_all_branches()
        head_commits = {}
        
        for branch in branches:
            try:
                # Get the commit hash for this branch
                commit_hash = self.git._run_git_command(['rev-parse', branch])
                if commit_hash:
                    head_commits[branch] = commit_hash
            except Exception as e:
                logging.error(f"Error getting head commit for branch {branch}: {e}")
        
        return head_commits
    
    def _watch_loop(self):
        """Background thread to periodically check for changes"""
        while self.running:
            try:
                # Fetch latest changes
                self.git.fetch_latest_changes()
                
                # Check for changes
                changes = self._detect_changes()
                
                if changes['has_changes']:
                    logging.info(f"Changes detected: {changes}")
                    
                    # Update the last state
                    self._capture_initial_state()
                    
                    # Call the callback if provided
                    if self.callback:
                        self.callback(changes)
            
            except Exception as e:
                logging.error(f"Error in repository watcher: {e}")
            
            # Sleep until next check
            time.sleep(self.interval)
    
    def _detect_changes(self) -> Dict:
        """Detect changes in the repository"""
        current_branches = set(self.git.get_all_branches())
        current_head_commits = self._get_head_commits()
        
        changes = {
            'has_changes': False,
            'new_branches': current_branches - self.last_state['branches'],
            'deleted_branches': self.last_state['branches'] - current_branches,
            'updated_branches': [],
            'timestamp': time.time(),
            'elapsed_time': time.time() - self.last_state['timestamp']
        }
        
        # Check for updated branches (new commits)
        for branch in current_branches.intersection(self.last_state['branches']):
            last_commit = self.last_state['head_commits'].get(branch)
            current_commit = current_head_commits.get(branch)
            
            if last_commit != current_commit:
                changes['updated_branches'].append({
                    'branch': branch,
                    'old_commit': last_commit,
                    'new_commit': current_commit
                })
        
        # Determine if any changes were found
        if (changes['new_branches'] or changes['deleted_branches'] or 
                changes['updated_branches']):
            changes['has_changes'] = True
        
        return changes
    
    def analyze_incoming_changes(self) -> Dict:
        """Analyze incoming changes (unpulled)"""
        # Fetch latest changes
        self.git.fetch_latest_changes()
        
        branches = self.git.get_all_branches()
        current_branch = self.git.get_current_branch()
        incoming_changes = {}
        
        for branch in branches:
            try:
                # Get upstream branch
                tracking_info = self.git.get_branch_tracking_info(branch)
                tracking_branch = tracking_info.get('tracking')
                
                if tracking_branch:
                    # Check for unpulled commits
                    unpulled_commits = self.git._run_git_command([
                        'rev-list', '--count', f'{branch}..origin/{tracking_branch}'
                    ])
                    
                    if unpulled_commits and int(unpulled_commits) > 0:
                        # Get the list of files that would be affected by pulling
                        affected_files = self.git.get_modified_files_between_branches(
                            branch, f'origin/{tracking_branch}'
                        )
                        
                        incoming_changes[branch] = {
                            'tracking': tracking_branch,
                            'unpulled_commits': int(unpulled_commits),
                            'affected_files': affected_files
                        }
            except Exception as e:
                logging.error(f"Error analyzing incoming changes for {branch}: {e}")
        
        return incoming_changes