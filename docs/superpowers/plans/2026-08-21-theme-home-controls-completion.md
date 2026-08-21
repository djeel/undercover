# Theme, Home, and Shared Controls Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make theme preference reactive, replace violet dark tokens with green-neutral surfaces, simplify Home to one full-card local action, and complete the shared Astryx button/TextInput styling contract.

**Architecture:** `ThemePreferenceProvider` owns the only preference state and exposes it through context to both Astryx `Theme` and settings consumers. Home uses a reusable semantic `primary-action-card` link pattern with no nested action. Existing Astryx primitives remain unchanged; the app CSS layer owns their shared visual states.

**Tech Stack:** React 19, TypeScript, React Router 7, Astryx Design 0.4, Vitest 3 + jsdom, CSS custom properties, Vite 5.

## Global Constraints

- Preserve valid theme values `dark`, `light`, and `system`; invalid or missing storage defaults to `dark`.
- Keep `#43544d` as the light accent and the existing contrast-safe dark accent.
- No violet `hsl(250 ...)` or `hsl(252 ...)` values in dark background or neutral-text tokens.
- Create/Join actions remain only in Play → Multiplayer; do not change routes or multiplayer behavior.
- Use existing Astryx primitives and stable `.astryx-*`/`data-*` hooks; add no wrapper component system or dependency.
- Use durable names: `ThemePreferenceProvider`, `primary-action-card`, and `action-card__art`; avoid page-, asset-, or layout-specific names for reusable behavior.
- Controls remain at least 44px high, keyboard accessible, contrast-safe, and reduced-motion aware.
- Do not modify unrelated existing working-tree changes, including generated `client/node_modules/.vite` deletions.
- Follow TDD: run every focused regression test and observe the expected failure before changing production code.

---

### Task 1: Reactive theme preference provider

**Files:**
- Create: `client/src/theme/AppTheme.test.tsx`
- Modify: `client/src/theme/AppTheme.tsx:1-27`
- Verify unchanged consumer: `client/src/pages/SettingsPage.tsx:6-14`

**Interfaces:**
- Produces: `ThemePreference = 'dark' | 'light' | 'system'`.
- Produces: `ThemePreferenceProvider({ children }: { children: ReactNode }): JSX.Element`.
- Preserves: `AppTheme` as an export alias only if current imports still require the name; prefer clean cutover by updating `client/src/App.tsx` to import `ThemePreferenceProvider`.
- Produces: `useThemePreference(): readonly [ThemePreference, (preference: ThemePreference) => void]` backed by provider context.
- Persists: storage key `undercover-theme` whenever preference changes.

- [ ] **Step 1: Write the failing provider behavior test**

Create `client/src/theme/AppTheme.test.tsx`:

```tsx
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { ThemePreferenceProvider, useThemePreference } from './AppTheme'

const themeModes: string[] = []

vi.mock('@astryxdesign/core/theme', () => ({
  Theme: ({ mode, children }: { mode: string; children: React.ReactNode }) => {
    themeModes.push(mode)
    return <>{children}</>
  },
}))

function ThemeControl() {
  const [preference, setPreference] = useThemePreference()
  return <button onClick={() => setPreference('light')}>{preference}</button>
}

describe('ThemePreferenceProvider', () => {
  let container: HTMLDivElement
  let root: Root

  afterEach(async () => {
    await act(async () => { root?.unmount() })
    container?.remove()
    themeModes.length = 0
    localStorage.clear()
  })

  test('updates the mounted theme and storage from one shared preference state', async () => {
    localStorage.setItem('undercover-theme', 'dark')
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<ThemePreferenceProvider><ThemeControl /></ThemePreferenceProvider>)
    })
    expect(container.textContent).toBe('dark')
    expect(themeModes.at(-1)).toBe('dark')

    await act(async () => { container.querySelector('button')?.click() })

    expect(container.textContent).toBe('light')
    expect(themeModes.at(-1)).toBe('light')
    expect(localStorage.getItem('undercover-theme')).toBe('light')
  })

  test('falls back to dark for an invalid stored value', async () => {
    localStorage.setItem('undercover-theme', 'sepia')
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => {
      root.render(<ThemePreferenceProvider><ThemeControl /></ThemePreferenceProvider>)
    })

    expect(container.textContent).toBe('dark')
    expect(themeModes.at(-1)).toBe('dark')
  })
})
```

