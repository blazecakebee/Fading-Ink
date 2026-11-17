// v0.9.21 Social interactions: people can turn you down (tired, busy, not close enough, hate that kind of thing),
// and each interaction plays its own minigame. Your score shapes how it lands. A refusal costs no Social point.
import { G } from '../core/state.js';
import { ri, pick, chance, clamp } from '../core/rng.js';
import { gainClose } from './people.js';
import { tasteOf, ensurePersona } from '../data/personas.js';
import { playTrain } from '../ui/trainGame.js';

export const SOCIAL_GAME = { time: 's_mood', compliment: 's_words', gift: 's_gift', train_together: 's_rope', argue: 's_temper', date: 's_nerve', propose: 's_nerve' };
const PHYSICAL = ['train_together', 'spar_p'];
const KIN = ['Father', 'Mother', 'Son', 'Daughter', 'Brother', 'Sister', 'Spouse', 'Partner'];
const yearCount = (p) => { if (p.socYear !== G.world.year) { p.socYear = G.world.year; p.socN = 0; } return p.socN; };

export function declineChance(c, p, id) {
  if (p.coop || ['divorce', 'argue', 'ask_money'].includes(id)) return 0; // you can always start a fight or a breakup
  let d = 0.06; const n = yearCount(p);
  if (n >= 2) d += 0.14 * (n - 1);                       // they've seen a lot of you this year
  if (p.close < 25) d += 0.25; else if (p.close < 40) d += 0.1; else if (p.close >= 80) d -= 0.04;
  if (tasteOf(p, id) < 0) d += 0.18;                     // they don't like that kind of thing
  if (p.ill) d += 0.15;
  if (PHYSICAL.includes(id) && (p.age >= 65 || p.age < 6)) d += 0.35;
  if (KIN.includes(p.role)) d -= 0.03;
  if (id === 'date' || id === 'propose') return 0;        // those have their own answer
  return clamp(d, 0, 0.75);
}
const REASONS = {
  tired: ['"I\'m exhausted, sorry. Another time?"', '"Not today — it\'s been a long week."', '"I\'m running on fumes. Rain check?"', '"Can we do it next week? I can barely stand."'],
  busy: ['"I\'ve got so much on right now."', '"Sorry, I promised my family I\'d be home."', '"Work is eating me alive this month."'],
  distant: ['"Uh… I don\'t think so."', '"We\'re not really that close, are we?"', '"Maybe some other time." (They clearly meant never.)'],
  dislike: ['"That\'s really not my thing."', '"Honestly? I\'d rather not."', '"You know I hate that."'],
  sick: ['"I\'m sick, you don\'t want this."', '"The doctor told me to rest."'],
  old: ['"My knees aren\'t what they were."', '"At my age? Don\'t be silly."'],
  young: ['"I\'m too little!"'],
};
function reason(c, p, id) {
  if (PHYSICAL.includes(id) && p.age >= 65) return pick(REASONS.old); if (PHYSICAL.includes(id) && p.age < 6) return pick(REASONS.young);
  if (p.ill) return pick(REASONS.sick); if (p.close < 30) return pick(REASONS.distant); if (tasteOf(p, id) < 0) return pick(REASONS.dislike);
  return pick(yearCount(p) >= 2 ? REASONS.tired : [...REASONS.tired, ...REASONS.busy]);
}

// wrap every social action once
export function wrapSocial(list) {
  for (const s of list) {
    if (s._wrapped) continue; s._wrapped = true; const run0 = s.run, game = SOCIAL_GAME[s.id];
    s.run = async (c, p) => {
      if (!p) return run0(c, p);
      if (chance(declineChance(c, p, s.id))) return { text: `${s.emoji || '•'} I asked ${p.first} to ${s.name.toLowerCase()}. ${reason(c, p, s.id)} (no Social spent)`, cls: '', refund: true };
      let score = null;
      if (game) { ensurePersona(p); score = await playTrain(game, 0.75, `${s.name} · ${p.first}`, { name: p.first, likes: p.likes, known: p.known?.includes('likes') || p.close >= 60 }); c._soc = score; }
      let r; try { r = await run0(c, p); } finally { delete c._soc; }
      p.socN = yearCount(p) + 1;
      if (r == null || score == null || p.coop) return r;
      // the minigame colours the outcome on top of what the action already did
      const d = s.id === 'argue' ? Math.round((score - 0.3) * 14) : Math.round((score - 0.45) * 14);
      if (d) gainClose(c, p, d);
      const line = score >= 0.8 ? pick([`It went perfectly.`, `${p.first} lit up.`, `You got it exactly right.`]) : score < 0.3 ? pick([`It came out wrong.`, `${p.first} looked confused.`, `Awkward.`]) : '';
      const tail = line ? ` ${line} (${d > 0 ? '+' : ''}${d})` : '';
      if (typeof r === 'string') return r + tail; if (r.text) return { ...r, text: r.text + tail, cls: score < 0.3 && r.cls !== 'good' ? 'bad' : r.cls }; return r;
    };
  }
}
