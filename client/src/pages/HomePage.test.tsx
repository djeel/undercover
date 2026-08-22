import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, test, vi } from 'vitest'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => 'seen' } })

const memberData = vi.hoisted(() => ({
  isAnonymous: false,
  userId: 'account-a',
  selectorInputs: [] as Array<{ isAnonymous: boolean; friends: unknown[]; stats: unknown }>,
  getFriends: vi.fn(),
  getStats: vi.fn(),
}))

vi.mock('../features/auth', () => ({
  useAuth: () => ({ isAnonymous: memberData.isAnonymous, isLoading: false, user: { id: memberData.userId } }),
}))

vi.mock('../features/game/game-store', () => ({
  useGameStore: (selector: (state: { game: null }) => unknown) => selector({ game: null }),
}))

vi.mock('../features/local-game/local-game-store', () => ({
  useLocalGameStore: (selector: (state: { phase: 'idle' }) => unknown) => selector({ phase: 'idle' }),
}))

vi.mock('../features/dashboard/dashboard-state', () => ({
  getDashboardState: (input: { isAnonymous: boolean; friends: unknown[]; stats: unknown }) => {
    memberData.selectorInputs.push(input)
    return {
      showMemberSections: false,
      acceptedFriendCount: 0,
      stats: null,
      recentResults: [],
      resumeGame: null,
    }
  },
}))

vi.mock('../lib/api-client', () => ({
  api: {
    getFriends: memberData.getFriends,
    getStats: memberData.getStats,
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}))

vi.mock('react-router-dom', () => ({
  Link: ({ children, className, to }: { children: React.ReactNode; className?: string; to: string }) => <a className={className} href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams()],
}))

vi.mock('@astryxdesign/core/Button', () => ({ Button: ({ label }: { label: string }) => <button>{label}</button> }))
vi.mock('@astryxdesign/core/Card', () => ({ Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
vi.mock('@astryxdesign/core/Text', () => ({ Text: ({ children }: { children: React.ReactNode }) => <p>{children}</p> }))
vi.mock('lucide-react', () => ({ Clock3: () => null, DoorOpen: () => null, Play: () => null, Plus: () => null, UsersRound: () => null }))

import HomePage from './HomePage'

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((next) => { resolve = next })
  return { promise, resolve }
}

const accountAFriends = [{ profileId: 'friend-a', requestedBy: 'account-a', status: 'accepted' as const }]
const accountAStats = {
  gamesPlayed: 8,
  gamesWon: 5,
  gamesLost: 3,
  currentWinStreak: 1,
  bestWinStreak: 3,
  roles: [],
  results: [],
}

describe('HomePage account transitions', () => {
  let container: HTMLDivElement
  let root: Root

  afterEach(async () => {
    await act(async () => { root?.unmount() })
    container?.remove()
    memberData.userId = 'account-a'
    memberData.isAnonymous = false
    memberData.selectorInputs = []
    vi.clearAllMocks()
  })

  test('renders one full-card local launch action without Home multiplayer actions', async () => {
    memberData.isAnonymous = true
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => { root.render(<HomePage />) })

    const launchLinks = [...container.querySelectorAll<HTMLAnchorElement>('.primary-action-card__link')]
    const actionCard = launchLinks[0]?.closest('section')
    const titleId = actionCard?.getAttribute('aria-labelledby')
    const art = launchLinks[0]?.querySelector<HTMLImageElement>('.action-card__art')

    expect(launchLinks).toHaveLength(1)
    expect(launchLinks[0]?.getAttribute('href')).toBe('/setup')
    expect(launchLinks[0]?.textContent).toContain('dashboard.localTitle')
    expect(launchLinks[0]?.textContent).not.toContain('dashboard.startLocal')
    expect(launchLinks[0]?.querySelector('button')).toBeNull()
    expect(titleId).toBe('local-play-title')
    expect(actionCard?.querySelector(`#${titleId}`)?.textContent).toBe('dashboard.localTitle')
    expect(art?.getAttribute('src')).toContain('local.png')
    expect(art?.getAttribute('alt')).toBe('')
    expect(art?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('.dashboard-online-play')).toBeNull()
    expect(container.textContent).not.toContain('dashboard.createRoom')
    expect(container.textContent).not.toContain('dashboard.joinRoom')
  })
  test('does not render account A dashboard data during a direct authenticated switch to account B', async () => {
    const firstFriends = deferred<typeof accountAFriends>()
    const firstStats = deferred<typeof accountAStats>()
    const secondFriends = deferred<typeof accountAFriends>()
    const secondStats = deferred<typeof accountAStats>()
    memberData.getFriends.mockReturnValueOnce(firstFriends.promise).mockReturnValueOnce(secondFriends.promise)
    memberData.getStats.mockReturnValueOnce(firstStats.promise).mockReturnValueOnce(secondStats.promise)

    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => { root.render(<HomePage />) })
    await act(async () => {
      firstFriends.resolve(accountAFriends)
      firstStats.resolve(accountAStats)
      await Promise.resolve()
    })

    memberData.selectorInputs = []
    memberData.userId = 'account-b'
    await act(async () => { root.render(<HomePage />) })

    const accountBDashboardInputs = memberData.selectorInputs.filter(({ isAnonymous }) => !isAnonymous)
    expect(memberData.getFriends).toHaveBeenCalledTimes(2)
    expect(memberData.getStats).toHaveBeenCalledTimes(2)
    expect(accountBDashboardInputs).not.toHaveLength(0)
    expect(accountBDashboardInputs.every(({ friends, stats }) => friends.length === 0 && stats === null)).toBe(true)
  })

  test('clears account A member data before rendering an authenticated account B dashboard after an anonymous transition', async () => {
    const firstFriends = deferred<typeof accountAFriends>()
    const firstStats = deferred<typeof accountAStats>()
    const secondFriends = deferred<typeof accountAFriends>()
    const secondStats = deferred<typeof accountAStats>()
    memberData.getFriends.mockReturnValueOnce(firstFriends.promise).mockReturnValueOnce(secondFriends.promise)
    memberData.getStats.mockReturnValueOnce(firstStats.promise).mockReturnValueOnce(secondStats.promise)

    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => { root.render(<HomePage />) })
    await act(async () => {
      firstFriends.resolve(accountAFriends)
      firstStats.resolve(accountAStats)
      await Promise.resolve()
    })

    memberData.isAnonymous = true
    await act(async () => { root.render(<HomePage />) })

    memberData.selectorInputs = []
    memberData.isAnonymous = false
    memberData.userId = 'account-b'
    await act(async () => { root.render(<HomePage />) })

    const accountBDashboardInputs = memberData.selectorInputs.filter(({ isAnonymous }) => !isAnonymous)
    expect(accountBDashboardInputs).not.toHaveLength(0)
    expect(accountBDashboardInputs.every(({ friends, stats }) => friends.length === 0 && stats === null)).toBe(true)
  })
})
