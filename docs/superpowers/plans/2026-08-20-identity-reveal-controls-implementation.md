# Identity Reveal and Shared Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every immediate identity dialog reveal with an accessible private 3D role card, and normalize Astryx buttons and text inputs through one app-layer control contract.

**Architecture:** Add a focused `RoleRevealCard` beside `IdentityDialog`; it owns private reveal state and optional fine-pointer presentation, while `IdentityDialog` retains role-data mapping and dialog lifecycle. Add one global Astryx-only CSS layer in `index.css`; no caller APIs or game state change. Contract tests assert the stable selectors and interaction tests assert secrecy/reset behavior.

**Tech Stack:** React 19, TypeScript, Vitest + jsdom, i18next, Astryx Design, CSS custom properties, Vite.

## Global Constraints

- Work only in `.worktrees/undercover-refresh`.
- Use Astryx components and stable `.astryx-*` / `data-*` contracts; create no wrapper component for generic buttons or inputs.
- `button.png` remains exclusive to `.local-play-card__start`.
- Identity content must not exist in readable DOM before card activation.
- Every identity dialog opening starts closed, including local reveal, in-game local reopen, and online reopen.
- Pointer tilt runs only inside `(hover: hover) and (pointer: fine)`; never require hover for reveal.
- `prefers-reduced-motion: reduce` eliminates rotation, tilt, and transform transitions without removing information or keyboard access.
- Preserve `alt="" aria-hidden="true"` on decorative role assets.
- Add tests before implementation behavior changes. Run focused tests, full client test suite, and production build after all tasks.
- Do not commit until final review and verification across the entire refresh are complete.

---

### Task 1: Add the private accessible role-reveal card

**Files:**
- Create: `client/src/features/game/RoleRevealCard.tsx`
- Create: `client/src/features/game/RoleRevealCard.test.tsx`
- Modify: `client/src/features/game/IdentityDialog.tsx`
- Modify: `client/src/i18n/locales/en.json`
- Modify: `client/src/i18n/locales/fr.json`
- Modify: `client/src/pages/AssetPresentation.test.tsx`

**Interfaces:**
- Consumes: `open: boolean`, the `IdentityDialogProps['identity']` object, translated identity labels, and imported role artwork.
- Produces: `RoleRevealCard({ open, identity, roleLabel, roleArt, noWordLabel, roleLabelCaption, wordLabelCaption, protectLabel, revealLabel }): JSX.Element`.
- `IdentityDialog` retains `roleKey` and `roleArt`, maps labels through `t()`, and passes mapped values to the card.
- The component exposes a native button named with `identity.revealCard` before reveal and a normal reading-order private content region after reveal.

- [ ] **Step 1: Write the failing interaction test**

Create `client/src/features/game/RoleRevealCard.test.tsx` with controlled mocks for `Text` only if the card uses it. Exercise DOM behavior rather than CSS class implementation:

```tsx
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, test } from 'vitest'
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
```

- [ ] **Step 2: Run the targeted test and verify red**

Run:

```bash
cd client && npm run test -- --run src/features/game/RoleRevealCard.test.tsx
```

Expected: FAIL because `RoleRevealCard` does not exist.

- [ ] **Step 3: Add localized card instructions**

Add these exact keys to both locale files under `identity`:

```json
"revealCard": "Reveal private identity"
```

French value:

```json
"revealCard": "Révéler mon identité privée"
```

Keep all existing `identity` keys unchanged.

- [ ] **Step 4: Implement the focused card component**

Create `client/src/features/game/RoleRevealCard.tsx`. Use a native `<button>` for the closed face. Reset on either `open` becoming false or an identity fingerprint change. Mount private content only when `revealed` is true. Pointer movement derives bounded custom property values but does not update React state:

