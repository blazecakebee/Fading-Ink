// v0.8.4 The forbidden Myriad Souls Refinement: take a life for a surge of Qi. Huge gains, deep mental scars.
import { G } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp } from '../core/rng.js';
import { stat } from './life.js';
import { qiCap } from './cultivation.js';
import { earnTrait } from './traits.js';
import { addCondition } from './health.js';
import { makePerson } from './people.js';
import { gainTemper, hasTemper } from '../data/temper.js';

export const knowsSacrifice = c => (c.qi?.methods || []).includes('myriad_souls');
const FAM = ['Father', 'Mother', 'Brother', 'Sister', 'Spouse', 'Son', 'Daughter', 'Partner'];

export const SACRIFICE = { id: 'blood_sacrifice', cat: 'cultivation', name: 'Blood Sacrifice (Myriad Souls)', icon: 'skull', minAge: 14, need: c => knowsSacrifice(c) && c.qi.realm >= 1 && !c.prison, run: async c => {
  if (c.flags.sacrificeYear === G.world.year) { ui.toast?.('The art needs a year to digest a soul.'); return null; }
  const opts = [{ label: 'A stranger no one will miss', value: 'stranger' }, ...c.people.filter(p => p.alive && !p.coop).sort((a, b) => b.close - a.close).slice(0, 8)
    .map(p => ({ label: `${p.first} ${p.last} (${p.role}, ${p.close}%)${p.realm ? ' · cultivator' : ''}`, value: p.id })), { label: 'No. Not today.', value: null, ghost: true }];
  const v = await ui.choice({ title: 'Myriad Souls Refinement', icon: 'skull', text: 'The scroll is clear: a soul freely given is weak, a soul torn away is strong, and a soul that loved you is strongest of all.\n\nThe Qi will be enormous. So will the cost to your mind.', options: opts });
  if (!v) return null;
  const p = v === 'stranger' ? null : c.people.find(x => x.id === v);
  const loved = p ? p.close / 100 : 0, kin = p && FAM.includes(p.role), cult = p?.realm || 0;
  c.flags.sacrificeYear = G.world.year; c.sacrifices = (c.sacrifices || 0) + 1; c.kills++;
  // the gain: a stranger fills ~35% of your Qi; someone who loved you, or a cultivator, far more
  const mult = 0.35 + loved * 0.5 + (kin ? 0.25 : 0) + cult * 0.08;
  const q = Math.round(qiCap(c) * mult); c.qi.qi = Math.min(Math.round(qiCap(c) * 1.5), c.qi.qi + q);
  c.qi.affinity = clamp(c.qi.affinity + ri(1, 3)); c.flags.soulFed = true; // +breakthrough on the next attempt
  if (p) { p.alive = false; p.cause = 'sacrificed'; }
  // the cost
  const numb = hasTemper(c, 'psychopath');
  let scar = '';
  if (!numb) {
    stat(c, 'stress', 20 + Math.round(loved * 25)); stat(c, 'happiness', -(15 + Math.round(loved * 30)));
    if (chance(0.35 + loved * 0.4)) { addCondition(c, pick(['ptsd', 'depression', 'insomnia', 'anxiety'])); scar = ' Their face follows me into every dream.'; }
  } else stat(c, 'stress', 2);
  earnTrait(c, 'bloodstained');
  if (c.sacrifices >= 3 && !numb && chance(0.35)) { const t = gainTemper(c, pick(['cold', 'cruel', 'psychopath'])); if (t) scar += ` Something in me went quiet for good: I've become ${t.name}.`; }
  // and the world may notice
  let caught = '';
  if (chance(p ? 0.18 + (kin ? 0.12 : 0) : 0.08)) {
    if (c.age >= 18 && chance(0.5)) { c.prison = ri(8, 20); c.flags.prisonEver = true; caught = ` They found the body. I was sentenced to ${c.prison} years.`; }
    else { const e = makePerson(c, { role: 'Enemy', age: ri(25, 60), close: 0, realm: Math.max(1, c.qi.realm), hostile: true }); c.people.push(e); caught = ` Someone saw. ${e.first} ${e.last} has sworn to avenge them.`; }
  }
  ui.cinematic?.({ motif: 'crack', color: '#b0001a', lines: [p ? `${p.first} doesn't understand until the very end.` : 'Nobody hears it happen.', 'The Qi pours in, thick and warm and wrong.'], title: 'Blood Sacrifice', sub: 'Myriad Souls Refinement', sound: 'heavy', hold: 1.6 });
  return { text: `I sacrificed ${p ? `${p.first}, my ${p.role.toLowerCase()},` : 'a stranger'} to the Myriad Souls art. +${q} Qi.${numb ? ' I felt nothing.' : ''}${scar}${caught}`, cls: 'bad', big: true };
} };

// how you find it: a flayed scroll, whispered offers… only the desperate or the dark go looking
export const SACRIFICE_EVENT = { id: 'myriad_scroll', cond: c => c.age >= 16 && c.qi.realm >= 1 && !knowsSacrifice(c) && !c.flags.myriadRefused && ((c.qi.methods || []).includes('blood_sea') || hasTemper(c, 'psychopath') || hasTemper(c, 'cruel') || hasTemper(c, 'ruthless') || c.sect === 'crimson' || chance(0.15)), w: 0.25, run: async c => {
  const v = await ui.choice({ title: 'A scroll bound in skin', icon: 'skull', text: 'Among a dead demonic cultivator\'s things you find a scroll wrapped in something that is not leather.\nIts title: "Myriad Souls Refinement". It promises a cultivator\'s lifetime of Qi for the price of other lives.', options: [{ label: 'Read it', value: true }, { label: 'Burn it', value: false, ghost: true }] });
  if (!v) { c.flags.myriadRefused = true; stat(c, 'happiness', 3); return ui.log('I burned the skin-bound scroll. The smoke smelled sweet.', 'good'); }
  (c.qi.methods ||= ['basic']).push('myriad_souls'); stat(c, 'stress', 8);
  ui.log('I learned the Myriad Souls Refinement — a forbidden art. (New Cultivation action: Blood Sacrifice)', 'qi');
} };
