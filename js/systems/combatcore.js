// v0.7.9 combat balance core. Stats are read as a % of your realm's cap, so the realm (power) decides
// who is stronger and stats decide by how much. Enemy strength per realm was tuned with a simulator so an
// average fighter wins ~70% of even fights, bosses are coin-flips, and only maxed-out fighters dominate.
import { ENEMIES } from '../data/combat.js';
import { REALMS } from '../data/realms.js';
import { HARD } from '../core/hard.js';

export const PLAYER_HP = 2.5;          // player HP multiplier (longer, more tactical fights)
export const ENEMY_HP = 2 * HARD;      // enemy HP multiplier
export const ENEMY_DMG = 0.85 * HARD;  // enemy damage multiplier
export const GEAR_DMG = 0.6;           // weapons give 60% of their listed bonus in a fight
export const SEVERED_EDGE = 1.08;      // Qi users can't sense the Severed coming
// per encounter realm (0..12): extra enemy HP and damage
export const REALM_SCALE = [1.26, 2, 2.37, 1.76, 1.59, 2.06, 2.2, 1.14, 1.16, 0.71, 0.76, 0.63, 0.52, 0.62, 0.7, 0.74, 0.7];
export const realmScale = r => REALM_SCALE[Math.max(0, Math.min(16, r || 0))];
// per enemy and encounter realm (0..12): simulated so an average fighter (stats ~70% of cap) of the same realm
// wins about 70% of the time against the plain version. Bosses, hunts and gods add their own multipliers on top.
export const ENEMY_SCALE = {
  bully: [3.2, 5.07, 6.37, 9.57, 11.72, 19.61, 22.81, 26.15, 28.42, 30.63, 34.84, 38.71, 39.69, 39.99, 39.99, 39.99, 39.99],
  thug: [2.05, 3.35, 4.12, 6.2, 7.58, 12.75, 14.57, 16.89, 18.91, 19.61, 22.76, 25.23, 26.13, 33.8, 39.99, 39.99, 39.99],
  gangster: [1.36, 2.08, 2.45, 3.2, 3.51, 5.26, 6, 6.08, 5.98, 5.62, 6.38, 6.54, 5.64, 6.13, 6.86, 6.95, 6.64],
  hungry_ghost: [1.1, 1.76, 2.13, 2.79, 2.77, 4.3, 4.43, 4.52, 4.81, 4.68, 4.86, 5, 4.21, 4.91, 5.4, 5.52, 5.24],
  jiangshi: [1.25, 1.84, 2.44, 3.72, 4.44, 7.58, 8.94, 10.24, 11.52, 11.79, 13.79, 15.25, 15.78, 20.82, 25.51, 29.69, 30.49],
  fox_spirit: [0.68, 1.15, 1.42, 1.77, 1.95, 2.74, 2.98, 2.94, 3.11, 3.12, 3.16, 3.25, 2.94, 3.23, 3.64, 3.8, 3.53],
  demonic: [0.57, 0.91, 1.13, 1.5, 1.58, 2.39, 2.46, 2.54, 2.68, 2.45, 2.74, 2.77, 2.37, 2.74, 3.03, 3.14, 2.9],
  corrupt_soul: [0.64, 0.96, 1.21, 1.49, 1.53, 2.3, 2.42, 2.54, 2.53, 2.48, 2.72, 2.79, 2.28, 2.68, 2.9, 3.04, 2.77],
  yaoguai: [0.5, 0.66, 0.82, 1.12, 1.2, 1.83, 1.95, 1.98, 1.99, 2.05, 2.13, 2.18, 1.93, 2.28, 2.46, 2.66, 2.48],
  ghost_king: [0.22, 0.32, 0.41, 0.58, 0.6, 0.91, 0.98, 0.98, 0.99, 0.98, 1.04, 1.06, 0.89, 1.03, 1.16, 1.19, 1.1],
  spirit_wolf: [1.45, 2.34, 3.11, 4.61, 5.65, 9.34, 10.84, 12.57, 13.83, 14.57, 16.83, 18.83, 19.04, 25.29, 30.98, 35.59, 36.45],
  tiger_beast: [1, 1.4, 1.78, 3.12, 3.96, 6.79, 7.58, 8.89, 10, 10.84, 12.95, 13.91, 14.44, 19.18, 23.22, 26.78, 27.27],
  stone_golem: [0.7, 0.97, 1.26, 2.72, 3.37, 6.06, 6.99, 8, 8.8, 11.45, 13.34, 14.8, 15.38, 20.12, 24.54, 26.89, 23.91],
  drowned_ghost: [0.94, 1.48, 1.82, 2.37, 2.44, 3.8, 4.04, 4.07, 4.12, 4.07, 4.39, 4.53, 3.69, 4.39, 4.88, 4.95, 4.49],
  blood_cultist: [0.7, 1.03, 1.29, 1.71, 1.75, 2.6, 2.82, 2.87, 2.94, 2.8, 3.01, 3.14, 2.64, 3.09, 3.35, 3.41, 3.25],
  young_dragon: [0.25, 0.37, 0.47, 0.68, 0.71, 1.06, 1.16, 1.14, 1.18, 1.13, 1.25, 1.23, 1.06, 1.24, 1.36, 1.41, 1.33],
  sword_saint: [0.19, 0.26, 0.32, 0.45, 0.46, 0.68, 0.74, 0.75, 0.77, 0.75, 0.79, 0.79, 0.69, 0.8, 0.87, 0.91, 0.84],
  void_wraith: [0.09, 0.13, 0.18, 0.38, 0.4, 0.62, 0.67, 0.68, 0.7, 0.7, 0.73, 0.76, 0.63, 0.74, 0.81, 0.83, 0.77],
  heavenly_demon: [0.1, 0.14, 0.18, 0.31, 0.33, 0.5, 0.53, 0.56, 0.55, 0.54, 0.58, 0.61, 0.5, 0.57, 0.64, 0.66, 0.6],
  ancient_qilin: [0.1, 0.14, 0.17, 0.3, 0.31, 0.49, 0.53, 0.54, 0.54, 0.59, 0.64, 0.65, 0.55, 0.64, 0.72, 0.76, 0.68],
  fallen_immortal: [0.06, 0.08, 0.11, 0.22, 0.23, 0.35, 0.39, 0.4, 0.4, 0.4, 0.43, 0.44, 0.37, 0.43, 0.47, 0.5, 0.45],
};
export const enemyScale = (id, r) => ENEMY_SCALE[id]?.[Math.max(0, Math.min(16, r || 0))] ?? realmScale(r);

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// enemy stats are written for the realm they normally live in; read them as a % of that realm's cap
export const nativeRealm = def => def.id === 'player' ? (def.realm || 0) : (ENEMIES.find(e => e.id === def.id)?.realm ?? def.realm ?? 0);
export const enemyPct = (def, raw) => clamp(raw / (REALMS[nativeRealm(def)]?.cap || 100) * 100 * (def.id === 'player' ? 1 : 1.25), 10, 110);
export const playerPct = (v, cap) => clamp(v / (cap || 100) * 100, 0, 110);
export const qiStat = aff => 30 + (aff || 0) * 0.7;              // player Qi techniques
export const enemyQiStat = realm => 50 + Math.min(40, (realm || 0) * 3);
