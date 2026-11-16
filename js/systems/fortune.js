// v0.7.9: the world is unforgiving — but now and then it is kind. Rare good fortune.
import { ui } from '../core/bus.js';
import { ri, pick, chance } from '../core/rng.js';
import { stat, money, addItem, fmtMoney, wage } from './life.js';
import { perk } from '../data/legacyTree.js';

const ev = (id, w, cond, run) => ({ id, w, cond, run });
export const FORTUNE_EVENTS = [
  ev('fortune_stranger_heal', 0.5, c => c.stats.health < 45 && c.age >= 8, c => {
    const g = ri(15, 30); stat(c, 'health', g); stat(c, 'happiness', 6);
    ui.log(`A wandering healer stopped me in the street, pressed two fingers to my wrist and frowned. "You're dying slower than you think." Her needles burned — and I felt better than I had in years. (Health +${g})`, 'good'); }),
  ev('fortune_windfall', 0.5, c => c.age >= 16, c => {
    const m = Math.round(ri(800, 4000) * wage(c)); money(c, m);
    ui.log(pick([`An old lottery ticket in a coat pocket turned out to be a winner: ${fmtMoney(c, m)}.`, `A distant relative I never met left me ${fmtMoney(c, m)} in their will.`, `I found a purse in the gutter with no name in it — ${fmtMoney(c, m)}. Nobody came looking.`]), 'good'); }),
  ev('fortune_calm_year', 0.4, c => c.stats.stress > 60 && c.age >= 12, c => {
    stat(c, 'stress', -ri(20, 35)); stat(c, 'happiness', 10);
    ui.log('For no reason I can name, this year was gentle. Nothing broke, nobody shouted, and I slept through every night.', 'good'); }),
  ev('fortune_herb', 0.45, c => c.age >= 10, c => {
    const id = pick(['heal_pill', 'qi_pill', 'spirit_herb', 'ginseng']); addItem(c, id);
    ui.log('An old woman selling herbs refused my money. "You need this more than I do," she said, and wrapped something in paper for me.', 'good'); }),
  ev('fortune_mentor', 0.35, c => c.age >= 12 && c.age <= 60, c => {
    const k = pick(['strength', 'agility', 'battle', 'smarts', 'charisma']); const g = ri(3, 7); stat(c, k, g);
    ui.log(`A retired master watched me for a while, then spent a whole afternoon correcting every bad habit I had. (${k[0].toUpperCase() + k.slice(1)} +${g})`, 'good'); }),
];
// Once per life, fate may turn a sudden death aside. (Never old age — nobody lives forever.)
export function spared(c, cause) {
  if (c.flags.spared || !cause || /old age|gave out/.test(cause) || !chance(0.3 + 0.15 * perk('d1'))) return false;
  c.flags.spared = true; stat(c, 'health', -ri(10, 20)); stat(c, 'happiness', -5);
  ui.log(`It should have killed me — ${cause.replace(/^I /, '')}. By some miracle I walked away with only scars.`, 'big');
  return true;
}
