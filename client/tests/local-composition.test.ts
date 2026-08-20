import { afterEach, describe, expect, test } from 'vitest';
import { validateLocalComposition } from '../src/features/local-game/composition';
import { useLocalGameStore, type LocalGameConfig } from '../src/features/local-game/local-game-store';

const players = (count: number) => Array.from({ length: count }, (_, index) => ({
    id: `player-${index}`,
    displayName: `Player ${index}`,
    role: 'civilian' as const,
    word: null,
    alive: true,
}));

const configuration = (overrides: Partial<LocalGameConfig> = {}): LocalGameConfig => ({
    civilianWord: '',
    undercoverWord: '',
    undercoverCount: 1,
    mrWhiteCount: 0,
    jesterCount: 0,
    bodyguardCount: 0,
    ...overrides,
});

afterEach(() => useLocalGameStore.getState().resetGame());

describe('local composition', () => {
    test.each([
        ['fewer than three players', 2, configuration()],
        ['more than twelve players', 13, configuration()],
        ['no Undercover', 4, configuration({ undercoverCount: 0 })],
        ['a negative special-role count', 4, configuration({ jesterCount: -1 })],
        ['a fractional special-role count', 4, configuration({ mrWhiteCount: 1.5 })],
        ['more than one Bodyguard', 5, configuration({ bodyguardCount: 2 })],
        ['fewer than two civilian-team players', 5, configuration({ undercoverCount: 1, mrWhiteCount: 1, jesterCount: 1, bodyguardCount: 1 })],
    ])('rejects %s without starting or changing players', (_reason, playerCount, config) => {
        const currentPlayers = players(playerCount);
        useLocalGameStore.setState({ phase: 'setup', players: currentPlayers, config });

        const started = useLocalGameStore.getState().startGame();
        const state = useLocalGameStore.getState();

        expect(started).toBe(false);
        expect(state.phase).toBe('setup');
        expect(state.players).toEqual(currentPlayers);
    });

    test('reports a reusable valid result before allocating roles', () => {
        expect(validateLocalComposition(6, configuration({ mrWhiteCount: 1, jesterCount: 1, bodyguardCount: 1 }))).toEqual({ valid: true });
    });

    test('assigns every supported special role when the composition is valid', () => {
        useLocalGameStore.setState({
            phase: 'setup',
            players: players(6),
            config: configuration({ undercoverCount: 1, mrWhiteCount: 1, jesterCount: 1, bodyguardCount: 1 }),
        });

        const started = useLocalGameStore.getState().startGame();
        const assigned = useLocalGameStore.getState().players;

        expect(started).toBe(true);
        expect(useLocalGameStore.getState().phase).toBe('reveal');
        expect(assigned.filter((player) => player.role === 'undercover')).toHaveLength(1);
        expect(assigned.filter((player) => player.role === 'mr_white')).toHaveLength(1);
        expect(assigned.filter((player) => player.role === 'jester')).toHaveLength(1);
        expect(assigned.filter((player) => player.role === 'bodyguard')).toHaveLength(1);
        expect(assigned.filter((player) => player.role === 'civilian')).toHaveLength(2);
    });
});
