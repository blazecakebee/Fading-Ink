// Crafting, experimentation and gear.
import { ITEMS, RECIPES } from '../data/items.js';
import { ui } from '../core/bus.js';
import { clamp, chance, pick } from '../core/rng.js';
import { traitVal, traitMult, earnTrait, has } from './traits.js';
import { bondBonus } from './people.js';
import { addItem, stat } from './life.js';

export const itemName = id => ITEMS[id]?.name || id;
export function known(c) { c.recipes ||= []; for (const r of RECIPES) if (r.known && !c.recipes.includes(r.id)) c.recipes.push(r.id); return c.recipes; }
export const hasInputs = (c, r) => Object.entries(r.inputs).every(([id, n]) => (c.inv[id] || 0) >= n);
export function craftChance(c, r) {
  if (has(c, 'primordial_forge')) return 1;
  return clamp(r.base + (c.stats.smarts - 50) / 200 + traitVal(c, 'craft') + (bondBonus(c, 'craft') - 1), 0.05, 0.98);
}
const consume = (c, inputs) => Object.entries(inputs).forEach(([id, n]) => addItem(c, id, -n));
const recipeText = r => Object.entries(r.inputs).map(([id, n]) => `${n}× ${itemName(id)}`).join(' + ');

export function craft(c, r) {
  if (!hasInputs(c, r)) return null;
  const p = craftChance(c, r); consume(c, r.inputs);
  c.counts.crafted = (c.counts.crafted || 0) + 1;
  if (chance(p)) { addItem(c, r.out, r.n || 1); return { text: `Crafted ${r.n > 1 ? r.n + '× ' : ''}${itemName(r.out)}! (${Math.round(p * 100)}%)`, cls: 'good' }; }
  if (has(c, 'first_crafter')) { const back = pick(Object.keys(r.inputs)); addItem(c, back, 1); return { text: `The ${itemName(r.out)} cracked, but I saved a ${itemName(back)}.`, cls: 'bad' }; }
  return { text: `The ${itemName(r.out)} failed and the ingredients were ruined. (${Math.round(p * 100)}% chance)`, cls: 'bad' };
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

export function gearStats(c) {
  const s = { dmg: 0, hp: 0, agi: 0, luck: 0, qi: 0 };
  for (const id of Object.values(c.gear || {})) { const st = ITEMS[id]?.stats || {}; for (const k in st) s[k] += st[k]; }
  return s;
}
export function equip(c, id) {
  const it = ITEMS[id]; if (!it || it.type !== 'gear' || !c.inv[id]) return;
  c.gear ||= {}; if (c.gear[it.slot]) addItem(c, c.gear[it.slot], 1);
  addItem(c, id, -1); c.gear[it.slot] = id; ui.log(`I equipped the ${it.name}.`);
}
export function unequip(c, slot) { c.gear ||= {}; if (!c.gear[slot]) return; addItem(c, c.gear[slot], 1); delete c.gear[slot]; }

// Using consumables from the inventory
export function useItem(c, id) {
  const it = ITEMS[id]; if (!it || !c.inv[id]) return null; const pm = traitMult(c, 'pill');
  switch (it.use) {
    case 'heal': addItem(c, id, -1); { const g = Math.round(25 * pm); stat(c, 'health', g); return `I swallowed a Healing Pill. Health +${g}.`; }
    case 'marrow': addItem(c, id, -1); { const g = Math.round(8 * pm); c.qi.affinity = clamp(c.qi.affinity + g); return `My bones burned clean. Qi affinity +${g}.`; }
    case 'incense': addItem(c, id, -1); c.flags.incense = true; stat(c, 'stress', -15); return 'I burned calming incense. My mind is still as a lake (+12% on my next breakthrough).';
    case 'ink': addItem(c, id, -1); return earnTrait(c, 'ink_touched') ? 'I wrote my name with the ink. The page wrote back.' : 'The ink dried before I could use it.';
  }
  return null;
}
