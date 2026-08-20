"""Profile and friendship repositories for the server-owned Postgres connection."""
from __future__ import annotations

from typing import Any
from uuid import UUID


class SocialRepository:
    def __init__(self, pool: Any) -> None:
        self.pool = pool

    async def get_profile(self, user_id: UUID) -> dict[str, object] | None:
        async with self.pool.acquire() as connection:
            row = await connection.fetchrow(
                "SELECT id, handle, display_name, avatar_url FROM profiles WHERE id = $1", user_id
            )
        return _profile(row)

    async def update_profile(self, user_id: UUID, *, handle: str | None, display_name: str | None) -> dict[str, object] | None:
        async with self.pool.acquire() as connection:
            row = await connection.fetchrow(
                """UPDATE profiles SET handle = COALESCE($2, handle), display_name = COALESCE($3, display_name)
                   WHERE id = $1 RETURNING id, handle, display_name, avatar_url""",
                user_id, handle, display_name,
            )
        return _profile(row)

    async def search_profiles(self, query: str, exclude_user_id: UUID) -> list[dict[str, object]]:
        async with self.pool.acquire() as connection:
            rows = await connection.fetch(
                """SELECT id, handle, display_name, avatar_url FROM profiles
                   WHERE id <> $1 AND handle ILIKE $2 ORDER BY handle LIMIT 20""",
                exclude_user_id, f"%{query}%",
            )
        return [_profile(row) for row in rows]

    async def list_friendships(self, user_id: UUID) -> list[dict[str, object]]:
        async with self.pool.acquire() as connection:
            rows = await connection.fetch(
                """SELECT f.user_low, f.user_high, f.requested_by, f.status,
                          p.id, p.handle, p.display_name, p.avatar_url
                   FROM friendships AS f
                   JOIN profiles AS p ON p.id = CASE WHEN f.user_low = $1 THEN f.user_high ELSE f.user_low END
                   WHERE $1 IN (f.user_low, f.user_high) ORDER BY f.updated_at DESC""",
                user_id,
            )
        return [
            {"profileId": str(row["id"]), "requestedBy": str(row["requested_by"]), "status": row["status"], "profile": _profile(row)}
            for row in rows
        ]

    async def request_friendship(self, user_id: UUID, profile_id: UUID) -> dict[str, object]:
        if user_id == profile_id:
            raise ValueError("Cannot add yourself as a friend")
        low, high = sorted((user_id, profile_id))
        async with self.pool.acquire() as connection:
            row = await connection.fetchrow(
                """INSERT INTO friendships (user_low, user_high, requested_by, status)
                   VALUES ($1, $2, $3, 'pending')
                   RETURNING user_low, user_high, requested_by, status""",
                low, high, user_id,
            )
        if row is None:
            raise ValueError("Friendship could not be created")
        return {"profileId": str(profile_id), "requestedBy": str(row["requested_by"]), "status": row["status"]}

    async def accept_friendship(self, user_id: UUID, profile_id: UUID) -> dict[str, object]:
        low, high = sorted((user_id, profile_id))
        async with self.pool.acquire() as connection:
            row = await connection.fetchrow(
                """UPDATE friendships SET status = 'accepted'
                   WHERE user_low = $1 AND user_high = $2 AND status = 'pending' AND requested_by <> $3
                   RETURNING user_low, user_high, requested_by, status""",
                low, high, user_id,
            )
        if row is None:
            raise PermissionError("Only the recipient may accept this friendship")
        return {"profileId": str(profile_id), "requestedBy": str(row["requested_by"]), "status": row["status"]}

    async def delete_friendship(self, user_id: UUID, profile_id: UUID) -> None:
        low, high = sorted((user_id, profile_id))
        async with self.pool.acquire() as connection:
            result = await connection.execute(
                "DELETE FROM friendships WHERE user_low = $1 AND user_high = $2 AND $3 IN (user_low, user_high)",
                low, high, user_id,
            )
        if result != "DELETE 1":
            raise ValueError("Friendship not found")


def _profile(row: Any) -> dict[str, object] | None:
    if row is None:
        return None
    return {"id": str(row["id"]), "handle": row["handle"], "displayName": row["display_name"], "avatarUrl": row["avatar_url"]}


