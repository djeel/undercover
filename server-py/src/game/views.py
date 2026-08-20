"""Member-filtered serialization: never return canonical game state."""
from __future__ import annotations

from typing import Any

from .types import CompositionMode, GamePhase, GameState, Player, PlayerRole


def _player_view(player: Player, viewer_id: str, finished: bool, state: GameState) -> dict[str, Any]:
    own = player.id == viewer_id
    data: dict[str, Any] = {"id": player.id, "displayName": player.display_name, "avatarUrl": player.avatar_url, "alive": player.alive}
    if own or finished:
        data["role"] = player.role.value if player.role else None
        data["word"] = _word_for(player, state)
        if own and player.role is PlayerRole.BODYGUARD:
            data["bodyguardTargetId"] = player.bodyguard_target_id
    return data


def _word_for(player: Player, state: GameState | None) -> str | None:
    if not state or not state.word_pair or player.role is PlayerRole.MR_WHITE:
        return None
    return state.word_pair.undercover if player.role is PlayerRole.UNDERCOVER else state.word_pair.civilian


def game_view(state: GameState, viewer_id: str, *, is_host: bool) -> dict[str, Any]:
    finished = state.phase is GamePhase.FINISHED
    players = [_player_view(player, viewer_id, finished, state) for player in state.players]
    result: dict[str, Any] = {"id": state.id, "roomCode": state.room_code, "phase": state.phase.value, "hostPlayerId": state.host_player_id, "players": players, "version": state.version, "round": state.round, "lastResolution": state.last_resolution, "winner": state.winner}
    if state.settings.composition_mode is CompositionMode.VISIBLE_MANUAL or finished or (is_host and state.settings.composition_mode is CompositionMode.HIDDEN_MANUAL):
        result["settings"] = {"undercoverCount": state.settings.undercover_count, "mrWhiteCount": state.settings.mr_white_count, "jesterCount": state.settings.jester_count, "bodyguardCount": state.settings.bodyguard_count, "compositionMode": state.settings.composition_mode.value}
    else:
        result["composition"] = "hidden"
    if state.phase is GamePhase.MR_WHITE_GUESS:
        result["awaitingMrWhiteGuess"] = True
        if state.pending_mr_white_id == viewer_id:
            result["mrWhiteGuessPrompt"] = "Guess the civilian word"
    return result
