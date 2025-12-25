import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../i18n';
import { WORD_PAIRS } from '../data/wordPairs';
import { GameStateResponse } from '../services/api';
import { socketService } from '../services/socket';

// Types
export type Role = 'civilian' | 'undercover' | 'mrWhite' | 'jester' | 'bodyguard' | 'unknown';

export interface Player {
    id: string;
    name: string;
    role: Role;
    word: string;
    isEliminated: boolean;
    hasRevealed: boolean;
    votesReceived: number;
    hasVoted: boolean;
    bodyguardTargetId?: string;
}

export interface GameConfig {
    civilianWord: string;
    undercoverWord: string;
    undercoverCount: number;
    mrWhiteCount: number;
    jesterCount: number;
    bodyguardCount: number;
}

export type GamePhase = 'idle' | 'setup' | 'reveal' | 'playing' | 'voting' | 'results';



interface GameState {
    // Game state
    players: Player[];
    config: GameConfig;
    phase: GamePhase;
    currentRevealIndex: number;
    round: number;
    winner: 'civilians' | 'undercovers' | 'mrWhite' | 'jester' | null;

    // Multiplayer
    gameMode: 'local' | 'online';
    onlineState: {
        roomId: string | null;
        playerId: string | null;
        isHost: boolean;
        lastPoll: number;
    };



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
    setWinner: (winner: 'civilians' | 'undercovers' | 'mrWhite' | 'jester' | null) => void;

    // Multiplayer Actions
    setGameMode: (mode: 'local' | 'online') => void;
    setOnlineState: (state: Partial<GameState['onlineState']>) => void;
    syncWithServer: (serverResponse: GameStateResponse) => void;
    leaveRoom: () => void;
    kickPlayer: (playerId: string) => Promise<void>;
    votePlayer: (targetId: string) => Promise<void>;
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
    jesterCount: 0,
    bodyguardCount: 0,
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


            gameMode: 'local',
            onlineState: {
                roomId: null,
                playerId: null,
                isHost: false,
                lastPoll: 0
            },

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
                            votesReceived: 0,
                            hasVoted: false,
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
                for (let i = 0; i < config.jesterCount; i++) roles.push('jester');
                for (let i = 0; i < config.bodyguardCount; i++) roles.push('bodyguard');
                while (roles.length < totalPlayers) roles.push('civilian');

                const shuffledRoles = shuffleArray(roles);
                const shuffledPlayers = shuffleArray(players);

                // Need to pre-calculate roles map to assign targets
                const assignedInfos = shuffledPlayers.map((player, index) => ({
                    id: player.id,
                    role: shuffledRoles[index]
                }));

                const assignedPlayers = shuffledPlayers.map((player, index) => {
                    const role = shuffledRoles[index];
                    let bodyguardTargetId: string | undefined;

                    if (role === 'bodyguard') {
                        // Find potential targets (non-bodyguard players)
                        // Preferably a civilian if possible, but for now just picking any other player
                        // Matching backend logic: Pick a random player who is NOT the bodyguard themselves.
                        const potentialTargets = assignedInfos.filter(p => p.id !== player.id);
                        if (potentialTargets.length > 0) {
                            const target = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
                            bodyguardTargetId = target.id;
                        }
                    }

                    return {
                        ...player,
                        role: role,
                        word: role === 'mrWhite'
                            ? ''
                            : role === 'undercover'
                                ? undercoverWord
                                : role === 'jester'
                                    ? civilianWord // Jester gets civilian word
                                    : role === 'bodyguard'
                                        ? civilianWord // Bodyguard gets civilian word
                                        : civilianWord,
                        hasRevealed: false,
                        isEliminated: false,
                        votesReceived: 0,
                        hasVoted: false,
                        bodyguardTargetId
                    };
                });

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

                // Condition 1: Mr. White wins if only him + 1 other player remain (1v1 Survival)
                // OR checking locally if Mr. White just won via word guess is handled by backend or manual trigger in local (not handled here automatically without guess input)
                if (aliveMrWhite.length > 0 && alivePlayers.length <= 2) {
                    winner = 'mrWhite';
                    newPhase = 'results';
                }
                // Condition 2: Civilians Win (All enemies eliminated)
                else if (aliveUndercovers.length === 0 && aliveMrWhite.length === 0) {
                    winner = 'civilians';
                    newPhase = 'results';
                }
                // Condition 3: Undercover Win
                // A. No Civilians left
                else if (aliveCivilians.length === 0) {
                    winner = 'undercovers';
                    newPhase = 'results';
                }
                // B. Absolute Majority (UC >= Civ + White)
                else if (aliveUndercovers.length >= (aliveCivilians.length + aliveMrWhite.length)) {
                    winner = 'undercovers';
                    newPhase = 'results';
                }
                // C. Simple Majority (UC >= Civ) ONLY if Mr. White is gone
                else if (aliveMrWhite.length === 0 && aliveUndercovers.length >= aliveCivilians.length) {
                    winner = 'undercovers';
                    newPhase = 'results';
                }
                // Game continues
                else {
                    newPhase = 'playing';
                }



