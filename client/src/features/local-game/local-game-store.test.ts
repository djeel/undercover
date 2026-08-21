import { afterEach, describe, expect, test } from 'vitest'
import { useLocalGameStore } from './local-game-store'

const players = [
  { id: 'civilian-1', displayName: 'Civilian', role: 'civilian' as const, word: 'Coffee', alive: true },
  { id: 'civilian-2', displayName: 'Civilian 2', role: 'civilian' as const, word: 'Coffee', alive: true },
  { id: 'undercover', displayName: 'Undercover', role: 'undercover' as const, word: 'Tea', alive: true },
  { id: 'civilian-3', displayName: 'Civilian 3', role: 'civilian' as const, word: 'Coffee', alive: true },
]

afterEach(() => useLocalGameStore.getState().resetGame())

describe('local direct elimination', () => {
  test('applies the agreed target through the store action', () => {
    useLocalGameStore.setState({ phase: 'playing', players })

    useLocalGameStore.getState().eliminatePlayer('civilian-1')

    expect(useLocalGameStore.getState().players.find((player) => player.id === 'civilian-1')?.alive).toBe(false)
    expect(useLocalGameStore.getState().lastResolution).toMatchObject({ source: 'vote', playerId: 'civilian-1' })
  })
})

describe('local store public API', () => {
  test('does not expose legacy ballot actions on LocalGameStore', () => {
    const store = useLocalGameStore.getState() as unknown as Record<string, unknown>

    expect(store.openVoting).toBeUndefined()
    expect(store.castVote).toBeUndefined()
    expect(store.resolveVote).toBeUndefined()
  })
})
