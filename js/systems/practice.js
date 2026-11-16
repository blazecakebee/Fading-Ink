// v0.9.8 Practice engine: every training-type action rolls on a 4-tier outcome
// (Peak flow · Solid · Sloppy · Mishap), shaped by an optional micro-minigame, your mastery of that
// activity, fatigue from repeating it this year, and your condition. Mishaps cause real injuries.
import { G } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp } from '../core/rng.js';
import { stat } from './life.js';
import { ensureBody, hitBody } from './body.js';
import { qiCap, method } from './cultivation.js';
export const METHOD_GAME = { basic: 'breath', turtle: 'm_turtle', five_elements: 'm_five', moonlit: 'm_moon', heart_fire: 'm_fire', thunder: 'm_thunder', lotus: 'm_lotus', sword_intent: 'm_sword', starfall: 'm_star', dual: 'm_dual', void: 'm_void', myriad_souls: 'm_souls', blood_sea: 'm_blood' };
export const gameKind = (c, id) => { const P = PRACTICE[id]; return P ? (P.kindFor ? P.kindFor(c) : P.kind) : null; };

// kind = minigame, cat = what goes wrong, risk = base mishap chance
export const PRACTICE = {
  gym:           { kind: 'lift',    cat: 'body',   risk: 0.05 },
  run:           { kind: 'stride',  cat: 'body',   risk: 0.04 },
  sports:        { kind: 'aim',     cat: 'body',   risk: 0.05 },
  martial:       { kind: 'kata',    cat: 'combat', risk: 0.06 },
  combat_drills: { kind: 'react',   cat: 'combat', risk: 0.02 },
  library:       { kind: 'order',   cat: 'mind',   risk: 0.02 },
  study:         { kind: 'focus',   cat: 'mind',   risk: 0.03 },
  work_hard:     { kind: 'stack',   cat: 'mind',   risk: 0.04 },
  meditate:      { kind: 'breath',  cat: 'qi',     risk: 0.04, kindFor: c => METHOD_GAME[method(c).id] || 'breath' }, // v0.9.13 each method has its own game
  meridian:      { kind: 'trace',   cat: 'qi',     risk: 0.08 },
  hike:          { kind: 'balance', cat: 'body',   risk: 0.05 },
  coop_gym:      { kind: 'lift',    cat: 'body',   risk: 0.04, coop: true },   // same as the gym, on purpose
  coop_train:    { kind: 'breath',  cat: 'qi',     risk: 0.05, coop: true },   // same as meditation, on purpose
  // score-only: the game feeds the action's own odds (getting caught, finds, catches, craft quality)
  shoplift:      { kind: 'sneak',   scoreOnly: true },
  pickpocket:    { kind: 'crowd',   scoreOnly: true },
  burglary:      { kind: 'pins',    scoreOnly: true },
  gather:        { kind: 'glint',   scoreOnly: true },
  fishing:       { kind: 'bite',    scoreOnly: true },
  craft:         { kind: 'pour',    scoreOnly: true },
};
export const practiceFor = id => PRACTICE[id] || null;
const TRACK = ['strength', 'agility', 'battle', 'smarts', 'charisma'];

// ---- state: reps this year (fatigue) and lifetime mastery
function repsMap(c) { if (!c.practice || c.practice.year !== G.world.year) c.practice = { year: G.world.year, n: {} }; return c.practice.n; }
export const reps = (c, id) => repsMap(c)[id] || 0;
export const mastery = (c, id) => Math.min(1, (c.counts?.[id] || 0) / 60); // 60 sessions = as easy as it gets
export const masteryLabel = m => m >= 1 ? 'Mastered' : m >= 0.66 ? 'Adept' : m >= 0.33 ? 'Practised' : m > 0 ? 'Novice' : 'New';
export const difficulty = (c, id) => clamp(1 - mastery(c, id) * 0.55, 0.45, 1); // never trivial
export const fatigueMult = (c, id) => Math.pow(0.85, Math.max(0, reps(c, id) - 2));
export function risk(c, id) {
  const P = PRACTICE[id]; if (!P || P.scoreOnly) return 0; const s = c.stats;
  let r = P.risk + 0.035 * Math.max(0, reps(c, id) - 1);
  if (s.health < 40) r += 0.07; else if (s.health < 60) r += 0.03;
  if (s.stress > 70) r += 0.04;
  if ((c.conditions || []).length) r += 0.02;
  if (P.cat === 'qi' && (c.qi.fatigue || 0) > 1) r += 0.03 * c.qi.fatigue;
  return clamp(r - mastery(c, id) * 0.03, 0.01, 0.45);
}

