// v0.9.32 Meridians, reworked.
// - Twelve named meridians, each with its own permanent bonus, grouped into four circuits (complete a circuit for more).
// - Opening is gradual: every attempt adds Channel Progress that is NEVER lost — not on a failed attempt, not on a breakthrough.
//   When the progress bar fills, you choose which meridian bursts open.
// - Breakthroughs widen your channels (free progress), and your realm decides how many meridians your body can hold open.
// - Open meridians matter in battle: more battle Qi, better charging, sharper techniques.
import { ui } from '../core/bus.js';
import { ri, chance, clamp } from '../core/rng.js';
import { stat } from './life.js';
import { traitVal } from './traits.js';

export const MERIDIANS = [
  { id: 'lung', name: 'Lung', circuit: 'handYin', desc: '+6% HP in battle', mods: {} },
  { id: 'pericardium', name: 'Pericardium', circuit: 'handYin', desc: '+25 battle Qi', mods: {} },
  { id: 'heart', name: 'Heart', circuit: 'handYin', desc: '+2% breakthrough chance', mods: { breakthrough: 0.02 } },
  { id: 'large_int', name: 'Large Intestine', circuit: 'handYang', desc: 'Heal 8% faster', mods: { healRate: 1.08 } },
  { id: 'triple_burner', name: 'Triple Burner', circuit: 'handYang', desc: 'Charge Qi draws 20% more and seizes less often', mods: {} },
  { id: 'small_int', name: 'Small Intestine', circuit: 'handYang', desc: 'Stress builds 5% slower', mods: { stressMult: 0.95 } },
  { id: 'stomach', name: 'Stomach', circuit: 'footYang', desc: 'Pills work 8% better', mods: { pill: 1.08 } },
  { id: 'gallbladder', name: 'Gallbladder', circuit: 'footYang', desc: 'Act first more often, +3% critical hits', mods: { initiative: 1.1 } },
  { id: 'bladder', name: 'Bladder', circuit: 'footYang', desc: 'Spirits hurt you 8% less', mods: { spiritBane: 1.08 } },
  { id: 'spleen', name: 'Spleen', circuit: 'footYin', desc: '+6% Qi gain', mods: { qi: 1.06 } },
  { id: 'liver', name: 'Liver', circuit: 'footYin', desc: 'Qi techniques hit 6% harder', mods: {} },
  { id: 'kidney', name: 'Kidney', circuit: 'footYin', desc: '+2 years of life', mods: { life: 2 } },
];
export const MER = Object.fromEntries(MERIDIANS.map(m => [m.id, m]));
export const CIRCUITS = {
  handYin:  { name: 'Hand Yin circuit', desc: '+30 battle Qi, Qi techniques cost 10% less', mods: {} },
  handYang: { name: 'Hand Yang circuit', desc: '+5% combat power', mods: { power: 1.05 } },
  footYang: { name: 'Foot Yang circuit', desc: '+8% training gains', mods: { train: 1.08 } },
  footYin:  { name: 'Foot Yin circuit', desc: '+5% Qi gain, +1 year of life', mods: { qi: 1.05, life: 1 } },
};
export const GRAND = { name: 'Grand Circulation', desc: 'All twelve open: +10% Qi gain, +3% breakthrough chance, meditation tires you less', mods: { qi: 1.1, breakthrough: 0.03 } };
const ORDER = ['lung', 'large_int', 'stomach', 'spleen', 'heart', 'small_int', 'bladder', 'kidney', 'pericardium', 'triple_burner', 'gallbladder', 'liver'];
// how many meridians your realm can hold open
export const MAX_BY_REALM = [0, 3, 5, 7, 9, 11, 12];
export const maxOpen = c => MAX_BY_REALM[Math.min(6, c.qi?.realm || 0)];

export function ensureMer(c) {
  const q = c.qi; q.mer ||= [];
  if ((q.meridians || 0) > q.mer.length) for (const id of ORDER) { if (q.mer.length >= q.meridians) break; if (!q.mer.includes(id)) q.mer.push(id); } // old saves & other sources
  q.meridians = q.mer.length; q.merProg ||= 0; return q.mer;
}
export const has = (c, id) => (c.qi?.mer || []).includes(id);
export const circuitsDone = c => Object.keys(CIRCUITS).filter(k => MERIDIANS.filter(m => m.circuit === k).every(m => has(c, m.id)));
export const need = c => 100 + (c.qi.mer?.length || 0) * 15; // progress needed for the next one
// passive bonuses, fed into the bonus system
export function meridianMods(c) {
  if (c.qi && (c.qi.meridians || 0) > (c.qi.mer?.length || 0)) ensureMer(c);
  if (!c.qi?.mer?.length) return [];
  const out = c.qi.mer.map(id => MER[id]?.mods).filter(Boolean);
  for (const k of circuitsDone(c)) out.push(CIRCUITS[k].mods);
  if (c.qi.mer.length >= 12) out.push(GRAND.mods);
  return out;
}
// battle effects (used by the fight screen)
export function meridianCombat(c) {
  const n = c.qi?.mer?.length || 0, done = circuitsDone(c);
  return {
    qi: n * 5 + (has(c, 'pericardium') ? 25 : 0) + (done.includes('handYin') ? 30 : 0),
    hp: has(c, 'lung') ? 0.06 : 0, charge: has(c, 'triple_burner') ? 1.2 : 1, seize: has(c, 'triple_burner') ? -0.05 : 0,
    crit: has(c, 'gallbladder') ? 0.03 : 0, tech: has(c, 'liver') ? 1.06 : 1, cost: done.includes('handYin') ? 0.9 : 1,
  };
}
// Qi gain from the number of open channels (on top of each meridian's own bonus)
export const flowMult = c => 1 + (c.qi?.mer?.length ?? c.qi?.meridians ?? 0) * 0.05;

