import { afterEach, describe, expect, test, vi } from 'vitest';
import type { GameView } from '@undercover/shared';

import { useGameStore } from './game-store';

const game: GameView = {
    id: 'game-1',
    roomCode: 'ABC123',
    hostPlayerId: 'host-1',
    phase: 'lobby',
    players: [{ id: 'host-1', displayName: 'Host', avatarUrl: null, alive: true }],
    version: 1,
    round: 1,
    winner: null,
    lastResolution: null,
};

afterEach(() => {
    useGameStore.getState().clear();
});

describe('game realtime session lifecycle', () => {
    test('starts once when a session is established and not again when it is refetched', () => {
        const realtime = { start: vi.fn(), retry: vi.fn(), stop: vi.fn().mockResolvedValue(undefined) };
        const store = useGameStore.getState();

        store.startRealtime(realtime);
        expect(realtime.start).not.toHaveBeenCalled();

        store.setSession(game, 'host-1');
        store.setSession({ ...game, version: 2 }, 'host-1');

        expect(realtime.start).toHaveBeenCalledTimes(1);
        expect(realtime.start).toHaveBeenCalledWith('game-1', 1);
    });
    test('keeps its adapter after clear so a later game starts a new channel', () => {
        const realtime = { start: vi.fn(), retry: vi.fn(), stop: vi.fn().mockResolvedValue(undefined) };
        const store = useGameStore.getState();
        const nextGame = { ...game, id: 'game-2', roomCode: 'DEF456' };

        store.startRealtime(realtime);
        store.setSession(game, 'host-1');
        store.clear();
        store.setSession(nextGame, 'host-1');

        expect(realtime.start).toHaveBeenNthCalledWith(1, 'game-1', 1);
        expect(realtime.start).toHaveBeenNthCalledWith(2, 'game-2', 1);
    });
});
