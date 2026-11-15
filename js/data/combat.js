// Combat moves. cost = stamina, qi = qi cost. dmg = [min,max] base, scaled by stats & realm power.
export const MOVES = {
  slap:   { icon: 'feather', name: 'Slap', cost: 4, dmg: [2, 4], acc: 0.95, stat: 'agility', info: 'Fast, cheap, weak. Builds momentum.' , mom: 1 },
  jab:    { icon: 'fist', name: 'Jab', cost: 6, dmg: [3, 6], acc: 0.9, stat: 'agility', info: 'Quick strike. Builds momentum.', mom: 1 },
  punch:  { icon: 'hammer', name: 'Punch', cost: 10, dmg: [5, 10], acc: 0.8, stat: 'strength', info: 'Solid hit. Uses Strength.' },
  kick:   { icon: 'kick', name: 'Kick', cost: 14, dmg: [7, 13], acc: 0.7, stat: 'strength', info: 'Heavy but easy to dodge.' },
  guard:  { icon: 'shield', name: 'Guard', cost: -12, dmg: [0, 0], acc: 1, guard: true, info: 'Halve the next hit and recover stamina.' },
  qi_palm:{ icon: 'cultivation', name: 'Qi Palm', cost: 4, qi: 15, dmg: [12, 20], acc: 0.9, stat: 'qi', info: 'Channel Qi into a palm strike. Needs Qi Condensation.', realm: 1 },
  flame_palm:  { icon: 'fire', name: 'Burning Palm', cost: 6, qi: 25, dmg: [18, 28], acc: 0.85, stat: 'qi', burn: 3, info: 'Sets the enemy alight for 2 turns.' },
  river_step:  { icon: 'water', name: 'Flowing River Step', cost: 2, qi: 12, dmg: [6, 10], acc: 1, stat: 'qi', evade: true, info: 'Strike and become hard to hit next turn.' },
  thunder_fist:{ icon: 'lightning', name: 'Nine Thunder Fist', cost: 10, qi: 40, dmg: [30, 44], acc: 0.8, stat: 'qi', stun: 0.3, info: 'May stun. Huge damage.' },
  iron_skin:   { icon: 'metal', name: 'Iron Skin', cost: 0, qi: 20, dmg: [0, 0], acc: 1, armor: 3, info: 'Reduce incoming damage for 3 turns.' },
  blood_drain: { icon: 'demon', name: 'Blood Drain', cost: 6, qi: 20, dmg: [14, 22], acc: 0.85, stat: 'qi', drain: 0.5, info: 'Heals you for half the damage. Demonic.' },
};
export const BASE_MOVES = ['jab', 'punch', 'kick', 'guard'];
// Overall difficulty: enemies get this much more HP and hit this much harder.
export const DIFFICULTY = 1.5;

