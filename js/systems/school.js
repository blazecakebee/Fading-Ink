// v0.9.19 School life: harder grades, a teacher, classmates and class rank, clubs, scholarships and a report card.
import { G } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp } from '../core/rng.js';
import { stat, money, fmtMoney, country } from './life.js';
import { makePerson, gainClose } from './people.js';
import { eff } from './body.js';
import { TRADES, MAJORS } from '../data/careers.js';

// grades are 0..100. GPA: 35 → 0.0, 95 → 4.0. A real 4.0 needs near-perfect marks.
export const gpaOf = g => Math.max(0, Math.min(4, (g - 35) / 15));
export const letter = v => v >= 3.85 ? 'A' : v >= 3.5 ? 'A-' : v >= 3.15 ? 'B+' : v >= 2.85 ? 'B' : v >= 2.5 ? 'B-' : v >= 2.15 ? 'C+' : v >= 1.85 ? 'C' : v >= 1 ? 'D' : 'F';
// where your marks naturally settle: brains and focus, not grinding
export const natural = c => clamp(28 + eff(c, 'smarts') * 0.5 + (c.edu.private ? 4 : 0) + (c.edu.teacher?.close >= 70 ? 3 : 0) - (c.stats.stress > 70 ? 6 : 0), 15, 92);
// studying pays less the higher you already are (diminishing returns)
export const studyGain = (c, base) => Math.max(0, Math.round(base * Math.pow(Math.max(0, 1 - c.edu.grades / 104), 1.3) * 1.6));

export const CLUBS = {
  football:   { name: 'Football club', kind: 'Sports', emoji: '⚽', load: 1, minAge: 8, eff: { agility: 2, strength: 1, health: 2, stress: -3 }, risk: 0.08 },
  basketball: { name: 'Basketball club', kind: 'Sports', emoji: '🏀', load: 1, minAge: 8, eff: { agility: 2, strength: 1, health: 2, stress: -3 }, risk: 0.07 },
  track:      { name: 'Track & field', kind: 'Sports', emoji: '🏃', load: 1, minAge: 8, eff: { agility: 3, health: 2, stress: -2 }, risk: 0.05 },
  swimming:   { name: 'Swim team', kind: 'Sports', emoji: '🏊', load: 1, minAge: 7, eff: { agility: 1, strength: 2, health: 3, stress: -2 }, risk: 0.03 },
  outdoor:    { name: 'Outdoor & hiking club', kind: 'Outdoor', emoji: '⛺', load: 0.8, minAge: 9, eff: { health: 2, stress: -4, luck: 1 }, risk: 0.05 },
  scouts:     { name: 'Scouts', kind: 'Outdoor', emoji: '🧭', load: 0.8, minAge: 7, eff: { health: 1, charisma: 1, stress: -3 }, risk: 0.03 },
  chess:      { name: 'Chess club', kind: 'Academic', emoji: '♟️', load: 0.6, minAge: 7, eff: { smarts: 2 }, grades: 2 },
  science:    { name: 'Science club', kind: 'Academic', emoji: '🔬', load: 0.8, minAge: 10, eff: { smarts: 2 }, grades: 3 },
  debate:     { name: 'Debate team', kind: 'Academic', emoji: '🎙️', load: 0.8, minAge: 12, eff: { charisma: 2, smarts: 1 }, grades: 1 },
  drama:      { name: 'Drama club', kind: 'Arts', emoji: '🎭', load: 0.7, minAge: 8, eff: { charisma: 2, happiness: 3 } },
  music:      { name: 'School band', kind: 'Arts', emoji: '🎺', load: 0.7, minAge: 8, eff: { happiness: 4, smarts: 1 } },
  art:        { name: 'Art club', kind: 'Arts', emoji: '🎨', load: 0.5, minAge: 6, eff: { happiness: 4, stress: -2 } },
};
export const MAX_CLUBS = 2;
export const inSchool = c => !!c.edu?.school && !c.prison;

