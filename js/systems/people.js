// NPCs: family, friends, classmates, partners, enemies, children.
import { G } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp, uid } from '../core/rng.js';
import { COUNTRIES } from '../data/countries.js';
import { randomGenes, mixGenes } from '../ui/portrait.js';
import { traitMult as _tm } from './traits.js';
import { stat as _stat, addItem as _addItem, money as _money, country as _country, fmtMoney as _fmt } from './life.js';
import { learnMethod, learnManual } from './cultivation.js';
import { known as _known } from './crafting.js';
import { METHODS, MANUALS } from '../data/realms.js';
import { ITEMS, RECIPES } from '../data/items.js';
import { perk as _perk } from '../data/legacyTree.js';

const JOBS = ['teacher', 'factory worker', 'nurse', 'shopkeeper', 'taxi driver', 'accountant', 'farmer', 'chef', 'police officer', 'tea house owner', 'mechanic'];

export function makePerson(c, o = {}) {
  const cty = COUNTRIES.find(x => x.id === (o.country || c.country)) || COUNTRIES[0];
  const gender = o.gender || (chance(0.5) ? 'F' : 'M');
  let last = o.last || pick(cty.last); if (gender === 'F' && cty.fem && !o.last) last = cty.fem(last);
  return {
    id: uid(), first: o.first || pick(gender === 'F' ? cty.f : cty.m), last, gender,
    age: o.age ?? ri(c.age - 2, c.age + 2), role: o.role || 'Acquaintance', alive: true,
    close: o.close ?? ri(20, 60), genes: o.genes || randomGenes(gender), job: o.job || null,
    stats: { smarts: ri(20, 90), strength: ri(15, 80), agility: ri(15, 80), charisma: ri(20, 90), luck: ri(20, 80), looks: 0 },
    realm: o.realm ?? ((o.age ?? 20) >= 16 && chance(0.1) ? ri(1, 2) : 0), hostile: !!o.hostile, met: G.world.year, ...o.extra,
  };
}

export function familyAtBirth(c, wealth, parents) {
  const genes = c.genes;
  if (parents) { parents.forEach(p => c.people.push(p)); }
  else {
    const dad = makePerson(c, { gender: 'M', last: c.last, role: 'Father', age: ri(22, 45), close: ri(40, 95), job: pick(JOBS), genes: mixGenes(genes, randomGenes('M'), 'M') });
    const mom = makePerson(c, { gender: 'F', role: 'Mother', age: ri(20, 42), close: ri(50, 100), job: chance(0.6) ? pick(JOBS) : null, genes: mixGenes(genes, randomGenes('F'), 'F') });
    if (c.country === 'ru') mom.last = c.last + (c.last.endsWith('a') ? '' : 'a'); else if (chance(0.7)) mom.last = c.last;
    c.people.push(dad, mom);
    // destitute kids are sometimes orphaned at birth
    if (wealth.id === 'destitute' && chance(0.35)) { dad.alive = false; if (chance(0.5)) mom.alive = false; c.flags.orphan = true; }
  }
  const sibs = chance(0.55) ? ri(1, 3) : 0;
  for (let i = 0; i < sibs; i++) c.people.push(makePerson(c, { last: c.last, role: chance(0.5) ? 'Brother' : 'Sister', age: ri(1, 9), close: ri(30, 90) }));
  c.people.filter(p => p.role === 'Sister').forEach(p => p.gender = 'F');
  c.people.filter(p => p.role === 'Brother').forEach(p => p.gender = 'M');
}

