"""Postgres-backed authoritative game persistence."""
from __future__ import annotations

import json
import secrets
from dataclasses import asdict
from dataclasses import replace
from enum import Enum
from typing import Any, Callable
from uuid import UUID, uuid4

from ..data.seed_words import get_all_localized_pairs
from ..game.types import (
    CompositionMode,
    GamePhase,
    GameResolution,
    GameState,
    Player,
    PlayerRole,
    Settings,
    WordPair,
)
from .testing import ALPHABET, NotFoundError


def _json_default(value: object) -> object:
    return value.value if isinstance(value, Enum) else str(value)


def serialize_game(game: GameState) -> dict[str, Any]:
    return {
        "id": game.id,
        "roomCode": game.room_code,
        "hostPlayerId": game.host_player_id,
        "phase": game.phase.value,
        "players": [
            {
                "id": player.id,
                "displayName": player.display_name,
                "role": player.role.value if player.role else None,
                "alive": player.alive,
                "userId": player.user_id,
                "bodyguardTargetId": player.bodyguard_target_id,
                "avatarUrl": player.avatar_url,
            }
            for player in game.players
        ],
        "settings": {
            "undercoverCount": game.settings.undercover_count,
            "mrWhiteCount": game.settings.mr_white_count,
            "jesterCount": game.settings.jester_count,
            "bodyguardCount": game.settings.bodyguard_count,
            "compositionMode": game.settings.composition_mode.value,
        },
        "wordPair": None if game.word_pair is None else {"civilian": game.word_pair.civilian, "undercover": game.word_pair.undercover},
        "votes": [list(vote) for vote in game.votes],
        "round": game.round,
        "pendingMrWhiteId": game.pending_mr_white_id,
        "protectionAvailable": game.protection_available,
        "lastResolution": None if game.last_resolution is None else asdict(game.last_resolution),
        "winner": game.winner,
        "language": game.language,
        "version": game.version,
    }


def deserialize_game(state: dict[str, Any] | str, *, version: int) -> GameState:
    payload = json.loads(state) if isinstance(state, str) else state
    settings = payload["settings"]
    word_pair = payload.get("wordPair")
    resolution = payload.get("lastResolution")
    return GameState(
        id=str(payload["id"]),
        room_code=str(payload["roomCode"]),
        host_player_id=str(payload["hostPlayerId"]),
        phase=GamePhase(payload["phase"]),
        players=tuple(
            Player(
                id=str(player["id"]),
                display_name=str(player["displayName"]),
                role=PlayerRole(player["role"]) if player.get("role") else None,
                alive=bool(player.get("alive", True)),
                user_id=player.get("userId"),
                bodyguard_target_id=player.get("bodyguardTargetId"),
                avatar_url=player.get("avatarUrl"),
            )
            for player in payload["players"]
        ),
        settings=Settings(
            int(settings["undercoverCount"]),
            int(settings["mrWhiteCount"]),
            int(settings["jesterCount"]),
            int(settings["bodyguardCount"]),
            CompositionMode(settings["compositionMode"]),
        ),
        word_pair=None if word_pair is None else WordPair(str(word_pair["civilian"]), str(word_pair["undercover"])),
        votes=tuple((str(voter), str(target)) for voter, target in payload.get("votes", [])),
        round=int(payload.get("round", 0)),
        pending_mr_white_id=payload.get("pendingMrWhiteId"),
        protection_available=bool(payload.get("protectionAvailable", True)),
        last_resolution=None if resolution is None else GameResolution(**resolution),
        winner=payload.get("winner"),
        language=str(payload.get("language", "en")),
        version=version,
    )


