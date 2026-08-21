# Local Player Card Actions Design

## Decision

Replace the local-game dropdown and per-player ballot workflow with direct actions on player cards. The group decides orally; the person holding the device selects the agreed target. Online multiplayer keeps its existing individual voting behavior.

## Local interaction model

Every player is represented by an interactive card. Activating a living player's card expands an inline action area for that player. Only one card is expanded at a time.

The expanded actions are:

- **View role**: open the existing private identity reveal for the selected player.
- **Vote**: begin confirmation of the selected player's elimination.

Activating the expanded card again or selecting another card closes or replaces the action area. Actions use native buttons. The card trigger is keyboard-operable with Enter and Space, exposes expanded state with `aria-expanded`, and references its action region with `aria-controls`.

Eliminated player cards remain visible but disabled. They show the existing eliminated state and expose no actions.

## Direct group vote

Local voting no longer records one ballot for every living player. The group reaches a decision outside the application, then the device holder selects the target.

The local interface therefore removes:

- the active-voter dropdown;
- the separate identity-player dropdown;
- `voterId` and `identityPlayerId` component state;
- the local Open voting action;
- vote-progress counting;
- manual vote resolution;
- use of `castVote(voterId, targetId)` from the local game page.

The discussion screen always permits the Vote action for living players. No separate voting phase is required before selecting a target.

## Confirmation

Choosing Vote opens a confirmation surface for the selected target:

- title: `Eliminate {{name}}?`;
- supporting copy: the group decision will be applied immediately;
- secondary action: Cancel;
- destructive action: Confirm elimination.

No game state changes before confirmation. Cancel closes the confirmation and preserves the game. Confirm applies one direct local elimination and closes the expanded-card state.

Use the project's existing dialog primitive if it provides the required accessible title, focus management, Escape handling, and focus return. Do not build a custom modal.

## Game rules

Add one direct local-domain action with a durable responsibility, such as `eliminatePlayer(state, playerId)`. It validates that the game is active and the target is living, then routes through the existing elimination logic rather than duplicating winner rules.

Existing role outcomes remain authoritative:

- eliminating the Jester produces the existing Jester victory;
- selecting Mr. White enters the existing word-guess flow;
- Bodyguard protection uses the existing protected-resolution behavior;
- normal elimination advances or finishes the game through existing winner checks;
- completed games still navigate to Results.

The old ballot functions may remain only if required by online or other active callers. If local-only and unused after the cutover, remove them and their obsolete types/tests. No compatibility shim.

## Player cards

Use one focused local player-card component or a small render helper only if it makes `GamePage` materially clearer. Name it by durable responsibility, such as `PlayerActionCard`, not by the current page or phase.

Card states:

- default living;
- expanded;
- confirmation pending;
- eliminated/disabled.

The visual treatment uses existing semantic card, border, accent, destructive, focus, and radius tokens. Transitions are limited to color, border, opacity, and transform for 150–200ms. Reduced motion removes transforms and animated expansion without hiding content.

The cards remain usable in a two-column mobile grid and a wider responsive grid. Action buttons must keep 44px minimum targets and must not be nested inside another `<button>`; the card shell and action buttons use valid interactive markup.

## Identity privacy

View role selects exactly the activated player, then opens the existing `IdentityDialog`/private role reveal. Private role and word content remain absent from readable DOM until the established reveal interaction activates them.

Closing the identity dialog clears or safely retains only the selected card UI state; it must never expose another player's identity by inference.

## Online game

`OnlineGame` and its `PlayerGrid` preserve the current server-authoritative flow:

- host opens voting;
- each online player votes once;
- the server resolves the vote;
- the current player's identity button remains unchanged.

The local redesign must not change online API calls, selectors, store state, or multiplayer copy.

## Translations

Add matching English and French copy for card actions and elimination confirmation. Remove local-only dropdown/open-voting/progress copy only when no remaining online consumer uses the key. Keep shared or online keys intact.

## Tests

Follow TDD with observable behavior:

1. A local rules test proves direct elimination rejects inactive/dead targets and preserves Jester, Mr. White, Bodyguard, normal elimination, and winner behavior through existing rule paths.
2. A local game-page interaction test proves there is no `<select>`, activating a living card exposes View role and Vote, and eliminated cards expose neither action.
3. View role opens the selected player's private identity flow.
4. Vote does not mutate state before confirmation.
5. Cancel preserves state; Confirm calls the direct elimination action for the selected target.
6. Only one card action region is expanded at a time and keyboard activation works.
7. Existing online voting tests remain unchanged and pass.
8. English and French locale keys remain structurally matched.

Run focused red/green tests, then the complete client Vitest suite and production build. Verify the actual local discussion surface at desktop and 390px mobile width when browser tooling is available.

## Non-goals

No secret ballot collection in local play, vote history, undo after confirmed elimination, timer, animation choreography, online voting redesign, backend change, new dependency, or alternate role-reveal implementation.
