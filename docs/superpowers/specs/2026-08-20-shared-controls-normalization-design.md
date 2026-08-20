# Shared Astryx Controls Normalization Design

## Decision

Normalize existing Astryx `Button` and `TextInput` components across the application through the app CSS layer. Keep component APIs and current caller semantics intact. The supplied ornamental `button.png` remains exclusive to the large Local launch CTA.

## Scope

This applies wherever the existing app renders Astryx buttons or text inputs: setup, authentication, multiplayer lobby, gameplay prompts, social search, profile editing, and settings. It does not introduce wrapper components, new form primitives, or a new visual language.

## Design system contract

Astryx is the only component system. Its stable contracts are the base classes and reflected state attributes:

- Buttons: `.astryx-button`, `[data-variant]`, `[data-size]`, native disabled state, `[aria-disabled='true']`, and `[aria-busy='true']`.
- Text inputs: component-generated input wrapper styling and native `input` state, including `:focus-within`, `:disabled`, `[aria-disabled='true']`, `[aria-invalid='true']`, and `[aria-busy='true']`.

The root cause of the current inconsistency is a missing app-layer control contract, not page-specific composition. The correction belongs in `client/src/index.css`, after Astryx’s own layer, with selectors constrained to Astryx component contracts.

## Button behavior

- Preserve Astryx semantic variants: `primary`, `secondary`, `ghost`, and `destructive`.
- Primary uses the semantic accent and white foreground; secondary stays a quiet filled/outlined neutral action; ghost remains text-like; destructive retains error semantics.
- Every button has a visible keyboard focus outline, a short transform/color feedback for hover and press, and clearly reduced opacity/cursor behavior for disabled, aria-disabled, and loading states.
- Generic controls receive no decorative image asset or bespoke artwork.
- Icon-only controls retain Astryx accessible labels and callers retain their current size classes. Role steppers remain at least 44px square.

## Text-input behavior

- Input wrappers use a solid, high-contrast surface and stable semantic border.
- Labels remain visible through Astryx `Field`; placeholders are legible but visually secondary.
- Focus-within uses a semantic accent ring without removing the default accessible affordance.
- Error state is differentiated through the component’s existing `aria-invalid`/status contract, not only color; disabled and aria-disabled variants look inactive while preserving the disabled-message behavior Astryx provides.
- Input controls meet a 44px minimum interactive height without caller-level duplication.

## Exceptions

- `.local-play-card__start` remains the only selector that references `button.png`; its existing image, contrast overlay, focus, disabled, and loading rules remain more specific than generic primary styles.
- Game player-selection native controls are outside this change unless migrated to Astryx in an independent task. This prevents accidental changes to gameplay behavior.

## Accessibility and motion

- Never remove focus indicators.
- Keep text and placeholder contrast at WCAG AA or better against filled surfaces.
- Use only color/transform transitions in the 150–200ms range; `prefers-reduced-motion` disables transform transitions.
- Preserve labels, status messages, keyboard activation, native disabled semantics, and loading announcements supplied by Astryx.

## Verification

- Add a focused CSS contract test proving the shared selectors cover semantic button variants and text-input states, enforce 44px controls, preserve generic-button asset exclusion, and include reduced-motion handling.
- Run the contract test first to demonstrate its expected failure, then green after CSS implementation.
- Run the complete client Vitest suite and production build.
- Use the running app to inspect keyboard focus and touch-size behavior in setup and a representative text-input form at desktop and 390px when browser tooling is available.

## Non-goals

No component wrappers, no dependency, no per-page restyling campaign, no change to validation/business behavior, no image treatment for generic controls, and no new motion system.
