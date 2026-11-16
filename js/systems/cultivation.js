import { qiFlowMult } from './body.js';
import { HARD } from '../core/hard.js';
// Qi cultivation: gathering Qi, opening meridians, breakthroughs and Heavenly Tribulations.
import { onBodyPath, bodyTier } from './path.js';
import { ui } from '../core/bus.js';
import { ri, chance, clamp } from '../core/rng.js';
import { REALMS, MANUALS } from '../data/realms.js';
import { ENEMIES } from '../data/combat.js';
import { traitMult, traitVal, earnTrait, has } from './traits.js';
import { stat, die, addItem, money, country, fmtMoney, QUALITY, bestQ } from './life.js';
import { bondBonus } from './people.js';
import { condQiMult, addCondition } from './health.js';
import { gearStats } from './crafting.js';
import { SECTS, METHODS, RI } from '../data/realms.js';
import { perk as perkC } from '../data/legacyTree.js';
import { ITEMS } from '../data/items.js';

export const realmName = c => onBodyPath(c) ? `${bodyTier(c).name} (Severed)` : c.qi.realm === 0 ? 'Mortal' : `${REALMS[c.qi.realm].name} ${REALMS[c.qi.realm].stages > 1 ? 'Stage ' + c.qi.stage : ''}`.trim();
export const qiCap = c => Math.round(REALMS[c.qi.realm].maxQi * (1 + (c.qi.stage - 1) * 0.7));
export const power = c => (onBodyPath(c) ? bodyTier(c).power * (1 + Math.min(1, (c.bodyPath.prog || 0) / bodyTier(c).need) * 0.3) : REALMS[c.qi.realm].power * (1 + (c.qi.stage - 1) * 0.11)) * powerBonus(c);
// v0.7.9: power from traits, genes, heirlooms and gods stacks with diminishing returns and tops out at x1.6
export const powerBonus = c => { const m = traitMult(c, 'power'); return m <= 1 ? m : Math.min(1.6, 1 + (m - 1) * 0.6); };

export function qiGain(c, base) {
  const manual = Math.max(1, ...c.qi.manuals.map(m => MANUALS.find(x => x.id === m)?.qi || 1));
  const aff = 0.5 + c.qi.affinity / 100; const merid = 1 + c.qi.meridians * 0.08;
  const stress = c.stats.stress > 60 ? 0.6 : 1;
  const sect = c.ownSect ? 1.1 : 1;
  const M = method(c); const meth = M.qi * (M.dual && bondBonus(c, 'qi') > 1 ? 1 + M.dual : 1);
  return Math.max(1, Math.round(base * qiFlowMult(c) * aff * merid * manual * traitMult(c, 'qi') * stress * bondBonus(c, 'qi') * condQiMult(c) * (1 + gearStats(c).qi) * sect * meth * (perkC('c3') ? 1.15 : 1)));
}

// Meditate: main Qi source. Returns text for the chronicle.
export function meditate(c) {
  if (!c.qi.known || !c.qi.manuals.length) { stat(c, 'stress', -8); stat(c, 'happiness', 3); return 'I sat quietly and breathed. My mind felt calmer.'; }
  const fat = fatigueMult(c); c.qi.fatigue = (c.qi.fatigue || 0) + 1; c.qi.medYear = (c.qi.medYear || 0) + 1;
  const g = Math.max(1, Math.round(qiGain(c, ri(10, 18)) * fat)); const cap = qiCap(c);
  c.qi.qi = Math.min(cap, c.qi.qi + g); stat(c, 'stress', -5);
  const M = method(c); for (const [k, v] of Object.entries(M.side || {})) stat(c, k, v);
  let extra = '';
  if (M.demonic && chance(0.05)) { addCondition(c, 'corruption', true); extra = ' Demonic Qi seeped into my heart (Qi Corruption).'; }
  if (M.mind && chance(M.mind)) { const m = (c.conditions || []).find(x => ['depression', 'anxiety', 'insomnia', 'ptsd', 'burnout'].includes(x.id)); if (m) { c.conditions = c.conditions.filter(x => x !== m); extra = ' The sutra eased a weight on my mind.'; } }
  if (extra) return (c.qi.qi >= cap ? `Qi +${g}. My dantian is full.` : `Qi +${g} (${c.qi.qi}/${cap}).`) + extra;
  return c.qi.qi >= cap ? `Qi +${g}. My dantian is full. I can attempt a breakthrough.` : `I circulated my Qi. +${g} Qi (${c.qi.qi}/${cap}).`;
}
export function openMeridian(c) {
  if (c.qi.meridians >= 12) return 'All twelve meridians are already open.';
  const cost = 30 + c.qi.meridians * 25;
  if (c.qi.qi < cost) return `I need ${cost} Qi to force open a meridian.`;
  c.qi.qi -= cost; stat(c, 'health', -ri(2, 8));
  if (chance(meridianInfo(c).p)) { c.qi.meridians++; ui.fx('milestone'); return `Agony, then light. Meridian ${c.qi.meridians}/12 opened.`; }
  if (chance(0.2)) { addCondition(c, 'meridian_block', true); return 'The meridian collapsed inward. My meridians are BLOCKED — Qi gain halved until healed.'; }
  return 'The meridian refused to open. My body aches.';
}

