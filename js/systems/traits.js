// Trait rolling, effects and earned-trait unlocks.
import { TRAITS, TIERS, TIER_ORDER, TRAIT_BY_ID } from '../data/traits.js';
import { ui } from '../core/bus.js';
import { META } from '../core/state.js';
import { clamp, chance, weighted } from '../core/rng.js';
import { REALMS } from '../data/realms.js';
import { bonusMult, bonusVal } from './bonus.js';

export const has = (c, id) => c.traits.includes(id);

// Roll 1-3 birth traits. Higher tiers are exponentially rarer. Legacy perk "luckyStars" improves odds.
export function rollBirthTraits(c) {
  const out = []; const n = chance(0.25) ? 3 : chance(0.6) ? 2 : 1;
  const boost = 1 + (META.tree?.m4 || 0) * 0.5;
  for (let i = 0; i < n; i++) {
    const tierId = weighted(TIER_ORDER.map(t => ({ t, weight: TIERS[t].birth * (t === 'common' ? 1 : boost) })), x => x.weight).t;
    const pool = TRAITS.filter(t => t.tier === tierId && t.birth !== 0 && !out.includes(t.id) && !conflicts(out, t.id));
    if (pool.length) out.push(pool[Math.floor(Math.random() * pool.length)].id);
  }
  return out;
}
const CONFLICTS = [['sturdy', 'sickly'], ['cheerful', 'hothead'], ['lucky', 'cursed'], ['quick', 'clumsy']];
const conflicts = (list, id) => CONFLICTS.some(([a, b]) => (id === a && list.includes(b)) || (id === b && list.includes(a)));

export function applyTraitMods(c, id) {
  const t = TRAIT_BY_ID[id]; if (!t) return;
  const cap = REALMS[c.qi?.realm || 0].cap || 100;
  if (t.mods) for (const [k, v] of Object.entries(t.mods)) c.stats[k] = clamp(c.stats[k] + v, 0, ['health', 'happiness', 'mood', 'stress'].includes(k) ? 100 : cap);
  if (t.earlyQi) c.qi.known = true;
}
// product of multiplicative trait fields (qi, power, study, stressMult, crime...)
export function traitMult(c, field) { return c.traits.reduce((m, id) => m * (TRAIT_BY_ID[id]?.[field] ?? 1), 1) * bonusMult(c, field); }
// sum of additive trait fields (breakthrough, life, refund)
// (genes, heirlooms and world news add to these too; 'life' from them is counted in lifespan() instead)
export function traitVal(c, field) { return c.traits.reduce((s, id) => s + (TRAIT_BY_ID[id]?.[field] ?? 0), 0) + (field === 'life' ? 0 : bonusVal(c, field)); }

// Thresholds for traits earned through play (checked after actions and each birthday)
import { checkAchievements } from './achievements.js';
export function checkEarned(c) {
  checkAchievements(c);
  const sparred = (c.counts.spar || 0) + (c.counts.soc_spar_p || 0) + (c.counts.coop_spar || 0);
  if (c.wins >= 5) earnTrait(c, 'brawler');
  if (c.wins >= 25) earnTrait(c, 'battle_hungry');
  if (sparred >= 50) earnTrait(c, 'sword_saint');
  if ((c.recipes || []).length >= 8) earnTrait(c, 'first_crafter');
  if ((c.flags.divorces || 0) >= 3) earnTrait(c, 'heartless');
  if (c.flags.coopMarried) earnTrait(c, 'soulbound');
  if (c.ownSect) earnTrait(c, 'clan_founder');
  if (c.flags.ghostKing) earnTrait(c, 'gate_breaker_king');
  if ((c.flags.busyYears || 0) >= 20) earnTrait(c, 'unbound');
  if (c.gatesCleared >= 10) earnTrait(c, 'gatebreaker');
}
export function earnTrait(c, id) {
  if (has(c, id)) return false;
  const t = TRAIT_BY_ID[id]; if (!t) return false;
  c.traits.push(id); applyTraitMods(c, id);
  ui.log(`New trait unlocked: ${t.name} [${TIERS[t.tier].name}]`, 'trait');
  ui.fx('trait', { tier: t.tier, name: t.name });
  META.unlockedTraits[id] = true;
  return true;
}
