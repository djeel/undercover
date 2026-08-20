import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, test, vi } from 'vitest'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const auth = vi.hoisted(() => ({
  listener: undefined as ((event: string, session: unknown) => void) | undefined,
  signInAnonymously: vi.fn(),
}))

const game = vi.hoisted(() => ({
  clear: vi.fn(),
  startRealtime: vi.fn(),
  stopRealtime: vi.fn(),
}))

vi.mock('../../lib/supabase', () => ({
  supabaseConfigurationError: null,
  supabase: {
    realtime: {},
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn((listener: (event: string, session: unknown) => void) => {
        auth.listener = listener
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      }),
      signInAnonymously: auth.signInAnonymously,
      signOut: vi.fn(),
      linkIdentity: vi.fn(),
      signInWithOAuth: vi.fn(),
      exchangeCodeForSession: vi.fn(),
    },
  },
}))

vi.mock('../../lib/api-client', () => ({
  api: {},
  configureApiTokenProvider: vi.fn(),
}))

vi.mock('../game/game-store', () => ({
  realtimeForGame: vi.fn(() => ({})),
  useGameStore: { getState: () => game },
}))

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }))
vi.mock('@capacitor/app', () => ({ App: {} }))
vi.mock('@capacitor/browser', () => ({ Browser: {} }))

import { supabase } from '../../lib/supabase'
import { AuthProvider, useAuth } from './AuthProvider'

const authenticatedSession = { access_token: 'authenticated-token', user: { id: 'account-a', is_anonymous: false } }
const secondAuthenticatedSession = { access_token: 'second-authenticated-token', user: { id: 'account-b', is_anonymous: false } }
const anonymousSession = { access_token: 'anonymous-token', user: { id: 'anonymous', is_anonymous: true } }

function SessionProbe() {
  const { session } = useAuth()
  return <output>{session?.access_token ?? 'none'}</output>
}

describe('AuthProvider auth loss', () => {
  let container: HTMLDivElement
  let root: Root

  afterEach(async () => {
    await act(async () => { root?.unmount() })
    container?.remove()
    vi.clearAllMocks()
    auth.listener = undefined
  })

  test('stops realtime and clears the private game before replacing an externally lost session anonymously', async () => {
    const resolution: string[] = []
    game.stopRealtime.mockImplementation(async () => { resolution.push('stopped') })
    game.clear.mockImplementation(() => { resolution.push('cleared') })
    auth.signInAnonymously.mockImplementation(async () => {
      resolution.push('anonymous')
      return { data: { session: anonymousSession }, error: null }
    })

    vi.mocked(supabase!.auth.getSession).mockResolvedValue({ data: { session: authenticatedSession }, error: null } as never)
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => { root.render(<AuthProvider><SessionProbe /></AuthProvider>) })
    await act(async () => { await Promise.resolve() })
    expect(container.textContent).toBe('authenticated-token')

    await act(async () => {
      auth.listener!('SIGNED_OUT', null)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(resolution).toEqual(['stopped', 'cleared', 'anonymous'])
    expect(container.textContent).toBe('anonymous-token')
  })

  test('stops realtime and clears account A game data before accepting a direct authenticated account B session', async () => {
    const resolution: string[] = []
    let resolveStop!: () => void
    game.stopRealtime.mockImplementation(() => new Promise<void>((resolve) => {
      resolveStop = () => {
        resolution.push('stopped')
        resolve()
      }
    }))
    game.clear.mockImplementation(() => { resolution.push('cleared') })
    vi.mocked(supabase!.auth.getSession).mockResolvedValue({ data: { session: authenticatedSession }, error: null } as never)
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => { root.render(<AuthProvider><SessionProbe /></AuthProvider>) })
    await act(async () => { await Promise.resolve() })
    expect(container.textContent).toBe('authenticated-token')

    await act(async () => {
      auth.listener!('SIGNED_IN', secondAuthenticatedSession)
      await Promise.resolve()
    })

    expect(resolution).toEqual([])
    expect(container.textContent).toBe('authenticated-token')

    await act(async () => {
      resolveStop()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(resolution).toEqual(['stopped', 'cleared'])
    expect(container.textContent).toBe('second-authenticated-token')
  })
  test('updates an authenticated session token without clearing game state when the user ID is unchanged', async () => {
    const refreshedSession = { access_token: 'refreshed-authenticated-token', user: { id: 'account-a', is_anonymous: false } }
    vi.mocked(supabase!.auth.getSession).mockResolvedValue({ data: { session: authenticatedSession }, error: null } as never)
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => { root.render(<AuthProvider><SessionProbe /></AuthProvider>) })
    await act(async () => { await Promise.resolve() })
    expect(container.textContent).toBe('authenticated-token')

    await act(async () => {
      auth.listener!('TOKEN_REFRESHED', refreshedSession)
      await Promise.resolve()
    })

    expect(container.textContent).toBe('refreshed-authenticated-token')
    expect(game.stopRealtime).not.toHaveBeenCalled()
    expect(game.clear).not.toHaveBeenCalled()
  })
  test('stops realtime and clears account A game data before accepting a direct anonymous account B session', async () => {
    const resolution: string[] = []
    let resolveStop!: () => void
    game.stopRealtime.mockImplementation(() => new Promise<void>((resolve) => {
      resolveStop = () => {
        resolution.push('stopped')
        resolve()
      }
    }))
    game.clear.mockImplementation(() => { resolution.push('cleared') })
    vi.mocked(supabase!.auth.getSession).mockResolvedValue({ data: { session: authenticatedSession }, error: null } as never)
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => { root.render(<AuthProvider><SessionProbe /></AuthProvider>) })
    await act(async () => { await Promise.resolve() })
    expect(container.textContent).toBe('authenticated-token')

    await act(async () => {
      auth.listener!('SIGNED_IN', anonymousSession)
      await Promise.resolve()
    })

    expect(resolution).toEqual([])
    expect(container.textContent).toBe('authenticated-token')

    await act(async () => {
      resolveStop()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(resolution).toEqual(['stopped', 'cleared'])
    expect(container.textContent).toBe('anonymous-token')
  })
})
