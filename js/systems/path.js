// Which path a character walks: Qi cultivation (default) or the Severed Path (body only).
import { BODY_TIERS } from '../data/bodypath.js';
export const onBodyPath = c => c?.path === 'body';
export const bodyTier = c => BODY_TIERS[c?.bodyPath?.tier || 0];
// "effective realm": what the rest of the game compares against (Gates, presence, Guild ranks, missions…)
export const effRealm = c => onBodyPath(c) ? bodyTier(c).eq : (c?.qi?.realm || 0);
