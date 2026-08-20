import type { GameView } from '@undercover/shared'
import { describe, expect, test, vi } from 'vitest'

import { createGameRealtime } from './game-realtime'

describe('game realtime lifecycle', () => {
  test('does not lose its new channel when a prior stop finishes after restart', async () => {
    let releaseFirstRemoval!: () => void
    const firstRemoval = new Promise<void>((resolve) => { releaseFirstRemoval = resolve })
    const firstChannel = { on: vi.fn(), subscribe: vi.fn() }
    firstChannel.on.mockReturnValue(firstChannel)
    firstChannel.subscribe.mockReturnValue(firstChannel)
    const secondChannel = { on: vi.fn(), subscribe: vi.fn() }
    secondChannel.on.mockReturnValue(secondChannel)
    secondChannel.subscribe.mockReturnValue(secondChannel)
    const removeChannel = vi.fn()
      .mockImplementationOnce(() => firstRemoval)
      .mockResolvedValue(undefined)
    const realtime = createGameRealtime({
      client: { channel: vi.fn().mockReturnValueOnce(firstChannel).mockReturnValueOnce(secondChannel), removeChannel },
      fetchGame: vi.fn(),
      onGame: vi.fn(),
    })

    realtime.start('game-1', 1)
    const stopping = realtime.stop()
    realtime.start('game-2', 1)
    releaseFirstRemoval()
    await stopping
    await realtime.stop()

    expect(removeChannel).toHaveBeenLastCalledWith(secondChannel)
  })

  test('discards game A fetch when its lifecycle ends before game B starts', async () => {
    let resolveGameA!: (game: GameView) => void
    let resolveGameB!: (game: GameView) => void
    let subscribeGameA!: (status: string) => void
    let subscribeGameB!: (status: string) => void
    const firstChannel = { on: vi.fn(), subscribe: vi.fn() }
    firstChannel.on.mockReturnValue(firstChannel)
    firstChannel.subscribe.mockImplementation((callback: (status: string) => void) => {
      subscribeGameA = callback
      return firstChannel
    })
    const secondChannel = { on: vi.fn(), subscribe: vi.fn() }
    secondChannel.on.mockReturnValue(secondChannel)
    secondChannel.subscribe.mockImplementation((callback: (status: string) => void) => {
      subscribeGameB = callback
      return secondChannel
    })
    const fetchGame = vi.fn()
      .mockImplementationOnce(() => new Promise<GameView>((resolve) => { resolveGameA = resolve }))
      .mockImplementationOnce(() => new Promise<GameView>((resolve) => { resolveGameB = resolve }))
    const onGame = vi.fn()
    const realtime = createGameRealtime({
      client: { channel: vi.fn().mockReturnValueOnce(firstChannel).mockReturnValueOnce(secondChannel), removeChannel: vi.fn().mockResolvedValue(undefined) },
      fetchGame,
      onGame,
    })
    const game = (id: string): GameView => ({
      id,
      roomCode: id,
      hostPlayerId: 'host',
      phase: 'lobby',
      players: [],
      version: 2,
      round: 0,
      winner: null,
      lastResolution: null,
    })

    realtime.start('game-a', 1)
    subscribeGameA('SUBSCRIBED')
    await realtime.stop()
    realtime.start('game-b', 1)
    subscribeGameB('SUBSCRIBED')
    expect(fetchGame).toHaveBeenCalledTimes(2)

    resolveGameA(game('game-a'))
    await Promise.resolve()
    expect(onGame).not.toHaveBeenCalled()

    resolveGameB(game('game-b'))
    await Promise.resolve()
    expect(onGame).toHaveBeenCalledWith(game('game-b'))
  })

  test('discards a failed fetch after its lifecycle stops', async () => {
    let rejectGameA!: (error: Error) => void
    let subscribeGameA!: (status: string) => void
    const channel = { on: vi.fn(), subscribe: vi.fn() }
    channel.on.mockReturnValue(channel)
    channel.subscribe.mockImplementation((callback: (status: string) => void) => {
      subscribeGameA = callback
      return channel
    })
    const onError = vi.fn()
    const realtime = createGameRealtime({
      client: { channel: vi.fn().mockReturnValue(channel), removeChannel: vi.fn().mockResolvedValue(undefined) },
      fetchGame: vi.fn().mockImplementation(() => new Promise<GameView>((_resolve, reject) => { rejectGameA = reject })),
      onGame: vi.fn(),
      onError,
    })

    realtime.start('game-a', 1)
    subscribeGameA('SUBSCRIBED')
    await realtime.stop()
    rejectGameA(new Error('game A unavailable'))
    await Promise.resolve()

    expect(onError).not.toHaveBeenCalled()
  })
})
