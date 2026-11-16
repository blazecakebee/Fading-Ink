import { BODY_MOVES } from './bodypath.js';
// Combat moves. cost = stamina, qi = qi cost. dmg = [min,max] base, scaled by stats & realm power.
export const MOVES = {
  slap:   { icon: 'feather', name: 'Slap', cost: 4, dmg: [2, 4], acc: 0.95, stat: 'agility', info: 'Fast, cheap, weak. Builds momentum.' , mom: 1 },
  jab:    { icon: 'fist', name: 'Jab', cost: 6, dmg: [3, 6], acc: 0.9, stat: 'agility', info: 'Quick strike. Builds momentum.', mom: 1 },
  punch:  { icon: 'hammer', name: 'Punch', cost: 10, dmg: [5, 10], acc: 0.8, stat: 'strength', info: 'Solid hit. Uses Strength.' },
  kick:   { icon: 'kick', name: 'Kick', cost: 14, dmg: [7, 13], acc: 0.7, stat: 'strength', info: 'Heavy but easy to dodge.' },
  guard:  { icon: 'shield', name: 'Guard', cost: -12, dmg: [0, 0], acc: 1, guard: true, info: 'Halve the next hit and recover stamina.' },
  qi_palm:{ icon: 'cultivation', name: 'Qi Palm', cost: 4, qi: 15, dmg: [12, 20], acc: 0.9, stat: 'qi', info: 'Channel Qi into a palm strike. Needs Qi Condensation.', realm: 2 },
  flame_palm:  { icon: 'fire', name: 'Burning Palm', cost: 6, qi: 25, dmg: [18, 28], acc: 0.85, stat: 'qi', burn: 3, info: 'Sets the enemy alight for 2 turns.' },
  river_step:  { icon: 'water', name: 'Flowing River Step', cost: 2, qi: 12, dmg: [6, 10], acc: 1, stat: 'qi', evade: true, info: 'Strike and become hard to hit next turn.' },
  thunder_fist:{ icon: 'lightning', name: 'Nine Thunder Fist', cost: 10, qi: 40, dmg: [30, 44], acc: 0.8, stat: 'qi', stun: 0.3, info: 'May stun. Huge damage.' },
  iron_skin:   { icon: 'metal', name: 'Iron Skin', cost: 0, qi: 20, dmg: [0, 0], acc: 1, armor: 3, info: 'Reduce incoming damage for 3 turns.' },
  void_rend:   { icon: 'eye', name: 'Void Rend', cost: 8, qi: 45, dmg: [38, 56], acc: 0.85, stat: 'qi', pierce: true, info: 'Tears space itself. Ignores Guard and Iron Skin.' },
  star_fall:   { icon: 'star', name: 'Falling Star Palm', cost: 12, qi: 60, dmg: [52, 78], acc: 0.72, stat: 'qi', stun: 0.2, info: 'A palm like a falling star. May stun.' },
  qilin_flame: { icon: 'fire', name: 'Qilin Flame', cost: 6, qi: 35, dmg: [26, 36], acc: 0.9, stat: 'qi', burn: 3, info: 'Holy fire that clings for 2 turns.' },
  blood_drain: { icon: 'demon', name: 'Blood Drain', cost: 6, qi: 20, dmg: [14, 22], acc: 0.85, stat: 'qi', drain: 0.5, info: 'Heals you for half the damage. Demonic.' },
};
export const BASE_MOVES = ['jab', 'punch', 'kick', 'guard'];
Object.assign(MOVES, BODY_MOVES); // Severed Path techniques
// Overall difficulty: enemies get this much more HP and hit this much harder.
export const DIFFICULTY = 1.5;
// Realm presence: a cultivator 2+ realms above their foe presses down on them with sheer aura; 3+ realms above,
// the weaker side can barely act (and the stronger can end it without lifting a finger). Works both ways.
export function presence(gap) {
  if (gap >= 3) return { me: 1.5, them: 0.3, crush: true, line: 'Your presence alone drives them to their knees.' };
  if (gap === 2) return { me: 1.25, them: 0.65, line: 'Your aura presses down on them. Their hands shake.' };
  if (gap === 1) return { me: 1.12, them: 0.88, line: '' }; // v0.8.7: even one realm above is a clear edge
  if (gap === -1) return { me: 0.9, them: 1.1, line: '' };
  if (gap === -2) return { me: 0.7, them: 1.3, line: 'Their aura presses down on you. Your hands shake.' };
  if (gap <= -3) return { me: 0.35, them: 1.7, crushed: true, line: 'Their presence crushes the breath from your lungs. You can barely stand.' };
  return { me: 1, them: 1, line: '' };
}

