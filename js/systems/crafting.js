// Crafting, experimentation and gear.
import { ITEMS, RECIPES } from '../data/items.js';
import { ui } from '../core/bus.js';
import { clamp, chance, pick } from '../core/rng.js';
import { traitVal, traitMult, earnTrait, has } from './traits.js';
import { bondBonus } from './people.js';
import { addItem, stat, QUALITY, tiered, bestQ, qCounts } from './life.js';

export const itemName = id => ITEMS[id]?.name || id;
export function known(c) { c.recipes ||= []; for (const r of RECIPES) if (r.known && !c.recipes.includes(r.id)) c.recipes.push(r.id); return c.recipes; }
export const hasInputs = (c, r) => Object.entries(r.inputs).every(([id, n]) => (c.inv[id] || 0) >= n);
// v0.8.0 Craftsmanship: a sub-skill from 0 to 100 that grows every time you craft. Nothing is ever guaranteed.
export const CRAFT_MAX = 0.92;
export const craftLvl = c => Math.floor(c.craftsman || 0);
export const craftRank = c => { const l = craftLvl(c); return l >= 90 ? 'Grandmaster' : l >= 70 ? 'Master' : l >= 50 ? 'Artisan' : l >= 30 ? 'Journeyman' : l >= 12 ? 'Apprentice' : 'Novice'; };
export function craftChance(c, r) {
  return clamp(r.base * 0.75 + (c.craftsman || 0) / 100 * 0.35 + (c.stats.smarts - 50) / 250 + traitVal(c, 'craft') + (bondBonus(c, 'craft') - 1) + (has(c, 'primordial_forge') ? 0.15 : 0), 0.05, CRAFT_MAX);
}
// chance of each grade when a craft succeeds
export function craftQuality(c) {
  const l = (c.craftsman || 0) / 100, hi = clamp(0.04 + l * 0.35 + (has(c, 'primordial_forge') ? 0.1 : 0), 0, 0.5), lo = clamp(0.55 - l * 0.5, 0.05, 1);
  return { hi, lo, mid: Math.max(0, 1 - hi - lo) };
}
function craftXp(c, r, ok) {
  const before = craftLvl(c);
  c.craftsman = Math.min(100, (c.craftsman || 0) + (ok ? 1 : 0.6) * Math.max(0.15, 1.3 * (1 - (c.craftsman || 0) / 115)) * (1.5 - r.base));
  return craftLvl(c) > before ? ` Craftsmanship ${craftLvl(c)}.` : '';
}
const consume = (c, inputs) => Object.entries(inputs).forEach(([id, n]) => addItem(c, id, -n));
const recipeText = r => Object.entries(r.inputs).map(([id, n]) => `${n}× ${itemName(id)}`).join(' + ');

export function craft(c, r) {
  if (!hasInputs(c, r)) return null;
  const p = craftChance(c, r); consume(c, r.inputs);
  c.counts.crafted = (c.counts.crafted || 0) + 1;
  if (chance(p)) {
    const Q = craftQuality(c), roll = Math.random(), q = !tiered(r.out) ? 'mid' : roll < Q.hi ? 'hi' : roll < Q.hi + Q.lo ? 'lo' : 'mid';
    addItem(c, r.out, r.n || 1, q); const up = craftXp(c, r, true);
    return { text: `Crafted ${r.n > 1 ? r.n + '× ' : ''}${tiered(r.out) ? QUALITY[q].name + ' ' : ''}${itemName(r.out)}! (${Math.round(p * 100)}%)${up}`, cls: 'good', big: q === 'hi' }; }
  const up = craftXp(c, r, false);
  if (has(c, 'first_crafter')) { const back = pick(Object.keys(r.inputs)); addItem(c, back, 1); return { text: `The ${itemName(r.out)} cracked, but I saved a ${itemName(back)}.${up}`, cls: 'bad' }; }
  return { text: `The ${itemName(r.out)} failed and the ingredients were ruined. (${Math.round(p * 100)}% chance)${up}`, cls: 'bad' };
}

