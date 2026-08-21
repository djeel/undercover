import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Text } from '@astryxdesign/core/Text'
import type { PlayerRole } from '@undercover/shared'

const HOLD_DURATION_MS = 700

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
  const activeTouchPointerRef = useRef<number | null>(null)
  const suppressClickRef = useRef(false)
  const isRevealed = open && revealedLifecycleKey === lifecycleKey

  const cancelHold = () => {
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current)
    holdTimerRef.current = null
    activeTouchPointerRef.current = null
    cardRef.current?.style.setProperty('--identity-card-hold-progress', '0')
    cardRef.current?.classList.remove('is-holding')
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
    event.preventDefault()
    cancelHold()
    clearClickSuppression()
    activeTouchPointerRef.current = event.pointerId
    event.currentTarget.setPointerCapture?.(event.pointerId)
    cardRef.current?.classList.add('is-holding')
    cardRef.current?.style.setProperty('--identity-card-hold-progress', '1')
    suppressClickRef.current = true
    holdTimerRef.current = window.setTimeout(reveal, HOLD_DURATION_MS)
  }

  const finishHold = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return
    if (activeTouchPointerRef.current !== null && event.pointerId !== activeTouchPointerRef.current) return
    cancelHold()
    if (!suppressClickRef.current) return
    suppressionTimerRef.current = window.setTimeout(clearClickSuppression, 0)
  }

  const cancelTouchHold = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return
    if (activeTouchPointerRef.current !== null && event.pointerId !== activeTouchPointerRef.current) return
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

  useEffect(() => {
    if (!isRevealed || window.matchMedia?.('(pointer: fine)').matches === false) return
    const trackPointer = (event: globalThis.PointerEvent) => {
      if (event.pointerType && event.pointerType !== 'mouse') return
      const bounds = cardRef.current?.getBoundingClientRect()
      if (!bounds) return
      const centerX = bounds.left + bounds.width / 2
      const centerY = bounds.top + bounds.height / 2
      const x = Math.max(-1, Math.min(1, (event.clientX - centerX) / (window.innerWidth / 2)))
      const y = Math.max(-1, Math.min(1, (event.clientY - centerY) / (window.innerHeight / 2)))
      cardRef.current?.style.setProperty('--identity-card-rotate-x', `${y * -6}deg`)
      cardRef.current?.style.setProperty('--identity-card-rotate-y', `${x * 6}deg`)
      cardRef.current?.style.setProperty('--identity-card-highlight-x', `${(x + 1) * 50}%`)
      cardRef.current?.style.setProperty('--identity-card-highlight-y', `${(y + 1) * 50}%`)
    }
    window.addEventListener('pointermove', trackPointer, { passive: true })
    return () => {
      window.removeEventListener('pointermove', trackPointer)
      resetTilt()
    }
  }, [isRevealed])

  return (
    <div ref={cardRef} className={`identity-reveal-card${isRevealed ? ' is-revealed' : ''}`}>
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
          <img className="identity-reveal-card__back-art" src={cardBackArt} alt="" aria-hidden="true" />

          <span className="identity-reveal-card__click-label">{revealLabel}</span>
          <span className="identity-reveal-card__hold-label">{holdLabel}</span>
          <span className="identity-reveal-card__hold-progress" aria-hidden="true" />
        </button>
        {isRevealed && (
          <div className="identity-reveal-card__front">
            <img className="identity-dialog-role-art" src={roleArt} alt="" aria-hidden="true" />
            <div className="identity-reveal-card__copy">
              <Text as="p" type="supporting">{roleLabelCaption}</Text>
              <Text as="p" type="large" weight="bold">{roleLabel}</Text>
              <Text as="p" type="supporting">{wordLabelCaption}</Text>
              <Text as="p" type="large" weight="bold">{identity.role === 'mr_white' ? noWordLabel : identity.word}</Text>
              <Text as="p" type="body">{memorizeLabel}</Text>
              {identity.role === 'bodyguard' && identity.bodyguardTargetName ? <Text as="p" type="body">{protectLabel(identity.bodyguardTargetName)}</Text> : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
