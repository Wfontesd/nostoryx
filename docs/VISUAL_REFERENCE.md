# NOSTORYX Dev Labs — Visual Reference Bar

The labs are developer scenes, but the **default view must still look like a game**. Debug telemetry is secondary and hidden by default.

## Concrete reference split

### Soul's Remnant — world readability and compact MMO framing
Official Steam page: https://store.steampowered.com/app/3451980/Souls_Remnant/

Use as the bar for:
- readable 2D platformer scene composition;
- colorful fantasy world rather than abstract debug backgrounds;
- MMO information that coexists with exploration instead of replacing the scene;
- crafting / gathering presentation later in the lab suite.

### MapleStory — iconic 2D world + HUD hierarchy
Official Nexon page: https://www.nexon.com/main/en/MapleStory

Use as the bar for:
- strong foreground/platform silhouette;
- layered environment and playful color separation;
- bottom HUD / skill access patterns that read instantly;
- damage-number readability and character-centric framing.

### Elsword — combat impact and skill presentation
Official screenshot/media pages:
- https://elsword.koggames.com/dungeon-revamp/
- https://fr.elsword.gameforge.com/media/screenshots

Use as the primary combat bar for:
- large, readable skill icons;
- attacks that temporarily dominate the frame;
- layered impact effects, flashes, rays, particles and target reactions;
- strong damage typography;
- clear anticipation → strike → hit-stop → reaction → aftermath rhythm.

## Acceptance checks for Combat Lab

A visual critic should reject a build when any of these is true:
1. The first impression is "debug dashboard" rather than "2D action MMORPG".
2. Developer panels occupy major gameplay space by default.
3. A damaging skill is represented by only one primitive effect layer.
4. Heavy/skill hits do not create visibly stronger feedback than quick attacks.
5. Skill slots look like ordinary web buttons/cards.
6. Background is a flat/grid test room with no world depth.
7. Damage numbers have no hierarchy between normal and high-impact hits.

## V2 direction

The current V2 pass intentionally uses generated placeholder art. Asset fidelity is **not** the target yet; composition, hierarchy, timing, feedback density and game-like framing are.
