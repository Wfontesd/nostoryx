export const THEME = Object.freeze({
  bg: 0x10152b,
  bgSoft: 0x171d38,
  panel: 0x15182b,
  panelAlt: 0x211f36,
  line: 0x6d6790,
  text: '#fff9eb',
  muted: '#c7c1d7',
  violet: 0xa980ff,
  violetText: '#d7c4ff',
  cyan: 0x64dcff,
  cyanText: '#a6efff',
  green: 0x72df96,
  amber: 0xffb45f,
  red: 0xff5d6c,
  gold: 0xffd36b,
  white: 0xffffff,
  ink: 0x161323,
});

export const LABS = Object.freeze([
  { key: 'MovementLab', query: 'movement', number: '1', title: 'Movement Lab', subtitle: 'Run · jump · coyote · dash · platforming', accent: 0x64dcff, glyph: '↗' },
  { key: 'CombatLab', query: 'combat', number: '2', title: 'Combat Lab', subtitle: 'Combos · hit reactions · damage · skills', accent: 0xffb45f, glyph: '⚔' },
  { key: 'MonsterLab', query: 'monsters', number: '3', title: 'Monster Lab', subtitle: 'Spawn · AI states · aggro · tuning', accent: 0x72df96, glyph: '◆' },
  { key: 'VfxLab', query: 'vfx', number: '4', title: 'VFX Lab', subtitle: 'Slash · burst · lightning · healing', accent: 0xb28cff, glyph: '✦' },
  { key: 'CraftLab', query: 'craft', number: '5', title: 'Crafting Lab', subtitle: 'Recipes · validation · inventory · salvage', accent: 0xf2c768, glyph: '◇' },
  { key: 'UiLab', query: 'ui', number: '6', title: 'UI / HUD Lab', subtitle: 'HUD · skills · quests · notifications', accent: 0xff83b7, glyph: '▤' },
]);

export function labByQuery(query) {
  return LABS.find((lab) => lab.query === query) ?? null;
}
