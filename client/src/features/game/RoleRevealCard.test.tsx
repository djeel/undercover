import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, test, vi } from 'vitest'

vi.mock('@astryxdesign/core/Text', () => ({
  Text: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}))

import { RoleRevealCard } from './RoleRevealCard'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const props = {
  open: true,
  identity: { role: 'undercover' as const, word: 'Harbor' },
  roleLabel: 'Undercover',
  roleArt: '/undercover.png',
  roleLabelCaption: 'Role',
  wordLabelCaption: 'Word',
  noWordLabel: 'No word',
  revealLabel: 'Reveal private identity',
  protectLabel: (name: string) => `Protect ${name}`,
}

describe('RoleRevealCard', () => {
  let container: HTMLDivElement
  let root: Root

  afterEach(async () => {
    await act(async () => { root?.unmount() })
    container?.remove()
  })

  test('keeps private identity content out of the DOM until activated', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    await act(async () => { root.render(<RoleRevealCard {...props} />) })

    const reveal = container.querySelector<HTMLButtonElement>('button')
    expect(reveal?.getAttribute('aria-label')).toBe('Reveal private identity')
    expect(container.textContent).not.toContain('Undercover')
    expect(container.textContent).not.toContain('Harbor')
    expect(container.querySelector('.identity-dialog-role-art')).toBeNull()

    await act(async () => { reveal?.click() })
    expect(container.textContent).toContain('Undercover')
    expect(container.textContent).toContain('Harbor')
    expect(container.querySelector<HTMLImageElement>('.identity-dialog-role-art')?.src).toContain('undercover.png')
  })

  test('reveals from the keyboard and resets when closed or identity changes', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    await act(async () => { root.render(<RoleRevealCard {...props} />) })

    const reveal = container.querySelector<HTMLButtonElement>('button')
    await act(async () => { reveal?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })
    await act(async () => { reveal?.click() })
    expect(container.textContent).toContain('Harbor')

    await act(async () => { root.render(<RoleRevealCard {...props} open={false} />) })
    await act(async () => { root.render(<RoleRevealCard {...props} identity={{ role: 'civilian', word: 'Lantern' }} />) })
    expect(container.textContent).not.toContain('Lantern')
    expect(container.querySelector('.identity-dialog-role-art')).toBeNull()
  })
})
