import type { FriendshipView, GameView, PlayerResultView, PlayerStatsView } from '@undercover/shared'
import { describe, expect, it } from 'vitest'

import { getDashboardState, type DashboardStateInput } from './dashboard-state'

const result: PlayerResultView = { role: 'civilian', winner: 'civilians', won: true, survived: true, roundsPlayed: 3, durationSeconds: 240, playedAt: '2026-08-20T12:00:00Z' }
const stats: PlayerStatsView = { gamesPlayed: 8, gamesWon: 5, gamesLost: 3, currentWinStreak: 0, bestWinStreak: 0, roles: [], results: [result] }
const friends: FriendshipView[] = [
  { profileId: 'a', status: 'accepted', requestedBy: 'me' },
  { profileId: 'b', status: 'pending', requestedBy: 'me' },
]
const activeOnlineGame: GameView = {
  id: 'game-1', roomCode: 'ABC123', hostPlayerId: 'host-1', phase: 'playing',
  players: [{ id: 'host-1', displayName: 'Host', avatarUrl: null, alive: true }],
  version: 1, round: 2, winner: null, lastResolution: null,
}

describe('getDashboardState', () => {
  it('never exposes account data to anonymous users', () => {
    expect(getDashboardState({ isAnonymous: true, friends, stats })).toEqual({
      showMemberSections: false,
      acceptedFriendCount: 0,
      stats: null,
      recentResults: [],
      resumeGame: null,
    })
  })

  it('uses only accepted friends and returned statistics', () => {
    expect(getDashboardState({ isAnonymous: false, friends, stats })).toEqual({
      showMemberSections: true,
      acceptedFriendCount: 1,
      stats,
      recentResults: [result],
      resumeGame: null,
    })
  })

  it('offers a game resume only for an active current game', () => {
    const input: DashboardStateInput = { isAnonymous: false, friends: [], stats: null, onlineGame: activeOnlineGame, localPhase: 'idle' }

    expect(getDashboardState(input).resumeGame).toEqual({ mode: 'online' })
    expect(getDashboardState({ ...input, onlineGame: { ...activeOnlineGame, phase: 'finished' }, localPhase: 'setup' }).resumeGame).toBeNull()
  })
})
