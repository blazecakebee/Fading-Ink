// Martial arts schools with belts, private schools & scholarships, and moving to another country.
import { G } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp } from '../core/rng.js';
import { stat, money, country, fmtMoney, priceFor } from './life.js';
import { COUNTRIES } from '../data/countries.js';
import { addMuscle } from './body.js';
import { traitMult } from './traits.js';

export const ARTS = {
  karate: { name: 'Karate', main: 'strength' }, taekwondo: { name: 'Taekwondo', main: 'agility' }, kungfu: { name: 'Kung Fu', main: 'agility' },
  judo: { name: 'Judo', main: 'strength' }, muaythai: { name: 'Muay Thai', main: 'strength' }, wingchun: { name: 'Wing Chun', main: 'battle' },
};
export const BELTS = ['White', 'Yellow', 'Orange', 'Green', 'Blue', 'Brown', 'Black', 'Black (2nd dan)', 'Black (3rd dan)'];
const NEED = [0, 4, 9, 15, 22, 30, 40, 55, 75];
export const beltOf = xp => BELTS[NEED.filter(n => xp >= n).length - 1];
// Classes cost money, are limited to 2 a year, and gains are modest — belts are the long game.
export const MARTIAL = { id: 'martial', cat: 'training', name: 'Martial arts class', icon: 'fist', minAge: 5, run: async c => {
  c.martial ||= {};
  const fee = priceFor(c, Math.round(25 * country(c).econ));
  if ((c.flags.martialYear?.[G.world.year] || 0) >= 2) { ui.toast?.('The dojo only has room for you twice a year.'); return null; }
  if (c.money < fee) { ui.toast?.(`Classes cost ${fmtMoney(c, fee)}.`); return null; }
  let art = c.martialStyle;
  if (!art || !ARTS[art]) {
    art = await ui.choice({ title: 'Choose a martial art', icon: 'fist', text: `Each school has its own belts. Classes cost ${fmtMoney(c, fee)} each, twice a year at most.`, options: [...Object.entries(ARTS).map(([k, a]) => ({ label: `${a.name}${c.martial[k] ? ` — ${beltOf(c.martial[k])} belt` : ''}`, value: k })), { label: 'Cancel', value: null, ghost: true }] });
    if (!art) return null; c.martialStyle = art;
  }
  const A = ARTS[art]; money(c, -fee); (c.flags.martialYear ||= {})[G.world.year] = (c.flags.martialYear[G.world.year] || 0) + 1;
  const before = beltOf(c.martial[art] || 0); c.martial[art] = (c.martial[art] || 0) + 1; const after = beltOf(c.martial[art]);
  const t = traitMult(c, 'train'); stat(c, A.main, Math.max(1, Math.round(ri(1, 2) * t))); stat(c, 'battle', Math.max(1, Math.round(ri(0, 2) * t))); addMuscle(c, 1);
  let text = `${A.name} class: kata after kata.`;
  if (after !== before) { stat(c, 'battle', 2); stat(c, 'happiness', 6); text += ` I earned my ${after} belt in ${A.name}!`; if (after.startsWith('Black') && !before.startsWith('Black')) ui.cinematic?.({ motif: 'sword', color: '#e9e6df', lines: ['Years of sweat on the dojo floor.', 'Your master ties the black belt himself.'], title: `${A.name} Black Belt`, sub: `${c.first} ${c.last}`, sound: 'milestone' }); }
  return { text, cls: after !== before ? 'good' : '', big: after !== before };
} };
export const SWITCH_ART = { id: 'martial_switch', cat: 'training', name: 'Switch martial art', icon: 'kick', minAge: 5, need: c => !!c.martialStyle, run: c => { const old = c.martialStyle; c.martialStyle = null; return `I stopped practising ${ARTS[old]?.name || 'my old style'} for now. (Belts are kept.)`; } };

