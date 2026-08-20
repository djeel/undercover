# Role Identity Card Reveal Design

## Decision

Every role-identity dialog opens with a physical-style card back. Activating the card reveals the role artwork and private identity through a 3D flip. On pointer-capable desktop devices, the revealed card responds subtly to pointer position. Touch and keyboard users receive the same reveal action without hover-dependent behavior.

## Scope

The change is isolated to `client/src/features/game/IdentityDialog.tsx` and its app-layer styles. It applies to every current dialog opening: the local pass-and-play reveal, local in-game identity reopen, and online player identity reopen. It does not change identity selection, game state, player permissions, or dialog ownership.

## Component boundary

Create one focused role-reveal card component beside `IdentityDialog`. `IdentityDialog` continues to map a `PlayerRole` to its translated name and imported artwork and to provide word/bodyguard data. The card component owns only:

- closed/revealed state;
- pointer-derived tilt presentation;
- reset when `open` becomes false, a new dialog opening occurs, or identity changes;
- semantic activation and accessible instructions.

No private role, word, or bodyguard target text appears on the closed card face. The existing decorative role art remains `alt="" aria-hidden="true"`; text content remains the accessible source of identity information after reveal.

## Interaction

### Closed state

The closed face is an opaque noir card back. It is a native, labelled button spanning the card footprint. The accessible name and visible instruction state that activating it reveals the private identity. It can receive focus and handles click, Enter, and Space through native button behavior.

### Reveal

Activation makes the card revealed exactly once for that dialog session. The closed face is always present. The private revealed face is mounted only on activation, then the card rotates around the Y axis inside a `preserve-3d` scene over approximately 560ms with a decelerating curve. The revealed face contains the current role illustration, role name, word/no-word value, and optional Bodyguard target.

### Desktop pointer response

Only inside `(hover: hover) and (pointer: fine)`, pointer movement over the revealed card calculates a small X/Y rotate offset relative to the card centre. A restrained highlight pseudo-element tracks the pointer. Pointer leaving transitions both CSS variables back to neutral. The tilt is presentation only; it never changes focus or reveal state.

### Touch and reduced motion

Touch devices do not perform pointer-follow effects. Under `prefers-reduced-motion: reduce`, the same activation immediately swaps faces without rotation, interpolation, or tilt. The content and keyboard interaction remain unchanged.

## Privacy and lifecycle

The card starts closed each time the dialog opens and whenever its identity changes. Closing the dialog clears revealed state before the next open. This avoids retaining prior-player information in pass-and-play or reusing an already-revealed card after a different identity is selected.

## Visual system

Use the existing dark semantic card surface, `#43544d` accent, current role artwork, `--radius-container`, and existing typography. Do not add a new card image asset or use the dashboard background. The card back may use CSS texture/light only; it remains readable and visually quiet enough for private phone passing. Tilt intensity stays small so text does not distort.

## Accessibility

- Native button semantics provide click, Enter, and Space support.
- Closed state exposes a concise reveal instruction; the non-revealed private details are not rendered as readable content.
- Revealed state exposes the existing role, word, and target text in normal reading order.
- Focus outline stays clearly visible before and after reveal.
- Pointer motion is optional and disabled under reduced motion.

## Testing

- Add behavioral tests for closed-state secrecy, activation via click and keyboard, and reset on close/reopen or identity change.
- Add a CSS contract test for a 3D scene, fine-pointer media condition, and reduced-motion override.
- Run targeted tests, then the full client suite and production build.
- Interact with a local reveal and an in-game identity dialog in the running application at desktop and 390px whenever browser control is available.

## Non-goals

No game-store changes, no identity-selection changes, no physics library, no pointer tracking on touch, no decorative reveal of public data, and no animation that blocks access to the role information.
