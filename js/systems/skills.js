// v0.9.25 Comprehended techniques: Qi cultivators can grasp new combat arts through meditation and breakthroughs.
// (Severed Path techniques unlock with body tiers instead — see data/bodypath.js.)
import { ui } from '../core/bus.js';
import { chance, pick } from '../core/rng.js';
import { MOVES } from '../data/combat.js';
import { onBodyPath } from './path.js';

// realm needed, and the element that grasps it most easily
export const QI_ARTS = [
  { id: 'gale_slash', realm: 1, elem: 'wood' },
  { id: 'frost_lance', realm: 2, elem: 'water' },
  { id: 'lotus_bloom', realm: 3, elem: 'wood' },
  { id: 'sword_rain', realm: 4, elem: 'metal' },
  { id: 'earth_prison', realm: 4, elem: 'earth' },
  { id: 'soul_chains', realm: 5, elem: 'metal' },
  { id: 'azure_dragon', realm: 6, elem: 'water' },
  { id: 'heaven_mirror', realm: 7, elem: 'earth' },
  { id: 'sun_pillar', realm: 8, elem: 'fire' },
  { id: 'void_collapse', realm: 10, elem: 'lightning' },
];
export const artInfo = id => QI_ARTS.find(a => a.id === id);

// every meditation this year: 7% chance to comprehend an art (×1.5 if it matches your element); a breakthrough to a new realm: 45%
export function skillsYear(c) {
  if (!c.alive || onBodyPath(c) || !c.qi.known || (c.qi.realm || 0) < 1) return;
  const open = QI_ARTS.filter(a => c.qi.realm >= a.realm && !c.qi.techs.includes(a.id)); c.qi.artRealm ??= c.qi.realm;
  const rose = c.qi.realm > c.qi.artRealm; c.qi.artRealm = Math.max(c.qi.artRealm, c.qi.realm);
  if (!open.length) return;
  const mine = open.filter(a => a.elem === c.qi.elem), sessions = c.qi.medYear || 0;
  let p = 1 - Math.pow(1 - 0.07 * (mine.length ? 1.5 : 1), sessions); if (rose) p = Math.max(p, 0.45);
  if (!chance(p)) return;
  const a = (mine.length && chance(0.6)) ? pick(mine) : pick(open); c.qi.techs.push(a.id); const M = MOVES[a.id];
  ui.log(`${rose ? 'The breakthrough opened something in me.' : 'Deep in meditation, the pattern finally made sense.'} I comprehended a new technique: ${M.name}. ${M.info}`, 'qi');
  ui.fx?.('trait');
}
