// v0.9.47 Sect Treasury: spend contribution on pills, weapons and gear. Every sect has three treasures of its own
// that no other sect sells, unlocked by rank. Plus rank perks: the higher you climb, the more the sect does for you.
import { G } from '../core/state.js';
import { ITEMS } from '../data/items.js';
import { SECTS } from '../data/realms.js';
import { GEAR_SPRITES } from '../ui/gearSprites.js';
import { MAT, ICON, SLOT } from '../data/localArms.js';
import { addItem, stat, wage } from './life.js';
import { qiCap } from './cultivation.js';
import { CONDITIONS } from '../data/conditions.js';
import { ri } from '../core/rng.js';

// ---- rank perks (outer, inner, core, elder). Sect Masters of their own sect run their own halls instead.
export const RANK_PERKS = [
  { disc: 0, mods: null, lines: ['Access to the Treasury\'s common shelf'] },
  { disc: 0.1, mods: { qi: 1.04 }, lines: ['Treasury prices -10%', '+4% Qi gain (the inner courtyard\'s spirit vein)', 'Your sect\'s exclusive weapon'] },
  { disc: 0.2, mods: { qi: 1.08, breakthrough: 0.03 }, lines: ['Treasury prices -20%', '+8% Qi gain', '+3% breakthrough chance (elders watch over you)', 'Your sect\'s exclusive armour or trinket'] },
  { disc: 0.3, mods: { qi: 1.12, breakthrough: 0.05, social: 1.1 }, lines: ['Treasury prices -30%', '+12% Qi gain', '+5% breakthrough chance', '+10% social gains (people bow when you pass)'] },
];
const rankOf = c => Math.min(3, c.sectRank || 0);
export function sectMods(c) { if (!c?.sect || c.sect === 'own' || c.sect === 'guest') return []; const m = RANK_PERKS[rankOf(c)].mods; return m ? [m] : []; }

// ---- common shelf (every sect)
export const COMMON = [
  { id: 'qi_pill', cost: 25, rank: 0 }, { id: 'heal_pill', cost: 18, rank: 0 }, { id: 'mending_salve', cost: 45, rank: 0 },
  { id: 'recipe_scroll', cost: 60, rank: 1 }, { id: 'calm_incense', cost: 50, rank: 1 }, { id: 'foundation_pill', cost: 140, rank: 1 }, { id: 'heart_pill', cost: 55, rank: 1 },
  { id: 'core_pill', cost: 260, rank: 2 }, { id: 'marrow_pill', cost: 300, rank: 2 }, { id: 'trib_talisman', cost: 280, rank: 2 }, { id: 'purity_pill', cost: 90, rank: 2 },
  { id: 'soul_pill', cost: 480, rank: 3 }, { id: 'sever_pill', cost: 650, rank: 3 }, { id: 'bloodline_essence', cost: 400, rank: 3 },
];

