// Character creation, yearly aging loop, death, and generational inheritance.
import { G, META, save } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp, uid, weighted, rand } from '../core/rng.js';
import { COUNTRIES, WEALTH, ERAS, TIERS, BIOMES } from '../data/countries.js';
import { REALMS, ELEMENTS } from '../data/realms.js';
import { CAREERS } from '../data/careers.js';
import { rollBirthTraits, applyTraitMods, traitVal, traitMult, earnTrait, has } from './traits.js';
import { makePerson, yearlyPeople, familyAtBirth } from './people.js';
import { randomGenes, mixGenes } from '../ui/portrait.js';
import { yearlyEvents } from '../data/events.js';
import { cultivationYear } from './cultivation.js';
import { healthYear, TRAINABLE, trauma, geneticCheck, suddenDeathChance } from './health.js';
import { ensureBody, bodyYear, adultHeight } from './body.js';
import { bonds, bondBonus } from './people.js';
import { checkEarned } from './traits.js';

export const ACTIONS_PER_YEAR = 4, SOCIAL_PER_YEAR = 4;
export const STAT_KEYS = ['health', 'happiness', 'mood', 'stress', 'smarts', 'looks', 'strength', 'battle', 'agility', 'charisma', 'luck'];

export const tierOf = c => TIERS[country(c).tier] || TIERS.developed;
export const country = c => COUNTRIES.find(x => x.id === c.country) || COUNTRIES[0];
export const realm = c => REALMS[c.qi.realm];
export const fmtMoney = (c, n) => country(c).currency + Math.round(n).toLocaleString();
export function lifeStage(age) {
  if (age < 3) return 'Infancy'; if (age < 13) return 'Childhood'; if (age < 18) return 'Adolescence';
  if (age < 30) return 'Young Adult'; if (age < 55) return 'Adulthood'; if (age < 75) return 'Middle Age'; return 'Elder';
}
export function fullName(p) { return `${p.first} ${p.last}`; }

export function makeName(cty, gender) {
  const first = pick(gender === 'F' ? cty.f : cty.m);
  let last = pick(cty.last);
  if (gender === 'F' && cty.fem) last = cty.fem(last);
  return { first, last };
}

// ---- stats helpers ---------------------------------------------------------
// Stat caps rise with each cultivation realm; past the soft cap (70%) gains shrink toward zero.
export const CAPPED = ['strength', 'battle', 'agility', 'smarts', 'charisma', 'luck', 'looks'];
export const statCap = c => REALMS[c.qi.realm].cap || 100;
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
  if (k === 'stress' && d > 0) d *= traitMult(c, 'stressMult');
  if (d > 0 && TRAINABLE.includes(k)) (c.lastTrained ||= {})[k] = c.age; // training resets decay
  c.stats[k] = clamp(Math.round((c.stats[k] ?? 50) + d));
  return c.stats[k];
}
// Charisma (and a few traits) get you better prices from merchants: up to 25% off.
export function discount(c) { return clamp(Math.max(0, (c.stats.charisma - 40) / 240) + (traitMult(c, 'social') > 1 ? 0.03 : 0), 0, 0.25); }
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
export function addItem(c, id, n = 1) { c.inv[id] = (c.inv[id] || 0) + n; if (c.inv[id] <= 0) delete c.inv[id]; }

