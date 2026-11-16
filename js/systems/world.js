import { eff } from './body.js';
// Living world: each year rolls world conditions that are reported in the news AND actually change the world.
// news.mods feed straight into the bonus system (pay, qi, price…); flags change spawn rates and events.
import { effRealm } from './path.js';
import { G } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance, weighted, clamp } from '../core/rng.js';
import { stat, money, country, fmtMoney, addItem } from './life.js';
import { SECTS } from '../data/realms.js';
import { GATE_RANKS, makeGate, GATE_TYPES } from '../data/combat.js';
import { gainHeirloom } from './heirlooms.js';
import { ensureDna } from './genetics.js';

export const CONDITIONS = [
  { id: 'calm', w: 40, news: null, mods: {} },
  { id: 'gate_surge', w: 9, news: c => `Gate outbreaks surge worldwide. The Hunter Association raises its alert level in ${country(c).name}.`, mods: {} },
  { id: 'crash', w: 6, news: () => 'Markets crash. Factories shut; wages are cut across the country.', mods: { pay: 0.85, price: 0.9 } },
  { id: 'boom', w: 7, news: () => 'An economic boom: wages and investments climb.', mods: { pay: 1.1, price: 1.1 } },
  { id: 'qi_tide', w: 5, news: () => 'A Spirit Tide washes over the world. Cultivators everywhere feel Qi thicken in the air.', mods: { qi: 1.12 } },
  { id: 'qi_drought', w: 4, news: () => 'Spiritual Qi thins mysteriously. Sects hoard pills; prices soar.', mods: { qi: 0.9, price: 1.25 } },
  { id: 'beast_tide', w: 5, news: () => 'A Beast Tide spills out of the mountains. Villages evacuate.', mods: {} },
  { id: 'plague', w: 3, news: () => 'A fever spreads through the cities. Hospitals overflow.', mods: { heal: -2 } },
  { id: 'sect_war', w: 6, news: null, mods: {} },
  { id: 'golden_age', w: 3, news: () => 'Scholars call it a golden age: peace, good harvests and full schools.', mods: { study: 1.08, stressMult: 0.92 } },
];
export function rollNews(c) {
  const k = weighted(CONDITIONS, x => x.w);
  const n = { year: G.world.year, id: k.id, mods: { ...k.mods }, lines: [] };
  if (k.id === 'sect_war') {
    const [a, b] = SECTS.slice().sort(() => Math.random() - 0.5);
    n.war = [a.id, b.id]; n.lines.push(`War breaks out between the ${a.name} and the ${b.name}.`);
    if (c.sect && n.war.includes(c.sect)) { c.sectRel ||= {}; c.sectRel[n.war.find(x => x !== c.sect)] = 'war'; }
  } else if (k.news) n.lines.push(k.news(c));
  // background trade between sects (flavour that hints at the exchange prices)
  if (chance(0.35)) { const [a, b] = SECTS.slice().sort(() => Math.random() - 0.5); n.lines.push(`Trade: the ${a.name} ${pick(['bought', 'sold'])} a shipment of ${pick(['Foundation pills', 'spirit stones', 'beast cores', 'manuals', 'healing pills'])} ${pick(['from', 'to'])} the ${b.name}.`); }
  G.world.news = n; (G.world.history ||= []).push({ year: n.year, id: n.id, lines: n.lines }); G.world.history = G.world.history.slice(-30);
  return n;
}
// The year's conditions take effect (called at the start of every year, before anything else happens)
export function newsYear(c) {
  const n = rollNews(c);
  n.lines.forEach(t => ui.log(`News: ${t}`, 'world'));
  if (n.id === 'gate_surge' && c.age >= 10) { for (let i = 0; i < ri(1, 2); i++) spawnGate(c, true); }
  if (n.id === 'beast_tide' && c.age >= 6) {
    const safe = c.qi.realm >= 3 || c.assets.some(a => a.type === 'house');
    if (!safe) { stat(c, 'health', -ri(4, 10)); stat(c, 'stress', 8); ui.log('The Beast Tide reached our district. We barely got out.', 'bad'); }
    if (c.age >= 14) c.gates.push({ ...makeGate(pick(['E', 'D', 'C'])), type: 'den' });
  }
  if (n.id === 'plague' && c.qi.realm < 2 && chance(0.35)) { stat(c, 'health', -ri(6, 14)); ui.log('I caught the fever going around.', 'bad'); }
}
// Pick a Gate rank around the player's own realm so there is always something worth fighting.
export function rankFor(c) {
  let idx = 0; GATE_RANKS.forEach((r, i) => { if (r.realm <= effRealm(c)) idx = i; });
  const off = weighted([{ d: -2, w: 1 }, { d: -1, w: 3 }, { d: 0, w: 5 }, { d: 1, w: 2 }], x => x.w).d;
  return GATE_RANKS[clamp(idx + off, 0, GATE_RANKS.length - 1)];
}
export function spawnGate(c, quiet) {
  const R = rankFor(c); const g = makeGate(R.rank); c.gates.push(g);
  if (!quiet) ui.log(`News: A ${R.rank}-rank Gate (${GATE_TYPES.find(t => t.id === g.type).name}) opened in ${c.city}. The Hunter Association sealed off three blocks.`, 'qi');
  else ui.log(`A ${R.rank}-rank ${GATE_TYPES.find(t => t.id === g.type).name} tore open near ${c.city}.`, 'qi');
  return g;
}
// Make sure a Gate near your level exists every year or two once you're old enough
export function ensureMatchingGate(c) {
  if (c.age < 14) return;
  let idx = 0; GATE_RANKS.forEach((r, i) => { if (r.realm <= effRealm(c)) idx = i; });
  const near = c.gates.some(g => Math.abs(GATE_RANKS.findIndex(r => r.rank === g.rank) - idx) <= 1);
  if (!near && chance(0.5)) spawnGate(c, true);
  // v0.8.7: stronger cultivators see more Gates, and the small ones never disappear
  const want = 2 + Math.floor(effRealm(c) / 3);
  for (let i = 0; i < 3 && c.gates.length < want; i++) if (chance(0.55)) { const low = c.gates.some(g => GATE_RANKS.findIndex(r => r.rank === g.rank) <= Math.max(0, idx - 3));
    const R = !low && idx >= 3 ? GATE_RANKS[ri(0, Math.max(0, idx - 3))] : rankFor(c); const g = makeGate(R.rank); c.gates.push(g); ui.log(`A ${R.rank}-rank ${GATE_TYPES.find(t => t.id === g.type).name} tore open near ${c.city}.`, 'qi'); }
}
export const newsMult = id => G.world?.news?.year === G.world?.year && G.world.news.id === id;

