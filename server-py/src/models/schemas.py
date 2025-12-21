"""Pydantic schemas for API request/response validation.

SECURITY: Role and word fields are carefully controlled to prevent leakage.
- Player responses never include role/word for other players
- Mr. White sees their role but not the word
"""
from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field
import uuid


# ============================================================================
# Enums
# ============================================================================

class GamePhase(str, Enum):
    """Game state phases."""
    LOBBY = "LOBBY"
    PLAYING = "PLAYING"
    VOTING = "VOTING"
    FINISHED = "FINISHED"


class PlayerRole(str, Enum):
    """Player role types (NEVER exposed to other players)."""
    CIVILIAN = "CIVILIAN"
    UNDERCOVER = "UNDERCOVER"
    MR_WHITE = "MR_WHITE"


class WinnerType(str, Enum):
    """Victory condition results."""
    CIVILIANS = "CIVILIANS"
    UNDERCOVER = "UNDERCOVER"
    MR_WHITE = "MR_WHITE"


# ============================================================================
# Word Schemas
# ============================================================================

class ThemeResponse(BaseModel):
    """Single theme in theme list."""
    theme_id: str
    name: str  # Could be localization key


class ThemeListResponse(BaseModel):
    """Response for GET /api/words/themes."""
    themes: List[ThemeResponse]


class GenerateWordRequest(BaseModel):
    """Request for POST /api/words/generate."""
    theme_id: Optional[str] = None  # None = random theme


class WordPairResponse(BaseModel):
    """Response for POST /api/words/generate (internal use)."""
    pair_id: str
    theme_id: str
    # NOTE: actual words are NOT returned to clients


# ============================================================================
# Player Schemas
# ============================================================================

class AddPlayerRequest(BaseModel):
    """Request for POST /api/game/{id}/players."""
    name: str = Field(..., min_length=1, max_length=50)


class PlayerResponse(BaseModel):
    """Public player representation (role/word filtered)."""
    id: str  # Public UUID
    name: str
    is_alive: bool
    has_voted: bool
    votes_received: int
    # These are ONLY included for the requesting player
    role: Optional[str] = None
    word: Optional[str] = None


# ============================================================================
# Game Schemas
# ============================================================================

class CreateGameRequest(BaseModel):
    """Request for POST /api/game/create."""
    theme_id: Optional[str] = None  # Optional theme selection


class CreateGameResponse(BaseModel):
    """Response for POST /api/game/create."""
    game_id: str  # Public UUID


class AddPlayerResponse(BaseModel):
    """Response for POST /api/game/{id}/players."""
    player_id: str  # Public UUID for the new player
    name: str


class AssignRolesRequest(BaseModel):
    """Request for POST /api/game/{id}/assign-roles."""
    undercover_count: int = Field(..., ge=1)
    mr_white_count: int = Field(..., ge=0)


class AssignRolesResponse(BaseModel):
    """Response for POST /api/game/{id}/assign-roles."""
    success: bool
    phase: GamePhase


class GameSettingsResponse(BaseModel):
    """Game configuration."""
    total_players: int
    undercover_count: int
    mr_white_count: int
    civilian_word: Optional[str] = None
    undercover_word: Optional[str] = None


class GameStateResponse(BaseModel):
    """Response for GET /api/game/{id}.
    
    SECURITY: Player roles/words are filtered based on requesting player.
    """
    game_id: str
    phase: GamePhase
    players: List[PlayerResponse]
    settings: Optional[GameSettingsResponse] = None
    winner: Optional[WinnerType] = None
    current_turn_player_id: Optional[str] = None


class VoteRequest(BaseModel):
    """Request for POST /api/game/{id}/vote."""
    voter_id: str
    target_player_id: str


class VoteResponse(BaseModel):
    """Response for POST /api/game/{id}/vote."""
    success: bool
    target_votes: int


class EliminateRequest(BaseModel):
    """Request for POST /api/game/{id}/eliminate."""
    target_player_id: str
    # Optional: Mr. White guess when being eliminated
    mr_white_guess: Optional[str] = None


class EliminateResponse(BaseModel):
    """Response for POST /api/game/{id}/eliminate."""
    eliminated_player_id: str
    game_over: bool
    winner: Optional[WinnerType] = None


# ============================================================================
# History Schemas
# ============================================================================

class GameHistoryItem(BaseModel):
    """Single game in history list."""
    game_id: str
    player_count: int
    winner: Optional[WinnerType]
    created_at: datetime
    finished_at: Optional[datetime]


class GameHistoryResponse(BaseModel):
    """Response for GET /api/game/history/all."""
    games: List[GameHistoryItem]
