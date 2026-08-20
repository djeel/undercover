"""Voting transitions; persistence is deliberately outside these functions."""
from __future__ import annotations

from collections import Counter

from .resolution import eliminate
from .types import GamePhase, GameResolution, GameState, PlayerRole, transition


def open_voting(state: GameState) -> GameState:
    if state.phase is not GamePhase.PLAYING:
        raise ValueError("Voting can only open during play")
    return transition(state, phase=GamePhase.VOTING, votes=())


def cast_vote(state: GameState, voter_id: str, target_id: str) -> GameState:
    if state.phase is not GamePhase.VOTING:
        raise ValueError("Voting is not open")
    voter, target = state.player(voter_id), state.player(target_id)
    if not voter.alive or not target.alive:
        raise ValueError("Only living players may vote")
    if any(existing_voter == voter_id for existing_voter, _ in state.votes):
        raise ValueError("Player has already voted")
    return transition(state, votes=(*state.votes, (voter_id, target_id)))


def resolve_vote(state: GameState) -> tuple[GameState, GameResolution]:
    living = {player.id for player in state.players if player.alive}
    if state.phase is not GamePhase.VOTING or {voter for voter, _ in state.votes} != living:
        raise ValueError("Voting is incomplete")
    tally = Counter(target for _, target in state.votes)
    highest = max(tally.values())
    targets = [target for target, votes in tally.items() if votes == highest]
    if len(targets) != 1:
        resolution = GameResolution(type="tie")
        return transition(state, phase=GamePhase.PLAYING, votes=(), last_resolution=resolution), resolution
    target = state.player(targets[0])
    if target.role is PlayerRole.MR_WHITE:
        resolution = GameResolution(type="mr_white_pending", player_id=target.id)
        return transition(state, phase=GamePhase.MR_WHITE_GUESS, votes=(), pending_mr_white_id=target.id, last_resolution=resolution), resolution
    return eliminate(state, target.id, "vote")
