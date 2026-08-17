# NOSTORYX Agent Rules

## Working model

- Work on one narrowly-scoped ticket at a time.
- Developer Labs are developer-only fixtures. Do not turn them into production maps.
- Extract reusable systems from a lab only after the lab proves the interaction.
- Do not expand scope silently; record worthwhile follow-ups instead.
- Prefer deterministic, data-driven rules for combat, AI, crafting and progression.
- Add or update tests for game-domain logic that can run without Phaser or a browser.
- Before finishing: run `npm run ci`.

## Visual source of truth

Before doing any player-facing UI, combat presentation, VFX, movement presentation, crafting presentation, monsters or HUD work, read `docs/VISUAL_REFERENCE.md`.

The concrete bars are intentionally split:
- Soul's Remnant: 2D MMO world readability and compact MMO framing.
- MapleStory: layered 2D world composition, readable HUD and damage hierarchy.
- Elsword: combat impact density, skill presentation, anticipation/impact/reaction rhythm.

Do not claim visual work is finished merely because it functions. A functional implementation that still reads as a web prototype has failed the visual acceptance criteria.

## Visual quality rules

Do not ship generic web-app UI as game UI.

Final gameplay UI must avoid:
- generic Tailwind / Bootstrap card layouts;
- default HTML inputs or browser controls;
- arbitrary gradients used as a substitute for art direction;
- excessive rounded rectangles;
- emoji as production icons;
- placeholder iconography presented as final;
- dashboard density that ignores the gameplay view.

Every meaningful gameplay UI feature must have:
- one or more concrete visual references from the reference bar;
- interaction states;
- deliberate hierarchy and framing;
- readable typography at the target resolution;
- a transition or response when state changes;
- screenshot verification in a real browser build before production acceptance.

Developer telemetry must be hidden by default whenever it competes with the gameplay view. Labs should look like player-facing game scenes first and developer fixtures second.

Every damaging ability should be judged as a composition of cues rather than raw damage logic. Where appropriate, check anticipation, attack silhouette/trail, impact, target reaction, damage feedback, hit-stop, camera response and aftermath.

## Gauntlet loop for visual work

For UI, VFX, combat feel and presentation:
1. Builder selects the exact reference screenshot/category from `docs/VISUAL_REFERENCE.md`.
2. Builder implements the smallest independently judgeable piece.
3. Launch the real build and capture the actual output.
4. A fresh-context critic compares it directly with the chosen reference, not with the previous NOSTORYX version.
5. Critic identifies the largest remaining perceptual gap, not a list of tiny nits.
6. Builder iterates and captures again.
7. Repeat until the output reads as a real 2D action MMORPG and no longer as a generic web prototype.

Do not gate foundational code on visual polish; use the loop when an output is meant to be visually judged.
