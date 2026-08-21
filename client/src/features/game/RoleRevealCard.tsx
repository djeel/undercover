import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Text } from '@astryxdesign/core/Text'
import type { PlayerRole } from '@undercover/shared'

export interface RoleRevealCardProps {
  open: boolean
  identity: { role: PlayerRole; word: string | null; bodyguardTargetName?: string }
  roleLabel: string
  roleArt: string
  cardBackArt: string
  roleLabelCaption: string
  wordLabelCaption: string
  noWordLabel: string
  revealLabel: string
  holdLabel: string
  memorizeLabel: string
  protectLabel: (name: string) => string
  onReveal?: () => void
}

export function RoleRevealCard({ open, identity, roleLabel, roleArt, cardBackArt, roleLabelCaption, wordLabelCaption, noWordLabel, revealLabel, holdLabel, memorizeLabel, protectLabel, onReveal }: RoleRevealCardProps) {
  const lifecycleKey = JSON.stringify([open, identity.role, identity.word, identity.bodyguardTargetName])
  const [revealedLifecycleKey, setRevealedLifecycleKey] = useState<string | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const holdTimerRef = useRef<number | null>(null)
  const suppressionTimerRef = useRef<number | null>(null)
  const revealedLifecycleRef = useRef<string | null>(null)
  const suppressClickRef = useRef(false)
  const isRevealed = open && revealedLifecycleKey === lifecycleKey

  const cancelHold = () => {
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current)
    holdTimerRef.current = null
  }

  const clearClickSuppression = () => {
    if (suppressionTimerRef.current !== null) window.clearTimeout(suppressionTimerRef.current)
    suppressionTimerRef.current = null
    suppressClickRef.current = false
  }

  useEffect(() => {
    cancelHold()
    clearClickSuppression()
    revealedLifecycleRef.current = null
    setRevealedLifecycleKey(null)

    return () => {
      cancelHold()
      clearClickSuppression()
    }
  }, [lifecycleKey])

  const reveal = () => {
    cancelHold()
    if (isRevealed || revealedLifecycleRef.current === lifecycleKey) return
    revealedLifecycleRef.current = lifecycleKey
    setRevealedLifecycleKey(lifecycleKey)
    onReveal?.()
  }

  const startHold = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return
    cancelHold()
    clearClickSuppression()
    suppressClickRef.current = true
    holdTimerRef.current = window.setTimeout(reveal, 700)
  }

  const finishHold = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return
    cancelHold()
    if (!suppressClickRef.current) return
    suppressionTimerRef.current = window.setTimeout(clearClickSuppression, 0)
  }

  const cancelTouchHold = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return
    cancelHold()
    clearClickSuppression()
  }

  const handleClick = () => {
    if (suppressClickRef.current) {
      clearClickSuppression()
      return
    }
    reveal()
  }
  const resetTilt = () => {
    cardRef.current?.style.setProperty('--identity-card-rotate-x', '0deg')
    cardRef.current?.style.setProperty('--identity-card-rotate-y', '0deg')
    cardRef.current?.style.setProperty('--identity-card-highlight-x', '50%')
    cardRef.current?.style.setProperty('--identity-card-highlight-y', '50%')
  }

  const trackPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (!isRevealed || event.pointerType !== 'mouse') return

    const bounds = event.currentTarget.getBoundingClientRect()
    const horizontal = Math.max(-.5, Math.min(.5, (event.clientX - bounds.left) / bounds.width - .5))
    const vertical = Math.max(-.5, Math.min(.5, (event.clientY - bounds.top) / bounds.height - .5))

    event.currentTarget.style.setProperty('--identity-card-rotate-x', `${vertical * -5}deg`)
    event.currentTarget.style.setProperty('--identity-card-rotate-y', `${horizontal * 6}deg`)
    event.currentTarget.style.setProperty('--identity-card-highlight-x', `${(horizontal + .5) * 100}%`)
    event.currentTarget.style.setProperty('--identity-card-highlight-y', `${(vertical + .5) * 100}%`)
  }

  return (
    <div ref={cardRef} className={`identity-reveal-card${isRevealed ? ' is-revealed' : ''}`} onPointerMove={trackPointer} onPointerLeave={resetTilt}>
      <div className="identity-reveal-card__inner">
        <button
          className="identity-reveal-card__back"
          type="button"
          aria-label={revealLabel}
          onClick={handleClick}
          onPointerDown={startHold}
          onPointerUp={finishHold}
          onPointerCancel={cancelTouchHold}
          onPointerLeave={cancelTouchHold}
          onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              reveal()
            }
          }}
        >
          <img src={cardBackArt} alt="" aria-hidden="true" />
          <span>{revealLabel}</span>
          <span>{holdLabel}</span>
        </button>
        {isRevealed && (
          <div className="identity-reveal-card__front">
            <img className="identity-dialog-role-art" src={roleArt} alt="" aria-hidden="true" />
            <Text as="p" type="supporting">{roleLabelCaption}</Text>
            <Text as="p" type="large" weight="bold">{roleLabel}</Text>
            <Text as="p" type="supporting">{wordLabelCaption}</Text>
            <Text as="p" type="large" weight="bold">{identity.role === 'mr_white' ? noWordLabel : identity.word}</Text>
            {identity.role === 'bodyguard' && identity.bodyguardTargetName && <Text as="p" type="body">{protectLabel(identity.bodyguardTargetName)}</Text>}
            <Text as="p" type="supporting">{memorizeLabel}</Text>
          </div>
        )}
      </div>
    </div>
  )
}
