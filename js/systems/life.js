// Character creation, yearly aging loop, death, and generational inheritance.
import { onBodyPath, bodyTier } from './path.js';
import { workloadYear } from './workload.js';
import { maybeBreach } from './breach.js';
import { HARD } from '../core/hard.js';
import { spared } from './fortune.js';
import { BODY_TIERS } from '../data/bodypath.js';
import { G, META, save } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp, uid, weighted, rand } from '../core/rng.js';
import { COUNTRIES, WEALTH, ERAS, TIERS, BIOMES } from '../data/countries.js';
import { perk } from '../data/legacyTree.js';
import { METHODS } from '../data/realms.js';
import { RECIPES, ITEMS } from '../data/items.js';
import { REALMS, ELEMENTS } from '../data/realms.js';
import { CAREERS } from '../data/careers.js';
import { TRAIT_BY_ID } from '../data/traits.js';
import { rollBirthTraits, applyTraitMods, traitVal, traitMult, earnTrait, has } from './traits.js';
import { makePerson, yearlyPeople, familyAtBirth } from './people.js';
import { randomGenes, mixGenes } from '../ui/portrait.js';
import { yearlyEvents } from '../data/events.js';
import { cultivationYear } from './cultivation.js';
import { healthYear, TRAINABLE, trauma, geneticCheck, suddenDeathChance } from './health.js';
import { ensureBody, bodyYear, adultHeight, eff, workMult, healMult } from './body.js';
import { bonds, bondBonus } from './people.js';
import { checkEarned } from './traits.js';
import { bonusVal } from './bonus.js';
import { tryRegress } from './fate.js';

// Extension points: other systems (heirlooms, genetics, sects, world news, family) register here.
export const HOOKS = { birth: [], yearStart: [], yearEnd: [], inherit: [], death: [] };

export const ACTIONS_PER_YEAR = 4, SOCIAL_PER_YEAR = 4;
export const STAT_KEYS = ['health', 'happiness', 'stress', 'smarts', 'looks', 'strength', 'battle', 'agility', 'charisma', 'luck'];

export const tierOf = c => TIERS[country(c).tier] || TIERS.developed;
export const country = c => COUNTRIES.find(x => x.id === c.country) || COUNTRIES[0];
export const realm = c => REALMS[c.qi.realm];
// Money is stored in one base unit (≈ US dollars). It's shown in your local currency at a real-world-ish exchange rate,
// so 3 euros and 3 yuan are no longer the same thing.
export const FX = { cn: 7.2, kr: 1350, jp: 150, us: 1, gb: 0.79, br: 5, ng: 1500, in: 83, ru: 90, mx: 17, fr: 0.92, eg: 48 };
export const fxRate = c => FX[c?.country] ?? 1;
// Wages follow the local economy (a doctor in Cairo earns far less than one in New York) and are deliberately
// modest: getting rich should take a career, luck or a cultivation empire — not a few years of clicking.
export const WAGE = { us: 1.2, gb: 1.05, fr: 1.0, jp: 0.95, kr: 0.9, cn: 0.5, ru: 0.4, br: 0.3, mx: 0.3, in: 0.2, eg: 0.17, ng: 0.15 };
export const INCOME = 0.32; // v0.8.1: nerfed again (0.6 → 0.45 → 0.32)
export const wage = c => (WAGE[c?.country] ?? country(c).econ) * INCOME;
export const fmtMoney = (c, n) => { const v = Math.round(n * fxRate(c)); return (v < 0 ? '-' : '') + country(c).currency + Math.abs(v).toLocaleString(); };
export function lifeStage(age) {
  if (age < 3) return 'Infancy'; if (age < 13) return 'Childhood'; if (age < 18) return 'Adolescence';
  if (age < 30) return 'Young Adult'; if (age < 55) return 'Adulthood'; if (age < 75) return 'Middle Age'; return 'Elder';
}
export function fullName(p) { return `${p.first} ${p.last}`; }

// v0.9.17 city-aware: someone born in a city with a regional pool usually gets a local name
export function namePool(cty, city) { const R = city && cty.regional?.[city]; return R && Math.random() < 0.65 ? R : cty; }
export function makeName(cty, gender, city) {
  const P = namePool(cty, city), L = namePool(cty, city);
  const first = pick(gender === 'F' ? P.f : P.m);
  let last = pick(L.last);
  if (gender === 'F' && cty.fem) last = cty.fem(last);
  return { first, last };
}

