from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
import uuid
import random
import string

from .schemas import GamePhase, PlayerRole, WinnerType


def generate_uuid() -> str:
    """Generate a new UUID string."""
    return str(uuid.uuid4())

def generate_room_code() -> str:
    """Generate a short 6-character uppercase alphanumeric code."""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))



# ============================================================================
# Embedded Documents
# ============================================================================

class PlayerDocument(BaseModel):
    """Embedded player document within a game.
    
    SECURITY: role and word are stored but NEVER sent to other players.
    """
    id: str = Field(default_factory=generate_uuid)
    name: str
    role: Optional[PlayerRole] = None
    word: Optional[str] = None  # Empty for Mr. White
    is_alive: bool = True
    has_voted: bool = False
    votes_received: int = 0


class WordPairDocument(BaseModel):
    """Word pair used in a game."""
    pair_id: str
    theme_id: str
    civilian_word: str
    undercover_word: str


# ============================================================================
# Root Documents
# ============================================================================

class GameDocument(BaseModel):
    """MongoDB game document structure.
    
    Note: _id is handled by MongoDB, we use public_id for API exposure.
    """
    public_id: str = Field(default_factory=generate_room_code)
    phase: GamePhase = GamePhase.LOBBY
    players: List[PlayerDocument] = Field(default_factory=list)
    
    # Word pair (set when roles are assigned)
    word_pair: Optional[WordPairDocument] = None
    
    # Game settings (set when roles are assigned)
    undercover_count: int = 0
    mr_white_count: int = 0
    
    # Victory state
    winner: Optional[WinnerType] = None
    
    # Gameplay state
    current_turn_player_id: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    finished_at: Optional[datetime] = None
    
    def get_player_by_id(self, player_id: str) -> Optional[PlayerDocument]:
        """Find player by their public ID."""
        for player in self.players:
            if player.id == player_id:
                return player
        return None
    
    def get_alive_players(self) -> List[PlayerDocument]:
        """Get list of players still in the game."""
        return [p for p in self.players if p.is_alive]
    
    def get_alive_by_role(self, role: PlayerRole) -> List[PlayerDocument]:
        """Get alive players of a specific role."""
        return [p for p in self.players if p.is_alive and p.role == role]


# ============================================================================
# Theme/Word Storage
# ============================================================================

class WordPairData(BaseModel):
    """Word pair definition (seed data)."""
    pair_id: str = Field(default_factory=generate_uuid)
    civilian: str
    undercover: str


class ThemeDocument(BaseModel):
    """Theme with its word pairs (can be stored in DB or memory)."""
    theme_id: str
    name: str  # Localization key or display name
    pairs: List[WordPairData]