// ---- prose: 8+ lines per tier per kind of training
const PROSE = {
  body: {
    peak: ['Everything clicked. Every rep felt effortless and perfect.', 'You found a rhythm you didn\'t know you had.', 'Your body moved like it had been waiting years for this.', 'A coach across the room stopped to watch.', 'You hit a new personal best and kept going.', 'The burn turned into something like flight.', 'Pure form, start to finish. You\'ll remember this session.', 'For an hour, you were the best version of yourself.'],
    solid: ['A good, honest session.', 'Steady work. Nothing flashy.', 'You left sore in the right places.', 'Clean form, solid effort.', 'You pushed, and your body answered.', 'Sweat, breath, repeat. It\'s working.', 'Another brick in the wall.', 'You went home tired and satisfied.'],
    sloppy: ['Your form fell apart halfway through.', 'You were distracted the whole time.', 'Half-hearted. You knew it, too.', 'Your timing was off all session.', 'You spent more time on your phone than training.', 'Heavy legs, heavy head. Barely worth it.', 'You quit early and felt guilty about it.', 'Going through the motions.'],
    mishap: ['Something twinged — then really hurt.', 'You pushed past the warning signs.', 'A bad landing. You heard it before you felt it.', 'You went too heavy, too fast.', 'Your grip slipped at the worst moment.', 'Fatigue made you careless.', 'You ignored the pain until you couldn\'t.', 'One wrong step and the session was over.'],
  },
  combat: {
    peak: ['You read every strike before it came.', 'Suddenly the patterns made sense — all of them.', 'Your instructor nodded. Just once. It meant everything.', 'You moved before you thought.', 'A flash of insight: you see the gap in every guard now.', 'Your counters landed like they were rehearsed.', 'The fight slowed down around you.', 'You finally understood what your teacher meant.'],
    solid: ['Good drills. Your reactions are sharper.', 'You picked apart a few fights and learned something.', 'Repetition, repetition. It\'s sinking in.', 'You held your own.', 'Steady progress on the fundamentals.', 'Your footwork is cleaner than last time.', 'You caught a few things you\'d been missing.', 'A useful session.'],
    sloppy: ['You kept flinching at the wrong moments.', 'Your guard kept dropping.', 'You were a step behind all day.', 'The footage blurred together. You learned little.', 'You telegraphed everything.', 'Too tired to focus.', 'You got tagged by beginners.', 'Not your day.'],
    mishap: ['You caught a strike you never saw coming.', 'Your partner went harder than you expected.', 'You landed wrong on a throw.', 'A blocked kick jarred your whole leg.', 'You rolled an ankle on a sloppy pivot.', 'An elbow found your ribs.', 'You hit the mat badly.', 'Overconfidence, then the floor.'],
  },
  mind: {
    peak: ['Hours vanished. Everything connected.', 'You understood something you\'ve struggled with for years.', 'The words practically leapt off the page.', 'You filled half a notebook with ideas.', 'A sudden, complete clarity.', 'You saw how it all fits together.', 'Perfect focus. The world went quiet.', 'You walked out feeling smarter. You were.'],
    solid: ['Productive hours.', 'You learned a fair bit.', 'Slow and steady reading.', 'Your notes are getting better.', 'A quiet, useful afternoon.', 'You kept your focus most of the time.', 'Good, ordinary study.', 'You ticked through a few chapters.'],
    sloppy: ['You read the same page six times.', 'Your mind kept wandering.', 'You fell asleep at the desk.', 'Nothing stuck.', 'Too noisy to think.', 'You doodled more than you read.', 'Restless and unfocused.', 'You gave up and went home.'],
    mishap: ['A pounding headache wiped out the day.', 'You stayed up far too late and paid for it.', 'Eye strain turned into a migraine.', 'You spiralled into stress about everything you don\'t know.', 'You burned out halfway through.', 'Your brain simply refused.', 'Anxiety crept in and wouldn\'t leave.', 'A wasted, miserable day.'],
  },
  qi: {
    peak: ['The Qi poured in like a river finding the sea.', 'For a moment you felt the whole world breathing with you.', 'Your dantian blazed with light.', 'Your meridians sang.', 'You sank deeper than ever before — and came back stronger.', 'Heaven and earth answered you today.', 'An insight surfaced from the deep: you understand your path a little more.', 'Your breathing and the world\'s became one.'],
    solid: ['A calm, steady session.', 'The Qi flowed cleanly.', 'Your circulation was smooth.', 'You stayed centred.', 'Quiet progress.', 'Breath in, breath out. It works.', 'Your foundation grows firmer.', 'Patient cultivation.'],
    sloppy: ['Your mind kept drifting.', 'The Qi scattered as fast as you gathered it.', 'You couldn\'t settle.', 'Restless breathing, restless Qi.', 'Noise outside kept breaking your focus.', 'Your circulation stuttered.', 'Half your Qi leaked away.', 'You lost the thread again and again.'],
    mishap: ['The Qi surged against the flow and tore through you.', 'A meridian spasmed. You coughed blood.', 'Your Qi turned wild for a few terrifying breaths.', 'You forced it, and it fought back.', 'Turbulence in the dantian knocked you flat.', 'A backlash left your hands numb for days.', 'The Qi went the wrong way.', 'You pushed past your limit and it bit.'],
  },
};
export const TIER_NAME = { peak: 'Peak flow!', solid: '', sloppy: 'Sloppy.', mishap: 'Mishap!' };