// ---- stats helpers ---------------------------------------------------------
// Stat caps rise with each cultivation realm; past the soft cap (70%) gains shrink toward zero.
export const CAPPED = ['strength', 'battle', 'agility', 'smarts', 'charisma', 'luck', 'looks'];
export const statCap = c => onBodyPath(c) ? bodyTier(c).cap : REALMS[c.qi.realm].cap || 100;
export const softCap = c => Math.round(statCap(c) * 0.7);
export function gainMult(c, k) {
  const v = c.stats[k] ?? 0, cap = statCap(c), soft = softCap(c);
  return v < soft ? 1 : Math.max(0.1, (cap - v) / (cap - soft));
}
export function stat(c, k, d) {
  if (d === undefined) return c.stats[k];
  if (CAPPED.includes(k)) {
    if (d > 0) { (c.lastTrained ||= {})[k] = c.age; const x = d * gainMult(c, k); d = Math.floor(x) + (Math.random() < x % 1 ? 1 : 0); }
    c.stats[k] = clamp(Math.round((c.stats[k] ?? 50) + d), 0, statCap(c)); return c.stats[k];
  }
  if (k === 'stress' && d > 0) d *= 1.6 * traitMult(c, 'stressMult'); // stress piles up fast
  if (d > 0 && TRAINABLE.includes(k)) (c.lastTrained ||= {})[k] = c.age; // training resets decay
  c.stats[k] = clamp(Math.round((c.stats[k] ?? 50) + d));
  return c.stats[k];
}
// Charisma (and a few traits) get you better prices from merchants: up to 25% off.
export function discount(c) { return clamp(Math.max(0, (eff(c, 'charisma') - 40) / 240) + (traitMult(c, 'social') > 1 ? 0.03 : 0) + (perk('f4') ? 0.05 : 0), 0, 0.3); }
export function priceFor(c, base) { return Math.round(base * (1 - discount(c))); }
// Current wealth status from net worth (adjusted for the country's economy). Kids show their family's class.
export function netWorth(c) { return c.money + (c.stocks || 0) + c.assets.reduce((s, a) => s + (a.value || 0), 0); }
export function wealthLabel(c) {
  const born = WEALTH.find(w => w.id === c.wealth)?.name || '';
  if (c.age < 18) return `${born} family`;
  const n = netWorth(c) / country(c).econ;
  const tier = n < 0 ? 'In Debt' : n < 1000 ? 'Broke' : n < 10000 ? 'Poor' : n < 50000 ? 'Getting By' : n < 250000 ? 'Comfortable' : n < 1e6 ? 'Well-off' : n < 1e7 ? 'Rich' : n < 1e8 ? 'Very Rich' : 'Ultra Rich';
  return c.wealth === 'royal' ? `Royal · ${tier}` : tier;
}
export function money(c, d) {
  if (d >= Math.max(10000 * country(c).econ, Math.abs(c.money) * 0.5) && d > 0) ui.fx('cash'); // big windfalls get a sound
  c.money = Math.round(c.money + d); return c.money;
}
// v0.8.0 item quality: gear and pills come in Low / Mid / High grade. c.inv keeps the total; c.invQ keeps how many
// of those are Low or High (the rest are Mid). Effects scale by the grade's multiplier.
export const QUALITY = {
  lo: { id: 'lo', name: 'Low-grade', short: 'Low', mult: 0.8, color: '#9aa3ad' },
  mid: { id: 'mid', name: 'Mid-grade', short: 'Mid', mult: 1, color: '#e7d7b0' },
  hi: { id: 'hi', name: 'High-grade', short: 'High', mult: 1.2, color: '#ffd36f' },
};
export const tiered = id => ITEMS[id]?.type === 'gear' || /_pill$/.test(id);
export function qCounts(c, id) { const e = c.invQ?.[id] || {}, n = c.inv[id] || 0, lo = Math.min(n, e.lo || 0), hi = Math.min(n - lo, e.hi || 0); return { lo, mid: n - lo - hi, hi }; }
// q when adding: the grade gained (default Mid). q when removing: which grade goes first —
// default Low first (so ingredients and costs eat your worst), 'best' = High first (for using a pill).
export function addItem(c, id, n = 1, q) {
  const tq = tiered(id), before = tq ? qCounts(c, id) : null; let took = null;
  c.inv[id] = (c.inv[id] || 0) + n;
  if (tq) {
    const cnt = { ...before };
    if (n > 0) cnt[QUALITY[q] ? q : 'mid'] += n;
    else { let k = -n; const order = q === 'best' ? ['hi', 'mid', 'lo'] : QUALITY[q] ? [q, 'lo', 'mid', 'hi'] : ['lo', 'mid', 'hi'];
      for (const t of order) { const x = Math.min(k, cnt[t]); if (x > 0) { cnt[t] -= x; k -= x; took = t; } if (!k) break; } }
    c.invQ ||= {}; if (cnt.lo || cnt.hi) c.invQ[id] = { lo: cnt.lo, hi: cnt.hi }; else delete c.invQ[id];
  }
  if (c.inv[id] <= 0) { delete c.inv[id]; if (c.invQ) delete c.invQ[id]; }
  return took || 'mid';
}
// the grade a looted item rolls: mostly Mid, some Low, a few High. luck helps a little
export const rollQuality = (c, bonus = 0) => { const r = Math.random(), hi = 0.12 + bonus + (perk('d5') ? 0.05 : 0) + Math.max(0, (c?.stats?.luck || 50) - 50) / 1000; return r < hi ? 'hi' : r > 0.62 - bonus ? 'lo' : 'mid'; };
export const bestQ = (c, id) => { const k = qCounts(c, id); return k.hi ? 'hi' : k.mid ? 'mid' : k.lo ? 'lo' : null; };

