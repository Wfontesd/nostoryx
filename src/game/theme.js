export const THEME = Object.freeze({
  bg: 0x070a10,
  bgSoft: 0x0c111b,
  panel: 0x101722,
  panelAlt: 0x151e2b,
  line: 0x263247,
  text: '#f2f5ff',
  muted: '#8995aa',
  violet: 0x9b7bff,
  violetText: '#bca8ff',
  cyan: 0x6bdcff,
  cyanText: '#8ce7ff',
  green: 0x64d99c,
  amber: 0xf0ad62,
  red: 0xff6b78,
  white: 0xffffff,
});

export const LABS = Object.freeze([
  { key: 'MovementLab', query: 'movement', number: '1', title: 'Movement Lab', subtitle: 'Run · jump · coyote · dash · platforming', accent: 0x6bdcff, glyph: '↗' },
  { key: 'CombatLab', query: 'combat', number: '2', title: 'Combat Lab', subtitle: 'Combos · hit reactions · damage · skills', accent: 0xffad66, glyph: '⚔' },
  { key: 'MonsterLab', query: 'monsters', number: '3', title: 'Monster Lab', subtitle: 'Spawn · AI states · aggro · tuning', accent: 0x77d98e, glyph: '◆' },
  { key: 'VfxLab', query: 'vfx', number: '4', title: 'VFX Lab', subtitle: 'Slash · burst · lightning · healing', accent: 0xb98cff, glyph: '✦' },
  { key: 'CraftLab', query: 'craft', number: '5', title: 'Crafting Lab', subtitle: 'Recipes · validation · inventory · salvage', accent: 0xe6bd67, glyph: '◇' },
  { key: 'UiLab', query: 'ui', number: '6', title: 'UI / HUD Lab', subtitle: 'HUD · skills · quests · notifications', accent: 0xff7fb4, glyph: '▤' },
]);

export function labByQuery(query) {
  return LABS.find((lab) => lab.query === query) ?? null;
}
