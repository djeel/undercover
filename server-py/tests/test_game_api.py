from __future__ import annotations

import asyncio
import json
import time
import warnings

warnings.filterwarnings("ignore", category=DeprecationWarning, module="fastapi.testclient")

from dataclasses import dataclass, replace
from uuid import UUID, uuid4

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient

from src.auth import AuthenticatedUser, current_user
from src.config import Settings as ServerSettings
from src.game.types import GamePhase, transition
from src.main import create_app
from src.repositories.games import PostgresGameRepository, serialize_game
from src.data.seed_words import get_all_localized_pairs
from src.game.types import GameState, Player, PlayerRole, Settings, WordPair
from src.repositories.social import SocialRepository
from src.repositories.testing import TestingGameRepository


@dataclass(frozen=True)
class User:
    id: UUID
    anonymous: bool = False


def client_for(
    user: User,
    repository: TestingGameRepository,
    *,
    realtime_service: object | None = None,
    social_repository: object | None = None,
) -> TestClient:
    app = create_app(repository=repository, social_repository=social_repository, realtime_service=realtime_service)
    app.dependency_overrides[current_user] = lambda: AuthenticatedUser(user.id, user.anonymous)
    return TestClient(app)


def create_members(repository: TestingGameRepository, count: int = 6) -> tuple[User, list[str]]:
    host = User(uuid4())
    client = client_for(host, repository)
    game = client.post("/api/games", json={"language": "en"}).json()
    player_ids = [game["hostPlayerId"]]
    for number in range(1, count):
        user = User(uuid4(), anonymous=True)
        response = client_for(user, repository).post(f"/api/games/{game['roomCode']}/join", json={"displayName": f"Player {number}"})
        joined = response.json()
        assert joined["playerId"]
        assert "playerId" not in joined["game"]
        player_ids.append(joined["playerId"])
    return host, [game["roomCode"], *player_ids]


def test_api_requires_bearer_authentication() -> None:
    app = create_app(repository=TestingGameRepository())
    response = TestClient(app).post("/api/games", json={"language": "en"})
    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication required"}


def test_hidden_random_view_hides_counts_and_other_secrets_until_finished() -> None:
    repository = TestingGameRepository()
    host, values = create_members(repository)
    room_code, *player_ids = values
    host_client = client_for(host, repository)
    response = host_client.patch(f"/api/games/{room_code}/settings", json={"undercoverCount": 1, "mrWhiteCount": 1, "jesterCount": 1, "bodyguardCount": 0, "compositionMode": "hidden_random"})
    assert response.status_code == 200
    assert host_client.post(f"/api/games/{room_code}/start").status_code == 200

    host_view = host_client.get(f"/api/games/{room_code}").json()
    member_user_id = repository.user_for_player(room_code, player_ids[1])
    member_view = client_for(User(member_user_id), repository).get(f"/api/games/{room_code}").json()
    for view in (host_view, member_view):
        assert "settings" not in view
        assert view["composition"] == "hidden"
        assert all("role" not in player or player["id"] == next(p["id"] for p in view["players"] if "role" in p) for player in view["players"])
        assert "word" not in str([player for player in view["players"] if player["id"] != next(p["id"] for p in view["players"] if "role" in p)])


def test_finished_game_reveals_counts_words_roles_and_records_results() -> None:
    repository = TestingGameRepository()
    host, values = create_members(repository, 3)
    room_code, *player_ids = values
    client = client_for(host, repository)
    assert client.post(f"/api/games/{room_code}/start").status_code == 200
    assert client.post(f"/api/games/{room_code}/voting").status_code == 200
    for player_id in player_ids:
        assert client.post(f"/api/games/{room_code}/vote", json={"targetPlayerId": player_ids[1]}).status_code in {200, 403}
        break
    # Force a legal completed vote through the repository-level member identities.
    for player_id in player_ids[1:]:
        user_id = repository.user_for_player(room_code, player_id)
        assert client_for(User(user_id), repository).post(f"/api/games/{room_code}/vote", json={"targetPlayerId": player_ids[1]}).status_code == 200
    view = client.get(f"/api/games/{room_code}").json()
    assert view["phase"] == "finished"
    assert "settings" in view
    assert all("role" in player for player in view["players"])
    assert len(repository.results_for(room_code)) == 3


