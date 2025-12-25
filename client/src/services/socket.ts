import { io, Socket } from 'socket.io-client';

import { SocketEvents } from '@undercover/shared';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
// Strip '/api' from the end to get the base URL
const SERVER_URL = API_URL.replace(/\/api$/, '');

class SocketService {
    private socket: Socket | null = null;
    private listeners: Map<string, Function[]> = new Map();

    connect(playerId: string) {
        if (this.socket?.connected) return;

        this.socket = io(SERVER_URL, {
            query: { playerId },
            // transports: ['websocket'], // Let Socket.IO decide (polling -> websocket upgrade)
            reconnection: true,
        });

        this.socket.on('connect', () => {
            console.log('Socket connected:', this.socket?.id);
        });

        this.socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        // Generic event dispatcher
        this.socket.onAny((event, ...args) => {
            const handlers = this.listeners.get(event);
            if (handlers) {
                handlers.forEach(h => h(...args));
            }
        });


    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    joinGame(gameId: string) {
        if (!this.socket) return;
        this.socket.emit(SocketEvents.JOIN_ROOM, gameId);
    }

    on(event: string, callback: Function) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)?.push(callback);
    }

    off(event: string, callback: Function) {
        const handlers = this.listeners.get(event);
        if (handlers) {
            this.listeners.set(event, handlers.filter(h => h !== callback));
        }
    }
}

export const socketService = new SocketService();
