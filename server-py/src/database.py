"""In-memory database implementation."""
from typing import Dict, Any, Optional

class InMemoryDatabase:
    """Simple in-memory storage."""
    
    _games: Dict[str, Any] = {}
    
    @classmethod
    async def connect(cls) -> None:
        """No-op for in-memory."""
        pass
    
    @classmethod
    async def disconnect(cls) -> None:
        """Clear storage."""
        cls._games.clear()

    @classmethod
    def get_games_collection(cls):
        """Return the dict acting as collection."""
        return cls._games

# Convenience function for dependency injection
async def get_database() -> InMemoryDatabase:
    """FastAPI dependency."""
    return InMemoryDatabase()

