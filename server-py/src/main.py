"""Authoritative, member-filtered FastAPI routes."""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from dataclasses import replace
from typing import Any, Awaitable, Callable
from uuid import UUID

import asyncpg
import httpx
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .auth import AuthenticatedUser, JWKSVerifier, current_user
from .config import Settings, settings
from .game.assignment import assign_roles
from .game.composition import choose_random_composition
from .game.resolution import eliminate, resolve_mr_white_guess
from .game.types import CompositionMode, GamePhase, Settings as GameSettings, transition
from .game.views import game_view
from .game.voting import cast_vote, open_voting, resolve_vote
from .repositories.games import PostgresGameRepository
from .repositories.results import ResultsRepository
from .repositories.social import SocialRepository
from .repositories.testing import NotFoundError, TestingGameRepository
from .services.realtime_service import RealtimeService

logger = logging.getLogger(__name__)


class CreateGameRequest(BaseModel):
    language: str = Field(pattern="^(en|fr)$")
    display_name: str | None = Field(default=None, min_length=1, max_length=24, alias="displayName")

class JoinRequest(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=24, alias="displayName")


class SettingsRequest(BaseModel):
    undercover_count: int = Field(alias="undercoverCount", ge=0)
    mr_white_count: int = Field(alias="mrWhiteCount", ge=0)
    jester_count: int = Field(alias="jesterCount", ge=0)
    bodyguard_count: int = Field(alias="bodyguardCount", ge=0)
    composition_mode: CompositionMode = Field(alias="compositionMode")


class VoteRequest(BaseModel):
    target_player_id: str = Field(alias="targetPlayerId")


class GuessRequest(BaseModel):
    guess: str = Field(max_length=100)


class ProfileRequest(BaseModel):
    handle: str | None = Field(default=None, min_length=3, max_length=24, pattern=r"^[A-Za-z0-9_]+$")
    display_name: str | None = Field(default=None, min_length=1, max_length=24, alias="displayName")


