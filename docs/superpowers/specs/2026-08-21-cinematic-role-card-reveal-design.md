# Cinematic Role Card Reveal Design

## Decision

Replace the current undersized reveal presentation with a centered, portrait 3D card that uses the supplied role artwork edge to edge. The interaction keeps the existing privacy and pass-and-play contracts while making the reveal a deliberate cinematic moment: click or keyboard activation on desktop, press-and-hold on touch devices, bounded cursor tilt after reveal, and a high-contrast text treatment integrated over the artwork.

## Scope

The redesign is limited to the shared identity reveal used by local pass-and-play and identity reopen flows. It changes `RoleRevealCard`, its integration in `IdentityDialog`, related app-layer styles, translations, and focused tests. It does not change role assignment, game state, player permissions, dialog ownership, or navigation.

## Layout and visual direction

The dialog is centered and sized around the portrait card instead of presenting a small card inside a wide left-anchored panel. Surrounding chrome stays quiet so the illustration is the focal point.

The card preserves the source artwork ratio, uses the matching imported asset for each role, and displays it full bleed without the current fixed-height crop. Corners remain moderately rounded. A defined directional shadow and changing light response create depth without adding a decorative border-and-shadow combination.

The revealed face uses a bottom overlay that transitions from transparent to an opaque near-black tinted toward the app primary color. It covers enough of the lower artwork to keep every supported role label, secret word, instruction, and optional Bodyguard target readable. Text contrast must meet WCAG AA independently of the underlying image.

The information hierarchy is:

1. translated role name;
2. secret word or translated no-word state as the dominant line;
3. short translated instruction;
4. optional Bodyguard target when applicable.

The back face uses `card.png`. It contains only the reveal instruction and press progress; no private role, word, target, role-specific image, or accessible private text is mounted before activation.

## Interaction

### Desktop and keyboard

The entire closed card is a native button. A click reveals it once for the current dialog session. Enter and Space retain native button activation. Focus remains visibly indicated against both faces.

The reveal rotates the card around its vertical axis using a perspective scene and `transform-style: preserve-3d`. The motion uses a decelerating cinematic curve without bounce or elastic overshoot. Shadow and highlight shift during rotation so the card reads as a physical object rather than two flat panels crossfading.

After reveal, fine-pointer movement controls bounded `rotateX` and `rotateY` values relative to the card center. A restrained radial highlight follows the pointer. Pointer exit returns the card to neutral. Tilt never triggers reveal and never exceeds an angle that harms text legibility.

### Touch devices

Coarse-pointer devices use press-and-hold rather than double tap. Touching the closed card starts a visible hold-progress treatment. Reaching the threshold reveals the card; releasing, cancelling, or moving outside before the threshold resets progress without revealing private information. Tilt and cursor highlight are disabled.

The hold instruction is translated and must not depend on color alone. The interaction remains implemented on the native button and must avoid accidental page scrolling while the active hold gesture is in progress.

### Reduced motion

Under `prefers-reduced-motion: reduce`, pointer tilt, animated rotation, highlight travel, and interpolated hold decoration are disabled. Activation still reveals the same content immediately or with a short opacity change. Press-and-hold remains the touch privacy guard, but its progress is represented without spatial animation.

## Privacy and lifecycle

Private identity content is not present in the DOM or accessibility tree before successful activation. The card resets to closed when:

- the dialog closes;
- the dialog opens for a new session;
- the identity changes;
- pass-and-play advances to the next player.

Any active hold timer is cancelled on pointer cancellation, unmount, close, or identity change. A stale callback must never reveal the next player's identity.

## Component boundary

`IdentityDialog` continues to resolve translated identity data and the imported artwork for the current role. `RoleRevealCard` owns only reveal state, hold gesture state, pointer-derived presentation variables, lifecycle reset, and semantic activation.

Use native React state, Pointer Events, timers, and CSS transforms. No animation or gesture dependency is added. CSS custom properties carry tilt, pointer position, and hold progress so pointer movement does not cause React rerenders.

## Assets and localization

Use the supplied imports from `client/src/assets/roles/`:

- `card.png` for the concealed face;
- `undercover.png`;
- `mrwhite.png`;
- `civilians.png`;
- `jester.png`;
- `bodyguard.png`.

All visible and accessible instructions remain available in French and English. Existing role, word, no-word, and Bodyguard target translations are reused. New strings are limited to the hold instruction and cancellation/ready wording if the existing catalog cannot express them.

## Responsive behavior

The card scales from a comfortable desktop portrait size down to the available mobile viewport while preserving its aspect ratio. The dialog allows enough vertical room for the full card and safe-area spacing; it must not crop the card or force horizontal scrolling at 390px. Dialog close controls remain reachable without overlapping the card.

## Testing

Behavioral tests cover:

- private role and word absent before activation;
- desktop click activation;
- Enter and Space activation;
- touch hold does not reveal before the threshold;
- completed touch hold reveals;
- early release and pointer cancellation do not reveal;
- reset on close/reopen and identity change;
- stale hold timer cancellation during reset;
- correct artwork mapping for every supported role.

CSS contract tests cover the perspective scene, full-bleed portrait artwork, lower contrast overlay, fine-pointer-only tilt, coarse-pointer hold treatment, and reduced-motion overrides.

Verification runs the focused tests first, then the full client test suite and production build. Browser verification exercises the actual dialog at desktop and 390px: concealed state, flip, cursor tilt and reset, hold cancellation/completion, readable overlay text across role assets, keyboard focus, and reduced motion.

## Non-goals

No role or game-state redesign, no full-screen route, no new animation library, no device-orientation tilt, no audio or haptics, no public reveal state, and no change to supplied artwork.
