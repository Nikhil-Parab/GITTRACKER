"""
GitTracker - Server Component

This module implements a Flask server that provides REST APIs for the GitTracker
VS Code extension to interact with the Git repository analysis functionality.
"""

import os
import sys
import json
import logging
import datetime
from typing import Dict, List, Any

from flask import Flask, request, jsonify
from flask_cors import CORS

# Import GitTracker modules
from gittracker.git_utils import GitUtils
from gittracker.conflict_analyzer import ConflictAnalyzer
from gittracker.repo_watcher import RepoWatcher
from gittracker.models import Conflict, RepositoryState, BranchInfo

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('gittracker-server')

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Global state
active_watchers = {}  # Map of repo_path to RepoWatcher objects
repo_states = {}      # Cache of repository states

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.datetime.now().isoformat(),
        'version': '0.1.0'
    })

@app.route('/analyze', methods=['POST'])
def analyze_repository():
    """Analyze a repository for potential conflicts"""
    data = request.json
    repo_path = data.get('repo_path')
    
    if not repo_path:
        return jsonify({
            'error': 'Repository path is required'
        }), 400
    
    try:
        # Initialize Git utilities
        git = GitUtils(repo_path)
        analyzer = ConflictAnalyzer(repo_path)
        
        # Get current branch
        current_branch = git.get_current_branch()
        
        # Analyze all branches for conflicts
        conflicts = analyzer.analyze_all_branches()
        
        # Get branch information
        branches = git.get_all_branches()
        branch_infos = []
        
        for branch in branches:
            tracking_info = git.get_branch_tracking_info(branch)
            
            # Get commit history for branch (just the most recent commit)
            commit_history = git.get_commit_history(branch, max_count=1)
            last_commit = commit_history[0] if commit_history else None
            
            branch_info = BranchInfo(
                name=branch,
                tracking=tracking_info.get('tracking'),
                last_commit=last_commit['hash'] if last_commit else None,
                last_commit_date=last_commit['date'] if last_commit else None,
                author=last_commit['author'] if last_commit else None
            )
            branch_infos.append(branch_info)
        
        # Create repository state
        repo_state = RepositoryState(
            path=repo_path,
            current_branch=current_branch,
            branches=branch_infos,
            conflicts=conflicts,
            last_analyzed=datetime.datetime.now().isoformat()
        )
        
        # Cache the state
        repo_states[repo_path] = repo_state
        
        return jsonify(repo_state.to_dict())
    
    except Exception as e:
        logger.error(f"Error analyzing repository: {e}", exc_info=True)
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/analyze/file', methods=['POST'])
def analyze_file():
    """Analyze a specific file for potential conflicts"""
    data = request.json
    repo_path = data.get('repo_path')
    file_path = data.get('file_path')
    
    if not repo_path or not file_path:
        return jsonify({
            'error': 'Repository path and file path are required'
        }), 400
    
    try:
        analyzer = ConflictAnalyzer(repo_path)
        conflicts = analyzer.analyze_file(file_path)
        
        return jsonify({
            'file': file_path,
            'conflicts': [c.to_dict() for c in conflicts]
        })
    
    except Exception as e:
        logger.error(f"Error analyzing file: {e}", exc_info=True)
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/branches', methods=['GET'])
def get_branches():
    """Get all branches in the repository"""
    repo_path = request.args.get('repo_path')
    
    if not repo_path:
        return jsonify({
            'error': 'Repository path is required'
        }), 400
    
    try:
        git = GitUtils(repo_path)
        branches = git.get_all_branches()
        current_branch = git.get_current_branch()
        
        branch_infos = []
        for branch in branches:
            tracking_info = git.get_branch_tracking_info(branch)
            branch_infos.append({
                'name': branch,
                'tracking': tracking_info.get('tracking'),
                'is_current': branch == current_branch
            })
        
        return jsonify({
            'branches': branch_infos,
            'current_branch': current_branch
        })
    
    except Exception as e:
        logger.error(f"Error getting branches: {e}", exc_info=True)
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/compare', methods=['GET'])
def compare_branches():
    """Compare contents of a file between two branches"""
    repo_path = request.args.get('repo_path')
    branch1 = request.args.get('branch1')
    branch2 = request.args.get('branch2')
    file_path = request.args.get('file')
    
    if not all([repo_path, branch1, branch2, file_path]):
        return jsonify({
            'error': 'Repository path, branches, and file are required'
        }), 400
    
    try:
        git = GitUtils(repo_path)
        
        # Get file contents in each branch
        content1 = git.get_file_content(branch1, file_path)
        content2 = git.get_file_content(branch2, file_path)
        
        return jsonify({
            'branch1': branch1,
            'branch2': branch2,
            'file': file_path,
            'content1': content1,
            'content2': content2
        })
    
    except Exception as e:
        logger.error(f"Error comparing branches: {e}", exc_info=True)
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/suggest-resolution', methods=['POST'])
def suggest_resolution():
    """Suggest a resolution for a conflict"""
    data = request.json
    conflict_data = data.get('conflict')
    
    if not conflict_data:
        return jsonify({
            'error': 'Conflict data is required'
        }), 400
    
    try:
        # Create conflict object from data
        conflict = Conflict.from_dict(conflict_data)
        
        # Initialize analyzer with repo path
        repo_path = request.args.get('repo_path')
        if not repo_path:
            # Extract repo path from conflict file path
            # This is a simplification; in practice, we'd need a more robust way to get the repo path
            repo_path = os.path.dirname(conflict.file)
        
        analyzer = ConflictAnalyzer(repo_path)
        
        # Generate suggested resolution
        suggestion = analyzer.suggest_resolution(conflict)
        
        return jsonify({
            'conflict': conflict.to_dict(),
            'suggestion': suggestion
        })
    
    except Exception as e:
        logger.error(f"Error suggesting resolution: {e}", exc_info=True)
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/watch/start', methods=['POST'])
def start_watching():
    """Start watching a repository for changes"""
    data = request.json
    repo_path = data.get('repo_path')
    interval = data.get('interval', 60)  # Default to 60 seconds
    
    if not repo_path:
        return jsonify({
            'error': 'Repository path is required'
        }), 400
    
    try:
        # Check if already watching this repo
        if repo_path in active_watchers:
            return jsonify({
                'status': 'already_watching',
                'repo_path': repo_path
            })
        
        # Define callback function for the watcher
        def on_repo_change(changes):
            logger.info(f"Repository changes detected: {changes}")
            # We could trigger WebSocket notifications here
            # For now, we'll just update the cached state
            analyze_repository_internal(repo_path)
        
        # Create and start watcher
        watcher = RepoWatcher(repo_path, callback=on_repo_change, interval=interval)
        watcher.start()
        
        # Store in active watchers
        active_watchers[repo_path] = watcher
        
        return jsonify({
            'status': 'started',
            'repo_path': repo_path,
            'interval': interval
        })
    
    except Exception as e:
        logger.error(f"Error starting watcher: {e}", exc_info=True)
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/watch/stop', methods=['POST'])
def stop_watching():
    """Stop watching a repository"""
    data = request.json
    repo_path = data.get('repo_path')
    
    if not repo_path:
        return jsonify({
            'error': 'Repository path is required'
        }), 400
    
    try:
        # Check if watching this repo
        if repo_path not in active_watchers:
            return jsonify({
                'status': 'not_watching',
                'repo_path': repo_path
            })
        
        # Stop the watcher
        watcher = active_watchers[repo_path]
        watcher.stop()
        
        # Remove from active watchers
        del active_watchers[repo_path]
        
        return jsonify({
            'status': 'stopped',
            'repo_path': repo_path
        })
    
    except Exception as e:
        logger.error(f"Error stopping watcher: {e}", exc_info=True)
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/state', methods=['GET'])
def get_repository_state():
    """Get the current state of a repository"""
    repo_path = request.args.get('repo_path')
    
    if not repo_path:
        return jsonify({
            'error': 'Repository path is required'
        }), 400
    
    try:
        # Check if we have a cached state
        if repo_path in repo_states:
            return jsonify(repo_states[repo_path].to_dict())
        
        # If not, analyze the repository
        return analyze_repository_internal(repo_path)
    
    except Exception as e:
        logger.error(f"Error getting repository state: {e}", exc_info=True)
        return jsonify({
            'error': str(e)
        }), 500