// v0.9.23 genetics: a child's potential is a blend of both parents and their own roll (best of two), so
// strong parents usually have strong kids, and most kids land around the average or a little above it.
export const GENE_STATS = ['smarts', 'strength', 'agility', 'charisma', 'luck'];
const best2 = () => Math.max(ri(15, 75), ri(15, 75));
export const geneMix = (a, b, w = 0.55, v = 6) => clamp(Math.round(((a + b) / 2) * w + best2() * (1 - w) + ri(-v, v)));
function geneticStats(c, base0) {
  const ps = c.people.filter(p => (p.role === 'Father' || p.role === 'Mother') && p.stats); if (!ps.length) return;
  const pv = k => ps.map(p => p.stats[k] ?? 50), adult = { strength: 0.5, agility: 0.5 };
  for (const k of GENE_STATS) { const v = pv(k), g = geneMix(v[0], v[1] ?? v[0]) * (adult[k] || 1); c.stats[k] = clamp(Math.round(c.stats[k] + g - base0[k])); }
}

// ---- new life ----------------------------------------------------------------
export function newLife(opts = {}) {
  const cty = opts.country || weighted(COUNTRIES, () => 1);
  const gender = opts.gender || (chance(0.5) ? 'F' : 'M');
  const wealth = opts.wealth || weighted(WEALTH.map(w => ({ ...w, weight: w.weight * (w.id === 'royal' ? 1 + perk('f3') * 1.5 : 1) * (perk('f2') && ['destitute', 'poor'].includes(w.id) ? 0.35 : 1) })));
  const city0 = opts.city && cty.city.includes(opts.city) ? opts.city : pick(cty.city);
  const nm = opts.name || makeName(cty, gender, city0);
  const genes = opts.genes || randomGenes(gender);
  const base = () => ri(20, 80);
  const c = {
    id: opts.id || uid(), first: nm.first, last: nm.last, gender, country: cty.id, city: city0, wealth: wealth.id,
    age: 0, alive: true, birthYear: G.world.year, generation: opts.generation || 1,
    money: 0, fame: 0, genes, hair: null,
    stats: { health: ri(60, 100), happiness: ri(60, 95), stress: ri(0, 15), smarts: base(), looks: genes.looks, battle: ri(0, 8),
             strength: ri(10, 40), agility: ri(10, 40), charisma: base(), luck: base() },
    traits: [], qi: { known: false, realm: 0, stage: 1, qi: 0, elem: pick(ELEMENTS).id, affinity: ri(5, 60), meridians: 0, manuals: [], techs: [] },
    inv: {}, edu: { level: 0, school: null, uniYears: 0, major: null, grades: ri(40, 80) },
    job: null, people: [], partnerId: null, log: [], counts: {}, flags: { stageSystem: 5, realmsV2: true, realmsV3: true }, prison: 0,
    assets: [], stocks: 0, wins: 0, kills: 0, gatesCleared: 0, gates: [], sect: null,
    lifespan: ri(68, 92), actions: ACTIONS_PER_YEAR, social: SOCIAL_PER_YEAR, idleYears: 0, heirlooms: opts.heirlooms || [],
  };
  const base0 = { ...c.stats };
  // perks & inheritance
  if (opts.inherit) Object.entries(opts.inherit).forEach(([k, v]) => { c.stats[k] = clamp(Math.round(v)); });
  c.traits = opts.traits || rollBirthTraits(c);
  c.traits.forEach(t => applyTraitMods(c, t));
  // Legacy tree perks
  if (perk('c1')) c.qi.affinity = clamp(c.qi.affinity + 15 * perk('c1'));
  if (perk('f1')) c.money += 500 * perk('f1');
  if (perk('c2')) { c.qi.known = true; if (!c.qi.manuals.includes('breathing')) c.qi.manuals.push('breathing'); }
  if (perk('c5')) { const m = METHODS.filter(x => x.id !== 'basic' && !x.demonic && !x.minRealm); c.qi.methods = ['basic', m[Math.floor(Math.random() * m.length)].id]; }
  if (perk('b1')) c.stats.health = clamp(c.stats.health + 5 * perk('b1'));
  if (perk('b2')) c.stats.strength += 5;
  if (perk('b3')) c.lifespan += 5 * perk('b3');
  if (perk('b5')) { c.stats.battle += 5; c.stats.agility += 5; }
  if (perk('m1')) c.stats.smarts = clamp(c.stats.smarts + 5);
  if (perk('m2')) c.stats.charisma = clamp(c.stats.charisma + 5);
  if (perk('m3')) { const pills = RECIPES.filter(r => ITEMS[r.out].type === 'consumable' && r.id !== 'r_ink').sort(() => Math.random() - 0.5).slice(0, 2); c.recipes = [...(c.recipes || []), ...pills.map(r => r.id)]; }
  if (perk('b4') && genes.carriers) genes.carriers = genes.carriers.filter(() => Math.random() < 0.5);
  c.lifespan += traitVal(c, 'life');
  c.money += ri(...wealth.money) * (opts.moneyBonus ? 1 : 1);
  G.char = c;
  familyAtBirth(c, wealth, opts.parents, opts.siblings);
  if (!opts.inherit) geneticStats(c, base0);
  if (opts.inheritMoney) c.money += opts.inheritMoney;
  // birth log
  ensureBody(c); if (opts.heights) c.body.adultHeight = adultHeight(c.country, c.gender, opts.heights);
  beginYear(c);
  geneticCheck(c, true);
  HOOKS.birth.forEach(f => f(c, opts));
  const parents = c.people.filter(p => p.role === 'Father' || p.role === 'Mother');
  ui.log(`I was born a ${gender === 'F' ? 'girl' : 'boy'} in ${c.city}, ${cty.name}, to a ${wealth.name.toLowerCase()} family.`, 'big');
  parents.forEach(p => ui.log(`My ${p.role.toLowerCase()} is ${fullName(p)}, ${p.age}${p.job ? ', a ' + p.job : ''}.`));
  c.traits.forEach(t => ui.log(`Born with trait: ${TRAIT_BY_ID[t]?.name || t}`, 'trait'));
  if (c.traits.includes('reincarnator')) ui.log('Flashes of another life drift behind my eyes...', 'qi');
  if (opts.inheritMoney) ui.log(`I inherited ${fmtMoney(c, opts.inheritMoney)}.`, 'good');
  META.lives++;
  save();
  return c;
}

