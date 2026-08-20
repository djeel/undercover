# Cinematic Role Card Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current undersized identity card with a private, cinematic full-art 3D reveal supporting desktop click/keyboard, touch press-and-hold, cursor tilt, responsive layout, and readable localized identity text.

**Architecture:** Keep `IdentityDialog` responsible for translated identity data and role-art mapping. Keep all transient interaction inside `RoleRevealCard`: lifecycle-key privacy reset, press-and-hold timer, pointer capture, and direct CSS custom-property updates for high-frequency tilt/progress presentation. Extend the existing app-layer CSS rather than adding a motion dependency.

**Tech Stack:** React 19, TypeScript, Pointer Events, CSS transforms/custom properties, react-i18next, Vitest, jsdom, Vite.

## Global Constraints

- Private role, word, target, and role-specific art must not exist in the DOM or accessibility tree before successful activation.
- Desktop uses click plus native Enter/Space button activation; coarse-pointer touch uses press-and-hold and never cursor tilt.
- Use `card.png` for the concealed face and the supplied full-bleed portrait role assets for the revealed face.
- The lower overlay must keep role, word/no-word, instruction, and optional Bodyguard target readable over every artwork.
- Closing, reopening, identity changes, and pass-and-play advancement reset the card and cancel stale hold callbacks.
- `prefers-reduced-motion: reduce` disables flip interpolation, tilt, highlight travel, and animated progress without changing access to content.
- Keep French and English translation catalogs in parity.
- Add no animation or gesture dependency.

---

## File Structure

- `client/src/features/game/RoleRevealCard.tsx`: reveal state, lifecycle reset, touch hold, pointer tilt, semantic markup.
- `client/src/features/game/RoleRevealCard.test.tsx`: privacy, activation, hold cancellation/completion, lifecycle, and stale-timer behavior.
- `client/src/features/game/IdentityDialog.tsx`: role-art/back-art imports and translated copy passed into the card; centered dialog sizing.
- `client/src/features/game/role-reveal-card-css.test.ts`: static contract for 3D, full-bleed artwork, overlay, media queries, and reduced motion.
- `client/src/pages/AssetPresentation.test.tsx`: end-to-end role-art and concealed-card asset mapping.
- `client/src/i18n/locales/en.json`: English hold and identity instruction copy.
- `client/src/i18n/locales/fr.json`: French equivalents.
- `client/src/i18n/locales/setup-locales.test.ts`: extend catalog parity coverage to identity strings.
- `client/src/index.css`: centered portrait scene, card faces, overlay, tilt/highlight, hold progress, responsive and reduced-motion rules.

---

### Task 1: Lock the Private Interaction Contract

**Files:**
- Modify: `client/src/features/game/RoleRevealCard.test.tsx`
- Modify: `client/src/features/game/RoleRevealCard.tsx`

**Interfaces:**
- Consumes: existing `RoleRevealCardProps` identity, labels, and artwork.
- Produces: `RoleRevealCardProps` additions `holdLabel: string` and `instructionLabel: string`; pointer handlers that reveal by mouse click/keyboard or completed touch hold.

- [ ] **Step 1: Replace the component tests with explicit privacy and activation cases**

Keep the existing test setup and `CommitProbe`. Add fake timers and the two copy props:

```tsx
const props = {
  open: true,
  identity: { role: 'undercover' as const, word: 'Harbor' },
  roleLabel: 'Undercover',
  roleArt: '/undercover.png',
  roleLabelCaption: 'Role',
  wordLabelCaption: 'Word',
  noWordLabel: 'No word',
  revealLabel: 'Reveal private identity',
  holdLabel: 'Press and hold to reveal',
  instructionLabel: 'Memorize your identity before passing the device.',
  protectLabel: (name: string) => `Protect ${name}`,
}
```

Add these tests while retaining the current lifecycle privacy test:

```tsx
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
```

Factor the repeated render setup into:

```tsx
async function renderCard() {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => { root.render(<RoleRevealCard {...props} />) })
}
```

Restore real timers in `afterEach`:

```tsx
vi.useRealTimers()
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
cd client && npm test -- --run src/features/game/RoleRevealCard.test.tsx
```

Expected: FAIL because `holdLabel`/`instructionLabel` are not accepted and touch pointer events reveal through click or lack hold behavior.

