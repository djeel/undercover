export declare const PlayerRole: {
    readonly CIVILIAN: "civilian";
    readonly UNDERCOVER: "undercover";
    readonly MR_WHITE: "mr_white";
    readonly JESTER: "jester";
    readonly BODYGUARD: "bodyguard";
};
export type PlayerRole = typeof PlayerRole[keyof typeof PlayerRole];
export declare const GamePhase: {
    readonly LOBBY: "lobby";
    readonly PLAYING: "playing";
    readonly VOTING: "voting";
    readonly MR_WHITE_GUESS: "mr_white_guess";
    readonly FINISHED: "finished";
};
export type GamePhase = typeof GamePhase[keyof typeof GamePhase];
export declare const WinnerType: {
    readonly CIVILIANS: "civilians";
    readonly UNDERCOVERS: "undercovers";
    readonly MR_WHITE: "mr_white";
    readonly JESTER: "jester";
};
export type WinnerType = typeof WinnerType[keyof typeof WinnerType];
export declare const CompositionMode: {
    readonly VISIBLE_MANUAL: "visible_manual";
    readonly HIDDEN_MANUAL: "hidden_manual";
    readonly HIDDEN_RANDOM: "hidden_random";
};
export type CompositionMode = typeof CompositionMode[keyof typeof CompositionMode];
export type GameResolutionType = 'elimination' | 'tie' | 'mr_white_pending' | 'victory';
export type EliminationSource = 'vote' | 'mr_white_wrong_or_skip' | 'bodyguard_protection' | 'disconnect' | 'kick';
export interface GameResolution {
    type: GameResolutionType;
    source?: EliminationSource | null;
    playerId?: string | null;
    winner?: WinnerType | null;
}
export interface GamePlayerView {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    alive: boolean;
    role?: PlayerRole | null;
    word?: string | null;
    bodyguardTargetId?: string | null;
}
export interface GameSettingsView {
    undercoverCount: number;
    mrWhiteCount: number;
    jesterCount: number;
    bodyguardCount: number;
    compositionMode: CompositionMode;
}
export interface GameView {
    id: string;
    roomCode: string;
    hostPlayerId: string;
    phase: GamePhase;
    players: GamePlayerView[];
    version: number;
    round: number;
    settings?: GameSettingsView;
    composition?: 'hidden';
    awaitingMrWhiteGuess?: boolean;
    mrWhiteGuessPrompt?: string;
    winner: WinnerType | null;
    lastResolution: GameResolution | null;
}
export interface ProfileView {
    id: string;
    handle: string;
    displayName: string;
    avatarUrl: string | null;
}
export type FriendshipStatus = 'pending' | 'accepted';
export interface FriendshipView {
    profileId: string;
    requestedBy: string;
    status: FriendshipStatus;
    profile?: ProfileView;
}
export interface PlayerRoleStatsView {
    role: PlayerRole;
    gamesPlayed: number;
    wins: number;
}
export interface PlayerResultView {
    role: PlayerRole;
    winner: WinnerType;
    won: boolean;
    survived: boolean;
    roundsPlayed: number;
    durationSeconds: number;
    playedAt: string;
}
export interface PlayerStatsView {
    gamesPlayed: number;
    gamesWon: number;
    gamesLost: number;
    currentWinStreak: number;
    bestWinStreak: number;
    roles: PlayerRoleStatsView[];
    results: PlayerResultView[];
}
export interface CreateGamePayload {
    language: 'en' | 'fr';
    displayName?: string;
}
export interface CreateGameResponse {
    roomCode: string;
    hostPlayerId: string;
}
export interface JoinGamePayload {
    displayName?: string;
}
export interface JoinGameResponse {
    game: GameView;
    playerId: string;
}
export type UpdateGameSettingsPayload = GameSettingsView;
export interface VotePayload {
    targetPlayerId: string;
}
export interface MrWhiteGuessPayload {
    guess: string;
}
export interface UpdateProfilePayload {
    handle?: string;
    displayName?: string;
}
export interface GameStateChangedPayload {
    roomCode: string;
    version: number;
}
export interface ApiErrorResponse {
    code?: string;
    detail?: string;
    message?: string;
}