// Enemies by gate rank / encounter. lvl scales stats.
export const ENEMIES = [
  { id: 'bully', mini: 'dodge', name: 'School Bully', kind: 'human', realm: 0, hp: 30, str: 30, agi: 25, moves: ['slap', 'punch'] },
  { id: 'thug', mini: 'dodge', name: 'Street Thug', kind: 'human', realm: 0, hp: 45, str: 45, agi: 35, moves: ['jab', 'punch', 'kick'] },
  { id: 'gangster', mini: 'qi_clash', name: 'Crimson Lotus Thug', kind: 'human', realm: 2, hp: 70, str: 50, agi: 45, moves: ['jab', 'kick', 'qi_palm'] },
  { id: 'hungry_ghost', mini: 'seal', name: 'Hungry Ghost (饿鬼)', kind: 'spirit', realm: 2, hp: 60, str: 40, agi: 50, moves: ['slap', 'blood_drain'] },
  { id: 'jiangshi', mini: 'breath', name: 'Jiangshi (僵尸)', kind: 'spirit', realm: 2, hp: 110, str: 65, agi: 15, moves: ['punch', 'kick'] },
  { id: 'fox_spirit', mini: 'seal', name: 'Huli Jing (狐狸精)', kind: 'spirit', realm: 3, hp: 120, str: 45, agi: 80, moves: ['jab', 'flame_palm', 'river_step'] },
  { id: 'demonic', mini: 'qi_clash', name: 'Demonic Cultivator', kind: 'human', realm: 3, hp: 160, str: 70, agi: 60, moves: ['punch', 'blood_drain', 'flame_palm'] },
  { id: 'corrupt_soul', mini: 'seal', name: 'Corrupt Soul', kind: 'spirit', realm: 3, hp: 140, str: 60, agi: 55, moves: ['qi_palm', 'blood_drain'] },
  { id: 'yaoguai', mini: 'weakpoint', name: 'Mountain Yaoguai (妖怪)', kind: 'spirit', realm: 4, hp: 320, str: 95, agi: 50, moves: ['kick', 'thunder_fist', 'guard'] },
  { id: 'ghost_king', mini: 'seal', name: 'Ghost King of the Gate', kind: 'spirit', realm: 6, hp: 700, str: 120, agi: 80, moves: ['thunder_fist', 'blood_drain', 'flame_palm'] },
  { id: 'spirit_wolf', mini: 'dodge', name: 'Spirit Wolf', kind: 'beast', realm: 2, hp: 70, str: 50, agi: 70, moves: ['jab', 'kick'] },
  { id: 'tiger_beast', mini: 'dodge', name: 'White Tiger Beast', kind: 'beast', realm: 3, hp: 170, str: 80, agi: 65, moves: ['punch', 'kick', 'guard'] },
  { id: 'stone_golem', mini: 'weakpoint', name: 'Stone Golem', kind: 'construct', realm: 3, hp: 260, str: 85, agi: 10, moves: ['punch', 'iron_skin'] },
  { id: 'drowned_ghost', mini: 'breath', name: 'Drowned Ghost (水鬼)', kind: 'spirit', realm: 2, hp: 80, str: 45, agi: 55, moves: ['slap', 'blood_drain'] },
  { id: 'blood_cultist', mini: 'qi_clash', name: 'Blood Sea Cultist', kind: 'human', realm: 3, hp: 150, str: 65, agi: 60, moves: ['punch', 'blood_drain', 'qi_palm'] },
  { id: 'young_dragon', mini: 'weakpoint', name: 'Young Flood Dragon (蛟)', kind: 'beast', realm: 6, hp: 650, str: 130, agi: 70, moves: ['thunder_fist', 'flame_palm', 'kick'] },
  { id: 'sword_saint', mini: 'dodge', name: 'Rogue Sword Saint', kind: 'human', realm: 8, hp: 900, str: 150, agi: 120, moves: ['thunder_fist', 'river_step', 'void_rend'] },
  { id: 'void_wraith', mini: 'seal', name: 'Void Wraith', kind: 'spirit', realm: 9, hp: 1000, str: 140, agi: 110, regen: 0.03, moves: ['void_rend', 'blood_drain', 'river_step'] },
  { id: 'heavenly_demon', mini: 'qi_clash', name: 'Heavenly Demon', kind: 'human', realm: 10, hp: 1300, str: 175, agi: 95, regen: 0.02, moves: ['star_fall', 'blood_drain', 'void_rend'] },
  { id: 'ancient_qilin', mini: 'weakpoint', name: 'Ancient Qilin (麒麟)', kind: 'beast', realm: 11, hp: 1700, str: 190, agi: 90, moves: ['qilin_flame', 'star_fall', 'iron_skin'] },
  { id: 'fallen_immortal', mini: 'seal', name: 'Fallen Immortal', kind: 'spirit', realm: 11, hp: 2000, str: 210, agi: 115, regen: 0.025, moves: ['star_fall', 'void_rend', 'qilin_flame'] },
  { id: 'tribulation', mini: 'qi_clash', name: 'Heavenly Tribulation', kind: 'heaven', realm: 0, hp: 100, str: 60, agi: 60, moves: ['thunder_fist', 'qi_palm'] },
];
export const GATE_RANKS = [
  { rank: 'E', pool: ['hungry_ghost', 'thug'], fights: 2, realm: 0, color: '#9a9a9a' },
  { rank: 'D', pool: ['hungry_ghost', 'jiangshi', 'gangster'], fights: 2, realm: 2, color: '#6fd36f' },
  { rank: 'C', pool: ['jiangshi', 'fox_spirit', 'corrupt_soul'], fights: 3, realm: 3, color: '#4fa3ff' },
  { rank: 'B', pool: ['demonic', 'corrupt_soul', 'fox_spirit'], fights: 3, realm: 4, color: '#b18cff' },
  { rank: 'A', pool: ['yaoguai', 'demonic'], fights: 3, realm: 5, color: '#ffb02e' },
  { rank: 'S', pool: ['yaoguai', 'ghost_king'], fights: 3, realm: 7, color: '#ff4f4f' },
  { rank: 'SS', pool: ['sword_saint', 'void_wraith'], fights: 4, realm: 9, color: '#ff4fd8' },
  { rank: 'SSS', pool: ['heavenly_demon', 'ancient_qilin'], fights: 4, realm: 11, color: '#fff4b0' },
  // v0.8.7 beyond Immortal Ascension
  { rank: 'X', pool: ['fallen_immortal', 'void_wraith', 'ancient_qilin'], fights: 5, realm: 13, color: '#7fffd4' },
  { rank: 'Z', pool: ['fallen_immortal', 'heavenly_demon', 'void_wraith'], fights: 5, realm: 15, color: '#ff2a6d' },
];
export const LOOT = [
  { id: 'qi_pill', name: 'Qi Gathering Pill', icon: 'pill', w: 30, use: 'qi' },
  { id: 'heal_pill', name: 'Healing Pill', icon: 'health', w: 25, use: 'heal' },
  { id: 'spirit_stone', name: 'Spirit Stone', icon: 'gem', w: 30, use: 'sell' },
  { id: 'foundation_pill', name: 'Foundation Establishment Pill', icon: 'pill', w: 8, use: 'key' },
  { id: 'manual', name: 'Martial Manual', icon: 'manual', w: 10, use: 'manual' },
  { id: 'spirit_herb', name: 'Spirit Herb', icon: 'herb', w: 25 },
  { id: 'iron_ore', name: 'Iron Ingot', icon: 'metal', w: 20 },
  { id: 'beast_core', name: 'Beast Core', icon: 'earth', w: 18 },
  { id: 'cloth', name: 'Silk Cloth', icon: 'cloth', w: 12 },
  { id: 'dragon_scale', name: 'Dragon Scale', icon: 'fire', w: 2 },
  { id: 'mending_salve', name: 'Meridian Mending Salve', icon: 'mortar', w: 5 },
  { id: 'demonic_core', name: 'Demonic Core', icon: 'demon', w: 4, use: 'devour' },
  { id: 'gold', name: 'Gold Pouch', icon: 'market', w: 25, use: 'money' },
];

