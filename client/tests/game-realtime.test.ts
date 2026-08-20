import { describe, expect, test } from 'vitest';
import { createGameRealtime } from '../src/lib/game-realtime';

class FakeChannel {
    private broadcast?: (message: { payload: unknown }) => void;
    private subscription?: (status: string) => void;

    on(_: 'broadcast', __: { event: string }, callback: (message: { payload: unknown }) => void) {
        this.broadcast = callback;
        return this;
    }

    subscribe(callback: (status: string) => void) {
        this.subscription = callback;
        return this;
    }

    emit(payload: unknown) { this.broadcast?.({ payload }); }
    connected() { this.subscription?.('SUBSCRIBED'); }
}

test('re-fetches one time for a newer event version and a version gap', async () => {
    const channel = new FakeChannel();
    const first = Promise.withResolvers<{ id: string; roomCode: string; hostPlayerId: string; phase: 'playing'; players: []; version: number; round: number; winner: null; lastResolution: null }>();
    const second = Promise.withResolvers<{ id: string; roomCode: string; hostPlayerId: string; phase: 'playing'; players: []; version: number; round: number; winner: null; lastResolution: null }>();
    let fetches = 0;
    const realtime = createGameRealtime({
        client: { channel: () => channel, removeChannel: () => Promise.resolve('ok') },
        fetchGame: () => {
            fetches += 1;
            return fetches === 1 ? first.promise : second.promise;
        },
        onGame: () => undefined,
        document: undefined,
    });

    realtime.start('game', 5);
    channel.connected();
    await Promise.resolve();
    expect(fetches).toBe(1);

    first.resolve({ id: 'game', roomCode: 'ABC123', hostPlayerId: 'p', phase: 'playing', players: [], version: 7, round: 1, winner: null, lastResolution: null });
    await Promise.resolve();
    await Promise.resolve();
    channel.emit({ roomCode: 'ABC123', version: 6 });
    channel.emit({ roomCode: 'ABC123', version: 8 });
    await Promise.resolve();

    expect(fetches).toBe(2);
    second.resolve({ id: 'game', roomCode: 'ABC123', hostPlayerId: 'p', phase: 'playing', players: [], version: 8, round: 1, winner: null, lastResolution: null });
});
