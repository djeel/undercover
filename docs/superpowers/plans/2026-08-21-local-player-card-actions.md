# Local Player Card Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace local dropdown and ballot voting with direct actions on player cards: privately view a selected role or confirm the group's chosen elimination.

**Architecture:** Add one direct `eliminatePlayer(state, playerId)` local-domain operation that reuses the existing elimination path and role outcomes. Expose it through the Zustand local store, then replace LocalGame's selector/vote controls with accessible `PlayerActionCard` instances and an Astryx confirmation dialog. Online `PlayerGrid`, API voting, and server-authoritative state remain untouched.

**Tech Stack:** React 19, TypeScript, Zustand 5, React Router 7, Astryx Design 0.4, Vitest 3 + jsdom, i18next, Vite 5.

## Global Constraints

- Local groups decide orally; the device holder confirms one agreed target. Do not collect individual local ballots.
- Living local player cards expose View role and Vote during discussion without opening a voting phase.
- Vote changes no state until destructive confirmation; Cancel preserves state.
- Preserve existing Jester, Mr. White, Bodyguard, winner, results-navigation, and private identity-reveal behavior through existing rule paths.
- Online voting flow, API calls, selectors, store state, copy, and `OnlineGame` behavior remain unchanged.
- Use the existing Astryx dialog/button primitives; add no dependency or custom modal implementation.
- Use durable responsibility-based names: `eliminatePlayer` and `PlayerActionCard`; avoid page/phase/layout names.
- Never nest action buttons inside a card trigger button. Maintain 44px targets, keyboard activation, `aria-expanded`, `aria-controls`, focus management, and reduced-motion behavior.
- Remove obsolete local ballot callers/state cleanly. Keep ballot domain functions only if an active caller or test still requires them.
- English and French keys must remain structurally matched.
- Follow TDD: observe each focused test failing for the missing behavior before changing production code.

---

### Task 1: Direct local elimination rule

**Files:**
- Modify: `client/src/features/local-game/rules.ts:54-102`
- Modify: `client/tests/local-rules.test.ts:1-90`

**Interfaces:**
- Produces: `eliminatePlayer(state: LocalGameState, playerId: string): LocalGameState`.
- Valid phases: `playing` and the legacy `voting` phase while old saved/in-memory state can still reach it.
- Rejects missing/dead targets and inactive phases with explicit errors.
- Routes Jester, Mr. White, Bodyguard, normal elimination, and winner logic through the existing private `eliminate`/`finishOrContinue` path.

- [ ] **Step 1: Add failing direct-elimination rule tests**

Update imports in `client/tests/local-rules.test.ts` to include `eliminatePlayer`. Add:

```ts
describe('eliminatePlayer', () => {
  test('rejects inactive games and missing or eliminated targets', () => {
    const active = game([
      player('a', 'civilian'),
      player('b', 'undercover'),
      player('c', 'civilian'),
    ])

    expect(() => eliminatePlayer({ ...active, phase: 'finished' }, 'a')).toThrow('Elimination is not available')
    expect(() => eliminatePlayer(active, 'missing')).toThrow('Only living players may be eliminated')
    expect(() => eliminatePlayer({ ...active, players: active.players.map((entry) => entry.id === 'a' ? { ...entry, alive: false } : entry) }, 'a')).toThrow('Only living players may be eliminated')
  })

  test('eliminates a normal target through existing winner checks', () => {
    const result = eliminatePlayer(game([
      player('a', 'civilian'),
      player('b', 'civilian'),
      player('c', 'undercover'),
      player('d', 'civilian'),
    ]), 'a')

    expect(result.players.find((entry) => entry.id === 'a')?.alive).toBe(false)
    expect(result.lastResolution).toMatchObject({ type: 'elimination', source: 'vote', playerId: 'a' })
  })

  test('awards the Jester when the group eliminates the Jester', () => {
    const result = eliminatePlayer(game([
      player('j', 'jester'),
      player('c', 'civilian'),
      player('u', 'undercover'),
    ]), 'j')

    expect(result).toMatchObject({ phase: 'finished', winner: 'jester' })
  })

  test('holds Mr. White for the existing guess flow', () => {
    const result = eliminatePlayer(game([
      player('w', 'mr_white'),
      player('c', 'civilian'),
      player('u', 'undercover'),
    ]), 'w')

    expect(result).toMatchObject({ phase: 'mr_white_guess', pendingMrWhiteId: 'w' })
    expect(result.lastResolution).toMatchObject({ type: 'mr_white_pending', playerId: 'w' })
  })

  test('uses the one-shot Bodyguard protection path', () => {
    const target = player('target', 'civilian')
    const guard = { ...player('guard', 'bodyguard'), bodyguardTargetId: 'target' }
    const result = eliminatePlayer(game([target, guard, player('u', 'undercover'), player('c', 'civilian')]), 'target')

    expect(result.players.find((entry) => entry.id === 'target')?.alive).toBe(true)
    expect(result.players.find((entry) => entry.id === 'guard')?.alive).toBe(false)
    expect(result.protectionAvailable).toBe(false)
    expect(result.lastResolution).toMatchObject({ source: 'bodyguard_protection', playerId: 'guard' })
  })
})
```

