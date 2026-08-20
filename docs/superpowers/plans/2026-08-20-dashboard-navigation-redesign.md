# Dashboard Navigation Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the role glossary home page with an abstract, local-play-first adaptive dashboard and consolidate navigation into Accueil, Jouer, Social, and Compte.

**Architecture:** Keep existing URLs and page implementations as deep links. Add focused route-entry pages for mode selection and account grouping, make `HomePage` a self-contained dashboard that loads only authenticated social/stat data, and express the visual system through existing Astryx primitives plus app-layer CSS. No API or Realtime protocol changes.

**Tech Stack:** React 19, React Router 7, TypeScript, Vitest, i18next, Astryx Design, Tailwind CSS 4, lucide-react.

## Global Constraints

- Keep anonymous local play immediately usable; auth-only requests must never block it.
- Use only real `/friends`, `/me`, and `/me/stats` data; do not imply presence or invent history.
- Keep `/setup`, `/lobby`, `/friends`, `/profile`, and `/settings` as direct deep links.
- Keep the dark-first violet/rose semantic-token visual language and use no role illustration assets.
- Inputs and buttons retain accessible labels, visible focus indication, and at least 44px touch targets.
- Preserve `prefers-reduced-motion`; only animate opacity and transform.
- Use a failing behavioral Vitest test before production behavior changes.

---

### Task 1: Dashboard data selector and adaptive cards

**Files:**
- Create: `client/src/features/dashboard/dashboard-state.ts`
- Create: `client/src/features/dashboard/dashboard-state.test.ts`
- Modify: `client/src/pages/HomePage.tsx`
- Modify: `client/src/i18n/locales/fr.json`
- Modify: `client/src/i18n/locales/en.json`

**Interfaces:**
- Consumes: `FriendshipView[]`, `PlayerStatsView | null`, and the auth provider’s `isAnonymous` state.
- Produces: `getDashboardState({ isAnonymous, friends, stats }): DashboardState`, where `DashboardState` contains `showMemberSections`, `acceptedFriendCount`, and `stats`.
- `HomePage` must call `api.getFriends()` and `api.getStats()` only after authenticated session resolution and render each failure independently.

- [ ] **Step 1: Write the failing selector tests**

```ts
import { describe, expect, it } from 'vitest'
import { getDashboardState } from './dashboard-state'

const stats = { gamesPlayed: 8, gamesWon: 5, gamesLost: 3, roles: {} }
const friends = [
  { profileId: 'a', status: 'accepted', requestedBy: 'me' },
  { profileId: 'b', status: 'pending', requestedBy: 'me' },
]

describe('getDashboardState', () => {
  it('never exposes account data to anonymous users', () => {
    expect(getDashboardState({ isAnonymous: true, friends, stats })).toEqual({
      showMemberSections: false,
      acceptedFriendCount: 0,
      stats: null,
    })
  })

  it('uses only accepted friends and returned statistics', () => {
    expect(getDashboardState({ isAnonymous: false, friends, stats })).toEqual({
      showMemberSections: true,
      acceptedFriendCount: 1,
      stats,
    })
  })
})
```

- [ ] **Step 2: Run the selector test to verify it fails**

Run: `npm run test -- --run src/features/dashboard/dashboard-state.test.ts`

Expected: FAIL because `dashboard-state.ts` does not exist.

- [ ] **Step 3: Implement the narrow pure selector**

```ts
import type { FriendshipView, PlayerStatsView } from '@undercover/shared'

export interface DashboardState {
  showMemberSections: boolean
  acceptedFriendCount: number
  stats: PlayerStatsView | null
}

export function getDashboardState({ isAnonymous, friends, stats }: {
  isAnonymous: boolean
  friends: FriendshipView[]
  stats: PlayerStatsView | null
}): DashboardState {
  if (isAnonymous) return { showMemberSections: false, acceptedFriendCount: 0, stats: null }
  return {
    showMemberSections: true,
    acceptedFriendCount: friends.filter((friend) => friend.status === 'accepted').length,
    stats,
  }
}
```

