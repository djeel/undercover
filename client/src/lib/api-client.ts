import type {
    CreateGamePayload,
    CreateGameResponse,
    FriendshipView,
    GameView,
    JoinGamePayload,
    JoinGameResponse,
    MrWhiteGuessPayload,
    PlayerStatsView,
    ProfileView,
    UpdateGameSettingsPayload,
    UpdateProfilePayload,
    VotePayload,
} from '@undercover/shared';

export type ApiErrorCode = 'unauthorized' | 'forbidden' | 'conflict' | 'validation' | 'not_found' | 'network' | 'unknown';

export class ApiError extends Error {
    constructor(public readonly code: ApiErrorCode, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

type Fetcher = typeof fetch;
export interface ApiClientOptions {
    baseUrl: string;
    getAccessToken: () => Promise<string | null>;
    fetcher?: Fetcher;
}

export interface ApiClient {
    createGame(body: CreateGamePayload): Promise<CreateGameResponse>;
    joinGame(roomCode: string, body: JoinGamePayload): Promise<JoinGameResponse>;
    getGame(roomCode: string): Promise<GameView>;
    updateSettings(roomCode: string, body: UpdateGameSettingsPayload): Promise<GameView>;
    startGame(roomCode: string): Promise<GameView>;
    openVoting(roomCode: string): Promise<GameView>;
    vote(roomCode: string, body: VotePayload): Promise<GameView>;
    submitMrWhiteGuess(roomCode: string, body: MrWhiteGuessPayload): Promise<GameView>;
    leaveGame(roomCode: string): Promise<GameView>;
    restartGame(roomCode: string): Promise<GameView>;
    kickMember(roomCode: string, playerId: string): Promise<GameView>;
    getProfile(): Promise<ProfileView>;
    updateProfile(body: UpdateProfilePayload): Promise<ProfileView>;
    searchProfiles(query: string): Promise<ProfileView[]>;
    getFriends(): Promise<FriendshipView[]>;
    requestFriend(profileId: string): Promise<FriendshipView>;
    acceptFriend(profileId: string): Promise<FriendshipView>;
    deleteFriend(profileId: string): Promise<{ ok: true }>;
    getStats(): Promise<PlayerStatsView>;
}

const errorCodeFor = (status: number): ApiErrorCode => {
    if (status === 401) return 'unauthorized';
    if (status === 403) return 'forbidden';
    if (status === 404) return 'not_found';
    if (status === 409) return 'conflict';
    if (status === 422) return 'validation';
    return 'unknown';
};

export const createApiClient = ({ baseUrl, getAccessToken, fetcher = fetch }: ApiClientOptions): ApiClient => {
    const resolvedBaseUrl = baseUrl?.trim().replace(/\/$/, '');

    const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
        if (!resolvedBaseUrl) {
            throw new ApiError('network', 'Online play is unavailable because the game server is not configured.');
        }

        const token = await getAccessToken();
        const headers = new Headers(init.headers);
        headers.set('Accept', 'application/json');
        if (init.body) headers.set('Content-Type', 'application/json');
        if (token) headers.set('Authorization', `Bearer ${token}`);

        let response: Response;
        try {
            response = await fetcher(`${resolvedBaseUrl}${path}`, { ...init, headers });
        } catch {
            throw new ApiError('network', 'Network request failed');
        }
        if (!response.ok) {
            const payload = await response.json().catch(() => ({})) as { detail?: string; message?: string; code?: string };
            throw new ApiError(errorCodeFor(response.status), payload.detail ?? payload.message ?? `Request failed (${response.status})`);
        }
        return response.json() as Promise<T>;
    };

    return {
        createGame: (body: CreateGamePayload) => request<CreateGameResponse>('/games', { method: 'POST', body: JSON.stringify(body) }),
        joinGame: (roomCode: string, body: JoinGamePayload) => request<JoinGameResponse>(`/games/${roomCode}/join`, { method: 'POST', body: JSON.stringify(body) }),
        getGame: (roomCode: string) => request<GameView>(`/games/${roomCode}`),
        updateSettings: (roomCode: string, body: UpdateGameSettingsPayload) => request<GameView>(`/games/${roomCode}/settings`, { method: 'PATCH', body: JSON.stringify(body) }),
        startGame: (roomCode: string) => request<GameView>(`/games/${roomCode}/start`, { method: 'POST' }),
        openVoting: (roomCode: string) => request<GameView>(`/games/${roomCode}/voting`, { method: 'POST' }),
        vote: (roomCode: string, body: VotePayload) => request<GameView>(`/games/${roomCode}/vote`, { method: 'POST', body: JSON.stringify(body) }),
        submitMrWhiteGuess: (roomCode: string, body: MrWhiteGuessPayload) => request<GameView>(`/games/${roomCode}/mr-white-guess`, { method: 'POST', body: JSON.stringify(body) }),
        leaveGame: (roomCode: string) => request<GameView>(`/games/${roomCode}/leave`, { method: 'POST' }),
        restartGame: (roomCode: string) => request<GameView>(`/games/${roomCode}/restart`, { method: 'POST' }),
        kickMember: (roomCode: string, playerId: string) => request<GameView>(`/games/${roomCode}/members/${playerId}`, { method: 'DELETE' }),
        getProfile: () => request<ProfileView>('/me'),
        updateProfile: (body: UpdateProfilePayload) => request<ProfileView>('/me', { method: 'PATCH', body: JSON.stringify(body) }),
        searchProfiles: (query: string) => request<ProfileView[]>(`/users?query=${encodeURIComponent(query)}`),
        getFriends: () => request<FriendshipView[]>('/friends'),
        requestFriend: (profileId: string) => request<FriendshipView>(`/friends/${profileId}`, { method: 'POST' }),
        acceptFriend: (profileId: string) => request<FriendshipView>(`/friends/${profileId}/accept`, { method: 'POST' }),
        deleteFriend: (profileId: string) => request<{ ok: true }>(`/friends/${profileId}`, { method: 'DELETE' }),
        getStats: () => request<PlayerStatsView>('/me/stats'),
    };
};

let tokenProvider: () => Promise<string | null> = async () => null;

export const configureApiTokenProvider = (provider: () => Promise<string | null>) => {
    tokenProvider = provider;
};

export const api = createApiClient({
    baseUrl: import.meta.env.VITE_API_URL,
    getAccessToken: () => tokenProvider(),
});

