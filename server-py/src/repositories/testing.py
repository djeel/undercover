"""Deterministic in-memory repositories used only by route tests."""
from __future__ import annotations

import secrets
from dataclasses import replace
from uuid import UUID, uuid4

from ..game.types import GamePhase, GameState, Player, Settings, WordPair

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


class NotFoundError(ValueError):
    pass


class TestingGameRepository:
    __test__ = False

    def __init__(self) -> None:
        self.games: dict[str, GameState] = {}
        self.members: dict[tuple[str, UUID], str] = {}
        self.results: dict[str, list[dict[str, object]]] = {}
        self.profiles: dict[UUID, dict[str, object]] = {}
        self.friendships: dict[tuple[UUID, UUID], dict[str, object]] = {}

    async def create_game(self, host_user_id: UUID, language: str) -> GameState:
        room_code = self._room_code()
        profile = self._profile(host_user_id)
        player = Player(id=str(uuid4()), display_name=str(profile["displayName"]), user_id=str(host_user_id))
        game = GameState(id=str(uuid4()), room_code=room_code, host_player_id=player.id, phase=GamePhase.LOBBY, players=(player,), settings=Settings(), word_pair=WordPair("cat", "dog"), language=language)
        self.games[room_code] = game
        self.members[(room_code, host_user_id)] = player.id
        return game

    async def get_for_member(self, room_code: str, user_id: UUID) -> GameState:
        room_code = room_code.upper()
        if (room_code, user_id) not in self.members:
            raise NotFoundError("Game not found")
        return self.games[room_code]

    async def player_id_for_member(self, room_code: str, user_id: UUID) -> str:
        try:
            return self.members[(room_code.upper(), user_id)]
        except KeyError as error:
            raise NotFoundError("Game not found") from error
    async def mutate_game(self, room_code: str, user_id: UUID, operation, *, deactivate_player_id: str | None = None):
        game = await self.get_for_member(room_code, user_id)
        updated = operation(game, self.members[(room_code.upper(), user_id)])
        self.games[room_code.upper()] = updated
        if deactivate_player_id is not None:
            await self.deactivate_member(room_code, deactivate_player_id)
        if updated.phase is GamePhase.FINISHED and game.phase is not GamePhase.FINISHED:
            self._record_results(updated)
        return updated

    async def join_game(self, room_code: str, user_id: UUID, display_name: str) -> GameState:
        room_code = room_code.upper()
        if (room_code, user_id) in self.members:
            raise ValueError("Already a game member")
        game = self.games.get(room_code)
        if not game:
            raise NotFoundError("Game not found")
        if game.phase is not GamePhase.LOBBY:
            raise ValueError("Game is not in the lobby")
        if len(game.players) >= 12:
            raise ValueError("Game is full")
        if any(player.alive and player.display_name.casefold() == display_name.casefold() for player in game.players):
            raise ValueError("Display name is already active")
        player = Player(id=str(uuid4()), display_name=display_name, user_id=str(user_id))
        updated = replace(game, players=(*game.players, player), version=game.version + 1)
        self.games[room_code] = updated
        self.members[(room_code, user_id)] = player.id
        self._profile(user_id, display_name=display_name)
        return updated

    async def deactivate_member(self, room_code: str, player_id: str) -> None:
        room_code = room_code.upper()
        for member, member_player_id in tuple(self.members.items()):
            if member[0] == room_code and member_player_id == player_id:
                del self.members[member]
                return
        raise NotFoundError("Game member not found")
    async def leave_member(self, room_code: str, user_id: UUID) -> GameState:
        game = await self.get_for_member(room_code, user_id)
        player_id = self.members.pop((room_code.upper(), user_id))
        updated = replace(game, players=tuple(player for player in game.players if player.id != player_id), version=game.version + 1)
        self.games[room_code.upper()] = updated
        return updated

    def user_for_player(self, room_code: str, player_id: str) -> UUID:
        return next(user for (code, user), member in self.members.items() if code == room_code.upper() and member == player_id)

    def results_for(self, room_code: str) -> list[dict[str, object]]:
        return self.results.get(room_code.upper(), [])

    async def get_profile(self, user_id: UUID) -> dict[str, object]:
        return self._profile(user_id)

    async def update_profile(self, user_id: UUID, *, handle: str | None, display_name: str | None) -> dict[str, object]:
        profile = self._profile(user_id)
        if handle is not None:
            if not 3 <= len(handle) <= 24:
                raise ValueError("Handle must be between 3 and 24 characters")
            if any(existing_id != user_id and str(existing["handle"]).casefold() == handle.casefold() for existing_id, existing in self.profiles.items()):
                raise ValueError("Handle is already taken")
            profile["handle"] = handle
        if display_name is not None:
            if not 1 <= len(display_name) <= 24:
                raise ValueError("Display name must be between 1 and 24 characters")
            profile["displayName"] = display_name
        return profile

    async def search_profiles(self, query: str, exclude_user_id: UUID) -> list[dict[str, object]]:
        return [profile for user_id, profile in self.profiles.items() if user_id != exclude_user_id and query.casefold() in str(profile["handle"]).casefold()][:20]

    async def list_friendships(self, user_id: UUID) -> list[dict[str, object]]:
        return [friendship for pair, friendship in self.friendships.items() if user_id in pair]

    async def request_friendship(self, user_id: UUID, profile_id: UUID) -> dict[str, object]:
        if user_id == profile_id:
            raise ValueError("Cannot add yourself as a friend")
        pair = tuple(sorted((user_id, profile_id)))
        if pair in self.friendships:
            raise ValueError("Friendship already exists")
        friendship = {"profileId": str(profile_id), "requestedBy": str(user_id), "status": "pending"}
        self.friendships[pair] = friendship
        return friendship

    async def accept_friendship(self, user_id: UUID, profile_id: UUID) -> dict[str, object]:
        pair = tuple(sorted((user_id, profile_id)))
        friendship = self.friendships.get(pair)
        if friendship is None:
            raise ValueError("Friendship not found")
        if friendship["requestedBy"] == str(user_id):
            raise PermissionError("Only the recipient may accept this friendship")
        updated = {**friendship, "status": "accepted"}
        self.friendships[pair] = updated
        return updated

    async def delete_friendship(self, user_id: UUID, profile_id: UUID) -> None:
        pair = tuple(sorted((user_id, profile_id)))
        if pair not in self.friendships:
            raise ValueError("Friendship not found")
        del self.friendships[pair]

    async def stats_for(self, user_id: UUID) -> dict[str, object]:
        return {"gamesPlayed": 0, "gamesWon": 0, "gamesLost": 0, "currentWinStreak": 0, "bestWinStreak": 0, "roles": [], "results": []}

    def _profile(self, user_id: UUID, display_name: str | None = None) -> dict[str, object]:
        profile = self.profiles.get(user_id)
        if profile is None:
            profile = {"id": str(user_id), "handle": f"user_{str(user_id).replace('-', '')[:8]}", "displayName": display_name or "Player", "avatarUrl": None}
            self.profiles[user_id] = profile
        return profile

    def _record_results(self, game: GameState) -> None:
        self.results[game.room_code] = [{"playerId": player.id, "role": player.role.value if player.role else None, "winner": game.winner, "won": player.role is not None and ((game.winner == "civilians" and player.role.value in {"civilian", "bodyguard"}) or (game.winner == "undercovers" and player.role.value == "undercover") or game.winner == player.role.value)} for player in game.players]

    def _room_code(self) -> str:
        while (code := "".join(secrets.choice(ALPHABET) for _ in range(6))) in self.games:
            pass
        return code
