# 2026-08-20 Dashboard and Navigation Redesign

## Decision

Undercover becomes an action-first, adaptive dashboard. Anonymous players can immediately start a local game; signed-in players additionally receive recent-game and friends surfaces backed only by real profile/stat/friend data. The visual direction remains dark-first violet/rose, but uses abstract tactical composition rather than role illustrations.

## Information architecture

Four primary destinations replace six flat navigation items:

1. **Accueil** — dashboard and immediate actions.
2. **Jouer** — explicit mode selection: Local and Multijoueur.
3. **Social** — friends, incoming/outgoing requests, lobby invitations.
4. **Compte** — profile, statistics, language, theme, sign-out.

Desktop uses the same four concepts in the header. Mobile has four safe-area tabs. Existing URLs remain valid as deep links; route grouping changes navigation labels and entry points, not existing playable URLs.

## Dashboard

The home screen leads with one dominant **Partie locale** action card. It has an abstract layered violet composition, a concise promise, and one primary rose action that opens local setup. It is the only visually dominant element.

Supporting actions are smaller and quieter:

- **Créer un salon** and **Rejoindre un salon**, grouped under online play.
- **Parties récentes** shows real finished results for authenticated users: outcome, role, date, and word pair only where the returned statistics already expose it. Anonymous users receive an honest empty/account-upgrade prompt; no fabricated history.
- **Amis en ligne** is an authenticated-only friend summary. Until presence exists in the data contract, it must not claim live availability. It instead shows accepted friends and an explicit route to Social; a later presence source can replace this section without altering dashboard structure.

The dashboard keeps a compact active-game resume banner only when an actual local or online active state exists. It never outranks local game launch.

## Navigation grouping

**Jouer** is a mode-selection page with Local and Multijoueur, preserving `/setup` and `/lobby` as destinations. **Social** owns `/friends`. **Compte** contains profile and settings as clear rows/subnavigation; `/profile` and `/settings` remain direct routes.

## Form and action system

Inputs use a filled high-contrast surface, stable visible label, clear supporting/error text, keyboard focus ring in violet, and 44px minimum touch target. Buttons use a single primary rose action, a quiet outlined/tonal secondary action, and a text-like tertiary action. Loading/disabled/focus states remain visibly distinct. The system uses existing Astryx primitives and semantic tokens; no parallel component library.

## Responsive behavior and motion

On mobile, the local-play card is first and full width. Supporting actions stack before social/history. On desktop, the hero sits beside the online actions, with history below. Motion is limited to opacity/transform transitions and respects reduced motion. All content is visible without animation.

## Data/error states

Dashboard data loads independently. One failed social/stat request does not hide launch controls. Each section owns its loading, empty, and error state. Account-only data never blocks anonymous local play.

## Testing

Add tests for dashboard state selectors/conditional sections, route grouping, and no fabricated authenticated data. Preserve client build and Vitest coverage; verify desktop and 390px mobile using the running application when browser tooling is available.

## Non-goals

No presence protocol, chat, matchmaking, fake activity, role illustration assets, or new backend endpoints in this redesign. The existing friends/stat APIs remain the data boundary.
