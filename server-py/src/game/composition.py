"""Valid role compositions and hidden-random selection."""
from __future__ import annotations

import secrets

from .types import CompositionMode, Settings

RANDOM_COMPOSITIONS: dict[int, tuple[tuple[int, int, int, int], ...]] = {
    3: ((1, 0, 0, 0),),
    4: ((1, 0, 0, 0), (1, 1, 0, 0)),
    5: ((1, 1, 0, 0), (2, 0, 0, 0)),
    6: ((2, 0, 0, 0), (1, 1, 1, 0), (1, 1, 0, 1)),
    7: ((2, 1, 0, 0), (2, 0, 1, 0), (1, 1, 1, 1), (2, 1, 0, 1)),
    8: ((2, 1, 0, 0), (2, 0, 1, 0), (1, 1, 1, 1), (2, 1, 0, 1)),
    9: ((2, 1, 1, 0), (2, 1, 0, 1), (3, 1, 0, 0), (2, 0, 1, 1)),
    10: ((2, 1, 1, 0), (2, 1, 0, 1), (3, 1, 0, 0), (2, 0, 1, 1)),
    11: ((2, 1, 1, 0), (2, 1, 0, 1), (3, 1, 0, 0), (2, 0, 1, 1)),
    12: ((2, 1, 1, 0), (2, 1, 0, 1), (3, 1, 0, 0), (2, 0, 1, 1)),
}


def validate_composition(player_count: int, settings: Settings) -> None:
    counts = (settings.undercover_count, settings.mr_white_count, settings.jester_count, settings.bodyguard_count)
    if not 3 <= player_count <= 12 or any(count < 0 for count in counts):
        raise ValueError("Invalid game composition")
    if settings.undercover_count < 1 or settings.bodyguard_count > 1:
        raise ValueError("Invalid game composition")
    if sum(counts) > player_count - 2:
        raise ValueError("Special roles must leave two civilian-team players")
    if settings.composition_mode is CompositionMode.HIDDEN_RANDOM and counts not in RANDOM_COMPOSITIONS[player_count]:
        raise ValueError("Invalid hidden random composition")


def choose_random_composition(player_count: int) -> Settings:
    undercover, mr_white, jester, bodyguard = secrets.choice(RANDOM_COMPOSITIONS[player_count])
    return Settings(undercover, mr_white, jester, bodyguard, CompositionMode.HIDDEN_RANDOM)
