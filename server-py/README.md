# Undercover FastAPI Backend

Backend API for the Undercover SaaS game, built with FastAPI and MongoDB.

## Setup

```bash
# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -e ".[dev]"

# Copy environment template
cp .env.example .env

# Start MongoDB (must be running)
# mongod --dbpath /path/to/data

# Run the server
uvicorn src.main:app --reload --port 8000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/words/themes` | Get available word themes |
| POST | `/api/words/generate` | Generate word pair |
| POST | `/api/game/create` | Create new game |
| POST | `/api/game/{id}/players` | Add player |
| POST | `/api/game/{id}/assign-roles` | Start game |
| GET | `/api/game/{id}` | Get game state |
| POST | `/api/game/{id}/eliminate` | Eliminate player |

## Security

- Player roles/words are only visible to the player themselves
- Use `X-Player-ID` header to identify the requesting player
- Mr. White sees their role but NOT the word

## Testing

```bash
# Run test script
python test_game.py

# Or use curl
curl http://localhost:8000/api/words/themes
```
