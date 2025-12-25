"""Game service - core business logic for Undercover game.

This module handles game state management, role assignment, and victory conditions.
"""
from datetime import datetime, timezone
from typing import Optional, List, Any
import uuid
import random

from ..models.game import GameDocument, PlayerDocument, WordPairDocument
from ..database import GameRepository
from ..models.schemas import (
    GamePhase, PlayerRole, WinnerType,
    GameStateResponse, PlayerResponse, GameSettingsResponse,
    EliminateResponse,
)
from .word_service import WordService



class GameService:
    def __init__(self, db: GameRepository):
        # db is GameRepository
        self.repository = db
    
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
        
        # Store in dict
        await self.repository.save_game(game.public_id, game.model_dump(mode='json'))
        return game.public_id
    
    async def get_game(self, game_id: str) -> Optional[GameDocument]:
        """Get game by public ID."""
        data = await self.repository.get_game(game_id.upper())
        if data:
            return GameDocument(**data)
        return None
    
    async def _update_game(self, game: GameDocument) -> None:
        """Save game state to database."""
        await self.repository.save_game(game.public_id, game.model_dump(mode='json'))
    
    # ========================================================================
    # Player Management
    # ========================================================================
    
    async def add_player(self, game_id: str, name: str) -> Optional[PlayerDocument]:
        """Add a new player to the game.
        
        Args:
            game_id: Public game ID
            name: Player name
            
        Returns:
            PlayerDocument if successful, None otherwise
        """
        game = await self.get_game(game_id)
        if not game:
            return None
            
        player = PlayerDocument(name=name)
        game.players.append(player)
        
        # Set first player as host
        if len(game.players) == 1:
            game.host_player_id = player.id
        
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
    
    
    async def restart_game(self, game_id: str) -> bool:
        """Restart a game with the same players and settings.
        
        Instead of going back to LOBBY, this reassigns roles and starts
        a new game immediately with the same configuration.
        """
        game = await self.get_game(game_id)
        if not game:
            return False
        
        # Save the previous game configuration
        undercover_count = game.undercover_count
        mr_white_count = game.mr_white_count
        
        # Reset game state but keep players
        game.phase = GamePhase.LOBBY  # Temporarily
        game.winner = None
        game.finished_at = None
        game.current_turn_player_id = None
        
        # Reset player states
        for player in game.players:
            player.is_alive = True
            player.has_voted = False
            player.votes_received = 0
            player.role = None
            player.word = None
        
        # Reassign roles with same configuration
        await self.assign_roles(game_id, undercover_count, mr_white_count)
        
        return True

    async def remove_player(self, game_id: str, player_id: str) -> bool:
        """Remove a player from the game (Kick).
        
        Only allowed in LOBBY phase.
        """
        game = await self.get_game(game_id)
        if not game or game.phase != GamePhase.LOBBY:
            return False
            
        initial_count = len(game.players)
        game.players = [p for p in game.players if p.id != player_id]
        
        if len(game.players) < initial_count:
            await self._update_game(game)
            return True
        return False

    async def cast_vote(self, game_id: str, voter_id: str, target_id: str) -> Optional[int]:
        """Cast a vote against a player.
        
        Args:
            game_id: Public game ID
            voter_id: ID of voting player
            target_id: ID of player receiving vote
            
        Returns:
            New vote count for target if successful, None otherwise.
        """
        game = await self.get_game(game_id)
        # Allow voting in PLAYING or VOTING phase
        if not game:
            raise ValueError("Game not found")
        if game.phase not in (GamePhase.PLAYING, GamePhase.VOTING):
            raise ValueError(f"Invalid game phase: {game.phase}")
            
        voter = game.get_player_by_id(voter_id)
        target = game.get_player_by_id(target_id)
        
        if not voter:
            raise ValueError(f"Voter not found: {voter_id}")
        if not voter.is_alive:
            raise ValueError("Voter is eliminated")
            
        if not target:
            raise ValueError(f"Target not found: {target_id}")
        if not target.is_alive:
            raise ValueError("Target is already eliminated")
            
        # Prevent double voting - one vote per player per round
        if voter.has_voted:
            raise ValueError("Player has already voted")
        
        target.votes_received += 1
        voter.has_voted = True
        
        # Check if all alive players have voted
        alive_players = [p for p in game.players if p.is_alive]
        all_voted = all(p.has_voted for p in alive_players)
        
        if all_voted:
            # Find player(s) with most votes
            max_votes = max(p.votes_received for p in alive_players)
            candidates = [p for p in alive_players if p.votes_received == max_votes]
            
            # If tie, choose randomly; otherwise, eliminate the one with most votes
            eliminated = random.choice(candidates)
            
            # Eliminate the player
            eliminated.is_alive = False
            
            # Reset votes for next round
            for p in game.players:
                p.votes_received = 0
                p.has_voted = False
            
            # Check victory conditions
            winner = self._check_victory(game, False)  # No Mr. White guess in voting
            
            if winner:
                game.phase = GamePhase.FINISHED
                game.winner = winner
                game.finished_at = datetime.now(timezone.utc)
        
        await self._update_game(game)
        return target.votes_received

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
        
        is_finished = game.phase == GamePhase.FINISHED
        
        for player in game.players:
            player_response = PlayerResponse(
                id=player.id,
                name=player.name,
                is_alive=player.is_alive,
                has_voted=player.has_voted,
                votes_received=player.votes_received,
            )
            
            # Reveal if requesting player, OR if game is finished
            should_reveal = is_finished or (requesting_player_id and player.id == requesting_player_id)
            
            if should_reveal:
                player_response.role = player.role.value if player.role else None
                # Mr. White sees their role but NOT the word (even in results, they had NO word)
                if player.role != PlayerRole.MR_WHITE:
                    player_response.word = player.word
            
            filtered_players.append(player_response)
        
        settings = None
        if game.phase != GamePhase.LOBBY:
            settings = GameSettingsResponse(
                total_players=len(game.players),
                undercover_count=game.undercover_count,
                mr_white_count=game.mr_white_count,
                civilian_word=game.word_pair.civilian_word if is_finished and game.word_pair else None,
                undercover_word=game.word_pair.undercover_word if is_finished and game.word_pair else None,
            )
        
        return GameStateResponse(
            game_id=game.public_id,
            phase=game.phase,
            players=filtered_players,
            settings=settings,
            winner=game.winner,
            host_player_id=game.host_player_id,
            current_turn_player_id=game.current_turn_player_id,
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
        
        # RESET VOTES for all active players (new round effectively)
        for p in game.players:
            p.votes_received = 0
            p.has_voted = False
        
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
        
        Priorities:
        1. Mr. White Instant Win (Correct Guess)
        2. Mr. White Survival Win (1v1 against anyone)
        3. Civilians Win (All enemies eliminated)
        4. Undercover Win (Absolute majority or Simple majority if MW gone)
        
        Args:
            game: Current game state.
            mr_white_guessed_correctly: True if Mr. White just guessed correctly.
            
        Returns:
            WinnerType if game is over, None otherwise.
        """
        # 1. Mr. White Instant Win
        if mr_white_guessed_correctly:
            return WinnerType.MR_WHITE
        
        alive_players = game.get_alive_players()
        total_alive = len(alive_players)
        
        alive_civilians = len([p for p in alive_players if p.role == PlayerRole.CIVILIAN])
        alive_undercover = len([p for p in alive_players if p.role == PlayerRole.UNDERCOVER])
        alive_mr_white = len([p for p in alive_players if p.role == PlayerRole.MR_WHITE])
        
        # 2. Mr. White Survival Win (1v1)
        # If Mr. White remains with just 1 other person (total 2), chaos ensues, he wins.
        if alive_mr_white > 0 and total_alive <= 2:
            return WinnerType.MR_WHITE
            
        # 3. Civilians Win
        # Must eliminate ALL enemies (both UC and White)
        if alive_undercover == 0 and alive_mr_white == 0:
            return WinnerType.CIVILIANS
            
        # 4. Undercover Win
        # Condition A: No Civilians left (and Mr. White didn't win via 1v1 check above)
        if alive_civilians == 0:
             return WinnerType.UNDERCOVER
             
        # Condition B: Absolute Majority (UC >= Civ + White)
        if alive_undercover >= (alive_civilians + alive_mr_white):
            return WinnerType.UNDERCOVER
            
        # Condition C: Simple Majority (UC >= Civ) ONLY if Mr. White is gone
        if alive_mr_white == 0 and alive_undercover >= alive_civilians:
            return WinnerType.UNDERCOVER
            
        return None
