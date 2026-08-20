# Undercover FastAPI Backend

Authoritative game API for Undercover: FastAPI + asyncpg (Postgres) + Supabase JWT auth, with a private Supabase Realtime broadcast after every committed mutation.

## Stack

- **FastAPI** routes under `/api`; Pydantic request/response contracts
- **asyncpg** Postgres pool, lifespan-managed
- **PyJWT** Bearer-token verification against a cached Supabase JWKS (issuer, audience, signature, expiry)
- **httpx** for JWKS fetch and Supabase Realtime broadcast publishing
- Pure game-rules modules under `src/game/` (composition, assignment, voting, resolution, views)

## Setup

```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -e ".[dev]"

# Copy environment template and fill in your values
cp .env.example .env

# Run the server
uvicorn src.main:app --reload --port 8000
```

The production API requires Postgres (Supabase) and refuses to start without `DATABASE_URL`. Tests run against a deterministic in-memory repository (`src/repositories/testing.py`) — no database needed.

## Environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase Postgres DSN (asyncpg pool) |
| `SUPABASE_URL` | Supabase project URL (JWKS issuer, Realtime broadcast target) |
| `SUPABASE_SECRET_KEY` | Supabase secret key — server only, never exposed to clients |
| `SUPABASE_JWT_AUDIENCE` | JWT audience, default `authenticated` |
| `CORS_ORIGINS` | JSON list of allowed origins (e.g. `["http://localhost:5173"]`) |

## Authentication

- Every route except `/health` requires `Authorization: Bearer <access token>`.
- Tokens are Supabase JWTs validated against the project's cached JWKS; missing or invalid tokens return `401 {"detail":"Authentication required"}`.
- Identity comes only from the validated token claims (`sub`, `is_anonymous`) — never from request bodies or headers.
- Anonymous Supabase users may play games; the social endpoints (`/api/me`, `/api/users`, `/api/friends`, `/api/me/stats`) require a non-anonymous account (403).

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/games` | Create a game (host is a member); returns `{roomCode, hostPlayerId}` |
| POST | `/api/games/{roomCode}/join` | Join the lobby; returns `{game, playerId}` where `game` is member-filtered and anonymous users must send `displayName` |
| GET | `/api/games/{roomCode}` | Member-filtered game view for the caller |
| PATCH | `/api/games/{roomCode}/settings` | Host-only lobby settings (role counts, composition mode) |
| POST | `/api/games/{roomCode}/start` | Host-only; assigns composition, roles, words, bodyguard target |
| POST | `/api/games/{roomCode}/voting` | Host-only; opens a voting round |
| POST | `/api/games/{roomCode}/vote` | Cast one vote per living player |
| POST | `/api/games/{roomCode}/mr-white-guess` | Pending Mr. White submits their guess (the civilian word) |
| DELETE | `/api/games/{roomCode}/members/{playerId}` | Host-only kick |
| POST | `/api/games/{roomCode}/leave` | Leave after the game starts (disconnect elimination) |
| POST | `/api/games/{roomCode}/restart` | Host-only; returns a finished game to the lobby |
| GET | `/api/me` | Own public profile |
| PATCH | `/api/me` | Update own handle/display name |
| GET | `/api/users?query=` | Profile search (min 2 characters) |
| GET | `/api/friends` | List friendships |
| POST | `/api/friends/{profileId}` | Send a friend request |
| POST | `/api/friends/{profileId}/accept` | Accept a pending request |
| DELETE | `/api/friends/{profileId}` | Remove or cancel a friendship |
| GET | `/api/me/stats` | Own persisted game statistics |
| GET | `/health` | Liveness |

Each game mutation returns the caller-filtered `GameView` after commit. Illegal phases return 409, malformed bodies 422, unauthorized identities 403, and missing/invalid tokens 401.

## Realtime

After each committed mutation the API calls `RealtimeService.publish_game_changed`, posting `{roomCode, version}` to the private Realtime topic `game:<game id>` through the Supabase broadcast API. Broadcast failure logs an error but never rolls back a committed game; clients refetch on subscription, foreground, and version gaps.

## Testing

```bash
pytest -q
```

`tests/test_rules.py` covers the pure rule transitions (Jester/Mr. White/Bodyguard/ties/victory parity); `tests/test_game_api.py` covers authentication, member-filtered views, hidden compositions, and results aggregation.