import os
from typing import List, Dict, Any, Tuple, Set
from difflib import SequenceMatcher
import re

from gittracker.git_utils import GitUtils
from gittracker.models import Conflict

class ConflictAnalyzer:
    """Analyzes Git repositories for potential merge conflicts"""
    
    def __init__(self, repo_path: str):
        """Initialize the analyzer with a repository path"""
        self.repo_path = repo_path
        self.git = GitUtils(repo_path)
        self.conflict_threshold = 0.7  # Threshold for considering changes conflicting
    
    def analyze_all_branches(self) -> List[Conflict]:
        """Analyze current branch against all other branches for potential conflicts"""
        current_branch = self.git.get_current_branch()
        branches = self.git.get_all_branches()
        
        conflicts = []
        
        # Only compare current branch with others to improve performance
        # detailed pairwise analysis can be done via specific commands if needed
        for branch in branches:
            # Skip if same branch or if it's the current branch (already selected as source)
            if branch == current_branch:
                continue
            
            # Additional optimization: ignore remote branches if local tracking branch exists?
            # For now, we compare against all to be safe but efficient.
            
            branch_info = self.git.get_branch_tracking_info(current_branch)
            other_info = self.git.get_branch_tracking_info(branch)
            
            # Skip if one tracks the other (fast-forward usually)
            if branch_info.get('tracking') == branch or other_info.get('tracking') == current_branch:
                continue
            
            # Find potential conflicts between current branch and this branch
            try:
                branch_conflicts = self.find_conflicts_between_branches(current_branch, branch)
                conflicts.extend(branch_conflicts)
            except Exception as e:
                # Log error but continue with other branches
                print(f"Error comparing {current_branch} and {branch}: {e}")
                continue
        
        return conflicts
    
    def find_conflicts_between_branches(self, branch1: str, branch2: str) -> List[Conflict]:
        """Find potential conflicts between two branches"""
        conflicts = []
        
        # Get common ancestor (merge base)
        merge_base = self.git.get_merge_base(branch1, branch2)
        if not merge_base:
            return conflicts
        
        # Get modified files in each branch since the merge base
        files_changed_in_branch1 = set(self.git.get_modified_files_between_branches(merge_base, branch1))
        files_changed_in_branch2 = set(self.git.get_modified_files_between_branches(merge_base, branch2))
        
        # Find files modified in both branches
        common_modified_files = files_changed_in_branch1.intersection(files_changed_in_branch2)
        
        for file_path in common_modified_files:
            # Check if file exists in both branches
            try:
                content_base = self.git.get_file_content(merge_base, file_path)
                content_branch1 = self.git.get_file_content(branch1, file_path)
                content_branch2 = self.git.get_file_content(branch2, file_path)
            except Exception:
                # Skip if file doesn't exist in one of the branches
                continue
            
            # Find potentially conflicting line ranges
            file_conflicts = self.find_file_conflicts(
                file_path, content_base, content_branch1, content_branch2, branch1, branch2
            )
            
            conflicts.extend(file_conflicts)
        
        return conflicts
    
    def find_file_conflicts(self, file_path: str, base_content: str, 
                           branch1_content: str, branch2_content: str,
                           branch1: str, branch2: str) -> List[Conflict]:
        """Find potential conflicts in a specific file between two branches"""
        conflicts = []
        
        # Split content into lines
        base_lines = base_content.splitlines()
        branch1_lines = branch1_content.splitlines()
        branch2_lines = branch2_content.splitlines()
        
        # Get diff between base and each branch
        diff1 = self.compute_diff(base_lines, branch1_lines)
        diff2 = self.compute_diff(base_lines, branch2_lines)
        
        # Find overlapping changes
        overlaps = self.find_overlapping_changes(diff1, diff2)
        
        for start1, end1, start2, end2 in overlaps:
            # Get context for the conflict
            context1 = '\n'.join(branch1_lines[max(0, start1-1):min(len(branch1_lines), end1+1)])
            context2 = '\n'.join(branch2_lines[max(0, start2-1):min(len(branch2_lines), end2+1)])
            
            # Only include meaningful conflicts (non-empty changes)
            if context1.strip() and context2.strip():
                conflict = Conflict(
                    file=file_path,
                    branch1=branch1,
                    branch2=branch2,
                    line_start=start1 + 1,  # Convert to 1-based line numbers
                    line_end=end1 + 1,
                    content1=context1,
                    content2=context2
                )
                conflicts.append(conflict)
        
        return conflicts
    
    def compute_diff(self, a: List[str], b: List[str]) -> List[Tuple[int, int]]:
        """Compute diff between two lists of lines"""
        matcher = SequenceMatcher(None, a, b)
        changes = []
        
        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag in ('replace', 'delete', 'insert'):
                changes.append((j1, j2-1))  # Convert to inclusive end index
        
        # Merge adjacent or overlapping changes
        if changes:
            merged_changes = [changes[0]]
            for current in changes[1:]:
                prev = merged_changes[-1]
                if current[0] <= prev[1] + 3:  # Allow small gaps (3 lines)
                    merged_changes[-1] = (prev[0], max(prev[1], current[1]))
                else:
                    merged_changes.append(current)
            
            return merged_changes
        
        return []
    
    def find_overlapping_changes(self, changes1: List[Tuple[int, int]], 
                                changes2: List[Tuple[int, int]]) -> List[Tuple[int, int, int, int]]:
        """Find overlapping changes between two sets of changes"""
        overlaps = []
        
        for start1, end1 in changes1:
            for start2, end2 in changes2:
                # Check for overlap
                if self.is_overlapping(start1, end1, start2, end2):
                    overlaps.append((start1, end1, start2, end2))
        
        return overlaps
    
    def is_overlapping(self, start1: int, end1: int, start2: int, end2: int) -> bool:
        """Check if two ranges overlap"""
        # Two ranges overlap if one starts before the other ends
        return start1 <= end2 and start2 <= end1
    
    def analyze_file(self, file_path: str) -> List[Conflict]:
        """Analyze a specific file across all branches"""
        branches = self.git.get_all_branches()
        conflicts = []
        
        for i, branch1 in enumerate(branches):
            for branch2 in branches[i+1:]:
                if branch1 == branch2:
                    continue
                
                # Check if file exists in both branches
                try:
                    content1 = self.git.get_file_content(branch1, file_path)
                    content2 = self.git.get_file_content(branch2, file_path)
                except Exception:
                    continue
                
                # Find merge base
                merge_base = self.git.get_merge_base(branch1, branch2)
                if not merge_base:
                    continue
                
                try:
                    base_content = self.git.get_file_content(merge_base, file_path)
                except Exception:
                    continue
                
                # Find conflicts in this file between these branches
                file_conflicts = self.find_file_conflicts(
                    file_path, base_content, content1, content2, branch1, branch2
                )
                
                conflicts.extend(file_conflicts)
        
        return conflicts
    
    def suggest_resolution(self, conflict: Conflict) -> str:
        """Suggest a resolution for a conflict"""
        # Get the content from both branches
        content1 = conflict.content1
        content2 = conflict.content2
        
        # Simple resolution strategy: attempt to combine non-overlapping parts
        lines1 = content1.splitlines()
        lines2 = content2.splitlines()
        
        matcher = SequenceMatcher(None, lines1, lines2)
        
        # Build a merged version
        merged = []
        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == 'equal':
                # Add lines that are the same in both versions
                merged.extend(lines1[i1:i2])
            elif tag == 'replace':
                # For replaced blocks, include both with markers
                merged.append("<<<<<<< Branch: " + conflict.branch1)
                merged.extend(lines1[i1:i2])
                merged.append("=======")
                merged.extend(lines2[j1:j2])
                merged.append(">>>>>>> Branch: " + conflict.branch2)
            elif tag == 'delete':
                # Lines only in the first version
                merged.append("<<<<<<< Branch: " + conflict.branch1)
                merged.extend(lines1[i1:i2])
                merged.append("=======")
                merged.append(">>>>>>> Branch: " + conflict.branch2)
            elif tag == 'insert':
                # Lines only in the second version
                merged.append("<<<<<<< Branch: " + conflict.branch1)
                merged.append("=======")
                merged.extend(lines2[j1:j2])
                merged.append(">>>>>>> Branch: " + conflict.branch2)
                
        return '\n'.join(merged)