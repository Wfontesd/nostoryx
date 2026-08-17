# Developer Labs Strategy

The first NOSTORYX milestone is intentionally a laboratory rather than a game map. Each room answers a specific engineering or feel question while minimizing unrelated systems.

## Why isolated rooms

A future MMO client will combine movement, combat, AI, drops, inventory, quests, networking, social systems and world streaming. Debugging all of that simultaneously is slow and makes visual iteration noisy. A lab makes one subsystem reproducible in seconds.

## Current rooms

### Movement

Questions: Does locomotion feel responsive? Are coyote time, jump buffering and dash cadence understandable? Does platform spacing expose edge cases?

### Combat

Questions: Does input produce visible anticipation and impact? Is range readable? Do quick/heavy/skill attacks feel meaningfully different before real authored animations exist?

### Monsters

Questions: Can an archetype expose deterministic idle/chase/attack/retreat states? Is aggro range tunable without a full quest map?

### VFX

Questions: Can skills be composed from reusable timing cues? Are effects readable against a dark gameplay field? Which cues deserve authored assets or shaders later?

### Crafting

Questions: Are recipes data-driven and transactional? Can the UI surface exactly why a craft is valid or rejected? The current authority layer is a local mock only.

### UI / HUD

Questions: Can combat-critical information remain game-like and readable without using generic web dashboard components?

## Next labs worth adding

- Animation Lab — imported character rigs/spritesheets and cancel windows.
- Loot Lab — drops, pickup magnetism, rarity presentation, inventory routing.
- Skill Authoring Lab — data + timeline/VFX cue composition.
- Network Lab — Colyseus room with two browser clients and server-authoritative movement/combat validation.
- Persistence Lab — account/character/inventory database contract.
- Map Streaming Lab — portal transition, zone lifecycle and player handoff.
- Performance Lab — entity/VFX stress scenarios with repeatable budgets.