- [ ] **Step 3: Implement the minimal interaction state machine**

Update imports and props:

```tsx
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

export interface RoleRevealCardProps {
  // existing fields
  holdLabel: string
  instructionLabel: string
}

const HOLD_DURATION_MS = 700
```

Add refs and cleanup helpers inside `RoleRevealCard`:

```tsx
const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
const activeTouchPointerRef = useRef<number | null>(null)

const cancelHold = () => {
  if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
  holdTimerRef.current = null
  activeTouchPointerRef.current = null
  cardRef.current?.style.setProperty('--identity-card-hold-progress', '0')
  cardRef.current?.classList.remove('is-holding')
}

useEffect(() => cancelHold, [lifecycleKey])
```

Implement one reveal helper and pointer handlers:

```tsx
const reveal = () => {
  cancelHold()
  setRevealed(true)
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
```

Wire the back button:

```tsx
<button
  className="identity-reveal-card__back"
  type="button"
  aria-label={revealLabel}
  onClick={(event) => {
    if ((event.nativeEvent as PointerEvent).pointerType === 'touch') return
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
  <span className="identity-reveal-card__back-title" aria-hidden="true">UNDERCOVER</span>
  <span className="identity-reveal-card__click-label">{revealLabel}</span>
  <span className="identity-reveal-card__hold-label">{holdLabel}</span>
  <span className="identity-reveal-card__hold-progress" aria-hidden="true" />
</button>
```

Keep the revealed face conditionally mounted. Group its text for the later visual task:

```tsx
<div className="identity-reveal-card__copy">
  <Text as="p" type="supporting">{roleLabelCaption}</Text>
  <Text as="p" type="large" weight="bold">{roleLabel}</Text>
  <Text as="p" type="supporting">{wordLabelCaption}</Text>
  <Text as="p" type="large" weight="bold">{identity.role === 'mr_white' ? noWordLabel : identity.word}</Text>
  <Text as="p" type="body">{instructionLabel}</Text>
  {identity.role === 'bodyguard' && identity.bodyguardTargetName && <Text as="p" type="body">{protectLabel(identity.bodyguardTargetName)}</Text>}
</div>
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
cd client && npm test -- --run src/features/game/RoleRevealCard.test.tsx
```

Expected: all `RoleRevealCard` tests PASS with no act warnings.

- [ ] **Step 5: Commit the interaction contract**

```bash
git add client/src/features/game/RoleRevealCard.tsx client/src/features/game/RoleRevealCard.test.tsx
git commit -m "feat: add private role hold reveal"
```

---

### Task 2: Wire Card Assets and Localized Copy

**Files:**
- Modify: `client/src/features/game/IdentityDialog.tsx`
- Modify: `client/src/pages/AssetPresentation.test.tsx`
- Modify: `client/src/i18n/locales/en.json`
- Modify: `client/src/i18n/locales/fr.json`
- Modify: `client/src/i18n/locales/setup-locales.test.ts`

**Interfaces:**
- Consumes: Task 1 props `holdLabel` and `instructionLabel`.
- Produces: `backArt: string` passed to `RoleRevealCard`; catalog keys `identity.holdCard` and `identity.memorize` in both locales.

- [ ] **Step 1: Add failing asset and locale parity assertions**

Extend `AssetPresentation.test.tsx` with:

```tsx
test('uses the supplied concealed card artwork without exposing role art', async () => {
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)

  await act(async () => {
    root.render(<IdentityDialog open onClose={() => undefined} identity={{ role: 'undercover', word: 'word' }} />)
  })

  expect(container.querySelector<HTMLImageElement>('.identity-reveal-card__back-art')?.src).toContain('card.png')
  expect(container.querySelector('.identity-dialog-role-art')).toBeNull()
})
```

Extend `setup-locales.test.ts`:

```ts
test('provide matching identity reveal guidance', () => {
  expect(en.identity.holdCard).toBeTruthy()
  expect(fr.identity.holdCard).toBeTruthy()
  expect(en.identity.memorize).toBeTruthy()
  expect(fr.identity.memorize).toBeTruthy()
  expect(Object.keys(en.identity).sort()).toEqual(Object.keys(fr.identity).sort())
})
```

- [ ] **Step 2: Run asset and locale tests and verify RED**

Run:

