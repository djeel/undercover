# Undercover

The digital version of the popular social deduction game "Undercover": dark noir/period artwork, `#43544d` semantic accent, mobile-first gameplay, English and French.

## Features

- **Online multiplayer** — FastAPI-authoritative game API with member-filtered views; every player sees only their own role and word.
- **Private realtime updates** — Supabase Realtime broadcast channels scoped to active game members (`game:<id>`); the client refetches on version gaps, reconnect, and app foreground.
- **Pass & play** — Local mode for playing on a single device with the same rules as online.
- **Roles** — Civilians, Undercovers, Mr. White, Jester, and Bodyguard, with explicit resolution rules (completed votes, Mr. White guess, bodyguard protection, vote ties).
- **Identity & social** — Anonymous quick play, or Google/Discord sign-in for a public profile, friends, and persisted statistics.
- **Word pairs** — A localized EN/FR pair corpus selected by the server.
- **Room codes** — Six-character uppercase invite links shared via `?code=<roomCode>`.

## Tech Stack

- **Frontend**: React 19, Vite, Astryx design system (theme/components), Tailwind for layout utilities, Zustand, i18next (EN/FR)
- **Backend**: Python, FastAPI, asyncpg, PyJWT (Supabase JWT verification against a cached JWKS)
- **Data & identity**: Supabase Postgres (authoritative game state, profiles, friendships, results/stats), Supabase Auth (OAuth Google/Discord + anonymous sessions), private Supabase Realtime
- **Shared**: TypeScript contract package (`shared/`) consumed by client and server views
- **Mobile**: Capacitor Android packaging

## Architecture at a glance

- For online games the browser never trusts local state: every mutation goes to FastAPI, which locks and persists the complete game state in Postgres (`version` incremented) and broadcasts `{roomCode, version}` on a private Realtime channel.
- Game rules are pure modules on the server (`server-py/src/game/`), mirrored for local play in `client/src/features/local-game/rules.ts`.
- Supabase RLS keeps profiles, friendships, memberships, and results visible only to their owners; the API uses a service-level Postgres connection for authoritative writes.

## Getting Started

### Prerequisites

- Node.js & npm
- Python 3.11+ & pip
- A Supabase project (Postgres + Auth + Realtime). Variable names only: see `server-py/.env.example` and `DEPLOYMENT.md` — no secrets are versioned.

### Local development

```bash
# Install workspace dependencies (client + shared)
npm install

# Build the shared contract package first
npm run build --workspace=shared

# Backend (terminal 1)
cd server-py
python3 -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env   # fill in DATABASE_URL etc.
uvicorn src.main:app --reload --port 8000

# Frontend (terminal 2)
cd client
npm run dev
```

`./start.sh` also boots both services (API on :8000, Vite on :5173).

### Tests

```bash
cd server-py && pytest -q
cd client && npm run test -- --run
```

### Production builds

```bash
npm run build                    # shared + client
cd client && npm run build:mobile  # Capacitor Android build (APK)
```

## Deployment

See `DEPLOYMENT.md` (French) for the full guide: Supabase migrations and OAuth redirects, Render API deployment (`render.yaml`), Vercel for the web client, and `client/deploy.sh` for GitHub Pages. The repository only versiones variable names, never secrets.