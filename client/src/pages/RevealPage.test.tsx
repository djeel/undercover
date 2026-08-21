import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { useLocalGameStore } from '../features/local-game/local-game-store'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('react-i18next', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-i18next')>(),
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@astryxdesign/core/Button', () => ({
  Button: ({ label, onClick }: { label: string; onClick?: () => void }) => <button aria-label={label} onClick={onClick}>{label}</button>,
}))

vi.mock('@astryxdesign/core/Card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('@astryxdesign/core/Text', () => ({
  Text: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}))

vi.mock('@astryxdesign/core/Dialog', () => ({
  Dialog: ({ children, isOpen }: { children: React.ReactNode; isOpen: boolean }) => isOpen ? <div role="dialog">{children}</div> : null,
  DialogHeader: () => null,
}))

vi.mock('@astryxdesign/core/Layout', () => ({
  Layout: ({ header, content }: { header: React.ReactNode; content: React.ReactNode }) => <>{header}{content}</>,
  LayoutContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import RevealPage from './RevealPage'

const players = [
  { id: 'player-1', displayName: 'Ada', role: 'civilian' as const, word: 'Lantern', alive: true },
  { id: 'player-2', displayName: 'Mina', role: 'civilian' as const, word: 'Lantern', alive: true },
]

function Pathname() {
  return <output>{useLocation().pathname}</output>
}

describe('RevealPage inline role reveal', () => {
  let container: HTMLDivElement
  let root: Root

  const initializeStore = (currentRevealIndex = 0) => {
    useLocalGameStore.setState({
      players,
      phase: 'reveal',
      currentRevealIndex,
      votes: {},
      round: 1,
      civilianWord: 'Lantern',
      protectionAvailable: true,
      lastResolution: null,
      winner: null,
      pendingMrWhiteId: null,
    })
  }

  const renderPage = async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/reveal']}>
          <Routes>
            <Route path="/reveal" element={<RevealPage />} />
            <Route path="/game" element={<Pathname />} />
          </Routes>
        </MemoryRouter>,
      )
    })
  }

  const button = (label: string) => [...container.querySelectorAll('button')].find((element) => element.getAttribute('aria-label') === label) as HTMLButtonElement | undefined

  afterEach(async () => {
    await act(async () => { root?.unmount() })
    container?.remove()
    useLocalGameStore.getState().resetGame()
  })

  test('keeps progression locked until each inline card is revealed', async () => {
    initializeStore()
    await renderPage()

    expect(container.textContent).toContain('reveal.passPhone')
    expect(container.textContent).toContain('Ada')
    expect.soft(container.querySelector('.identity-reveal-card__back')).toBeInstanceOf(HTMLButtonElement)
    expect.soft(container.querySelector('[role="dialog"]')).toBeNull()
    expect.soft(container.textContent).not.toContain('roles.civilian')
    expect.soft(container.textContent).not.toContain('Lantern')
    expect.soft(container.querySelector('.identity-dialog-role-art')).toBeNull()
    expect.soft(button('reveal.nextPlayer')).toBeUndefined()

    const firstCard = container.querySelector('.identity-reveal-card__back')
    if (!(firstCard instanceof HTMLButtonElement)) return

    await act(async () => { firstCard.click() })

    expect(container.textContent).toContain('roles.civilian')
    expect(container.textContent).toContain('Lantern')
    expect(button('reveal.nextPlayer')).toBeInstanceOf(HTMLButtonElement)

    await act(async () => { button('reveal.nextPlayer')?.click() })

    expect(useLocalGameStore.getState().currentRevealIndex).toBe(1)
    expect(container.textContent).toContain('Mina')
    expect(container.querySelector('.identity-reveal-card__back')).toBeInstanceOf(HTMLButtonElement)
    expect(container.querySelector('.identity-reveal-card')?.classList.contains('is-revealed')).toBe(false)
    expect(container.textContent).not.toContain('roles.civilian')
    expect(container.textContent).not.toContain('Lantern')
    expect(container.querySelector('.identity-dialog-role-art')).toBeNull()
    expect(button('reveal.nextPlayer')).toBeUndefined()
  })

  test('starts discussion only after the last inline card is revealed', async () => {
    initializeStore(1)
    await renderPage()

    expect(container.textContent).toContain('Mina')
    expect.soft(button('reveal.startDiscussion')).toBeUndefined()

    const lastCard = container.querySelector('.identity-reveal-card__back')
    expect(lastCard).toBeInstanceOf(HTMLButtonElement)
    if (!(lastCard instanceof HTMLButtonElement)) return

    await act(async () => { lastCard.click() })

    expect(container.textContent).toContain('roles.civilian')
    expect(container.textContent).toContain('Lantern')
    expect(button('reveal.startDiscussion')).toBeInstanceOf(HTMLButtonElement)

    await act(async () => { button('reveal.startDiscussion')?.click() })

    expect(useLocalGameStore.getState().phase).toBe('playing')
    expect(container.textContent).toContain('/game')
  })
})
