// v0.8.4 Your character's personality. Born with 1–2; more develop from how you live (or from big events).
// Each has real upsides and/or downsides. Fields plug into the trait/bonus system (traitMult / traitVal).
//  mult fields: train study social pay qi power stressMult heal craft loot crime  ·  add fields: breakthrough refund life
//  mods = one-off stat change when you gain it · year = small change every year · opp = can't coexist
import { pick, chance, ri } from '../core/rng.js';

const T = (id, good, name, desc, o = {}) => ({ id, good, name, desc, ...o });
export const TEMPERS = [
  // ---- 20 good
  T('kind', true, 'Kind', 'People warm to you fast. +12% relationship gains, +2 Happiness a year.', { social: 1.12, year: { happiness: 2 }, opp: ['psychopath', 'cruel', 'cold'], earn: c => (c.counts.soc_gift || 0) + (c.counts.soc_time || 0) >= 20 }),
  T('loyal', true, 'Loyal', 'Your bonds barely fade, and partners and friends trust you. Relationships decay half as fast, +5% relationship gains.', { social: 1.05, opp: ['fickle', 'psychopath'], earn: c => !!c.partnerId && c.age >= 30 }),
  T('brave', true, 'Brave', 'You strike first and don\'t flinch. Act first more often, +5% combat power.', { initiative: 1.2, power: 1.05, opp: ['cowardly'], earn: c => c.wins >= 10 }),
  T('disciplined', true, 'Disciplined', 'Routine is your weapon. +10% training gains, -10% stress build-up.', { train: 1.1, stressMult: 0.9, opp: ['lazy', 'impulsive'], earn: c => (c.counts.gym || 0) + (c.counts.run || 0) >= 25 }),
  T('curious', true, 'Curious', 'You want to know everything. +10% study gains, +10% loot from Gates.', { study: 1.1, loot: 1.1, earn: c => (c.counts.library || 0) + (c.counts.explore_alleys || 0) >= 12 }),
  T('charming', true, 'Charming', 'Doors open for you. +10% relationship gains, +5% salary, +4 Charisma.', { social: 1.1, pay: 1.05, mods: { charisma: 4 }, earn: c => c.stats.charisma >= 75 }),
  T('honest', true, 'Honest', 'People believe you. +6% salary and +6% relationship gains, but crime is much harder.', { pay: 1.06, social: 1.06, crime: 0.6, opp: ['deceitful', 'psychopath'], earn: c => c.age >= 25 && !c.flags.criminal && !(c.counts.shoplift || c.counts.pickpocket || c.counts.burglary) }),
  T('patient', true, 'Patient', 'You wait for the right moment. +4% breakthrough chance, -10% stress build-up.', { breakthrough: 0.04, stressMult: 0.9, opp: ['impulsive', 'hotheaded'], earn: c => (c.counts.meditate || 0) >= 30 }),
  T('optimistic', true, 'Optimistic', 'The glass is half full. +3 Happiness a year, -10% stress build-up.', { stressMult: 0.9, year: { happiness: 3 }, opp: ['melancholic', 'paranoid'] }),
  T('diligent', true, 'Diligent', 'You show up, every day. +10% salary, +5% study gains.', { pay: 1.1, study: 1.05, opp: ['lazy'], earn: c => (c.counts.work_hard || 0) >= 10 }),
  T('wise', true, 'Wise', 'You see the long game. +3% breakthrough chance, +5% study, +5% Qi.', { breakthrough: 0.03, study: 1.05, qi: 1.05, earn: c => c.age >= 60 && c.stats.smarts >= 60 }),
  T('humble', true, 'Humble', 'You learn from everyone. +8% training and study gains.', { train: 1.08, study: 1.08, opp: ['arrogant', 'vain'] }),
  T('resilient', true, 'Resilient', 'You bend, you don\'t break. Heal 20% faster, -15% stress build-up.', { heal: 1.2, stressMult: 0.85, earn: c => !!c.grief || (c.conditions || []).length >= 2 }),
  T('generous', true, 'Generous', 'What goes around comes around. +10% relationship gains, +5% luck with loot.', { social: 1.1, loot: 1.05, opp: ['greedy'], earn: c => (c.counts.soc_gift || 0) >= 12 }),
  T('calm', true, 'Calm', 'Nothing rattles you. -20% stress build-up, +3% breakthrough chance.', { stressMult: 0.8, breakthrough: 0.03, opp: ['hotheaded', 'paranoid'] }),
  T('witty', true, 'Witty', 'Quick tongue, quick mind. +8% relationship gains, +4% study.', { social: 1.08, study: 1.04, mods: { charisma: 2 } }),
  T('focused', true, 'Focused', 'One thing at a time, done perfectly. +12% Qi gain, +5% crafting.', { qi: 1.12, craft: 1.05, opp: ['impulsive'], earn: c => (c.counts.meditate || 0) >= 50 }),
  T('empathetic', true, 'Empathetic', 'You feel what others feel. +12% relationship gains, but grief hits harder.', { social: 1.12, grief: 1.3, opp: ['psychopath', 'cold'] }),
  T('creative', true, 'Creative', 'You see what isn\'t there yet. +12% crafting, +5% salary.', { craft: 1.12, pay: 1.05, earn: c => (c.counts.crafted || 0) >= 15 }),
  T('devout', true, 'Devout', 'Heaven feels close. +4% breakthrough chance, +2 Happiness a year.', { breakthrough: 0.04, year: { happiness: 2 }, opp: ['psychopath'] }),
  // ---- 20 trade-offs (some sweet, some sour)
  T('psychopath', false, 'Psychopath', 'Feelings are for other people. No grief, no guilt from sacrifice, +15% combat power, crime is easy — but people sense it: -25% relationship gains.', { power: 1.15, crime: 1.4, stressMult: 0.7, social: 0.75, grief: 0, opp: ['kind', 'loyal', 'empathetic', 'honest', 'devout'], earn: c => (c.sacrifices || 0) >= 2 || (c.kills || 0) >= 8 }),
  T('eccentric', false, 'Eccentric', 'Brilliant and baffling. +12% study and crafting, -10% relationship gains.', { study: 1.12, craft: 1.12, social: 0.9 }),
  T('naive', false, 'Naive', 'You believe the best of everyone. +8% relationship gains, but -8% salary and -10% Gate loot (people take advantage).', { social: 1.08, pay: 0.92, loot: 0.9, opp: ['paranoid', 'deceitful'] }),
  T('arrogant', false, 'Egregiously Arrogant', 'You are the protagonist and everyone knows it. +10% combat power, -15% relationship gains, -5% training (you think you know it all).', { power: 1.1, social: 0.85, train: 0.95, opp: ['humble'], earn: c => c.qi.realm >= 4 && c.wins >= 20 }),
  T('ruthless', false, 'Ruthless', 'Whatever it takes. +12% salary, crime is easier, -10% relationship gains.', { pay: 1.12, crime: 1.25, social: 0.9, opp: ['kind'], earn: c => (c.counts.burglary || 0) + (c.counts.pickpocket || 0) >= 8 }),
  T('greedy', false, 'Greedy', 'More. Always more. +15% Gate loot, +5% salary, -8% relationship gains, -1 Happiness a year.', { loot: 1.15, pay: 1.05, social: 0.92, year: { happiness: -1 }, opp: ['generous'], earn: c => (c.counts.casino || 0) >= 10 }),
  T('impulsive', false, 'Impulsive', 'Act now, think later. Act first in fights, +5% training, -5% breakthrough chance.', { initiative: 1.25, train: 1.05, breakthrough: -0.05, opp: ['patient', 'disciplined', 'focused'] }),
  T('paranoid', false, 'Paranoid', 'They\'re all out to get you. Act first more often, +5% combat power, +25% stress build-up.', { initiative: 1.2, power: 1.05, stressMult: 1.25, opp: ['naive', 'optimistic', 'calm'] }),
  T('lazy', false, 'Lazy', 'Why stand when you can sit? -10% stress build-up, -12% training and -8% salary.', { stressMult: 0.9, train: 0.88, pay: 0.92, opp: ['disciplined', 'diligent'], earn: c => c.age >= 25 && !c.job && !(c.counts.gym || 0) }),
  T('hotheaded', false, 'Hot-headed', 'Short fuse, big punch. +8% combat power, +20% stress build-up, -5% relationship gains.', { power: 1.08, stressMult: 1.2, social: 0.95, opp: ['calm', 'patient'], earn: c => (c.counts.street_fight || 0) + (c.counts.soc_argue || 0) >= 10 }),
  T('melancholic', false, 'Melancholic', 'Beautiful, sad thoughts. +12% study and Qi gain, -3 Happiness a year.', { study: 1.12, qi: 1.06, year: { happiness: -3 }, opp: ['optimistic'], earn: c => !!c.grief && c.stats.happiness < 35 }),
  T('reckless', false, 'Reckless', 'Danger is a dare. +10% combat power, +10% Gate loot, but heal 15% slower.', { power: 1.1, loot: 1.1, heal: 0.85, opp: ['cowardly'], earn: c => (c.gatesCleared || 0) >= 8 }),
  T('cowardly', false, 'Cowardly', 'You live to run another day. -10% combat power, but heal 15% faster and -10% stress.', { power: 0.9, heal: 1.15, stressMult: 0.9, opp: ['brave', 'reckless'] }),
  T('vain', false, 'Vain', 'Mirror, mirror. +5 Looks, +5% relationship gains, -5% study.', { social: 1.05, study: 0.95, mods: { looks: 5 }, opp: ['humble'], earn: c => (c.counts.salon || 0) >= 6 }),
  T('stubborn', false, 'Stubborn', 'You never give up — or change your mind. +5% breakthrough, -8% study.', { breakthrough: 0.05, study: 0.92 }),
  T('obsessive', false, 'Obsessive', 'One thing, forever. +15% training and crafting, +15% stress build-up.', { train: 1.15, craft: 1.15, stressMult: 1.15, earn: c => Object.values(c.counts || {}).some(n => n >= 60) }),
  T('cold', false, 'Cold', 'You keep everyone at arm\'s length. Grief hurts half as much, -15% stress build-up, -12% relationship gains.', { grief: 0.5, stressMult: 0.85, social: 0.88, opp: ['kind', 'empathetic'] }),
  T('fickle', false, 'Fickle', 'New friends, new hobbies, new everything. +12% relationship gains, but bonds fade twice as fast.', { social: 1.12, opp: ['loyal'] }),
  T('deceitful', false, 'Deceitful', 'A lie for every occasion. Crime is easier, +6% salary, -8% relationship gains.', { crime: 1.3, pay: 1.06, social: 0.92, opp: ['honest', 'naive'] }),
  T('cruel', false, 'Cruel', 'You enjoy it a little too much. +10% combat power, crime is easier, -15% relationship gains, -1 Happiness a year.', { power: 1.1, crime: 1.2, social: 0.85, year: { happiness: -1 }, opp: ['kind', 'empathetic'], earn: c => (c.sacrifices || 0) >= 1 }),
];
export const TEMPER = Object.fromEntries(TEMPERS.map(t => [t.id, t]));
export const MAX_TEMPER = 4;
export const hasTemper = (c, id) => (c?.temper || []).includes(id);
export const temperVal = (c, f, base = 1) => (c?.temper || []).reduce((m, id) => m * (TEMPER[id]?.[f] ?? 1), base);
const clash = (c, t) => (c.temper || []).some(x => t.opp?.includes(x) || TEMPER[x]?.opp?.includes(t.id));

