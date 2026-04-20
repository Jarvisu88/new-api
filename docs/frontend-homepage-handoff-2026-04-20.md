# Frontend Homepage Handoff - 2026-04-20

## Purpose

This file is the handoff note for continuing the homepage redesign work on the next development session.

Current goal remains:

- Continue refining the `new-api` homepage visual design
- Keep the current minimal / premium direction
- Keep the bottom-right quick menu
- Continue polishing interaction details instead of rebuilding from scratch

## Current Working Branch

- Branch: `v0.12.14-graft-v1-dev`
- Latest homepage commit: `d401d1f0`
- Latest homepage tag: `web-homepage-v5`
- Preview URL used today: `http://127.0.0.1:4174/`

## Homepage Version History

1. `web-homepage-v1` -> `44af89f0`
   First minimal homepage redesign
2. `web-homepage-v2` -> `09f5e4e7`
   Removed the mouse-follow hero mask and restored the bottom-right quick menu
3. `web-homepage-v3` -> `26b54644`
   Added animated `Sentence Flip` headline
4. `web-homepage-v4` -> `9f688e69`
   Added hero proximity interactions and first proximity background / provider interaction pass
5. `web-homepage-v5` -> `d401d1f0`
   Switched hero background to glowing dots style, fixed provider tooltip overlap, refined bottom-right menu motion and horizontal trigger text

## Current Homepage State

What is already in place:

- Hero title uses animated sentence flip
- Subtitle paragraph is visually removed
- Hero background uses glowing dots interaction
- Provider icon bar has proximity interaction
- Provider tooltip is now single-instance, no stacked overlapping labels
- Bottom-right quick menu is kept
- Quick menu trigger text stays horizontal after rotation
- Quick menu items have richer hover / open motion

## Key Files

- Homepage page:
  - `web/src/pages/Home/index.jsx`
- Hero headline component:
  - `web/src/components/common/SentenceFlip.jsx`
- Hero glowing dots background:
  - `web/src/components/common/ProximityBackground.jsx`
- Provider proximity icon bar:
  - `web/src/components/common/ProximityProviderIcons.jsx`
- Shared homepage styles:
  - `web/src/index.css`

## What Was Verified Today

- `bun run build` passes
- Desktop homepage was checked in Chrome MCP
- Mobile homepage was checked in Chrome MCP
- Console had no new homepage frontend errors in final checks

Reference screenshots captured today:

- `.codex-temp/home-glowing-dots-final.png`
- `.codex-temp/home-proximity-background-desktop-v2.png`
- `.codex-temp/home-proximity-background-mobile.png`
- `.codex-temp/home-sentence-flip.png`
- `.codex-temp/home-sentence-flip-mobile.png`

## Important Implementation Notes

### 1. Protected project identity

Do not remove or replace:

- `new-api`
- `QuantumNous`

### 2. Do not touch unrelated dirty files

These were not part of the homepage work and should not be mixed into homepage commits unless explicitly needed:

- `AGENTS.md`
- `web/vite.config.js`
- `docs/development-worktree-map.md`

### 3. Current visual direction

The homepage is now in a StackBits-inspired direction, but adapted to the existing React + Vite + Semi UI project:

- dark premium hero
- very short headline messaging
- no large descriptive paragraph
- interaction-focused provider strip
- floating radial quick menu

### 4. Why the glowing dots background was changed

The previous proximity background version had pointer offset differences between MCP Chrome and the user's local Chrome.

Current approach:

- uses a grid-based glowing dots activation model
- computes active cell by pointer position inside the hero container
- avoids the previous offset-prone freeform proximity calculation

## Best Next Steps For Tomorrow

Recommended order:

1. Refine the hero provider strip
   - tighten spacing
   - tune icon size / tooltip placement
   - make the strip feel more premium and less "component-y"

2. Refine glowing dots background
   - match StackBits reference even closer
   - tune dot density, glow radius, edge fade, and contrast

3. Polish bottom-right quick menu
   - tune radial distances
   - improve open / close staging
   - soften label movement and icon emphasis

4. Tighten hero composition
   - rebalance top spacing between version pill, provider strip, headline, CTA buttons
   - make desktop feel more intentional and less vertically loose

5. Final responsive pass
   - verify 1440px desktop
   - verify common laptop heights
   - verify 390px mobile

## If Continuing Tomorrow

Recommended startup checklist:

1. Checkout branch `v0.12.14-graft-v1-dev`
2. Open `http://127.0.0.1:4174/`
3. Review `docs/frontend-homepage-handoff-2026-04-20.md`
4. Use `web-homepage-v5` as the current visual baseline
5. Continue only from the files listed in the "Key Files" section

## Suggested Commit Strategy

For tomorrow, keep homepage work as small, isolated steps and continue tagging important checkpoints:

- `web-homepage-v6`
- `web-homepage-v7`
- etc.

This keeps rollback and A/B comparison easy.