// Enemies by gate rank / encounter. lvl scales stats.
export const ENEMIES = [
  { id: 'bully', mini: 'dodge', name: 'School Bully', kind: 'human', realm: 0, hp: 30, str: 30, agi: 25, moves: ['slap', 'punch'] },
  { id: 'thug', mini: 'dodge', name: 'Street Thug', kind: 'human', realm: 0, hp: 45, str: 45, agi: 35, moves: ['jab', 'punch', 'kick'] },
  { id: 'gangster', mini: 'qi_clash', name: 'Crimson Lotus Thug', kind: 'human', realm: 1, hp: 70, str: 50, agi: 45, moves: ['jab', 'kick', 'qi_palm'] },
  { id: 'hungry_ghost', mini: 'seal', name: 'Hungry Ghost (饿鬼)', kind: 'spirit', realm: 1, hp: 60, str: 40, agi: 50, moves: ['slap', 'blood_drain'] },
  { id: 'jiangshi', mini: 'breath', name: 'Jiangshi (僵尸)', kind: 'spirit', realm: 1, hp: 110, str: 65, agi: 15, moves: ['punch', 'kick'] },
  { id: 'fox_spirit', mini: 'seal', name: 'Huli Jing (狐狸精)', kind: 'spirit', realm: 2, hp: 120, str: 45, agi: 80, moves: ['jab', 'flame_palm', 'river_step'] },
  { id: 'demonic', mini: 'qi_clash', name: 'Demonic Cultivator', kind: 'human', realm: 2, hp: 160, str: 70, agi: 60, moves: ['punch', 'blood_drain', 'flame_palm'] },
  { id: 'corrupt_soul', mini: 'seal', name: 'Corrupt Soul', kind: 'spirit', realm: 2, hp: 140, str: 60, agi: 55, moves: ['qi_palm', 'blood_drain'] },
  { id: 'yaoguai', mini: 'weakpoint', name: 'Mountain Yaoguai (妖怪)', kind: 'spirit', realm: 3, hp: 320, str: 95, agi: 50, moves: ['kick', 'thunder_fist', 'guard'] },
  { id: 'ghost_king', mini: 'seal', name: 'Ghost King of the Gate', kind: 'spirit', realm: 4, hp: 700, str: 120, agi: 80, moves: ['thunder_fist', 'blood_drain', 'flame_palm'] },
  { id: 'spirit_wolf', mini: 'dodge', name: 'Spirit Wolf', kind: 'beast', realm: 1, hp: 70, str: 50, agi: 70, moves: ['jab', 'kick'] },
  { id: 'tiger_beast', mini: 'dodge', name: 'White Tiger Beast', kind: 'beast', realm: 2, hp: 170, str: 80, agi: 65, moves: ['punch', 'kick', 'guard'] },
  { id: 'stone_golem', mini: 'weakpoint', name: 'Stone Golem', kind: 'construct', realm: 2, hp: 260, str: 85, agi: 10, moves: ['punch', 'iron_skin'] },
  { id: 'drowned_ghost', mini: 'breath', name: 'Drowned Ghost (水鬼)', kind: 'spirit', realm: 1, hp: 80, str: 45, agi: 55, moves: ['slap', 'blood_drain'] },
  { id: 'blood_cultist', mini: 'qi_clash', name: 'Blood Sea Cultist', kind: 'human', realm: 2, hp: 150, str: 65, agi: 60, moves: ['punch', 'blood_drain', 'qi_palm'] },
  { id: 'young_dragon', mini: 'weakpoint', name: 'Young Flood Dragon (蛟)', kind: 'beast', realm: 4, hp: 650, str: 130, agi: 70, moves: ['thunder_fist', 'flame_palm', 'kick'] },
  { id: 'tribulation', mini: 'qi_clash', name: 'Heavenly Tribulation', kind: 'heaven', realm: 0, hp: 100, str: 60, agi: 60, moves: ['thunder_fist', 'qi_palm'] },
];
export const GATE_RANKS = [
  { rank: 'E', pool: ['hungry_ghost', 'thug'], fights: 2, realm: 0, color: '#9a9a9a' },
  { rank: 'D', pool: ['hungry_ghost', 'jiangshi', 'gangster'], fights: 2, realm: 1, color: '#6fd36f' },
  { rank: 'C', pool: ['jiangshi', 'fox_spirit', 'corrupt_soul'], fights: 3, realm: 2, color: '#4fa3ff' },
  { rank: 'B', pool: ['demonic', 'corrupt_soul', 'fox_spirit'], fights: 3, realm: 2, color: '#b18cff' },
  { rank: 'A', pool: ['yaoguai', 'demonic'], fights: 3, realm: 3, color: '#ffb02e' },
  { rank: 'S', pool: ['yaoguai', 'ghost_king'], fights: 3, realm: 4, color: '#ff4f4f' },
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
    loot: { spirit_stone: 30, calm_incense: 18, trib_talisman: 8, spirit_herb: 15, heart_pill: 6, manual: 8, gold: 15 }, desc: 'Incense smoke and whispering spirits.' },
  { id: 'den', name: 'Spirit Beast Den', icon: 'claw', ranks: 'EDCBA', pool: ['spirit_wolf', 'tiger_beast'], boss: { E: 'spirit_wolf', D: 'spirit_wolf', C: 'tiger_beast', B: 'tiger_beast', A: 'yaoguai' },
    loot: { beast_core: 40, spirit_herb: 20, cloth: 10, marrow_pill: 6, fang_necklace: 4, gold: 12 }, desc: 'Claw marks and bones. Beast cores everywhere.' },
  { id: 'altar', name: 'Demonic Altar', icon: 'demon', ranks: 'DCBAS', pool: ['blood_cultist', 'demonic', 'corrupt_soul'], boss: { D: 'blood_cultist', C: 'demonic', B: 'demonic', A: 'demonic', S: 'ghost_king' },
    loot: { demonic_core: 22, spirit_stone: 20, qi_pill: 20, purity_pill: 6, manual: 12, gold: 20 }, desc: 'Blood-soaked stones. Demonic cultivators guard their secrets.' },
  { id: 'tomb', name: 'Flooded Tomb', icon: 'water', ranks: 'EDCB', pool: ['jiangshi', 'drowned_ghost'], boss: { E: 'drowned_ghost', D: 'jiangshi', C: 'jiangshi', B: 'jiangshi' },
    loot: { ginseng: 8, spirit_herb: 25, cloth: 15, heal_pill: 20, mending_salve: 8, gold: 25 }, desc: 'Ancient burial chambers, half underwater.' },
  { id: 'mine', name: 'Spirit Iron Mine', icon: 'pickaxe', ranks: 'DCBA', pool: ['stone_golem', 'thug', 'spirit_wolf'], boss: { D: 'stone_golem', C: 'stone_golem', B: 'stone_golem', A: 'stone_golem' },
    loot: { iron_ore: 40, spirit_stone: 25, iron_sword: 6, iron_mail: 4, spirit_blade: 2, gold: 15 }, desc: 'Collapsed tunnels and animated stone.' },
  { id: 'rift', name: 'Dragon Rift', icon: 'fire', ranks: 'AS', pool: ['tiger_beast', 'yaoguai'], boss: { A: 'young_dragon', S: 'young_dragon' },
    loot: { dragon_scale: 25, foundation_pill: 12, spirit_stone: 25, dragon_vest: 4, ginseng: 10, gold: 20 }, desc: 'Heat shimmer and scales the size of plates.' },
];
export function makeGate(rank) {
  const types = GATE_TYPES.filter(t => t.ranks.includes(rank));
  const t = types[Math.floor(Math.random() * types.length)];
  return { rank, type: t.id, years: 1 + Math.floor(Math.random() * 4) };
}
