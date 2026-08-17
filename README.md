# NOSTORYX — Developer Labs

NOSTORYX starts as a set of **isolated developer-only test rooms** for a browser MMORPG/platformer inspired by the structural strengths of 2D online action RPGs. The labs deliberately keep production content, world simulation and backend networking out of the way while individual systems are tuned.

> Current milestone: `v0.1.0-lab` — movement, combat, monster AI, VFX, crafting and HUD fixtures.

## Live build

Expected GitHub Pages URL after Pages is enabled for the repository:

`https://wfontesd.github.io/nostoryx/`

Deep links are supported:

- `?lab=movement`
- `?lab=combat`
- `?lab=monsters`
- `?lab=vfx`
- `?lab=craft`
- `?lab=ui`

## Labs

| Key | Lab | Purpose |
| --- | --- | --- |
| `1` | Movement Lab | run, jump, coyote time, jump buffer, dash, platform course |
| `2` | Combat Lab | quick/heavy/skill attacks, combo, damage, knockback, impact feedback |
| `3` | Monster Lab | spawn archetypes, deterministic AI states, aggro tuning |
| `4` | VFX Lab | reusable slash, burst, shockwave, lightning, meteor and heal cues |
| `5` | Crafting Lab | recipes, inventory mutations, salvage, authority-validation mock |
| `6` | UI / HUD Lab | gameplay HUD, skill bar, quest tracker, inventory and state fixtures |

Common controls: `ESC` lab selector, `R` restart, `H` help, `1–6` switch lab.

## Run locally

No npm runtime dependency is required in this first lab milestone. Phaser `4.2.1` is pinned in `index.html` from the official jsDelivr distribution.

```bash
npm run dev
```

Then open `http://localhost:4173`.

## Validate and build

```bash
npm run ci
```

This performs syntax checks, Node's built-in unit tests for pure game-domain logic, and creates a static `dist/` build.

## Architecture

```text
src/
  game/
    scenes/       developer labs only
    systems/      reusable and testable domain/gameplay helpers
    theme.js      lab visual constants and routing metadata
  main.js
scripts/          dependency-free local build/check/dev server
tests/            deterministic game-domain tests
docs/             design notes and visual quality references
```

The labs are intentionally **not** the future production world. Systems that prove useful here should be extracted into reusable modules before production maps depend on them.

## GitHub Pages

`.github/workflows/pages.yml` builds `dist/` and uses the official GitHub Pages Actions flow. The repository must have **Settings → Pages → Source: GitHub Actions** enabled once before the deployment can publish.

## Visual direction

`docs/references/dev-labs-concept.jpg` is an original generated concept used as an internal composition target. It is not a final UI asset and should not be copied literally.