// Action points grow as you grow up: 4 as a child → 5 at 16 → 6 at 25 → 7 at 35 → 8 at 50. Traits get you there sooner. Cap 8.
export function maxActions(c) { return Math.min(8, ACTIONS_PER_YEAR + [16, 25, 35, 50].filter(a => c.age >= a).length + traitVal(c, 'extraAction') + perk('m5')); }
// Social actions: 4 → 5 at 18 → 6 at 30. Cap 6.
export function maxSocial(c) { return Math.min(6, SOCIAL_PER_YEAR + [18, 30].filter(a => c.age >= a).length + traitVal(c, 'extraSocial')); }
export function beginYear(c) {
  c.log.push({ age: c.age, year: G.world.year, lines: [] });
  c.maxActions = maxActions(c); c.qi.medYear = 0; c.qi.fatigue = Math.max(0, (c.qi.fatigue || 0) - 2); c.actions = c.maxActions; c.maxSocial = maxSocial(c); c.social = c.maxSocial; c.usedThisYear = 0;
}

// ---- yearly aging ----------------------------------------------------------
let lastAgeClicks = [];
export async function ageUp() { const w = typeof window !== 'undefined' ? window : globalThis; w.__fiBusy = (w.__fiBusy || 0) + 1; try { return await ageUp0(); } finally { w.__fiBusy = Math.max(0, w.__fiBusy - 1); } }
async function ageUp0() {
  const c = G.char; if (!c || !c.alive) return;
  if (c.fableRun) { ui.toast('You are inside a Fable. Time is frozen until you finish it (Fables tab).'); return; }
  workloadYear(c, stat); // v0.9.19 the year's workload turns into stress
  // GLITCHED: spam detection
  const now = performance.now(); lastAgeClicks = lastAgeClicks.filter(t => now - t < 1000); lastAgeClicks.push(now);
  if (lastAgeClicks.length >= 5) earnTrait(c, 'duplicate');
  c.flags.busyYears = c.actions <= 0 ? (c.flags.busyYears || 0) + 1 : 0;
  if (!c.usedThisYear) { c.idleYears++; if (c.idleYears >= 30) earnTrait(c, 'nobody'); } else c.idleYears = 0;

  c.age++; G.world.year++;
  if (G.world.year % 60 === 0) { G.world.era = pick(ERAS); }
  beginYear(c);
  ui.fx('ageup');
  for (const f of HOOKS.yearStart) await f(c);

  // prison skips most of life
  if (c.prison > 0) {
    c.prison--; stat(c, 'happiness', -8); stat(c, 'strength', 2);
    ui.log(c.prison ? `Another year behind bars. ${c.prison} to go.` : 'I was released from prison.', c.prison ? 'bad' : 'good');
    if (!c.prison) earnTrait(c, 'jailbird');
  }

  // passive stat drift
  // bodies recover toward a baseline that drops with age; old age wears you down
  const target = c.age < 40 ? 88 : c.age < 60 ? 72 : 58;
  // the lower you are, the harder your body fights back (kidneys & gut matter). v0.7.9: slower healing, real aging
  if (c.stats.health < target) stat(c, 'health', Math.round((c.stats.health < 40 ? ri(4, 8) : c.age < 18 ? ri(2, 5) : ri(1, 4)) * healMult(c) / Math.sqrt(HARD) * 1.1 * traitMult(c, 'healRate')));
  else if (c.age > 30) stat(c, 'health', -Math.round(ri(0, c.age > 65 ? 4 : 2) * (1 + (HARD - 1) / 2)));
  if (c.qi.realm) stat(c, 'health', c.qi.realm);
  if (traitVal(c, 'heal')) stat(c, 'health', traitVal(c, 'heal'));
  stat(c, 'stress', -ri(1, 4)); // and drains slowly
  if (c.stats.stress > 75) { stat(c, 'health', -3); stat(c, 'happiness', -5); }
  if (has(c, 'null_ptr')) { const k = pick(STAT_KEYS.filter(k => k !== 'stress')); c.stats[k] = CAPPED.includes(k) ? statCap(c) : 100; ui.log(`ERR 0x${ri(4096, 65535).toString(16)}: ${k} = 100`, 'glitch'); }

  // school / job / money
  educationYear(c);
  if (c.job && !c.prison) {
    const job = CAREERS.find(j => j.id === c.job.id);
    const pay = Math.round(job.pay * wage(c) * (c.job.raise || 1) * Math.min(1.6, 1 + c.job.years * 0.02) * (job.part ? 0.5 : 1) * traitMult(c, 'pay') * bondBonus(c, 'work') * (perk('f5') ? 1.1 : 1) * workMult(c)); // an injured body earns less
    money(c, pay); c.job.years++; c.job.perf = clamp(c.job.perf - ri(0, 6));
    ui.log(`Earned ${fmtMoney(c, pay)} as a ${job.name}.`);
    if (c.job.perf < 15 && chance(0.4)) { ui.log(`I was fired from my job as a ${job.name}.`, 'bad'); c.job = null; }
  }
  // investments are handled by the stock market (systems/market.js)
  // comfort: a home, a car and pets make life easier
  const cf = comfort(c); if (cf.happy) stat(c, 'happiness', cf.happy); if (cf.stress) stat(c, 'stress', -cf.stress); if (cf.health) stat(c, 'health', cf.health);
  c.assets.forEach(a => { if (a.rent && a.tenant) { money(c, a.rent); } a.value = Math.round(a.value * (a.type === 'car' ? 0.88 : 1 + (rand() * 0.1 - 0.02))); });
  if (c.age >= 18 && c.money < 0) { stat(c, 'stress', 10); ui.log('Debt collectors keep calling.', 'bad'); }
  if (c.age === 18 && !c.flags.leftHome) { c.flags.leftHome = true; const p = c.people.find(p => p.role === 'Mother' || p.role === 'Father'); if (p && chance(0.5) && c.wealth !== 'destitute') { const g = ri(200, 3000); money(c, g); ui.log(`${p.first} gave me ${fmtMoney(c, g)} to start my adult life.`, 'good'); } }

  // gates countdown
  c.gates = c.gates.filter(g => --g.years > 0 || (maybeBreach(c, g) || ui.log(`The ${g.rank}-rank Gate near ${c.city} closed on its own.`), false)); // v0.9.4 ignored SSS+ Gates may rupture

  // necessities & weather
  const T = tierOf(c), B = BIOMES[country(c).biome];
  if (T.scarcity && chance(T.scarcity) && !['wealthy', 'rich', 'royal'].includes(c.wealth) && c.money < 5000 * country(c).econ) {
    const what = pick(['Food ran short this year — I often went to bed hungry.', 'The water was unsafe for months. I got sick from it.', 'Power cuts and empty markets made it a hard year.']);
    stat(c, 'health', -ri(3, 7)); stat(c, 'happiness', -4); ui.log(what, 'bad');
  }
  if (B && chance(0.22)) {
    const [txt, kind] = pick(B.events); const shelter = c.assets.some(a => a.type === 'house') || c.money > 20000 * country(c).econ;
    if (shelter) ui.log(`${txt} I rode it out safely at home.`, 'world');
    else { stat(c, 'health', -ri(2, 6)); stat(c, 'happiness', -4); ui.log(`${txt} ${kind === 'cold' ? 'I could barely afford heating.' : kind === 'heat' ? 'I had no way to keep cool.' : kind === 'drought' ? 'We rationed every drop.' : 'Our home was damaged.'}`, 'bad'); }
  }
  // bonds
  const bd = bonds(c);
  if (bd.best) stat(c, 'happiness', 2);
  if (bd.partner) { stat(c, 'happiness', 3); stat(c, 'stress', -3); }
  // your own sect grows and pays tithes
  if (c.ownSect) {
    const o = c.ownSect; const gain = Math.max(0, ri(-1, 3) + Math.floor(c.stats.charisma / 40) + c.qi.realm);
    o.disciples += gain; const tithe = Math.round(o.disciples * 60 * wage(c) * traitMult(c, 'pay'));
    money(c, tithe); ui.log(`The ${o.name} grew to ${o.disciples} disciples. Tithes: ${fmtMoney(c, tithe)}.`, 'qi');
  }
  yearlyPeople(c);
  bodyYear(c);
  healthYear(c);
  cultivationYear(c);
  await yearlyEvents(c);
  for (const f of HOOKS.yearEnd) { if (!c.alive) break; await f(c); }
  checkEarned(c);
  checkDeath(c);
  save(); ui.refresh();
}

