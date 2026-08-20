import { act, useLayoutEffect } from 'react'
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
  backArt: '/card.png',
  wordLabelCaption: 'Word',
  noWordLabel: 'No word',
  revealLabel: 'Reveal private identity',
  holdLabel: 'Press and hold to reveal',
  instructionLabel: 'Memorize your identity before passing the device.',
  protectLabel: (name: string) => `Protect ${name}`,
}

function CommitProbe({ onCommit }: { onCommit: () => void }) {
  useLayoutEffect(() => { onCommit() })
  return null
}


describe('RoleRevealCard', () => {
  let container: HTMLDivElement
  let root: Root
async function renderCard() {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => { root.render(<RoleRevealCard {...props} />) })
}

  afterEach(async () => {
    vi.useRealTimers()
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

  test('reveals from mouse click and native keyboard activation', async () => {
    await renderCard()
    const button = container.querySelector<HTMLButtonElement>('.identity-reveal-card__back')!

    await act(async () => { button.click() })
    expect(container.textContent).toContain('Harbor')

    await act(async () => { root.render(<RoleRevealCard {...props} open={false} />) })
    await act(async () => { root.render(<RoleRevealCard {...props} />) })
    const resetButton = container.querySelector<HTMLButtonElement>('.identity-reveal-card__back')!
    await act(async () => {
      resetButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(container.textContent).toContain('Harbor')
  })

  test('requires a completed touch hold and cancels early release', async () => {
    vi.useFakeTimers()
    await renderCard()
    const button = container.querySelector<HTMLButtonElement>('.identity-reveal-card__back')!

    await act(async () => {
      button.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch', bubbles: true }))
      vi.advanceTimersByTime(500)
      button.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, pointerType: 'touch', bubbles: true }))
      vi.runAllTimers()
    })
    expect(container.textContent).not.toContain('Harbor')

    await act(async () => {
      button.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 2, pointerType: 'touch', bubbles: true }))
      vi.advanceTimersByTime(700)
    })
    expect(container.textContent).toContain('Harbor')
  })

  test('cancels touch hold on pointer cancellation and lifecycle reset', async () => {
    vi.useFakeTimers()
    await renderCard()
    const button = container.querySelector<HTMLButtonElement>('.identity-reveal-card__back')!

    await act(async () => {
      button.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 3, pointerType: 'touch', bubbles: true }))
      button.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 3, pointerType: 'touch', bubbles: true }))
      vi.runAllTimers()
    })
    expect(container.textContent).not.toContain('Harbor')

    await act(async () => {
      button.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 4, pointerType: 'touch', bubbles: true }))
      root.render(<RoleRevealCard {...props} identity={{ role: 'civilian', word: 'Lantern' }} roleLabel="Civilian" />)
      vi.runAllTimers()
    })
    expect(container.textContent).not.toContain('Harbor')
    expect(container.textContent).not.toContain('Lantern')
  })

  test('removes private content before lifecycle changes commit', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    await act(async () => { root.render(<RoleRevealCard {...props} />) })

    await act(async () => { container.querySelector<HTMLButtonElement>('button')?.click() })
    expect(container.textContent).toContain('Harbor')

    let commitText = ''
    const captureCommit = () => { commitText = container.textContent ?? '' }

    await act(async () => { root.render(<><RoleRevealCard {...props} open={false} /><CommitProbe onCommit={captureCommit} /></>) })
    expect(commitText).not.toContain('Harbor')
    expect(container.querySelector('.identity-dialog-role-art')).toBeNull()

    await act(async () => { root.render(<><RoleRevealCard {...props} /><CommitProbe onCommit={captureCommit} /></>) })
    expect(commitText).not.toContain('Harbor')
    expect(container.querySelector('.identity-dialog-role-art')).toBeNull()

    await act(async () => { container.querySelector<HTMLButtonElement>('button')?.click() })
    await act(async () => { root.render(<><RoleRevealCard {...props} identity={{ role: 'civilian', word: 'Lantern' }} roleLabel="Civilian" /><CommitProbe onCommit={captureCommit} /></>) })
    expect(commitText).not.toContain('Harbor')
    expect(commitText).not.toContain('Civilian')
    expect(commitText).not.toContain('Lantern')
    expect(container.querySelector('.identity-dialog-role-art')).toBeNull()
  })
})
