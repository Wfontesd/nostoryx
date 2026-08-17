# NOSTORYX Agent Rules

## Working model

- Work on one narrowly-scoped ticket at a time.
- Developer Labs are developer-only fixtures. Do not turn them into production maps.
- Extract reusable systems from a lab only after the lab proves the interaction.
- Do not expand scope silently; record worthwhile follow-ups instead.
- Prefer deterministic, data-driven rules for combat, AI, crafting and progression.
- Add or update tests for game-domain logic that can run without Phaser or a browser.
- Before finishing: run `npm run ci`.

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

- one or more concrete visual references;
- interaction states;
- deliberate hierarchy and framing;
- readable typography at the target resolution;
- a transition or response when state changes;
- screenshot verification in a real browser build before production acceptance.

Every damaging ability should be judged as a composition of cues rather than raw damage logic. Where appropriate, check anticipation, attack silhouette/trail, impact, target reaction, damage feedback, camera response and aftermath.

## Gauntlet loop for visual work

For UI, VFX, combat feel and presentation:

1. Builder implements the smallest independently judgeable piece.
2. Launch the real build and capture the actual output.
3. A fresh-context critic compares it directly with the chosen quality bar.
4. Critic identifies the largest remaining perceptual gap, not a list of tiny nits.
5. Builder iterates.
6. Repeat until the result is clearly game-like and no longer reads as a generic web prototype.

Do not gate foundational code on visual polish; use the loop when an output is meant to be visually judged.
