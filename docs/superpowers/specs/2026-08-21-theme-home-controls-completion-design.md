# Theme, Home, and Shared Controls Completion Design

## Decision

Complete the unfinished refresh through a targeted cutover of the existing shared contracts. `AppTheme` becomes the sole owner of theme preference, the home screen keeps one dominant full-card local action, and Astryx controls are normalized globally through the existing app CSS layer. No wrapper component system or page-specific control styling is introduced.

## Theme state

`AppTheme` owns one `ThemePreference` state initialized from the `undercover-theme` local-storage key. It passes that state directly to Astryx `<Theme mode={preference}>` and exposes the same state and setter through a React context.

`useThemePreference` consumes this context instead of creating independent state. Calling its setter updates the mounted Astryx theme immediately and persists the new preference. Consumers outside `AppTheme` fail explicitly rather than silently creating disconnected state.

Valid stored values remain `dark`, `light`, and `system`; an absent or invalid value falls back to `dark`.

## Theme palette

Keep `#43544d` as the light semantic accent and the existing contrast-safe dark accent. Replace violet dark surfaces and text neutrals with desaturated green-neutral values derived from the primary identity.

The palette must preserve distinct body, surface, and card layers in both modes. Dark mode uses a near-black green body, a slightly lighter green-neutral surface, and a further elevated card layer. Primary and secondary text retain WCAG AA contrast. No dark background or neutral text token uses the previous `hsl(250 ...)` or `hsl(252 ...)` violet family.

## Home dashboard

The home screen keeps the existing introduction, active-game resume state, authenticated friend/stat summaries, recent results, loading states, and error isolation.

The launch hierarchy changes:

- Remove the complete online-play section, including its multiplayer artwork and Create/Join links.
- Keep Create and Join actions only in the existing Play → Multiplayer flow.
- Replace the local `<section>` and nested Astryx button with one semantic `Link` to `/setup` covering the entire local card.
- Keep the local artwork, title, eyebrow, and description inside the full-card link.
- Remove the ornamental `button.png` dependency from `HomePage` and its local-card CSS.
- Give the full card a visible focus treatment, pointer/pressed feedback, and a minimum practical touch target without adding another interactive descendant.

The local action remains the dashboard's highest-priority element for anonymous and authenticated users.

## Shared buttons

Continue styling Astryx through `.astryx-button` and its reflected semantic state attributes in the app CSS layer.

All buttons receive the shared element radius, explicit semantic borders, a 44px minimum height, and consistent 175ms color/border/transform feedback. Variants remain:

- `primary`: accent fill, accent border, white-safe foreground;
- `secondary`: neutral surface, emphasized border, primary text;
- `ghost`: transparent background and border with text-like emphasis;
- `destructive`: error-tinted surface/border/text rather than an unframed red label.

Focus remains a visible semantic-accent outline. Disabled, aria-disabled, and loading states remain visibly inactive and non-pressable. Reduced motion removes transform transitions.

## Shared TextInput

Continue using Astryx `TextInput`; redesign its stable `.astryx-text-input` wrapper rather than introducing a wrapper component.

The control receives the shared element radius, explicit border, filled surface, stable internal spacing, and 44px minimum height. Labels and status messages remain owned by Astryx. Input text and placeholders use semantic text tokens with WCAG AA contrast.

States:

- focus: accent border and focus ring;
- error: error border plus error-tinted ring, preserving `aria-invalid` and status text;
- disabled/aria-disabled: muted surface, reduced contrast, and inactive cursor;
- normal: clear border against both body and card surfaces.

Only color, border, background, and shadow transition. Reduced motion disables these transitions where required by the existing application policy.

## Tests

Use behavior-first regression coverage:

1. A theme-provider test mounts a consumer, changes its preference, and proves the mounted Astryx `mode` changes immediately and local storage is updated.
2. Theme-token tests prove dark surfaces use the green-neutral family, maintain distinct elevation layers, and contain no violet `hsl(250 ...)` or `hsl(252 ...)` values.
3. The home test proves there is one full-card local link to `/setup`, no nested button, no online-play section, no Create/Join actions, and no multiplayer/button artwork dependency.
4. Shared-control CSS contract tests cover radius, semantic borders, button variants, TextInput focus/error/disabled states, 44px targets, and reduced motion.

Run each focused test red before implementation and green after its corresponding change. Then run the complete client Vitest suite and production build.

## Runtime verification

Launch the client and verify in Chromium:

- Settings changes light, dark, and system mode without a reload.
- Reload preserves the selected preference.
- Dark mode has green-neutral rather than violet backgrounds.
- The local card is clickable across its full surface and keyboard-focusable.
- The home screen contains no online Create/Join section.
- Representative buttons and TextInputs show correct default, focus, error, disabled, and loading states at desktop width and 390px mobile width.

## Non-goals

No new design-system wrappers, dependencies, backend work, route changes, multiplayer-flow redesign, storage migration, ornamental generic buttons, or unrelated dashboard restructuring.