- [ ] **Step 4: Replace the role glossary with the dashboard**

In `HomePage.tsx`, remove the `roles` constant and the role-card grid. Use `useAuth()` to defer member requests while `isLoading` is true. Render:

```tsx
<section className="dashboard space-y-6">
  <header className="dashboard-intro">...</header>
  <section className="local-play-card" aria-labelledby="local-play-title">
    <div className="local-play-card__shapes" aria-hidden="true" />
    <div className="relative space-y-4">
      <p className="eyebrow">{t('dashboard.localEyebrow')}</p>
      <h2 id="local-play-title">{t('dashboard.localTitle')}</h2>
      <Text as="p" type="large">{t('dashboard.localDescription')}</Text>
      <Button variant="primary" label={t('dashboard.startLocal')} onClick={() => navigate('/setup')} />
    </div>
  </section>
</section>
```

Add two secondary online action cards linking to `/lobby`. For signed-in users, display the accepted-friend count linking to `/friends`, and returned game/win counts from stats. For anonymous users, display one account-upgrade link to `/auth`; do not render fake recent match rows or online indicators. Per-section error text must leave the local card intact.

Add the exact new `dashboard` translation keys in English and French; include local title, description, action labels, online section labels, account prompt, friend count, game count, and error fallback.

- [ ] **Step 5: Run dashboard tests and build**

Run: `npm run test -- --run src/features/dashboard/dashboard-state.test.ts`

Expected: PASS.

Run: `npm run build`

Expected: successful TypeScript and Vite build.

- [ ] **Step 6: Commit**

```bash
git add client/src/features/dashboard client/src/pages/HomePage.tsx client/src/i18n/locales/en.json client/src/i18n/locales/fr.json
git commit -m "feat: add local-play dashboard"
```

### Task 2: Four-destination navigation and route entry pages

**Files:**
- Create: `client/src/pages/PlayPage.tsx`
- Create: `client/src/pages/AccountPage.tsx`
- Create: `client/src/pages/navigation-pages.test.tsx`
- Modify: `client/src/pages/index.ts`
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/layout/Layout.tsx`
- Modify: `client/src/i18n/locales/fr.json`
- Modify: `client/src/i18n/locales/en.json`

**Interfaces:**
- Consumes: existing `/setup`, `/lobby`, `/friends`, `/profile`, `/settings` pages unchanged.
- Produces: `/play` entry route for local/online choices and `/account` entry route for profile/settings choices.
- Layout destinations are exactly `/`, `/play`, `/friends`, `/account`.

- [ ] **Step 1: Write failing navigation page tests**

```tsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import PlayPage from '../src/pages/PlayPage'

