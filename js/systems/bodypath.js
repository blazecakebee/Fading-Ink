// The Severed Path (body cultivation without Qi): rejecting Qi, tempering, trials and yearly upkeep.
import { G } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp } from '../core/rng.js';
import { stat, addItem } from './life.js';
import { BODY_TIERS } from '../data/bodypath.js';
import { ENEMIES } from '../data/combat.js';
import { onBodyPath, bodyTier, knowsSevered } from './path.js';
import { addMuscle } from './body.js';
import { traitMult } from './traits.js';

const T = c => c.bodyPath.tier || 0;
export function startPath(c, why) {
  c.path = 'body'; c.bodyPath = { v2: true, tier: 0, prog: why === 'born' ? 30 : 0, wins: c.wins, gates: c.gatesCleared, since: c.age };
  c.conditions = (c.conditions || []).filter(x => !['qi_deviation', 'corruption', 'meridian_block'].includes(x.id));
  Object.assign(c.qi, { known: false, realm: 0, stage: 1, qi: 0, manuals: [], techs: [], methods: ['basic'], meridians: 0 });
}
export const REJECT = { id: 'reject_qi', cat: 'mind', name: 'Reject your Qi forever (Severed Path)', icon: 'skull', minAge: 12, need: c => !onBodyPath(c) && c.qi.realm === 0 && knowsSevered(c), run: async c => {
  const ok = await ui.choice({ title: 'The Severed Path', icon: 'skull', text: `Cut every thread of Qi from your body — forever.\n\n• You can never cultivate Qi — no realms, Qi arts or methods, ever. There is no going back.\n• In return your body has no ceiling: temper it through nine tiers until it rivals Nascent Souls and beyond.\n• Qi users cannot sense you or press you down with their presence, and your strikes hit them harder.\n• But your lifespan will be far shorter than a cultivator's.`,
    options: [{ label: 'Sever it all', value: true }, { label: 'Not yet', value: false, ghost: true }] });
  if (!ok) return null;
  const hadSect = c.sect && !['own', 'iron'].includes(c.sect);
  startPath(c, 'chosen'); if (hadSect) { c.flags.exiled ||= {}; c.sect = null; c.sectRank = 0; }
  stat(c, 'health', -15); stat(c, 'strength', 5);
  ui.cinematic?.({ motif: 'crack', color: '#d9a36a', lines: ['You find the warm thread in your belly — and tear it out.', 'The world goes quiet. Your body has never felt louder.'], title: 'The Severed Path', sub: 'Qi rejected', sound: 'heavy' });
  return { text: `I severed my Qi forever. From now on, my body is my only weapon.${hadSect ? ' My sect had no place for someone like me any more.' : ''}`, cls: 'big', big: true };
} };
const gain = (c, a, b) => Math.max(1, Math.round(ri(a, b) * traitMult(c, 'train') * (1 + (c.stats.health - 60) / 200)));
function addProg(c, n) { c.bodyPath.prog = (c.bodyPath.prog || 0) + n; return n; }
export const BODY_ACTS = [
  { id: 'body_condition', cat: 'training', name: 'Brutal conditioning (Severed)', icon: 'gym', minAge: 12, need: onBodyPath, run: c => {
      const p = addProg(c, gain(c, 10, 16)); stat(c, 'strength', ri(1, 2)); stat(c, 'health', -ri(1, 4)); addMuscle(c, ri(1, 2));
      return `I trained until my muscles tore and knitted back stronger. Tempering +${p}.`; } },
  { id: 'body_endure', cat: 'training', name: 'Endurance ordeal (Severed)', icon: 'snowball', minAge: 12, need: onBodyPath, run: c => {
      const ord = pick(['stood under a freezing waterfall for an hour', 'ran up the mountain carrying stones', 'held a horse stance from dawn to dusk', 'swam against the river current until dark']);
      const p = addProg(c, gain(c, 8, 13)); stat(c, 'agility', ri(1, 2)); stat(c, 'stress', -3);
      return `I ${ord}. Tempering +${p}.`; } },
  { id: 'body_hunt', cat: 'training', name: 'Hunt spirit beasts barehanded (Severed)', icon: 'claw', minAge: 14, need: onBodyPath, run: async c => {
      const id = pick(['spirit_wolf', 'tiger_beast', 'stone_golem']), e = ENEMIES.find(x => x.id === id);
      const r = await ui.fight({ ...e, realm: bodyTier(c).eq, name: `${e.name} (barehanded)` });
      if (r !== 'win') return { text: 'The beast got the better of me. I limped home.', cls: 'bad' };
      c.wins++; const p = addProg(c, gain(c, 22, 32)); if (chance(0.3)) addItem(c, 'beast_core');
      return { text: `I killed a spirit beast with my bare hands. Tempering +${p}.`, cls: 'good' }; } },
  { id: 'body_trial', cat: 'training', name: 'Face your Body Trial (Severed)', icon: 'trophy', minAge: 12, need: c => onBodyPath(c) && T(c) < BODY_TIERS.length - 1 && c.bodyPath.prog >= bodyTier(c).need, run: async c => {
      const next = BODY_TIERS[T(c) + 1];
      const e = ENEMIES.find(x => x.id === ['stone_golem', 'tiger_beast', 'yaoguai', 'yaoguai', 'young_dragon', 'sword_saint', 'void_wraith', 'heavenly_demon', 'ancient_qilin', 'ancient_qilin', 'fallen_immortal', 'fallen_immortal', 'fallen_immortal'][T(c)]) || ENEMIES[1];
      ui.log(`My body screams that it is ready. I seek out a ${e.name} to test it.`, 'qi');
      let def = { ...e, realm: next.eq, name: `Trial · ${e.name}` };
      if (ui.bossPhase) def = await ui.bossPhase(c, def, e, T(c) >= 5);
      const r = await ui.fight(def, { noFlee: true });
      if (r !== 'win') { c.bodyPath.prog = Math.round(c.bodyPath.prog * 0.7); stat(c, 'health', -20); return { text: `I failed my Body Trial. My body is not yet ${next.name}.`, cls: 'bad' }; }
      c.wins++; c.bodyPath.tier++; c.bodyPath.prog = 0;
      stat(c, 'strength', 6); stat(c, 'agility', 4); stat(c, 'battle', 3); stat(c, 'health', 25); addMuscle(c, 4);
      ui.cinematic?.({ motif: 'glyph', glyph: next.glyph, color: next.color, lines: ['No Qi. No heaven\'s blessing. Only you.', next.eq >= 6 ? 'Cultivators who once looked down on you now look away.' : 'Your body breaks its old limits.'], title: next.name, sub: 'The Severed Path', sound: 'ascend', hold: 2 });
      return { text: `BODY TRIAL PASSED! My body has become ${next.name}. (Counts as ${next.eq ? 'a realm ' + next.eq + ' cultivator' : 'mortal'} in a fight.)`, cls: 'big', big: true }; } },
];
// saves from before v0.7.8: the old top tier (9) is now tier 12
export function migrateBody(c) { if (c.bodyPath && !c.bodyPath.v2) { if (c.bodyPath.tier >= 9) c.bodyPath.tier = 12; c.bodyPath.v2 = true; } }
// yearly: fights and Gates temper you too; the body heals like a beast's; Qi stays severed
export function bodyYear(c) {
  if (!onBodyPath(c)) return;
  const b = c.bodyPath; const dw = Math.max(0, c.wins - (b.wins ?? c.wins)), dg = Math.max(0, c.gatesCleared - (b.gates ?? c.gatesCleared));
  if (dw || dg) { const p = addProg(c, dw * 6 + dg * 20); ui.log(`Every fight hardened me further (Tempering +${p}).`); }
  b.wins = c.wins; b.gates = c.gatesCleared;
  if (b.tier) stat(c, 'health', b.tier * 2);
  c.qi.known = false; c.qi.realm = 0; c.qi.qi = 0;
  if (b.prog >= bodyTier(c).need && b.tier < BODY_TIERS.length - 1 && !b.readyNoted) { b.readyNoted = b.tier; ui.log('My body is ready for its next Trial (Training activities).', 'qi'); }
  if (b.readyNoted !== undefined && b.readyNoted !== b.tier) delete b.readyNoted;
}

