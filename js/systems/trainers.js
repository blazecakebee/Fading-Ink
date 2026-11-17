// v0.8.0 Trainers are real people: your martial arts master, your Severed Path mentor and your sect master.
// Grow close to them and they may teach you a hidden technique. They age, and they can die.
import { G } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance } from '../core/rng.js';
import { stat, money, fmtMoney, country, priceFor } from './life.js';
import { makePerson, gainClose, grieve } from './people.js';
import { MOVES } from '../data/combat.js';
import { ARTS, beltOf } from './schooling.js';
import { onBodyPath } from './path.js';
import { sectName } from './cultivation.js';
import { perk } from '../data/legacyTree.js';

// Hidden techniques. Martial ones are physical (they fade against high-realm foes, like any punch);
// the Severed one scales with the body; the sect one needs Qi. Each is ~1.5x a Kick — strong, not broken.
export const HIDDEN = {
  karate_ikken:   { art: 'karate', icon: 'fist', name: 'Ikken Hissatsu', cost: 16, dmg: [12, 20], acc: 0.82, stat: 'strength', stun: 0.2, info: 'Hidden Karate: one fist, one kill. May stun.' },
  tkd_tornado:    { art: 'taekwondo', icon: 'kick', name: 'Tornado Kick', cost: 16, dmg: [11, 18], acc: 0.8, stat: 'agility', evade: true, info: 'Hidden Taekwondo: a spinning kick that leaves you hard to hit.' },
  kungfu_crane:   { art: 'kungfu', icon: 'feather', name: 'White Crane Spreads Its Wings', cost: 12, dmg: [9, 15], acc: 0.9, stat: 'agility', evade: true, mom: 2, info: 'Hidden Kung Fu: builds double momentum and slips the next blow.' },
  judo_throw:     { art: 'judo', icon: 'gym', name: 'Mountain Storm Throw', cost: 16, dmg: [11, 17], acc: 0.85, stat: 'strength', stun: 0.35, info: 'Hidden Judo: hurl them down. Often stuns.' },
  muay_elbow:     { art: 'muaythai', icon: 'hammer', name: 'Falling Elbow', cost: 18, dmg: [13, 21], acc: 0.78, stat: 'strength', pierce: true, info: 'Hidden Muay Thai: cuts through any guard.' },
  wingchun_inch:  { art: 'wingchun', icon: 'fist', name: 'One-Inch Punch', cost: 12, dmg: [10, 16], acc: 0.95, stat: 'strength', mom: 2, info: 'Hidden Wing Chun: almost never misses, builds double momentum.' },
  severed_rebound:{ art: 'severed', icon: 'skull', name: 'Hundred-Bone Rebound', cost: 18, dmg: [26, 38], acc: 0.84, stat: 'strength', body: true, stun: 0.2, info: 'Hidden Severed art: take their force into your bones and give it back. May stun.' },
  sect_hidden:    { art: 'sect', icon: 'cultivation', name: 'Inner-Court Palm', cost: 6, qi: 30, dmg: [22, 32], acc: 0.9, stat: 'qi', drain: 0.2, info: 'Your sect\'s hidden art: a palm that steals a little life back.' },
};
Object.assign(MOVES, HIDDEN);
export const hiddenFor = kind => Object.keys(HIDDEN).filter(k => HIDDEN[k].art === kind);
// which hidden moves you can use in a fight
export const myHidden = c => (c.hiddenTechs || []).filter(k => HIDDEN[k] && !(onBodyPath(c) && HIDDEN[k].qi) && !(!onBodyPath(c) && HIDDEN[k].body));

const TITLE = { martial: a => `${ARTS[a]?.name || 'Martial Arts'} Master`, severed: () => 'Severed Path Mentor', sect: () => 'Sect Master' };
export const isTrainer = p => !!p?.trainer;
export const trainerOf = (c, kind, art) => c.people.find(p => p.alive && p.trainer?.kind === kind && (art == null || p.trainer.art === art));

// find your teacher, or — if they're gone — the one who took over
export function ensureTrainer(c, kind, art) {
  let p = trainerOf(c, kind, art); if (p) return p;
  const old = c.people.find(q => !q.alive && q.trainer?.kind === kind && (art == null || q.trainer.art === art));
  p = makePerson(c, { role: TITLE[kind](art), age: ri(48, 74), close: (kind === 'severed' ? 35 : 25) + (perk('m8') ? 25 : 0), realm: kind === 'sect' ? Math.max(3, (c.qi?.realm || 0) + 2) : 0,
    extra: { trainer: { kind, art: art ?? null, since: G.world.year } } });
  p.stats.strength = ri(60, 95); p.stats.agility = ri(55, 90);
  c.people.push(p);
  ui.log(old ? `${old.first}'s senior student, ${p.first} ${p.last}, now teaches in their place.` : `My teacher: ${TITLE[kind](art)} ${p.first} ${p.last}, age ${p.age}. (People tab)`, old ? '' : 'good');
  return p;
}

