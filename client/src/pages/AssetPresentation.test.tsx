import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, test, vi } from 'vitest'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('react-router-dom', () => ({
  Link: ({ children, className }: { children: React.ReactNode; className?: string }) => <a className={className}>{children}</a>,
}))

vi.mock('@astryxdesign/core/Card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
}))

vi.mock('@astryxdesign/core/Text', () => ({
  Text: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}))

vi.mock('@astryxdesign/core/Dialog', () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: () => null,
}))

vi.mock('@astryxdesign/core/Layout', () => ({
  Layout: ({ content }: { content: React.ReactNode }) => <>{content}</>,
  LayoutContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import PlayPage from './PlayPage'
import AccountPage from './AccountPage'
import { IdentityDialog } from '../features/game/IdentityDialog'

describe('noir asset presentation', () => {
  let container: HTMLDivElement
  let root: Root

  afterEach(async () => {
    await act(async () => { root?.unmount() })
    container?.remove()
  })

  test('renders decorative imported art for the two play modes', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => { root.render(<PlayPage />) })

    const art = [...container.querySelectorAll<HTMLImageElement>('.mode-action-card__art')]
    expect(art).toHaveLength(2)
    expect(art.map((image) => image.getAttribute('alt'))).toEqual(['', ''])
    expect(art.map((image) => image.getAttribute('src'))).toEqual(expect.arrayContaining([
      expect.stringContaining('local.png'),
      expect.stringContaining('multiplayer.png'),
    ]))
  })

  test('renders decorative supplied art for account destinations', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => { root.render(<AccountPage />) })

    const art = [...container.querySelectorAll<HTMLImageElement>('.mode-action-card__art')]
    expect(art).toHaveLength(2)
    expect(art.map((image) => image.getAttribute('alt'))).toEqual(['', ''])
    expect(art.map((image) => image.getAttribute('aria-hidden'))).toEqual(['true', 'true'])
    expect(art.map((image) => image.getAttribute('src'))).toEqual(expect.arrayContaining([
      expect.stringContaining('profile.png'),
      expect.stringContaining('settings.png'),
    ]))
  })

  test.each([
    ['civilian', 'civilians.png'],
    ['undercover', 'undercover.png'],
    ['mr_white', 'mrwhite.png'],
    ['jester', 'jester.png'],
    ['bodyguard', 'bodyguard.png'],
  ] as const)('maps the %s identity to its supplied role image', async (role, asset) => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => { root.render(<IdentityDialog open onClose={() => undefined} identity={{ role, word: 'word' }} />) })

    const reveal = container.querySelector<HTMLButtonElement>('.identity-reveal-card__back')
    await act(async () => { reveal?.click() })
    const image = container.querySelector<HTMLImageElement>('.identity-dialog-role-art')
    expect(image?.getAttribute('alt')).toBe('')
    expect(image?.getAttribute('aria-hidden')).toBe('true')
    expect(image?.getAttribute('src')).toContain(asset)
  })
})
