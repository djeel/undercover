// Role Definitions
export var PlayerRole;
(function (PlayerRole) {
    PlayerRole["CIVILIAN"] = "CIVILIAN";
    PlayerRole["UNDERCOVER"] = "UNDERCOVER";
    PlayerRole["MR_WHITE"] = "MR_WHITE";
    PlayerRole["JESTER"] = "JESTER";
    PlayerRole["BODYGUARD"] = "BODYGUARD";
})(PlayerRole || (PlayerRole = {}));
// Game Phases
export var GamePhase;
(function (GamePhase) {
    GamePhase["LOBBY"] = "LOBBY";
    GamePhase["PLAYING"] = "PLAYING";
    GamePhase["VOTING"] = "VOTING";
    GamePhase["FINISHED"] = "FINISHED";
})(GamePhase || (GamePhase = {}));
// Socket Events
export var SocketEvents;
(function (SocketEvents) {
    SocketEvents["JOIN_ROOM"] = "JOIN_ROOM";
    SocketEvents["PLAYER_JOINED"] = "PLAYER_JOINED";
    SocketEvents["START_GAME"] = "START_GAME";
    SocketEvents["GAME_STARTED"] = "GAME_STARTED";
    SocketEvents["SUBMIT_WORD"] = "SUBMIT_WORD";
    SocketEvents["SUBMIT_VOTE"] = "SUBMIT_VOTE";
    SocketEvents["UPDATE_STATE"] = "UPDATE_STATE";
    SocketEvents["ERROR"] = "ERROR";
})(SocketEvents || (SocketEvents = {}));