```bash
cd client && npm test -- --run src/pages/AssetPresentation.test.tsx src/i18n/locales/setup-locales.test.ts
```

Expected: FAIL because `card.png`, `holdCard`, and `memorize` are not wired.

- [ ] **Step 3: Add translations and dialog wiring**

Update the identity objects in `en.json` and `fr.json`:

```json
"identity": {
  "title": "Your identity",
  "open": "View my word",
  "role": "Role",
  "word": "Word",
  "noWord": "No word",
  "protect": "Protect {{name}}",
  "revealCard": "Reveal private identity",
  "holdCard": "Press and hold to reveal",
  "memorize": "Memorize your identity before passing the device."
}
```

```json
"identity": {
  "title": "Votre identité",
  "open": "Voir mon mot",
  "role": "Rôle",
  "word": "Mot",
  "noWord": "Aucun mot",
  "protect": "Protéger {{name}}",
  "revealCard": "Révéler mon identité privée",
  "holdCard": "Maintenez pour révéler",
  "memorize": "Mémorisez votre identité avant de passer l’appareil."
}
```

Import and pass the back art in `IdentityDialog.tsx`:

```tsx
import cardBackArt from '../../assets/roles/card.png'

<RoleRevealCard
  backArt={cardBackArt}
  holdLabel={t('identity.holdCard')}
  instructionLabel={t('identity.memorize')}
  // existing props
/>
```

Add `backArt: string` to `RoleRevealCardProps`, then render it inside the closed face:

```tsx
<img className="identity-reveal-card__back-art" src={backArt} alt="" aria-hidden="true" />
```

Change the dialog sizing to center the portrait scene with safe viewport bounds:

```tsx
<Dialog
  isOpen={open}
  onOpenChange={(isOpen) => { if (!isOpen) onClose() }}
  purpose="info"
  width="min(94vw, 32rem)"
>
```

- [ ] **Step 4: Run asset and locale tests and verify GREEN**

Run:

```bash
cd client && npm test -- --run src/pages/AssetPresentation.test.tsx src/i18n/locales/setup-locales.test.ts src/features/game/RoleRevealCard.test.tsx
```

Expected: all selected tests PASS.

- [ ] **Step 5: Commit asset and locale wiring**

```bash
git add client/src/features/game/IdentityDialog.tsx client/src/features/game/RoleRevealCard.tsx client/src/pages/AssetPresentation.test.tsx client/src/i18n/locales/en.json client/src/i18n/locales/fr.json client/src/i18n/locales/setup-locales.test.ts
git commit -m "feat: wire cinematic role artwork"
```

---

### Task 3: Build the Cinematic Full-Art Presentation

**Files:**
- Modify: `client/src/features/game/role-reveal-card-css.test.ts`
- Modify: `client/src/index.css:28-108,386-390`

**Interfaces:**
- Consumes: Task 1 markup classes and Task 2 `backArt` image.
- Produces: CSS custom properties `--identity-card-rotate-x`, `--identity-card-rotate-y`, `--identity-card-highlight-x`, `--identity-card-highlight-y`, and `--identity-card-hold-progress`.

- [ ] **Step 1: Expand the CSS contract test**

Replace the test body with exact observable contracts:

```ts
test('defines a responsive cinematic role-card reveal with safe motion fallbacks', () => {
  expect(css).toContain('aspect-ratio: 1055 / 1491')
  expect(css).toContain('transform-style: preserve-3d')
  expect(css).toContain('rotateY(180deg)')
  expect(css).toContain('.identity-reveal-card__back-art')
  expect(css).toContain('.identity-dialog-role-art')
  expect(css).toContain('object-fit: cover')
  expect(css).toContain('.identity-reveal-card__copy')
  expect(css).toContain('linear-gradient(to bottom, transparent')
  expect(css).toContain('@media (hover: hover) and (pointer: fine)')
  expect(css).toContain('@media (hover: none), (pointer: coarse)')
  expect(css).toContain('.identity-reveal-card.is-holding .identity-reveal-card__hold-progress')
  expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  expect(css).toContain('--identity-card-rotate-x: 0deg')
})
```

- [ ] **Step 2: Run the CSS test and verify RED**

Run:

```bash
cd client && npm test -- --run src/features/game/role-reveal-card-css.test.ts
```

Expected: FAIL because the portrait ratio, back art, lower overlay, coarse-pointer, and hold-progress contracts are absent.