```tsx
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

  useEffect(() => { setRevealed(false) }, [open, identityKey])

  const resetTilt = () => {
    cardRef.current?.style.setProperty('--identity-card-rotate-x', '0deg')
    cardRef.current?.style.setProperty('--identity-card-rotate-y', '0deg')
    cardRef.current?.style.setProperty('--identity-card-highlight-x', '50%')
    cardRef.current?.style.setProperty('--identity-card-highlight-y', '50%')
  }
  const trackPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (!revealed || event.pointerType !== 'mouse') return
    const bounds = event.currentTarget.getBoundingClientRect()
    const horizontal = (event.clientX - bounds.left) / bounds.width - .5
    const vertical = (event.clientY - bounds.top) / bounds.height - .5
    event.currentTarget.style.setProperty('--identity-card-rotate-x', `${vertical * -5}deg`)
    event.currentTarget.style.setProperty('--identity-card-rotate-y', `${horizontal * 6}deg`)
    event.currentTarget.style.setProperty('--identity-card-highlight-x', `${(horizontal + .5) * 100}%`)
    event.currentTarget.style.setProperty('--identity-card-highlight-y', `${(vertical + .5) * 100}%`)
  }

  return <div ref={cardRef} className={`identity-reveal-card${revealed ? ' is-revealed' : ''}`} onPointerMove={trackPointer} onPointerLeave={resetTilt}>
    <div className="identity-reveal-card__inner">
      <button className="identity-reveal-card__back" type="button" aria-label={revealLabel} onClick={() => setRevealed(true)}>
        <span aria-hidden="true">UNDERCOVER</span>
        <span>{revealLabel}</span>
      </button>
      {revealed && <div className="identity-reveal-card__front">
        <img className="identity-dialog-role-art" src={roleArt} alt="" aria-hidden="true" />
        <Text as="p" type="supporting">{roleLabelCaption}</Text>
        <Text as="p" type="large" weight="bold">{roleLabel}</Text>
        <Text as="p" type="supporting">{wordLabelCaption}</Text>
        <Text as="p" type="large" weight="bold">{identity.role === 'mr_white' ? noWordLabel : identity.word}</Text>
        {identity.role === 'bodyguard' && identity.bodyguardTargetName && <Text as="p" type="body">{protectLabel(identity.bodyguardTargetName)}</Text>}
      </div>}
    </div>
  </div>
}
```

Ensure the final `useEffect` reset only fires at lifecycle changes, not merely on ordinary rerenders. Use an identity fingerprint or individual primitive dependencies; do not depend on the object reference.

- [ ] **Step 5: Connect `IdentityDialog` and keep data mapping local**

Replace the direct `.identity-dialog-content` contents with the card. Add:

```tsx
import { RoleRevealCard } from './RoleRevealCard';
```

Then render:

```tsx
<RoleRevealCard
  open={open}
  identity={identity}
  roleLabel={t(roleKey[identity.role])}
  roleArt={roleArt[identity.role]}
  roleLabelCaption={t('identity.role', 'Role')}
  wordLabelCaption={t('identity.word', 'Word')}
  noWordLabel={t('identity.noWord', 'No word')}
  revealLabel={t('identity.revealCard')}
  protectLabel={(name) => t('identity.protect', 'Protect {{name}}', { name })}
/>
```

Remove the now-unused `Text` import and `isMrWhite` local. Keep `Dialog`, `Layout`, header closing behavior, `roleKey`, and `roleArt` unchanged.

- [ ] **Step 6: Update the asset test for private-by-default rendering**

In `AssetPresentation.test.tsx`, for each role test activate the `.identity-reveal-card__back` button before locating `.identity-dialog-role-art`:

```tsx
const reveal = container.querySelector<HTMLButtonElement>('.identity-reveal-card__back')
await act(async () => { reveal?.click() })
const image = container.querySelector<HTMLImageElement>('.identity-dialog-role-art')
expect(image?.getAttribute('alt')).toBe('')
expect(image?.getAttribute('src')).toContain(asset)
```

The test must not expect role artwork before activation.

