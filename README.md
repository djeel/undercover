# Undercover SaaS

The digital version of the popular social deduction game "Undercover". 
Blends a modern React frontend with a robust Python/FastAPI backend using WebSockets.

## Features
- **Real-time Multiplayer**: Powered by Socket.IO for instant updates.
- **Pass & Play**: Local mode for playing on a single device.
- **Persistent State**: SQLite database ensures games survive server restarts.
- **Multiple Roles**: Civilians, Undercovers, and Mr. White.
- **Word Themes**: Variety of word pairs including Movies, Tech, and more.

## Tech Stack
- **Frontend**: React, Vite, TailwindCSS, Framer Motion
- **Backend**: Python, FastAPI, python-socketio, aiosqlite
- **Shared**: WebSocket types and enums shared between client/server

## Getting Started

### Prerequisites
- Node.js & npm
- Python 3.8+ & pip

### Quick Start
Use the provided script to start both services:
```bash
./start.sh
```

### Manual Setup

1. **Backend**:
   ```bash
   cd server-py
   pip install -r requirements.txt
   uvicorn src.main:app --reload --port 8000
   ```

2. **Frontend**:
   ```bash
   cd client
   npm install
   npm run dev
   ```

## Development
- **Shared Types**: If you modify `shared/`, run `npm run build` in the shared directory or root to update the frontend.