function educationYear(c) {
  const e = c.edu;
  if (c.prison) return;
  if (c.age === 6) { e.school = 'Primary School'; ui.log(`I started primary school.`); }
  if (c.age === 12) { const T = tierOf(c); if (chance(T.school) || ['middle', 'wealthy', 'rich', 'royal'].includes(c.wealth)) { e.school = 'Secondary School'; ui.log('I started secondary school.'); } else { e.school = null; ui.log('There was no secondary school my family could reach or afford. I started working instead.', 'bad'); } }
  if (c.age === 18 && !e.school && e.level === 0 && !c.flags.noSchoolNoted) { c.flags.noSchoolNoted = true; }
  if (c.age === 18 && e.school === 'Secondary School') {
    if (e.grades >= 35) { e.level = 1; ui.log('I graduated from secondary school.', 'good'); } else ui.log('I failed to graduate from secondary school.', 'bad');
    e.school = null;
  }
  if (e.school === 'University') {
    e.uniYears++;
    if (e.uniYears >= 4) { e.level = 2; e.school = null; ui.log(`I graduated from university with a degree in ${e.major}!`, 'big'); ui.fx('milestone'); }
  }
  if (e.school) (c.lastTrained ||= {}).smarts = c.age; // school keeps your mind in use (marks drift in school.js)
}