// ---- private school & scholarships
export const tuition = c => Math.round(4000 * country(c).econ);
export const PRIVATE = { id: 'private_school', cat: 'school', name: 'Transfer to a private school', icon: 'education', minAge: 6, maxAge: 17, need: c => ['Primary School', 'Secondary School'].includes(c.edu.school) && !c.edu.private, run: async c => {
  const g = Math.max(0, Math.min(4, (c.edu.grades - 50) / 10));
  const sch = g >= 3.5 && c.stats.smarts >= 70;
  const fee = tuition(c);
  const ok = await ui.choice({ title: 'Private school', icon: 'education', text: `Smaller classes, better teachers: +grades and +smarts every year.\nTuition: ${fmtMoney(c, fee)} a year.${sch ? '\n\nYour GPA and smarts earn you a full SCHOLARSHIP — it\'s free!' : '\n(GPA 3.5+ and 70 Smarts would earn a scholarship.)'}`, options: [{ label: sch ? 'Accept the scholarship' : 'Enroll', value: true, disabled: !sch && c.money < fee }, { label: 'Stay where I am', value: false, ghost: true }] });
  if (!ok) return null;
  c.edu.private = true; c.edu.scholarship = sch;
  return { text: sch ? 'I won a scholarship to a private school!' : 'I transferred to a private school.', cls: 'good', big: true };
} };
// called every year
export function schoolYear(c) {
  const e = c.edu;
  if (!e.school) { e.private = false; return; }
  if (e.private) {
    if (!e.scholarship) { const f = tuition(c); if (c.money < f) { e.private = false; ui.log('My family could no longer afford private school. I moved back to a public one.', 'bad'); return; } money(c, -f); }
    e.grades = clamp(e.grades + ri(1, 3)); stat(c, 'smarts', 1);
  }
  // university scholarships: refund part of tuition for excellent students
  if (e.school === 'University' && !e.uniScholar && (e.grades - 50) / 10 >= 3.5 && c.stats.smarts >= 75) { e.uniScholar = true; const r = Math.round(8000 * country(c).econ * 2); money(c, r); ui.log(`My grades won a university scholarship: ${fmtMoney(c, r)} refunded.`, 'good'); }
}

// ---- migration
export const MIGRATE = { id: 'migrate', cat: 'work', name: 'Move to another country', icon: 'travel', minAge: 18, need: c => c.edu.school !== 'University', run: async c => {
  const opts = COUNTRIES.filter(x => x.id !== c.country);
  const cost = x => Math.round(3000 * Math.max(x.econ, country(c).econ));
  const to = await ui.choice({ title: 'Emigrate', icon: 'travel', text: 'Start over somewhere new. Your money comes with you (in the new currency); your partner and young children come too.', options: [...opts.map(x => ({ label: `${x.name} — ${fmtMoney(c, cost(x))}`, value: x.id, disabled: c.money < cost(x) })), { label: 'Stay', value: null, ghost: true }] });
  if (!to) return null;
  const X = COUNTRIES.find(x => x.id === to), was = country(c).name; money(c, -cost(X));
  c.country = X.id; c.city = pick(X.city); c.job = null; c.flags.migrated = (c.flags.migrated || 0) + 1;
  for (const a of c.assets) if (a.type === 'house') { money(c, a.value * 0.9); a.sold = true; } c.assets = c.assets.filter(a => !a.sold);
  stat(c, 'stress', 10); stat(c, 'happiness', 5);
  ui.cinematic?.({ motif: 'mountain', color: '#7fd1ff', lines: [`You leave ${was} behind.`, `${c.city} smells different. Sounds different.`], title: `A new life in ${X.name}`, sub: 'Emigrated', sound: 'milestone' });
  return { text: `I moved from ${was} to ${c.city}, ${X.name}. I sold my home and left my old job behind.`, cls: 'big', big: true };
} };

