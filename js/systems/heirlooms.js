// Heirloom finds and inheritance.
import { HEIRLOOMS, HEIRLOOM_TIERS } from '../data/heirlooms.js';
import { weighted, chance, pick } from '../core/rng.js';
import { ui } from '../core/bus.js';
import { G } from '../core/state.js';
import { attuned } from './bonus.js';

export const isHeirloom = x => x && typeof x === 'object' && HEIRLOOMS[x.id];
export const heirloomsOf = c => (c.heirlooms || []).filter(isHeirloom);

// Roll a tier: mythic is 0.1% of finds. Luck nudges toward rarer pieces a little (never more than ~2×).
export function rollTier(c) {
  const luck = Math.min(2, 1 + Math.max(0, (c?.stats?.luck ?? 50) - 50) / 100);
  return weighted(Object.entries(HEIRLOOM_TIERS).map(([id, t]) => ({ id, w: t.w * (id === 'common' ? 1 : luck) })), x => x.w).id;
}
export function makeHeirloom(c, tier, how) {
  tier ||= rollTier(c);
  const own = new Set(heirloomsOf(c).map(x => x.id));
  const pool = Object.entries(HEIRLOOMS).filter(([id, h]) => h.tier === tier && id !== 'notes' && !h.fable && !own.has(id));
  if (!pool.length) return null;
  const [id] = pick(pool);
  return { id, tier, found: `${c.first} ${c.last}`, year: G.world?.year, how: how || 'found', gens: 0 };
}
// Give an heirloom to the living character with fanfare matching its rarity.
export function gainHeirloom(c, how, tier) {
  const x = makeHeirloom(c, tier, how); if (!x) return null;
  (c.heirlooms ||= []).push(x);
  const H = HEIRLOOMS[x.id], T = HEIRLOOM_TIERS[H.tier];
  ui.log(`${T.name} heirloom: ${H.name}. ${H.desc}`, H.tier === 'common' ? 'good' : 'big');
  if (H.tier === 'mythic' || H.tier === 'legendary') ui.cinematic?.({ motif: H.tier === 'mythic' ? 'lotus' : 'seal', color: T.color, lines: [H.tier === 'mythic' ? 'Something older than your family name stirs.' : 'An heirloom worthy of legend.', H.desc], title: H.name, sub: `${T.name} heirloom` });
  else ui.fx('milestone');
  if (!attuned(c).includes(x)) ui.log('(Only your 3 finest heirlooms are attuned at once.)', 'muted');
  return x;
}
// Passing down: each piece may be lost along the way. If nobody continues the bloodline, everything ends with you.
export function inheritHeirlooms(old, c) {
  const kept = [], lost = [];
  for (const x of heirloomsOf(old)) {
    if (chance(HEIRLOOM_TIERS[HEIRLOOMS[x.id].tier].loss)) lost.push(x); else kept.push({ ...x, gens: (x.gens || 0) + 1 });
  }
  // the old "Cultivation Notes" strings become a real (common) heirloom
  if (old.qi.realm >= 3 && !kept.some(x => x.id === 'notes') && chance(0.6)) kept.push({ id: 'notes', tier: 'common', found: `${old.first} ${old.last}`, year: G.world?.year, how: 'written', gens: 0 });
  c.heirlooms = kept;
  if (kept.length) ui.log(`Passed down to me: ${kept.map(x => HEIRLOOMS[x.id].name + (x.gens > 1 ? ` (${x.gens} generations)` : '')).join(', ')}.`, 'good');
  for (const x of lost) ui.log(`The ${HEIRLOOMS[x.id].name} was lost when my parent died — sold, stolen or buried with them.`, 'bad');
}
// Chance of an heirloom dropping from a Gate boss, by gate tier index (E=0 … SSS=7)
export const gateHeirloomChance = tier => [0.004, 0.008, 0.015, 0.025, 0.035, 0.05, 0.065, 0.08, 0.1, 0.12][tier] || 0.004;
// Convert pre-0.6 string heirlooms into objects
export function migrateHeirlooms(c) {
  c.heirlooms = (c.heirlooms || []).map(x => typeof x === 'string' ? { id: 'notes', tier: 'common', found: x.replace(/'s Cultivation Notes$/, ''), how: 'written', gens: 1 } : x).filter(isHeirloom);
  // keep one notes at most
  let seen = false; c.heirlooms = c.heirlooms.filter(x => x.id !== 'notes' || (!seen && (seen = true)));
}