- [ ] **Step 2: Run the test and verify RED**

Run from `client`:

```bash
npm test -- --run src/theme/AppTheme.test.tsx
```

Expected: FAIL because `ThemePreferenceProvider` is not exported and the existing hook owns disconnected local state.

- [ ] **Step 3: Implement one provider-owned state**

Replace `client/src/theme/AppTheme.tsx` with:

```tsx
import { Theme } from '@astryxdesign/core/theme'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { undercoverTheme } from './undercover-theme'

export type ThemePreference = 'dark' | 'light' | 'system'

type ThemePreferenceContextValue = readonly [
  ThemePreference,
  (preference: ThemePreference) => void,
]

const storageKey = 'undercover-theme'
const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null)

function initialPreference(): ThemePreference {
  const stored = globalThis.localStorage?.getItem(storageKey)
  return stored === 'light' || stored === 'system' || stored === 'dark' ? stored : 'dark'
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(initialPreference)

  useEffect(() => {
    globalThis.localStorage?.setItem(storageKey, preference)
  }, [preference])

  return (
    <ThemePreferenceContext value={[preference, setPreference]}>
      <Theme theme={undercoverTheme} mode={preference}>{children}</Theme>
    </ThemePreferenceContext>
  )
}

export function useThemePreference(): ThemePreferenceContextValue {
  const value = useContext(ThemePreferenceContext)
  if (!value) throw new Error('useThemePreference must be used within ThemePreferenceProvider')
  return value
}
```

Update `client/src/App.tsx`:

```tsx
import { ThemePreferenceProvider } from './theme/AppTheme'
```

and replace the outer `<AppTheme>...</AppTheme>` with `<ThemePreferenceProvider>...</ThemePreferenceProvider>`.

Do not change `SettingsPage`; it already consumes the hook contract.

- [ ] **Step 4: Run the focused test and build type check**

```bash
npm test -- --run src/theme/AppTheme.test.tsx
npm run build
```

Expected: provider tests PASS; build exits 0.

- [ ] **Step 5: Commit the provider cutover**

```bash
git add client/src/theme/AppTheme.tsx client/src/theme/AppTheme.test.tsx client/src/App.tsx
git commit -m "fix: share theme preference state"
```

---

### Task 2: Green-neutral dark theme tokens

**Files:**
- Modify: `client/tests/undercover-theme.test.ts:1-23`
- Modify: `client/src/theme/undercover-theme.ts:15-28`

**Interfaces:**
- Preserves: `undercoverTheme` and every existing token name.
- Changes only token values; no caller or theme API changes.
- Dark elevation order: body darkest, surface lighter, card lightest.

- [ ] **Step 1: Extend the token regression tests**

Append inside the existing `describe` block in `client/tests/undercover-theme.test.ts`:

```ts
    test('uses distinct green-neutral dark surfaces without violet neutrals', () => {
        expect(undercoverTheme.tokens['--color-background-body']).toBe('light-dark(hsl(150 18% 97%), hsl(156 18% 7%))');
        expect(undercoverTheme.tokens['--color-background-surface']).toBe('light-dark(hsl(150 12% 100%), hsl(154 15% 11%))');
        expect(undercoverTheme.tokens['--color-background-card']).toBe('light-dark(hsl(150 12% 100%), hsl(152 13% 14%))');
        expect(undercoverTheme.tokens['--color-text-primary']).toBe('light-dark(hsl(156 22% 12%), hsl(150 20% 96%))');
        expect(undercoverTheme.tokens['--color-text-secondary']).toBe('light-dark(hsl(154 12% 34%), hsl(150 10% 74%))');

        const neutralTokens = [
            '--color-background-body',
            '--color-background-surface',
            '--color-background-card',
            '--color-text-primary',
            '--color-text-secondary',
            '--color-data-neutral',
        ] as const;
        for (const token of neutralTokens) {
            expect(undercoverTheme.tokens[token]).not.toMatch(/hsl\(25[02]\s/);
        }
    });
```

