// Passive bonuses from genes, attuned heirlooms and this year's world news.
// traits.js folds these into traitMult / traitVal, so every system that reads trait fields picks them up.
import { HEIRLOOMS, HEIRLOOM_ORDER, MAX_ATTUNED } from '../data/heirlooms.js';
import { GENE } from '../data/genes.js';
import { G } from '../core/state.js';
import { outfitStyle } from '../data/clothing.js';

export function attuned(c) {
  const list = (c.heirlooms || []).filter(x => x && typeof x === 'object' && HEIRLOOMS[x.id]);
  return list.slice().sort((a, b) => HEIRLOOM_ORDER.indexOf(HEIRLOOMS[a.id].tier) - HEIRLOOM_ORDER.indexOf(HEIRLOOMS[b.id].tier)).slice(0, MAX_ATTUNED);
}
export function sources(c) {
  if (!c) return [];
  const out = attuned(c).map(x => HEIRLOOMS[x.id]);
  const d = c.dna; if (d) for (const id of [...(d.base || []), ...(d.awakened || [])]) { const g = GENE(id); if (g) out.push(g); }
  if (c.flags?.stormBorn) out.push({ breakthrough: 0.03 });
  const st = outfitStyle(c); if (st) out.push({ social: 1 + Math.min(15, st) / 100 });
  const lib = c.ownSect?.halls?.library; if (lib) out.push({ qi: 1 + lib * 0.04 });
  const n = G.world?.news; if (n && n.year === G.world.year && n.mods) out.push(n.mods);
  return out;
}
export const bonusMult = (c, f) => sources(c).reduce((m, s) => m * (s[f] ?? 1), 1);
export const bonusVal = (c, f) => sources(c).reduce((t, s) => t + (s[f] ?? 0), 0);
