const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export enum GamePhase {
    LOBBY = "LOBBY",
    PLAYING = "PLAYING",
    VOTING = "VOTING",
    FINISHED = "FINISHED"
}

export enum PlayerRole {
    CIVILIAN = "CIVILIAN",
    UNDERCOVER = "UNDERCOVER",
    MR_WHITE = "MR_WHITE"
}

export enum WinnerType {
    CIVILIANS = "CIVILIANS",
    UNDERCOVER = "UNDERCOVER",
    MR_WHITE = "MR_WHITE"
}

export interface PlayerResponse {
    id: string;
    name: string;
    is_alive: boolean;
    has_voted: boolean;
    votes_received: number;
    // Only for requesting player
    role?: string;
    word?: string;
}

export interface GameSettingsResponse {
    total_players: number;
    undercover_count: number;
    mr_white_count: number;
}

export interface GameStateResponse {
    game_id: string;
    phase: GamePhase;
    players: PlayerResponse[];
    settings?: GameSettingsResponse;
    winner?: WinnerType;
    current_turn_player_id?: string;
}

export interface CreateGameResponse {
    game_id: string;
}

export interface AddPlayerResponse {
    player_id: string;
    name: string;
}

export interface EliminateResponse {
    eliminated_player_id: string;
    game_over: boolean;
    winner?: WinnerType;
}

class ApiService {
    async createGame(): Promise<CreateGameResponse> {
        const response = await fetch(`${API_URL}/game/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        if (!response.ok) throw new Error('Failed to create game');
        return response.json();
    }

    async joinGame(gameId: string, name: string): Promise<AddPlayerResponse> {
        const response = await fetch(`${API_URL}/game/${gameId}/players`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        if (!response.ok) throw new Error('Failed to join game');
        return response.json();
    }

    async getGameState(gameId: string, playerId?: string): Promise<GameStateResponse> {
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (playerId) {
            headers['X-Player-ID'] = playerId;
        }

        const response = await fetch(`${API_URL}/game/${gameId}`, { headers });
        if (!response.ok) throw new Error('Failed to fetch game state');
        return response.json();
    }

    async assignRoles(gameId: string, undercoverCount: number, mrWhiteCount: number): Promise<boolean> {
        const response = await fetch(`${API_URL}/game/${gameId}/assign-roles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ undercover_count: undercoverCount, mr_white_count: mrWhiteCount })
        });
        return response.ok;
    }

    async eliminatePlayer(
        gameId: string,
        targetPlayerId: string,
        mrWhiteGuess?: string
    ): Promise<EliminateResponse> {
        const response = await fetch(`${API_URL}/game/${gameId}/eliminate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                target_player_id: targetPlayerId,
                mr_white_guess: mrWhiteGuess
            })
        });
        if (!response.ok) throw new Error('Failed to eliminate player');
        return response.json();
    }
}

export const api = new ApiService();
