from dataclasses import replace

import pytest

from src.game.assignment import assign_roles
from src.game.composition import RANDOM_COMPOSITIONS, validate_composition
from src.game.resolution import resolve_mr_white_guess
from src.game.types import (
    CompositionMode,
    GamePhase,
    GameState,
    Player,
    PlayerRole,
    Settings,
    WordPair,
)
from src.game.voting import cast_vote, open_voting, resolve_vote


def state(*players: Player, settings: Settings | None = None) -> GameState:
    return GameState(
        id="game",
        room_code="ABC123",
        host_player_id="a",
        phase=GamePhase.PLAYING,
        players=players,
        settings=settings or Settings(undercover_count=1),
        word_pair=WordPair(civilian="cat", undercover="dog"),
    )


def test_jester_only_wins_when_completed_vote_eliminates_them() -> None:
    game = state(
        Player("a", "A", PlayerRole.CIVILIAN),
        Player("b", "B", PlayerRole.JESTER),
        Player("c", "C", PlayerRole.UNDERCOVER),
    )
    voting = open_voting(game)
    for voter in ("a", "b", "c"):
        voting = cast_vote(voting, voter, "b")
    resolved, outcome = resolve_vote(voting)

    assert resolved.phase is GamePhase.FINISHED
    assert outcome.winner == "jester"
    assert outcome.source == "vote"


@pytest.mark.parametrize("source", ["disconnect", "kick"])
def test_jester_does_not_win_when_kicked_or_disconnected(source: str) -> None:
    from src.game.resolution import eliminate

    game = state(
        Player("a", "A", PlayerRole.CIVILIAN),
        Player("b", "B", PlayerRole.JESTER),
        Player("c", "C", PlayerRole.UNDERCOVER),
    )
    resolved, outcome = eliminate(game, "b", source)

    assert outcome.winner != "jester"
    assert resolved.winner != "jester"


def test_voted_mr_white_correct_guess_wins() -> None:
    game = state(
        Player("a", "A", PlayerRole.CIVILIAN),
        Player("b", "B", PlayerRole.MR_WHITE),
        Player("c", "C", PlayerRole.UNDERCOVER),
    )
    voting = open_voting(game)
    for voter in ("a", "b", "c"):
        voting = cast_vote(voting, voter, "b")
    pending, _ = resolve_vote(voting)
    resolved, outcome = resolve_mr_white_guess(pending, "  CAT ")

    assert resolved.phase is GamePhase.FINISHED
    assert outcome.winner == "mr_white"


@pytest.mark.parametrize("guess", ["dog", ""])
def test_voted_mr_white_wrong_or_skip_is_eliminated(guess: str) -> None:
    game = state(
        Player("a", "A", PlayerRole.CIVILIAN),
        Player("b", "B", PlayerRole.MR_WHITE),
        Player("c", "C", PlayerRole.UNDERCOVER),
        Player("d", "D", PlayerRole.CIVILIAN),
    )
    voting = open_voting(game)
    for voter in ("a", "b", "c", "d"):
        voting = cast_vote(voting, voter, "b")
    pending, _ = resolve_vote(voting)
    resolved, outcome = resolve_mr_white_guess(pending, guess)

    assert not next(player for player in resolved.players if player.id == "b").alive
    assert outcome.source == "mr_white_wrong_or_skip"


def test_living_mr_white_wins_at_final_two() -> None:
    from src.game.resolution import check_victory

    game = state(
        Player("a", "A", PlayerRole.MR_WHITE),
        Player("b", "B", PlayerRole.CIVILIAN),
        Player("c", "C", PlayerRole.UNDERCOVER, alive=False),
    )
    assert check_victory(game) == "mr_white"


def test_civilians_win_without_undercover_or_mr_white_even_with_jester() -> None:
    from src.game.resolution import check_victory

    game = state(
        Player("a", "A", PlayerRole.CIVILIAN),
        Player("b", "B", PlayerRole.BODYGUARD),
        Player("c", "C", PlayerRole.JESTER),
    )
    assert check_victory(game) == "civilians"


def test_undercover_parity_depends_on_living_mr_white() -> None:
    from src.game.resolution import check_victory

    with_white = state(
        Player("a", "A", PlayerRole.UNDERCOVER),
        Player("b", "B", PlayerRole.CIVILIAN),
        Player("c", "C", PlayerRole.MR_WHITE),
    )
    without_white = replace(
        with_white,
        players=with_white.players[:2] + (replace(with_white.players[2], alive=False),),
    )
    assert check_victory(with_white) is None
    assert check_victory(without_white) == "undercovers"


def test_bodyguard_substitutes_once_for_vote_target() -> None:
    game = state(
        Player("a", "A", PlayerRole.CIVILIAN),
        Player("b", "B", PlayerRole.BODYGUARD, bodyguard_target_id="c"),
        Player("c", "C", PlayerRole.CIVILIAN),
        Player("d", "D", PlayerRole.UNDERCOVER),
    )
    voting = open_voting(game)
    for voter in ("a", "b", "c", "d"):
        voting = cast_vote(voting, voter, "c")
    resolved, outcome = resolve_vote(voting)

    assert not next(player for player in resolved.players if player.id == "b").alive
    assert next(player for player in resolved.players if player.id == "c").alive
    assert not resolved.protection_available
    assert outcome.source == "bodyguard_protection"


def test_vote_tie_resets_to_playing_without_elimination() -> None:
    game = state(
        Player("a", "A", PlayerRole.CIVILIAN),
        Player("b", "B", PlayerRole.CIVILIAN),
        Player("c", "C", PlayerRole.UNDERCOVER),
        Player("d", "D", PlayerRole.CIVILIAN),
    )
    voting = open_voting(game)
    for voter, target in (("a", "b"), ("b", "a"), ("c", "b"), ("d", "a")):
        voting = cast_vote(voting, voter, target)
    resolved, outcome = resolve_vote(voting)

    assert resolved.phase is GamePhase.PLAYING
    assert not resolved.votes
    assert all(player.alive for player in resolved.players)
    assert outcome.type == "tie"


def test_all_hidden_random_compositions_validate() -> None:
    for player_count, rows in RANDOM_COMPOSITIONS.items():
        for undercover, mr_white, jester, bodyguard in rows:
            validate_composition(
                player_count,
                Settings(
                    undercover_count=undercover,
                    mr_white_count=mr_white,
                    jester_count=jester,
                    bodyguard_count=bodyguard,
                    composition_mode=CompositionMode.HIDDEN_RANDOM,
                ),
            )


def test_assignment_has_no_first_player_mr_white_bias() -> None:
    game = state(
        Player("a", "A"),
        Player("b", "B"),
        Player("c", "C"),
        Player("d", "D"),
        settings=Settings(undercover_count=1, mr_white_count=1),
    )
    assigned = assign_roles(game, rng=__import__("random").Random(2))
    assert next(player for player in assigned.players if player.id == "a").role is PlayerRole.MR_WHITE