export function meridianInfo(c) {
  return { cost: 30 + c.qi.meridians * 25, p: clamp(0.55 + c.qi.affinity / 300 + traitVal(c, 'merid') + (method(c).merid || 0), 0.05, 0.97) };
}
export const meditateRange = c => [Math.round(qiGain(c, 10) * fatigueMult(c)), Math.round(qiGain(c, 18) * fatigueMult(c))];
// Meridian fatigue: back-to-back meditation strains the meridians. Max 3 sessions a year; rest and other activities recover.
export const MAX_MEDITATIONS = 3;
export const fatigueMult = c => Math.max(0.3, 1 - 0.15 * (c.qi.fatigue || 0));

// Everything the UI needs to explain a breakthrough before you try it.
export function breakthroughInfo(c) {
  const R = REALMS[c.qi.realm], cap = qiCap(c), major = c.qi.stage >= R.stages, next = major ? REALMS[c.qi.realm + 1] : R;
  const parts = [];
  const add = (label, v) => { if (Math.abs(v) >= 0.005) parts.push([label, v]); };
  add(major ? 'Base (new realm)' : 'Base (next stage)', major ? 0.45 : 0.75);
  add(`Qi affinity ${c.qi.affinity}`, c.qi.affinity / 400);
  add(`Meridians ${c.qi.meridians}/12`, c.qi.meridians * 0.015);
  add('Traits', traitVal(c, 'breakthrough'));
  if (perkC('c4')) add('Legacy: Tribulation Scars', 0.05);
  if (major && c.qi.realm >= 2) add("Heaven's resistance", -0.02 * c.qi.realm); // every realm is harder to break than the last
  add(`Stress ${c.stats.stress}`, -c.stats.stress / 300);
  add('Happiness', (c.stats.happiness - 60) / 600);
  add('Partner (dual cultivation)', bondBonus(c, 'breakthrough') - 1);
  if (method(c).bt) add(method(c).name, method(c).bt);
  if (c.flags.incense) add('Calming Incense burned', 0.12);
  if (major && c.inv.trib_talisman) add('Lightning Ward Talisman', 0.15);
  const bp = major && next && Object.entries(ITEMS).find(([id, it]) => it.bt?.realm === next.id && c.inv[id]);
  if (bp) { const q = bestQ(c, bp[0]); add(`${QUALITY[q].name} ${bp[1].name}`, bp[1].bt.bonus * QUALITY[q].mult); }
  if (major && next?.req?.pill && c.inv[next.req.pill]) { const q = bestQ(c, next.req.pill); if (q !== 'mid') add(`${QUALITY[q].name} ${ITEMS[next.req.pill].name}`, q === 'hi' ? 0.05 : -0.05); }
  if (c.conditions?.some(x => x.id === 'qi_deviation')) add('Qi Deviation Sickness', -0.2);
  const raw = parts.reduce((s, [, v]) => s + v, 0);
  if (raw < 1) parts.push(['Unforgiving heavens', -(1 - raw) * (HARD - 1)]); // failure is 1.5x as likely
  const p = clamp(parts.reduce((s, [, v]) => s + v, 0), 0.05, 0.95);
  const blockers = [];
  if (!next) blockers.push('You stand at the peak.');
  if (c.qi.qi < cap) blockers.push(`Fill your Qi first (${c.qi.qi}/${cap}).`);
  if (major && next?.req?.pill && !c.inv[next.req.pill]) blockers.push(`Needs a ${ITEMS[next.req.pill].name}.`);
  return { p, parts, major, next, trib: major && next?.trib, blockers, ready: !blockers.length };
}
export const HELPFUL_ITEMS = ['calm_incense', 'trib_talisman', 'qi_pill', 'marrow_pill', 'foundation_pill', 'core_pill', 'soul_pill', 'sever_pill', 'dao_pill', 'ascend_pill', 'purity_pill'];

