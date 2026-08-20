import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { Text } from '@astryxdesign/core/Text'
import type { PlayerRole } from '@undercover/shared'

export interface RoleRevealCardProps {
  open: boolean
  identity: { role: PlayerRole; word: string | null; bodyguardTargetName?: string }
  roleLabel: string
  roleArt: string
  backArt: string
  roleLabelCaption: string
  wordLabelCaption: string
  noWordLabel: string
  revealLabel: string
  holdLabel: string
  instructionLabel: string
  protectLabel: (name: string) => string
}

const HOLD_DURATION_MS = 700

export function RoleRevealCard({ open, identity, roleLabel, roleArt, backArt, roleLabelCaption, wordLabelCaption, noWordLabel, revealLabel, holdLabel, instructionLabel, protectLabel }: RoleRevealCardProps) {
  const [revealed, setRevealed] = useState(false)
  const identityKey = `${identity.role}:${identity.word ?? ''}:${identity.bodyguardTargetName ?? ''}`
  const lifecycleKey = `${open}:${identityKey}`
  const [previousLifecycleKey, setPreviousLifecycleKey] = useState(lifecycleKey)
  const cardRef = useRef<HTMLDivElement>(null)
  const holdTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null)
  const activeTouchPointerRef = useRef<number | null>(null)

  const cancelHold = () => {
    clearTimeout(holdTimerRef.current ?? undefined)
    holdTimerRef.current = null
    activeTouchPointerRef.current = null
    cardRef.current?.style.setProperty('--identity-card-hold-progress', '0')
    cardRef.current?.classList.remove('is-holding')
  }

  useEffect(() => cancelHold, [lifecycleKey])

  if (previousLifecycleKey !== lifecycleKey) {
    setPreviousLifecycleKey(lifecycleKey)
    setRevealed(false)
  }

  const isRevealed = open && revealed && previousLifecycleKey === lifecycleKey
  const reveal = () => {
    cancelHold()
    setRevealed(true)
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
    const x = Math.max(-.5, Math.min(.5, (event.clientX - bounds.left) / bounds.width - .5))
    const y = Math.max(-.5, Math.min(.5, (event.clientY - bounds.top) / bounds.height - .5))

    event.currentTarget.style.setProperty('--identity-card-rotate-x', `${y * -6}deg`)
    event.currentTarget.style.setProperty('--identity-card-rotate-y', `${x * 6}deg`)
    event.currentTarget.style.setProperty('--identity-card-highlight-x', `${(x + .5) * 100}%`)
    event.currentTarget.style.setProperty('--identity-card-highlight-y', `${(y + .5) * 100}%`)
  }

  const startHold = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'touch') return
    event.preventDefault()
    cancelHold()
    activeTouchPointerRef.current = event.pointerId
    event.currentTarget.setPointerCapture?.(event.pointerId)
    cardRef.current?.classList.add('is-holding')
    cardRef.current?.style.setProperty('--identity-card-hold-progress', '1')
    holdTimerRef.current = setTimeout(reveal, HOLD_DURATION_MS)
  }

  const endHold = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'touch' && activeTouchPointerRef.current === event.pointerId) cancelHold()
  }

  return (
    <div ref={cardRef} className={`identity-reveal-card${isRevealed ? ' is-revealed' : ''}`} onPointerMove={trackPointer} onPointerLeave={resetTilt}>
      <div className="identity-reveal-card__inner">
        <button
          className="identity-reveal-card__back"
          type="button"
          aria-label={revealLabel}
          onClick={(event) => {
            if ((event.nativeEvent as globalThis.PointerEvent).pointerType === 'touch') return
            reveal()
          }}
          onPointerDown={startHold}
          onPointerUp={endHold}
          onPointerCancel={endHold}
          onLostPointerCapture={endHold}
          onKeyDown={(event: KeyboardEvent<HTMLButtonElement>) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              reveal()
            }
          }}
        >
          <img className="identity-reveal-card__back-art" src={backArt} alt="" aria-hidden="true" />
          <span className="identity-reveal-card__back-title" aria-hidden="true">UNDERCOVER</span>
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
              <Text as="p" type="body">{instructionLabel}</Text>
              {identity.role === 'bodyguard' && identity.bodyguardTargetName ? <Text as="p" type="body">{protectLabel(identity.bodyguardTargetName)}</Text> : null}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
