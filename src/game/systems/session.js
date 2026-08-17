const STORAGE_KEY = 'nostoryx.dev-labs.session.v1';

const DEFAULT_STATE = Object.freeze({
  inventory: Object.freeze({ iron: 7, wood: 4, herb: 5, crystal: 1, mushroom: 4 }),
  flags: Object.freeze({ showHitboxes: false, godMode: false }),
});

function cloneDefaults() {
  return {
    inventory: { ...DEFAULT_STATE.inventory },
    flags: { ...DEFAULT_STATE.flags },
  };
}

export class LabSession {
  constructor() {
    this.state = cloneDefaults();
    try {
      const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
      if (stored) this.state = { ...this.state, ...JSON.parse(stored) };
    } catch {
      // Storage is optional in private / hardened browsers.
    }
  }

  get inventory() { return { ...this.state.inventory }; }
  set inventory(value) { this.state.inventory = { ...value }; this.save(); }

  get flags() { return { ...this.state.flags }; }
  patchFlags(patch) { this.state.flags = { ...this.state.flags, ...patch }; this.save(); }

  reset() {
    this.state = cloneDefaults();
    this.save();
  }

  save() {
    try { globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(this.state)); } catch { /* optional */ }
  }
}

export const session = new LabSession();