- [ ] **Step 7: Run targeted tests and verify green**

Run:

```bash
cd client && npm run test -- --run src/features/game/RoleRevealCard.test.tsx src/pages/AssetPresentation.test.tsx
```

Expected: PASS for secrecy, activation, reset, and the five imported role assets.

---

### Task 2: Add 3D card, fine-pointer tilt, and reduced-motion styling

**Files:**
- Create: `client/src/features/game/role-reveal-card-css.test.ts`
- Modify: `client/src/index.css`

**Interfaces:**
- Consumes: `identity-reveal-card`, `identity-reveal-card__inner`, `identity-reveal-card__back`, `identity-reveal-card__front`, and `is-revealed` class names produced by `RoleRevealCard`.
- Produces: 3D flip presentation with CSS variables reset by the component, fine-pointer-only tilt visual response, and a reduced-motion fallback.

- [ ] **Step 1: Write the failing CSS contract test**

Create `client/src/features/game/role-reveal-card-css.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

test('defines a private 3D role-card reveal with safe motion fallbacks', () => {
  expect(css).toContain('.identity-reveal-card {')
  expect(css).toContain('perspective: 1000px')
  expect(css).toContain('.identity-reveal-card__inner {')
  expect(css).toContain('transform-style: preserve-3d')
  expect(css).toContain('.identity-reveal-card.is-revealed .identity-reveal-card__inner')
  expect(css).toContain('rotateY(180deg)')
  expect(css).toContain('@media (hover: hover) and (pointer: fine)')
  expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  expect(css).toContain('.identity-reveal-card__inner { transition: none; transform: none; }')
})
```

- [ ] **Step 2: Run the contract test and verify red**

Run:

```bash
cd client && npm run test -- --run src/features/game/role-reveal-card-css.test.ts
```

Expected: FAIL because role-reveal CSS does not exist.

- [ ] **Step 3: Add scoped app-layer CSS**

Replace the old `.identity-dialog-content` and `.identity-dialog-role-art` rules at the top of `client/src/index.css` with the following. Preserve `.identity-dialog-role-art` sizing behavior on the revealed face:

```css
    .identity-reveal-card {
        --identity-card-rotate-x: 0deg;
        --identity-card-rotate-y: 0deg;
        --identity-card-highlight-x: 50%;
        --identity-card-highlight-y: 50%;
        perspective: 1000px;
    }

    .identity-reveal-card__inner {
        position: relative;
        display: grid;
        min-height: 21rem;
        transform-style: preserve-3d;
        transition: transform 560ms cubic-bezier(.16, 1, .3, 1);
    }

    .identity-reveal-card.is-revealed .identity-reveal-card__inner {
        transform: rotateY(180deg) rotateX(var(--identity-card-rotate-x)) rotateY(var(--identity-card-rotate-y));
    }

    .identity-reveal-card__back,
    .identity-reveal-card__front {
        grid-area: 1 / 1;
        border-radius: var(--radius-container);
        backface-visibility: hidden;
    }

    .identity-reveal-card__back {
        display: grid;
        place-content: center;
        gap: .75rem;
        min-height: 100%;
        border: 1px solid color-mix(in srgb, var(--color-accent), transparent 35%);
        background: linear-gradient(145deg, color-mix(in srgb, var(--color-accent), var(--color-background-card) 30%), var(--color-background-card));
        color: var(--color-text-primary);
        font: inherit;
        cursor: pointer;
    }

    .identity-reveal-card__back:focus-visible {
        outline: 3px solid var(--color-accent);
        outline-offset: 4px;
    }

    .identity-reveal-card__front {
        display: grid;
        gap: .5rem;
        align-content: start;
        padding: 1rem;
        background: var(--color-background-card);
        transform: rotateY(180deg);
        overflow: hidden;
    }

    .identity-reveal-card__front::after {
        position: absolute;
        inset: 0;
        content: '';
        pointer-events: none;
        opacity: 0;
        background: radial-gradient(circle at var(--identity-card-highlight-x) var(--identity-card-highlight-y), rgb(255 255 255 / .18), transparent 38%);
    }

    .identity-dialog-role-art {
        width: 100%;
        max-height: 11rem;
        object-fit: cover;
        object-position: center 24%;
        border-radius: var(--radius-element);
        opacity: .84;
    }

    @media (hover: hover) and (pointer: fine) {
        .identity-reveal-card.is-revealed .identity-reveal-card__inner {
            transition: transform 150ms ease-out;
        }

        .identity-reveal-card.is-revealed .identity-reveal-card__front::after {
            opacity: 1;
        }
    }
```

