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
    let loadingLifecycle: number | undefined;
    let lifecycle = 0;
    let activeLifecycle = 0;

    const refetch = async (requestLifecycle = activeLifecycle) => {
        if (!requestLifecycle || requestLifecycle !== activeLifecycle || loadingLifecycle === requestLifecycle) return;
        loadingLifecycle = requestLifecycle;
        try {
            const game = await fetchGame();
            if (requestLifecycle !== activeLifecycle) return;
            if (game.version > version) {
                version = game.version;
                onGame(game);
            }
        } catch (error) {
            if (requestLifecycle === activeLifecycle) onError?.(error);
        } finally {
            if (loadingLifecycle === requestLifecycle) loadingLifecycle = undefined;
        }
    };
    const onForeground = () => {
        if (page?.visibilityState === 'visible') void refetch();
    };

    return {
        start(gameId, currentVersion) {
            void this.stop();
            const currentLifecycle = ++lifecycle;
            activeLifecycle = currentLifecycle;
            version = currentVersion;
            channel = client.channel(`game:${gameId}`, { config: { private: true } })
                .on('broadcast', { event: 'game_state_changed' }, ({ payload }) => {
                    if (currentLifecycle === activeLifecycle && payload.version > version) void refetch(currentLifecycle);
                })
                .subscribe((status) => {
                    if (currentLifecycle === activeLifecycle && status === 'SUBSCRIBED') void refetch(currentLifecycle);
                });
            page?.addEventListener('visibilitychange', onForeground);
        },
        async retry() {
            await refetch();
        },
        async stop() {
            ++lifecycle;
            activeLifecycle = 0;
            page?.removeEventListener('visibilitychange', onForeground);
            const current = channel;
            channel = undefined;
            if (current) await client.removeChannel(current);
        },
    };
};