// ---- exclusive treasures: [weapon], [armour/trinket], [pill: effect taken on the spot, once a year]
const W = (name, shape, mat, stats) => ({ name, shape, mat, stats });
const P = (name, eff, desc) => ({ name, eff, desc });
const EXCL = {
  azure:        [W('Azure Cloud Jian', 'sword', 'silver', { dmg: 0.34, agi: 5, qi: 0.05 }), W('Cloud-Silk Robe', 'robe', 'indigo', { hp: 45, qi: 0.06 }), P('Cloudsea Pill', { qi: 1, aff: 2 }, 'Fills your Qi and +2 Qi affinity.')],
  crimson:      [W('Crimson Lotus Cleaver', 'saber', 'cloth', { dmg: 0.48, agi: -2 }), W('Lotus-Thorn Vest', 'vest', 'cloth', { hp: 40, agi: 3 }), P('Blood Pill', { str: 4, health: -8 }, '+4 Strength, but costs 8 Health. Fast power, high cost.')],
  ink:          [W('Brush of Unwriting', 'staff', 'obsidian', { dmg: 0.28, qi: 0.1, luck: 4 }), W('Blank-Page Mantle', 'mantle', 'silk', { hp: 35, luck: 8 }), P('Ink-Drop Pill', { smarts: 4, aff: 2 }, '+4 Smarts and +2 Qi affinity.')],
  iron:         [W('Brass Knuckle-Guards', 'twin', 'bronze', { dmg: 0.36, agi: 3 }), W('Fight-Club Wraps', 'hide', 'leather', { hp: 55 }), P('Iron Bone Tonic', { str: 3, health: 10 }, '+3 Strength and +10 Health.')],
  thunder_peak: [W('Stormcaller Spear', 'spear', 'silver', { dmg: 0.4, agi: 3 }), W('Lightning-Rod Mail', 'mail', 'iron', { hp: 60, agi: -2 }), P('Thunderclap Pill', { qi: 0.6, agi: 3 }, 'Restores 60% Qi and +3 Agility.')],
  moon_well:    [W('Moonwater Whisk', 'staff', 'silver', { dmg: 0.22, qi: 0.12 }), W('Moon-Pool Rosary', 'beads', 'silver', { qi: 0.1, luck: 5 }), P('Moon-Dew Pill', { stress: -30, aff: 2 }, '-30 Stress and +2 Qi affinity.')],
  nine_swords:  [W('Ninth Sword', 'sword', 'steel', { dmg: 0.5, agi: 4 }), W('Sword-Sheath Sash', 'mantle', 'leather', { hp: 30, agi: 6 }), P('Sword Intent Pill', { battle: 4, agi: 2 }, '+4 Battle Knowledge and +2 Agility.')],
  red_dust:     [W('Market Monk\'s Staff', 'staff', 'wood', { dmg: 0.26, qi: 0.06, luck: 3 }), W('Begging Bowl Beads', 'beads', 'wood', { qi: 0.08, hp: 20 }), P('Red Dust Pill', { charisma: 3, stress: -20 }, '+3 Charisma and -20 Stress.')],
  jade_river:   [W('Jade Scholar\'s Fan', 'dagger', 'jade', { dmg: 0.24, agi: 4, qi: 0.06 }), W('Herbalist\'s Jade Pendant', 'amulet', 'jade', { qi: 0.08, hp: 25 }), P('Hundred Herb Pill', { health: 30, cure: 1 }, '+30 Health and cures one bodily illness.')],
  sunfire:      [W('Noonblade', 'saber', 'gold', { dmg: 0.42, qi: 0.04 }), W('Sunfire Crown Plate', 'plate', 'gold', { hp: 75, agi: -4 }), P('Solar Core Pill', { qi: 0.7, str: 2 }, 'Restores 70% Qi and +2 Strength.')],
  frostveil:    [W('Icicle Dagger', 'dagger', 'silver', { dmg: 0.26, agi: 6 }), W('Snowfield Hermit Coat', 'mantle', 'indigo', { hp: 60, qi: 0.04 }), P('Frost Lotus Pill', { stress: -25, health: 15 }, '-25 Stress and +15 Health.')],
  starlit:      [W('Astrolabe Staff', 'staff', 'silk', { dmg: 0.24, qi: 0.1, luck: 3 }), W('Star-Chart Ring', 'ring', 'silver', { qi: 0.08, luck: 6 }), P('Starfall Pill', { smarts: 3, aff: 3 }, '+3 Smarts and +3 Qi affinity.')],
  twin_rivers:  [W('Paired Butterfly Swords', 'twin', 'steel', { dmg: 0.34, agi: 5 }), W('Twin-Knot Bracelet', 'ring', 'jade', { qi: 0.06, luck: 4, hp: 15 }), P('Confluence Pill', { charisma: 4, qi: 0.4 }, '+4 Charisma and restores 40% Qi.')],
  jungle_drum:  [W('Drum-Hide Machete', 'saber', 'leather', { dmg: 0.36, agi: 3 }), W('Canopy Feather Cloak', 'mantle', 'emerald', { hp: 40, agi: 5 }), P('Rainforest Root Pill', { health: 20, agi: 3 }, '+20 Health and +3 Agility.')],
  silent_bell:  [W('Unrung Bell Hammer', 'hammer', 'bronze', { dmg: 0.44, agi: -3, qi: 0.05 }), W('Abbey Silence Beads', 'beads', 'obsidian', { qi: 0.1, hp: 20 }), P('Stillness Pill', { stress: -40, aff: 1 }, '-40 Stress and +1 Qi affinity.')],
  grey_wolves:  [W('Chain-Wrapped Bat', 'staff', 'iron', { dmg: 0.38 }), W('Pack Leather Jacket', 'vest', 'leather', { hp: 55, agi: 2 }), P('Wolf Blood Shot', { str: 3, battle: 2 }, '+3 Strength and +2 Battle Knowledge.')],
  golden_carp:  [W('Lucky Coin Darts', 'twin', 'gold', { dmg: 0.24, luck: 10 }), W('Golden Carp Scale Ring', 'ring', 'gold', { luck: 12, qi: 0.04 }), P('Carp-Leap Pill', { luck: 4, money: 1 }, '+4 Luck, and a little money finds its way to you.')],
  black_lotus:  [W('Ledger Knife', 'dagger', 'obsidian', { dmg: 0.32, agi: 5 }), W('Black Silk Suit', 'vest', 'obsidian', { hp: 45, agi: 3, luck: 3 }), P('Debt Pill', { qi: 1, smarts: 2, health: -6 }, 'Fills your Qi and +2 Smarts, costs 6 Health. Every debt is recorded.')],
};
const describe = s => Object.entries(s).map(([k, v]) => k === 'dmg' ? `+${Math.round(v * 100)}% damage` : k === 'qi' ? `+${Math.round(v * 100)}% Qi gain` : k === 'hp' ? `+${v} HP` : `${v > 0 ? '+' : ''}${v} ${{ agi: 'Agility', luck: 'Luck' }[k] || k}`).join(', ') + '.';
for (const [sid, [w, g]] of Object.entries(EXCL)) for (const [x, kind] of [[w, 'w'], [g, 'g']]) {
  const id = `sx_${sid}_${kind}`, m = MAT[x.mat] || MAT.steel; x.id = id;
  ITEMS[id] ||= { name: x.name, icon: ICON[x.shape] || 'chest', type: 'gear', slot: SLOT[x.shape], stats: x.stats, color: m[0], sect: sid, desc: `${describe(x.stats)} Only the ${SECTS.find(s => s.id === sid)?.name || 'sect'} forges these.` };
  GEAR_SPRITES[id] ||= { t: x.shape, pal: { a: m[0], b: m[1], c: m[2], h: m[3], g: m[4], x: m[5] } };
}
const COST = [70, 220, 360]; const RANK_NEED = [0, 1, 2];