export async function breakthrough(c) {
  const R = REALMS[c.qi.realm]; const cap = qiCap(c);
  if (c.qi.qi < cap) return `Not enough Qi (${c.qi.qi}/${cap}).`;
  const major = c.qi.stage >= R.stages; const next = major ? REALMS[c.qi.realm + 1] : R;
  if (!next) return 'There is nowhere left to climb.';
  if (major && next.req?.pill && !c.inv[next.req.pill]) return `Breaking into ${next.name} needs a Foundation Establishment Pill. Gates and sects have them.`;
  const info = breakthroughInfo(c); let p = info.p;
  const ward = major && c.inv.trib_talisman; if (ward) addItem(c, 'trib_talisman', -1);
  if (major) { const bp = Object.entries(ITEMS).find(([id, it]) => it.bt?.realm === next.id && c.inv[id]); if (bp) addItem(c, bp[0], -1, 'best'); }
  c.flags.incense = false;
  if (major && next.req?.pill) addItem(c, next.req.pill, -1, 'best');
  if (major && next.trib) {
    ui.log(`Clouds gather. The Heavens send a Tribulation to judge my ascent to ${next.name}.`, 'qi');
    const t = ENEMIES.find(e => e.id === 'tribulation');
    const lvl = next.trib;
    const soft = ward ? 0.7 : 1;
    let res;
    if (ui.arenaOn?.()) { // dodge the lightning yourself
      await ui.cinematic?.({ motif: 'bolt', color: '#b18cff', threads: 3, lines: ['Clouds pile up like ink poured into water.', `The Heavens judge your ascent to ${next.name}.`], title: 'Heavenly Tribulation', sub: `${lvl} bolt${lvl > 1 ? 's' : ''}`, sound: 'heavy', hold: 1.4 });
      const names = ['First Bolt', 'Rolling Thunder', "Heaven's Wrath", 'Nine Skies Judgement'];
      const ar = await ui.arena({ title: `Heavenly Tribulation — ${next.name}`, style: 'heaven', color: '#b18cff', phases: names.slice(0, Math.min(4, 1 + Math.ceil(lvl / 2))), difficulty: 0.15 + lvl * 0.12 - (ward ? 0.15 : 0),
        lives: 3 + Math.floor(c.stats.health / 35) + (ward ? 1 : 0), hitsPerPhase: 3, autoChance: clamp(0.35 + c.stats.health / 400 + power(c) / (40 + lvl * 25) + (ward ? 0.15 : 0), 0.1, 0.9),
        lines: { intro: 'The sky splits open. Survive — and strike back at the heart of the storm.', stagger: 'The clouds recoil.', opening: 'A gap in the storm.', openingTitle: 'The clouds thin', win: 'The last bolt fades. You are still standing.', lose: 'The lightning finds you.' } });
      res = ar.result; c.lastFightHpPct = ar.lives / ar.livesMax;
    } else res = await ui.fight({ ...t, hp: Math.round((80 * lvl * lvl + 60) * soft), str: Math.round((50 + lvl * 25) * soft), agi: 50 + lvl * 15, realm: c.qi.realm, name: `Heavenly Tribulation (${lvl} bolts)` }, { noFlee: true, tribulation: true });
    if (res !== 'win') { c.qi.qi = Math.round(c.qi.qi * 0.3); stat(c, 'health', -40); if (c.stats.health <= 0) die(c, 'struck down by Heavenly Tribulation'); return 'The lightning tore through me. The breakthrough failed.'; }
    c.flags.tribSurvived = true;
    if (c.lastFightHpPct < 0.15) earnTrait(c, 'heaven_defier');
    p = Math.max(p, 0.9);
  }
  if (!chance(p)) { c.qi.qi = Math.round(c.qi.qi * 0.5); stat(c, 'health', -ri(5, 15)); ui.fx('fail'); const sick = chance(0.4) && addCondition(c, 'qi_deviation', true);
    return `The breakthrough failed (${Math.round(p * 100)}% chance).${sick ? ' I came down with Qi Deviation Sickness.' : ''}`; }
  c.qi.qi = 0;
  if (major) { c.qi.realm++; c.qi.stage = 1; ui.fx('breakthrough', { major: true, realm: REALMS[c.qi.realm].name, color: REALMS[c.qi.realm].color }); stat(c, 'health', 30); stat(c, 'looks', 4);
    ui.log(`My limits shatter: stats can now reach ${REALMS[c.qi.realm].cap} (gains slow past ${Math.round(REALMS[c.qi.realm].cap * 0.7)}).`, 'qi');
    if (REALMS[c.qi.realm].id === 'immortal') earnTrait(c, 'author');
    return `BREAKTHROUGH! I have entered ${REALMS[c.qi.realm].name}. My lifespan stretches before me.`; }
  c.qi.stage++; ui.fx('breakthrough', { major: false }); stat(c, 'health', 5);
  return `Breakthrough! ${R.name} Stage ${c.qi.stage}.`;
}

