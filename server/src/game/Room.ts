import { GameState, GamePhase, Player, PlayerRole, SocketEvents } from '@undercover/shared';
import { Server, Socket } from 'socket.io';
import { RoleDistributor } from './RoleDistributor';

// ... other imports ...

export class Room {
    // ... existing members ...

    public startGame(settings: { undercoverCount: number; mrWhiteCount: number }) {
        if (this.players.size < 3) {
            throw new Error('Not enough players to start');
        }

        // Update settings
        // this.settings = settings; // TODO: store settings in Room state properly

        RoleDistributor.distribute(
            Array.from(this.players.values()),
            settings.undercoverCount,
            settings.mrWhiteCount
        );

        this.phase = GamePhase.PLAYING;
        this.broadcastState();
    }

    public id: string;
    private players: Map<string, Player> = new Map(); // socketId -> Player
    private hostId: string = '';
    private phase: GamePhase = GamePhase.LOBBY;
    private io: Server | null = null; // Will be set when attaching

    constructor(roomId: string, hostName: string) {
        this.id = roomId;
        // creating a temporary player for host, will be updated when they actually connect with socket
    }

    public setIO(io: Server) {
        this.io = io;
    }

    public addPlayer(socket: Socket, playerName: string): Player {
        const player: Player = {
            id: socket.id,
            name: playerName,
            isAlive: true,
            hasVoted: false,
            votesReceived: 0
        };

        if (this.players.size === 0) {
            this.hostId = socket.id;
        }

        this.players.set(socket.id, player);
        this.broadcastState();
        return player;
    }

    public removePlayer(socketId: string) {
        this.players.delete(socketId);
        if (this.players.size === 0) {
            // Room empty, should be handled by manager
        } else if (socketId === this.hostId) {
            // Reassign host
            const nextPlayerId = this.players.keys().next().value;
            if (nextPlayerId) {
                this.hostId = nextPlayerId;
            }
        }
        this.broadcastState();
    }

    public getGameState(forPlayerId?: string): GameState {
        // Sanitize state based on who is asking (Rule: Role Secrecy)
        const playersList = Array.from(this.players.values()).map(p => {
            if (p.id === forPlayerId) return p;
            // Mask secret data for others
            return {
                ...p,
                role: undefined,
                word: undefined
            };
        });

        return {
            roomId: this.id,
            phase: this.phase,
            players: playersList,
            settings: {
                totalPlayers: this.players.size,
                undercoverCount: 0, // Placeholder
                mrWhiteCount: 0    // Placeholder
            }
        };
    }

    private broadcastState() {
        if (!this.io) return;

        // Personalized update for each player
        this.players.forEach((player, socketId) => {
            this.io?.to(socketId).emit(SocketEvents.UPDATE_STATE, this.getGameState(socketId));
        });
    }
}
