"""Elimination and victory resolution."""
from __future__ import annotations

from dataclasses import replace

from .types import EliminationSource, GamePhase, GameResolution, GameState, PlayerRole, Winner, transition


def check_victory(state: GameState) -> Winner | None:
    living = tuple(player for player in state.players if player.alive)
    roles = [player.role for player in living]
    if PlayerRole.MR_WHITE in roles and len(living) <= 2:
        return "mr_white"
    undercovers = roles.count(PlayerRole.UNDERCOVER)
    mr_whites = roles.count(PlayerRole.MR_WHITE)
    if undercovers == 0 and mr_whites == 0:
        return "civilians"
    if mr_whites:
        return "undercovers" if undercovers >= len(living) - undercovers else None
    civilian_team = roles.count(PlayerRole.CIVILIAN) + roles.count(PlayerRole.BODYGUARD)
    return "undercovers" if undercovers >= civilian_team else None


def eliminate(state: GameState, player_id: str, source: EliminationSource) -> tuple[GameState, GameResolution]:
    target = state.player(player_id)
    if not target.alive:
        raise ValueError("Player is already eliminated")
    replacement = state
    actual_source = source
    if source == "vote" and state.protection_available:
        guard = next((player for player in state.players if player.role is PlayerRole.BODYGUARD and player.alive and player.bodyguard_target_id == player_id), None)
        if guard:
            target = guard
            actual_source = "bodyguard_protection"
            replacement = transition(replacement, protection_available=False)
    replacement = replacement.replace_player(replace(target, alive=False))
    if source == "vote" and target.role is PlayerRole.JESTER:
        outcome = GameResolution(type="victory", source=actual_source, player_id=target.id, winner="jester")
        return transition(replacement, phase=GamePhase.FINISHED, winner="jester", last_resolution=outcome), outcome
    winner = check_victory(replacement)
    outcome = GameResolution(type="victory" if winner else "elimination", source=actual_source, player_id=target.id, winner=winner)
    return transition(replacement, phase=GamePhase.FINISHED if winner else GamePhase.PLAYING, votes=(), winner=winner, last_resolution=outcome), outcome


def resolve_mr_white_guess(state: GameState, guess: str) -> tuple[GameState, GameResolution]:
    if state.phase is not GamePhase.MR_WHITE_GUESS or not state.pending_mr_white_id or not state.word_pair:
        raise ValueError("No Mr. White guess is pending")
    if guess.strip().casefold() == state.word_pair.civilian.strip().casefold():
        outcome = GameResolution(type="victory", player_id=state.pending_mr_white_id, winner="mr_white")
        return transition(state, phase=GamePhase.FINISHED, pending_mr_white_id=None, winner="mr_white", last_resolution=outcome), outcome
    cleared = transition(state, pending_mr_white_id=None)
    return eliminate(cleared, state.pending_mr_white_id, "mr_white_wrong_or_skip")
