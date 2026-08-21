import { create } from 'zustand';
import { WORD_PAIRS } from '../../data/wordPairs';
import i18n from '../../i18n';
import {
    eliminatePlayer as eliminateLocalPlayer,
    leaveGame,
    submitMrWhiteGuess,
    type LocalGameState,
    type LocalPlayer,
} from './rules';
import { validateLocalComposition } from './composition';

export type LocalPhase = 'idle' | 'setup' | 'reveal' | LocalGameState['phase'];
export interface LocalGameConfig {
    civilianWord: string;
    undercoverWord: string;
    undercoverCount: number;
    mrWhiteCount: number;
    jesterCount: number;
    bodyguardCount: number;
}
export interface LocalGameStore extends Omit<LocalGameState, 'phase'> {
    phase: LocalPhase;
    config: LocalGameConfig;
    currentRevealIndex: number;
    addPlayer(name: string): boolean;
    removePlayer(id: string): void;
    updateConfig(config: Partial<LocalGameConfig>): void;
    startGame(): boolean;
    nextRevealPlayer(): void;
    startPlaying(): void;
    submitMrWhiteGuess(guess: string): void;
    eliminatePlayer(playerId: string): void;
    leaveGame(playerId: string): void;
    resetGame(): void;
    restartGame(): void;
}

const initialConfig: LocalGameConfig = { civilianWord: '', undercoverWord: '', undercoverCount: 1, mrWhiteCount: 0, jesterCount: 0, bodyguardCount: 0 };
const baseState = (): Pick<LocalGameStore, 'phase' | 'players' | 'votes' | 'round' | 'civilianWord' | 'protectionAvailable' | 'lastResolution' | 'winner' | 'pendingMrWhiteId' | 'currentRevealIndex'> => ({
    phase: 'idle', players: [], votes: {}, round: 1, civilianWord: '', protectionAvailable: true, lastResolution: null, winner: null, pendingMrWhiteId: null, currentRevealIndex: 0,
});

const localState = (state: LocalGameStore): LocalGameState => ({
    phase: state.phase === 'idle' || state.phase === 'setup' || state.phase === 'reveal' ? 'playing' : state.phase,
    players: state.players, votes: state.votes, round: state.round, civilianWord: state.civilianWord, protectionAvailable: state.protectionAvailable,
    lastResolution: state.lastResolution, winner: state.winner, pendingMrWhiteId: state.pendingMrWhiteId,
});

const randomIndex = (length: number) => crypto.getRandomValues(new Uint32Array(1))[0] % length;
const shuffled = <T,>(items: T[]) => {
    const values = [...items];
    for (let index = values.length - 1; index > 0; index -= 1) {
        const other = randomIndex(index + 1);
        [values[index], values[other]] = [values[other], values[index]];
    }
    return values;
};

export const useLocalGameStore = create<LocalGameStore>((set, get) => ({
    ...baseState(),
    config: initialConfig,
    addPlayer: (name) => {
        const displayName = name.trim();
        if (!displayName || get().players.some((player) => player.displayName.localeCompare(displayName, undefined, { sensitivity: 'accent' }) === 0)) return false;
        set((state) => ({ players: [...state.players, { id: crypto.randomUUID(), displayName, role: 'civilian', word: null, alive: true }] }));
        return true;
    },
    removePlayer: (id) => set((state) => ({ players: state.players.filter((player) => player.id !== id) })),
    updateConfig: (config) => set((state) => ({ config: { ...state.config, ...config } })),
    startGame: () => {
        const state = get();
        if (!validateLocalComposition(state.players.length, state.config).valid) return false;

        const language = i18n.language.split('-')[0] || 'en';
        const pair = WORD_PAIRS[randomIndex(WORD_PAIRS.length)][language] ?? WORD_PAIRS[randomIndex(WORD_PAIRS.length)].en;
        const [civilianWord, undercoverWord] = randomIndex(2) === 0 ? pair : [pair[1], pair[0]];
        const roles = shuffled([
            ...Array(state.config.undercoverCount).fill('undercover' as const),
            ...Array(state.config.mrWhiteCount).fill('mr_white' as const),
            ...Array(state.config.jesterCount).fill('jester' as const),
            ...Array(state.config.bodyguardCount).fill('bodyguard' as const),
            ...Array(state.players.length - state.config.undercoverCount - state.config.mrWhiteCount - state.config.jesterCount - state.config.bodyguardCount).fill('civilian' as const),
        ]);
        const players = state.players.map((player, index): LocalPlayer => {
            const role = roles[index];
            const targets = state.players.filter((candidate) => candidate.id !== player.id);
            return {
                ...player,
                role,
                word: role === 'mr_white' ? null : role === 'undercover' ? undercoverWord : civilianWord,
                alive: true,
                bodyguardTargetId: role === 'bodyguard' && targets.length ? targets[randomIndex(targets.length)].id : undefined,
            };
        });
        set({ ...baseState(), players, phase: 'reveal', config: { ...state.config, civilianWord, undercoverWord }, civilianWord });
        return true;
    },
    nextRevealPlayer: () => set((state) => ({ currentRevealIndex: state.currentRevealIndex + 1 })),
    startPlaying: () => set({ phase: 'playing' }),
    submitMrWhiteGuess: (guess) => set((state) => submitMrWhiteGuess(localState(state), guess)),
    eliminatePlayer: (playerId) => set((state) => eliminateLocalPlayer(localState(state), playerId)),
    leaveGame: (playerId) => set((state) => leaveGame(localState(state), playerId)),
    resetGame: () => set({ ...baseState(), config: initialConfig }),
    restartGame: () => set((state) => ({ ...baseState(), phase: 'setup', players: state.players.map((player) => ({ ...player, role: 'civilian', word: null, alive: true, bodyguardTargetId: undefined })), config: initialConfig })),
}));