def test_current_user_verifies_jwks_jwt_once_and_reuses_cached_key() -> None:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(private_key.public_key()))
    public_jwk["kid"] = "current"
    user_id = uuid4()
    issuer = "https://project.supabase.co/auth/v1"
    token = jwt.encode(
        {"sub": str(user_id), "iss": issuer, "aud": "authenticated", "exp": time.time() + 60, "is_anonymous": True},
        private_key,
        algorithm="RS256",
        headers={"kid": "current"},
    )
    requests: list[str] = []

    def jwks(request: httpx.Request) -> httpx.Response:
        requests.append(str(request.url))
        return httpx.Response(200, json={"keys": [public_jwk]})

    config = ServerSettings(SUPABASE_URL="https://project.supabase.co", SUPABASE_JWT_AUDIENCE="authenticated")
    repository = TestingGameRepository()
    app = create_app(
        repository=repository,
        configuration=config,
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(jwks)),
    )
    headers = {"Authorization": f"Bearer {token}"}
    with TestClient(app) as client:
        created = client.post("/api/games", json={"language": "en", "displayName": "Anonymous Host"}, headers=headers)
        assert created.status_code == 200
        assert client.get(f"/api/games/{created.json()['roomCode']}", headers=headers).status_code == 200
    assert requests == ["https://project.supabase.co/auth/v1/.well-known/jwks.json"]


def test_invalid_bearer_token_has_exact_authentication_response() -> None:
    app = create_app(repository=TestingGameRepository())
    response = TestClient(app).post("/api/games", json={"language": "en"}, headers={"Authorization": "Bearer malformed"})
    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication required"}


