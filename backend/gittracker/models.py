from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional
import json

@dataclass
class Conflict:
    """Represents a potential merge conflict"""
    file: str
    branch1: str
    branch2: str
    line_start: int
    line_end: int
    content1: str
    content2: str
    id: str = None  # Generated ID
    
    def __post_init__(self):
        """Generate an ID if not provided"""
        if not self.id:
            self.id = f"{self.file}:{self.branch1}:{self.branch2}:{self.line_start}:{self.line_end}"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation -- ensuring camelCase for frontend"""
        d = asdict(self)
        # Convert snake_case to camelCase manually for keys required by frontend
        d['lineStart'] = d.pop('line_start')
        d['lineEnd'] = d.pop('line_end')
        return d
    
    def to_json(self) -> str:
        """Convert to JSON string"""
        return json.dumps(self.to_dict())
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Conflict':
        """Create from dictionary - handling camelCase from frontend"""
        d = data.copy()
        if 'lineStart' in d and 'line_start' not in d:
             d['line_start'] = d.pop('lineStart')
        if 'lineEnd' in d and 'line_end' not in d:
             d['line_end'] = d.pop('lineEnd')
        return cls(**d)
    
    @classmethod
    def from_json(cls, json_str: str) -> 'Conflict':
        """Create from JSON string"""
        return cls.from_dict(json.loads(json_str))

@dataclass
class BranchInfo:
    """Information about a Git branch"""
    name: str
    tracking: Optional[str] = None
    ahead: int = 0
    behind: int = 0
    last_commit: str = None
    last_commit_date: str = None
    author: str = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation"""
        return asdict(self)

@dataclass
class RepositoryState:
    """Represents the state of a Git repository"""
    path: str
    current_branch: str
    branches: List[BranchInfo] = field(default_factory=list)
    conflicts: List[Conflict] = field(default_factory=list)
    last_analyzed: str = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation"""
        result = asdict(self)
        # Convert conflicts to dicts
        result['conflicts'] = [c.to_dict() for c in self.conflicts]
        # Convert branches to dicts
        result['branches'] = [b.to_dict() for b in self.branches]
        return result
    
    def to_json(self) -> str:
        """Convert to JSON string"""
        return json.dumps(self.to_dict())
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'RepositoryState':
        """Create from dictionary"""
        # Handle nested objects
        conflicts = [Conflict.from_dict(c) for c in data.get('conflicts', [])]
        branches = [BranchInfo(**b) for b in data.get('branches', [])]
        
        # Remove these fields from data
        data_copy = data.copy()
        if 'conflicts' in data_copy:
            del data_copy['conflicts']
        if 'branches' in data_copy:
            del data_copy['branches']
        
        # Create the instance
        instance = cls(**data_copy)
        instance.conflicts = conflicts
        instance.branches = branches
        
        return instance
    
    @classmethod
    def from_json(cls, json_str: str) -> 'RepositoryState':
        """Create from JSON string"""
        return cls.from_dict(json.loads(json_str))