// ---- new life ----------------------------------------------------------------
export function newLife(opts = {}) {
  const cty = opts.country || weighted(COUNTRIES, () => 1);
  const gender = opts.gender || (chance(0.5) ? 'F' : 'M');
  const wealth = opts.wealth || weighted(WEALTH.map(w => ({ ...w, weight: w.weight * (w.id === 'royal' ? 1 + (META.perks.royal || 0) : 1) })));
  const nm = opts.name || makeName(cty, gender);
  const genes = opts.genes || randomGenes(gender);
  const base = () => ri(20, 80);
  const c = {
    id: uid(), first: nm.first, last: nm.last, gender, country: cty.id, city: pick(cty.city), wealth: wealth.id,
    age: 0, alive: true, birthYear: G.world.year, generation: opts.generation || 1,
    money: 0, fame: 0, genes, hair: null,
    stats: { health: ri(60, 100), happiness: ri(60, 100), mood: ri(55, 85), stress: ri(0, 15), smarts: base(), looks: genes.looks, battle: ri(0, 8),
             strength: ri(10, 40), agility: ri(10, 40), charisma: base(), luck: base() },
    traits: [], qi: { known: false, realm: 0, stage: 1, qi: 0, elem: pick(ELEMENTS).id, affinity: ri(5, 60), meridians: 0, manuals: [], techs: [] },
    inv: {}, edu: { level: 0, school: null, uniYears: 0, major: null, grades: ri(40, 80) },
    job: null, people: [], partnerId: null, log: [], counts: {}, flags: { stageSystem: 5 }, prison: 0,
    assets: [], stocks: 0, wins: 0, kills: 0, gatesCleared: 0, gates: [], sect: null,
    lifespan: ri(68, 92), actions: ACTIONS_PER_YEAR, social: SOCIAL_PER_YEAR, idleYears: 0, heirlooms: opts.heirlooms || [],
  };
  // perks & inheritance
  if (opts.inherit) Object.entries(opts.inherit).forEach(([k, v]) => { c.stats[k] = clamp(Math.round(v)); });
  c.traits = opts.traits || rollBirthTraits(c);
  c.traits.forEach(t => applyTraitMods(c, t));
  if (META.perks.qiborn) c.qi.affinity = clamp(c.qi.affinity + 15 * META.perks.qiborn);
  if (META.perks.wealth) c.money += 500 * META.perks.wealth;
  c.lifespan += traitVal(c, 'life');
  c.money += ri(...wealth.money) * (opts.moneyBonus ? 1 : 1);
  G.char = c;
  familyAtBirth(c, wealth, opts.parents);
  if (opts.inheritMoney) c.money += opts.inheritMoney;
  // birth log
  ensureBody(c); if (opts.heights) c.body.adultHeight = adultHeight(c.country, c.gender, opts.heights);
  beginYear(c);
  geneticCheck(c, true);
  const parents = c.people.filter(p => p.role === 'Father' || p.role === 'Mother');
  ui.log(`I was born a ${gender === 'F' ? 'girl' : 'boy'} in ${c.city}, ${cty.name}, to a ${wealth.name.toLowerCase()} family.`, 'big');
  parents.forEach(p => ui.log(`My ${p.role.toLowerCase()} is ${fullName(p)}, ${p.age}${p.job ? ', a ' + p.job : ''}.`));
  c.traits.forEach(t => ui.log(`Born with trait: ${t}`, 'trait'));
  if (c.traits.includes('reincarnator')) ui.log('Flashes of another life drift behind my eyes...', 'qi');
  if (opts.inheritMoney) ui.log(`I inherited ${fmtMoney(c, opts.inheritMoney)}.`, 'good');
  META.lives++;
  save();
  return c;
}

// Action points grow as you grow up: 4 as a child → 5 at 16 → 6 at 25 → 7 at 35 → 8 at 50. Traits get you there sooner. Cap 8.
export function maxActions(c) { return Math.min(8, ACTIONS_PER_YEAR + [16, 25, 35, 50].filter(a => c.age >= a).length + traitVal(c, 'extraAction')); }
// Social actions: 4 → 5 at 18 → 6 at 30. Cap 6.
export function maxSocial(c) { return Math.min(6, SOCIAL_PER_YEAR + [18, 30].filter(a => c.age >= a).length + traitVal(c, 'extraSocial')); }
export function beginYear(c) {
  c.log.push({ age: c.age, year: G.world.year, lines: [] });
  c.maxActions = maxActions(c); c.qi.medYear = 0; c.qi.fatigue = Math.max(0, (c.qi.fatigue || 0) - 2); c.actions = c.maxActions; c.maxSocial = maxSocial(c); c.social = c.maxSocial; c.usedThisYear = 0;
}

