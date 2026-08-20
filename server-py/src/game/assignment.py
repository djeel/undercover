"""Cryptographically secure role and word assignment."""
from __future__ import annotations

import secrets
from dataclasses import replace
from random import Random

from .composition import choose_random_composition, validate_composition
from .types import GamePhase, GameState, PlayerRole, transition


def assign_roles(state: GameState, rng: Random | secrets.SystemRandom | None = None) -> GameState:
    rng = rng or secrets.SystemRandom()
    settings = choose_random_composition(len(state.players)) if state.settings.composition_mode.value == "hidden_random" else state.settings
    validate_composition(len(state.players), settings)
    roles = ([PlayerRole.UNDERCOVER] * settings.undercover_count + [PlayerRole.MR_WHITE] * settings.mr_white_count + [PlayerRole.JESTER] * settings.jester_count + [PlayerRole.BODYGUARD] * settings.bodyguard_count + [PlayerRole.CIVILIAN] * (len(state.players) - sum((settings.undercover_count, settings.mr_white_count, settings.jester_count, settings.bodyguard_count))))
    rng.shuffle(roles)
    players = tuple(replace(player, role=role, alive=True, bodyguard_target_id=None) for player, role in zip(state.players, roles, strict=True))
    bodyguard = next((player for player in players if player.role is PlayerRole.BODYGUARD), None)
    if bodyguard:
        targets = [player.id for player in players if player.id != bodyguard.id]
        target_id = rng.choice(targets)
        players = tuple(replace(player, bodyguard_target_id=target_id) if player.id == bodyguard.id else player for player in players)
    return transition(state, phase=GamePhase.PLAYING, settings=settings, players=players, votes=(), pending_mr_white_id=None, protection_available=True, winner=None)
