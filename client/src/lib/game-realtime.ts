import type { GameStateChangedPayload, GameView } from '@undercover/shared';

interface RealtimeChannel {
    on(type: 'broadcast', filter: { event: 'game_state_changed' }, callback: (message: { payload: GameStateChangedPayload }) => void): RealtimeChannel;
    subscribe(callback: (status: string) => void): RealtimeChannel;
}

interface RealtimeClient {
    channel(topic: string, options: { config: { private: true } }): RealtimeChannel;
    removeChannel(channel: RealtimeChannel): Promise<unknown>;
}

export interface GameRealtimeOptions {
    client: RealtimeClient;
    fetchGame: () => Promise<GameView>;
    onGame: (game: GameView) => void;
    onError?: (error: unknown) => void;
    document?: Pick<Document, 'addEventListener' | 'removeEventListener' | 'visibilityState'>;
}

export interface GameRealtime {
    start(gameId: string, version: number): void;
    retry(): Promise<void>;
    stop(): Promise<void>;
}

export const createGameRealtime = ({ client, fetchGame, onGame, onError, document: page = globalThis.document }: GameRealtimeOptions): GameRealtime => {
    let channel: RealtimeChannel | undefined;
    let version = 0;
    let loading = false;
    let stopped = false;

    const refetch = async () => {
        if (loading || stopped) return;
        loading = true;
        try {
            const game = await fetchGame();
            if (game.version > version) {
                version = game.version;
                onGame(game);
            }
        } catch (error) {
            onError?.(error);
        } finally {
            loading = false;
        }
    };
    const onForeground = () => {
        if (page?.visibilityState === 'visible') void refetch();
    };

    return {
        start(gameId, currentVersion) {
            void this.stop();
            stopped = false;
            version = currentVersion;
            channel = client.channel(`game:${gameId}`, { config: { private: true } })
                .on('broadcast', { event: 'game_state_changed' }, ({ payload }) => {
                    if (payload.version > version) void refetch();
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') void refetch();
                });
            page?.addEventListener('visibilitychange', onForeground);
        },
        async retry() {
            await refetch();
        },
        async stop() {
            stopped = true;
            page?.removeEventListener('visibilitychange', onForeground);
            if (channel) await client.removeChannel(channel);
            channel = undefined;
        },
    };
};