const SUBJ = ['Maths', 'Literature', 'History', 'Physics', 'Chemistry', 'Biology', 'Geography', 'Art', 'Music', 'PE', 'Languages'];
const TEACH = [['strict', 'Strict but fair'], ['kind', 'Warm and patient'], ['bored', 'Clearly counting the days to retirement'], ['brilliant', 'Brilliant, a little scary'], ['eccentric', 'Wildly eccentric']];
export function ensureSchool(c) {
  const e = c.edu; if (!e.school) return;
  if (!e.teacher || e.teacher.school !== e.school) { const p = makePerson(c, { age: ri(27, 60), role: 'Teacher' }); const [k, d] = pick(TEACH);
    e.teacher = { id: p.id, first: p.first, last: p.last, gender: p.gender, subject: pick(SUBJ), style: k, desc: d, close: ri(30, 55), school: e.school }; }
  if (e.cohort !== e.school) { e.cohort = e.school; e.classSize = /Univers|Master|Doctoral|Trade/.test(e.school) ? ri(80, 240) : ri(22, 36); e.records ||= [];
    const have = c.people.filter(p => p.alive && p.role === 'Classmate').length;
    for (let i = have; i < 5; i++) { const p = makePerson(c, { age: c.age + ri(-1, 1), role: 'Classmate', close: ri(15, 50) }); p.grade = clamp(ri(30, 92)); c.people.push(p); } }
  for (const p of c.people) if (p.role === 'Classmate' && p.grade == null) p.grade = clamp(ri(30, 92));
}
export const classmates = c => c.people.filter(p => p.alive && p.role === 'Classmate');
// rank among the whole class: classmates you know + the rest, simulated around a normal curve
export function rank(c) {
  const n = c.edu.classSize || 30, g = c.edu.grades, z = (g - 62) / 14;
  const pct = 1 / (1 + Math.exp(-1.7 * z)); return { n, r: Math.max(1, Math.round((1 - pct) * n) + 1), pct };
}

