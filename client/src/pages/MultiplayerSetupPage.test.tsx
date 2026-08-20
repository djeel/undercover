import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { GameView } from '@undercover/shared'
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const session = vi.hoisted(() => ({
  game: null as GameView | null,
  playerId: 'member-1' as string | null,
}))

vi.mock('../features/auth', () => ({
  useAuth: () => ({ isLoading: false, isAnonymous: false }),
}))

vi.mock('../features/game/game-store', () => ({
  useGameStore: Object.assign(
    <T,>(selector: (state: typeof session & { setSession: () => void; clear: () => void }) => T) => selector({ ...session, setSession: () => undefined, clear: () => undefined }),
    { getState: () => ({ updateSettings: vi.fn(), startGame: vi.fn() }) },
  ),
}))

vi.mock('../features/game/create-online-session', () => ({
  createOnlineSession: vi.fn(),
  joinOnlineSession: vi.fn(),
}))

vi.mock('../lib/api-client', () => ({ api: { getProfile: () => Promise.resolve({ displayName: 'Member' }) } }))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}))

import MultiplayerSetupPage from './MultiplayerSetupPage'

const playingGame: GameView = {
  id: 'game-1', roomCode: 'ABC123', hostPlayerId: 'host-1', phase: 'playing', version: 2, round: 1,
  players: [{ id: 'member-1', displayName: 'Member', avatarUrl: null, alive: true }],
  winner: null, lastResolution: null,
}

function Location() {
  return <output>{useLocation().pathname}</output>
}

describe('MultiplayerSetupPage active games', () => {
  let container: HTMLDivElement
  let root: Root

  afterEach(async () => {
    await act(async () => { root?.unmount() })
    container?.remove()
    session.game = null
    session.playerId = 'member-1'
  })

  test.each(['playing', 'voting', 'mr_white_guess', 'finished'] as const)('redirects a joined non-host member to the game when the authoritative phase becomes %s', async (phase) => {
    session.game = { ...playingGame, phase }
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<MemoryRouter initialEntries={['/lobby']}><Routes><Route path="/lobby" element={<MultiplayerSetupPage />} /><Route path="/game" element={<Location />} /></Routes></MemoryRouter>)
    })

    expect(container.textContent).toBe('/game')
  })

  test('keeps host controls available in the initial lobby', () => {
    session.game = { ...playingGame, phase: 'lobby' }
    session.playerId = 'host-1'

    const page = renderToStaticMarkup(<MemoryRouter><MultiplayerSetupPage /></MemoryRouter>)

    expect(page).toContain('Save composition')
    expect(page).toContain('multiplayer.start')
  })

  test('does not render lobby host controls after the game leaves the lobby', () => {
    session.game = playingGame
    session.playerId = 'host-1'

    const page = renderToStaticMarkup(<MemoryRouter><MultiplayerSetupPage /></MemoryRouter>)

    expect(page).not.toContain('Save composition')
    expect(page).not.toContain('multiplayer.start')
  })
})
