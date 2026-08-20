import { describe, expect, it, vi } from 'vitest'
import type { GameView } from '@undercover/shared'

import { createOnlineSession, joinOnlineSession } from './create-online-session'

const game: GameView = {
  id: 'game-1',
  roomCode: 'ABC123',
  hostPlayerId: 'host-1',
  phase: 'lobby',
  players: [{ id: 'host-1', displayName: 'Host', avatarUrl: null, alive: true }],
  version: 1,
  round: 1,
  winner: null,
  lastResolution: null,
}

describe('createOnlineSession', () => {
  it('retrieves the creator member and sets the session without joining again', async () => {
    const api = {
      createGame: vi.fn().mockResolvedValue({ roomCode: 'ABC123', hostPlayerId: 'host-1' }),
      getGame: vi.fn().mockResolvedValue(game),
      joinGame: vi.fn(),
    }
    const setSession = vi.fn()

    await createOnlineSession({ api, language: 'en', setSession })

    expect(api.createGame).toHaveBeenCalledWith({ language: 'en' })
    expect(api.getGame).toHaveBeenCalledWith('ABC123')
    expect(api.joinGame).not.toHaveBeenCalled()
    expect(setSession).toHaveBeenCalledWith(game, 'host-1')
  })

  it('sends a trimmed display name only for an anonymous creator', async () => {
    const api = {
      createGame: vi.fn().mockResolvedValue({ roomCode: 'ABC123', hostPlayerId: 'host-1' }),
      getGame: vi.fn().mockResolvedValue(game),
    }

    await createOnlineSession({ api, language: 'en', displayName: '  Ana  ', setSession: vi.fn() })

    expect(api.createGame).toHaveBeenCalledWith({ language: 'en', displayName: 'Ana' })
  })

  it('does not send a display name for an authenticated creator', async () => {
    const api = {
      createGame: vi.fn().mockResolvedValue({ roomCode: 'ABC123', hostPlayerId: 'host-1' }),
      getGame: vi.fn().mockResolvedValue(game),
    }

    await createOnlineSession({ api, language: 'en', setSession: vi.fn() })

    expect(api.createGame).toHaveBeenCalledWith({ language: 'en' })
  })
})

const joinedGame: GameView = {
  ...game,
  players: [
    { id: 'host-1', displayName: 'Host', avatarUrl: null, alive: true },
    { id: 'member-2', displayName: 'Name changed during join', avatarUrl: null, alive: true },
  ],
}


describe('joinOnlineSession', () => {
  it('uses the server-authoritative member ID even when the profile name changes during join', async () => {
    const api = {
      getProfile: vi.fn(),
      joinGame: vi.fn().mockResolvedValue({ game: joinedGame, playerId: 'member-2' }),
    }
    const setSession = vi.fn()

    await joinOnlineSession({ api, roomCode: 'ABC123', setSession })

    expect(api.getProfile).not.toHaveBeenCalled()
    expect(api.joinGame).toHaveBeenCalledWith('ABC123', {})
    expect(setSession).toHaveBeenCalledWith(joinedGame, 'member-2')
  })
})