// once a year, from life.js educationYear
export function schoolLife(c) {
  const e = c.edu; if (!inSchool(c)) { if (!e.school) e.clubs = []; return; }
  higherYear(c); if (!e.school) return;
  ensureSchool(c);
  e.grades = clamp(Math.round(e.grades + (natural(c) - e.grades) * 0.35 + ri(-3, 3))); // marks drift back toward your natural level
  if (e.teacher?.style === 'strict') e.grades = clamp(e.grades - 1); if (e.teacher?.style === 'brilliant' && eff(c, 'smarts') >= 60) e.grades = clamp(e.grades + 1);
  for (const p of classmates(c)) p.grade = clamp((p.grade ?? 60) + ri(-4, 4));
  // clubs
  for (const id of e.clubs || []) { const K = CLUBS[id]; if (!K) continue;
    for (const [k, v] of Object.entries(K.eff)) stat(c, k, v); if (K.grades) e.grades = clamp(e.grades + K.grades);
    if (K.risk && chance(K.risk)) { stat(c, 'health', -ri(4, 9)); ui.log(`${K.emoji} I got hurt at ${K.name.toLowerCase()} practice. ${pick(['Twisted ankle.', 'A ball to the face.', 'Pulled a hamstring.', 'Fell badly.'])}`, 'bad'); }
    else if (chance(0.12)) { const won = chance(0.35 + (K.kind === 'Sports' ? eff(c, 'agility') : eff(c, 'smarts')) / 300); stat(c, 'happiness', won ? 8 : -2);
      ui.log(won ? `${K.emoji} Our ${K.name.toLowerCase()} won the regional championship! I'll never forget it.` : `${K.emoji} We lost the regional final of the ${K.name.toLowerCase()}. So close.`, won ? 'good' : ''); if (won) { (e.awards ||= []).push(`${K.name} champion (age ${c.age})`); c.fame = (c.fame || 0) + 200; } }
    else if (chance(0.25)) { const pal = pick(classmates(c)); if (pal) { gainClose(c, pal, ri(3, 7)); ui.log(`${K.emoji} ${pal.first} and I got closer at ${K.name.toLowerCase()}.`); } } }
  // awards for top students
  const R = rank(c); if (R.r <= 3 && chance(0.5)) { (e.awards ||= []).push(`${R.r === 1 ? 'Top of the class' : `#${R.r} in class`} (age ${c.age})`); ui.log(R.r === 1 ? 'I finished the year top of my class.' : `I finished #${R.r} in my class.`, 'good'); }
  (e.records ||= []).push({ age: c.age, school: e.school, gpa: +gpaOf(e.grades).toFixed(2), rank: R.r, of: R.n });
  if (e.records.length > 30) e.records.shift();
}

// actions from the Education tab
export function askTeacher(c) {
  ensureSchool(c); const T = c.edu.teacher, mood = { strict: 0.8, kind: 1.3, bored: 0.5, brilliant: 1.1, eccentric: chance(0.5) ? 1.6 : 0.4 }[T.style] || 1;
  const g = Math.max(1, Math.round(studyGain(c, ri(3, 6)) * mood)); c.edu.grades = clamp(c.edu.grades + g); T.close = clamp(T.close + ri(4, 9)); stat(c, 'smarts', 1);
  return { text: `${T.desc.startsWith('Clearly') ? `${T.first} sighed but went over it with me` : `${T.title || (T.gender === 'F' ? 'Ms' : 'Mr')} ${T.last} stayed after class to help me`} with ${T.subject}. Grades +${g}.`, cls: 'good' };
}
export function joinClub(c, id) { const K = CLUBS[id]; c.edu.clubs ||= []; if (c.edu.clubs.includes(id) || c.edu.clubs.length >= MAX_CLUBS) return null; c.edu.clubs.push(id); stat(c, 'happiness', 3); return { text: `${K.emoji} I joined the ${K.name.toLowerCase()}.`, cls: 'good' }; }
export function leaveClub(c, id) { c.edu.clubs = (c.edu.clubs || []).filter(x => x !== id); }
// scholarship: GPA, smarts, clubs and awards all count; one try a year
export function scholarshipOdds(c) { const e = c.edu, g = gpaOf(e.grades); return clamp(-0.55 + g * 0.22 + eff(c, 'smarts') / 400 + (e.clubs || []).length * 0.05 + Math.min(3, (e.awards || []).length) * 0.04 + (['destitute', 'poor'].includes(c.wealth) ? 0.06 : 0), 0.01, 0.85); }
export function applyScholarship(c) {
  const e = c.edu; if (e.schYear === G.world.year) return { text: 'The scholarship board only reviews one application a year.', cls: '' }; e.schYear = G.world.year;
  const p = scholarshipOdds(c);
  if (chance(p)) { e.scholarship = true; const m = Math.round((/Univers/.test(e.school || '') ? 9000 : 2500) * country(c).econ); money(c, m); stat(c, 'happiness', 8); (e.awards ||= []).push(`Scholarship (age ${c.age})`);
    return { text: `I won a scholarship! ${fmtMoney(c, m)} towards my studies, and my name on the honour board. (${Math.round(p * 100)}%)`, cls: 'good', big: true }; }
  return { text: `My scholarship application was turned down. ${pick(['They wanted higher marks.', 'Hundreds applied for three places.', 'Maybe next year.'])} (${Math.round(p * 100)}%)`, cls: 'bad' };
}

// ---------- v0.9.21 higher education & trade school
export const HIGHER = /Univers|Master|Doctoral|Trade School/;
export const GRAD = {
  id: 'grad_school', cat: 'school', name: "Apply for a master's degree", icon: 'education', minAge: 21, maxAge: 65, need: c => c.edu.level === 2 && !c.edu.school, run: async c => {
    const g = gpaOf(c.edu.grades); if (g < 2.8 || eff(c, 'smarts') < 55) return { text: `My master's application was rejected (they wanted a GPA of 2.8+; mine was ${g.toFixed(2)}).`, cls: 'bad' };
    const major = await ui.choice({ title: "Master's programme", icon: 'education', text: `Accepted! Two years. Continue in ${c.edu.major}, or switch field?`, options: [{ label: `Continue in ${c.edu.major}`, value: c.edu.major }, ...MAJORS.filter(m => m !== c.edu.major).map(m => ({ label: m, value: m }))] });
    if (!major) return null; const fee = Math.round(12000 * country(c).econ); money(c, -fee * 2);
    Object.assign(c.edu, { school: "Master's Program", gradMajor: major, gradYears: 0, grades: Math.max(45, c.edu.grades - 8) });
    return { text: `I started a master's in ${major}. (Tuition ${fmtMoney(c, fee * 2)}${c.money < 0 ? ' — more student loans' : ''})`, cls: 'good', big: true }; } };
export const PHD = {
  id: 'phd', cat: 'school', name: 'Apply for a doctorate (PhD)', icon: 'study', minAge: 23, maxAge: 65, need: c => c.edu.level === 3 && !c.edu.school, run: async c => {
    const g = gpaOf(c.edu.grades); if (g < 3.3 || eff(c, 'smarts') < 70) return { text: `My PhD application was rejected (GPA 3.3+ and real brilliance needed; mine was ${g.toFixed(2)}).`, cls: 'bad' };
    if (!chance(0.6)) return { text: 'No professor had funding to take me on this year.', cls: 'bad' };
    Object.assign(c.edu, { school: 'Doctoral Program', phdYears: 0, grades: Math.max(45, c.edu.grades - 10) });
    return { text: `I was accepted into a fully funded PhD in ${c.edu.gradMajor || c.edu.major}. Four years of research ahead.`, cls: 'good', big: true }; } };
export const TRADE = {
  id: 'trade_school', cat: 'school', name: 'Enrol in trade school', icon: 'hammer', minAge: 16, maxAge: 70, need: c => !c.edu.school && c.age >= 16, run: async c => {
    const have = c.edu.trades || [];
    const t = await ui.choice({ title: 'Trade school', icon: 'hammer', text: 'Two years of hands-on training for a certificate. Electricians, plumbers, mechanics and chefs need one; pilots need Aviation.', options: [...Object.entries(TRADES).filter(([k]) => !have.includes(k)).map(([k, f]) => ({ label: `${k} · ${fmtMoney(c, f * country(c).econ)}`, value: k, disabled: c.money < f * country(c).econ * 0.5 })), { label: 'Never mind', value: null, ghost: true }] });
    if (!t) return null; const fee = Math.round(TRADES[t] * country(c).econ); money(c, -fee);
    Object.assign(c.edu, { school: 'Trade School', tradeField: t, tradeYears: 0 });
    return { text: `I enrolled in trade school for ${t}. (${fmtMoney(c, fee)})`, cls: 'good' }; } };
// progression, called each year from schoolLife
function higherYear(c) {
  const e = c.edu;
  if (e.school === "Master's Program" && ++e.gradYears >= 2) { if (gpaOf(e.grades) >= 2) { e.level = 3; ui.log(`I earned my master's degree in ${e.gradMajor}!`, 'big'); ui.fx?.('milestone'); } else ui.log('I failed my master\'s thesis defence. Two years, and nothing to show for it.', 'bad'); e.school = null; }
  else if (e.school === 'Doctoral Program') { money(c, Math.round(9000 * country(c).econ)); if (++e.phdYears >= 4) { if (gpaOf(e.grades) >= 2.5 || chance(0.5)) { e.level = 4; ui.log(`I defended my thesis. I'm Dr. ${c.last} now!`, 'big'); ui.fx?.('milestone'); } else ui.log('My committee rejected my thesis. I left without the doctorate.', 'bad'); e.school = null; } }
  else if (e.school === 'Trade School' && ++e.tradeYears >= 2) { (e.trades ||= []).push(e.tradeField); ui.log(`I got my ${e.tradeField} certificate.`, 'good'); e.school = null; }
}
