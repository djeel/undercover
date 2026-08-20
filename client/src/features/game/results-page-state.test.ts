import { describe, expect, it } from 'vitest'
import type { GameView } from '@undercover/shared'

import { resolveResultsGame } from './results-page-state'

const finishedOnlineGame: GameView = {
  id: 'game-1', roomCode: 'ABC123', hostPlayerId: 'host-1', phase: 'finished', version: 4, round: 2,
  players: [{ id: 'host-1', displayName: 'Host', avatarUrl: null, alive: true, role: 'civilian', word: 'Coffee' }],
  winner: 'civilians', lastResolution: { type: 'victory', winner: 'civilians' },
}

describe('resolveResultsGame', () => {
  it('uses the server-finished online view when no local winner exists', () => {
    expect(resolveResultsGame(null, finishedOnlineGame)).toEqual({ mode: 'online', game: finishedOnlineGame })
  })
})