// ---- yearly aging ----------------------------------------------------------
let lastAgeClicks = [];
export async function ageUp() {
  const c = G.char; if (!c || !c.alive) return;
  // GLITCHED: spam detection
  const now = performance.now(); lastAgeClicks = lastAgeClicks.filter(t => now - t < 1000); lastAgeClicks.push(now);
  if (lastAgeClicks.length >= 5) earnTrait(c, 'duplicate');
  c.flags.busyYears = c.actions <= 0 ? (c.flags.busyYears || 0) + 1 : 0;
  if (!c.usedThisYear) { c.idleYears++; if (c.idleYears >= 30) earnTrait(c, 'nobody'); } else c.idleYears = 0;

  c.age++; G.world.year++;
  if (G.world.year % 60 === 0) { G.world.era = pick(ERAS); }
  beginYear(c);
  ui.fx('ageup');

  // prison skips most of life
  if (c.prison > 0) {
    c.prison--; stat(c, 'happiness', -8); stat(c, 'strength', 2);
    ui.log(c.prison ? `Another year behind bars. ${c.prison} to go.` : 'I was released from prison.', c.prison ? 'bad' : 'good');
    if (!c.prison) earnTrait(c, 'jailbird');
  }

  // passive stat drift
  // bodies recover toward a baseline that drops with age; old age wears you down
  const target = c.age < 40 ? 88 : c.age < 60 ? 72 : 58;
  if (c.stats.health < target) stat(c, 'health', c.age < 18 ? ri(2, 6) : ri(1, 4)); else if (c.age > 30) stat(c, 'health', -ri(0, c.age > 65 ? 4 : 2));
  // happiness slowly settles back toward normal
  stat(c, 'happiness', c.stats.happiness < 60 ? ri(1, 4) : c.stats.happiness > 80 ? -ri(0, 2) : 0);
  if (c.qi.realm) stat(c, 'health', c.qi.realm * 2);
  if (traitVal(c, 'heal')) stat(c, 'health', traitVal(c, 'heal'));
  stat(c, 'stress', -ri(2, 6));
  if (c.stats.stress > 75) { stat(c, 'health', -3); stat(c, 'happiness', -5); }
  if (has(c, 'null_ptr')) { const k = pick(STAT_KEYS.filter(k => k !== 'stress')); c.stats[k] = CAPPED.includes(k) ? statCap(c) : 100; ui.log(`ERR 0x${ri(4096, 65535).toString(16)}: ${k} = 100`, 'glitch'); }

  // school / job / money
  educationYear(c);
  if (c.job && !c.prison) {
    const job = CAREERS.find(j => j.id === c.job.id);
    const pay = Math.round(job.pay * country(c).econ * (1 + c.job.years * 0.04) * (job.part ? 0.5 : 1) * traitMult(c, 'pay') * bondBonus(c, 'work'));
    money(c, pay); c.job.years++; c.job.perf = clamp(c.job.perf - ri(0, 6));
    ui.log(`Earned ${fmtMoney(c, pay)} as a ${job.name}.`);
    if (c.job.perf < 15 && chance(0.4)) { ui.log(`I was fired from my job as a ${job.name}.`, 'bad'); c.job = null; }
  }
  if (c.stocks > 0) {
    const r = (rand() * 0.4 - 0.12); const d = Math.round(c.stocks * r); c.stocks += d;
    ui.log(`My investments ${d >= 0 ? 'grew' : 'fell'} by ${fmtMoney(c, Math.abs(d))} (${(r * 100).toFixed(1)}%).`, d >= 0 ? 'good' : 'bad');
  }
  c.assets.forEach(a => { if (a.rent && a.tenant) { money(c, a.rent); } a.value = Math.round(a.value * (a.type === 'car' ? 0.88 : 1 + (rand() * 0.1 - 0.02))); });
  if (c.age >= 18 && c.money < 0) { stat(c, 'stress', 10); ui.log('Debt collectors keep calling.', 'bad'); }
  if (c.age === 18 && !c.flags.leftHome) { c.flags.leftHome = true; const p = c.people.find(p => p.role === 'Mother' || p.role === 'Father'); if (p && chance(0.5) && c.wealth !== 'destitute') { const g = ri(200, 3000); money(c, g); ui.log(`${p.first} gave me ${fmtMoney(c, g)} to start my adult life.`, 'good'); } }

  // gates countdown
  c.gates = c.gates.filter(g => --g.years > 0 || (ui.log(`The ${g.rank}-rank Gate near ${c.city} closed on its own.`), false));

  // necessities & weather
  const T = tierOf(c), B = BIOMES[country(c).biome];
  if (T.scarcity && chance(T.scarcity) && !['wealthy', 'rich', 'royal'].includes(c.wealth) && c.money < 5000 * country(c).econ) {
    const what = pick(['Food ran short this year — I often went to bed hungry.', 'The water was unsafe for months. I got sick from it.', 'Power cuts and empty markets made it a hard year.']);
    stat(c, 'health', -ri(3, 7)); stat(c, 'happiness', -4); ui.log(what, 'bad');
  }
  if (B && chance(0.22)) {
    const [txt, kind] = pick(B.events); const shelter = c.assets.some(a => a.type === 'house') || c.money > 20000 * country(c).econ;
    if (shelter) ui.log(`${txt} I rode it out safely at home.`, 'world');
    else { stat(c, 'health', -ri(2, 6)); stat(c, 'mood', -4); ui.log(`${txt} ${kind === 'cold' ? 'I could barely afford heating.' : kind === 'heat' ? 'I had no way to keep cool.' : kind === 'drought' ? 'We rationed every drop.' : 'Our home was damaged.'}`, 'bad'); }
  }
  // bonds
  const bd = bonds(c);
  if (bd.best) stat(c, 'happiness', 2);
  if (bd.partner) { stat(c, 'happiness', 3); stat(c, 'stress', -3); }
  // your own sect grows and pays tithes
  if (c.ownSect) {
    const o = c.ownSect; const gain = Math.max(0, ri(-1, 3) + Math.floor(c.stats.charisma / 40) + c.qi.realm);
    o.disciples += gain; const tithe = Math.round(o.disciples * 150 * country(c).econ * traitMult(c, 'pay'));
    money(c, tithe); ui.log(`The ${o.name} grew to ${o.disciples} disciples. Tithes: ${fmtMoney(c, tithe)}.`, 'qi');
  }
  yearlyPeople(c);
  bodyYear(c);
  healthYear(c);
  cultivationYear(c);
  await yearlyEvents(c);
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
  if (e.school) { e.grades = clamp(e.grades + ri(-6, 3) + Math.round((c.stats.smarts - 50) / 20)); (c.lastTrained ||= {}).smarts = c.age; } // school keeps your mind in use
}

