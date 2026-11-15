// NPCs: family, friends, classmates, partners, enemies, children.
import { G } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp, uid } from '../core/rng.js';
import { COUNTRIES } from '../data/countries.js';
import { randomGenes, mixGenes } from '../ui/portrait.js';

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
    realm: o.realm || 0, hostile: !!o.hostile, met: G.world.year, ...o.extra,
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
      if (fam) c.stats.happiness = clamp(c.stats.happiness - 20);
      if (p.id === c.partnerId) c.partnerId = null;
      if (['Father', 'Mother'].includes(p.role) && c.age < 18 && !c.people.some(q => ['Father', 'Mother'].includes(q.role) && q.alive)) c.flags.orphan = true;
    }
  }
  if (c.flags.orphan && !c.flags.orphanLogged) {
    c.flags.orphanLogged = true; ui.log('With no parents left, I was taken in by the city orphanage.', 'bad');
    import('./traits.js').then(m => m.earnTrait(c, 'orphans_grit'));
  }
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