// ---- childhood activities with real purpose (v0.6.4): each one grows something different
import { makePerson, gainClose } from './people.js';
import { addItem } from './life.js';
const parent = c => c.people.find(p => p.role === 'Mother' && p.alive) || c.people.find(p => p.role === 'Father' && p.alive);
export const CHILDHOOD = [
  { id: 'play_toys', cat: 'childhood', name: 'Play pretend', icon: 'play', minAge: 1, maxAge: 9, run: c => {
      const [t, k] = pick([['I built a fortress out of blocks and planned every tower.', 'smarts'], ['My toy soldiers fought a great war. I was the general.', 'battle'], ['I hosted a tea party for my plushies and gave a speech.', 'charisma'], ['I drew a whole city on the floor in chalk.', 'smarts']]);
      stat(c, 'happiness', ri(3, 6)); stat(c, k, ri(1, 2));
      if (chance(0.04)) { money(c, Math.round(ri(5, 30) * country(c).econ)); return { text: `${t} Under the sofa I found some coins!`, cls: 'good' }; }
      return `${t} (${k === 'battle' ? 'Battle Knowledge' : k[0].toUpperCase() + k.slice(1)} up)`; } },
  { id: 'snowball', cat: 'childhood', name: 'Play outside with the other kids', icon: 'snowball', minAge: 4, maxAge: 13, run: c => {
      stat(c, 'agility', ri(1, 3)); stat(c, 'strength', 1); stat(c, 'happiness', 4);
      const game = pick(['a snowball war', 'tag across the courtyard', 'football in the street', 'hide-and-seek in the market']);
      const pals = c.people.filter(p => p.alive && ['Friend', 'Classmate'].includes(p.role) && Math.abs(p.age - c.age) <= 3);
      if (pals.length && chance(0.6)) { const p = pick(pals); gainClose(c, p, ri(4, 8)); return `I played ${game} with ${p.first}. We're getting closer.`; }
      if (chance(0.35)) { const p = makePerson(c, { role: 'Friend', age: c.age + ri(-1, 1), close: ri(35, 50) }); c.people.push(p); return { text: `I played ${game} and made a new friend: ${p.first}!`, cls: 'good' }; }
      return `I played ${game} until the streetlights came on.`; } },
  { id: 'tantrum', cat: 'childhood', name: 'Help around the house', icon: 'tea', minAge: 4, maxAge: 15, run: c => {
      const p = parent(c); const [t, k] = pick([['I helped cook dinner.', 'smarts'], ['I carried the groceries home.', 'strength'], ['I fixed the wobbly table with Dad\'s tools.', 'smarts'], ['I swept the whole shop front.', 'agility']]);
      stat(c, k, 1); stat(c, 'stress', -2);
      if (p) { gainClose(c, p, ri(3, 6)); if (chance(0.4)) { const m = Math.round(ri(2, 15) * country(c).econ); money(c, m); return `${t} ${p.first} slipped me ${fmtMoney(c, m)} as pocket money.`; } return `${t} ${p.first} looked proud of me.`; }
      return `${t} Nobody saw, but I did it anyway.`; } },
  { id: 'picture_books', cat: 'childhood', name: 'Read picture books', icon: 'study', minAge: 3, maxAge: 9, run: c => {
      const g = ri(1, 3); stat(c, 'smarts', g); c.edu.grades = clamp(c.edu.grades + 1); (c.lastTrained ||= {}).smarts = c.age;
      return pick(['I read about dragons that live in the clouds.', 'I learned the names of every planet.', 'I read a story about a girl who could talk to spirits.', 'I sounded out a whole page by myself!']) + ` (Smarts +${g})`; } },
];
// Watching the clouds slowly attunes a child to Qi (+1 affinity, up to +6), and may reveal it outright.
export function cloudBonus(c) { c.flags.cloudAff ||= 0; if (c.flags.cloudAff < 6 && chance(0.5)) { c.flags.cloudAff++; c.qi.affinity = clamp(c.qi.affinity + 1); return ' The wind felt alive, somehow. (Qi affinity +1)'; } return ''; }