// Gate themes: each has its own enemies, final boss and loot table. Ranks decide which themes can appear.
export const GATE_TYPES = [
  { id: 'temple', name: 'Haunted Temple', icon: 'ghost', ranks: 'EDCBAS', pool: ['hungry_ghost', 'corrupt_soul', 'fox_spirit'], boss: { E: 'hungry_ghost', D: 'corrupt_soul', C: 'fox_spirit', B: 'fox_spirit', A: 'ghost_king', S: 'ghost_king' },
    loot: { spirit_pendant: 3, prayer_beads: 3, recipe_scroll: 6, spirit_stone: 30, calm_incense: 18, trib_talisman: 8, spirit_herb: 15, heart_pill: 6, manual: 8, gold: 15, foundation_pill: 6 }, desc: 'Incense smoke and whispering spirits.' },
  { id: 'den', name: 'Spirit Beast Den', icon: 'claw', ranks: 'EDCBA', pool: ['spirit_wolf', 'tiger_beast'], boss: { E: 'spirit_wolf', D: 'spirit_wolf', C: 'tiger_beast', B: 'tiger_beast', A: 'yaoguai' },
    loot: { dragon_tooth: 2, iron_band: 3, beast_hide: 6, recipe_scroll: 4, beast_core: 40, spirit_herb: 20, cloth: 10, marrow_pill: 6, fang_necklace: 4, gold: 12, foundation_pill: 5, ginseng: 4 }, desc: 'Claw marks and bones. Beast cores everywhere.' },
  { id: 'altar', name: 'Demonic Altar', icon: 'demon', ranks: 'DCBAS', pool: ['blood_cultist', 'demonic', 'corrupt_soul'], boss: { D: 'blood_cultist', C: 'demonic', B: 'demonic', A: 'demonic', S: 'ghost_king' },
    loot: { flame_glaive: 3, recipe_scroll: 8, demonic_core: 22, spirit_stone: 20, qi_pill: 20, purity_pill: 6, manual: 12, gold: 20, foundation_pill: 8 }, desc: 'Blood-soaked stones. Demonic cultivators guard their secrets.' },
  { id: 'tomb', name: 'Flooded Tomb', icon: 'water', ranks: 'EDCB', pool: ['jiangshi', 'drowned_ghost'], boss: { E: 'drowned_ghost', D: 'jiangshi', C: 'jiangshi', B: 'jiangshi' },
    loot: { ruby_ring: 3, silver_locket: 3, recipe_scroll: 8, ginseng: 8, spirit_herb: 25, cloth: 15, heal_pill: 20, mending_salve: 8, gold: 25 }, desc: 'Ancient burial chambers, half underwater.' },
  { id: 'mine', name: 'Spirit Iron Mine', icon: 'pickaxe', ranks: 'DCBA', pool: ['stone_golem', 'thug', 'spirit_wolf'], boss: { D: 'stone_golem', C: 'stone_golem', B: 'stone_golem', A: 'stone_golem' },
    loot: { jade_sword: 3, bronze_plate: 4, recipe_scroll: 3, iron_ore: 40, spirit_stone: 25, iron_sword: 6, iron_mail: 4, spirit_blade: 2, gold: 15 }, desc: 'Collapsed tunnels and animated stone.' },
  { id: 'rift', name: 'Dragon Rift', icon: 'fire', ranks: 'AS SS', pool: ['tiger_beast', 'yaoguai'], boss: { A: 'young_dragon', S: 'young_dragon', SS: 'ancient_qilin' },
    loot: { thunder_blade: 3, jade_scale: 3, recipe_scroll: 6, dragon_scale: 25, foundation_pill: 15, core_pill: 6, soul_pill: 3, spirit_stone: 25, dragon_vest: 4, ginseng: 10, gold: 20 }, desc: 'Heat shimmer and scales the size of plates.' },
  { id: 'void', name: 'Void Rift', icon: 'eye', ranks: 'S SS SSS', pool: ['void_wraith', 'sword_saint', 'heavenly_demon'], boss: { S: 'void_wraith', SS: 'heavenly_demon', SSS: 'fallen_immortal' },
    loot: { storage_ring: 4, sword_ring: 3, void_edge: 3, void_mantle: 3, phoenix_feather: 3, spirit_stone: 30, void_pill: 8, unity_pill: 4, sever_pill: 8, bloodline_essence: 3, recipe_scroll: 6, gold: 20, dao_pill: 2 }, desc: 'Space folds in on itself. Things from outside the world wait here.' },
  { id: 'palace', name: 'Fallen Celestial Palace', icon: 'crown', ranks: 'SS SSS', pool: ['ancient_qilin', 'sword_saint', 'void_wraith'], boss: { SS: 'ancient_qilin', SSS: 'fallen_immortal' },
    loot: { celestial_sword: 2, celestial_armor: 2, phoenix_feather: 3, spirit_stone: 30, unity_pill: 8, dao_pill: 6, ascend_pill: 2, bloodline_essence: 4, dragon_vest: 4, gold: 25 }, desc: 'Ruins of a palace that fell out of the sky. Its guardians still serve.' },
];
// rank strings are matched exactly ('S' must not match 'SS')
GATE_TYPES.push({ id: 'beyond', name: 'Rift Beyond the Heavens', icon: 'eye', ranks: 'X Z', pool: ['fallen_immortal', 'void_wraith', 'heavenly_demon', 'ancient_qilin'], boss: { X: 'fallen_immortal', Z: 'fallen_immortal' },
  loot: { celestial_sword: 4, celestial_armor: 4, ascend_pill: 6, dao_pill: 10, bloodline_essence: 8, phoenix_feather: 6, spirit_stone: 30, gold: 30 }, desc: 'A wound in the sky. What lives on the other side was old when the heavens were young.' });
export const hasRank = (t, rank) => t.ranks.split(/\s+/).flatMap(x => ['SS', 'SSS'].includes(x) ? [x] : x.split('')).includes(rank);
export function makeGate(rank) {
  const types = GATE_TYPES.filter(t => hasRank(t, rank));
  const t = types[Math.floor(Math.random() * types.length)];
  return { rank, type: t.id, years: 1 + Math.floor(Math.random() * 4) };
}
