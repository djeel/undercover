"""Game-related API routes.

SECURITY: All endpoints that return game state filter based on
X-Player-ID header to prevent role leakage.
"""
from typing import Optional, Any
from fastapi import APIRouter, HTTPException, Header, Depends

from ..database import get_database
from ..models.schemas import (
    CreateGameRequest,
    CreateGameResponse,
    AddPlayerRequest,
    AddPlayerResponse,
    AssignRolesRequest,
    AssignRolesResponse,
    GameStateResponse,
    EliminateRequest,
    EliminateResponse,
    EliminateResponse,
    VoteRequest,
    GamePhase,
)
from ..services.game_service import GameService
from ..socket_manager import socket_manager


router = APIRouter(prefix="/game", tags=["game"])


def get_game_service(db: Any = Depends(get_database)) -> GameService:
    """Dependency injection for GameService."""
    return GameService(db)


# ============================================================================
# Game Lifecycle
# ============================================================================

@router.post("/create", response_model=CreateGameResponse)
async def create_game(
    request: CreateGameRequest = None,
    service: GameService = Depends(get_game_service),
):
    """Create a new game in LOBBY phase.
    
    Optionally specify a theme_id to pre-select word theme.
    Returns the public game ID for sharing.
    """
    request = request or CreateGameRequest()
    game_id = await service.create_game(request.theme_id, request.language)
    return CreateGameResponse(game_id=game_id)


@router.post("/{game_id}/players", response_model=AddPlayerResponse)
async def add_player(
    game_id: str,
    request: AddPlayerRequest,
    service: GameService = Depends(get_game_service),
):
    """Add a player to a game.
    
    Can only be done while game is in LOBBY phase.
    Returns the player's unique ID for future requests.
    """
    player = await service.add_player(game_id, request.name)
    if not player:
        raise HTTPException(
            status_code=404, 
            detail="Game not found or not in LOBBY phase"
        )
    
    # Broadcast update
    await socket_manager.broadcast_game_state(game_id, service)
    
    return AddPlayerResponse(player_id=player.id, name=player.name)


@router.post("/{game_id}/assign-roles", response_model=AssignRolesResponse)
async def assign_roles(
    game_id: str,
    request: AssignRolesRequest,
    service: GameService = Depends(get_game_service),
):
    """Assign roles to all players and start the game.
    
    Validates that special role counts don't exceed player count.
    Transitions game from LOBBY to PLAYING phase.
    """
    try:
        success = await service.assign_roles(
            game_id,
            request.undercover_count,
            request.mr_white_count,
            request.jester_count,
            request.bodyguard_count,
        )
        if not success:
            raise HTTPException(
                status_code=404,
                detail="Game not found or not in LOBBY phase"
            )
    
        # Broadcast update
        await socket_manager.broadcast_game_state(game_id, service)
        
        return AssignRolesResponse(success=True, phase=GamePhase.PLAYING)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ============================================================================
# Game State
# ============================================================================

@router.post("/{game_id}/restart", response_model=bool)
async def restart_game(
    game_id: str,
    service: GameService = Depends(get_game_service),
):
    """Restart a game.
    
    Transitions game back to LOBBY phase.
    Resets all player states (alive, roles, etc).
    """
    success = await service.restart_game(game_id)
    if not success:
        raise HTTPException(status_code=404, detail="Game not found")
        
    # Broadcast update
    await socket_manager.broadcast_game_state(game_id, service)
        
    return True

@router.get("/{game_id}", response_model=GameStateResponse)
async def get_game_state(
    game_id: str,
    x_player_id: Optional[str] = Header(None, alias="X-Player-ID"),
    service: GameService = Depends(get_game_service),
):
    """Get current game state.
    
    SECURITY: Pass X-Player-ID header to see your own role/word.
    Other players' roles and words are NEVER included.
    Mr. White sees their role but NOT the word.
    """
    game = await service.get_game(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    return service.get_filtered_state(game, x_player_id)


# ============================================================================
# Actions (Vote / Kick)
# ============================================================================

@router.delete("/{game_id}/players/{player_id}", response_model=bool)
async def remove_player(
    game_id: str,
    player_id: str,
    service: GameService = Depends(get_game_service),
):
    """Remove a player (Kick).
    
    Only permitted in LOBBY phase.
    """
    success = await service.remove_player(game_id, player_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot kick player")
        
    await socket_manager.broadcast_game_state(game_id, service)
    return True


@router.post("/{game_id}/vote", response_model=bool)
async def cast_vote(
    game_id: str,
    request: VoteRequest,
    service: GameService = Depends(get_game_service),
):
    """Cast a vote against a player.
    
    Updates vote counts. Returns true if successful.
    """
    try:
        new_count = await service.cast_vote(game_id, request.voter_id, request.target_player_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    await socket_manager.broadcast_game_state(game_id, service)
    return True


# ============================================================================
# Elimination
# ============================================================================

@router.post("/{game_id}/eliminate", response_model=EliminateResponse)
async def eliminate_player(
    game_id: str,
    request: EliminateRequest,
    service: GameService = Depends(get_game_service),
):
    """Eliminate a player from the game.
    
    If eliminating Mr. White, they can provide a guess of the
    civilian word via mr_white_guess field. A correct guess
    wins the game for Mr. White.
    
    Returns whether the game is over and who won.
    """
    result = await service.eliminate_player(
        game_id,
        request.target_player_id,
        request.mr_white_guess,
    )
    if not result:
        raise HTTPException(
            status_code=400,
            detail="Invalid game state or player"
        )
    await socket_manager.broadcast_game_state(game_id, service)
    return result