// Each year: everyone ages, relationships drift, new people appear, some die.
export function yearlyPeople(c) {
  for (const p of c.people) {
    if (!p.alive) continue;
    p.age++;
    if (p.role !== 'Enemy') p.close = clamp(p.close - ri(0, 4));
    const deathChance = p.age > 85 ? 0.25 : p.age > 70 ? 0.06 : p.age > 50 ? 0.01 : 0.002;
    if (chance(deathChance)) {
      p.alive = false;
      const fam = ['Father', 'Mother', 'Brother', 'Sister', 'Spouse', 'Son', 'Daughter'].includes(p.role);
      ui.log(`My ${p.role.toLowerCase()} ${p.first} died at age ${p.age}.`, fam ? 'death' : 'bad');
      if (fam) { c.stats.happiness = clamp(c.stats.happiness - 20); c.stats.mood = clamp((c.stats.mood ?? 60) - 25); if (['Father', 'Mother', 'Spouse', 'Son', 'Daughter'].includes(p.role)) import('./health.js').then(m => m.trauma(c, 0.15)); }
      if (p.id === c.partnerId) c.partnerId = null;
      if (['Father', 'Mother'].includes(p.role) && c.age < 18 && !c.people.some(q => ['Father', 'Mother'].includes(q.role) && q.alive)) c.flags.orphan = true;
    }
  }
  if (c.flags.orphan && !c.flags.orphanLogged) {
    c.flags.orphanLogged = true; ui.log('With no parents left, I was taken in by the city orphanage.', 'bad');
    import('./traits.js').then(m => m.earnTrait(c, 'orphans_grit'));
  }
  // favors from people who love you
  const fans = c.people.filter(p => p.alive && !p.coop && p.role !== 'Enemy' && p.close >= 70);
  for (const p of fans) { if (chance((p.close - 60) / 220)) { const t = favor(c, p); if (t) { ui.log(t, 'good'); break; } } }
  // meet new people at school/work
  if (c.age >= 5 && chance(0.55)) {
    const role = c.edu.school ? 'Classmate' : c.job ? 'Coworker' : 'Acquaintance';
    const p = makePerson(c, { role, age: c.edu.school ? c.age + ri(-1, 1) : ri(Math.max(5, c.age - 8), c.age + 10) });
    c.people.push(p); ui.log(`I met ${p.first} ${p.last}, a ${role.toLowerCase()}.`);
  }
  // keep the list manageable: forget distant acquaintances
  c.people = c.people.filter(p => !(p.role === 'Acquaintance' || p.role === 'Classmate' || p.role === 'Coworker') || p.close > 8 || p.age < 0);
}

export function relLabel(p) {
  if (p.role === 'Enemy') return 'Enemy';
  return p.close > 85 ? 'Inseparable' : p.close > 65 ? 'Close' : p.close > 40 ? 'Friendly' : p.close > 20 ? 'Distant' : 'Strained';
}
export const isFamily = p => ['Father', 'Mother', 'Brother', 'Sister', 'Son', 'Daughter', 'Spouse'].includes(p.role);

// ---- Bonds: a best friend (closeness 80+) and a partner (closeness 50+) give real bonuses.
export function bonds(c) {
  const live = c.people.filter(p => p.alive !== false);
  const best = live.filter(p => ['Friend', 'Co-op Friend', 'Classmate', 'Coworker', 'Brother', 'Sister'].includes(p.role) && p.close >= 80).sort((a, b) => b.close - a.close)[0] || null;
  const partner = live.find(p => p.id === c.partnerId && p.close >= 50) || null;
  return { best, partner };
}
// Multiplier for a kind of gain. Twin Soul / Soulbound traits strengthen bonds.
export function bondBonus(c, kind) {
  const { best, partner } = bonds(c); const k = _tm(c, 'bondMult'); let m = 1;
  if (kind === 'train') { if (best) m += 0.5 * k; if (partner) m += 0.15 * k; }
  if (kind === 'study') { if (best && (best.stats?.smarts ?? 50) > 55) m += 0.3 * k; if (partner) m += 0.1 * k; }
  if (kind === 'qi') { if (partner && (partner.realm || 0) >= 1) m += 0.25 * k; if (best && (best.realm || 0) >= 1) m += 0.1 * k; }
  if (kind === 'work') { if (partner) m += 0.1 * k; if (best && best.role === 'Coworker') m += 0.15 * k; }
  if (kind === 'craft') { if (best) m += 0.05 * k; }
  if (kind === 'breakthrough') { if (partner && (partner.realm || 0) >= 1) m += 0.05 * k; }
  return m;
}
export function bondList(c) {
  const { best, partner } = bonds(c); const k = _tm(c, 'bondMult'); const pct = x => `+${Math.round(x * k * 100)}%`; const out = [];
  if (best) out.push({ who: best, label: 'Best Friend', perks: [`${pct(0.5)} training gains`, (best.stats?.smarts ?? 50) > 55 ? `${pct(0.3)} study gains` : null, (best.realm || 0) >= 1 ? `${pct(0.1)} Qi` : null, `${pct(0.05)} crafting`, '+2 Happiness a year'].filter(Boolean) });
  if (partner) out.push({ who: partner, label: partner.role, perks: [`${pct(0.15)} training`, `${pct(0.1)} salary & study`, (partner.realm || 0) >= 1 ? `${pct(0.25)} Qi (dual cultivation), ${pct(0.05)} breakthrough` : null, '+3 Happiness, -3 Stress a year'].filter(Boolean) });
  return out;
}
// Positive closeness changes scale with Social traits.
export function gainClose(c, p, d) { p.close = clamp(p.close + (d > 0 ? Math.round(d * 1.3 * _tm(c, 'social') * (_perk('m2') ? 1.1 : 1)) : d)); return p.close; }