// ---- how you first hear of the Severed Path (it has to be learned from someone)
export const SEVERED_EVENTS = [
  { id: 'severed_wanderer', cond: c => c.age >= 10 && c.age <= 35 && c.qi.realm === 0 && !knowsSevered(c), w: 0.3, run: async c => {
      const v = await ui.choice({ title: 'The Man Without Qi', icon: 'fist', text: 'In a back-alley fight pit, a scarred mortal breaks a Qi Condensation cultivator\'s arm with his bare hand. Afterwards he notices you staring.\n"They can\'t feel me coming. I tore the Qi out of myself years ago. Want to know how?"', options: [{ label: 'Listen to him', value: true }, { label: 'Walk away', value: false, ghost: true }] });
      if (!v) return ui.log('I walked away from the man without Qi. Some doors only open once.');
      c.flags.severedLore = 'wanderer'; ui.log('The scarred man told me of the Severed Path: reject Qi forever, and temper the body until it rivals cultivators. (Severed Path tab)', 'qi'); } },
  { id: 'severed_scroll', cond: c => c.age >= 12 && c.qi.realm === 0 && !knowsSevered(c) && (c.counts.library || c.counts.explore_alleys), w: 0.25, run: c => {
      c.flags.severedLore = 'scroll'; ui.log('Between two dusty books I found a scroll titled "On Cutting the Thread" — a manual for rejecting Qi and forging the body instead. (Severed Path tab)', 'qi'); } },
  { id: 'severed_syndicate', cond: c => c.sect === 'iron' && c.qi.realm === 0 && !knowsSevered(c), w: 1.5, run: c => {
      c.flags.severedLore = 'iron'; ui.log('An old enforcer of the Iron Fist Syndicate showed me his secret: he has no Qi at all. "The Severed Path," he called it. (Severed Path tab)', 'qi'); } },
  { id: 'severed_master', cond: c => c.qi.realm === 0 && !knowsSevered(c) && Object.values(c.martial || {}).some(x => x >= 22), w: 1, run: c => {
      c.flags.severedLore = 'dojo'; ui.log('My martial arts master pulled me aside after class: "You have a body that could walk the Severed Path — if you\'re willing to give up Qi forever." (Severed Path tab)', 'qi'); } },
];