export function lifespan(c) {
  // cultivation adds lifespan little by little: earlier realms in full, the current realm grows with each stage
  let l = c.lifespan; for (let r = 1; r < c.qi.realm; r++) l += REALMS[r].life;
  const R = REALMS[c.qi.realm]; if (c.qi.realm) l += Math.round(R.life * c.qi.stage / R.stages);
  if (onBodyPath(c)) for (let t = 1; t <= (c.bodyPath?.tier || 0); t++) l += BODY_TIERS[t].life;
  return Math.round(l + bonusVal(c, 'life'));
}
function checkDeath(c) {
  const ls = lifespan(c);
  let cause = null;
  if (c.stats.health <= 0 && c.age < 18 && !c.flags.rescued) { c.flags.rescued = true; c.stats.health = 25; ui.log('I nearly died, but a doctor pulled me back from the edge.', 'bad'); trauma(c, 0.4); }
  if (c.stats.health <= 0) cause = 'my body finally gave out';
  else if (c.age > ls - 8 && chance(0.12 + (c.age - (ls - 8)) * 0.08)) cause = 'I passed peacefully of old age';
  else if (chance(suddenDeathChance(c) * HARD)) cause = c.conditions?.some(x => ['heart', 'congenital_heart'].includes(x.id)) && chance(0.6) ? 'a sudden heart attack' : pick(['a freak accident', 'a sudden aneurysm', 'a car accident', 'a stray spirit beast', 'a fall down the stairs']);
  if (cause && !(cause !== 'my body finally gave out' && !/old age/.test(cause) && spared(c, cause))) die(c, cause);
}

