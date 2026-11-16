// v0.9.19 Workload: everything you commit to (jobs, side gigs, school, running a sect, sect duties, the Guild,
// small children) plus how hard you push your actions adds up. Past what a person can carry, stress builds every
// year — and keeps getting worse the longer you go without a lighter year. Rest actions take load off.
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp } from '../core/rng.js';
import { CAREERS } from '../data/careers.js';

export const CAPACITY = 7; // what an ordinary person carries without strain
// what each action costs you in load (rest is negative)
const ACT_LOAD = { work: 1.3, school: 1.2, training: 1, crime: 1.1, adventure: 0.8, cultivation: 0.6, craft: 0.8, mind: 0.4, leisure: 0.2, love: 0.2, childhood: 0, prison: 0.5 };
const REST = { walk: -1.2, journal: -0.8, vacation: -3, fishing: -1, hike: -0.6, cloud_watch: -0.8, party: -0.4, doctor: -0.3, meditate: -0.3 };
export function actLoad(a) { if (a.cost === 'free') return 0; if (a.cost === 's') return 0.3; return REST[a.id] ?? ACT_LOAD[a.cat] ?? 0.5; }
export function addActLoad(c, a) { c.yearLoad = Math.max(-4, (c.yearLoad || 0) + actLoad(a)); }

// standing commitments: [label, load]
export function commitments(c) {
  const out = [];
  if (c.job && !c.prison) { const J = CAREERS.find(j => j.id === c.job.id); out.push([J?.part ? `Part-time job (${J.name})` : `Full-time job (${J?.name || 'job'})`, J?.part ? 1.5 : 3]); }
  if (c.recurGig && !c.prison) out.push([`Side gig: ${c.recurGig.t}`, 1.5]);
  if (c.edu?.school && c.age >= 6) out.push([c.edu.school, /Univers/i.test(c.edu.school) ? 2.5 : 2]);
  if (c.edu?.school && (c.edu.clubs || []).length) out.push([`School club${c.edu.clubs.length > 1 ? 's' : ''}`, c.edu.clubs.length * 0.8]);
  if (c.ownSect) out.push([`Running ${c.ownSect.name}`, (c.ownSect.disciples || 0) >= 60 ? 3.5 : 2.5]);
  else if (c.sect && c.sect !== 'guest' && (c.sectRank || 0) >= 2) out.push(['Senior sect duties', 1.5]);
  else if (c.sect && c.sect !== 'guest') out.push(['Sect duties', 0.8]);
  if (c.guild) out.push([`Hunter Guild${(c.guild.rank || 0) >= 4 ? ' (high rank)' : ''}`, (c.guild.rank || 0) >= 4 ? 1.5 : 0.8]);
  const kids = (c.people || []).filter(p => (p.role === 'Son' || p.role === 'Daughter') && p.alive && p.age < 12 && (p.livesWith !== false));
  if (kids.length && c.age >= 16) out.push([`Raising ${kids.length} young child${kids.length > 1 ? 'ren' : ''}`, Math.min(3, kids.length * 1)]);
  if ((c.disciples || []).length) out.push([`Teaching ${c.disciples.length} disciple${c.disciples.length > 1 ? 's' : ''}`, Math.min(2, c.disciples.length * 0.5)]);
  if (c.hunt) out.push(['An ongoing Hunt', 1]);
  if (c.addiction) out.push(['Feeding a habit', 1]);
  return out;
}
export const totalLoad = c => commitments(c).reduce((s, [, v]) => s + v, 0) + (c.yearLoad || 0);
export function loadLevel(L) {
  if (L < 4) return { id: 'light', name: 'Light', color: '#5fd38a' };
  if (L < CAPACITY) return { id: 'steady', name: 'Steady', color: '#9ad0ff' };
  if (L < CAPACITY + 4) return { id: 'busy', name: 'Busy', color: '#ffb02e' };
  if (L < CAPACITY + 8) return { id: 'over', name: 'Overloaded', color: '#ff7a3a' };
  return { id: 'crush', name: 'Crushing', color: '#e05555' };
}
// projected stress this year (before personality multipliers, which stat() applies)
export function projected(c) { const over = totalLoad(c) - CAPACITY; return over <= 0 ? 0 : Math.max(1, Math.round(over * 0.9 * (1 + Math.min(1, (c.busyStreak || 0) * 0.15)))); }

// end of the year (called at the very start of ageUp, before the new year resets anything)
export function workloadYear(c, stat) {
  if (!c.alive || c.age < 6) { c.yearLoad = 0; return; }
  const L = totalLoad(c), lv = loadLevel(L), C = commitments(c);
  if (L >= CAPACITY) {
    c.busyStreak = (c.busyStreak || 0) + 1;
    const st0 = c.stats.stress, s0 = projected(c); stat(c, 'stress', s0); const s = Math.max(0, c.stats.stress - st0) || s0; stat(c, 'happiness', -Math.round(s / 3));
    if (lv.id === 'crush') { stat(c, 'health', -ri(2, 5)); if (chance(0.15)) stat(c, 'smarts', -1); }
    const what = C.slice(0, 3).map(([l]) => l.toLowerCase().replace(/ \(.*\)$/, '')).join(', ');
    const line = { busy: [`A busy year${what ? ` — ${what}` : ''}. I felt it in my shoulders.`, 'Too many things, not enough hours.', 'I kept telling myself it would calm down next month.'],
      over: [`Between ${what || 'everything'}, I barely slept this year.`, 'I ate standing up and forgot what weekends were.', 'My calendar had no white space left in it.'],
      crush: [`${what ? what[0].toUpperCase() + what.slice(1) : 'Everything'}… I was holding it all together with tape.`, 'I caught myself crying in the stairwell and didn\'t know why.', 'My body is starting to send bills I can\'t pay.'] }[lv.id] || ['A full year.'];
    ui.log(`${pick(line)} (Workload: ${lv.name}, +${s} Stress${c.busyStreak >= 3 ? `, ${c.busyStreak} hard years in a row` : ''})`, lv.id === 'busy' ? '' : 'bad');
    if (c.busyStreak >= 4 && chance(0.25)) ui.log('People keep telling me I look exhausted.', 'bad');
  } else {
    if (L < 4 && (c.busyStreak || 0) >= 2) ui.log('A lighter year at last. I could finally breathe.', 'good');
    if (L < 4) { stat(c, 'stress', -4); c.busyStreak = 0; } else c.busyStreak = Math.max(0, (c.busyStreak || 0) - 1);
  }
  c.yearLoad = 0;
}
