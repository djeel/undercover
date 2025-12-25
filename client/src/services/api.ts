const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

import { PlayerRole, GamePhase } from '@undercover/shared';

// Re-export for compatibility if needed, or just let other files import from here
export { PlayerRole, GamePhase };

export enum WinnerType {
    CIVILIANS = "CIVILIANS",
    UNDERCOVER = "UNDERCOVER",
    MR_WHITE = "MR_WHITE",
    JESTER = "JESTER"
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
    bodyguard_target_id?: string;
}

export interface GameSettingsResponse {
    total_players: number;
    undercover_count: number;
    mr_white_count: number;
    jester_count: number;
    bodyguard_count: number;
    civilian_word?: string;
    undercover_word?: string;
}

export interface GameStateResponse {
    game_id: string;
    phase: 'LOBBY' | 'PLAYING' | 'FINISHED' | 'VOTING';
    players: PlayerResponse[];
    settings: {
        civilian_word: string | null;
        undercover_word: string | null;
        undercover_count: number;
        mr_white_count: number;
        jester_count: number;
        bodyguard_count: number;
    };
    winner: 'civilians' | 'undercovers' | 'mrWhite' | 'jester' | null;
    host_player_id: string | null;
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
    async createGame(themeId?: string, language: string = 'en'): Promise<CreateGameResponse> {
        const response = await fetch(`${API_URL}/game/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme_id: themeId, language })
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

    async assignRoles(gameId: string, undercoverCount: number, mrWhiteCount: number, jesterCount: number, bodyguardCount: number): Promise<boolean> {
        const response = await fetch(`${API_URL}/game/${gameId}/assign-roles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                undercover_count: undercoverCount,
                mr_white_count: mrWhiteCount,
                jester_count: jesterCount,
                bodyguard_count: bodyguardCount
            })
        });
        return response.ok;
    }

    async restartGame(gameId: string): Promise<boolean> {
        const response = await fetch(`${API_URL}/game/${gameId}/restart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
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

    async kickPlayer(gameId: string, playerId: string): Promise<boolean> {
        const response = await fetch(`${API_URL}/game/${gameId}/players/${playerId}`, {
            method: 'DELETE',
        });
        return response.ok;
    }

    async votePlayer(gameId: string, voterId: string, targetPlayerId: string): Promise<boolean> {
        const response = await fetch(`${API_URL}/game/${gameId}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                voter_id: voterId,
                target_player_id: targetPlayerId
            })
        });
        return response.ok;
    }
}

export const api = new ApiService();