- [ ] **Step 2: Run the rules test and verify RED**

```bash
cd client
npm test -- --run tests/local-rules.test.ts
```

Expected: FAIL because `eliminatePlayer` is not exported.

- [ ] **Step 3: Implement the direct rule through the existing elimination path**

Add to `client/src/features/local-game/rules.ts` before `openVoting`:

```ts
export const eliminatePlayer = (state: LocalGameState, playerId: string): LocalGameState => {
    if (state.phase !== 'playing' && state.phase !== 'voting') throw new Error('Elimination is not available');
    const target = state.players.find((player) => player.id === playerId);
    if (!target?.alive) throw new Error('Only living players may be eliminated');
    if (target.role === 'mr_white') {
        return { ...state, phase: 'mr_white_guess', votes: {}, pendingMrWhiteId: target.id, lastResolution: { type: 'mr_white_pending', playerId: target.id } };
    }
    return eliminate({ ...state, votes: {} }, playerId, 'vote');
};
```

Refactor `resolveVote` to delegate its unique target to `eliminatePlayer(state, targets[0])`, removing the duplicated Mr. White branch.

- [ ] **Step 4: Run the focused rules tests**

```bash
npm test -- --run tests/local-rules.test.ts
```

Expected: all local rule tests PASS, including legacy ballot behavior.

- [ ] **Step 5: Commit the domain operation**

```bash
git add client/src/features/local-game/rules.ts client/tests/local-rules.test.ts
git commit -m "feat: add direct local elimination"
```

---

### Task 2: Local store direct elimination action

**Files:**
- Modify: `client/src/features/local-game/local-game-store.ts:4-40,104-109`
- Create: `client/src/features/local-game/local-game-store.test.ts`

**Interfaces:**
- Consumes: `eliminatePlayer(state, playerId)` from Task 1.
- Produces: `LocalGameStore.eliminatePlayer(playerId: string): void`.
- Removes local UI dependency on `openVoting`, `castVote`, and `resolveVote`; do not remove those store methods in this task until Task 4 confirms no active local caller remains.

- [ ] **Step 1: Write the failing store action test**

Create `client/src/features/local-game/local-game-store.test.ts`:

```ts
import { afterEach, describe, expect, test } from 'vitest'
import { useLocalGameStore } from './local-game-store'

const players = [
  { id: 'civilian-1', displayName: 'Civilian', role: 'civilian' as const, word: 'Coffee', alive: true },
  { id: 'civilian-2', displayName: 'Civilian 2', role: 'civilian' as const, word: 'Coffee', alive: true },
  { id: 'undercover', displayName: 'Undercover', role: 'undercover' as const, word: 'Tea', alive: true },
  { id: 'civilian-3', displayName: 'Civilian 3', role: 'civilian' as const, word: 'Coffee', alive: true },
]

afterEach(() => useLocalGameStore.getState().resetGame())

describe('local direct elimination', () => {
  test('applies the agreed target through the store action', () => {
    useLocalGameStore.setState({ phase: 'playing', players })

    useLocalGameStore.getState().eliminatePlayer('civilian-1')

    expect(useLocalGameStore.getState().players.find((player) => player.id === 'civilian-1')?.alive).toBe(false)
    expect(useLocalGameStore.getState().lastResolution).toMatchObject({ source: 'vote', playerId: 'civilian-1' })
  })
})
```

- [ ] **Step 2: Run the store test and verify RED**

```bash
npm test -- --run src/features/local-game/local-game-store.test.ts
```

Expected: FAIL because the store has no `eliminatePlayer` method.