Inside the existing `@media (prefers-reduced-motion: reduce)` block, append the exact single-line fallback required by the contract test:

```css
        .identity-reveal-card__inner { transition: none; transform: none; }
```

Also make both faces readable in the reduced-motion case without rotation:

```css
        .identity-reveal-card__back { display: none; }
        .identity-reveal-card__front { transform: none; }
```

Scope the latter two declarations to `.identity-reveal-card.is-revealed` so a closed card remains usable.

- [ ] **Step 4: Run card contract and interaction tests**

Run:

```bash
cd client && npm run test -- --run src/features/game/role-reveal-card-css.test.ts src/features/game/RoleRevealCard.test.tsx src/pages/AssetPresentation.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Verify CSS syntax via production build**

Run:

```bash
cd client && npm run build
```

Expected: TypeScript compilation and Vite build succeed. Existing Astryx `@property` optimizer and chunk-size advisories do not fail the build.

---

### Task 3: Normalize shared Astryx control states

**Files:**
- Create: `client/src/shared-controls-css.test.ts`
- Modify: `client/src/index.css`

**Interfaces:**
- Consumes: Astryx `.astryx-button` plus reflected `data-variant` state, and TextInput’s generated wrapper/input relationships.
- Produces: one global visual contract for semantic buttons and text inputs without changing component props or individual screen logic.

- [ ] **Step 1: Write the failing CSS contract test**

Create `client/src/shared-controls-css.test.ts`:

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, test } from 'vitest'

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8')

describe('shared Astryx controls', () => {
  test('normalizes semantic button state without extending ornamental artwork', () => {
    expect(css).toContain(".astryx-button[data-variant='primary']")
    expect(css).toContain(".astryx-button[data-variant='secondary']")
    expect(css).toContain(".astryx-button[data-variant='ghost']")
    expect(css).toContain(".astryx-button[data-variant='destructive']")
    expect(css).toContain('.astryx-button:focus-visible')
    expect(css).toContain(".astryx-button:is(:disabled, [aria-disabled='true'], [aria-busy='true'])")
    expect(css).toContain('min-height: 2.75rem')
  })

  test('normalizes filled text-input states and motion fallback', () => {
    expect(css).toContain('.astryx-text-input')
    expect(css).toContain('.astryx-text-input:focus-within')
    expect(css).toContain(".astryx-text-input:has(input[aria-invalid='true'])")
    expect(css).toContain('.astryx-text-input input::placeholder')
    expect(css).toContain('.astryx-text-input input {')
    expect(css).toContain('min-height: 2.75rem')
    expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  })
})
```

Before committing the selector, confirm the rendered TextInput base class with Astryx’s stable contract or a minimal runtime render. If Astryx does not emit `.astryx-text-input`, use the actual stable class it emits rather than a hashed StyleX class.

- [ ] **Step 2: Run the contract test and verify red**

Run:

```bash
cd client && npm run test -- --run src/shared-controls-css.test.ts
```

Expected: FAIL because the global control rules do not exist.

- [ ] **Step 3: Add app-layer button rules**

Place the following before the local-play special selector in `client/src/index.css`, so the Local CTA’s existing, more-specific selector continues to win:

