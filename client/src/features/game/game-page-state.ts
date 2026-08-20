import type { GameView } from '@undercover/shared'
import type { LocalPhase } from '../local-game/local-game-store'

export type GameMode = 'local' | 'online' | 'none'

export const resolveGameMode = (localPhase: LocalPhase, game: GameView | null): GameMode => {
  if (localPhase !== 'idle') return 'local'
  return game ? 'online' : 'none'
}

export const canSubmitLocalMrWhiteGuess = (pendingMrWhiteId: string | null, confirmedPlayerId: string | null) => Boolean(pendingMrWhiteId && pendingMrWhiteId === confirmedPlayerId);

export const selectLocalIdentityPlayer = <T extends { id: string; alive: boolean }>(players: T[], playerId: string): T | null => players.find((player) => player.id === playerId && player.alive) ?? null