// ---- Birth anomalies: rare things that can happen the moment you are born. Add your own templates here.
export const BIRTH_EVENTS = [
  { id: 'omen', w: 3, title: 'Heavenly Omen', motif: 'enso', line: 'On the night you were born, the stars turned to watch.', run: c => { c.qi.affinity = clamp(c.qi.affinity + 20); return 'Qi affinity +20.'; } },
  { id: 'cache', w: 2, title: 'A Forgotten Inheritance', motif: 'seal', line: 'A sealed box arrived addressed to a child who did not exist yet.', run: c => { const x = gainHeirloom(c, 'birth', null); return x ? 'An heirloom waited for you.' : ''; } },
  { id: 'storm', w: 2, title: 'Born in the Storm', motif: 'crack', line: 'Lightning struck the hospital roof at the moment of your first cry.', run: c => { c.qi.elem = 'lightning'; c.flags.stormBorn = true; return 'Lightning element. +3% breakthrough.'; } },
  { id: 'marked', w: 2, title: 'The Bloodline Mark', motif: 'helix', line: 'A red mark on your wrist, shaped like no word anyone could read.', run: c => { ensureDna(c).points += 1; return '+1 Awakening point.'; } },
  { id: 'gate_born', w: 1, title: 'Born Beside a Gate', motif: 'crack', line: 'A Gate opened two streets away as you were born. You did not cry.', run: c => { c.stats.battle = eff(c, 'battle') + 8; c.qi.known = c.qi.known || chance(0.5); return '+8 Battle Knowledge.'; } },
  { id: 'benefactor', w: 2, title: 'A Nameless Benefactor', motif: 'lotus', line: 'An envelope of money appeared in your crib. No one saw who left it.', run: c => { const m = Math.round(ri(2000, 9000) * country(c).econ); money(c, m); return `${fmtMoney(c, m)} in an envelope.`; } },
];
export const BIRTH_ANOMALY_CHANCE = 0.06;
export function birthAnomaly(c) {
  if (!chance(BIRTH_ANOMALY_CHANCE)) return null;
  const e = weighted(BIRTH_EVENTS, x => x.w); const res = e.run(c);
  (c.flags.birth ||= []).push(e.id);
  ui.log(`${e.title}: ${e.line} ${res || ''}`, 'big');
  return e;
}