- [ ] **Step 2: Run the test and verify RED**

```bash
npm test -- --run tests/undercover-theme.test.ts
```

Expected: FAIL because current neutral tokens contain `hsl(250 ...)` and `hsl(252 ...)`.

- [ ] **Step 3: Replace only the neutral token values**

In `client/src/theme/undercover-theme.ts`, use:

```ts
        '--color-background-body': ['hsl(150 18% 97%)', 'hsl(156 18% 7%)'],
        '--color-background-surface': ['hsl(150 12% 100%)', 'hsl(154 15% 11%)'],
        '--color-background-card': ['hsl(150 12% 100%)', 'hsl(152 13% 14%)'],
        '--color-text-primary': ['hsl(156 22% 12%)', 'hsl(150 20% 96%)'],
        '--color-text-secondary': ['hsl(154 12% 34%)', 'hsl(150 10% 74%)'],
        '--color-data-neutral': 'hsl(152 10% 62%)',
```

Keep accent and categorical tokens unchanged.

- [ ] **Step 4: Run the focused tests**

```bash
npm test -- --run tests/undercover-theme.test.ts
```

Expected: all theme tests PASS.

- [ ] **Step 5: Commit the palette correction**

```bash
git add client/src/theme/undercover-theme.ts client/tests/undercover-theme.test.ts
git commit -m "fix: use green-neutral dark surfaces"
```

---

### Task 3: Single full-card primary Home action

**Files:**
- Modify: `client/src/pages/HomePage.test.tsx:57-109`
- Modify: `client/src/pages/HomePage.tsx:1-103`
- Modify: `client/src/index.css:259-274,316-411,413-466`
- Verify unchanged: `client/src/pages/PlayPage.tsx:10-32`
- Verify unchanged: `client/src/pages/MultiplayerSetupPage.tsx:96-97`

**Interfaces:**
- Produces reusable CSS contract: `.primary-action-card`, `.primary-action-card__link`, `.action-card__art`, `.primary-action-card__shapes`.
- Home produces exactly one full-card `<Link to="/setup">` launch action.
- Removes Home dependencies on `Button`, `multiplayer.png`, `button.png`, `CSSProperties`, `DoorOpen`, and `Plus`.
- Preserves existing dashboard data and resume/member/history sections.

- [ ] **Step 1: Replace the obsolete art-presence test with behavior assertions**

In `client/src/pages/HomePage.test.tsx`, remove the `Button` mock and remove `DoorOpen`/`Plus` from the Lucide mock. Replace `renders the supplied noir art...` with:

```tsx
  test('renders one full-card local action and no online launch controls', async () => {
    memberData.isAnonymous = true
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)

    await act(async () => { root.render(<HomePage />) })

    const action = container.querySelector<HTMLAnchorElement>('.primary-action-card__link')
    expect(action?.getAttribute('href')).toBe('/setup')
    expect(action?.querySelector('button')).toBeNull()
    expect(action?.querySelector<HTMLImageElement>('.action-card__art')?.src).toContain('local.png')
    expect(container.querySelector('.dashboard-online-play')).toBeNull()
    expect(container.textContent).not.toContain('dashboard.createRoom')
    expect(container.textContent).not.toContain('dashboard.joinRoom')
    expect(container.querySelectorAll('.primary-action-card__link')).toHaveLength(1)
  })
```

- [ ] **Step 2: Run the Home test and verify RED**

```bash
npm test -- --run src/pages/HomePage.test.tsx
```

Expected: FAIL because the local action is a section with nested button and online controls still render.

- [ ] **Step 3: Cut Home over to the durable full-card link contract**

Update imports in `HomePage.tsx`:

```tsx
import { Card } from '@astryxdesign/core/Card'
import { Text } from '@astryxdesign/core/Text'
import { Clock3, Play, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
```

Keep `Link`, `useNavigate`, and `useSearchParams`; navigation is still used by tutorial redirect.

Replace lines 84-103 with:

```tsx
    <article className="primary-action-card">
      <Link className="primary-action-card__link" to="/setup">
        <img className="action-card__art" src={localArt} alt="" aria-hidden="true" />
        <span className="primary-action-card__shapes" aria-hidden="true" />
        <span className="primary-action-card__content">
          <span className="eyebrow">{t('dashboard.localEyebrow')}</span>
          <span id="local-play-title" className="text-2xl font-bold">{t('dashboard.localTitle')}</span>
          <Text as="span" type="large">{t('dashboard.localDescription')}</Text>
        </span>
      </Link>
    </article>
```

Remove imports for `multiplayerArt` and `buttonArt`. Do not alter content after the removed online section.

- [ ] **Step 4: Replace page-specific card CSS with reusable semantics**

Delete the three ornamental `.local-play-card .astryx-button...` rules and all `.dashboard-online-play*` rules.

Replace the local-card rules with:

```css
    .primary-action-card {
        min-width: 0;
    }

    .primary-action-card__link {
        position: relative;
        isolation: isolate;
        display: block;
        min-height: 17rem;
        overflow: hidden;
        border: 1px solid color-mix(in srgb, var(--color-accent), transparent 55%);
        border-radius: var(--radius-container);
        background: var(--color-background-card);
        color: var(--color-text-primary);
        transition: border-color 175ms ease-out, transform 175ms ease-out;
    }

    .primary-action-card__link:hover {
        border-color: var(--color-accent);
        transform: translateY(-2px);
    }

    .primary-action-card__link:active {
        transform: translateY(0);
    }

    .primary-action-card__link:focus-visible {
        outline: 3px solid var(--color-accent);
        outline-offset: 3px;
    }

    .action-card__art {
        position: absolute;
        z-index: 0;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .primary-action-card__link::after {
        position: absolute;
        z-index: 0;
        inset: 0;
        content: '';
        background: linear-gradient(90deg, color-mix(in srgb, var(--color-background-card), transparent 2%) 0%, color-mix(in srgb, var(--color-background-card), transparent 16%) 62%, color-mix(in srgb, var(--color-background-card), transparent 58%) 100%);
    }

    .primary-action-card__content {
        position: relative;
        z-index: 1;
        display: flex;
        max-width: 34rem;
        flex-direction: column;
        gap: 1rem;
        padding: 1.5rem;
    }

    .primary-action-card__shapes {
        position: absolute;
        z-index: 0;
        inset: 0;
        pointer-events: none;
    }
```

Keep the existing decorative pseudo-elements by renaming `.local-play-card__shapes` selectors to `.primary-action-card__shapes`. In the desktop media query, remove the online grid rule and use `.primary-action-card { grid-column: 1; }` only if the dashboard still uses two columns; otherwise delete the obsolete placement rule. In mobile rules, use `.action-card__art { object-position: 76% center; }`. In reduced motion, target `.primary-action-card__link`, `.primary-action-card__shapes`, and `.action-card__art`.

- [ ] **Step 5: Run focused Home and asset tests**

```bash
npm test -- --run src/pages/HomePage.test.tsx src/pages/AssetPresentation.test.tsx src/primary-button-art.test.ts
```

Expected: Home behavior passes. If the two asset-contract tests still require `button.png` on Home, update them to assert the asset is absent from generic/Home actions rather than restoring it. All three files must PASS.

- [ ] **Step 6: Commit the Home simplification**

```bash
git add client/src/pages/HomePage.tsx client/src/pages/HomePage.test.tsx client/src/index.css client/src/pages/AssetPresentation.test.tsx client/src/primary-button-art.test.ts
git commit -m "refactor: simplify home launch action"
```

---

### Task 4: Complete shared Astryx control states

