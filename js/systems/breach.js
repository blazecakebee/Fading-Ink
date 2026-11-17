// v0.9.4 Gate Breaches: an SSS, X or Z Gate left uncleared until it expires may rupture instead of closing.
// The player must hold the city in a lane-defence battle. Winning pays rare materials and prestige;
// losing costs blood, money, Fame — and sometimes people you love.
import { ui } from '../core/bus.js';
import { ri, pick, chance } from '../core/rng.js';
import { stat, addItem, money, fmtMoney } from './life.js';
import { GATE_RANKS } from '../data/combat.js';
import { addFame, gateFame, dropRelic } from './renown.js';
import { gainHeirloom } from './heirlooms.js';
import { ensureBody, hitBody } from './body.js';
import { grieve } from './people.js';

export const BREACH_RANKS = ['SSS', 'X', 'Z'];
export const BREACH_CHANCE = 0.08; // v0.9.6 rarer: 8% per ignored SSS+ Gate, and never twice within 6 years
export const breachTier = rank => GATE_RANKS.findIndex(r => r.rank === rank);

// called from the yearly Gate countdown for a high Gate that is about to expire
export function maybeBreach(c, g) {
  if (!BREACH_RANKS.includes(g.rank) || c.age < 16 || (c.breaches || []).length || (c.lastBreach != null && c.age - c.lastBreach < 6) || !chance(BREACH_CHANCE)) return false;
  c.lastBreach = c.age;
  (c.breaches ||= []).push(g.rank);
  ui.log(`Nobody cleared the ${g.rank}-rank Gate near ${c.city}. It didn't close. It ruptured.`, 'bad');
  return true;
}

export function breachWon(c, rank, res) {
  const t = breachTier(rank), fame = gateFame(t) * 4, got = [];
  addFame(c, fame, true); c.gatesCleared = (c.gatesCleared || 0) + 1; c.breachesHeld = (c.breachesHeld || 0) + 1;
  const bag = [['dragon_scale', ri(2, 4)], ['spirit_stone', ri(5, 10)], ['beast_core', ri(3, 6)], ['demonic_core', ri(1, 3)]];
  for (const [id, n] of bag) { addItem(c, id, n); got.push(`${n}× ${id.replace('_', ' ')}`); }
  addItem(c, pick(['ascend_pill', 'dao_pill', 'marrow_pill']), 1, 'hi'); got.push('a high-grade pill');
  if (chance(0.4)) got.push(dropRelic(c));
  if (chance(res.leaks === 0 ? 0.2 : 0.1)) gainHeirloom(c, `holding back a ${rank}-rank breach`, chance(0.15) ? 'mythic' : 'legendary');
  const m = Math.round((t + 1) * (t + 1) * 900); money(c, m); got.push(fmtMoney(c, m) + ' from the city');
  stat(c, 'happiness', 10); stat(c, 'stress', 6);
  ui.cinematic?.({ motif: 'mountain', color: GATE_RANKS[t].color, lines: ['The last of them falls at the wall.', 'The city is still standing because you were.'], title: 'Breach held', sub: `${rank}-rank Gate`, sound: 'ascend', hold: 2 });
  ui.log(`I held the ${rank}-rank breach${res.leaks ? '' : ' without losing a single ward'}. Fame +${fame.toLocaleString()}. Spoils: ${got.join(', ')}.`, 'big');
}

export function breachLost(c, rank, res) {
  const t = breachTier(rank), notes = [];
  const dmg = ri(22, 34) + (res.fled ? 0 : 6); stat(c, 'health', -dmg); notes.push(`-${dmg} Health`);
  ensureBody(c); const hit = hitBody(c, { amount: 40 + t * 3, type: pick(['cut', 'blunt', 'burn']), ratio: 2 }); if (hit.text) notes.push(hit.text.toLowerCase());
  const fameLoss = Math.max(0, Math.round((c.fame || 0) * (res.fled ? 0.2 : 0.12))); c.fame = (c.fame || 0) - fameLoss; if (fameLoss) notes.push(`Fame -${fameLoss.toLocaleString()}`);
  const loss = Math.round(Math.max(0, c.money) * 0.15); if (loss) { money(c, -loss); notes.push(`${fmtMoney(c, loss)} in damages`); }
  stat(c, 'stress', 22); stat(c, 'happiness', -18);
  const dead = ri(40, 400) * (t + 1);
  ui.log(`The ${rank}-rank breach overran ${c.city}. ${dead.toLocaleString()} people died${res.fled ? ' — and everyone saw me run' : ''}. ${notes.join(', ')}.`, 'bad');
  const near = (c.people || []).filter(p => p.alive && p.role !== 'Enemy' && !p.player && (p.realm || 0) < 8);
  if (near.length && chance(0.3)) { const p = pick(near); p.alive = false; p.cause = 'killed in the breach';
    const fam = ['Father', 'Mother', 'Brother', 'Sister', 'Spouse', 'Son', 'Daughter'].includes(p.role);
    ui.log(`${p.first}, my ${p.role.toLowerCase()}, was among them.`, 'death'); grieve(c, p, fam); if (p.id === c.partnerId) c.partnerId = null; }
}
