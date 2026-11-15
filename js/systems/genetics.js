// Genetics: base genes at birth, Awakening points from cultivation, the awakening tree, and inheritance.
import { BASE_IDS, TREE_GENES, GENE, MAX_AWAKENED } from '../data/genes.js';
import { chance, pick, ri } from '../core/rng.js';
import { ui } from '../core/bus.js';
import { REALMS } from '../data/realms.js';

const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);
export function randomBase(n = 3) { return shuffle(BASE_IDS).slice(0, n); }
export function ensureDna(c) {
  c.dna ||= { base: randomBase(3), awakened: [], points: 0, earned: {} };
  c.dna.earned ||= {}; c.dna.awakened ||= []; c.dna.points ??= 0;
  return c.dna;
}
// NPC genes: 3 base; 8% chance of one awakened gene, 1% of two. Never more than 5.
export function npcDna(realm = 0) {
  const out = randomBase(3);
  const extra = chance(0.01 + realm * 0.01) ? 2 : chance(0.08 + realm * 0.03) ? 1 : 0;
  const pool = Object.keys(TREE_GENES).filter(id => !TREE_GENES[id].trans && (TREE_GENES[id].realm || 0) <= Math.max(1, realm + 1));
  for (let i = 0; i < extra; i++) { const g = pick(pool); if (!out.includes(g)) out.push(g); }
  return out;
}
// Points: 1 per major realm reached (once per realm per life), +1 at 18.
export function grantPoints(c) {
  const d = ensureDna(c); let got = 0;
  if (c.age >= 18 && !d.earned.adult) { d.earned.adult = 1; got++; }
  for (let r = 1; r <= c.qi.realm; r++) if (!d.earned['r' + r]) { d.earned['r' + r] = 1; got++; }
  if (got) { d.points += got; ui.log(`Dormant genes stir in my blood (+${got} Awakening point${got > 1 ? 's' : ''}). Spend them in the Bloodline tab.`, 'qi'); }
}
export function geneState(c, id) {
  const d = ensureDna(c), g = TREE_GENES[id];
  if (d.awakened.includes(id)) return { state: 'owned' };
  const why = [];
  if (g.req.some(r => !d.awakened.includes(r))) why.push('Awaken ' + g.req.filter(r => !d.awakened.includes(r)).map(r => TREE_GENES[r].name).join(' + ') + ' first');
  if (c.qi.realm < g.realm) why.push(`Reach ${REALMS[g.realm].name}`);
  if (d.points < g.cost) why.push(`${g.cost} point${g.cost > 1 ? 's' : ''} needed (you have ${d.points})`);
  if (d.awakened.length >= MAX_AWAKENED) why.push(`Your blood can hold ${MAX_AWAKENED} awakened genes`);
  return { state: why.length ? 'locked' : 'open', why };
}
export function awaken(c, id) {
  const s = geneState(c, id); if (s.state !== 'open') return null;
  const d = c.dna, g = TREE_GENES[id]; d.points -= g.cost; d.awakened.push(id);
  if (g.trans) ui.cinematic?.({ motif: 'helix', color: '#ff4fd8', lines: ['Your blood remembers something it was never taught.'], title: g.name, sub: 'Transcendent gene awakened' });
  else ui.fx(g.neg ? 'fail' : 'milestone');
  return g.neg ? `I accepted a flaw into my blood: ${g.name}. ${g.desc.replace('NEGATIVE: ', '')} It opens the way forward.` : `Awakened gene: ${g.name}. ${g.desc}`;
}
// Children: 3 base genes drawn from both parents; awakened genes rarely come through as dormant-then-awake.
export function childDna(a = [], b = []) {
  const pool = [...new Set([...a, ...b].filter(id => BASE_IDS.includes(id)))];
  const base = shuffle(pool).slice(0, 3); while (base.length < 3) { const g = pick(BASE_IDS); if (!base.includes(g)) base.push(g); }
  const awakened = [];
  for (const id of [...a, ...b]) {
    const g = TREE_GENES[id]; if (!g || awakened.includes(id)) continue;
    const p = g.trans ? (id === 't_blood' ? 0.25 : 0.06) : g.neg ? 0.2 : 0.08; // flaws linger in a bloodline
    if (awakened.length < 2 && chance(p)) awakened.push(id);
  }
  return { base, awakened: awakened.filter(id => !TREE_GENES[id].req.some(r => !awakened.includes(r)) || TREE_GENES[id].neg || TREE_GENES[id].trans), points: 0, earned: {} };
}
export const geneName = id => GENE(id)?.name || id;
