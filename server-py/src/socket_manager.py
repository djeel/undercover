from typing import Dict, Optional, Any, Tuple
import socketio
from urllib.parse import parse_qs
from .services.game_service import GameService
from .database import get_database

class SocketManager:
    def __init__(self):
        # Disable Socket.IO CORS (cors_allowed_origins=[]) because FastAPI CORSMiddleware handles it.
        # This prevents duplicate/invalid Access-Control-Allow-Origin headers.
        self.sio = socketio.AsyncServer(
            async_mode='asgi', 
            cors_allowed_origins=[],
            logger=False,
            engineio_logger=False
        )
        # socketio_path="" because we will mount this app at /socket.io in FastAPI
        self.app = socketio.ASGIApp(self.sio, socketio_path="")
        
        # Mapping sid -> (game_id, player_id)
        # We need this to know who to disconnect
        self.socket_map: Dict[str, Tuple[str, str]] = {}
        
        self.setup_event_handlers()

    def setup_event_handlers(self):
        @self.sio.event
        async def connect(sid, environ):
            try:
                # Extract player_id from query string
                # Try to get query string from various possible keys
                qs = environ.get('QUERY_STRING', '') or environ.get('query_string', '')
                
                # Handle bytes (ASGI scope)
                if isinstance(qs, bytes):
                    qs = qs.decode('utf-8')
                    
                parsed = parse_qs(qs)
                player_id = parsed.get('playerId', [None])[0]
                
                print(f"Socket connected: {sid}, player: {player_id}")
                
            except Exception as e:
                import traceback
                print(f"Error in socket connect: {e}")
                traceback.print_exc()

        @self.sio.event
        async def disconnect(sid):
            # Remove connection
            if sid in self.socket_map:
                game_id, player_id = self.socket_map[sid]
                del self.socket_map[sid]
                print(f"Player {player_id} disconnected from game {game_id} (sid: {sid})")
                
                # Remove player from game logic
                try:
                    db = await get_database()
                    service = GameService(db)
                    
                    # Remove and check victory
                    removed = await service.remove_player(game_id, player_id)
                    
                    if removed:
                        # Broadcast update to remaining players in room
                        # Room is still associated with game_id
                        await self.broadcast_game_state(game_id, service)
                        
                except Exception as e:
                    print(f"Error handling disconnect for player {player_id}: {e}")

        @self.sio.event
        async def join_game(sid, game_id):
            self.sio.enter_room(sid, game_id)
            print(f"Socket {sid} joined room {game_id}")
            
            # We might not have player_id in connect if they just connected anonymously 
            # (though client usually sends it). 
            # Ideally client emits JOIN with {gameId, playerId} but here it is just game_id argument.
            # However, we can track SID -> GameID. 
            # But we need PlayerID to remove them.
            
            # NOTE: Connect event logic handled parsing playerId from query string.
            # But we didn't store it in self.socket_map there because we didn't have game_id yet.
            # We need to retrieve it or update client to send it here.
            
            # Let's inspect the session or assume we stored it in active_connections (which I removed in this diff but need to re-add concept)
            # Actually, let's look at `connect` again. I removed active_connections. 
            # I should store player_id in session scope or a temp map.
            pass
            
            # ... Wait, I can't just pass. I need to implement this correctly.
            # Let's revert to a robust implementation.
            
    async def _handle_join_game(self, sid, game_id, player_id):
         self.sio.enter_room(sid, game_id)
         self.socket_map[sid] = (game_id, player_id)
         print(f"Registered socket {sid} for player {player_id} in game {game_id}")

    # Re-implementing properly with session storage
    def setup_event_handlers(self):
        @self.sio.event
        async def connect(sid, environ):
            try:
                qs = environ.get('QUERY_STRING', '') or environ.get('query_string', '')
                if isinstance(qs, bytes): qs = qs.decode('utf-8')
                parsed = parse_qs(qs)
                player_id = parsed.get('playerId', [None])[0]
                
                # Store player_id in session for later retrieval in join_game
                await self.sio.save_session(sid, {'player_id': player_id})
                print(f"Socket connected: {sid} (p: {player_id})")
                
            except Exception as e:
                print(f"Connect error: {e}")

        @self.sio.event
        async def disconnect(sid):
            if sid in self.socket_map:
                game_id, player_id = self.socket_map[sid]
                del self.socket_map[sid]
                print(f"Disconnect: Player {player_id} from {game_id}")
                
                try:
                    db = await get_database()
                    service = GameService(db)
                    if await service.remove_player(game_id, player_id):
                         await self.broadcast_game_state(game_id, service)
                except Exception as e:
                    print(f"Disconnect handler error: {e}")

        @self.sio.on('JOIN_ROOM')
        async def join_game(sid, game_id):
            session = await self.sio.get_session(sid)
            player_id = session.get('player_id')
            
            if player_id:
                # Check for redundant join (idempotency)
                if self.socket_map.get(sid) == (game_id, player_id):
                    return

                self.sio.enter_room(sid, game_id)
                self.socket_map[sid] = (game_id, player_id)
                print(f"Mapped {sid} -> G:{game_id} P:{player_id}")
            else:
                print(f"Warning: JOIN_ROOM called without player_id in session for {sid}")

    async def broadcast_game_state(self, game_id: str, game_service: GameService):
        """Broadcast filtered game state to all players in the game."""
        game = await game_service.get_game(game_id)
        if not game:
            return

        # For each player in the game, send their specific filtered state
        # We need to know SIDs for players to send private messages?
        # OR we can just broadcast to the room if we trust client to filter?
        # NO, security requirement says "Only requesting player sees their role".
        # So we MUST send individual messages.
        
        # We can look up SIDs from our socket_map
        # Reverse map: (game_id, player_id) -> list of sids
        
        # Optimization: Map player_id -> sid for this broadcast
        # Since socket_map is sid -> (g, p), we iterate.
        player_sids = {}
        for s, (g, p) in self.socket_map.items():
            if g == game_id:
                player_sids[p] = s
        
        for player in game.players:
            sid = player_sids.get(player.id)
            if sid:
                state = game_service.get_filtered_state(game, player.id)
                await self.sio.emit('UPDATE_STATE', state.model_dump(), room=sid)


socket_manager = SocketManager()
