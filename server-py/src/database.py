"""Database abstraction layer."""
from typing import Dict, Any, Optional, List
import json
import aiosqlite
import os

class GameRepository:
    """Abstract base for game storage."""
    async def connect(self): pass
    async def disconnect(self): pass
    async def get_game(self, game_id: str) -> Optional[Dict[str, Any]]: pass
    async def save_game(self, game_id: str, data: Dict[str, Any]): pass
    async def delete_game(self, game_id: str): pass
    async def delete_game(self, game_id: str): pass


class InMemoryDatabase(GameRepository):
    """In-memory storage implementation."""
    
    def __init__(self):
        self._games: Dict[str, Any] = {}
    
    async def connect(self):
        pass
    
    async def disconnect(self):
        self._games.clear()

    async def get_game(self, game_id: str) -> Optional[Dict[str, Any]]:
        return self._games.get(game_id)

    async def save_game(self, game_id: str, data: Dict[str, Any]):
        self._games[game_id] = data

    async def delete_game(self, game_id: str):
        if game_id in self._games:
            del self._games[game_id]
            



class SQLiteDatabase(GameRepository):
    """SQLite storage implementation."""
    
    def __init__(self, db_path: str = "undercover.db"):
        self.db_path = db_path
        self.conn = None
        
    async def connect(self):
        self.conn = await aiosqlite.connect(self.db_path)
        await self.conn.execute("""
            CREATE TABLE IF NOT EXISTS games (
                id TEXT PRIMARY KEY,
                data TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await self.conn.commit()
    
    async def disconnect(self):
        if self.conn:
            await self.conn.close()

    async def get_game(self, game_id: str) -> Optional[Dict[str, Any]]:
        if not self.conn: return None
        async with self.conn.execute("SELECT data FROM games WHERE id = ?", (game_id,)) as cursor:
            row = await cursor.fetchone()
            if row:
                return json.loads(row[0])
        return None

    async def save_game(self, game_id: str, data: Dict[str, Any]):
        if not self.conn: return
        json_data = json.dumps(data)
        await self.conn.execute(
            "INSERT OR REPLACE INTO games (id, data) VALUES (?, ?)",
            (game_id, json_data)
        )
        await self.conn.commit()

    async def delete_game(self, game_id: str):
        if not self.conn: return
        await self.conn.execute("DELETE FROM games WHERE id = ?", (game_id,))
        await self.conn.commit()
            


# Helper for Dependency Injection
db_instance: Optional[GameRepository] = None

async def get_database() -> GameRepository:
    global db_instance
    if db_instance is None:
        # Default to SQLite
        db_instance = SQLiteDatabase()
        await db_instance.connect()
    return db_instance