```css
    .astryx-button {
        min-height: 2.75rem;
        transition: background-color 175ms ease-out, border-color 175ms ease-out, color 175ms ease-out, transform 175ms ease-out;
    }

    .astryx-button[data-variant='primary'] {
        background-color: var(--color-accent);
        color: var(--color-on-accent);
    }

    .astryx-button[data-variant='secondary'] {
        border-color: var(--color-border);
        background-color: var(--color-background-surface);
        color: var(--color-text-primary);
    }

    .astryx-button[data-variant='ghost'] {
        color: var(--color-text-primary);
    }

    .astryx-button[data-variant='destructive'] {
        color: var(--color-text-danger);
    }

    .astryx-button:not(:is(:disabled, [aria-disabled='true'], [aria-busy='true'])):active {
        transform: translateY(1px);
    }

    .astryx-button:focus-visible {
        outline: 3px solid var(--color-accent);
        outline-offset: 2px;
    }

    .astryx-button:is(:disabled, [aria-disabled='true'], [aria-busy='true']) {
        cursor: not-allowed;
        opacity: .58;
    }
```

Do not set `background-image` in generic button rules. Do not override native `disabled` behavior or Astryx’s loading announcement.

- [ ] **Step 4: Add app-layer text-input rules**

Use the actual verified stable TextInput selector. With `.astryx-text-input`, add:

```css
    .astryx-text-input {
        min-height: 2.75rem;
        border-color: var(--color-border);
        background: var(--color-background-surface);
        transition: border-color 175ms ease-out, box-shadow 175ms ease-out, background-color 175ms ease-out;
    }

    .astryx-text-input input {
        min-height: 2.75rem;
        color: var(--color-text-primary);
    }

    .astryx-text-input input::placeholder {
        color: color-mix(in srgb, var(--color-text-secondary), var(--color-text-primary) 14%);
        opacity: 1;
    }

    .astryx-text-input:focus-within {
        border-color: var(--color-accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent), transparent 74%);
    }

    .astryx-text-input:has(input[aria-invalid='true']) {
        border-color: var(--color-text-danger);
    }

    .astryx-text-input:has(input:is(:disabled, [aria-disabled='true'])) {
        background: var(--color-background-muted);
        opacity: .7;
    }
```

If `:has()` is not needed because Astryx puts status on the wrapper as a stable data attribute, prefer that explicit component contract. Do not select generated `x…` classes.

- [ ] **Step 5: Extend reduced-motion override**

Inside the existing `prefers-reduced-motion` media block add:

```css
        .astryx-button,
        .astryx-text-input { transition: none; }
```

- [ ] **Step 6: Run shared-controls contract test**

Run:

```bash
cd client && npm run test -- --run src/shared-controls-css.test.ts src/primary-button-art.test.ts
```

Expected: PASS. The primary artwork test proves the new global primary rule did not leak `button.png` to generic controls.

---

### Task 4: Reconcile documentation and run release verification

**Files:**
- Modify: `docs/superpowers/specs/2026-08-20-dashboard-navigation-design.md`
- Modify: `docs/superpowers/plans/2026-08-20-dashboard-navigation-redesign.md`
- Modify: `docs/superpowers/specs/2026-08-20-shared-controls-normalization-design.md`
- Modify: `docs/superpowers/specs/2026-08-20-role-identity-card-reveal-design.md`

**Interfaces:**
- Consumes: user-approved noir assets, accent migration, shared-controls specification, and role-reveal specification.
- Produces: consistent design history without stale claims that forbid the implemented role assets or wrongly describe violet/rose as the active semantic direction.

- [ ] **Step 1: Update stale dashboard documentation**

In `2026-08-20-dashboard-navigation-design.md`:

- Replace the visual-direction wording in Decision with the actual noir graphical-asset direction and `#43544d` semantic accent.
- Replace the hero’s “abstract layered violet” / “primary rose” language with artwork-backed Local/Multiplayer cards and the scoped ornamental Local CTA.
- Replace the `keyboard focus ring in violet` phrase with semantic accent.
- Remove `role illustration assets` from Non-goals; retain no fake data, new presence protocol, chat, matchmaking, or backend endpoint scope.

