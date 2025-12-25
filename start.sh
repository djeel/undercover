#!/bin/bash

# Kill background processes on exit
trap 'kill $(jobs -p)' EXIT

echo "Starting Undercover..."

# Start Backend
echo "Starting Backend (FastAPI)..."
cd server-py
if [ ! -d "venv" ]; then
    echo "Creating Python venv..."
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt > /dev/null
uvicorn src.main:app --reload --port 8000 &
SERVER_PID=$!
cd ..

# Wait a bit for backend
sleep 2

# Start Frontend
echo "Starting Frontend (Vite)..."
cd client
npm install > /dev/null
npm run dev -- --host &
CLIENT_PID=$!
cd ..

echo "Services started!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "Press Ctrl+C to stop."

wait