def analyze_repository_internal(repo_path):
    """Analyze a repository and return its state (helper function)"""
    try:
        # Initialize Git utilities
        git = GitUtils(repo_path)
        analyzer = ConflictAnalyzer(repo_path)
        
        # Get current branch
        current_branch = git.get_current_branch()
        
        # Analyze all branches for conflicts
        conflicts = analyzer.analyze_all_branches()
        
        # Get branch information
        branches = git.get_all_branches()
        branch_infos = []
        
        for branch in branches:
            tracking_info = git.get_branch_tracking_info(branch)
            
            # Get commit history for branch (just the most recent commit)
            commit_history = git.get_commit_history(branch, max_count=1)
            last_commit = commit_history[0] if commit_history else None
            
            branch_info = BranchInfo(
                name=branch,
                tracking=tracking_info.get('tracking'),
                last_commit=last_commit['hash'] if last_commit else None,
                last_commit_date=last_commit['date'] if last_commit else None,
                author=last_commit['author'] if last_commit else None
            )
            branch_infos.append(branch_info)
        
        # Create repository state
        repo_state = RepositoryState(
            path=repo_path,
            current_branch=current_branch,
            branches=branch_infos,
            conflicts=conflicts,
            last_analyzed=datetime.datetime.now().isoformat()
        )
        
        # Cache the state
        repo_states[repo_path] = repo_state
        
        return jsonify(repo_state.to_dict())
    
    except Exception as e:
        logger.error(f"Error in analyze_repository_internal: {e}", exc_info=True)
        return jsonify({
            'error': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('DEBUG', 'False').lower() == 'true'
    
    logger.info(f"Starting GitTracker server on port {port}, debug={debug}")
    app.run(host='0.0.0.0', port=port, debug=debug)