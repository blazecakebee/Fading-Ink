// Passive bonuses from genes, attuned heirlooms and this year's world news.
// traits.js folds these into traitMult / traitVal, so every system that reads trait fields picks them up.
import { HEIRLOOMS, HEIRLOOM_ORDER, MAX_ATTUNED } from '../data/heirlooms.js';
import { GENE } from '../data/genes.js';
import { G } from '../core/state.js';
import { outfitStyle } from '../data/clothing.js';
import { TEMPER } from '../data/temper.js';
import { qiPassives } from './qitype.js';
import { legacyMods, omenMods } from '../data/legacyTree.js';
import { transmigratorMods, relicQi } from './renown.js';
import { fableMods } from './fables.js';
import { fateMods } from './fate.js';

export function attuned(c) {
  const list = (c.heirlooms || []).filter(x => x && typeof x === 'object' && HEIRLOOMS[x.id]);
  return list.slice().sort((a, b) => HEIRLOOM_ORDER.indexOf(HEIRLOOMS[a.id].tier) - HEIRLOOM_ORDER.indexOf(HEIRLOOMS[b.id].tier)).slice(0, MAX_ATTUNED);
}
export function sources(c) {
  if (!c) return [];
  const out = attuned(c).map(x => HEIRLOOMS[x.id]);
  const d = c.dna; if (d) for (const id of [...(d.base || []), ...(d.awakened || [])]) { const g = GENE(id); if (g) out.push(g); }
  for (const d of c.divine || []) if (d.mods) out.push(d.mods); // divine blessings & god-shards
  for (const id of c.temper || []) if (TEMPER[id]) out.push(TEMPER[id]); // your personality
  out.push(...qiPassives(c)); // your Qi type
  out.push(legacyMods()); // Legacy tree
  const tm = transmigratorMods(c); if (tm) out.push(tm); if ((c.relics || []).length) out.push({ qi: relicQi(c) }); // Transmigrator, enshrined relics
  if (c.flags?.stormBorn) out.push({ breakthrough: 0.03 });
  if (c.fables) out.push(...fableMods(c));
  if (c.omens?.length) out.push(...omenMods(c)); // v0.9.11 birth blessings & curses // Fable titles (all stack) and what the Fables did to you
  out.push(...fateMods(c)); // v0.9.23 reincarnation, demonic path, tainted Qi, unstable Qi after regression
  const st = outfitStyle(c); if (st) out.push({ social: 1 + Math.min(15, st) / 100 });
  const lib = c.ownSect?.halls?.library; if (lib) out.push({ qi: 1 + lib * 0.04 });
  const n = G.world?.news; if (n && n.year === G.world.year && n.mods) out.push(n.mods);
  return out;
}
export const bonusMult = (c, f) => sources(c).reduce((m, s) => m * (s[f] ?? 1), 1);
export const bonusVal = (c, f) => sources(c).reduce((t, s) => t + (s[f] ?? 0), 0);
