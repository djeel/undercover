import { describe, expect, it } from 'vitest'
import type { GameView } from '@undercover/shared'

import { canSubmitLocalMrWhiteGuess, resolveGameMode, selectLocalIdentityPlayer } from './game-page-state'
import type { LocalPlayer } from '../local-game/rules'

const onlineGame: GameView = {
  id: 'game-1', roomCode: 'ABC123', hostPlayerId: 'host-1', phase: 'playing', version: 1, round: 2,
  players: [{ id: 'host-1', displayName: 'Host', avatarUrl: null, alive: true, role: 'civilian', word: 'Coffee' }],
  winner: null, lastResolution: null,
}

describe('resolveGameMode', () => {
  it('uses the authoritative online game when no local game is active', () => {
    expect(resolveGameMode('idle', onlineGame)).toBe('online')
  })

  it('preserves an active local pass-and-play game', () => {
    expect(resolveGameMode('voting', onlineGame)).toBe('local')
  })
})

describe('canSubmitLocalMrWhiteGuess', () => {
  it('requires the pending Mr. White to confirm their identity first', () => {
    expect(canSubmitLocalMrWhiteGuess('mr-white', null)).toBe(false)
    expect(canSubmitLocalMrWhiteGuess('mr-white', 'someone-else')).toBe(false)
    expect(canSubmitLocalMrWhiteGuess('mr-white', 'mr-white')).toBe(true)
  })
})

describe('selectLocalIdentityPlayer', () => {
  const players: LocalPlayer[] = [
    { id: 'player-1', displayName: 'Player 1', role: 'civilian', word: 'Coffee', alive: true },
    { id: 'player-2', displayName: 'Player 2', role: 'undercover', word: 'Tea', alive: true },
  ]

  it('opens the selected second player identity instead of inferring the first living player', () => {
    expect(selectLocalIdentityPlayer(players, 'player-2')).toEqual(players[1])
  })

  it('requires a selected living player before opening an identity', () => {
    expect(selectLocalIdentityPlayer(players, '')).toBeNull()
    expect(selectLocalIdentityPlayer([{ ...players[1], alive: false }], 'player-2')).toBeNull()
  })
})
