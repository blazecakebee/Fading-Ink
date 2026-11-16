// Unlocks achievements (shared across lives), pays Legacy Points and shows a popup in the top-right.
import { META, save } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ACHIEVEMENTS, achPts } from '../data/achievements.js';
import { TRAIT_BY_ID } from '../data/traits.js';

export function checkAchievements(c) {
  if (!c) return; META.achievements ||= {};
  for (const a of ACHIEVEMENTS) {
    if (META.achievements[a.id]) continue;
    let ok = false; try { ok = !!a.check(c, TRAIT_BY_ID); } catch (e) {}
    if (!ok) continue;
    META.achievements[a.id] = Date.now(); META.legacy += achPts(a);
    ui.achievement?.(a);
  }
}
