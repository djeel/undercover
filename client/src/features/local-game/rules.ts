import type { GameResolution, GamePhase, PlayerRole, WinnerType } from '@undercover/shared';

export interface LocalPlayer {
    id: string;
    displayName: string;
    role: PlayerRole;
    word: string | null;
    alive: boolean;
    bodyguardTargetId?: string;
}

export interface LocalGameState {
    phase: GamePhase;
    players: LocalPlayer[];
    votes: Record<string, string>;
    round: number;
    civilianWord: string;
    protectionAvailable: boolean;
    lastResolution: GameResolution | null;
    winner: WinnerType | null;
    pendingMrWhiteId: string | null;
}

const normalize = (value: string) => value.trim().toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const living = (state: LocalGameState) => state.players.filter((player) => player.alive);

const checkVictory = (state: LocalGameState): WinnerType | null => {
    const remaining = living(state);
    const roles = remaining.map((player) => player.role);
    const undercovers = roles.filter((role) => role === 'undercover').length;
    const mrWhites = roles.filter((role) => role === 'mr_white').length;

    if (mrWhites > 0 && remaining.length <= 2) return 'mr_white';
    if (undercovers === 0 && mrWhites === 0) return 'civilians';
    if (mrWhites > 0) return undercovers >= remaining.length - undercovers ? 'undercovers' : null;

    const civilianTeam = roles.filter((role) => role === 'civilian' || role === 'bodyguard').length;
    return undercovers >= civilianTeam ? 'undercovers' : null;
};

const finishOrContinue = (state: LocalGameState, resolution: GameResolution): LocalGameState => {
    const winner = resolution.winner ?? checkVictory(state);
    const finalResolution = winner ? { ...resolution, type: 'victory' as const, winner } : resolution;
    return {
        ...state,
        phase: winner ? 'finished' : 'playing',
        votes: {},
        winner,
        lastResolution: finalResolution,
        round: winner ? state.round : state.round + 1,
    };
};

const eliminate = (state: LocalGameState, playerId: string, source: NonNullable<GameResolution['source']>): LocalGameState => {
    const target = state.players.find((player) => player.id === playerId);
    if (!target?.alive) throw new Error('Player is already eliminated');

    const guard = source === 'vote' && state.protectionAvailable
        ? state.players.find((player) => player.role === 'bodyguard' && player.alive && player.bodyguardTargetId === playerId)
        : undefined;
    const eliminated = guard ?? target;
    const actualSource = guard ? 'bodyguard_protection' as const : source;
    const updated = {
        ...state,
        protectionAvailable: guard ? false : state.protectionAvailable,
        players: state.players.map((player) => player.id === eliminated.id ? { ...player, alive: false } : player),
    };

    if (source === 'vote' && eliminated.role === 'jester') {
        return finishOrContinue(updated, { type: 'victory', source: actualSource, playerId: eliminated.id, winner: 'jester' });
    }
    return finishOrContinue(updated, { type: 'elimination', source: actualSource, playerId: eliminated.id });
};

export const openVoting = (state: LocalGameState): LocalGameState => {
    if (state.phase !== 'playing') throw new Error('Voting can only open during play');
    return { ...state, phase: 'voting', votes: {} };
};

export const castVote = (state: LocalGameState, voterId: string, targetId: string): LocalGameState => {
    if (state.phase !== 'voting') throw new Error('Voting is not open');
    const voter = state.players.find((player) => player.id === voterId);
    const target = state.players.find((player) => player.id === targetId);
    if (!voter?.alive || !target?.alive) throw new Error('Only living players may vote');
    if (state.votes[voterId]) throw new Error('Player has already voted');
    return { ...state, votes: { ...state.votes, [voterId]: targetId } };
};

export const resolveVote = (state: LocalGameState): LocalGameState => {
    const voters = living(state);
    if (state.phase !== 'voting' || voters.some((player) => !state.votes[player.id])) throw new Error('Voting is incomplete');
    const tally = Object.values(state.votes).reduce<Record<string, number>>((counts, targetId) => ({ ...counts, [targetId]: (counts[targetId] ?? 0) + 1 }), {});
    const highest = Math.max(...Object.values(tally));
    const targets = Object.keys(tally).filter((id) => tally[id] === highest);
    if (targets.length !== 1) return { ...state, phase: 'playing', votes: {}, lastResolution: { type: 'tie' } };

    const target = state.players.find((player) => player.id === targets[0]);
    if (target?.role === 'mr_white') {
        return { ...state, phase: 'mr_white_guess', votes: {}, pendingMrWhiteId: target.id, lastResolution: { type: 'mr_white_pending', playerId: target.id } };
    }
    return eliminate(state, targets[0], 'vote');
};

export const submitMrWhiteGuess = (state: LocalGameState, guess: string): LocalGameState => {
    if (state.phase !== 'mr_white_guess' || !state.pendingMrWhiteId) throw new Error('No Mr. White guess is pending');
    if (normalize(guess) === normalize(state.civilianWord)) {
        return { ...state, phase: 'finished', winner: 'mr_white', pendingMrWhiteId: null, lastResolution: { type: 'victory', playerId: state.pendingMrWhiteId, winner: 'mr_white' } };
    }
    return eliminate({ ...state, pendingMrWhiteId: null }, state.pendingMrWhiteId, 'mr_white_wrong_or_skip');
};

export const leaveGame = (state: LocalGameState, playerId: string): LocalGameState => eliminate(state, playerId, 'disconnect');
