import { Room } from './Room';

export class GameManager {
    private rooms: Map<string, Room> = new Map();

    createRoom(hostName: string): Room {
        const roomId = this.generateRoomId();
        const room = new Room(roomId, hostName);
        this.rooms.set(roomId, room);
        return room;
    }

    getRoom(roomId: string): Room | undefined {
        return this.rooms.get(roomId);
    }

    deleteRoom(roomId: string): void {
        this.rooms.delete(roomId);
    }

    private generateRoomId(): string {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }
}

export const gameManager = new GameManager();