In `2026-08-20-dashboard-navigation-redesign.md`, update the Goal, Architecture, and global visual constraint to record that this plan is superseded in its visual constraints by the approved asset integration, global accent, shared control, and role-reveal design documents. Do not rewrite historical routing/data acceptance criteria.

- [ ] **Step 2: Run documentation consistency checks**

Run:

```bash
git diff --check -- docs/superpowers/specs docs/superpowers/plans
```

Expected: exit 0, including the previously known French trailing-whitespace check if it lies in the edited diff.

- [ ] **Step 3: Run final client verification**

Run:

```bash
cd client && npm run test -- --run && npm run build
```

Expected: all Vitest files pass and Vite production build succeeds. Record known non-failing Astryx CSS optimizer and chunk-size advisories separately from errors.

- [ ] **Step 4: Run final server verification**

Run:

```bash
cd ../server-py && .venv/bin/python -m pytest -q
```

Expected: all server tests pass. Record existing framework deprecation warnings without treating them as failures.

- [ ] **Step 5: Perform real-surface smoke validation when browser control is available**

Run Vite locally:

```bash
cd client && npm run dev -- --host 127.0.0.1
```

Inspect `/reveal` during a local game and `/game` after selecting a local identity at 1440px and 390px widths. Verify:

- closed role card does not display private content;
- click and keyboard activation reveal it;
- desktop fine-pointer tilt follows/returns without affecting touch;
- dialog close/reopen resets to the card back;
- reduced motion removes flip/tilt;
- setup and a text-input form show filled inputs, visible focus, error/disabled distinction, and 44px targets;
- the Local CTA alone uses the ornamental button artwork.

If browser control again times out, record that limitation and retain the targeted behavioral/CSS tests and production build evidence; do not claim visual confirmation.

- [ ] **Step 6: Request focused final review**

Dispatch a reviewer over the complete UI change set. The review must assess: private-content DOM leakage before reveal; role card lifecycle reset; keyboard/reduced-motion behavior; CSS selector stability against Astryx contracts; generic button art leakage; and stale documentation.

- [ ] **Step 7: Commit only after accepted final review**

Stage only intentional files; never use broad staging because this worktree contains unrelated/generated changes. Suggested commits:

```bash
git add client/src/features/game/RoleRevealCard.tsx client/src/features/game/RoleRevealCard.test.tsx client/src/features/game/role-reveal-card-css.test.ts client/src/features/game/IdentityDialog.tsx client/src/pages/AssetPresentation.test.tsx client/src/i18n/locales/en.json client/src/i18n/locales/fr.json client/src/index.css
git commit -m "feat: reveal role identities as cards"

git add client/src/shared-controls-css.test.ts client/src/index.css docs/superpowers/specs docs/superpowers/plans
git commit -m "style: normalize Astryx controls"
```

Do not commit until all final checks and the reviewer’s important findings are resolved.

## Self-Review

- **Spec coverage:** Task 1 supplies private card state, all-dialog scope, translations, and behavioral coverage. Task 2 covers 3D flip, desktop pointer response, and reduced motion. Task 3 implements the approved global control contract without a parallel system. Task 4 reconciles stale docs, verifies client/server, attempts real-surface validation, reviews, and commits safely.
- **No placeholders:** Every code/testing step names exact paths, commands, and expected outcomes. The stable TextInput selector has an explicit required confirmation step instead of relying on hashed classes.
- **Type consistency:** `RoleRevealCard` receives `IdentityDialogProps['identity']`-compatible data and string-mapped labels; neither game-store shape nor `IdentityDialogProps` changes.
- **Privacy:** The plan deliberately mounts revealed details only after activation; it does not depend on visual hiding or `backface-visibility` for secrecy.
