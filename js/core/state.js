// Global game state + persistence with multiple save slots.
// META (legacy points, perks, codex, settings) is shared by every slot; each slot holds one character + world.
export const SAVE_KEY = 'fadingink.save.v1';   // pre-0.5 single save (migrated into slot 1)
export const META_KEY = 'fadingink.meta.v1';
export const SLOTS_KEY = 'fadingink.slots.v1';
const slotKey = id => 'fadingink.slot.' + id;

export const G = { char: null, world: null, slot: null, ui: { tab: 'life', openCats: {} } };
export const META = { legacy: 0, perks: {}, lives: 0, bestRealm: 0, unlockedTraits: {}, settings: {} };
export const SLOTS = { active: null, list: [] };   // list: [{ id, name, age, realm, alive, updated, genes, gender, hair }]
let onSaved = null; export function onSave(f) { onSaved = f; }

const read = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { console.warn('save failed', e); return false; } };

export function summary(c) {
  return { name: `${c.first} ${c.last}`, age: c.age, realm: c.qi?.realm || 0, stage: c.qi?.stage || 1, alive: c.alive, genes: c.genes, gender: c.gender, hair: c.hair, gen: c.generation, country: c.country };
}
export function save() {
  write(META_KEY, META);
  if (!G.char || !G.slot) return;
  const updated = Date.now();
  write(slotKey(G.slot), { char: G.char, world: G.world, updated });
  const i = SLOTS.list.findIndex(s => s.id === G.slot); const entry = { id: G.slot, ...summary(G.char), updated };
  if (i >= 0) SLOTS.list[i] = entry; else SLOTS.list.push(entry);
  SLOTS.active = G.slot; write(SLOTS_KEY, SLOTS);
  onSaved?.();
}
// Load META + slot index. Migrates the old single save into slot 1 the first time.
export function loadMeta() {
  const m = read(META_KEY); if (m) Object.assign(META, m);
  const s = read(SLOTS_KEY); if (s) Object.assign(SLOTS, s);
  const old = read(SAVE_KEY);
  if (old?.char && !SLOTS.list.length) {
    const id = 'slot1'; write(slotKey(id), { ...old, updated: Date.now() });
    SLOTS.list.push({ id, ...summary(old.char), updated: Date.now() }); SLOTS.active = id; write(SLOTS_KEY, SLOTS);
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
  }
}
export function loadSlot(id) {
  const d = read(slotKey(id)); if (!d?.char) return false;
  G.char = d.char; G.world = d.world; G.slot = id; SLOTS.active = id; write(SLOTS_KEY, SLOTS); return true;
}
export function newSlotId() { let n = 1; while (SLOTS.list.some(s => s.id === 'slot' + n)) n++; return 'slot' + n; }
export function startSlot(id) { G.slot = id; G.char = null; G.world = null; }
export function deleteSlot(id) {
  try { localStorage.removeItem(slotKey(id)); } catch (e) {}
  SLOTS.list = SLOTS.list.filter(s => s.id !== id); if (SLOTS.active === id) SLOTS.active = SLOTS.list[0]?.id || null; write(SLOTS_KEY, SLOTS);
}
export const rawSlot = id => read(slotKey(id));
export const writeSlot = (id, data) => write(slotKey(id), data);
export const writeSlots = () => write(SLOTS_KEY, SLOTS);
// legacy names kept for older modules
export function load() { loadMeta(); return SLOTS.active ? loadSlot(SLOTS.active) : false; }
export function wipeSave() { if (G.slot) deleteSlot(G.slot); }
