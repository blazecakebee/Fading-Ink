// Global game state + persistence. Everything that must survive a reload lives in G.
export const SAVE_KEY = 'fadingink.save.v1';
export const META_KEY = 'fadingink.meta.v1';   // legacy points, perks, settings survive between lives

export const G = { char: null, world: null, ui: { tab: 'life', openCats: {} } };
export const META = { legacy: 0, perks: {}, lives: 0, bestRealm: 0, unlockedTraits: {}, settings: {} };

export function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ char: G.char, world: G.world }));
    localStorage.setItem(META_KEY, JSON.stringify(META));
  } catch (e) { console.warn('save failed', e); }
}
export function load() {
  try {
    const m = JSON.parse(localStorage.getItem(META_KEY) || 'null'); if (m) Object.assign(META, m);
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (s && s.char) { G.char = s.char; G.world = s.world; return true; }
  } catch (e) { console.warn('load failed', e); }
  return false;
}
export function wipeSave() { localStorage.removeItem(SAVE_KEY); }