export const qiCost = (c, cap) => Math.max(5, Math.round(cap * 0.06));
export function attemptInfo(c, cap) { ensureMer(c); return { need: need(c), prog: c.qi.merProg, open: c.qi.mer.length, max: maxOpen(c), cost: qiCost(c, cap), tired: Math.max(0.4, 1 - 0.15 * (c.qi.merYear || 0)) }; }
// One attempt (an action). The minigame score (c._mg) decides how much progress you make.
export async function work(c, cap) {
  ensureMer(c);
  if (c.qi.mer.length >= 12) return { text: 'All twelve meridians are open. Your Qi runs a Grand Circulation.', cls: 'qi', refund: true };
  if (c.qi.mer.length >= maxOpen(c)) return { text: `My body can't hold more than ${maxOpen(c)} meridians open at this realm. I need to break through first.`, cls: '', refund: true };
  const cost = qiCost(c, cap); if (c.qi.qi < cost) return { text: `I need ${cost} Qi to work on my meridians.`, cls: '', refund: true };
  c.qi.qi -= cost; stat(c, 'health', -ri(1, 4));
  const s = c._mg ?? 0.6, tired = Math.max(0.4, 1 - 0.15 * (c.qi.merYear || 0)); c.qi.merYear = (c.qi.merYear || 0) + 1;
  if (s < 0.2 && chance(0.25)) { const lost = Math.round(c.qi.merProg * 0.15); c.qi.merProg -= lost; if (chance(0.4)) (await import('./health.js')).addCondition(c, 'meridian_block', true);
    return { text: `The Qi slipped its channel and slammed into the wall of the meridian. I lost a little progress (−${lost}).${(c.conditions || []).some(x => x.id === 'meridian_block') ? ' My meridians are BLOCKED — Qi gain halved until healed.' : ''}`, cls: 'bad' }; }
  const gain = Math.max(4, Math.round((20 + (c.qi.affinity || 0) / 5) * (0.5 + s) * tired * (1 + traitVal(c, 'merid') * 2)));
  c.qi.merProg += gain;
  if (c.qi.merProg < need(c)) return { text: `I pushed Qi through a sealed channel. Progress +${gain} (${c.qi.merProg}/${need(c)}). It's giving way.`, cls: 'qi' };
  return openOne(c);
}
// the bar is full: choose which meridian opens
async function openOne(c) {
  const left = MERIDIANS.filter(m => !has(c, m.id));
  const id = ui.choice ? await ui.choice({ title: 'A meridian is ready to open', icon: 'lightning', dismiss: false, text: 'Your Qi presses against every sealed channel at once. Which one do you force open?',
    options: left.map(m => { const circ = MERIDIANS.filter(x => x.circuit === m.circuit), got = circ.filter(x => has(c, x.id)).length;
      return { label: `${m.name} — ${m.desc}${got === 2 ? ` · completes the ${CIRCUITS[m.circuit].name}!` : ''}`, value: m.id }; }) }) : left[0].id;
  const m = MER[id] || left[0]; c.qi.merProg -= need(c); c.qi.mer.push(m.id); c.qi.meridians = c.qi.mer.length;
  ui.fx?.('milestone');
  let extra = '';
  const circ = MERIDIANS.filter(x => x.circuit === m.circuit); if (circ.every(x => has(c, x.id))) extra += ` The ${CIRCUITS[m.circuit].name} is complete: ${CIRCUITS[m.circuit].desc}.`;
  if (c.qi.mer.length >= 12) extra += ` All twelve are open — ${GRAND.name}! ${GRAND.desc}.`;
  return { text: `Agony, then light. My ${m.name} meridian is open (${c.qi.mer.length}/12): ${m.desc}.${extra}`, cls: 'qi', big: !!extra };
}
// a breakthrough widens the channels: free progress, never a reset
export function breakthroughBonus(c, major) {
  ensureMer(c); if (c.qi.mer.length >= 12) return '';
  const g = major ? 60 : 20; c.qi.merProg += g;
  return ` The surge widened my channels (meridian progress +${g}).`;
}
export function yearReset(c) { if (c.qi) c.qi.merYear = 0; }
