export declare enum PlayerRole {
    CIVILIAN = "CIVILIAN",
    UNDERCOVER = "UNDERCOVER",
    MR_WHITE = "MR_WHITE"
}
export declare enum GamePhase {
    LOBBY = "LOBBY",
    PLAYING = "PLAYING",
    VOTING = "VOTING",
    FINISHED = "FINISHED"
}
export interface Player {
    id: string;
    name: string;
    role?: PlayerRole;
    word?: string;
    isAlive: boolean;
    hasVoted: boolean;
    votesReceived: number;
}
export interface GameState {
    roomId: string;
    phase: GamePhase;
    players: Player[];
    currentTurnPlayerId?: string;
    winner?: PlayerRole;
    settings: {
        totalPlayers: number;
        undercoverCount: number;
        mrWhiteCount: number;
    };
}
export declare enum SocketEvents {
    JOIN_ROOM = "JOIN_ROOM",
    PLAYER_JOINED = "PLAYER_JOINED",
    START_GAME = "START_GAME",
    GAME_STARTED = "GAME_STARTED",
    SUBMIT_WORD = "SUBMIT_WORD",// For describing the word
    SUBMIT_VOTE = "SUBMIT_VOTE",
    UPDATE_STATE = "UPDATE_STATE",
    ERROR = "ERROR"
}
export interface JoinRoomPayload {
    roomId: string;
    playerName: string;
}