// Combine any 2-4 items. Matching an unknown recipe discovers it; near-misses give hints.
export function experiment(c, picked) {
  const bag = {}; picked.forEach(id => bag[id] = (bag[id] || 0) + 1);
  if (Object.entries(bag).some(([id, n]) => (c.inv[id] || 0) < n)) return null;
  const same = r => Object.keys(r.inputs).length === Object.keys(bag).length && Object.entries(r.inputs).every(([id, n]) => bag[id] === n);
  const r = RECIPES.find(same);
  stat(c, 'smarts', 1);
  if (r) {
    const k = known(c); const isNew = !k.includes(r.id);
    if (isNew) { k.push(r.id); ui.log(`Discovered a recipe: ${itemName(r.out)} = ${recipeText(r)}`, 'qi'); ui.fx('milestone'); if (k.length >= 8) earnTrait(c, 'first_crafter'); }
    const res = craft(c, r); return { ...res, big: isNew };
  }
  // failure: lose one random ingredient, maybe get a hint
  const lost = pick(picked); addItem(c, lost, -1);
  const near = RECIPES.find(rr => !known(c).includes(rr.id) && Object.keys(bag).every(id => rr.inputs[id]) && Object.keys(rr.inputs).length >= Object.keys(bag).length);
  const hint = near ? ` I sense it wants ${Object.keys(near.inputs).filter(id => !bag[id] || bag[id] !== near.inputs[id]).map(itemName).join(' and ') || 'different amounts'}…` : '';
  return { text: `The mixture fizzled. I lost a ${itemName(lost)}.${hint}`, cls: 'bad' };
}

export const gearQ = (c, slot) => c.gearQ?.[slot] || 'mid';
// a grade scales a gear piece's bonuses (penalties like -5 Agility shrink on better pieces, grow on worse)
export const qStats = (st, q) => { const m = QUALITY[q || 'mid'].mult; const o = {}; for (const k in st || {}) o[k] = st[k] >= 0 ? st[k] * m : st[k] * (2 - m); return o; };
export function gearStats(c) {
  const s = { dmg: 0, hp: 0, agi: 0, luck: 0, qi: 0 };
  for (const [slot, id] of Object.entries(c.gear || {})) { const st = qStats(ITEMS[id]?.stats, gearQ(c, slot)); for (const k in st) s[k] += st[k]; }
  for (const k of ['hp', 'agi', 'luck']) s[k] = Math.round(s[k]);
  return s;
}
export function equip(c, id, q) {
  const it = ITEMS[id]; if (!it || it.type !== 'gear' || !c.inv[id]) return;
  c.gear ||= {}; c.gearQ ||= {}; if (c.gear[it.slot]) addItem(c, c.gear[it.slot], 1, gearQ(c, it.slot));
  q = q && qCounts(c, id)[q] ? q : bestQ(c, id);
  addItem(c, id, -1, q); c.gear[it.slot] = id; c.gearQ[it.slot] = q; ui.log(`I equipped the ${QUALITY[q].name} ${it.name}.`);
}
export function unequip(c, slot) { c.gear ||= {}; if (!c.gear[slot]) return; addItem(c, c.gear[slot], 1, gearQ(c, slot)); delete c.gear[slot]; if (c.gearQ) delete c.gearQ[slot]; }

// Using consumables from the inventory
export function useItem(c, id) {
  const it = ITEMS[id]; if (!it || !c.inv[id]) return null; const pm = traitMult(c, 'pill');
  switch (it.use) {
    case 'heal': { const q = addItem(c, id, -1, 'best'); const g = Math.round(25 * pm * QUALITY[q].mult); stat(c, 'health', g); return `I swallowed a ${QUALITY[q].name} Healing Pill. Health +${g}.`; }
    case 'marrow': { const q = addItem(c, id, -1, 'best'); const g = Math.round(8 * pm * QUALITY[q].mult); c.qi.affinity = clamp(c.qi.affinity + g); return `My bones burned clean. Qi affinity +${g}.`; }
    case 'incense': addItem(c, id, -1); c.flags.incense = true; stat(c, 'stress', -15); return 'I burned calming incense. My mind is still as a lake (+12% on my next breakthrough).';
    case 'recipe': { const unk = RECIPES.filter(r => !known(c).includes(r.id) && r.id !== 'r_ink'); addItem(c, id, -1); if (!unk.length) return 'I already knew every recipe on the scroll.'; const r = pick(unk); known(c).push(r.id); return `The scroll taught me how to make ${itemName(r.out)}.`; }
    case 'ink': addItem(c, id, -1); return earnTrait(c, 'ink_touched') ? 'I wrote my name with the ink. The page wrote back.' : 'The ink dried before I could use it.';
  }
  return null;
}
