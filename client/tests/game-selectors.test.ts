import { describe, expect, test } from 'vitest';
import type { GameView } from '@undercover/shared';
import { selectCanOpenVoting, selectOwnPlayer, selectVisibleComposition } from '../src/features/game/game-selectors';

const view: GameView = {
    id: 'game-1',
    roomCode: 'ABCD23',
    hostPlayerId: 'host',
    phase: 'playing',
    players: [
        { id: 'host', displayName: 'Host', avatarUrl: null, alive: true, role: 'civilian', word: 'café' },
        { id: 'other', displayName: 'Other', avatarUrl: null, alive: true },
    ],
    version: 4,
    round: 2,
    composition: 'hidden',
    winner: null,
    lastResolution: null,
};

describe('game selectors', () => {
    test('returns only the current player private view', () => {
        expect(selectOwnPlayer(view, 'host')).toMatchObject({ id: 'host', role: 'civilian', word: 'café' });
        expect(selectOwnPlayer(view, 'other')).toEqual({ id: 'other', displayName: 'Other', avatarUrl: null, alive: true });
    });

    test('does not infer hidden composition and lets only the living host open a vote', () => {
        expect(selectVisibleComposition(view)).toBeNull();
        expect(selectCanOpenVoting(view, 'host')).toBe(true);
        expect(selectCanOpenVoting(view, 'other')).toBe(false);
    });
});
