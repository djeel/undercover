"""Immutable server-authoritative Undercover game model."""
from __future__ import annotations

from dataclasses import dataclass, field, replace
from enum import StrEnum
from typing import Literal


class GamePhase(StrEnum):
    LOBBY = "lobby"
    PLAYING = "playing"
    VOTING = "voting"
    MR_WHITE_GUESS = "mr_white_guess"
    FINISHED = "finished"


class PlayerRole(StrEnum):
    CIVILIAN = "civilian"
    UNDERCOVER = "undercover"
    MR_WHITE = "mr_white"
    JESTER = "jester"
    BODYGUARD = "bodyguard"


class CompositionMode(StrEnum):
    VISIBLE_MANUAL = "visible_manual"
    HIDDEN_MANUAL = "hidden_manual"
    HIDDEN_RANDOM = "hidden_random"


Winner = Literal["civilians", "undercovers", "mr_white", "jester"]
EliminationSource = Literal["vote", "mr_white_wrong_or_skip", "bodyguard_protection", "disconnect", "kick"]


@dataclass(frozen=True, slots=True)
class Settings:
    undercover_count: int = 1
    mr_white_count: int = 0
    jester_count: int = 0
    bodyguard_count: int = 0
    composition_mode: CompositionMode = CompositionMode.VISIBLE_MANUAL


@dataclass(frozen=True, slots=True)
class WordPair:
    civilian: str
    undercover: str


@dataclass(frozen=True, slots=True)
class Player:
    id: str
    display_name: str
    role: PlayerRole | None = None
    alive: bool = True
    user_id: str | None = None
    bodyguard_target_id: str | None = None
    avatar_url: str | None = None


@dataclass(frozen=True, slots=True)
class GameResolution:
    type: Literal["elimination", "tie", "mr_white_pending", "victory"]
    source: EliminationSource | None = None
    player_id: str | None = None
    winner: Winner | None = None


@dataclass(frozen=True, slots=True)
class GameState:
    id: str
    room_code: str
    host_player_id: str
    phase: GamePhase
    players: tuple[Player, ...]
    settings: Settings
    word_pair: WordPair | None = None
    votes: tuple[tuple[str, str], ...] = ()
    round: int = 0
    pending_mr_white_id: str | None = None
    protection_available: bool = True
    last_resolution: GameResolution | None = None
    winner: Winner | None = None
    language: str = "en"
    version: int = 1

    def player(self, player_id: str) -> Player:
        try:
            return next(player for player in self.players if player.id == player_id)
        except StopIteration as error:
            raise ValueError("Unknown player") from error

    def replace_player(self, changed: Player) -> GameState:
        return replace(self, players=tuple(changed if player.id == changed.id else player for player in self.players))


def transition(state: GameState, **changes: object) -> GameState:
    return replace(state, version=state.version + 1, **changes)