class PostgresGameRepository:
    """Serializes the full canonical state within a row-locked transaction."""

    def __init__(self, pool: Any) -> None:
        self.pool = pool

    async def create_game(self, host_user_id: UUID, language: str, display_name: str | None = None) -> GameState:
        for _ in range(8):
            room_code = "".join(secrets.choice(ALPHABET) for _ in range(6))
            async with self.pool.acquire() as connection:
                avatar_url = None
                if display_name is None:
                    profile = await connection.fetchrow(
                        "SELECT display_name, avatar_url FROM profiles WHERE id = $1",
                        host_user_id,
                    )
                    display_name = "Player" if profile is None else str(profile["display_name"])
                    avatar_url = None if profile is None else profile["avatar_url"]
                selected_pair = secrets.choice(get_all_localized_pairs())
                civilian, undercover = selected_pair.fr if language == "fr" else selected_pair.en
                player = Player(
                    id=str(uuid4()), display_name=display_name, user_id=str(host_user_id), avatar_url=avatar_url,
                )
                game = GameState(
                    id=str(uuid4()), room_code=room_code, host_player_id=player.id,
                    phase=GamePhase.LOBBY, players=(player,), settings=Settings(),
                    word_pair=WordPair(civilian, undercover), language=language,
                )
                try:
                    async with connection.transaction():
                        await connection.execute(
                            """INSERT INTO games (id, room_code, host_user_id, phase, composition_mode, language, state, version)
                               VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)""",
                            UUID(game.id), room_code, host_user_id, game.phase.value,
                            game.settings.composition_mode.value, language,
                            json.dumps(serialize_game(game), default=_json_default), game.version,
                        )
                        await connection.execute(
                            """INSERT INTO game_members (game_id, user_id, player_id, display_name, avatar_url)
                               VALUES ($1, $2, $3, $4, $5)""",
                            UUID(game.id), host_user_id, player.id, player.display_name, player.avatar_url,
                        )
                except Exception as error:
                    if getattr(error, "sqlstate", None) != "23505":
                        raise
                    continue
                return game
        raise RuntimeError("Unable to allocate a room code")

    async def get_for_member(self, room_code: str, user_id: UUID) -> GameState:
        async with self.pool.acquire() as connection:
            row = await connection.fetchrow(
                """SELECT g.state, g.version FROM games AS g
                   JOIN game_members AS m ON m.game_id = g.id
                   WHERE g.room_code = $1 AND m.user_id = $2 AND m.left_at IS NULL""",
                room_code.upper(), user_id,
            )
        if not row:
            raise NotFoundError("Game not found")
        return deserialize_game(row["state"], version=int(row["version"]))

    async def player_id_for_member(self, room_code: str, user_id: UUID) -> str:
        async with self.pool.acquire() as connection:
            player_id = await connection.fetchval(
                """SELECT m.player_id FROM games AS g JOIN game_members AS m ON m.game_id = g.id
                   WHERE g.room_code = $1 AND m.user_id = $2 AND m.left_at IS NULL""",
                room_code.upper(), user_id,
            )
        if player_id is None:
            raise NotFoundError("Game not found")
        return str(player_id)

    async def deactivate_member(self, room_code: str, player_id: str) -> None:
        async with self.pool.acquire() as connection:
            result = await connection.execute(
                """UPDATE game_members AS m SET left_at = now() FROM games AS g
                   WHERE m.game_id = g.id AND g.room_code = $1 AND m.player_id::text = $2 AND m.left_at IS NULL""",
                room_code.upper(), player_id,
            )
        if result != "UPDATE 1":
            raise NotFoundError("Game member not found")

    async def mutate_game(
        self,
        room_code: str,
        user_id: UUID,
        operation: Callable[[GameState, str], GameState],
        *,
        deactivate_player_id: str | None = None,
        retain_active_players: bool = False,
    ) -> GameState:
        async with self.pool.acquire() as connection, connection.transaction():
            row = await connection.fetchrow(
                """SELECT g.id, g.room_code, g.state, g.version, m.player_id FROM games AS g
                   JOIN game_members AS m ON m.game_id = g.id
                   WHERE g.room_code = $1 AND m.user_id = $2 AND m.left_at IS NULL
                   FOR UPDATE""",
                room_code.upper(), user_id,
            )
            if not row:
                raise NotFoundError("Game not found")
            game = deserialize_game(row["state"], version=int(row["version"]))
            updated = operation(game, str(row["player_id"]))
            if retain_active_players:
                member_rows = await connection.fetch(
                    "SELECT player_id::text FROM game_members WHERE game_id = $1 AND left_at IS NULL",
                    row["id"],
                )
                active_player_ids = frozenset(str(member["player_id"]) for member in member_rows)
                updated = replace(updated, players=tuple(player for player in updated.players if player.id in active_player_ids))
            if updated.version != game.version + 1:
                updated = replace(updated, version=game.version + 1)
            await connection.execute(
                """UPDATE games SET state = $1::jsonb, phase = $2, composition_mode = $3,
                   version = version + 1, updated_at = now(),
                   finished_at = CASE WHEN $2 = 'finished' THEN COALESCE(finished_at, now()) ELSE NULL END
                   WHERE id = $4""",
                json.dumps(serialize_game(updated), default=_json_default),
                updated.phase.value, updated.settings.composition_mode.value, row["id"],
            )
            if deactivate_player_id is not None:
                result = await connection.execute(
                    """UPDATE game_members SET left_at = now()
                       WHERE game_id = $1 AND player_id::text = $2 AND left_at IS NULL""",
                    row["id"], deactivate_player_id,
                )
                if result != "UPDATE 1":
                    raise NotFoundError("Game member not found")
            if updated.phase is GamePhase.FINISHED and game.phase is not GamePhase.FINISHED:
                await self._record_results(connection, row["id"], updated)
            return updated

    async def join_game(self, room_code: str, user_id: UUID, display_name: str, avatar_url: str | None = None) -> GameState:
        def add_player(game: GameState, _: str) -> GameState:
            if game.phase is not GamePhase.LOBBY:
                raise ValueError("Game is not in the lobby")
            if len(game.players) >= 12:
                raise ValueError("Game is full")
            if any(player.alive and player.display_name.casefold() == display_name.casefold() for player in game.players):
                raise ValueError("Display name is already active")
            player = Player(str(uuid4()), display_name, user_id=str(user_id), avatar_url=avatar_url)
            return replace(game, players=(*game.players, player), version=game.version + 1)

        async with self.pool.acquire() as connection, connection.transaction():
            row = await connection.fetchrow(
                """SELECT g.id, g.state, g.version FROM games AS g WHERE g.room_code = $1 FOR UPDATE""",
                room_code.upper(),
            )
            if not row:
                raise NotFoundError("Game not found")
            exists = await connection.fetchval(
                "SELECT 1 FROM game_members WHERE game_id = $1 AND user_id = $2",
                row["id"], user_id,
            )
            if exists:
                raise ValueError("Already a game member")
            game = deserialize_game(row["state"], version=int(row["version"]))
            updated = add_player(game, "")
            added = updated.players[-1]
            await connection.execute(
                """INSERT INTO game_members (game_id, user_id, player_id, display_name, avatar_url)
                   VALUES ($1, $2, $3, $4, $5)""",
                row["id"], user_id, added.id, added.display_name, added.avatar_url,
            )
            await connection.execute(
                "UPDATE games SET state = $1::jsonb, version = version + 1, updated_at = now() WHERE id = $2",
                json.dumps(serialize_game(updated), default=_json_default), row["id"],
            )
            return updated
    async def active_player_ids(self, room_code: str) -> frozenset[str]:
        async with self.pool.acquire() as connection:
            player_ids = await connection.fetch(
                """SELECT m.player_id::text FROM game_members AS m JOIN games AS g ON g.id = m.game_id
                   WHERE g.room_code = $1 AND m.left_at IS NULL""",
                room_code.upper(),
            )
        return frozenset(str(row["player_id"]) for row in player_ids)

    async def _record_results(self, connection: Any, game_id: UUID, game: GameState) -> None:
        if game.winner is None:
            return
        for player in game.players:
            if player.user_id is None or player.role is None:
                continue
            user_id = UUID(player.user_id)
            won = (
                (game.winner == "civilians" and player.role in {PlayerRole.CIVILIAN, PlayerRole.BODYGUARD})
                or (game.winner == "undercovers" and player.role is PlayerRole.UNDERCOVER)
                or game.winner == player.role.value
            )
            inserted = await connection.execute(
                """INSERT INTO game_results (game_id, user_id, role, winner, won, survived, rounds_played, duration_seconds)
                   VALUES ($1, $2, $3, $4, $5, $6, $7, 0) ON CONFLICT (game_id, user_id) DO NOTHING""",
                game_id, user_id, player.role.value, game.winner, won, player.alive, game.round,
            )
            if inserted != "INSERT 0 1":
                continue
            await connection.execute(
                """INSERT INTO player_stats (user_id, games_played, games_won, games_lost, current_win_streak, best_win_streak)
                   VALUES ($1, 1, $2, $3, $2::int, $2::int)
                   ON CONFLICT (user_id) DO UPDATE SET
                     games_played = player_stats.games_played + 1,
                     games_won = player_stats.games_won + excluded.games_won,
                     games_lost = player_stats.games_lost + excluded.games_lost,
                     current_win_streak = CASE WHEN excluded.games_won = 1 THEN player_stats.current_win_streak + 1 ELSE 0 END,
                     best_win_streak = GREATEST(player_stats.best_win_streak, CASE WHEN excluded.games_won = 1 THEN player_stats.current_win_streak + 1 ELSE 0 END)""",
                user_id, int(won), int(not won),
            )
            await connection.execute(
                """INSERT INTO player_role_stats (user_id, role, games_played, wins) VALUES ($1, $2, 1, $3)
                   ON CONFLICT (user_id, role) DO UPDATE SET
                     games_played = player_role_stats.games_played + 1, wins = player_role_stats.wins + excluded.wins""",
                user_id, player.role.value, int(won),
            )
