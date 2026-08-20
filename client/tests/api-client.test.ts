import { afterEach, describe, expect, test, vi } from 'vitest';
import { ApiError, createApiClient } from '../src/lib/api-client';

afterEach(() => vi.unstubAllGlobals());

describe('API client', () => {
    test('adds the current access token and returns the lower-case game view', async () => {
        const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
            id: 'game', roomCode: 'ABC123', hostPlayerId: 'p', phase: 'lobby', players: [], version: 1, round: 0, winner: null, lastResolution: null,
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        const api = createApiClient({ baseUrl: 'https://api.example/api', getAccessToken: async () => 'jwt', fetcher });

        await expect(api.getGame('ABC123')).resolves.toMatchObject({ phase: 'lobby', roomCode: 'ABC123' });
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect((fetcher.mock.calls[0][1]?.headers as Headers).get('Authorization')).toBe('Bearer jwt');
    });

    test('maps API error responses without retrying mutations', async () => {
        const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Not a game member' }), { status: 403 }));
        const api = createApiClient({ baseUrl: 'https://api.example/api', getAccessToken: async () => null, fetcher });

        await expect(api.startGame('ABC123')).rejects.toEqual(new ApiError('forbidden', 'Not a game member'));
        expect(fetcher).toHaveBeenCalledTimes(1);
    });
});
