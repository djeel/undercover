import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8').replace(/\s+/g, ' ')

function block(source: string, opener: string) {
  const start = source.indexOf(opener)
  const openingBrace = source.indexOf('{', start)

  if (start < 0 || openingBrace < 0) throw new Error(`Missing CSS block: ${opener}`)

  let depth = 0

  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') depth -= 1
    if (depth === 0) return source.slice(openingBrace + 1, index)
  }

  throw new Error(`Unclosed CSS block: ${opener}`)
}

function ruleIn(source: string, selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = source.match(new RegExp(`${escapedSelector}\\s*\\{([^}]*)\\}`))

  if (!match) throw new Error(`Missing CSS rule: ${selector}`)

  return match[1]
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

describe('dashboard action card CSS', () => {
  it('provides pressed feedback on the primary link', () => {
    expect(ruleIn(css, '.primary-action-card__link:active')).toContain('transform: translateY(1px)')
  })

  it('disables card, artwork, and shape motion inside reduced motion', () => {
    const reducedMotion = block(css, '@media (prefers-reduced-motion: reduce)')

    for (const selector of [
      '.primary-action-card, .action-card__art',
      '.primary-action-card__shapes::before, .primary-action-card__shapes::after',
    ]) {
      expect(ruleIn(reducedMotion, selector)).toContain('transition: none;')
      expect(ruleIn(reducedMotion, selector)).toContain('animation: none;')
    }
  })
})
