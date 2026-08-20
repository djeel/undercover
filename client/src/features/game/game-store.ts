import { create } from 'zustand';
import type { CompositionMode, GameView } from '@undercover/shared';
import type { ApiClient } from '../../lib/api-client';
import { createGameRealtime, type GameRealtime } from '../../lib/game-realtime';

export interface GameStore {
    game: GameView | null;
    roomCode: string | null;
    playerId: string | null;
    error: string | null;
    setSession(game: GameView, playerId: string): void;
    clear(): void;
    fetch(api: ApiClient): Promise<GameView | null>;
    startRealtime(realtime: GameRealtime): void;
    stopRealtime(): Promise<void>;
    updateSettings(api: ApiClient, settings: { undercoverCount: number; mrWhiteCount: number; jesterCount: number; bodyguardCount: number; compositionMode: CompositionMode }): Promise<void>;
    startGame(api: ApiClient): Promise<void>;
    openVoting(api: ApiClient): Promise<void>;
    vote(api: ApiClient, targetPlayerId: string): Promise<void>;
    submitMrWhiteGuess(api: ApiClient, guess: string): Promise<void>;
    leaveGame(api: ApiClient): Promise<void>;
    restartGame(api: ApiClient): Promise<void>;
    kickMember(api: ApiClient, playerId: string): Promise<void>;
}

let activeRealtime: GameRealtime | undefined;
const update = (set: (partial: Partial<GameStore>) => void, game: GameView) => set({ game, roomCode: game.roomCode, error: null });

export const useGameStore = create<GameStore>((set, get) => ({
    game: null,
    roomCode: null,
    playerId: null,
    error: null,
    setSession: (game, playerId) => {
        update(set, game);
        set({ playerId });
    },
    clear: () => {
        void activeRealtime?.stop();
        activeRealtime = undefined;
        set({ game: null, roomCode: null, playerId: null, error: null });
    },
    fetch: async (api) => {
        const roomCode = get().roomCode;
        if (!roomCode) return null;
        try {
            const game = await api.getGame(roomCode);
            update(set, game);
            return game;
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Unable to load game' });
            return null;
        }
    },
    startRealtime: (realtime) => {
        const { game } = get();
        if (!game) return;
        activeRealtime = realtime;
        realtime.start(game.id, game.version);
    },
    stopRealtime: async () => {
        await activeRealtime?.stop();
        activeRealtime = undefined;
    },
    updateSettings: async (api, settings) => { const game = get().game; if (game) update(set, await api.updateSettings(game.roomCode, settings)); },
    startGame: async (api) => { const game = get().game; if (game) update(set, await api.startGame(game.roomCode)); },
    openVoting: async (api) => { const game = get().game; if (game) update(set, await api.openVoting(game.roomCode)); },
    vote: async (api, targetPlayerId) => { const game = get().game; if (game) update(set, await api.vote(game.roomCode, { targetPlayerId })); },
    submitMrWhiteGuess: async (api, guess) => { const game = get().game; if (game) update(set, await api.submitMrWhiteGuess(game.roomCode, { guess })); },
    leaveGame: async (api) => { const game = get().game; if (game) update(set, await api.leaveGame(game.roomCode)); },
    restartGame: async (api) => { const game = get().game; if (game) update(set, await api.restartGame(game.roomCode)); },
    kickMember: async (api, playerId) => { const game = get().game; if (game) update(set, await api.kickMember(game.roomCode, playerId)); },
}));

export const realtimeForGame = (client: Parameters<typeof createGameRealtime>[0]['client'], api: ApiClient) => createGameRealtime({
    client,
    fetchGame: async () => {
        const roomCode = useGameStore.getState().roomCode;
        if (!roomCode) throw new Error('No active game');
        return api.getGame(roomCode);
    },
    onGame: (game) => useGameStore.getState().setSession(game, useGameStore.getState().playerId ?? ''),
    onError: (error) => useGameStore.setState({ error: error instanceof Error ? error.message : 'Realtime update failed' }),
});