- [ ] **Step 3: Wire the domain action into Zustand**

In `local-game-store.ts`, import with an alias to avoid method-name ambiguity:

```ts
import {
    castVote,
    eliminatePlayer as eliminateLocalPlayer,
    leaveGame,
    openVoting,
    resolveVote,
    submitMrWhiteGuess,
    type LocalGameState,
    type LocalPlayer,
} from './rules';
```

Add to `LocalGameStore`:

```ts
    eliminatePlayer(playerId: string): void;
```

Add to the store implementation:

```ts
    eliminatePlayer: (playerId) => set((state) => eliminateLocalPlayer(localState(state), playerId)),
```

- [ ] **Step 4: Run focused store and rules tests**

```bash
npm test -- --run src/features/local-game/local-game-store.test.ts tests/local-rules.test.ts
```

Expected: both files PASS.

- [ ] **Step 5: Commit the store action**

```bash
git add client/src/features/local-game/local-game-store.ts client/src/features/local-game/local-game-store.test.ts
git commit -m "feat: expose local elimination action"
```

---

### Task 3: Accessible reusable player action card

**Files:**
- Create: `client/src/features/game/PlayerActionCard.tsx`
- Create: `client/src/features/game/PlayerActionCard.test.tsx`
- Modify: `client/src/index.css`

**Interfaces:**
- Produces:

```ts
export interface PlayerActionCardProps {
  playerId: string
  displayName: string
  alive: boolean
  expanded: boolean
  confirmationPending: boolean
  onToggle(): void
  onViewRole(): void
  onVote(): void
}
```

- Produces: `PlayerActionCard(props): JSX.Element`.
- The card shell is not a button. A full-width native trigger button controls a sibling action region; action buttons are never nested.
- Uses translations internally via `game.alive`, `game.eliminated`, `game.viewRole`, and `game.voteFor`.

- [ ] **Step 1: Write failing card interaction tests**

Create `PlayerActionCard.test.tsx` using `createRoot`/`act`. Cover:

```tsx
test('expands living-player actions with accessible trigger state', async () => {
  // render alive, expanded=false
  // assert trigger aria-expanded=false and aria-controls points to absent/hidden action region
  // click trigger and assert onToggle called
  // rerender expanded=true
  // assert visible View role and Vote buttons, each >= durable class hook
})

test('fires role and vote actions without nested buttons', async () => {
  // render expanded living card
  // assert trigger.querySelector('button') is null
  // click labels and assert callbacks independently
})

test('disables eliminated cards and exposes no actions', async () => {
  // render alive=false expanded=true
  // trigger disabled; text includes eliminated; no View role/Vote buttons
})
```

Use i18n or a `useTranslation` mock returning keys. Assert roles/names, not CSS implementation details.

- [ ] **Step 2: Run the component test and verify RED**

```bash
npm test -- --run src/features/game/PlayerActionCard.test.tsx
```

Expected: FAIL because `PlayerActionCard` does not exist.

- [ ] **Step 3: Implement valid interactive markup**

Create `PlayerActionCard.tsx` with this structure:

```tsx
import { Button } from '@astryxdesign/core/Button'
import { Text } from '@astryxdesign/core/Text'
import { useTranslation } from 'react-i18next'

export interface PlayerActionCardProps {
  playerId: string
  displayName: string
  alive: boolean
  expanded: boolean
  confirmationPending: boolean
  onToggle(): void
  onViewRole(): void
  onVote(): void
}

export function PlayerActionCard({ playerId, displayName, alive, expanded, confirmationPending, onToggle, onViewRole, onVote }: PlayerActionCardProps) {
  const { t } = useTranslation()
  const actionsId = `player-actions-${playerId}`

  return (
    <article className={`player-action-card${expanded ? ' is-expanded' : ''}${alive ? '' : ' is-eliminated'}`}>
      <button
        type="button"
        className="player-action-card__trigger"
        disabled={!alive || confirmationPending}
        aria-expanded={alive ? expanded : false}
        aria-controls={alive ? actionsId : undefined}
        onClick={onToggle}
      >
        <span className={alive ? '' : 'line-through'}>{displayName}</span>
        <Text as="span" type="supporting">{alive ? t('game.alive') : t('game.eliminated')}</Text>
      </button>
      {alive && expanded ? (
        <div id={actionsId} className="player-action-card__actions">
          <Button variant="secondary" label={t('game.viewRole')} onClick={onViewRole} width="100%" />
          <Button variant="destructive" label={t('game.voteFor')} onClick={onVote} width="100%" />
        </div>
      ) : null}
    </article>
  )
}
```