// Passive yearly cultivation bits
export function cultivationYear(c) {
  // sects look after disciples who are ready for Foundation Establishment
  if (c.sect && c.qi.realm === RI.qi && c.qi.stage >= 5 && !c.inv.foundation_pill && chance(0.35)) {
    addItem(c, 'foundation_pill'); ui.log(`An elder of the ${sectName(c)} handed me a Foundation Establishment Pill. "You are ready."`, 'qi');
  }
  if (c.qi.known && c.qi.manuals.length && c.qi.realm === 0 && c.qi.qi >= qiCap(c)) {
    // mortals auto-condense into Qi realm when they first fill up
    c.qi.realm = 1; c.qi.stage = 1; c.qi.qi = 0; ui.log(`A warm thread of Qi settled in my dantian. I have entered ${REALMS[1].name}.`, 'qi'); ui.fx('breakthrough', { major: true, realm: REALMS[1].name, color: REALMS[1].color });
  }
  if (c.qi.realm > 0) c.qi.qi = Math.min(qiCap(c), c.qi.qi + qiGain(c, 3));
}

export function learnManual(c, id) {
  if (c.qi.manuals.includes(id)) return false;
  const m = MANUALS.find(x => x.id === id); c.qi.manuals.push(id); c.qi.known = true;
  if (m.tech && !c.qi.techs.includes(m.tech)) c.qi.techs.push(m.tech);
  ui.log(`I learned the ${m.name}.`, 'qi'); ui.fx('milestone'); return true;
}

// ---- sects: names (incl. your own) and founding a clan
export const sectName = c => c.sect === 'own' ? c.ownSect?.name : c.sect === 'guest' ? c.guestSect : SECTS.find(s => s.id === c.sect)?.name;
export function foundReq(c) {
  const cost = Math.round(5000 * country(c).econ), out = [];
  if (c.age < 18) out.push('Be at least 18');
  if (!(c.qi.realm >= RI.foundation || (c.qi.realm === RI.qi && c.qi.stage >= 5))) out.push('Reach Qi Condensation stage 5');
  if (c.money < cost) out.push(`Have ${fmtMoney(c, cost)}`);
  return { cost, missing: out };
}
// Founding a sect makes you the head of a new clan: your surname becomes the clan name, like a royal house.
export function foundSect(c, name, clan) {
  const { cost, missing } = foundReq(c); if (missing.length) return null;
  money(c, -cost); c.flags.birthLast ||= c.last; c.last = clan;
  c.ownSect = { name, clan, founded: c.age, disciples: 3 }; c.sect = 'own'; c.sectRank = 4;
  if (!c.qi.manuals.includes('breathing')) c.qi.manuals.push('breathing');
  return { text: `I founded the ${name}. From today I am ${c.first} ${clan}, ${c.gender === 'F' ? 'Matriarch' : 'Patriarch'} of the ${clan} Clan.`, cls: 'qi', big: true };
}

// ---- meditation methods
export function method(c) { const m = METHODS.find(x => x.id === c.qi.method); return m && c.qi.realm >= (m.minRealm || 0) ? m : METHODS[0]; }
export function learnMethod(c, id) {
  c.qi.methods ||= ['basic']; if (c.qi.methods.includes(id)) return false;
  c.qi.methods.push(id); const M = METHODS.find(x => x.id === id); ui.log(`I learned the ${M.name}.`, 'qi'); ui.fx('milestone'); return true;
}
