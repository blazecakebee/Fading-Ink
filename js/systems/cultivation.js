// Qi cultivation: gathering Qi, opening meridians, breakthroughs and Heavenly Tribulations.
import { ui } from '../core/bus.js';
import { ri, chance, clamp } from '../core/rng.js';
import { REALMS, MANUALS } from '../data/realms.js';
import { ENEMIES } from '../data/combat.js';
import { traitMult, traitVal, earnTrait, has } from './traits.js';
import { stat, die, addItem } from './life.js';

export const realmName = c => c.qi.realm === 0 ? 'Mortal' : `${REALMS[c.qi.realm].name} ${REALMS[c.qi.realm].stages > 1 ? 'Stage ' + c.qi.stage : ''}`.trim();
export const qiCap = c => Math.round(REALMS[c.qi.realm].maxQi * (1 + (c.qi.stage - 1) * 0.35));
export const power = c => REALMS[c.qi.realm].power * (1 + (c.qi.stage - 1) * 0.06) * traitMult(c, 'power');

export function qiGain(c, base) {
  const manual = Math.max(1, ...c.qi.manuals.map(m => MANUALS.find(x => x.id === m)?.qi || 1));
  const aff = 0.5 + c.qi.affinity / 100; const merid = 1 + c.qi.meridians * 0.08;
  const stress = c.stats.stress > 60 ? 0.6 : 1;
  return Math.max(1, Math.round(base * aff * merid * manual * traitMult(c, 'qi') * stress));
}

// Meditate: main Qi source. Returns text for the chronicle.
export function meditate(c) {
  if (!c.qi.known || !c.qi.manuals.length) { stat(c, 'stress', -8); stat(c, 'happiness', 3); return 'I sat quietly and breathed. My mind felt calmer.'; }
  const g = qiGain(c, ri(14, 24)); const cap = qiCap(c);
  c.qi.qi = Math.min(cap, c.qi.qi + g); stat(c, 'stress', -5);
  return c.qi.qi >= cap ? `Qi +${g}. My dantian is full. I can attempt a breakthrough.` : `I circulated my Qi. +${g} Qi (${c.qi.qi}/${cap}).`;
}
export function openMeridian(c) {
  if (c.qi.meridians >= 12) return 'All twelve meridians are already open.';
  const cost = 30 + c.qi.meridians * 25;
  if (c.qi.qi < cost) return `I need ${cost} Qi to force open a meridian.`;
  c.qi.qi -= cost; stat(c, 'health', -ri(2, 8));
  if (chance(0.55 + c.qi.affinity / 300)) { c.qi.meridians++; ui.fx('milestone'); return `Agony, then light. Meridian ${c.qi.meridians}/12 opened.`; }
  return 'The meridian refused to open. My body aches.';
}

export async function breakthrough(c) {
  const R = REALMS[c.qi.realm]; const cap = qiCap(c);
  if (c.qi.qi < cap) return `Not enough Qi (${c.qi.qi}/${cap}).`;
  const major = c.qi.stage >= R.stages; const next = major ? REALMS[c.qi.realm + 1] : R;
  if (!next) return 'There is nowhere left to climb.';
  if (major && next.req?.pill && !c.inv[next.req.pill]) return `Breaking into ${next.name} needs a Foundation Establishment Pill. Gates and sects have them.`;
  let p = (major ? 0.45 : 0.75) + c.qi.affinity / 400 + c.qi.meridians * 0.015 + traitVal(c, 'breakthrough') - c.stats.stress / 300;
  p = clamp(p, 0.05, 0.97);
  if (major && next.req?.pill) addItem(c, next.req.pill, -1);
  if (major && next.trib) {
    ui.log(`Clouds gather. The Heavens send a Tribulation to judge my ascent to ${next.name}.`, 'qi');
    const t = ENEMIES.find(e => e.id === 'tribulation');
    const lvl = next.trib;
    const res = await ui.fight({ ...t, hp: 80 * lvl * lvl + 60, str: 50 + lvl * 25, agi: 50 + lvl * 15, realm: c.qi.realm, name: `Heavenly Tribulation (${lvl} bolts)` }, { noFlee: true, tribulation: true });
    if (res !== 'win') { c.qi.qi = Math.round(c.qi.qi * 0.3); stat(c, 'health', -40); if (c.stats.health <= 0) die(c, 'struck down by Heavenly Tribulation'); return 'The lightning tore through me. The breakthrough failed.'; }
    if (c.lastFightHpPct < 0.15) earnTrait(c, 'heaven_defier');
    p = Math.max(p, 0.9);
  }
  if (!chance(p)) { c.qi.qi = Math.round(c.qi.qi * 0.5); stat(c, 'health', -ri(5, 15)); ui.fx('fail'); return `Qi deviation! The breakthrough failed. (${Math.round(p * 100)}% chance)`; }
  c.qi.qi = 0;
  if (major) { c.qi.realm++; c.qi.stage = 1; ui.fx('breakthrough', { major: true }); stat(c, 'health', 30); stat(c, 'looks', 4);
    if (REALMS[c.qi.realm].id === 'immortal') earnTrait(c, 'author');
    return `BREAKTHROUGH! I have entered ${REALMS[c.qi.realm].name}. My lifespan stretches before me.`; }
  c.qi.stage++; ui.fx('breakthrough', { major: false }); stat(c, 'health', 5);
  return `Breakthrough! ${R.name} Stage ${c.qi.stage}.`;
}

// Passive yearly cultivation bits
export function cultivationYear(c) {
  if (c.qi.known && c.qi.manuals.length && c.qi.realm === 0 && c.qi.qi >= qiCap(c)) {
    // mortals auto-condense into Qi realm when they first fill up
    c.qi.realm = 1; c.qi.stage = 1; c.qi.qi = 0; ui.log('A warm thread of Qi settled in my dantian. I have entered Qi Condensation.', 'qi'); ui.fx('breakthrough', { major: true });
  }
  if (c.qi.realm > 0) c.qi.qi = Math.min(qiCap(c), c.qi.qi + qiGain(c, 3));
}

export function learnManual(c, id) {
  if (c.qi.manuals.includes(id)) return false;
  const m = MANUALS.find(x => x.id === id); c.qi.manuals.push(id); c.qi.known = true;
  if (m.tech && !c.qi.techs.includes(m.tech)) c.qi.techs.push(m.tech);
  ui.log(`I learned the ${m.name}.`, 'qi'); ui.fx('milestone'); return true;
}
