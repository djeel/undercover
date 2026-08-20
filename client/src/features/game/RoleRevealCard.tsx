import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { Text } from '@astryxdesign/core/Text'
import type { PlayerRole } from '@undercover/shared'

export interface RoleRevealCardProps {
  open: boolean
  identity: { role: PlayerRole; word: string | null; bodyguardTargetName?: string }
  roleLabel: string
  roleArt: string
  roleLabelCaption: string
  wordLabelCaption: string
  noWordLabel: string
  revealLabel: string
  protectLabel: (name: string) => string
}

export function RoleRevealCard({ open, identity, roleLabel, roleArt, roleLabelCaption, wordLabelCaption, noWordLabel, revealLabel, protectLabel }: RoleRevealCardProps) {
  const [revealed, setRevealed] = useState(false)
  const identityKey = `${identity.role}:${identity.word ?? ''}:${identity.bodyguardTargetName ?? ''}`
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setRevealed(false)
  }, [open, identityKey])

  const resetTilt = () => {
    cardRef.current?.style.setProperty('--identity-card-rotate-x', '0deg')
    cardRef.current?.style.setProperty('--identity-card-rotate-y', '0deg')
    cardRef.current?.style.setProperty('--identity-card-highlight-x', '50%')
    cardRef.current?.style.setProperty('--identity-card-highlight-y', '50%')
  }

  const trackPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (!revealed || event.pointerType !== 'mouse') return

    const bounds = event.currentTarget.getBoundingClientRect()
    const horizontal = Math.max(-.5, Math.min(.5, (event.clientX - bounds.left) / bounds.width - .5))
    const vertical = Math.max(-.5, Math.min(.5, (event.clientY - bounds.top) / bounds.height - .5))

    event.currentTarget.style.setProperty('--identity-card-rotate-x', `${vertical * -5}deg`)
    event.currentTarget.style.setProperty('--identity-card-rotate-y', `${horizontal * 6}deg`)
    event.currentTarget.style.setProperty('--identity-card-highlight-x', `${(horizontal + .5) * 100}%`)
    event.currentTarget.style.setProperty('--identity-card-highlight-y', `${(vertical + .5) * 100}%`)
  }

  return (
    <div ref={cardRef} className={`identity-reveal-card${revealed ? ' is-revealed' : ''}`} onPointerMove={trackPointer} onPointerLeave={resetTilt}>
      <div className="identity-reveal-card__inner">
        <button className="identity-reveal-card__back" type="button" aria-label={revealLabel} onClick={() => setRevealed(true)}>
          <span aria-hidden="true">UNDERCOVER</span>
          <span>{revealLabel}</span>
        </button>
        {revealed && (
          <div className="identity-reveal-card__front">
            <img className="identity-dialog-role-art" src={roleArt} alt="" aria-hidden="true" />
            <Text as="p" type="supporting">{roleLabelCaption}</Text>
            <Text as="p" type="large" weight="bold">{roleLabel}</Text>
            <Text as="p" type="supporting">{wordLabelCaption}</Text>
            <Text as="p" type="large" weight="bold">{identity.role === 'mr_white' ? noWordLabel : identity.word}</Text>
            {identity.role === 'bodyguard' && identity.bodyguardTargetName && <Text as="p" type="body">{protectLabel(identity.bodyguardTargetName)}</Text>}
          </div>
        )}
      </div>
    </div>
  )
}
