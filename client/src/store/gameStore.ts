import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../i18n';
import { WORD_PAIRS } from '../data/wordPairs';

// Types
export type Role = 'civilian' | 'undercover' | 'mrWhite';

export interface Player {
    id: string;
    name: string;
    role: Role;
    word: string;
    isEliminated: boolean;
    hasRevealed: boolean;
}

export interface GameConfig {
    civilianWord: string;
    undercoverWord: string;
    undercoverCount: number;
    mrWhiteCount: number;
}

export type GamePhase = 'idle' | 'setup' | 'reveal' | 'playing' | 'voting' | 'results';

export interface GameResult {
    id: string;
    date: string;
    players: Pick<Player, 'name' | 'role'>[];
    winner: 'civilians' | 'undercovers' | 'mrWhite';
    civilianWord: string;
    undercoverWord: string;
    rounds: number;
}

interface GameState {
    // Game state
    players: Player[];
    config: GameConfig;
    phase: GamePhase;
    currentRevealIndex: number;
    round: number;
    winner: 'civilians' | 'undercovers' | 'mrWhite' | null;

    // History
    history: GameResult[];

    // Actions
    addPlayer: (name: string) => boolean;
    removePlayer: (id: string) => void;
    updateConfig: (config: Partial<GameConfig>) => void;
    startGame: () => void;
    revealCurrentPlayer: () => void;
    nextRevealPlayer: () => void;
    startPlaying: () => void;
    eliminatePlayer: (id: string) => void;
    resetGame: () => void;
    restartGame: () => void;
    clearHistory: () => void;
    setWinner: (winner: 'civilians' | 'undercovers' | 'mrWhite' | null) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

const getRandomWordPair = (): [string, string] => {
    const pairObj = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
    const lang = i18n.language?.split('-')[0] || 'en';
    // Fallback to English if the language is not available in the pair object (though all should have en/fr)
    const pair = pairObj[lang] || pairObj['en'];

    return Math.random() > 0.5 ? [pair[0], pair[1]] : [pair[1], pair[0]];
};

const initialConfig: GameConfig = {
    civilianWord: '',
    undercoverWord: '',
    undercoverCount: 1,
    mrWhiteCount: 0,
};

export const useGameStore = create<GameState>()(
    persist(
        (set, get) => ({
            players: [],
            config: initialConfig,
            phase: 'idle',
            currentRevealIndex: 0,
            round: 1,
            winner: null,
            history: [],

            addPlayer: (name: string) => {
                const trimmedName = name.trim();
                if (!trimmedName) return false;

                const { players } = get();
                const isDuplicate = players.some(
                    (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
                );

                if (isDuplicate) return false;

                set((state) => ({
                    players: [
                        ...state.players,
                        {
                            id: generateId(),
                            name: trimmedName,
                            role: 'civilian',
                            word: '',
                            isEliminated: false,
                            hasRevealed: false,
                        },
                    ],
                }));
                return true;
            },

            removePlayer: (id: string) => {
                set((state) => ({
                    players: state.players.filter((p) => p.id !== id),
                }));
            },

            updateConfig: (config: Partial<GameConfig>) => {
                set((state) => ({
                    config: { ...state.config, ...config },
                }));
            },

            startGame: () => {
                const { players, config } = get();
                const totalPlayers = players.length;
                const [civilianWord, undercoverWord] = getRandomWordPair();

                // Assign roles
                const roles: Role[] = [];
                for (let i = 0; i < config.undercoverCount; i++) roles.push('undercover');
                for (let i = 0; i < config.mrWhiteCount; i++) roles.push('mrWhite');
                while (roles.length < totalPlayers) roles.push('civilian');

                const shuffledRoles = shuffleArray(roles);
                const shuffledPlayers = shuffleArray(players);

                const assignedPlayers = shuffledPlayers.map((player, index) => ({
                    ...player,
                    role: shuffledRoles[index],
                    word: shuffledRoles[index] === 'mrWhite'
                        ? ''
                        : shuffledRoles[index] === 'undercover'
                            ? undercoverWord
                            : civilianWord,
                    hasRevealed: false,
                    isEliminated: false,
                }));

                set({
                    players: assignedPlayers,
                    config: { ...config, civilianWord, undercoverWord },
                    phase: 'reveal',
                    currentRevealIndex: 0,
                    round: 1,
                    winner: null,
                });
            },

            revealCurrentPlayer: () => {
                const { currentRevealIndex, players } = get();
                const updatedPlayers = [...players];
                if (updatedPlayers[currentRevealIndex]) {
                    updatedPlayers[currentRevealIndex].hasRevealed = true;
                }
                set({ players: updatedPlayers });
            },

            nextRevealPlayer: () => {
                set((state) => ({
                    currentRevealIndex: state.currentRevealIndex + 1,
                }));
            },

            startPlaying: () => {
                set({ phase: 'playing' });
            },

            eliminatePlayer: (id: string) => {
                const state = get();
                const updatedPlayers = state.players.map((p) =>
                    p.id === id ? { ...p, isEliminated: true } : p
                );

                // Check win conditions
                const alivePlayers = updatedPlayers.filter((p) => !p.isEliminated);
                const aliveUndercovers = alivePlayers.filter((p) => p.role === 'undercover');
                const aliveMrWhite = alivePlayers.filter((p) => p.role === 'mrWhite');
                const aliveCivilians = alivePlayers.filter((p) => p.role === 'civilian');

                let winner: 'civilians' | 'undercovers' | 'mrWhite' | null = null;
                let newPhase: GamePhase = 'playing';

                // Condition 1: Mr. White wins if only him + 1 other player remain
                if (aliveMrWhite.length > 0 && alivePlayers.length === 2) {
                    winner = 'mrWhite';
                    newPhase = 'results';
                }
                // Condition 2: Civilians win if ALL Undercovers AND Mr. White are eliminated
                else if (aliveUndercovers.length === 0 && aliveMrWhite.length === 0) {
                    winner = 'civilians';
                    newPhase = 'results';
                }
                // Condition 3: Undercovers win if >= Civilians (AND no Mr. White, per strict rules)
                // If Mr. White is still alive and UC >= Civ, game continues until Mr. White wins (1v1) or is eliminated.
                else if (aliveUndercovers.length >= aliveCivilians.length && aliveMrWhite.length === 0) {
                    winner = 'undercovers';
                    newPhase = 'results';
                }
                // Game continues
                else {
                    newPhase = 'playing';
                }

                // Save to history if game ended
                let newHistory = state.history;
                if (newPhase === 'results' && winner) {
                    const result: GameResult = {
                        id: generateId(),
                        date: new Date().toISOString(),
                        players: updatedPlayers.map((p) => ({ name: p.name, role: p.role })),
                        winner,
                        civilianWord: state.config.civilianWord,
                        undercoverWord: state.config.undercoverWord,
                        rounds: state.round,
                    };
                    newHistory = [result, ...state.history].slice(0, 20); // Keep last 20 games
                }

                set({
                    players: updatedPlayers,
                    winner,
                    phase: newPhase,
                    round: newPhase === 'playing' ? state.round + 1 : state.round,
                    history: newHistory,
                });
            },

            resetGame: () => {
                set({
                    players: [],
                    config: initialConfig,
                    phase: 'idle',
                    currentRevealIndex: 0,
                    round: 1,
                    winner: null,
                });
            },

            restartGame: () => {
                // Keep players and config, just reset game state
                const { players } = get();
                const resetPlayers = players.map(p => ({
                    ...p,
                    role: 'civilian' as Role, // Reset to default
                    word: '',
                    isEliminated: false,
                    hasRevealed: false
                }));

                set({
                    players: resetPlayers,
                    phase: 'idle',
                    currentRevealIndex: 0,
                    round: 1,
                    winner: null,
                });
            },

            clearHistory: () => {
                set({ history: [] });
            },

            setWinner: (winner) => {
                const state = get();
                // Create game result
                const result: GameResult = {
                    id: generateId(),
                    date: new Date().toISOString(),
                    players: state.players.map((p) => ({ name: p.name, role: p.role })),
                    winner: winner!,
                    civilianWord: state.config.civilianWord,
                    undercoverWord: state.config.undercoverWord,
                    rounds: state.round,
                };

                set({
                    winner,
                    phase: 'results',
                    history: [result, ...state.history].slice(0, 20),
                });
            },
        }),
        {
            name: 'undercover-game-storage',
            partialize: (state) => ({ history: state.history }),
        }
    )
);
