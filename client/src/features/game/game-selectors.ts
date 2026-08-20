import type { GamePlayerView, GameSettingsView, GameView } from '@undercover/shared';

export const selectOwnPlayer = (game: GameView | null, playerId: string | null): GamePlayerView | null => {
    if (!game || !playerId) return null;
    return game.players.find((player) => player.id === playerId) ?? null;
};

export const selectVisibleComposition = (game: GameView | null): GameSettingsView | null => game?.settings ?? null;

export const selectCanOpenVoting = (game: GameView | null, playerId: string | null): boolean => {
    if (!game || !playerId || game.phase !== 'playing' || game.hostPlayerId !== playerId) return false;
    return game.players.some((player) => player.id === playerId && player.alive);
};

export const selectLivingPlayers = (game: GameView | null): GamePlayerView[] => game?.players.filter((player) => player.alive) ?? [];
