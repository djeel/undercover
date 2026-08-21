import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, test, vi } from 'vitest'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const store = vi.hoisted(() => {
  const eliminatePlayer = vi.fn()
  return {
    eliminatePlayer,
    navigate: vi.fn(),
    localState: {
      phase: 'playing' as const,
      players: [
        { id: 'player-1', displayName: 'Ada', role: 'civilian' as const, word: 'Coffee', alive: true },
        { id: 'player-2', displayName: 'Blaise', role: 'undercover' as const, word: 'Tea', alive: true },
        { id: 'player-3', displayName: 'Cécile', role: 'civilian' as const, word: 'Coffee', alive: false },
      ],
      winner: null,
      round: 2,
      votes: {},
      lastResolution: null,
      pendingMrWhiteId: null,
      submitMrWhiteGuess: vi.fn(),
      eliminatePlayer,
    },
    onlineState: { game: null, playerId: null },
  }
})

vi.mock('react-router-dom', async (importOriginal) => {
  const original = await importOriginal<typeof import('react-router-dom')>()
  return { ...original, useNavigate: () => store.navigate }
})

vi.mock('react-i18next', async (importOriginal) => {
  const original = await importOriginal<typeof import('react-i18next')>()
  return {
    ...original,
    useTranslation: () => ({
      t: (key: string, values?: { name?: string }) => values?.name ? `${key}:${values.name}` : key,
    }),
  }
})

vi.mock('../features/local-game/local-game-store', () => ({
  useLocalGameStore: (selector: (state: typeof store.localState) => unknown) => selector(store.localState),
}))

vi.mock('../features/game/game-store', () => ({
  useGameStore: (selector: (state: typeof store.onlineState) => unknown) => selector(store.onlineState),
}))

vi.mock('@astryxdesign/core/Button', () => ({
  Button: ({ label, onClick, isDisabled, className }: { label: string; onClick?: () => void; isDisabled?: boolean; className?: string }) => (
    <button type="button" aria-label={label} className={className} disabled={isDisabled} onClick={onClick}>{label}</button>
  ),
}))

vi.mock('@astryxdesign/core/Card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@astryxdesign/core/TextInput', () => ({
  TextInput: ({ label }: { label: string }) => <input aria-label={label} />,
}))

vi.mock('@astryxdesign/core/Text', () => ({
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

vi.mock('@astryxdesign/core/AlertDialog', () => ({
  AlertDialog: ({ isOpen, title, description, cancelLabel, actionLabel, onOpenChange, onAction }: { isOpen: boolean; title: string; description: string; cancelLabel: string; actionLabel: string; onOpenChange: (isOpen: boolean) => void; onAction: () => void }) => isOpen ? (
    <div role="dialog">
      <h2>{title}</h2>
      <p>{description}</p>
      <button type="button" aria-label={cancelLabel} onClick={() => onOpenChange(false)}>{cancelLabel}</button>
      <button type="button" aria-label={actionLabel} onClick={onAction}>{actionLabel}</button>
    </div>
  ) : null,
}))

vi.mock('../features/game/IdentityDialog', () => ({
  IdentityDialog: ({ open, identity }: { open: boolean; identity: { role: string; word: string | null } }) => open ? <output data-testid="identity-dialog">{identity.role}|{identity.word}</output> : null,
}))


vi.mock('lucide-react', () => ({ Vote: () => null }))

import GamePage from './GamePage'

describe('GamePage local player actions', () => {
  let container: HTMLDivElement
  let root: Root

  const renderPage = async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    await act(async () => { root.render(<GamePage />) })
  }

  const buttons = () => [...container.querySelectorAll('button')]
  const button = (label: string) => buttons().find((element) => element.getAttribute('aria-label') === label) as HTMLButtonElement | undefined
  const playerTrigger = (name: string) => buttons().find((element) => element.textContent?.includes(name)) as HTMLButtonElement | undefined

  afterEach(async () => {
    await act(async () => { root?.unmount() })
    container?.remove()
    store.eliminatePlayer.mockClear()
    store.navigate.mockClear()
  })

  test('uses one expanded player card without dropdowns or local ballot controls', async () => {
    await renderPage()

    expect(container.querySelector('select')).toBeNull()
    expect(container.textContent).not.toContain('game.openVoting')
    expect(container.textContent).not.toContain('game.votesRecorded')

    await act(async () => { playerTrigger('Ada')?.click() })

    expect(button('game.viewRole')).toBeInstanceOf(HTMLButtonElement)
    expect(button('game.voteFor')).toBeInstanceOf(HTMLButtonElement)
    expect(playerTrigger('Ada')?.getAttribute('aria-expanded')).toBe('true')

    await act(async () => { playerTrigger('Blaise')?.click() })

    expect(playerTrigger('Ada')?.getAttribute('aria-expanded')).toBe('false')
    expect(playerTrigger('Blaise')?.getAttribute('aria-expanded')).toBe('true')
    expect(buttons().filter((element) => element.getAttribute('aria-label') === 'game.viewRole')).toHaveLength(1)
  })

  test('opens the selected player private identity', async () => {
    await renderPage()

    await act(async () => { playerTrigger('Blaise')?.click() })
    await act(async () => { button('game.viewRole')?.click() })

    expect(container.querySelector('[data-testid="identity-dialog"]')?.textContent).toBe('undercover|Tea')
  })

  test('confirms before eliminating the selected player and cancel preserves state', async () => {
    await renderPage()

    await act(async () => { playerTrigger('Blaise')?.click() })
    await act(async () => { button('game.voteFor')?.click() })

    expect(store.eliminatePlayer).not.toHaveBeenCalled()
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain('game.confirmEliminationTitle:Blaise')

    await act(async () => { button('common.cancel')?.click() })

    expect(store.eliminatePlayer).not.toHaveBeenCalled()
    expect(container.querySelector('[role="dialog"]')).toBeNull()

    await act(async () => { button('game.voteFor')?.click() })
    await act(async () => { button('game.confirmElimination')?.click() })

    expect(store.eliminatePlayer).toHaveBeenCalledTimes(1)
    expect(store.eliminatePlayer).toHaveBeenCalledWith('player-2')
  })

  test('does not expose actions for eliminated cards', async () => {
    await renderPage()

    const eliminated = playerTrigger('Cécile')
    expect(eliminated?.disabled).toBe(true)
    expect(eliminated?.getAttribute('aria-expanded')).toBe('false')
    expect(container.querySelector('#player-actions-player-3')).toBeNull()
  })
})
