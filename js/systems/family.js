// Family life: arguments & disputes, training your children, allowances, and the longevity blessing.
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp } from '../core/rng.js';
import { stat, money, country, fmtMoney, giftToChild } from './life.js';
import { gainClose, isFamily } from './people.js';
import { has } from './traits.js';
import { qiCap } from './cultivation.js';
import { REALMS } from '../data/realms.js';

const isKid = p => ['Son', 'Daughter'].includes(p.role);
export const BLESS_REALM = 6; // Nascent Soul

export const FAMILY_SOCIAL = [
  { id: 'train_child', emoji: '🥋', name: 'Train them yourself', need: (c, p) => isKid(p) && p.age >= 3 && p.age < 18 && c.age >= 18, run: (c, p) => {
      p.stats ||= {}; const k = pick(['smarts', 'strength', 'agility', 'charisma']); const mine = c.stats[k] ?? 50;
      const g = clamp(Math.round(ri(2, 4) + (mine - (p.stats[k] ?? 40)) / 25), 1, 6); p.stats[k] = clamp((p.stats[k] ?? 40) + g);
      p.trained = (p.trained || 0) + 1; gainClose(c, p, 4);
      let t = `I spent the day teaching ${p.first}. Their ${k} improved (+${g}).`;
      if (c.qi.realm >= 1 && p.age >= 6) { p.qiFound = (p.qiFound || 0) + 1; t += ' I guided a thread of Qi through their meridians, laying a foundation.'; }
      return { text: t, cls: 'good' }; } },
  { id: 'allowance', emoji: '💴', name: 'Give an allowance', need: (c, p) => isKid(p) && p.age >= 6, run: (c, p) => {
      const amt = Math.round((p.age < 18 ? 50 : 1000) * country(c).econ * ri(1, 4)); const t = giftToChild(c, p, { money: amt });
      return t ? { text: t + ' (It waits for them if you continue as them.)', cls: 'good' } : null; } },
  { id: 'bless', emoji: '🌸', name: 'Bestow longevity blessing', need: (c, p) => c.qi.realm >= BLESS_REALM && !c.flags.blessedOne && p.alive && (p.id === c.partnerId || isFamily(p)) && !p.blessed, run: async (c, p) => {
      const cost = Math.round(qiCap(c) * 0.6);
      const yes = await ui.choice({ title: 'Longevity Blessing', icon: 'flower', text: `Pour your life force into ${p.first}, slowing their aging for centuries so they can walk your long road with you.\n\nCost: ${cost} Qi and 10 years of your own life. You can only do this for ONE person, ever.`, options: [{ label: 'Bless them', value: true, disabled: c.qi.qi < cost }, { label: 'Not now', value: false, ghost: true }] });
      if (!yes || c.qi.qi < cost) return null;
      c.qi.qi -= cost; c.lifespan -= 10; c.flags.blessedOne = p.id;
      p.blessed = { years: 60 + c.qi.realm * 15, by: c.first }; gainClose(c, p, 20);
      ui.cinematic?.({ motif: 'lotus', color: '#ffb7d0', lines: [`You take ${p.first}'s hands. Something of you flows into them.`, 'Their years slow to match your own — for a while.'], title: 'Longevity Blessing', sub: `${p.first} · +${p.blessed.years} years` });
      return { text: `I bestowed a longevity blessing on ${p.first}. They will stay young far longer (+${p.blessed.years} years).`, cls: 'qi', big: true }; } },
];

// Disputes: family and close friends sometimes clash. Resolve with words (Charisma/Smarts) or fists.
export async function disputeYear(c) {
  if (c.age < 8 || c.prison) return;
  const pool = c.people.filter(p => p.alive && !p.coop && p.role !== 'Enemy' && (isFamily(p) || p.close >= 60) && p.age >= 6);
  if (!pool.length) return;
  const heat = 0.1 * (has(c, 'hothead') ? 1.8 : 1) * (c.stats.stress > 60 ? 1.5 : 1) * (has(c, 'cheerful') ? 0.6 : 1);
  if (!chance(heat)) return;
  const p = pick(pool);
  const topic = pick(isKid(p) && p.age < 18 ? ['their grades', 'curfew', 'the friends they keep', 'chores'] : ['money', 'old grudges', 'how you live your life', 'cultivation and secrets', 'who said what at dinner', 'an inheritance']);
  const words = (c.stats.charisma + c.stats.smarts) / 2;
  const v = await ui.choice({ title: `A fight with ${p.first}`, icon: 'brokenheart', text: `${p.first} (${p.role}) blows up at you about ${topic}.`,
    options: [{ label: `Talk it through calmly (Charisma ${c.stats.charisma})`, value: 'talk' }, { label: `Out-argue them (Smarts ${c.stats.smarts})`, value: 'argue' }, { label: 'Apologise, even if you were right', value: 'sorry' }, { label: 'Let it come to blows', value: 'fight' }] });
  if (v === 'talk') { if (chance(clamp(0.3 + (c.stats.charisma - 40) / 120, 0.2, 0.9))) { gainClose(c, p, 4); stat(c, 'stress', -3); ui.log(`I talked ${p.first} down. We understand each other a little better now.`, 'good'); } else { p.close = clamp(p.close - 6); ui.log(`I tried to stay calm, but ${p.first} stormed off.`, 'bad'); } }
  else if (v === 'argue') { if (chance(clamp(0.25 + (words - 40) / 110, 0.15, 0.9))) { p.close = clamp(p.close - 3); stat(c, 'happiness', 3); ui.log(`I won the argument with ${p.first}. They grudgingly admitted I had a point.`); } else { p.close = clamp(p.close - 10); stat(c, 'happiness', -4); ui.log(`${p.first} tore my arguments apart. That stung.`, 'bad'); } }
  else if (v === 'sorry') { gainClose(c, p, 2); stat(c, 'happiness', -2); ui.log(`I apologised to ${p.first}. Peace, for now.`); }
  else { p.close = clamp(p.close - 25); stat(c, 'health', -ri(2, 6)); stat(c, 'stress', 6); ui.log(`It turned physical with ${p.first}. Nobody won.${p.close < 10 && !isFamily(p) ? ` ${p.first} never spoke to me again.` : ''}`, 'bad'); if (p.close < 10 && !isFamily(p)) p.role = 'Enemy'; }
}
// When you continue as a child, years of personal training carry over.
export function trainedHeir(ch, c) {
  if (ch.trained) { for (const k of ['smarts', 'strength', 'agility', 'charisma']) if (ch.stats?.[k] != null) c.stats[k] = Math.max(c.stats[k], Math.round(ch.stats[k])); }
  if (ch.qiFound) { c.qi.known = true; c.qi.affinity = clamp(c.qi.affinity + Math.min(25, ch.qiFound * 3)); c.qi.meridians = Math.min(12, c.qi.meridians + Math.floor(ch.qiFound / 4)); ui.log(`My parent's patient Qi lessons left their mark: Qi affinity +${Math.min(25, ch.qiFound * 3)}.`, 'qi'); }
}
export const blessName = REALMS[BLESS_REALM].name;