**Files:**
- Modify: `client/src/shared-controls-css.test.ts:7-26`
- Modify: `client/src/index.css:190-257,447-460`

**Interfaces:**
- Preserves Astryx public component APIs and variant names.
- Buttons use `--radius-element`, 44px minimum height, and semantic border/background states.
- TextInput uses `--radius-element`, 44px minimum height, filled surface, focus ring, error ring, and disabled cursor.

- [ ] **Step 1: Strengthen the CSS contract test**

Replace `client/src/shared-controls-css.test.ts` assertions with:

```ts
describe('shared Astryx controls', () => {
  test('defines rounded semantic button variants and interaction states', () => {
    expect(css).toContain('.astryx-button {')
    expect(css).toContain('border-radius: var(--radius-element)')
    expect(css).toContain('min-height: 2.75rem')
    expect(css).toContain(".astryx-button[data-variant='primary']")
    expect(css).toContain(".astryx-button[data-variant='secondary']")
    expect(css).toContain(".astryx-button[data-variant='ghost']")
    expect(css).toContain(".astryx-button[data-variant='destructive']")
    expect(css).toContain('.astryx-button:hover')
    expect(css).toContain('.astryx-button:focus-visible')
    expect(css).toContain(".astryx-button:is(:disabled, [aria-disabled='true'], [aria-busy='true'])")
  })

  test('defines filled rounded TextInput focus error and disabled states', () => {
    expect(css).toContain('.astryx-text-input {')
    expect(css).toContain('border-radius: var(--radius-element)')
    expect(css).toContain('.astryx-text-input:focus-within')
    expect(css).toContain(".astryx-text-input:has(input[aria-invalid='true'])")
    expect(css).toContain('var(--color-border-red), transparent 74%')
    expect(css).toContain(".astryx-text-input:has(input:is(:disabled, [aria-disabled='true']))")
    expect(css).toContain('cursor: not-allowed')
    expect(css).toContain('.astryx-text-input input::placeholder')
    expect(css).toContain('.astryx-text-input { transition: none; }')
  })
})
```

- [ ] **Step 2: Run the test and verify RED**

```bash
npm test -- --run src/shared-controls-css.test.ts
```

Expected: FAIL because shared radius, hover, destructive framing, error ring, and disabled cursor contracts are incomplete.

- [ ] **Step 3: Complete the button rules**

Update the shared button block in `index.css`:

```css
    .astryx-button {
        min-height: 2.75rem;
        border: 1px solid transparent;
        border-radius: var(--radius-element);
        transition: background-color 175ms ease-out, border-color 175ms ease-out, color 175ms ease-out, transform 175ms ease-out;
    }

    .astryx-button[data-variant='primary'] {
        border-color: var(--color-accent);
        background-color: var(--color-accent);
        color: var(--color-on-accent);
    }

    .astryx-button[data-variant='secondary'] {
        border-color: var(--color-border-emphasized);
        background-color: var(--color-background-surface);
        color: var(--color-text-primary);
    }

    .astryx-button[data-variant='ghost'] {
        border-color: transparent;
        background-color: transparent;
        color: var(--color-text-primary);
    }

    .astryx-button[data-variant='destructive'] {
        border-color: color-mix(in srgb, var(--color-border-red), transparent 35%);
        background-color: color-mix(in srgb, var(--color-background-red), transparent 35%);
        color: var(--color-text-red);
    }

    .astryx-button:hover {
        border-color: color-mix(in srgb, currentColor, transparent 45%);
    }
```

Keep the existing active, focus-visible, and disabled selectors. Do not add artwork.

- [ ] **Step 4: Complete the TextInput rules**

Update the TextInput block:

```css
    .astryx-text-input {
        min-height: 2.75rem;
        border: 1px solid var(--color-border-emphasized);
        border-radius: var(--radius-element);
        background: var(--color-background-surface);
        transition: border-color 175ms ease-out, box-shadow 175ms ease-out, background-color 175ms ease-out;
    }

    .astryx-text-input input {
        min-height: 2.75rem;
        color: var(--color-text-primary);
    }

    .astryx-text-input input::placeholder {
        color: color-mix(in srgb, var(--color-text-secondary), var(--color-text-primary) 18%);
        opacity: 1;
    }

    .astryx-text-input:focus-within {
        border-color: var(--color-accent);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent), transparent 74%);
    }

    .astryx-text-input:has(input[aria-invalid='true']) {
        border-color: var(--color-border-red);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-border-red), transparent 74%);
    }

    .astryx-text-input:has(input:is(:disabled, [aria-disabled='true'])) {
        background: var(--color-background-muted);
        cursor: not-allowed;
        opacity: .7;
    }

    .astryx-text-input:has(input:is(:disabled, [aria-disabled='true'])) input {
        cursor: not-allowed;
    }
```

Keep `.astryx-button { transition: none; }` and `.astryx-text-input { transition: none; }` in the reduced-motion query.

- [ ] **Step 5: Run focused shared-control tests**

```bash
npm test -- --run src/shared-controls-css.test.ts src/primary-button-art.test.ts
```

Expected: both PASS; generic controls contain no ornamental asset contract.

- [ ] **Step 6: Commit the shared-control redesign**

```bash
git add client/src/index.css client/src/shared-controls-css.test.ts client/src/primary-button-art.test.ts
git commit -m "fix: complete shared control states"
```

---

### Task 5: Full verification and browser smoke test

**Files:**
- Modify only if verification exposes a defect in files already listed above.
- No new test or documentation file unless a new observable regression is found.

**Interfaces:**
- Verifies the complete approved contract; produces no new API.

- [ ] **Step 1: Run the complete client test suite**

```bash
npm test -- --run
```

Expected: all Vitest files PASS with zero failures.

- [ ] **Step 2: Run the production build**

```bash
npm run build
```

Expected: TypeScript and Vite exit 0.

- [ ] **Step 3: Launch the client**

From `client`, start the existing dev server with the harness process manager:

```text
application: npm
args: ["run", "dev", "--", "--host", "127.0.0.1"]
readiness log: "Local:.*http"
```

Use the reported local URL in Chromium.

- [ ] **Step 4: Verify theme behavior in Chromium**

1. Open `/settings` after completing onboarding if redirected.
2. Select Light; confirm the body and cards visibly switch without reload.
3. Reload; confirm Light remains selected and mounted.
4. Select Dark; confirm backgrounds are near-black green-neutral, not violet.
5. Select System; emulate or change `prefers-color-scheme` and confirm Astryx follows it.

Expected: each selection changes the mounted surface immediately and persists through reload.

- [ ] **Step 5: Verify Home behavior at desktop and 390px**

1. Open `/` at desktop width.
2. Confirm the local action is the only launch card on Home.
3. Tab to it; confirm visible focus around the whole card.
4. Click its artwork, text, and empty card area; each navigates to `/setup`.
5. Confirm no Home text/action for Create or Join exists.
6. Repeat at 390px width; confirm no overflow and the full card remains tappable.
7. Open `/play`, then `/lobby`; confirm Local/Multiplayer and Create/Join remain reachable there.

Expected: Home is local-first; multiplayer entry remains available only through Play.

- [ ] **Step 6: Verify representative shared control states**

Use `/setup` for buttons and input error/disabled states, and `/settings` for selected/unselected semantic buttons:

- default, hover, pressed, focus-visible;
- disabled and loading where exposed;
- TextInput normal, focused, invalid, and disabled where exposed;
- 44px minimum touch height at 390px.

Expected: one rounded semantic vocabulary across pages; no ornamental generic buttons.

- [ ] **Step 7: Commit only verification-driven corrections, if any**

If no correction was needed, do not create an empty commit. If a defect was fixed, stage only the affected source/test files and use:

```bash
git commit -m "fix: resolve refresh verification gaps"
```

- [ ] **Step 8: Stop the dev server**

Stop the named harness process after browser verification.