// can they teach you their hidden art right now?
function readiness(c, p) {
  const t = p.trainer, left = hiddenFor(t.kind === 'martial' ? t.art : t.kind).filter(k => !(c.hiddenTechs || []).includes(k));
  if (t.taught || !left.length) return { ok: false, why: `${p.first} has nothing left to teach you.` };
  if (p.close < 70) return { ok: false, why: `${p.first} doesn't trust you enough yet (closeness 70+).` };
  if (t.kind === 'martial' && (c.martial?.[t.art] || 0) < 30) return { ok: false, why: `"Come back with a Brown belt." (${beltOf(c.martial?.[t.art] || 0)} now)` };
  if (t.kind === 'severed' && (c.bodyPath?.tier || 0) < 3) return { ok: false, why: '"Your bones are still soft. Reach Steel Sinew first."' };
  if (t.kind === 'sect' && ((c.sectRank || 0) < 2 || (c.qi?.realm || 0) < 3)) return { ok: false, why: '"Only inner disciples of Foundation Establishment or above learn this."' };
  return { ok: true, move: left[0] };
}
export const TRAINER_SOCIAL = [
  { id: 'trainer_lesson', emoji: '🥋', name: 'Private lesson', icon: 'gym', age: 6, need: (c, p) => isTrainer(p), run: (c, p) => {
    const fee = priceFor(c, Math.round(40 * country(c).econ)); if (c.money < fee) { ui.toast?.(`A private lesson costs ${fmtMoney(c, fee)}.`); return null; }
    money(c, -fee); gainClose(c, p, ri(4, 9));
    const t = p.trainer; if (t.kind === 'martial') { c.martial ||= {}; c.martial[t.art] = (c.martial[t.art] || 0) + 0.5; stat(c, ARTS[t.art].main, 1); }
    else if (t.kind === 'severed' && c.bodyPath) c.bodyPath.prog = (c.bodyPath.prog || 0) + ri(6, 12);
    else if (t.kind === 'sect') c.qi.qi += ri(10, 25);
    stat(c, 'battle', 1);
    return `${p.first} drilled me one-on-one for ${fmtMoney(c, fee)}. ${pick(['"Again."', '"Slower. Now faster."', '"Better. Not good. Better."', '"Your feet are lying to you."'])}`; } },
  // v0.9.45 each teacher passes on ONE hidden technique, with a cutscene, and then never again
  { id: 'trainer_secret', emoji: '📜', name: 'Ask for a hidden technique', icon: 'manual', age: 10, need: (c, p) => isTrainer(p) && !p.trainer.taught, run: async (c, p) => {
    if (p.trainer.taught) return { text: `${p.first} shook their head. "I gave you the one thing I had. There is nothing more."`, cls: '' };
    const r = readiness(c, p); if (!r.ok) return { text: `I asked ${p.first} about their hidden technique. ${r.why}`, cls: '' };
    if (!chance(0.35 + (p.close - 70) / 60)) { gainClose(c, p, -2); return { text: `${p.first} studied me for a long time. "Not yet." (Try again when you're closer.)`, cls: '' }; }
    (c.hiddenTechs ||= []).push(r.move); p.trainer.taught = r.move; const m = HIDDEN[r.move]; gainClose(c, p, 5);
    await ui.cinematic?.({ keepLines: true, motif: 'sword', color: '#ffd36f', lines: [
      `${p.first} closes the doors and lowers the blinds.`,
      pick(['"I have taught this to three people. Two are dead."', '"My teacher gave this to me on his last night. Now I give it to you."', '"Watch once. I will not show it twice."']),
      `${p.first} moves. The air in the room goes still.`,
      '"That is all of it. Everything I had worth giving. Don\'t ask me again."'], title: m.name, sub: 'Hidden technique', sound: 'milestone', hold: 2 });
    return { text: `${p.first} taught me their hidden technique: ${m.name}! (${m.info}) It's now in my fight moves. They have nothing more to teach me in secret.`, cls: 'big', big: true }; } },
];

// yearly: make sure your current teachers exist, and sometimes the dangerous life catches up with them
export function trainersYear(c) {
  if (c.martialStyle && (c.flags.martialYear?.[G.world.year - 1] || c.flags.martialYear?.[G.world.year])) ensureTrainer(c, 'martial', c.martialStyle);
  if (onBodyPath(c) || (c.flags.severedLore && c.qi?.realm === 0 && c.age >= 12)) ensureTrainer(c, 'severed');
  if (c.sect && c.sect !== 'own' && c.sect !== 'guest') { const p = ensureTrainer(c, 'sect'); p.trainer.sect = sectName(c); }
  for (const p of c.people) if (p.alive && p.trainer && chance(p.trainer.kind === 'martial' ? 0.006 : 0.015)) {
    p.alive = false;
    ui.log(`${p.role} ${p.first} was killed ${pick(p.trainer.kind === 'sect' ? ['in a sect war', 'by a rival elder', 'during a failed breakthrough'] : ['defending the dojo from a gang', 'in a duel of honour', 'by a Qi user who wanted to prove a point'])}.`, 'death');
    grieve(c, p, false);
  }
}
