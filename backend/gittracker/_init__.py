"""
GitTracker - Git conflict pre-warning system

This package provides tools for analyzing Git repositories to detect
potential merge conflicts before they happen.
"""

__version__ = '0.1.0'

from gittracker.git_utils import GitUtils
from gittracker.conflict_analyzer import ConflictAnalyzer
from gittracker.repo_watcher import RepoWatcher
from gittracker.models import Conflict, BranchInfo, RepositoryState