def create_app(
    repository: Any | None = None,
    *,
    social_repository: Any | None = None,
    results_repository: Any | None = None,
    configuration: Settings = settings,
    pool_factory: Callable[[str], Awaitable[Any]] = asyncpg.create_pool,
    http_client: httpx.AsyncClient | None = None,
    realtime_service: Any | None = None,
) -> FastAPI:
    """Build an app with injectable dependencies; production resources are lifespan-owned."""

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        owns_http_client = http_client is None
        app.state.http_client = http_client or httpx.AsyncClient()
        app.state.pool = None
        try:
            if repository is None:
                if not configuration.database_url:
                    raise RuntimeError("DATABASE_URL is required for the production API")
                app.state.pool = await pool_factory(configuration.database_url)
                app.state.repository = PostgresGameRepository(app.state.pool)
                app.state.social_repository = social_repository or SocialRepository(app.state.pool)
                app.state.results_repository = results_repository or ResultsRepository(app.state.pool)
            else:
                app.state.repository = repository
                app.state.social_repository = social_repository or repository
                app.state.results_repository = results_repository or repository
            app.state.auth_verifier = JWKSVerifier(configuration, app.state.http_client)
            app.state.realtime = realtime_service or RealtimeService(
                app.state.http_client, configuration.supabase_url, configuration.supabase_secret_key
            )
            yield
        finally:
            if app.state.pool is not None:
                await app.state.pool.close()
            if owns_http_client:
                await app.state.http_client.aclose()

    app = FastAPI(title="Undercover API", lifespan=lifespan)
    if repository is not None:
        app.state.repository = repository
        app.state.social_repository = social_repository or repository
        app.state.results_repository = results_repository or repository
    app.state.realtime = realtime_service or RealtimeService(None, configuration.supabase_url, configuration.supabase_secret_key)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=configuration.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    def repo() -> Any:
        return app.state.repository

    def social() -> Any:
        return app.state.social_repository

    def results() -> Any:
        return app.state.results_repository

    async def member_game(room_code: str, user: AuthenticatedUser, repository: Any) -> tuple[Any, str]:
        try:
            return await repository.get_for_member(room_code, user.id), await repository.player_id_for_member(room_code, user.id)
        except NotFoundError as error:
            raise HTTPException(status_code=403, detail="Not a game member") from error

    def view(game: Any, player_id: str) -> dict[str, object]:
        return game_view(game, player_id, is_host=game.host_player_id == player_id)

    async def publish_committed(game: Any) -> None:
        try:
            await app.state.realtime.publish_game_changed(game.id, game.room_code, game.version)
        except Exception:
            logger.exception("Unable to publish committed game update")

    async def mutate_and_publish(
        repository: Any,
        room_code: str,
        user_id: UUID,
        action: Callable[[Any, str], Any],
        *,
        deactivate_player_id: str | None = None,
        retain_active_players: bool = False,
    ) -> tuple[Any, str]:
        try:
            player_id = await repository.player_id_for_member(room_code, user_id)
            game = await repository.mutate_game(
                room_code, user_id, action, deactivate_player_id=deactivate_player_id,
                retain_active_players=retain_active_players,
            )
        except PermissionError as error:
            raise HTTPException(status_code=403, detail=str(error)) from error
        except (NotFoundError, ValueError) as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        await publish_committed(game)
        return game, player_id

    def require_account(user: AuthenticatedUser) -> None:
        if user.is_anonymous:
            raise HTTPException(status_code=403, detail="An account is required")

    @app.post("/api/games")
    async def create_game(body: CreateGameRequest, user: AuthenticatedUser = Depends(current_user), repository: Any = Depends(repo)):
        if user.is_anonymous:
            if body.display_name is None:
                raise HTTPException(status_code=422, detail="Anonymous users require displayName")
        elif body.display_name is not None:
            raise HTTPException(status_code=422, detail="Authenticated users cannot supply displayName")
        game = await repository.create_game(user.id, body.language, body.display_name)
        return {"roomCode": game.room_code, "hostPlayerId": game.host_player_id}

    @app.post("/api/games/{room_code}/join")
    async def join_game(
        room_code: str,
        body: JoinRequest,
        user: AuthenticatedUser = Depends(current_user),
        repository: Any = Depends(repo),
        social_store: Any = Depends(social),
    ):
        if user.is_anonymous:
            if body.display_name is None:
                raise HTTPException(status_code=422, detail="Anonymous users require displayName")
            display_name = body.display_name
            avatar_url = None
        else:
            profile = await social_store.get_profile(user.id)
            display_name = str(profile["displayName"]) if profile else "Player"
            avatar_url = None if profile is None else profile["avatarUrl"]
        try:
            game = await repository.join_game(room_code, user.id, display_name, avatar_url)
            player_id = await repository.player_id_for_member(room_code, user.id)
        except (NotFoundError, ValueError) as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        await publish_committed(game)
        return {"game": view(game, player_id), "playerId": player_id}

    @app.get("/api/games/{room_code}")
    async def get_game(room_code: str, user: AuthenticatedUser = Depends(current_user), repository: Any = Depends(repo)):
        game, player_id = await member_game(room_code, user, repository)
        return view(game, player_id)

    @app.patch("/api/games/{room_code}/settings")
    async def update_settings(room_code: str, body: SettingsRequest, user: AuthenticatedUser = Depends(current_user), repository: Any = Depends(repo)):
        def action(game: Any, player_id: str) -> Any:
            if game.host_player_id != player_id:
                raise PermissionError("Host authorization required")
            if game.phase is not GamePhase.LOBBY:
                raise ValueError("Game is not in the lobby")
            game_settings = GameSettings(body.undercover_count, body.mr_white_count, body.jester_count, body.bodyguard_count, body.composition_mode)
            return transition(game, settings=game_settings)

        game, player_id = await mutate_and_publish(repository, room_code, user.id, action)
        return view(game, player_id)

    @app.post("/api/games/{room_code}/start")
    async def start(room_code: str, user: AuthenticatedUser = Depends(current_user), repository: Any = Depends(repo)):
        def action(game: Any, player_id: str) -> Any:
            if game.host_player_id != player_id:
                raise PermissionError("Host authorization required")
            if game.phase is not GamePhase.LOBBY:
                raise ValueError("Game is not in the lobby")
            prepared = replace(game, settings=choose_random_composition(len(game.players)) if game.settings.composition_mode is CompositionMode.HIDDEN_RANDOM else game.settings)
            return assign_roles(prepared)

        game, player_id = await mutate_and_publish(repository, room_code, user.id, action)
        return view(game, player_id)

    @app.post("/api/games/{room_code}/voting")
    async def voting(room_code: str, user: AuthenticatedUser = Depends(current_user), repository: Any = Depends(repo)):
        def action(game: Any, player_id: str) -> Any:
            if game.host_player_id != player_id:
                raise PermissionError("Host authorization required")
            return open_voting(game)

        game, player_id = await mutate_and_publish(repository, room_code, user.id, action)
        return view(game, player_id)

    @app.post("/api/games/{room_code}/vote")
    async def vote(room_code: str, body: VoteRequest, user: AuthenticatedUser = Depends(current_user), repository: Any = Depends(repo)):
        def action(game: Any, player_id: str) -> Any:
            updated = cast_vote(game, player_id, body.target_player_id)
            living = [player for player in updated.players if player.alive]
            return resolve_vote(updated)[0] if len(updated.votes) == len(living) else updated

        game, player_id = await mutate_and_publish(repository, room_code, user.id, action)
        return view(game, player_id)

    @app.post("/api/games/{room_code}/mr-white-guess")
    async def mr_white_guess(room_code: str, body: GuessRequest, user: AuthenticatedUser = Depends(current_user), repository: Any = Depends(repo)):
        def action(game: Any, player_id: str) -> Any:
            if game.pending_mr_white_id != player_id:
                raise PermissionError("Only the pending Mr. White may guess")
            return resolve_mr_white_guess(game, body.guess)[0]

        game, player_id = await mutate_and_publish(repository, room_code, user.id, action)
        return view(game, player_id)

    @app.delete("/api/games/{room_code}/members/{player_id}")
    async def kick_member(room_code: str, player_id: str, user: AuthenticatedUser = Depends(current_user), repository: Any = Depends(repo)):
        def action(game: Any, caller_id: str) -> Any:
            if game.host_player_id != caller_id:
                raise PermissionError("Host authorization required")
            return eliminate(game, player_id, "kick")[0]

        game, caller_id = await mutate_and_publish(repository, room_code, user.id, action, deactivate_player_id=player_id)
        return view(game, caller_id)

    @app.post("/api/games/{room_code}/leave")
    async def leave_game(room_code: str, user: AuthenticatedUser = Depends(current_user), repository: Any = Depends(repo)):
        game, caller_id = await member_game(room_code, user, repository)

        def action(current_game: Any, _: str) -> Any:
            if current_game.phase is GamePhase.LOBBY:
                raise ValueError("Leave is only available after the game starts")
            return eliminate(current_game, caller_id, "disconnect")[0]

        game, _ = await mutate_and_publish(repository, room_code, user.id, action, deactivate_player_id=caller_id)
        return view(game, caller_id)

    @app.post("/api/games/{room_code}/restart")
    async def restart(room_code: str, user: AuthenticatedUser = Depends(current_user), repository: Any = Depends(repo)):
        def action(game: Any, caller_id: str) -> Any:
            if game.host_player_id != caller_id:
                raise PermissionError("Host authorization required")
            if game.phase is not GamePhase.FINISHED:
                raise ValueError("Game is not finished")
            players = tuple(
                replace(player, role=None, alive=True, bodyguard_target_id=None)
                for player in game.players
            )
            return transition(game, phase=GamePhase.LOBBY, players=players, votes=(), pending_mr_white_id=None, winner=None)

        game, caller_id = await mutate_and_publish(repository, room_code, user.id, action, retain_active_players=True)
        return view(game, caller_id)

    @app.get("/api/me")
    async def get_me(user: AuthenticatedUser = Depends(current_user), repository: Any = Depends(social)):
        require_account(user)
        return await repository.get_profile(user.id)

    @app.patch("/api/me")
    async def update_me(body: ProfileRequest, user: AuthenticatedUser = Depends(current_user), repository: Any = Depends(social)):
        require_account(user)
        try:
            profile = await repository.update_profile(user.id, handle=body.handle, display_name=body.display_name)
        except ValueError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        if profile is None:
            raise HTTPException(status_code=404, detail="Profile not found")
        return profile

    @app.get("/api/users")
    async def users(query: str = Query(min_length=2, max_length=24), user: AuthenticatedUser = Depends(current_user), repository: Any = Depends(social)):
        require_account(user)
        return await repository.search_profiles(query, user.id)

    @app.get("/api/friends")
    async def friends(user: AuthenticatedUser = Depends(current_user), repository: Any = Depends(social)):
        require_account(user)
        return await repository.list_friendships(user.id)

    @app.post("/api/friends/{profile_id}")
    async def add_friend(profile_id: UUID, user: AuthenticatedUser = Depends(current_user), repository: Any = Depends(social)):
        require_account(user)
        try:
            return await repository.request_friendship(user.id, profile_id)
        except ValueError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error

    @app.post("/api/friends/{profile_id}/accept")
    async def accept_friend(profile_id: UUID, user: AuthenticatedUser = Depends(current_user), repository: Any = Depends(social)):
        require_account(user)
        try:
            return await repository.accept_friendship(user.id, profile_id)
        except PermissionError as error:
            raise HTTPException(status_code=403, detail=str(error)) from error
        except ValueError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error

    @app.delete("/api/friends/{profile_id}")
    async def delete_friend(profile_id: UUID, user: AuthenticatedUser = Depends(current_user), repository: Any = Depends(social)):
        require_account(user)
        try:
            await repository.delete_friendship(user.id, profile_id)
        except ValueError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        return {"ok": True}

    @app.get("/api/me/stats")
    async def stats(user: AuthenticatedUser = Depends(current_user), repository: Any = Depends(results)):
        require_account(user)
        return await repository.stats_for(user.id)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