def test_current_user_rejects_an_expired_but_correctly_signed_jwt() -> None:
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    public_jwk = json.loads(jwt.algorithms.RSAAlgorithm.to_jwk(private_key.public_key()))
    public_jwk["kid"] = "current"
    token = jwt.encode(
        {"sub": str(uuid4()), "iss": "https://project.supabase.co/auth/v1", "aud": "authenticated", "exp": time.time() - 1},
        private_key,
        algorithm="RS256",
        headers={"kid": "current"},
    )
    configuration = ServerSettings(SUPABASE_URL="https://project.supabase.co", SUPABASE_JWT_AUDIENCE="authenticated")
    app = create_app(
        repository=TestingGameRepository(),
        configuration=configuration,
        http_client=httpx.AsyncClient(transport=httpx.MockTransport(lambda _: httpx.Response(200, json={"keys": [public_jwk]}))),
    )
    with TestClient(app) as client:
        response = client.post("/api/games", json={"language": "en"}, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication required"}


def test_lifespan_registers_and_closes_shared_postgres_pool() -> None:
    class Pool:
        closed = False

        async def close(self) -> None:
            self.closed = True

    pool = Pool()
    calls: list[str] = []

    async def pool_factory(dsn: str) -> Pool:
        calls.append(dsn)
        return pool

    config = ServerSettings(DATABASE_URL="postgresql://undercover", SUPABASE_URL="https://project.supabase.co")
    app = create_app(configuration=config, pool_factory=pool_factory)
    with TestClient(app):
        assert calls == ["postgresql://undercover"]
        assert app.state.pool is pool
        assert isinstance(app.state.repository, PostgresGameRepository)
        assert app.state.repository.pool is pool
        assert app.state.realtime.http_client is app.state.http_client
    assert pool.closed


@pytest.mark.parametrize(
    ("method", "path", "payload"),
    [
        ("POST", "/api/games", {"language": "en"}),
        ("POST", "/api/games/ABC123/join", {"displayName": "Player"}),
        ("GET", "/api/games/ABC123", None),
        ("PATCH", "/api/games/ABC123/settings", {"undercoverCount": 1, "mrWhiteCount": 0, "jesterCount": 0, "bodyguardCount": 0, "compositionMode": "visible_manual"}),
        ("POST", "/api/games/ABC123/start", None),
        ("POST", "/api/games/ABC123/voting", None),
        ("POST", "/api/games/ABC123/vote", {"targetPlayerId": "player"}),
        ("POST", "/api/games/ABC123/mr-white-guess", {"guess": "word"}),
        ("POST", "/api/games/ABC123/leave", None),
        ("POST", "/api/games/ABC123/restart", None),
        ("DELETE", "/api/games/ABC123/members/player", None),
        ("GET", "/api/me", None),
        ("PATCH", "/api/me", {"handle": "player", "displayName": "Player"}),
        ("GET", "/api/users?query=pl", None),
        ("GET", "/api/friends", None),
        ("POST", f"/api/friends/{uuid4()}", None),
        ("POST", f"/api/friends/{uuid4()}/accept", None),
        ("DELETE", f"/api/friends/{uuid4()}", None),
        ("GET", "/api/me/stats", None),
    ],
)
def test_every_published_api_route_requires_authentication(method: str, path: str, payload: dict[str, object] | None) -> None:
    response = TestClient(create_app(repository=TestingGameRepository())).request(method, path, json=payload)
    assert response.status_code == 401
    assert response.json() == {"detail": "Authentication required"}


def test_postgres_repository_deserializes_locked_state_and_replaces_it_once() -> None:
    user_id = uuid4()
    game_id = str(uuid4())
    player_id = "host"
    persisted_state = {
        "id": game_id,
        "roomCode": "ABC123",
        "hostPlayerId": player_id,
        "phase": "lobby",
        "players": [{"id": player_id, "displayName": "Host", "alive": True, "userId": str(user_id)}],
        "settings": {"undercoverCount": 1, "mrWhiteCount": 0, "jesterCount": 0, "bodyguardCount": 0, "compositionMode": "visible_manual"},
        "wordPair": {"civilian": "cat", "undercover": "dog"},
        "votes": [],
        "round": 0,
        "pendingMrWhiteId": None,
        "protectionAvailable": True,
        "lastResolution": None,
        "winner": None,
        "language": "en",
    }

    class Transaction:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return False

    class Connection:
        def __init__(self) -> None:
            self.queries: list[str] = []
            self.update_args: tuple[object, ...] | None = None

        def transaction(self) -> Transaction:
            return Transaction()

        async def fetchrow(self, query: str, *_args):
            self.queries.append(query)
            return {"id": game_id, "room_code": "ABC123", "state": persisted_state, "version": 8, "player_id": player_id}

        async def execute(self, query: str, *args: object) -> str:
            self.queries.append(query)
            self.update_args = args
            return "UPDATE 1"

    class Acquire:
        def __init__(self, connection: Connection) -> None:
            self.connection = connection

        async def __aenter__(self) -> Connection:
            return self.connection

        async def __aexit__(self, *_args):
            return False

    connection = Connection()

    class Pool:
        def acquire(self) -> Acquire:
            return Acquire(connection)

    updated = asyncio.run(
        PostgresGameRepository(Pool()).mutate_game(
            "ABC123",
            user_id,
            lambda game, member_id: transition(game, phase=GamePhase.PLAYING) if member_id == player_id else game,
        )
    )
    assert updated.phase is GamePhase.PLAYING
    assert updated.version == 9
    assert "FOR UPDATE" in connection.queries[0]
    assert "version = version + 1" in connection.queries[-1]
    assert json.loads(connection.update_args[0])["version"] == 9


def test_mutations_publish_only_after_commit_and_survive_publish_failure() -> None:
    class Realtime:
        def __init__(self, repository: TestingGameRepository, fail: bool = False) -> None:
            self.repository = repository
            self.fail = fail
            self.calls: list[tuple[str, str, int]] = []

        async def publish_game_changed(self, game_id: str, room_code: str, version: int) -> None:
            assert self.repository.games[room_code].version == version
            self.calls.append((game_id, room_code, version))
            if self.fail:
                raise RuntimeError("Realtime unavailable")

    repository = TestingGameRepository()
    host = User(uuid4())
    realtime = Realtime(repository, fail=True)
    client = client_for(host, repository, realtime_service=realtime)
    created = client.post("/api/games", json={"language": "en"}).json()
    response = client.patch(
        f"/api/games/{created['roomCode']}/settings",
        json={"undercoverCount": 1, "mrWhiteCount": 0, "jesterCount": 0, "bodyguardCount": 0, "compositionMode": "visible_manual"},
    )
    assert response.status_code == 200
    assert realtime.calls == [(response.json()["id"], created["roomCode"], response.json()["version"])]


def test_postgres_finish_writes_result_and_stat_rows_in_the_same_transaction() -> None:
    user_id = uuid4()
    game_id = uuid4()
    state = {
        "id": str(game_id), "roomCode": "ABC123", "hostPlayerId": "host", "phase": "playing",
        "players": [{"id": "host", "displayName": "Host", "role": "civilian", "alive": True, "userId": str(user_id)}],
        "settings": {"undercoverCount": 1, "mrWhiteCount": 0, "jesterCount": 0, "bodyguardCount": 0, "compositionMode": "visible_manual"},
        "wordPair": {"civilian": "cat", "undercover": "dog"}, "votes": [], "round": 1,
        "pendingMrWhiteId": None, "protectionAvailable": True, "lastResolution": None, "winner": None, "language": "en",
    }

    class Transaction:
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return False

    class Connection:
        def __init__(self): self.executed: list[str] = []
        def transaction(self): return Transaction()
        async def fetchrow(self, *_): return {"id": game_id, "state": state, "version": 3, "player_id": "host"}
        async def execute(self, query: str, *_):
            self.executed.append(query)
            return "INSERT 0 1" if "INSERT INTO game_results" in query else "UPDATE 1"

    connection = Connection()

    class Acquire:
        async def __aenter__(self): return connection
        async def __aexit__(self, *_): return False

    class Pool:
        def acquire(self): return Acquire()

    updated = asyncio.run(PostgresGameRepository(Pool()).mutate_game("ABC123", user_id, lambda game, _: transition(game, phase=GamePhase.FINISHED, winner="civilians")))
    assert updated.version == 4
    assert any("INSERT INTO game_results" in query for query in connection.executed)
    assert any("INSERT INTO player_stats" in query for query in connection.executed)
    assert any("INSERT INTO player_role_stats" in query for query in connection.executed)


def test_leave_and_kick_deactivate_the_member_after_committing_game_state() -> None:
    repository = TestingGameRepository()
    host, values = create_members(repository, 3)
    room_code, _, player_id, *_ = values
    host_client = client_for(host, repository)
    leaving_user_id = repository.user_for_player(room_code, player_id)
    leaving_client = client_for(User(leaving_user_id), repository)
    assert host_client.post(f"/api/games/{room_code}/start").status_code == 200
    assert leaving_client.post(f"/api/games/{room_code}/leave").status_code == 200
    assert leaving_client.get(f"/api/games/{room_code}").status_code == 403

    repository = TestingGameRepository()
    host, values = create_members(repository, 3)
    room_code, _, player_id, *_ = values
    host_client = client_for(host, repository)
    kicked_user_id = repository.user_for_player(room_code, player_id)
    kicked_client = client_for(User(kicked_user_id), repository)
    assert host_client.post(f"/api/games/{room_code}/start").status_code == 200
    assert host_client.delete(f"/api/games/{room_code}/members/{player_id}").status_code == 200
    assert kicked_client.get(f"/api/games/{room_code}").status_code == 403


def test_leave_deactivates_membership_before_publishing() -> None:
    class Realtime:
        def __init__(self, repository: TestingGameRepository, user_id: UUID, room_code: str) -> None:
            self.repository = repository
            self.user_id = user_id
            self.room_code = room_code
            self.called = False

        async def publish_game_changed(self, *_args: object) -> None:
            assert (self.room_code, self.user_id) not in self.repository.members
            self.called = True

    repository = TestingGameRepository()
    host, values = create_members(repository, 3)
    room_code, _, player_id, *_ = values
    leaving_user_id = repository.user_for_player(room_code, player_id)
    realtime = Realtime(repository, leaving_user_id, room_code)
    host_client = client_for(host, repository)
    leaving_client = client_for(User(leaving_user_id), repository, realtime_service=realtime)
    assert host_client.post(f"/api/games/{room_code}/start").status_code == 200
    assert leaving_client.post(f"/api/games/{room_code}/leave").status_code == 200
    assert realtime.called



def test_unknown_vote_and_kick_target_are_illegal_state_conflicts() -> None:
    repository = TestingGameRepository()
    host, values = create_members(repository, 3)
    room_code, *_ = values
    client = client_for(host, repository)
    assert client.post(f"/api/games/{room_code}/start").status_code == 200
    assert client.post(f"/api/games/{room_code}/voting").status_code == 200
    assert client.post(f"/api/games/{room_code}/vote", json={"targetPlayerId": "missing"}).status_code == 409
    assert client.delete(f"/api/games/{room_code}/members/missing").status_code == 409

def test_profile_friendship_and_stats_routes_follow_social_contract() -> None:
    repository = TestingGameRepository()
    first, second = User(uuid4()), User(uuid4())
    first_client = client_for(first, repository)
    second_client = client_for(second, repository)
    assert second_client.get("/api/me").status_code == 200
    profile = first_client.patch("/api/me", json={"handle": "hostplayer", "displayName": "Host Player"})
    assert profile.status_code == 200
    assert first_client.patch("/api/me", json={"handle": "x", "displayName": "Host Player"}).status_code == 422
    assert second_client.get("/api/users?query=host").json() == [profile.json()]
    assert first_client.post(f"/api/friends/{second.id}").status_code == 200
    assert first_client.post(f"/api/friends/{second.id}").status_code == 409
    assert first_client.post(f"/api/friends/{second.id}/accept").status_code == 403
    assert second_client.post(f"/api/friends/{first.id}/accept").status_code == 200
    friendships = first_client.get("/api/friends")
    assert friendships.status_code == 200
    assert friendships.json()[0]["status"] == "accepted"
    stats = first_client.get("/api/me/stats")
    assert stats.status_code == 200
    assert stats.json() == {"gamesPlayed": 0, "gamesWon": 0, "gamesLost": 0, "currentWinStreak": 0, "bestWinStreak": 0, "roles": [], "results": []}


def test_join_uses_the_authenticated_profile_display_name_when_omitted() -> None:
    repository = TestingGameRepository()
    host, values = create_members(repository, 1)
    room_code = values[0]
    member = User(uuid4())
    member_client = client_for(member, repository)
    assert member_client.patch("/api/me", json={"handle": "member", "displayName": "Member Name"}).status_code == 200
    joined = member_client.post(f"/api/games/{room_code}/join", json={})
    assert joined.status_code == 200
    assert any(player["displayName"] == "Member Name" for player in joined.json()["game"]["players"])



def test_authenticated_join_snapshots_profile_avatar_on_canonical_player() -> None:
    repository = TestingGameRepository()
    host, values = create_members(repository, 1)
    room_code = values[0]
    member = User(uuid4())
    repository.profiles[member.id] = {
        "id": str(member.id),
        "handle": "member",
        "displayName": "Member Name",
        "avatarUrl": "https://example.test/member-avatar.png",
    }

    joined = client_for(member, repository).post(f"/api/games/{room_code}/join", json={})

    assert joined.status_code == 200
    joined_player = next(player for player in joined.json()["game"]["players"] if player["displayName"] == "Member Name")
    assert joined_player["avatarUrl"] == "https://example.test/member-avatar.png"
    canonical = next(player for player in repository.games[room_code].players if player.id == joined_player["id"])
    assert canonical.avatar_url == "https://example.test/member-avatar.png"

def test_join_returns_authoritative_caller_player_id_outside_the_member_filtered_view() -> None:
    repository = TestingGameRepository()
    host, values = create_members(repository, 1)
    room_code = values[0]
    member = User(uuid4(), anonymous=True)

    joined = client_for(member, repository).post(f"/api/games/{room_code}/join", json={"displayName": "Member"})

    assert joined.status_code == 200
    payload = joined.json()
    assert payload["playerId"] == repository.members[(room_code, member.id)]
    assert "playerId" not in payload["game"]
    assert any(player["id"] == payload["playerId"] for player in payload["game"]["players"])


def test_restart_excludes_departed_members_before_resolving_the_next_vote() -> None:
    repository = TestingGameRepository()
    host, values = create_members(repository, 4)
    room_code, host_player_id, departed_player_id, active_player_id, second_active_player_id = values
    host_client = client_for(host, repository)
    departed_user_id = repository.user_for_player(room_code, departed_player_id)

    assert host_client.post(f"/api/games/{room_code}/start").status_code == 200
    assert client_for(User(departed_user_id), repository).post(f"/api/games/{room_code}/leave").status_code == 200
    repository.games[room_code] = transition(repository.games[room_code], phase=GamePhase.FINISHED)

    restarted = host_client.post(f"/api/games/{room_code}/restart")
    assert restarted.status_code == 200
    assert {player["id"] for player in restarted.json()["players"]} == {host_player_id, active_player_id, second_active_player_id}
    assert client_for(User(departed_user_id), repository).get(f"/api/games/{room_code}").status_code == 403

    assert host_client.post(f"/api/games/{room_code}/start").status_code == 200
    assert host_client.post(f"/api/games/{room_code}/voting").status_code == 200
    assert host_client.post(f"/api/games/{room_code}/vote", json={"targetPlayerId": active_player_id}).status_code == 200
    active_user_id = repository.user_for_player(room_code, active_player_id)
    assert client_for(User(active_user_id, anonymous=True), repository).post(
        f"/api/games/{room_code}/vote", json={"targetPlayerId": host_player_id}
    ).status_code == 200
    second_active_user_id = repository.user_for_player(room_code, second_active_player_id)
    resolved = client_for(User(second_active_user_id, anonymous=True), repository).post(
        f"/api/games/{room_code}/vote", json={"targetPlayerId": host_player_id}
    )
    assert resolved.status_code == 200
    assert resolved.json()["phase"] != "voting"


def test_anonymous_create_requires_and_snapshots_an_explicit_display_name() -> None:
    repository = TestingGameRepository()
    anonymous = User(uuid4(), anonymous=True)
    client = client_for(anonymous, repository)

    assert client.post("/api/games", json={"language": "en"}).status_code == 422
    created = client.post("/api/games", json={"language": "en", "displayName": "Table Host"})

    assert created.status_code == 200
    game = repository.games[created.json()["roomCode"]]
    assert game.players[0].display_name == "Table Host"
    assert game.players[0].avatar_url is None


def test_authenticated_create_rejects_a_client_supplied_display_name() -> None:
    response = client_for(User(uuid4()), TestingGameRepository()).post(
        "/api/games", json={"language": "en", "displayName": "Spoofed Name"}
    )

    assert response.status_code == 422


def test_postgres_join_snapshots_profile_avatar_in_state_and_membership() -> None:
    host_id, member_id = uuid4(), uuid4()
    game = GameState(
        id=str(uuid4()), room_code="ABC123", host_player_id="host", phase=GamePhase.LOBBY,
        players=(Player("host", "Host", user_id=str(host_id)),), settings=Settings(), word_pair=WordPair("cat", "dog"),
    )

    class Transaction:
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return False

    class Connection:
        def __init__(self) -> None:
            self.executed: list[tuple[str, tuple[object, ...]]] = []

        def transaction(self) -> Transaction:
            return Transaction()

        async def fetchrow(self, query: str, *_args: object):
            return {"id": UUID(game.id), "state": json.dumps(serialize_game(game)), "version": game.version}

        async def fetchval(self, *_args: object):
            return None

        async def execute(self, query: str, *args: object) -> str:
            self.executed.append((query, args))
            return "INSERT 0 1"

    class Acquire:
        async def __aenter__(self): return connection
        async def __aexit__(self, *_): return False

    class Pool:
        def acquire(self): return Acquire()

    connection = Connection()
    joined = asyncio.run(
        PostgresGameRepository(Pool()).join_game("ABC123", member_id, "Member Name", "https://example.test/member-avatar.png")
    )

    player = joined.players[-1]
    assert player.avatar_url == "https://example.test/member-avatar.png"
    member_args = next(args for query, args in connection.executed if "INSERT INTO game_members" in query)
    assert member_args[-1] == "https://example.test/member-avatar.png"



def test_postgres_join_rejects_a_departed_member_before_insert() -> None:
    host_id, departed_user_id = uuid4(), uuid4()
    game = GameState(
        id=str(uuid4()), room_code="ABC123", host_player_id="host", phase=GamePhase.LOBBY,
        players=(Player("host", "Host", user_id=str(host_id)),), settings=Settings(), word_pair=WordPair("cat", "dog"),
    )

    class Transaction:
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return False

    class Connection:
        def __init__(self) -> None:
            self.inserted_member = False

        def transaction(self) -> Transaction:
            return Transaction()

        async def fetchrow(self, _query: str, *_args: object):
            return {"id": UUID(game.id), "state": json.dumps(serialize_game(game)), "version": game.version}

        async def fetchval(self, query: str, *_args: object):
            assert "left_at" not in query
            return 1  # The matching membership row is departed (left_at is set).

        async def execute(self, query: str, *_args: object) -> str:
            if "INSERT INTO game_members" in query:
                self.inserted_member = True
            return "INSERT 0 1"

    class Acquire:
        async def __aenter__(self): return connection
        async def __aexit__(self, *_): return False

    class Pool:
        def acquire(self): return Acquire()

    connection = Connection()
    with pytest.raises(ValueError, match="Already a game member"):
        asyncio.run(PostgresGameRepository(Pool()).join_game("ABC123", departed_user_id, "Returned Member"))

    assert not connection.inserted_member


def test_postgres_restart_prunes_only_inactive_members_inside_the_mutation() -> None:
    host_id = uuid4()
    game = GameState(
        id=str(uuid4()), room_code="ABC123", host_player_id="host", phase=GamePhase.FINISHED,
        players=(Player("host", "Host", user_id=str(host_id), alive=False), Player("departed", "Departed", alive=False)),
        settings=Settings(), word_pair=WordPair("cat", "dog"),
    )

    class Transaction:
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return False

    class Connection:
        def transaction(self) -> Transaction:
            return Transaction()

        async def fetchrow(self, *_args: object):
            return {"id": UUID(game.id), "room_code": game.room_code, "state": json.dumps(serialize_game(game)), "version": game.version, "player_id": "host"}

        async def fetch(self, query: str, *_args: object):
            if "SELECT player_id::text" in query:
                return [{"player_id": "host"}]
            return []

        async def execute(self, *_args: object) -> str:
            return "UPDATE 1"

    class Acquire:
        async def __aenter__(self): return connection
        async def __aexit__(self, *_): return False

    class Pool:
        def acquire(self): return Acquire()

    connection = Connection()
    restarted = asyncio.run(
        PostgresGameRepository(Pool()).mutate_game(
            "ABC123", host_id,
            lambda state, _: transition(state, phase=GamePhase.LOBBY, players=tuple(replace(player, alive=True) for player in state.players)),
            retain_active_players=True,
        )
    )

    assert restarted.players == (Player("host", "Host", user_id=str(host_id)),)

def test_postgres_create_game_snapshots_creator_profile_and_uses_a_localized_seed_pair() -> None:
    user_id = uuid4()

    class Transaction:
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return False

    class Connection:
        def __init__(self) -> None:
            self.executed: list[tuple[str, tuple[object, ...]]] = []

        def transaction(self) -> Transaction:
            return Transaction()

        async def fetchrow(self, query: str, *_args: object):
            assert "FROM profiles" in query
            return {"display_name": "Créatrice", "avatar_url": "https://example.test/avatar.png"}

        async def execute(self, query: str, *args: object) -> str:
            self.executed.append((query, args))
            return "INSERT 0 1"

    class Acquire:
        async def __aenter__(self): return connection
        async def __aexit__(self, *_): return False

    class Pool:
        def acquire(self): return Acquire()

    connection = Connection()
    game = asyncio.run(PostgresGameRepository(Pool()).create_game(user_id, "fr"))

    assert game.players[0].display_name == "Créatrice"
    assert game.players[0].avatar_url == "https://example.test/avatar.png"
    assert (game.word_pair.civilian, game.word_pair.undercover) in [pair.fr for pair in get_all_localized_pairs()]
    game_state = json.loads(next(args[6] for query, args in connection.executed if "INSERT INTO games" in query))
    member_args = next(args for query, args in connection.executed if "INSERT INTO game_members" in query)
    assert game_state["players"][0] == {
        "id": game.host_player_id,
        "displayName": "Créatrice",
        "role": None,
        "alive": True,
        "userId": str(user_id),
        "bodyguardTargetId": None,
        "avatarUrl": "https://example.test/avatar.png",
    }
    assert member_args[-1] == "https://example.test/avatar.png"

def test_postgres_create_game_snapshots_anonymous_name_without_profile_avatar() -> None:
    user_id = uuid4()

    class Transaction:
        async def __aenter__(self): return self
        async def __aexit__(self, *_): return False

    class Connection:
        def __init__(self) -> None:
            self.executed: list[tuple[str, tuple[object, ...]]] = []
            self.profile_reads = 0

        def transaction(self) -> Transaction:
            return Transaction()

        async def fetchrow(self, query: str, *_args: object):
            self.profile_reads += 1
            assert "FROM profiles" in query
            return {"display_name": "Profile Host", "avatar_url": "https://example.test/profile-avatar.png"}

        async def execute(self, query: str, *args: object) -> str:
            self.executed.append((query, args))
            return "INSERT 0 1"

    class Acquire:
        async def __aenter__(self): return connection
        async def __aexit__(self, *_): return False

    class Pool:
        def acquire(self): return Acquire()

    connection = Connection()
    game = asyncio.run(PostgresGameRepository(Pool()).create_game(user_id, "en", "Anonymous Host"))

    assert game.players[0].display_name == "Anonymous Host"
    assert game.players[0].avatar_url is None
    game_state = json.loads(next(args[6] for query, args in connection.executed if "INSERT INTO games" in query))
    member_args = next(args for query, args in connection.executed if "INSERT INTO game_members" in query)
    assert game_state["players"][0]["displayName"] == "Anonymous Host"
    assert game_state["players"][0]["avatarUrl"] is None
    assert member_args[-2:] == ("Anonymous Host", None)
    assert connection.profile_reads == 0


def test_postgres_results_aggregate_only_when_the_result_row_is_new() -> None:
    user_id = uuid4()
    game = GameState(
        id=str(uuid4()), room_code="ABC123", host_player_id="host", phase=GamePhase.FINISHED,
        players=(Player("host", "Host", role=PlayerRole.CIVILIAN, user_id=str(user_id)),),
        settings=Settings(), word_pair=WordPair("cat", "dog"), winner="civilians",
    )

    class Connection:
        def __init__(self) -> None:
            self.result_inserts = 0
            self.aggregates: list[str] = []

        async def execute(self, query: str, *_args: object) -> str:
            if "INSERT INTO game_results" in query:
                self.result_inserts += 1
                return "INSERT 0 1" if self.result_inserts == 1 else "INSERT 0 0"
            self.aggregates.append(query)
            return "INSERT 0 1"

    connection = Connection()
    repository = PostgresGameRepository(object())
    asyncio.run(repository._record_results(connection, UUID(game.id), game))
    asyncio.run(repository._record_results(connection, UUID(game.id), game))

    assert connection.result_inserts == 2
    assert len([query for query in connection.aggregates if "INSERT INTO player_stats" in query]) == 1
    assert len([query for query in connection.aggregates if "INSERT INTO player_role_stats" in query]) == 1


@pytest.mark.parametrize(
    ("operation", "expected_message"),
    [
        (lambda client, profile_id: client.patch("/api/me", json={"handle": "duplicate", "displayName": "Player"}), "Handle is already taken"),
        (lambda client, profile_id: client.post(f"/api/friends/{profile_id}"), "Friendship already exists"),
    ],
)
def test_postgres_unique_conflicts_become_social_route_conflicts(operation, expected_message: str) -> None:
    class UniqueViolation(Exception):
        sqlstate = "23505"

    class Connection:
        async def fetchrow(self, *_args: object):
            raise UniqueViolation()

    class Acquire:
        async def __aenter__(self): return Connection()
        async def __aexit__(self, *_): return False

    class Pool:
        def acquire(self): return Acquire()

    repository = TestingGameRepository()
    response = operation(
        client_for(User(uuid4()), repository, social_repository=SocialRepository(Pool())),
        uuid4(),
    )
    assert response.status_code == 409
    assert response.json() == {"detail": expected_message}