                set({
                    players: updatedPlayers,
                    winner,
                    phase: newPhase,
                    round: newPhase === 'playing' ? state.round + 1 : state.round,

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

            restartGame: async () => {
                const { gameMode, onlineState } = get();

                // Online Mode - just call API and return, polling will handle state updates
                if (gameMode === 'online' && onlineState.roomId) {
                    try {
                        await import('../services/api').then(m => m.api.restartGame(onlineState.roomId!));
                    } catch (e) {
                        console.error("Failed to restart online game", e);
                    }
                    // Don't execute local logic for online games
                    return;
                }

                // Local Mode only
                const { players } = get();
                const resetPlayers = players.map(p => ({
                    ...p,
                    role: 'civilian' as Role,
                    word: '',
                    isEliminated: false,
                    hasRevealed: false,
                    votesReceived: 0,
                    hasVoted: false,
                }));

                set({
                    players: resetPlayers,
                    phase: 'setup',
                    currentRevealIndex: 0,
                    round: 1,
                    winner: null,
                });
            },



            setWinner: (winner) => {
                set({
                    winner,
                    phase: 'results',
                });
            },

            setGameMode: (mode) => set({ gameMode: mode }),

            setOnlineState: (onlineState) => set((state) => ({
                onlineState: { ...state.onlineState, ...onlineState }
            })),

            syncWithServer: (response: GameStateResponse) => {
                const state = get();

                const mapRole = (serverRole?: string): Role => {
                    switch (serverRole) {
                        case 'CIVILIAN': return 'civilian';
                        case 'UNDERCOVER': return 'undercover';
                        case 'MR_WHITE': return 'mrWhite';
                        case 'JESTER': return 'jester';
                        case 'BODYGUARD': return 'bodyguard';
                        default: return 'unknown';
                    }
                };

                const mappedPlayers: Player[] = response.players.map(p => ({
                    id: p.id,
                    name: p.name,
                    role: mapRole(p.role),
                    word: p.word || '',
                    isEliminated: !p.is_alive,
                    hasRevealed: true,
                    votesReceived: p.votes_received,
                    hasVoted: p.has_voted,
                    bodyguardTargetId: p.bodyguard_target_id
                }));

                let phase: GamePhase = state.phase;
                if (response.phase === 'LOBBY') phase = 'setup';
                else if (response.phase === 'PLAYING') phase = 'playing';
                else if (response.phase === 'VOTING') phase = 'voting';
                else if (response.phase === 'FINISHED') phase = 'results';

                // Helper to map backend winner format to frontend
                const mapWinner = (w: string | null | undefined): 'civilians' | 'undercovers' | 'mrWhite' | 'jester' | null => {
                    if (!w) return null;
                    if (w === 'CIVILIANS' || w === 'civilians') return 'civilians';
                    if (w === 'UNDERCOVER' || w === 'undercovers') return 'undercovers';
                    if (w === 'MR_WHITE' || w === 'mrWhite') return 'mrWhite';
                    if (w === 'JESTER' || w === 'jester') return 'jester';
                    return null;
                };

                set({
                    players: mappedPlayers,
                    phase,
                    winner: mapWinner(response.winner),
                    onlineState: { ...state.onlineState, lastPoll: Date.now() },
                    // If settings present, update config
                    config: response.settings ? {
                        ...state.config,
                        undercoverCount: response.settings.undercover_count,
                        mrWhiteCount: response.settings.mr_white_count,
                        jesterCount: response.settings.jester_count,
                        bodyguardCount: response.settings.bodyguard_count,
                        // Update words if provided (usually at game end)
                        civilianWord: response.settings.civilian_word || state.config.civilianWord,
                        undercoverWord: response.settings.undercover_word || state.config.undercoverWord
                    } : state.config
                });
            },

            leaveRoom: () => {
                socketService.disconnect();
                set({
                    onlineState: {
                        roomId: null,
                        playerId: null,
                        isHost: false,
                        lastPoll: 0
                    },
                    phase: 'idle',
                    players: [],
                    gameMode: 'local' // Fallback to local
                });
            },

            kickPlayer: async (playerId: string) => {
                const { onlineState } = get();
                if (!onlineState.roomId) return;
                try {
                    await import('../services/api').then(m => m.api.kickPlayer(onlineState.roomId!, playerId));
                    // Update happens via sync
                } catch (e) {
                    console.error("Kick failed", e);
                }
            },

            votePlayer: async (targetId: string) => {
                const { onlineState } = get();
                if (!onlineState.roomId || !onlineState.playerId) return;
                try {
                    await import('../services/api').then(m => m.api.votePlayer(onlineState.roomId!, onlineState.playerId!, targetId));
                } catch (e) {
                    console.error("Vote failed", e);
                }
            }
        }),
        {
            name: 'undercover-game-storage',
            partialize: () => ({}),
        }
    )
);