- [ ] **Step 3: Replace the existing reveal CSS block**

Replace `client/src/index.css` reveal rules with:

```css
.identity-reveal-card {
    --identity-card-rotate-x: 0deg;
    --identity-card-rotate-y: 0deg;
    --identity-card-highlight-x: 50%;
    --identity-card-highlight-y: 50%;
    --identity-card-hold-progress: 0;
    width: min(100%, 22rem, calc((100dvh - 9rem) * 1055 / 1491));
    margin-inline: auto;
    perspective: 1200px;
    touch-action: pan-y;
}

.identity-reveal-card__inner {
    position: relative;
    display: grid;
    aspect-ratio: 1055 / 1491;
    transform-style: preserve-3d;
    transform: rotateX(var(--identity-card-rotate-x)) rotateY(var(--identity-card-rotate-y));
    transition: transform 180ms cubic-bezier(.16, 1, .3, 1);
}

.identity-reveal-card.is-revealed .identity-reveal-card__inner {
    transform: rotateX(var(--identity-card-rotate-x)) rotateY(calc(180deg + var(--identity-card-rotate-y)));
    transition-duration: 620ms;
}

.identity-reveal-card__back,
.identity-reveal-card__front {
    position: relative;
    grid-area: 1 / 1;
    overflow: hidden;
    border: 0;
    border-radius: var(--radius-container);
    background: var(--color-background-card);
    box-shadow: 0 8px 8px rgb(0 0 0 / .34), 0 28px 52px rgb(0 0 0 / .3);
    backface-visibility: hidden;
}

.identity-reveal-card__back {
    display: grid;
    place-items: end center;
    padding: 1.5rem;
    color: white;
    cursor: pointer;
    isolation: isolate;
}

.identity-reveal-card__back::after {
    position: absolute;
    inset: 40% 0 0;
    z-index: -1;
    content: '';
    background: linear-gradient(to bottom, transparent, rgb(5 8 7 / .94) 78%);
}

.identity-reveal-card__back-art,
.identity-dialog-role-art {
    position: absolute;
    inset: 0;
    z-index: -2;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.identity-reveal-card__back-title,
.identity-reveal-card__click-label,
.identity-reveal-card__hold-label {
    position: relative;
    z-index: 1;
}

.identity-reveal-card__back-title {
    font-family: Syne, system-ui, sans-serif;
    font-size: clamp(1.35rem, 5vw, 2rem);
    font-weight: 800;
}

.identity-reveal-card__hold-label { display: none; }

.identity-reveal-card__hold-progress {
    position: absolute;
    inset: auto 1.5rem 1rem;
    height: .2rem;
    overflow: hidden;
    border-radius: 999px;
    background: rgb(255 255 255 / .22);
}

.identity-reveal-card__hold-progress::after {
    display: block;
    width: 100%;
    height: 100%;
    content: '';
    background: var(--color-accent);
    transform: scaleX(0);
    transform-origin: left;
}

.identity-reveal-card.is-holding .identity-reveal-card__hold-progress::after {
    transform: scaleX(var(--identity-card-hold-progress));
    transition: transform 700ms linear;
}

.identity-reveal-card__back:focus-visible {
    outline: 3px solid var(--color-accent);
    outline-offset: 4px;
}

.identity-reveal-card__front {
    transform: rotateY(180deg);
}

.identity-reveal-card__front::after {
    position: absolute;
    inset: 0;
    content: '';
    pointer-events: none;
    opacity: 0;
    background: radial-gradient(circle at var(--identity-card-highlight-x) var(--identity-card-highlight-y), rgb(255 255 255 / .2), transparent 36%);
    transition: opacity 180ms ease-out;
}

.identity-reveal-card__copy {
    position: absolute;
    inset: auto 0 0;
    z-index: 1;
    display: grid;
    gap: .35rem;
    padding: 6rem 1.5rem 1.5rem;
    color: white;
    background: linear-gradient(to bottom, transparent, color-mix(in srgb, var(--color-accent), rgb(4 7 6) 88%) 58%, rgb(4 7 6 / .98));
    text-shadow: 0 1px 2px rgb(0 0 0 / .75);
}

.identity-reveal-card__copy p { margin: 0; }

@media (hover: hover) and (pointer: fine) {
    .identity-reveal-card.is-revealed .identity-reveal-card__front::after { opacity: 1; }
}

@media (hover: none), (pointer: coarse) {
    .identity-reveal-card { touch-action: none; }
    .identity-reveal-card__click-label { display: none; }
    .identity-reveal-card__hold-label { display: inline; }
}
```