// score: 0..1 from the minigame, or null for Quick Train (stat-based, safe-ish, lower ceiling)
export function rollTier(c, id, score) {
  const m = mastery(c, id), rk = risk(c, id), quick = score == null;
  const s = quick ? clamp(0.4 + Math.random() * 0.3 + m * 0.1, 0, 1) : score;
  const pMis = rk * (quick ? 1.1 : 1.35 - s);
  const pPeak = quick ? 0.02 + m * 0.02 : 0.03 + (s >= 0.85 ? 0.14 : s >= 0.7 ? 0.05 : 0) + m * 0.03;
  const r = Math.random();
  if (r < pMis) return { tier: 'mishap', s };
  if (r < pMis + pPeak) return { tier: 'peak', s };
  if (quick ? Math.random() < 0.2 : s < 0.35) return { tier: 'sloppy', s };
  return { tier: 'solid', s };
}
const MULT = { peak: 2.5, sloppy: 0.45, mishap: 0.2 };
const LBL = { grades: 'Grades', perf: 'Job performance', strength: 'Strength', agility: 'Agility', battle: 'Battle', smarts: 'Smarts', charisma: 'Charisma', qi: 'Qi' };

// Called after the activity ran: scales what it gave you by tier, fatigue and accuracy, and applies mishaps.
export function applyPractice(c, id, snap, roll) {
  const P = PRACTICE[id], { tier, s } = roll, quick = s == null;
  const fat = fatigueMult(c, id), base = tier === 'solid' ? (quick ? 0.9 : 0.75 + s * 0.5) : MULT[tier];
  const mult = base * fat;
  const deltas = [];
  for (const k of TRACK) { const d = c.stats[k] - snap[k]; if (d > 0) { const extra = Math.round(d * (mult - 1)); if (extra) { stat(c, k, extra); deltas.push([k, extra]); } } }
  if (snap.grades != null && c.edu?.grades > snap.grades) { const d = c.edu.grades - snap.grades, extra = Math.round(d * (mult - 1)); c.edu.grades = clamp(c.edu.grades + extra, 0, 100); if (extra) deltas.push(['grades', extra]); }
  if (snap.perf != null && c.job && c.job.perf > snap.perf) { const d = c.job.perf - snap.perf, extra = Math.round(d * (mult - 1)); c.job.perf = clamp(c.job.perf + extra, 0, 100); if (extra) deltas.push(['perf', extra]); }
  if (P.cat === 'qi' && c.qi.qi > snap.qi) { const d = c.qi.qi - snap.qi, extra = Math.round(d * (mult - 1)); c.qi.qi = clamp(c.qi.qi + extra, 0, Math.max(qiCap(c), snap.qi)); if (extra) deltas.push(['qi', extra]); }
  repsMap(c)[id] = reps(c, id) + 1;
  let extraText = '', cls = tier === 'peak' ? 'good' : tier === 'mishap' ? 'bad' : '';
  if (tier === 'mishap') extraText = mishap(c, P);
  if (tier === 'peak' && chance(0.12)) { const k = P.cat === 'qi' ? null : pick(TRACK.slice(0, 3)); if (k) { stat(c, k, 2); deltas.push([k, 2]); } }
  // net result per stat (what the session really gave), shown once
  const net = [...TRACK.map(k => [k, c.stats[k] - snap[k]]), ['qi', P.cat === 'qi' ? Math.round(c.qi.qi - snap.qi) : 0], ['grades', snap.grades != null && c.edu ? c.edu.grades - snap.grades : 0], ['perf', snap.perf != null && c.job ? c.job.perf - snap.perf : 0]];
  const sum = net.filter(([, v]) => v).map(([k, v]) => `${LBL[k]} ${v > 0 ? '+' : ''}${v.toLocaleString()}`).join(', ');
  const prose = pick(PROSE[P.cat][tier]);
  const tag = TIER_NAME[tier];
  const tired = fat < 0.999 ? ` Repeating it this year: gains ×${fat.toFixed(2)}.` : '';
  return { text: `${tag ? tag + ' ' : ''}${prose}${sum ? ` → ${sum}.` : ''}${extraText}${tired}`, cls, big: tier === 'peak', tier };
}
function mishap(c, P) {
  if (P.cat === 'body' || P.cat === 'combat') {
    ensureBody(c); const r = hitBody(c, { amount: ri(10, 22), type: 'blunt', group: pick(['arms', 'legs', 'torso', P.cat === 'combat' ? 'head' : 'legs']), ratio: 1 });
    const hp = ri(3, 8); stat(c, 'health', -hp); stat(c, 'happiness', -3);
    return ` ${r.text ? r.text.charAt(0).toUpperCase() + r.text.slice(1) : 'Injured'}. -${hp} Health.`;
  }
  if (P.cat === 'qi') {
    const lost = Math.round(c.qi.qi * 0.12); c.qi.qi = Math.max(0, c.qi.qi - lost); stat(c, 'health', -ri(3, 7));
    if (chance(0.22) && !(c.conditions || []).some(x => x.id === 'qi_deviation')) { import('./health.js').then(m => m.addCondition(c, 'qi_deviation')); return ` Lost ${lost.toLocaleString()} Qi — and the backlash left Qi Deviation in its wake.`; }
    return ` Lost ${lost.toLocaleString()} Qi to the backlash.`;
  }
  stat(c, 'stress', 8); stat(c, 'happiness', -4); return ' +8 Stress.';
}
