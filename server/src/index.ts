import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all for dev
        methods: ["GET", "POST"]
    }
});

import { gameManager } from './game/GameManager';
import { SocketEvents, JoinRoomPayload } from '@undercover/shared';

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on(SocketEvents.JOIN_ROOM, ({ roomId, playerName }: JoinRoomPayload) => {
        let room = gameManager.getRoom(roomId);

        // Auto-create if not exists (simplification for MVP)
        if (!room) {
            console.log(`Creating new room ${roomId} for ${playerName}`);
            room = gameManager.createRoom(playerName); // Using playerName as host for now
            // If we want exploring creates vs joins explicitly, we can separate them later
        }

        const player = room.addPlayer(socket, playerName);
        socket.join(roomId);

        // Send initial state
        socket.emit(SocketEvents.UPDATE_STATE, room.getGameState(socket.id));
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Find which room they were in? 
        // Ideally we map socketId -> RoomId or iterate
        // This is a TODO for robustness
    });
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