Update the existing reduced-motion block:

```css
@media (prefers-reduced-motion: reduce) {
    .identity-reveal-card {
        --identity-card-rotate-x: 0deg;
        --identity-card-rotate-y: 0deg;
    }
    .identity-reveal-card__inner,
    .identity-reveal-card__front::after,
    .identity-reveal-card__hold-progress::after {
        transition: none;
    }
    .identity-reveal-card.is-revealed .identity-reveal-card__inner { transform: none; }
    .identity-reveal-card.is-revealed .identity-reveal-card__back { display: none; }
    .identity-reveal-card.is-revealed .identity-reveal-card__front { transform: none; }
}
```

- [ ] **Step 4: Preserve direct pointer-variable updates without React rerenders**

Keep `trackPointer` in `RoleRevealCard.tsx`, but make the tilt bounds symmetrical and reset on pointer leave:

```tsx
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
```

- [ ] **Step 5: Run focused reveal tests and verify GREEN**

Run:

```bash
cd client && npm test -- --run src/features/game/role-reveal-card-css.test.ts src/features/game/RoleRevealCard.test.tsx src/pages/AssetPresentation.test.tsx
```

Expected: all selected tests PASS.

- [ ] **Step 6: Commit the cinematic presentation**

```bash
git add client/src/index.css client/src/features/game/RoleRevealCard.tsx client/src/features/game/role-reveal-card-css.test.ts
git commit -m "feat: style cinematic role reveal"
```

---

### Task 4: Verify the Complete Reveal Surface

**Files:**
- Modify only if verification finds a defect in the files listed above.

**Interfaces:**
- Consumes: completed reveal component, assets, translations, and CSS.
- Produces: verified desktop, mobile, keyboard, lifecycle, and reduced-motion behavior.

- [ ] **Step 1: Run all client tests**

Run:

```bash
cd client && npm test -- --run
```

Expected: all test files PASS with no unhandled errors or React act warnings.

- [ ] **Step 2: Run the production build**

Run:

```bash
cd client && npm run build
```

Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 3: Launch the actual app**

Run the Vite dev server from `client` and open the local URL in Chromium. Navigate through local setup until the identity dialog is available; do not verify against isolated static markup.

- [ ] **Step 4: Verify desktop behavior at 1440 × 900**

Exercise and observe:

- dialog is centered and the full portrait card fits without cropping;
- only `card.png` and reveal instructions appear before activation;
- click flips once and reveals the correct role art;
- role, word/no-word, instruction, and Bodyguard target remain readable over the lower gradient;
- mouse movement produces restrained tilt/highlight and pointer exit returns neutral;
- Tab focus is visible; Enter and Space reveal after reset;
- close/reopen returns to the concealed face.

- [ ] **Step 5: Verify touch behavior at 390 × 844**

Emulate a touch/coarse pointer and observe:

- card fits the viewport with close control reachable and no horizontal scroll;
- a short press and cancelled pointer do not reveal;
- a completed 700ms hold reveals;
- hold progress is visible and resets after cancellation;
- no cursor tilt/highlight is active;
- changing to the next pass-and-play player restores the concealed card before private text mounts.

- [ ] **Step 6: Verify reduced motion**

Enable `prefers-reduced-motion: reduce`, reset the dialog, and observe:

- no interpolated 3D rotation, tilt, highlight travel, or progress animation;
- desktop activation and touch hold still reveal the same content;
- private content remains absent before activation.

- [ ] **Step 7: Commit any verification fixes**

If verification required changes:

```bash
git add client/src/features/game/RoleRevealCard.tsx client/src/features/game/RoleRevealCard.test.tsx client/src/features/game/IdentityDialog.tsx client/src/features/game/role-reveal-card-css.test.ts client/src/pages/AssetPresentation.test.tsx client/src/i18n/locales/en.json client/src/i18n/locales/fr.json client/src/i18n/locales/setup-locales.test.ts client/src/index.css
git commit -m "fix: harden role reveal interactions"
```

If no files changed, do not create an empty commit.
