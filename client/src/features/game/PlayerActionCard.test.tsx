import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, test, vi } from 'vitest'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@astryxdesign/core/Button', () => ({
  Button: ({ label, className, isDisabled, onClick }: { label: string; className?: string; isDisabled?: boolean; onClick?: () => void }) => (
    <button type="button" className={className} disabled={isDisabled} onClick={onClick}>{label}</button>
  ),
}))

vi.mock('@astryxdesign/core/Text', () => ({
  Text: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

import { PlayerActionCard, type PlayerActionCardProps } from './PlayerActionCard'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const defaultProps: PlayerActionCardProps = {
  playerId: 'player-1',
  displayName: 'Ada',
  alive: true,
  expanded: false,
  confirmationPending: false,
  onToggle: vi.fn(),
  onViewRole: vi.fn(),
  onVote: vi.fn(),
}

describe('PlayerActionCard', () => {
  let container: HTMLDivElement
  let root: Root

  async function renderCard(props: Partial<PlayerActionCardProps> = {}) {
    await act(async () => {
      root.render(<PlayerActionCard {...defaultProps} {...props} />)
    })
  }

  afterEach(async () => {
    await act(async () => root?.unmount())
    container?.remove()
    vi.clearAllMocks()
  })

  test('expands living-player actions with accessible trigger state', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const onToggle = vi.fn()

    await renderCard({ onToggle })

    const trigger = container.querySelector<HTMLButtonElement>('.player-action-card__trigger')
    expect(trigger?.getAttribute('aria-expanded')).toBe('false')
    expect(trigger?.getAttribute('aria-controls')).toBe('player-actions-player-1')
    expect(container.querySelector('#player-actions-player-1')).toBeNull()

    await act(async () => trigger?.click())
    expect(onToggle).toHaveBeenCalledOnce()

    await renderCard({ expanded: true, onToggle })

    expect(container.querySelector('#player-actions-player-1')).not.toBeNull()
    expect(container.querySelector<HTMLButtonElement>('.player-action-card__view-role')?.textContent).toBe('game.viewRole')
    expect(container.querySelector<HTMLButtonElement>('.player-action-card__vote')?.textContent).toBe('game.voteFor')
  })

  test('fires role and vote actions without nested buttons', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const onViewRole = vi.fn()
    const onVote = vi.fn()

    await renderCard({ expanded: true, onViewRole, onVote })

    const trigger = container.querySelector<HTMLButtonElement>('.player-action-card__trigger')
    expect(trigger?.querySelector('button')).toBeNull()
    expect(trigger?.parentElement?.tagName).toBe('ARTICLE')

    await act(async () => container.querySelector<HTMLButtonElement>('.player-action-card__view-role')?.click())
    await act(async () => container.querySelector<HTMLButtonElement>('.player-action-card__vote')?.click())

    expect(onViewRole).toHaveBeenCalledOnce()
    expect(onVote).toHaveBeenCalledOnce()
  })

  test('disables eliminated cards and exposes no actions', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await renderCard({ alive: false, expanded: true })

    const trigger = container.querySelector<HTMLButtonElement>('.player-action-card__trigger')
    expect(trigger?.disabled).toBe(true)
    expect(trigger?.getAttribute('aria-expanded')).toBe('false')
    expect(trigger?.hasAttribute('aria-controls')).toBe(false)
    expect(trigger?.textContent).toContain('game.eliminated')
    expect(container.querySelector('.player-action-card__actions')).toBeNull()
    expect(container.querySelector('.player-action-card')?.classList.contains('is-eliminated')).toBe(true)
  })

  test('disables the card trigger while confirmation is pending', async () => {
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
    const onToggle = vi.fn()

    await renderCard({ confirmationPending: true, onToggle })

    const trigger = container.querySelector<HTMLButtonElement>('.player-action-card__trigger')
    expect(trigger?.disabled).toBe(true)
    await act(async () => trigger?.click())
    expect(onToggle).not.toHaveBeenCalled()
  })
})
