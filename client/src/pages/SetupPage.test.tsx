import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { useLocalGameStore } from '../features/local-game/local-game-store'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('react-i18next', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-i18next')>(),
  useTranslation: () => ({ t: (key: string, values?: { role?: string }) => values?.role ? `${key}:${values.role}` : key }),
}))

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('@astryxdesign/core/Button', () => ({
  Button: ({ label, icon, isDisabled, onClick, className }: { label: string; icon?: React.ReactNode; isDisabled?: boolean; onClick?: () => void; className?: string }) => <button aria-label={label} className={className} disabled={isDisabled} onClick={onClick}>{icon}</button>,
}))
vi.mock('@astryxdesign/core/Card', () => ({ Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }))
vi.mock('@astryxdesign/core/TextInput', () => ({ TextInput: () => <input type="text" /> }))
vi.mock('@astryxdesign/core/Text', () => ({ Text: ({ children }: { children: React.ReactNode }) => <p>{children}</p> }))
vi.mock('lucide-react', () => ({ Minus: () => null, Plus: () => null, Trash2: () => null }))

import SetupPage from './SetupPage'

const players = (count: number) => Array.from({ length: count }, (_, index) => ({
  id: `player-${index}`,
  displayName: `Player ${index}`,
  role: 'civilian' as const,
  word: null,
  alive: true,
}))

const label = (action: 'increaseRole' | 'decreaseRole', key: string) => `setup.${action}:roles.${key.replace('Count', '')}`

describe('SetupPage role counters', () => {
  let container: HTMLDivElement
  let root: Root

  afterEach(async () => {
    await act(async () => { root?.unmount() })
    container?.remove()
    useLocalGameStore.getState().resetGame()
  })

  test('increments and decrements roles without exceeding their composition bounds', async () => {
    useLocalGameStore.setState({
      phase: 'setup',
      players: players(5),
      config: { civilianWord: '', undercoverWord: '', undercoverCount: 1, mrWhiteCount: 0, jesterCount: 0, bodyguardCount: 0 },
    })
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => { root.render(<SetupPage />) })

    const button = (buttonLabel: string) => [...container.querySelectorAll('button')].find((element) => element.getAttribute('aria-label') === buttonLabel) as HTMLButtonElement
    const undercoverDecrease = button(label('decreaseRole', 'undercoverCount'))
    const mrWhiteIncrease = button(label('increaseRole', 'mrWhiteCount'))
    const bodyguardIncrease = button(label('increaseRole', 'bodyguardCount'))

    expect(container.querySelector('input[type="number"]')).toBeNull()
    expect(undercoverDecrease.disabled).toBe(true)
    expect(mrWhiteIncrease.className).toContain('min-h-11')
    expect(mrWhiteIncrease.className).toContain('min-w-11')

    await act(async () => { mrWhiteIncrease.click() })
    expect(useLocalGameStore.getState().config.mrWhiteCount).toBe(1)

    await act(async () => { bodyguardIncrease.click() })
    expect(useLocalGameStore.getState().config.bodyguardCount).toBe(1)
    expect(button(label('increaseRole', 'bodyguardCount')).disabled).toBe(true)

    await act(async () => { button(label('decreaseRole', 'mrWhiteCount')).click() })
    expect(useLocalGameStore.getState().config.mrWhiteCount).toBe(0)

    await act(async () => { button(label('increaseRole', 'jesterCount')).click() })
    expect(useLocalGameStore.getState().config.jesterCount).toBe(1)
    expect(button(label('increaseRole', 'mrWhiteCount')).disabled).toBe(true)
  })
})
