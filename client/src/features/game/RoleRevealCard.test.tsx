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
  wordLabelCaption: 'Word',
  noWordLabel: 'No word',
  cardBackArt: '/card.png',
  revealLabel: 'Reveal private identity',
  holdLabel: 'Press and hold to reveal',
  memorizeLabel: 'Memorize your identity before passing the device.',
  protectLabel: (name: string) => `Protect ${name}`,
}

function CommitProbe({ onCommit }: { onCommit: () => void }) {
  useLayoutEffect(() => { onCommit() })
  return null
}

function dispatchPointer(target: Element, type: string, pointerType = 'touch') {
  const event = new Event(type, { bubbles: true })
  Object.defineProperty(event, 'pointerType', { value: pointerType })
  target.dispatchEvent(event)
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
    vi.useRealTimers()
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

  test('signals a desktop reveal exactly once', async () => {
    const onReveal = vi.fn()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    await act(async () => { root.render(<RoleRevealCard {...props} onReveal={onReveal} />) })

    const reveal = container.querySelector<HTMLButtonElement>('button')
    await act(async () => {
      reveal?.click()
      reveal?.click()
    })

    expect(container.textContent).toContain('Harbor')
    expect(onReveal).toHaveBeenCalledTimes(1)
  })

  test('signals a completed touch hold exactly once and ignores its synthetic click', async () => {
    vi.useFakeTimers()
    const onReveal = vi.fn()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    await act(async () => { root.render(<RoleRevealCard {...props} onReveal={onReveal} />) })

    const reveal = container.querySelector<HTMLButtonElement>('button')
    await act(async () => {
      if (reveal) dispatchPointer(reveal, 'pointerdown')
      await vi.advanceTimersByTimeAsync(700)
    })
    await act(async () => { reveal?.click() })

    expect(container.textContent).toContain('Harbor')
    expect(onReveal).toHaveBeenCalledTimes(1)
  })

  test.each(['pointerup', 'pointercancel', 'pointerleave'])('does not reveal when a touch hold ends with %s before 700ms', async (endEvent) => {
    vi.useFakeTimers()
    const onReveal = vi.fn()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    await act(async () => { root.render(<RoleRevealCard {...props} onReveal={onReveal} />) })

    const reveal = container.querySelector<HTMLButtonElement>('button')
    await act(async () => {
      if (reveal) dispatchPointer(reveal, 'pointerdown')
      await vi.advanceTimersByTimeAsync(699)
      if (reveal) dispatchPointer(reveal, endEvent === 'pointerleave' ? 'pointerout' : endEvent)
      await vi.advanceTimersByTimeAsync(1)
    })

    expect(container.textContent).not.toContain('Harbor')
    expect(onReveal).not.toHaveBeenCalled()
  })

  test('clears quick-touch click suppression after the synthetic click window', async () => {
    vi.useFakeTimers()
    const onReveal = vi.fn()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    await act(async () => { root.render(<RoleRevealCard {...props} onReveal={onReveal} />) })

    const reveal = container.querySelector<HTMLButtonElement>('button')
    await act(async () => {
      if (reveal) dispatchPointer(reveal, 'pointerdown')
      if (reveal) dispatchPointer(reveal, 'pointerup')
      await vi.advanceTimersByTimeAsync(0)
      reveal?.click()
    })

    expect(container.textContent).toContain('Harbor')
    expect(onReveal).toHaveBeenCalledTimes(1)
  })

  test.each(['pointercancel', 'pointerleave'])('clears touch click suppression immediately after %s', async (endEvent) => {
    vi.useFakeTimers()
    const onReveal = vi.fn()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    await act(async () => { root.render(<RoleRevealCard {...props} onReveal={onReveal} />) })

    const reveal = container.querySelector<HTMLButtonElement>('button')
    await act(async () => {
      if (reveal) dispatchPointer(reveal, 'pointerdown')
      if (reveal) dispatchPointer(reveal, endEvent === 'pointerleave' ? 'pointerout' : endEvent)
      reveal?.click()
    })

    expect(container.textContent).toContain('Harbor')
    expect(onReveal).toHaveBeenCalledTimes(1)
  })

  test('does not carry touch click suppression into a new lifecycle', async () => {
    vi.useFakeTimers()
    const onReveal = vi.fn()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    await act(async () => { root.render(<RoleRevealCard {...props} onReveal={onReveal} />) })

    const reveal = container.querySelector<HTMLButtonElement>('button')
    await act(async () => {
      if (reveal) dispatchPointer(reveal, 'pointerdown')
      root.render(<RoleRevealCard {...props} identity={{ role: 'civilian', word: 'Lantern' }} roleLabel="Civilian" onReveal={onReveal} />)
    })
    await act(async () => { container.querySelector<HTMLButtonElement>('button')?.click() })

    expect(container.textContent).toContain('Civilian')
    expect(container.textContent).toContain('Lantern')
    expect(onReveal).toHaveBeenCalledTimes(1)
  })

  test('resets privacy for identities whose old colon fingerprints collide', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const firstIdentity = { role: 'bodyguard' as const, word: 'a:b', bodyguardTargetName: 'c' }
    const secondIdentity = { role: 'bodyguard' as const, word: 'a', bodyguardTargetName: 'b:c' }
    await act(async () => { root.render(<RoleRevealCard {...props} identity={firstIdentity} roleLabel="Bodyguard" />) })

    await act(async () => { container.querySelector<HTMLButtonElement>('button')?.click() })
    expect(container.textContent).toContain('a:b')
    expect(container.textContent).toContain('Protect c')

    let commitText = ''
    await act(async () => {
      root.render(<><RoleRevealCard {...props} identity={secondIdentity} roleLabel="Bodyguard" /><CommitProbe onCommit={() => { commitText = container.textContent ?? '' }} /></>)
    })

    expect(commitText).not.toContain('Bodyguard')
    expect(commitText).not.toContain('Protect b:c')
    expect(container.querySelector('.identity-dialog-role-art')).toBeNull()
  })

  test('hides private content before commit without canceling hold timers during render', async () => {
    vi.useFakeTimers()
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    await act(async () => { root.render(<RoleRevealCard {...props} />) })

    await act(async () => { container.querySelector<HTMLButtonElement>('button')?.click() })
    const reveal = container.querySelector<HTMLButtonElement>('button')
    await act(async () => { if (reveal) dispatchPointer(reveal, 'pointerdown') })

    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')
    let commitText = ''
    let cancellationsAtCommit = -1
    await act(async () => {
      root.render(<><RoleRevealCard {...props} identity={{ role: 'civilian', word: 'Lantern' }} roleLabel="Civilian" /><CommitProbe onCommit={() => {
        commitText = container.textContent ?? ''
        cancellationsAtCommit = clearTimeoutSpy.mock.calls.length
      }} /></>)
    })

    expect(commitText).not.toContain('Harbor')
    expect(commitText).not.toContain('Lantern')
    expect(cancellationsAtCommit).toBe(0)
    clearTimeoutSpy.mockRestore()
  })

  test('activates from Enter without a programmatic click', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    await act(async () => { root.render(<RoleRevealCard {...props} />) })

    const reveal = container.querySelector<HTMLButtonElement>('button')
    await act(async () => { reveal?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })) })
    expect(container.textContent).toContain('Harbor')
  })

  test('resets before native keyboard activation after reopen', async () => {
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
