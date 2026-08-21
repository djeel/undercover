import { describe, expect, test } from 'vitest';
import {
    castVote,
    eliminatePlayer,
    openVoting,
    resolveVote,
    submitMrWhiteGuess,
    type LocalGameState,
} from '../src/features/local-game/rules';

const game = (players: LocalGameState['players']): LocalGameState => ({
    phase: 'playing',
    players,
    votes: {},
    round: 1,
    civilianWord: 'café',
    protectionAvailable: true,
    lastResolution: null,
    winner: null,
    pendingMrWhiteId: null,
});

const player = (id: string, role: LocalGameState['players'][number]['role'], alive = true) => ({
    id,
    displayName: id,
    role,
    word: role === 'mr_white' ? null : 'café',
    alive,
});

describe('eliminatePlayer', () => {
    test('rejects inactive games and missing or eliminated targets', () => {
        const active = game([player('a', 'civilian'), player('b', 'undercover'), player('c', 'civilian')]);

        expect(() => eliminatePlayer({ ...active, phase: 'finished' }, 'a')).toThrow('Elimination is not available');
        expect(() => eliminatePlayer(active, 'missing')).toThrow('Only living players may be eliminated');
        expect(() => eliminatePlayer({ ...active, players: active.players.map((entry) => entry.id === 'a' ? { ...entry, alive: false } : entry) }, 'a')).toThrow('Only living players may be eliminated');
    });

    test('eliminates a normal target through existing winner checks', () => {
        const result = eliminatePlayer(game([player('a', 'civilian'), player('b', 'civilian'), player('c', 'undercover'), player('d', 'civilian')]), 'a');

        expect(result.players.find((entry) => entry.id === 'a')?.alive).toBe(false);
        expect(result.lastResolution).toMatchObject({ type: 'elimination', source: 'vote', playerId: 'a' });
    });

    test('awards the Jester when the group eliminates the Jester', () => {
        const result = eliminatePlayer(game([player('j', 'jester'), player('c', 'civilian'), player('u', 'undercover')]), 'j');

        expect(result).toMatchObject({ phase: 'finished', winner: 'jester' });
    });

    test('holds Mr. White for the existing guess flow', () => {
        const result = eliminatePlayer(game([player('w', 'mr_white'), player('c', 'civilian'), player('u', 'undercover')]), 'w');

        expect(result).toMatchObject({ phase: 'mr_white_guess', pendingMrWhiteId: 'w' });
        expect(result.lastResolution).toMatchObject({ type: 'mr_white_pending', playerId: 'w' });
    });

    test('uses the one-shot Bodyguard protection path', () => {
        const target = player('target', 'civilian');
        const guard = { ...player('guard', 'bodyguard'), bodyguardTargetId: 'target' };
        const result = eliminatePlayer(game([target, guard, player('u', 'undercover'), player('c', 'civilian')]), 'target');

        expect(result.players.find((entry) => entry.id === 'target')?.alive).toBe(true);
        expect(result.players.find((entry) => entry.id === 'guard')?.alive).toBe(false);
        expect(result.protectionAvailable).toBe(false);
        expect(result.lastResolution).toMatchObject({ source: 'bodyguard_protection', playerId: 'guard' });
    });
});

describe('local rules', () => {
    test('returns to discussion without elimination after a completed tied vote', () => {
        const voting = openVoting(game([player('a', 'civilian'), player('b', 'undercover'), player('c', 'civilian'), player('d', 'jester')]));
        const completed = ['a', 'b', 'c', 'd'].reduce((state, id, index) => castVote(state, id, index % 2 ? 'a' : 'b'), voting);
        const result = resolveVote(completed);

        expect(result.phase).toBe('playing');
        expect(result.lastResolution).toEqual({ type: 'tie' });
        expect(result.players.every((entry) => entry.alive)).toBe(true);
        expect(result.votes).toEqual({});
    });

    test('awards the Jester only when the completed vote eliminates the Jester', () => {
        const voting = openVoting(game([player('a', 'jester'), player('b', 'civilian'), player('c', 'undercover')]));
        const completed = ['a', 'b', 'c'].reduce((state, voter) => castVote(state, voter, 'a'), voting);
        const result = resolveVote(completed);

        expect(result.phase).toBe('finished');
        expect(result.winner).toBe('jester');
        expect(result.lastResolution).toMatchObject({ type: 'victory', source: 'vote', playerId: 'a' });
    });

    test('substitutes a living Bodyguard exactly once for their vote-eliminated target', () => {
        const target = { ...player('target', 'civilian'), bodyguardTargetId: undefined };
        const guard = { ...player('guard', 'bodyguard'), bodyguardTargetId: 'target' };
        const voting = openVoting(game([target, guard, player('u', 'undercover'), player('c', 'civilian')]));
        const completed = ['target', 'guard', 'u', 'c'].reduce((state, voter) => castVote(state, voter, 'target'), voting);
        const result = resolveVote(completed);

        expect(result.players.find((entry) => entry.id === 'target')?.alive).toBe(true);
        expect(result.players.find((entry) => entry.id === 'guard')?.alive).toBe(false);
        expect(result.protectionAvailable).toBe(false);
        expect(result.lastResolution).toMatchObject({ source: 'bodyguard_protection', playerId: 'guard' });
    });

    test('holds a voted Mr. White for their normalized guess before resolving victory', () => {
        const voting = openVoting(game([player('white', 'mr_white'), player('c', 'civilian'), player('u', 'undercover')]));
        const completed = ['white', 'c', 'u'].reduce((state, voter) => castVote(state, voter, 'white'), voting);
        const pending = resolveVote(completed);

        expect(pending.phase).toBe('mr_white_guess');
        expect(submitMrWhiteGuess(pending, '  CAFE\u0301 ')).toMatchObject({ phase: 'finished', winner: 'mr_white' });
        expect(submitMrWhiteGuess(pending, '')).toMatchObject({ phase: 'finished', winner: 'undercovers' });
    });
});
