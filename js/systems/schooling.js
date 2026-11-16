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