export const LEGACY_RATE = 0.6;
export function die(c, cause) {
  if (!c.alive) return;
  if (tryRegress(c, cause)) return; // v0.9.23: sometimes a fallen Void Refiner wakes up years in the past
  c.alive = false; c.cause = cause;
  ui.log(`I died at age ${c.age}: ${cause}.`, 'death');
  if (c.age >= 100 && !c.qi.realm) earnTrait(c, 'centenarian');
  // legacy points
  let pts = Math.round(c.age / 5 + c.qi.realm * 15 + c.gatesCleared * 2 + c.wins / 2 + (c.edu.level * 3) + Math.log10(Math.max(1, c.money + c.stocks)) * 2 + c.traits.length);
  pts = Math.round(pts * tierOf(c).legacy * LEGACY_RATE); // v0.9.11 nerf: lives pay 60% of what they used to
  c.legacyEarned = pts; META.legacy += pts; META.bestRealm = Math.max(META.bestRealm, c.qi.realm);
  c.traits.forEach(t => META.unlockedTraits[t] = true);
  checkEarned(c);
  HOOKS.death.forEach(f => f(c));
  ui.fx('death'); save();
}

// Continue as a child: genes mixed from both parents, stats averaged with RNG variance, money & heirlooms inherited.
// ---- estate & inheritance: no prenup + living spouse → the spouse inherits everything; otherwise the children do
// Comfort bonuses from what you own (rented-out homes don't count as your home)
export function comfort(c) {
  const homes = c.assets.filter(a => a.type === 'house' && !a.tenant), cars = c.assets.filter(a => a.type === 'car'), pets = c.assets.filter(a => a.type === 'pet');
  const best = homes.reduce((m, a) => Math.max(m, a.value), 0) / country(c).econ;
  const home = best >= 800000 ? 3 : best >= 200000 ? 2 : best > 0 ? 1 : 0;
  const lines = [];
  if (home) lines.push(['🏠', ['A roof of your own', 'A comfortable family home', 'A luxurious villa'][home - 1], `+${home * 2} Happiness, -${home * 2} Stress a year, safe from bad weather`]);
  if (cars.length) lines.push(['🚗', 'Your own wheels', '+2 Happiness, -2 Stress a year']);
  if (pets.length) lines.push(['🐾', pets.length > 1 ? 'Your pets' : pets[0].name, `+${Math.min(3, pets.length) * 2} Happiness, -2 Stress a year`]);
  return { happy: home * 2 + (cars.length ? 2 : 0) + Math.min(3, pets.length) * 2, stress: home * 2 + (cars.length ? 2 : 0) + (pets.length ? 2 : 0), health: home >= 2 ? 1 : 0, lines };
}
export const estateValue = c => c.money + (c.stocks || 0) + c.assets.reduce((s, a) => s + (a.value || 0), 0);
export function willInfo(c) {
  const spouse = c.people.find(p => p.role === 'Spouse' && p.alive);
  const kids = c.people.filter(p => ['Son', 'Daughter'].includes(p.role) && p.alive);
  const heir = spouse && !c.flags.prenup ? 'spouse' : kids.length ? 'children' : spouse ? 'spouse' : 'state';
  return { heir, spouse, kids, value: estateValue(c) };
}
// Give an asset or money to a child while you're alive; it waits for them if you ever continue as that child.
export function giftToChild(c, kid, what) {
  if (kid.coop) { // another player: hand it over right now over the network
    if (what.money && c.money < what.money) return null;
    if (what.asset) { const i = c.assets.indexOf(what.asset); if (i < 0) return null; c.assets.splice(i, 1); } else money(c, -what.money);
    if (!ui.coopGift?.(kid, what)) { if (what.asset) c.assets.push(what.asset); else money(c, what.money); ui.toast?.(`${kid.first} is not online.`); return null; }
    kid.close = clamp(kid.close + (what.asset ? 12 : 6));
    return what.asset ? `I gave my ${what.asset.name.toLowerCase()} to ${kid.first}.` : `I sent ${kid.first} ${fmtMoney(c, what.money)}.`;
  }
  kid.gifts ||= { money: 0, assets: [] };
  if (what.asset) { const i = c.assets.indexOf(what.asset); if (i < 0) return null; c.assets.splice(i, 1); what.asset.tenant = what.asset.tenant || false; kid.gifts.assets.push(what.asset); kid.close = clamp(kid.close + 12); return `I gave my ${what.asset.name.toLowerCase()} to ${kid.first}.`; }
  if (what.money) { if (c.money < what.money) return null; c.money -= what.money; kid.gifts.money += what.money; kid.close = clamp(kid.close + 8); return `I gave ${kid.first} ${fmtMoney(c, what.money)}.`; }
  return null;
}