- [ ] **Step 4: Add semantic card styles**

Add app-layer CSS using existing tokens:

```css
.player-action-card {
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-container);
  background: var(--color-background-card);
  transition: border-color 175ms ease-out, background-color 175ms ease-out, transform 175ms ease-out;
}
.player-action-card.is-expanded { border-color: var(--color-accent); }
.player-action-card__trigger {
  display: flex;
  min-height: 7rem;
  width: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  padding: 1rem;
  color: var(--color-text-primary);
  text-align: center;
}
.player-action-card__trigger:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: -3px;
}
.player-action-card__trigger:not(:disabled):active { transform: scale(.99); }
.player-action-card__actions {
  display: grid;
  gap: .75rem;
  border-top: 1px solid var(--color-border);
  padding: .75rem;
}
.player-action-card.is-eliminated { opacity: .52; }
@media (prefers-reduced-motion: reduce) {
  .player-action-card,
  .player-action-card__trigger { transition: none; }
  .player-action-card__trigger:not(:disabled):active { transform: none; }
}
```

Keep card radius at the existing 16px container ceiling; do not add decorative shadows.

- [ ] **Step 5: Run component and shared CSS tests**

```bash
npm test -- --run src/features/game/PlayerActionCard.test.tsx src/shared-controls-css.test.ts
```

Expected: both PASS.

- [ ] **Step 6: Commit the reusable card**

```bash
git add client/src/features/game/PlayerActionCard.tsx client/src/features/game/PlayerActionCard.test.tsx client/src/index.css
git commit -m "feat: add player action cards"
```

---

### Task 4: Local game card workflow and confirmation

**Files:**
- Create: `client/src/pages/GamePage.test.tsx`
- Modify: `client/src/pages/GamePage.tsx:62-98`
- Modify: `client/src/i18n/locales/en.json`
- Modify: `client/src/i18n/locales/fr.json`
- Modify: `client/src/i18n/locales/setup-locales.test.ts`

**Interfaces:**
- Consumes: `PlayerActionCard` and `useLocalGameStore.getState().eliminatePlayer(playerId)`.
- Local component state becomes:

```ts
const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null)
const [identityPlayerId, setIdentityPlayerId] = useState<string | null>(null)
const [eliminationTargetId, setEliminationTargetId] = useState<string | null>(null)
const [identityOpen, setIdentityOpen] = useState(false)
```

- Removes: `voterId`, `<select>`, local `openVoting`, `castVote`, `resolveVote`, votes count and local phase gating for voting.
- Preserves: `OnlineGame` and online `PlayerGrid` byte-for-byte unless import formatting requires a mechanical change.

- [ ] **Step 1: Write the failing local GamePage interaction test**

Create `GamePage.test.tsx` with mocked router, translations, Astryx `Dialog`/`Button`/`TextInput`/`Text`, `IdentityDialog`, and stores. Render a local `playing` state. Cover observable behavior:

```tsx
test('uses player cards without dropdowns or local ballot controls', async () => {
  // assert no select
  // assert no Open voting button or vote-progress copy
  // click living card trigger
  // assert View role and Vote actions appear
  // click another card; assert only its region remains expanded
})

test('opens the selected player private identity', async () => {
  // expand player-2, click View role
  // assert mocked IdentityDialog receives player-2 identity and open=true
})

test('confirms before eliminating the selected player', async () => {
  // expand player-2, click Vote
  // assert eliminatePlayer not called
  // assert confirmation names player-2
  // click Cancel: no call
  // reopen and click Confirm elimination: called once with player-2
})

test('does not expose actions for eliminated cards', async () => {
  // eliminated trigger disabled; no action region
})
```

The test must target accessible labels/text rather than implementation-only state.

- [ ] **Step 2: Run GamePage test and verify RED**

```bash
npm test -- --run src/pages/GamePage.test.tsx
```

Expected: FAIL because local page still renders dropdown/ballot controls and no card actions.

- [ ] **Step 3: Replace LocalGame control state and callbacks**

In `LocalGame`:

- remove `votes`, `openVoting`, `castVote`, `resolveVote`, `voterId`, and string-default `identityPlayerId`;
- add `eliminatePlayer` store selector and nullable IDs;
- derive identity with `selectLocalIdentityPlayer(players, identityPlayerId ?? '')`;
- use callbacks:

```tsx
const viewRole = (playerId: string) => {
    setIdentityPlayerId(playerId)
    setIdentityOpen(true)
}
const confirmElimination = () => {
    if (!eliminationTargetId) return
    eliminatePlayer(eliminationTargetId)
    setEliminationTargetId(null)
    setExpandedPlayerId(null)
}
```

- [ ] **Step 4: Render the cards and existing identity dialog**

Replace the local header dropdown and old `PlayerGrid`/vote controls with:

```tsx
<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
  {players.map((player) => (
    <PlayerActionCard
      key={player.id}
      playerId={player.id}
      displayName={player.displayName}
      alive={player.alive}
      expanded={expandedPlayerId === player.id}
      confirmationPending={eliminationTargetId !== null}
      onToggle={() => setExpandedPlayerId((current) => current === player.id ? null : player.id)}
      onViewRole={() => viewRole(player.id)}
      onVote={() => setEliminationTargetId(player.id)}
    />
  ))}
</div>
<IdentityDialog
  open={identityOpen}
  onOpenChange={setIdentityOpen}
  identity={identity ? { role: identity.role, word: identity.word, bodyguardTargetName: bodyguardTarget?.displayName } : null}
/>
```

Keep `ResolutionNotice`, round heading, survivor count, Mr. White flow, results navigation, and game actions not related to local ballots.

- [ ] **Step 5: Add Astryx elimination confirmation dialog**

Use the installed Dialog API pattern already present in `IdentityDialog.tsx`. The content must render:

- translated `game.confirmEliminationTitle` with `{ name }`;
- `game.confirmEliminationDescription`;
- secondary `common.cancel`;
- destructive `game.confirmElimination`.

`onOpenChange(false)` clears `eliminationTargetId`. Confirm calls `confirmElimination`. Ensure the destructive button is focused or appears after Cancel in reading order; rely on Astryx focus trapping and Escape handling.

- [ ] **Step 6: Add matching translations and locale contract**

Add to both `game` objects:

English:

```json
"viewRole": "View role",
"confirmEliminationTitle": "Eliminate {{name}}?",
"confirmEliminationDescription": "The group's decision will be applied immediately.",
"confirmElimination": "Confirm elimination"
```

French:

```json
"viewRole": "Voir le rôle",
"confirmEliminationTitle": "Éliminer {{name}} ?",
"confirmEliminationDescription": "La décision du groupe sera appliquée immédiatement.",
"confirmElimination": "Confirmer l’élimination"
```

Add `"cancel": "Cancel"` / `"cancel": "Annuler"` to `common` if absent. Keep online-used `openVoting`, `voteFor`, and online voting keys. Remove `voter`, `selectPlayer`, and `votesRecorded` only after a repository search proves they have no remaining consumer.

Extend `setup-locales.test.ts` to assert `Object.keys(en.game).sort()` equals French and the new keys are truthy.

- [ ] **Step 7: Run focused page, card, rule, and locale tests**

```bash
npm test -- --run src/pages/GamePage.test.tsx src/features/game/PlayerActionCard.test.tsx src/features/local-game/local-game-store.test.ts tests/local-rules.test.ts src/i18n/locales/setup-locales.test.ts
```

Expected: all PASS.

- [ ] **Step 8: Commit the local UI cutover**

```bash
git add client/src/pages/GamePage.tsx client/src/pages/GamePage.test.tsx client/src/i18n/locales/en.json client/src/i18n/locales/fr.json client/src/i18n/locales/setup-locales.test.ts
git commit -m "feat: replace local vote dropdowns"
```

---

### Task 5: Remove obsolete local ballot store surface

**Files:**
- Modify: `client/src/features/local-game/local-game-store.ts`
- Modify: `client/src/features/local-game/local-game-store.test.ts`
- Modify: `client/tests/local-rules.test.ts` only if ballot rule tests are deleted after proving no active caller.
- Verify unchanged: `client/src/features/game/game-store.ts`, `client/src/lib/api-client.ts`, `client/src/pages/GamePage.tsx` online section.

**Interfaces:**
- Removes local-store methods `openVoting`, `castVote`, and `resolveVote` if `grep` finds no caller after Task 4.
- Keeps rule-level ballot functions only if tests deliberately retain backward-compatible domain behavior. Prefer clean removal when no production caller remains, but do not alter online equivalents in `game-store.ts`.

