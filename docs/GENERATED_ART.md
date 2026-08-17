# Generated Art Runtime

NOSTORYX Dev Labs can consume an original image-generation asset atlas while keeping the previous SVG art as a fallback.

## Runtime path

1. `BootScene` fetches `public/generated/nostoryx-generated-atlas.json` and the `atlas.b64.00` … `atlas.b64.14` chunks.
2. The chunks are joined into one PNG data URL in the browser.
3. Phaser registers `generated-atlas` and adds the named frames from the metadata file.
4. `generated-art.js` maps gameplay states to those frames.
5. Labs keep physics and domain objects separate from their illustrated presentation.

The encoded atlas is intentionally stored as small text chunks because GitHub Pages is the current zero-infrastructure Dev Labs host. It is a developer-build transport detail, not the planned production asset pipeline.

## Visual policy

Generated images are original NOSTORYX assets. MapleStory, Soul's Remnant and Elsword are used only as quality and composition references. Do not copy their characters, UI frames, environments or effects.

Combat presentation keeps a fallback path so replacing generated frames with hand-authored production sprites later does not require rewriting combat, AI or crafting logic.