export function continueAs(childId) {
  const old = G.char; const ch = old.people.find(p => p.id === childId); if (!ch) return null;
  const partner = old.people.find(p => p.id === old.partnerId) || old.people.find(p => p.id === ch.otherParent);
  const inherit = {};
  ['smarts', 'strength', 'agility', 'charisma', 'luck'].forEach(k => {
    const other = partner?.stats?.[k] ?? ri(30, 70);
    inherit[k] = geneMix(old.stats[k], other, 0.65, 8);
  });
  // traits: each parent trait has a chance to pass down (rarer = less likely), plus a fresh roll
  const passed = old.traits.filter(t => !['bloodstained', 'jailbird', 'nobody', 'duplicate', 'centenarian', 'author'].includes(t) && chance(0.35));
  const will = willInfo(old); const gifts = ch.gifts || { money: 0, assets: [] };
  let heirMoney = 0, heirAssets = [], willNote = '';
  if (will.heir === 'children') { const n = Math.max(1, will.kids.length); heirMoney = Math.round(((old.money + (old.stocks || 0)) * 0.9) / n); heirAssets = old.assets.slice(); willNote = `I inherited ${n > 1 ? `my share (1/${n}) of ` : ''}${fullName(old)}'s estate${heirAssets.length ? `, including ${heirAssets.map(a => a.name.toLowerCase()).join(', ')}` : ''}.`; }
  else if (will.heir === 'spouse') { heirMoney = Math.round(will.value * 0.1); willNote = `${will.spouse.first} inherited ${fullName(old)}'s estate (no prenup). They gave me ${fmtMoney(old, heirMoney)} to help me along.`; }
  const heir = heirMoney + gifts.money;
  G.world.year = old.birthYear + old.age - ch.age;
  // the heir's real family: the parent who just died, the other parent (an NPC or a co-op player) and their siblings
  const mk = (p, role) => ({ ...p, role, close: Math.max(60, p.close || 80) });
  const realParents = [{ id: old.id, first: old.first, last: old.last, gender: old.gender, age: old.age, alive: false, genes: old.genes, hair: old.hair, stats: { ...old.stats }, realm: old.qi.realm, role: old.gender === 'F' ? 'Mother' : 'Father', close: 90, dna: [...(old.dna?.base || [])] }];
  if (partner) realParents.push(mk(partner, partner.gender === 'F' ? 'Mother' : 'Father'));
  const sibs = old.people.filter(p => ['Son', 'Daughter'].includes(p.role) && p.id !== ch.id).map(p => mk(p, p.gender === 'F' ? 'Sister' : 'Brother'));
  const c = newLife({ parents: realParents, siblings: sibs, id: ch.id,
    country: COUNTRIES.find(x => x.id === old.country), gender: ch.gender, name: { first: ch.first, last: ch.last },
    genes: ch.genes, wealth: WEALTH.find(w => w.id === old.wealth), generation: old.generation + 1,
    inherit, heirlooms: [],
    traits: [...new Set([...passed, ...rollBirthTraits({ traits: [] }).slice(0, 1)])],
    inheritMoney: Math.max(0, Math.round(heir)),
  });
  c.age = ch.age; c.log = []; beginYear(c);
  c.assets.push(...heirAssets.map(a => ({ ...a })), ...gifts.assets);
  if (willNote) ui.log(willNote, 'good');
  if (gifts.money || gifts.assets.length) ui.log(`Gifts from my parent waited for me: ${[gifts.money ? fmtMoney(c, gifts.money) : null, ...gifts.assets.map(a => a.name)].filter(Boolean).join(', ')}.`, 'good');
  ui.log(`I am ${fullName(c)}, child of ${fullName(old)}. My parent's story has ended; mine continues.`, 'big');
  if (old.qi.realm >= 1) { c.qi.known = true; c.qi.manuals.push('breathing'); ui.log('I inherited my parent\'s breathing scroll. I know Qi is real.', 'qi'); }
  if (old.traits.includes('centenarian')) stat(c, 'health', 5);
  HOOKS.inherit.forEach(f => f(old, c, ch));
  save(); return c;
}
