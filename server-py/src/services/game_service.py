"""Core game logic service.

Handles:
- Game creation and player management
- Role assignment algorithm
- Victory condition detection
- State filtering for security
"""
import random
from datetime import datetime
from typing import Optional, List
from motor.motor_asyncio import AsyncIOMotorDatabase

from ..models.game import GameDocument, PlayerDocument, WordPairDocument
from ..models.schemas import (
    GamePhase, PlayerRole, WinnerType,
    GameStateResponse, PlayerResponse, GameSettingsResponse,
    EliminateResponse,
)
from .word_service import WordService


class GameService:
    """Service for game state management."""
    
    COLLECTION = "games"
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db[self.COLLECTION]
    
    # ========================================================================
    # Game Lifecycle
    # ========================================================================
    
    async def create_game(self, theme_id: Optional[str] = None) -> str:
        """Create a new game in LOBBY phase.
        
        Returns:
            Public game ID (UUID).
        """
        # Generate word pair upfront (can be used when roles are assigned)
        word_pair = WordService.generate_word_pair(theme_id)
        
        game = GameDocument(word_pair=word_pair)
        
        await self.collection.insert_one(game.model_dump())
        return game.public_id
    
    async def get_game(self, game_id: str) -> Optional[GameDocument]:
        """Get game by public ID."""
        doc = await self.collection.find_one({"public_id": game_id})
        if doc:
            return GameDocument(**doc)
        return None
    
    async def _update_game(self, game: GameDocument) -> None:
        """Save game state to database."""
        await self.collection.update_one(
            {"public_id": game.public_id},
            {"$set": game.model_dump()}
        )
    
    # ========================================================================
    # Player Management
    # ========================================================================
    
    async def add_player(self, game_id: str, name: str) -> Optional[PlayerDocument]:
        """Add a player to a game.
        
        Args:
            game_id: Public game ID.
            name: Player display name.
            
        Returns:
            PlayerDocument if successful, None if game not found or not in LOBBY.
        """
        game = await self.get_game(game_id)
        if not game or game.phase != GamePhase.LOBBY:
            return None
        
        player = PlayerDocument(name=name)
        game.players.append(player)
        await self._update_game(game)
        
        return player
    
    # ========================================================================
    # Role Assignment
    # ========================================================================
    
    async def assign_roles(
        self, 
        game_id: str, 
        undercover_count: int, 
        mr_white_count: int
    ) -> bool:
        """Assign roles to all players and start the game.
        
        Algorithm:
        1. Validate counts (special roles < total players)
        2. Shuffle player indices
        3. Assign Mr. White (no word)
        4. Assign Undercover
        5. Remaining = Civilian
        6. Assign words based on role
        
        Args:
            game_id: Public game ID.
            undercover_count: Number of undercover agents.
            mr_white_count: Number of Mr. White players.
            
        Returns:
            True if successful, False otherwise.
        """
        game = await self.get_game(game_id)
        if not game or game.phase != GamePhase.LOBBY:
            return False
        
        total_players = len(game.players)
        if total_players < 3:
            raise ValueError("Minimum 3 players required")
        
        if undercover_count + mr_white_count >= total_players:
            raise ValueError("Too many special roles for player count")
        
        # Shuffle indices for random assignment
        indices = list(range(total_players))
        random.shuffle(indices)
        
        # Track role assignments
        mr_white_indices = set(indices[:mr_white_count])
        undercover_indices = set(indices[mr_white_count:mr_white_count + undercover_count])
        
        # Get word pair
        word_pair = game.word_pair
        if not word_pair:
            word_pair = WordService.generate_word_pair()
            game.word_pair = word_pair
        
        # Assign roles and words
        for i, player in enumerate(game.players):
            if i in mr_white_indices:
                player.role = PlayerRole.MR_WHITE
                player.word = None  # Mr. White gets NO word
            elif i in undercover_indices:
                player.role = PlayerRole.UNDERCOVER
                player.word = word_pair.undercover_word
            else:
                player.role = PlayerRole.CIVILIAN
                player.word = word_pair.civilian_word
        
        # Update game state
        game.phase = GamePhase.PLAYING
        game.undercover_count = undercover_count
        game.mr_white_count = mr_white_count
        
        await self._update_game(game)
        return True
    
    # ========================================================================
    # Game State (with Security Filtering)
    # ========================================================================
    
    def get_filtered_state(
        self, 
        game: GameDocument, 
        requesting_player_id: Optional[str] = None
    ) -> GameStateResponse:
        """Get game state filtered for a specific player.
        
        SECURITY: Only the requesting player sees their own role/word.
        Other players' roles and words are always hidden.
        
        Args:
            game: Full game document.
            requesting_player_id: UUID of the requesting player.
            
        Returns:
            Filtered GameStateResponse safe for client consumption.
        """
        filtered_players: List[PlayerResponse] = []
        
        for player in game.players:
            player_response = PlayerResponse(
                id=player.id,
                name=player.name,
                is_alive=player.is_alive,
                has_voted=player.has_voted,
                votes_received=player.votes_received,
            )
            
            # Only include role/word for the requesting player
            if requesting_player_id and player.id == requesting_player_id:
                player_response.role = player.role.value if player.role else None
                # Mr. White sees their role but NOT the word
                if player.role != PlayerRole.MR_WHITE:
                    player_response.word = player.word
            
            filtered_players.append(player_response)
        
        settings = None
        if game.phase != GamePhase.LOBBY:
            settings = GameSettingsResponse(
                total_players=len(game.players),
                undercover_count=game.undercover_count,
                mr_white_count=game.mr_white_count,
            )
        
        return GameStateResponse(
            game_id=game.public_id,
            phase=game.phase,
            players=filtered_players,
            settings=settings,
            winner=game.winner,
        )
    
    # ========================================================================
    # Elimination & Victory
    # ========================================================================
    
    async def eliminate_player(
        self, 
        game_id: str, 
        target_player_id: str,
        mr_white_guess: Optional[str] = None
    ) -> Optional[EliminateResponse]:
        """Eliminate a player and check victory conditions.
        
        Args:
            game_id: Public game ID.
            target_player_id: UUID of player to eliminate.
            mr_white_guess: If eliminating Mr. White, their guess of civilian word.
            
        Returns:
            EliminateResponse with victory info, or None if invalid.
        """
        game = await self.get_game(game_id)
        if not game or game.phase not in (GamePhase.PLAYING, GamePhase.VOTING):
            return None
        
        target = game.get_player_by_id(target_player_id)
        if not target or not target.is_alive:
            return None
        
        # Check Mr. White guess before elimination
        mr_white_wins = False
        if target.role == PlayerRole.MR_WHITE and mr_white_guess:
            civilian_word = game.word_pair.civilian_word if game.word_pair else None
            if mr_white_guess.lower().strip() == (civilian_word or "").lower().strip():
                mr_white_wins = True
        
        # Eliminate the player
        target.is_alive = False
        
        # Check victory conditions
        winner = self._check_victory(game, mr_white_wins)
        
        if winner:
            game.phase = GamePhase.FINISHED
            game.winner = winner
            game.finished_at = datetime.utcnow()
        
        await self._update_game(game)
        
        return EliminateResponse(
            eliminated_player_id=target_player_id,
            game_over=winner is not None,
            winner=winner,
        )
    
    def _check_victory(
        self, 
        game: GameDocument, 
        mr_white_guessed_correctly: bool = False
    ) -> Optional[WinnerType]:
        """Check if any victory condition is met.
        
        Victory Conditions:
        1. CIVILIANS WIN: All Undercovers AND Mr. White are eliminated
        2. UNDERCOVER WINS: Undercovers >= remaining Civilians
        3. MR_WHITE WINS: Correctly guesses civilian word when eliminated
        
        Args:
            game: Current game state.
            mr_white_guessed_correctly: True if Mr. White just guessed correctly.
            
        Returns:
            WinnerType if game is over, None otherwise.
        """
        # Mr. White correct guess = instant win
        if mr_white_guessed_correctly:
            return WinnerType.MR_WHITE
        
        alive_civilians = len(game.get_alive_by_role(PlayerRole.CIVILIAN))
        alive_undercover = len(game.get_alive_by_role(PlayerRole.UNDERCOVER))
        alive_mr_white = len(game.get_alive_by_role(PlayerRole.MR_WHITE))
        
        # Civilians win: all special roles eliminated
        if alive_undercover == 0 and alive_mr_white == 0:
            return WinnerType.CIVILIANS
        
        # Undercover wins: outnumber or equal civilians
        # (Mr. White doesn't count for undercover team)
        if alive_undercover >= alive_civilians and alive_civilians > 0:
            return WinnerType.UNDERCOVER
        
        # Edge case: only undercover left
        if alive_undercover > 0 and alive_civilians == 0 and alive_mr_white == 0:
            return WinnerType.UNDERCOVER
        
        return None
    
    # ========================================================================
    # History
    # ========================================================================
    
    async def get_finished_games(self, limit: int = 50) -> List[GameDocument]:
        """Get list of finished games for history."""
        cursor = self.collection.find(
            {"phase": GamePhase.FINISHED.value}
        ).sort("finished_at", -1).limit(limit)
        
        games = []
        async for doc in cursor:
            games.append(GameDocument(**doc))
        return games
