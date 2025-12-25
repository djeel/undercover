from typing import Dict, Optional, Any
import socketio
from urllib.parse import parse_qs
from .services.game_service import GameService

class SocketManager:
    def __init__(self):
        # Enable logger and engineio_logger for debugging
        # Disable Socket.IO CORS (cors_allowed_origins=[]) because FastAPI CORSMiddleware handles it.
        # This prevents duplicate/invalid Access-Control-Allow-Origin headers.
        self.sio = socketio.AsyncServer(
            async_mode='asgi', 
            cors_allowed_origins=[],
            logger=True,
            engineio_logger=True
        )
        # socketio_path="" because we will mount this app at /socket.io in FastAPI
        self.app = socketio.ASGIApp(self.sio, socketio_path="")
        
        # Mapping playerId -> socketId
        self.active_connections: Dict[str, str] = {}
        
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
                
                if player_id:
                    self.active_connections[player_id] = sid
                    print(f"Player {player_id} connected (sid: {sid})")
                    
                    # Store sid -> player_id for disconnect
                    # (You might want a reverse lookup if you track disconnects)
                else:
                    print(f"Anonymous connection (sid: {sid})")
            except Exception as e:
                import traceback
                print(f"Error in socket connect: {e}")
                traceback.print_exc()

        @self.sio.event
        async def disconnect(sid):
            # Remove connection
            for pid, s in list(self.active_connections.items()):
                if s == sid:
                    del self.active_connections[pid]
                    print(f"Player {pid} disconnected")
                    break

        @self.sio.event
        async def join_game(sid, game_id):
            self.sio.enter_room(sid, game_id)
            print(f"Socket {sid} joined room {game_id}")

    async def broadcast_game_state(self, game_id: str, game_service: GameService):
        """Broadcast filtered game state to all players in the game."""
        game = await game_service.get_game(game_id)
        if not game:
            return

        # For each player in the game, send their specific filtered state
        for player in game.players:
            # Get socket ID if connected
            sid = self.active_connections.get(player.id)
            
            # Generate state filtered for this player
            state = game_service.get_filtered_state(game, player.id)
            
            # Convert to dict for JSON serialization
            state_dict = state.model_dump()
            
            if sid:
                # Send to specific socket
                print(f"Broadcasting state to player {player.id} on sid {sid}")
                await self.sio.emit('UPDATE_STATE', state_dict, room=sid)
            else:
                # Player not connected, ignore
                print(f"Player {player.id} not connected (no SID found)")
                pass

        # Optional: Broadcast a generic "watcher" state to the room for non-players?
        # For now, we only care about active players.

socket_manager = SocketManager()