it('offers both real play routes', () => {
  render(<MemoryRouter><PlayPage /></MemoryRouter>)
  expect(screen.getByRole('link', { name: /local/i })).toHaveAttribute('href', '/setup')
  expect(screen.getByRole('link', { name: /multijoueur|multiplayer/i })).toHaveAttribute('href', '/lobby')
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test -- --run src/pages/navigation-pages.test.tsx`

Expected: FAIL because `PlayPage` does not exist.

- [ ] **Step 3: Create the grouped entry pages and routes**

`PlayPage` uses two equal-purpose Astryx `Card` links: Local → `/setup`, Multijoueur → `/lobby`. `AccountPage` links Profile → `/profile` and Paramètres → `/settings`; it may show a compact session/auth entry but must not duplicate profile loading or settings controls.

Export both in `pages/index.ts`; add `/play` and `/account` routes in `App.tsx`. Retain all existing routes.

In `Layout.tsx`, replace the six destinations with:

```ts
const destinations = [
  ['/', 'nav.home', Home],
  ['/play', 'nav.play', Gamepad2],
  ['/friends', 'nav.social', UsersRound],
  ['/account', 'nav.account', UserRound],
] as const
```

Use `grid-cols-4` for mobile. Preserve accessible `aria-label`, safe-area padding, current-link styling, and direct links within the grouped pages.

- [ ] **Step 4: Add localized grouping labels**

Add `nav.social`, `nav.account`, `play.title`, `play.local*`, `play.multiplayer*`, `account.title`, `account.profile*`, and `account.settings*` in both locale files. Do not delete legacy labels while any existing page still uses them.

- [ ] **Step 5: Verify navigation behavior**

Run: `npm run test -- --run src/pages/navigation-pages.test.tsx`

Expected: PASS.

Run: `npm run build`

Expected: successful build.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages client/src/App.tsx client/src/components/layout/Layout.tsx client/src/i18n/locales/en.json client/src/i18n/locales/fr.json
git commit -m "feat: group application navigation"
```

### Task 3: Abstract visual system and responsive dashboard polish

**Files:**
- Modify: `client/src/index.css`
- Modify: `client/src/pages/HomePage.tsx`
- Modify: `client/src/pages/PlayPage.tsx`
- Test: `client/src/features/dashboard/dashboard-state.test.ts`

**Interfaces:**
- Consumes: class names `dashboard`, `local-play-card`, `local-play-card__shapes`, `dashboard-intro`, and existing semantic tokens.
- Produces: responsive and reduced-motion-safe visual treatment with no new dependency or image asset.

- [ ] **Step 1: Add a failing reduced-motion contract test**

```ts
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

it('keeps dashboard transitions reduced-motion safe', () => {
  const css = readFileSync(new URL('../../src/index.css', import.meta.url), 'utf8')
  expect(css).toContain('@media (prefers-reduced-motion: reduce)')
  expect(css).toContain('.local-play-card')
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npm run test -- --run src/features/dashboard/dashboard-state.test.ts`

Expected: FAIL because app CSS does not contain the dashboard reduced-motion rule.

- [ ] **Step 3: Add semantic app-layer CSS**

In `index.css` under `@layer app`, define the dashboard classes using current semantic tokens. The hero must use `overflow: hidden`, a violet gradient, pseudo/child geometric layers, and rose primary action contrast. Avoid fixed viewport heights. Use a responsive grid at `min-width: 768px`; at narrow widths hero stays first/full-width and secondary cards stack.

Add exactly this reduced-motion protection:

```css
@media (prefers-reduced-motion: reduce) {
  .local-play-card,
  .local-play-card__shapes {
    transition: none;
    animation: none;
  }
}
```

If decorative layers animate, animate only `transform` and `opacity`; they remain fully optional visual polish.

- [ ] **Step 4: Run the contract test and build**

Run: `npm run test -- --run src/features/dashboard/dashboard-state.test.ts`

Expected: PASS.

Run: `npm run build`

Expected: successful build.

- [ ] **Step 5: Verify desktop and mobile in the application**

Run: `npm run dev -- --host 127.0.0.1` and use the browser to inspect `/` at 1440px and 390px widths. Confirm local play is first/dominant, mobile has four visible tabs, actions work, and anonymous mode shows no fabricated profile/friend/history data. If an auth backend is unavailable, inspect the anonymous route only and record that limitation.

- [ ] **Step 6: Commit**

```bash
git add client/src/index.css client/src/pages/HomePage.tsx client/src/pages/PlayPage.tsx client/src/features/dashboard/dashboard-state.test.ts
git commit -m "style: refine adaptive game dashboard"
```

## Self-Review

- Spec coverage: Task 1 implements adaptive data and local-play-first dashboard; Task 2 implements the four destinations while preserving deep links; Task 3 implements responsive abstract styling and real-surface verification.
- No new presence/chat/matchmaking/backend surface is planned. Account-only data remains unavailable to anonymous users.
- Placeholder scan: no TBD/TODO/follow-up steps.
- Type consistency: `DashboardState` and `getDashboardState` are defined in Task 1 and consumed only there; routes created in Task 2 are used by Task 3 only as existing page paths.