export function lifespan(c) {
  // cultivation adds lifespan little by little: earlier realms in full, the current realm grows with each stage
  let l = c.lifespan; for (let r = 1; r < c.qi.realm; r++) l += REALMS[r].life;
  const R = REALMS[c.qi.realm]; if (c.qi.realm) l += Math.round(R.life * c.qi.stage / R.stages);
  return Math.round(l);
}
function checkDeath(c) {
  const ls = lifespan(c);
  let cause = null;
  if (c.stats.health <= 0 && c.age < 18 && !c.flags.rescued) { c.flags.rescued = true; c.stats.health = 25; ui.log('I nearly died, but a doctor pulled me back from the edge.', 'bad'); trauma(c, 0.4); }
  if (c.stats.health <= 0) cause = 'my body finally gave out';
  else if (c.age > ls - 8 && chance(0.12 + (c.age - (ls - 8)) * 0.08)) cause = 'I passed peacefully of old age';
  else if (chance(suddenDeathChance(c))) cause = c.conditions?.some(x => ['heart', 'congenital_heart'].includes(x.id)) && chance(0.6) ? 'a sudden heart attack' : pick(['a freak accident', 'a sudden aneurysm', 'a car accident', 'a stray spirit beast', 'a fall down the stairs']);
  if (cause) die(c, cause);
}

export function die(c, cause) {
  if (!c.alive) return;
  c.alive = false; c.cause = cause;
  ui.log(`I died at age ${c.age}: ${cause}.`, 'death');
  if (c.age >= 100 && !c.qi.realm) earnTrait(c, 'centenarian');
  // legacy points
  let pts = Math.round(c.age / 5 + c.qi.realm * 15 + c.gatesCleared * 2 + c.wins / 2 + (c.edu.level * 3) + Math.log10(Math.max(1, c.money + c.stocks)) * 2 + c.traits.length);
  pts = Math.round(pts * tierOf(c).legacy);
  c.legacyEarned = pts; META.legacy += pts; META.bestRealm = Math.max(META.bestRealm, c.qi.realm);
  c.traits.forEach(t => META.unlockedTraits[t] = true);
  ui.fx('death'); save();
}

// Continue as a child: genes mixed from both parents, stats averaged with RNG variance, money & heirlooms inherited.
export function continueAs(childId) {
  const old = G.char; const ch = old.people.find(p => p.id === childId); if (!ch) return null;
  const partner = old.people.find(p => p.id === old.partnerId) || old.people.find(p => p.id === ch.otherParent);
  const inherit = {};
  ['smarts', 'strength', 'agility', 'charisma', 'luck'].forEach(k => {
    const other = partner?.stats?.[k] ?? ri(30, 70);
    inherit[k] = (old.stats[k] + other) / 2 + ri(-15, 15);
  });
  // traits: each parent trait has a chance to pass down (rarer = less likely), plus a fresh roll
  const passed = old.traits.filter(t => !['bloodstained', 'jailbird', 'nobody', 'duplicate', 'centenarian', 'author'].includes(t) && chance(0.35));
  const heir = (old.money + old.stocks + old.assets.reduce((s, a) => s + a.value, 0)) * 0.8;
  G.world.year = old.birthYear + old.age - ch.age;
  const c = newLife({
    country: COUNTRIES.find(x => x.id === old.country), gender: ch.gender, name: { first: ch.first, last: ch.last },
    genes: ch.genes, wealth: WEALTH.find(w => w.id === old.wealth), generation: old.generation + 1,
    inherit, heirlooms: [...old.heirlooms, ...(old.qi.realm >= 2 ? [`${old.first}'s Cultivation Notes`] : [])],
    traits: [...new Set([...passed, ...rollBirthTraits({ traits: [] }).slice(0, 1)])],
    inheritMoney: Math.max(0, Math.round(heir)),
  });
  c.age = ch.age; c.log = []; beginYear(c);
  ui.log(`I am ${fullName(c)}, child of ${fullName(old)}. My parent's story has ended; mine continues.`, 'big');
  if (old.qi.realm >= 1) { c.qi.known = true; c.qi.manuals.push('breathing'); ui.log('I inherited my parent\'s breathing scroll. I know Qi is real.', 'qi'); }
  if (old.traits.includes('centenarian')) stat(c, 'health', 5);
  save(); return c;
}
