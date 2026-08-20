"""Result and aggregate-stat persistence through the server-owned Postgres pool."""
from __future__ import annotations

from typing import Any
from uuid import UUID


class ResultsRepository:
    def __init__(self, pool: Any) -> None:
        self.pool = pool

    async def stats_for(self, user_id: UUID) -> dict[str, object]:
        async with self.pool.acquire() as connection:
            stats = await connection.fetchrow(
                """SELECT games_played, games_won, games_lost, current_win_streak, best_win_streak
                   FROM player_stats WHERE user_id = $1""",
                user_id,
            )
            roles = await connection.fetch(
                """SELECT role, games_played, wins FROM player_role_stats
                   WHERE user_id = $1 ORDER BY role""",
                user_id,
            )
            results = await connection.fetch(
                """SELECT role, winner, won, survived, rounds_played, duration_seconds, played_at
                   FROM game_results WHERE user_id = $1 ORDER BY played_at DESC LIMIT 20""",
                user_id,
            )
        return {
            "gamesPlayed": 0 if stats is None else stats["games_played"],
            "gamesWon": 0 if stats is None else stats["games_won"],
            "gamesLost": 0 if stats is None else stats["games_lost"],
            "currentWinStreak": 0 if stats is None else stats["current_win_streak"],
            "bestWinStreak": 0 if stats is None else stats["best_win_streak"],
            "roles": [{"role": row["role"], "gamesPlayed": row["games_played"], "wins": row["wins"]} for row in roles],
            "results": [
                {
                    "role": row["role"], "winner": row["winner"], "won": row["won"],
                    "survived": row["survived"], "roundsPlayed": row["rounds_played"],
                    "durationSeconds": row["duration_seconds"], "playedAt": row["played_at"].isoformat(),
                }
                for row in results
            ],
        }