- [ ] **Step 1: Prove production callers are gone**

Search `client/src` for local-store calls and imports:

```text
openVoting
castVote
resolveVote
```

Expected: online store/API names remain, but `useLocalGameStore` and `GamePage` no longer consume local ballot methods.

- [ ] **Step 2: Add a store API regression assertion**

In `local-game-store.test.ts`, add a type/runtime contract that the public store retains `eliminatePlayer` and no longer exposes obsolete local ballot methods:

```ts
test('exposes direct elimination instead of local ballot collection', () => {
  const state = useLocalGameStore.getState() as Record<string, unknown>
  expect(state.eliminatePlayer).toBeTypeOf('function')
  expect(state.openVoting).toBeUndefined()
  expect(state.castVote).toBeUndefined()
  expect(state.resolveVote).toBeUndefined()
})
```

- [ ] **Step 3: Run test and verify RED**

```bash
npm test -- --run src/features/local-game/local-game-store.test.ts
```

Expected: FAIL because obsolete methods still exist.

- [ ] **Step 4: Remove obsolete local store methods/imports**

Delete `castVote`, `openVoting`, and `resolveVote` imports, interface methods, and Zustand implementations from `local-game-store.ts`. Do not change `votes` in persisted state shape unless removing it is safe across all `LocalGameState` consumers; empty `votes` may remain as domain-state compatibility weight.

If rule-level `openVoting`/`castVote`/`resolveVote` have no production caller and only test themselves, delete them and their ballot-specific tests. If retained as pure domain compatibility, document no new alias or deprecated path; they simply cease to be public store operations.

- [ ] **Step 5: Run local and online focused tests**

```bash
npm test -- --run src/features/local-game/local-game-store.test.ts tests/local-rules.test.ts src/features/game/game-store.test.ts src/pages/GamePage.test.tsx
```

Expected: all PASS; online store tests prove server-authoritative voting remains intact.

- [ ] **Step 6: Commit the clean cutover**

```bash
git add client/src/features/local-game/local-game-store.ts client/src/features/local-game/local-game-store.test.ts client/tests/local-rules.test.ts
git commit -m "refactor: remove local ballot controls"
```

---

### Task 6: Full verification and runtime smoke test

**Files:**
- Modify only if verification exposes a defect in files already listed above.

**Interfaces:**
- No new API; proves the complete local card-action contract.

- [ ] **Step 1: Run the complete client suite**

```bash
cd client
npm test -- --run
```

Expected: all Vitest files PASS with zero failures.

- [ ] **Step 2: Run the production build**

```bash
npm run build
```

Expected: TypeScript and Vite exit 0; existing Astryx `@property` and large-chunk warnings may remain warnings only.

- [ ] **Step 3: Start the client with the harness process manager**

Start `npm run dev -- --host 127.0.0.1` from `client`, wait for Vite's Local URL, and open it with Chromium browser tooling.

- [ ] **Step 4: Verify local player-card interaction at desktop**

1. Start or seed a local game in discussion state.
2. Confirm no dropdown or local Open voting control exists.
3. Activate a living card; confirm View role and Vote appear inline.
4. Activate a second card; confirm the first action region closes.
5. Open View role; confirm only that player's private reveal appears and remains initially concealed.
6. Choose Vote; confirm no player state changes before confirmation.
7. Cancel; confirm the player remains alive.
8. Reopen and Confirm; confirm the selected player or Bodyguard outcome is applied and the screen advances appropriately.

- [ ] **Step 5: Verify accessibility and mobile behavior**

At 390px width:

- two-column cards do not overflow;
- triggers and actions are at least 44px;
- Tab/Shift+Tab order is trigger then expanded actions;
- Enter/Space toggles the card;
- Escape closes the confirmation and returns focus;
- eliminated cards are disabled and expose no actions;
- reduced-motion emulation removes card transforms.

- [ ] **Step 6: Verify online voting unchanged**

Open or render the online voting path and confirm host Open voting, one vote per online player, and existing identity button still operate through the online store/API. Do not infer this from the local screen.

- [ ] **Step 7: Commit verification-driven fixes only if needed**

If verification reveals a defect, fix it with a focused regression test and commit:

```bash
git commit -m "fix: resolve player card verification gaps"
```

Do not create an empty commit.

- [ ] **Step 8: Stop the dev server**

Stop the named harness process after verification.