const price = (c, base) => Math.round(base * (1 - RANK_PERKS[rankOf(c)].disc));
export function treasury(c) {
  if (!c.sect || c.sect === 'own' || c.sect === 'guest') return null;
  const r = rankOf(c), ex = EXCL[c.sect]; const year = G.world.year;
  const common = COMMON.map(o => ({ kind: 'item', id: o.id, name: ITEMS[o.id]?.name, desc: ITEMS[o.id]?.desc, icon: ITEMS[o.id]?.icon, cost: price(c, o.cost), rank: o.rank, locked: r < o.rank })).filter(o => o.name);
  const excl = ex ? [ex[2], ex[0], ex[1]].map((x, i) => {
    const pill = i === 0, owned = !pill && (c.inv[x.id] > 0 || (c.gear && Object.values(c.gear).includes(x.id)) || c.flags['sxBought_' + x.id]);
    const used = pill && c.flags['sxPill_' + c.sect] === year;
    return { kind: pill ? 'pill' : 'gear', id: pill ? 'sxp_' + c.sect : x.id, name: x.name, desc: pill ? x.desc : ITEMS[x.id].desc, icon: pill ? 'pill' : ITEMS[x.id].icon, cost: price(c, COST[i]), rank: RANK_NEED[i], locked: r < RANK_NEED[i], done: owned || used, doneWhy: owned ? 'Owned' : used ? 'Taken this year' : '' };
  }) : [];
  return { common, excl, rank: r, perks: RANK_PERKS[r], next: RANK_PERKS[r + 1] || null };
}
export function redeem(c, o) {
  if (!o || o.locked || o.done || (c.contrib || 0) < o.cost) return null;
  c.contrib -= o.cost;
  if (o.kind === 'item' || o.kind === 'gear') { addItem(c, o.id); if (o.kind === 'gear') c.flags['sxBought_' + o.id] = 1; return { text: `The Treasury Hall handed me ${o.name} for ${o.cost} contribution.`, cls: o.kind === 'gear' ? 'good' : '' }; }
  // exclusive pill, taken on the spot
  const x = EXCL[c.sect][2], e = x.eff; c.flags['sxPill_' + c.sect] = G.world.year; const bits = [];
  if (e.qi) { const cap = c.qi.realm >= 1 ? qiCap(c) : 0; if (cap) { c.qi.qi = Math.min(cap, c.qi.qi + Math.round(cap * e.qi)); bits.push(`Qi restored`); } }
  if (e.aff) { c.qi.affinity = Math.min(100, (c.qi.affinity || 0) + e.aff); bits.push(`Qi affinity +${e.aff}`); }
  for (const k of ['strength', 'agility', 'smarts', 'charisma', 'luck', 'battle']) { const v = e[k] ?? e[{ strength: 'str', agility: 'agi' }[k]]; if (v) { stat(c, k, v); bits.push(`${k[0].toUpperCase() + k.slice(1)} +${v}`); } }
  if (e.health) { stat(c, 'health', e.health); bits.push(`Health ${e.health > 0 ? '+' : ''}${e.health}`); }
  if (e.stress) { stat(c, 'stress', e.stress); bits.push(`Stress ${e.stress}`); }
  if (e.cure && c.conditions?.length) { const i = c.conditions.findIndex(y => CONDITIONS.find(C => C.id === y.id)?.kind === 'body'); if (i >= 0) { c.conditions.splice(i, 1); bits.push('an illness cured'); } }
  if (e.money) { c.money += Math.round(ri(200, 900) * wage(c)); bits.push('some luck with money'); }
  return { text: `I swallowed a ${x.name} from the ${SECTS.find(s => s.id === c.sect)?.name || 'sect'} Treasury (${o.cost} contribution). ${bits.join(', ')}.`, cls: 'qi' };
}