export function gainTemper(c, id, why) {
  const t = TEMPER[id]; c.temper ||= [];
  if (!t || c.temper.includes(id) || clash(c, t)) return false;
  if (c.temper.length >= MAX_TEMPER) { const drop = c.temper.shift(); }
  c.temper.push(id);
  for (const [k, v] of Object.entries(t.mods || {})) c.stats[k] = Math.max(0, (c.stats[k] || 0) + v);
  return t;
}
// born with 1 (60%) or 2 (40%); a mix of good and trade-off
export function rollTemper(c) {
  c.temper = []; const n = chance(0.4) ? 2 : 1;
  for (let i = 0; i < 20 && c.temper.length < n; i++) gainTemper(c, pick(TEMPERS).id);
}
// yearly: small effects, and maybe develop a new trait from how you've been living
export function temperYear(c, ui, stat) {
  if (!c.temper) rollTemper(c);
  for (const id of c.temper) for (const [k, v] of Object.entries(TEMPER[id]?.year || {})) stat(c, k, v);
  if (c.age < 12 || !chance(0.2)) return;
  const cand = TEMPERS.filter(t => t.earn && !c.temper.includes(t.id) && !clash(c, t) && t.earn(c));
  if (!cand.length) return; const t = pick(cand); const had = c.temper.length >= MAX_TEMPER ? TEMPER[c.temper[0]] : null;
  if (gainTemper(c, t.id)) ui.log(`Something in me has changed: I've become ${t.name}.${had ? ` (I'm no longer ${had.name}.)` : ''} ${t.desc}`, t.good ? 'good' : 'bad');
}
