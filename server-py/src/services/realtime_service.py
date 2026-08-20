"""Private Supabase Realtime notification publisher."""
import logging

logger = logging.getLogger(__name__)


class RealtimeService:
    def __init__(self, http_client, supabase_url: str | None, secret_key: str | None) -> None:
        self.http_client, self.supabase_url, self.secret_key = http_client, supabase_url, secret_key

    async def publish_game_changed(self, game_id: str, room_code: str, version: int) -> None:
        if not self.http_client or not self.supabase_url or not self.secret_key:
            return
        try:
            await self.http_client.post(f"{self.supabase_url}/realtime/v1/api/broadcast", headers={"Authorization": f"Bearer {self.secret_key}", "apikey": self.secret_key}, json={"topic": f"game:{game_id}", "event": "game_state_changed", "payload": {"roomCode": room_code, "version": version}})
        except Exception:
            logger.exception("Unable to publish committed game update")