// People who like you a lot sometimes give you things, teach you skills, recipes, or even cultivation methods.
export function favor(c, p) {
  if (!p.alive || p.role === 'Enemy' || p.coop) return null;
  const opts = [];
  opts.push({ w: 3, f: () => { const pool = ['spirit_herb', 'cloth', 'heal_pill', 'iron_ore', ...(p.realm ? ['qi_pill', 'spirit_stone', 'calm_incense'] : []), ...(p.close > 90 ? ['jade_charm'] : [])];
    const id = pool[ri(0, pool.length - 1)]; _addItem(c, id); return `${p.first} gave me a gift: ${ITEMS[id].name}.`; } });
  if (p.age >= 18 && c.age < 30) opts.push({ w: 2, f: () => { const g = Math.round(ri(20, 300) * _country(c).econ); _money(c, g); return `${p.first} slipped me ${_fmt(c, g)} "for emergencies".`; } });
  const better = ['smarts', 'strength', 'agility', 'charisma'].filter(k => (p.stats?.[k] ?? 0) > c.stats[k]);
  if (better.length) opts.push({ w: 3, f: () => { const k = better[ri(0, better.length - 1)]; const g = ri(2, 5); _stat(c, k, g); return `${p.first} showed me how they do it. ${k[0].toUpperCase() + k.slice(1)} +${g}.`; } });
  const unk = RECIPES.filter(r => !_known(c).includes(r.id) && r.id !== 'r_ink');
  if (unk.length && c.age >= 10) opts.push({ w: 1, f: () => { const r = unk[ri(0, unk.length - 1)]; _known(c).push(r.id); return `${p.first} taught me an old family recipe: ${ITEMS[r.out].name}.`; } });
  if (p.realm >= 1 && c.age >= 8) {
    opts.push({ w: 3, f: () => {
      if (!c.qi.known || !c.qi.manuals.length) { c.qi.known = true; learnManual(c, 'breathing'); return `${p.first} took me aside and showed me something impossible: Qi. They taught me to breathe it in.`; }
      const m = METHODS.filter(x => !x.demonic && !(c.qi.methods || ['basic']).includes(x.id)); if (!m.length) return null;
      const pick = m[ri(0, m.length - 1)]; learnMethod(c, pick.id); return `${p.first} taught me their cultivation method: the ${pick.name}.`; } });
    const techs = MANUALS.filter(x => x.tech && !x.demonic && !c.qi.manuals.includes(x.id));
    if (techs.length && c.qi.realm >= 1) opts.push({ w: 1, f: () => { const t = techs[ri(0, techs.length - 1)]; learnManual(c, t.id); return `${p.first} drilled me in a martial technique until it stuck: ${t.name}.`; } });
  }
  const total = opts.reduce((s, o) => s + o.w, 0); let r = Math.random() * total;
  for (const o of opts) { r -= o.w; if (r <= 0) return o.f(); }
  return null;
}
