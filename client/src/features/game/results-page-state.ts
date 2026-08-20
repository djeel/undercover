import type { GameView, WinnerType } from '@undercover/shared'

export type ResultsGame =
  | { mode: 'local' }
  | { mode: 'online'; game: GameView }
  | null

export const resolveResultsGame = (localWinner: WinnerType | null, onlineGame: GameView | null): ResultsGame => {
  if (localWinner) return { mode: 'local' }
  if (onlineGame?.phase === 'finished' && onlineGame.winner) return { mode: 'online', game: onlineGame }
  return null
}
