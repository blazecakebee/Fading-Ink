// Combat moves. cost = stamina, qi = qi cost. dmg = [min,max] base, scaled by stats & realm power.
export const MOVES = {
  slap:   { name: 'Slap', cost: 4, dmg: [2, 4], acc: 0.95, stat: 'agility', info: 'Fast, cheap, weak. Builds momentum.' , mom: 1 },
  jab:    { name: 'Jab', cost: 6, dmg: [3, 6], acc: 0.9, stat: 'agility', info: 'Quick strike. Builds momentum.', mom: 1 },
  punch:  { name: 'Punch', cost: 10, dmg: [5, 10], acc: 0.8, stat: 'strength', info: 'Solid hit. Uses Strength.' },
  kick:   { name: 'Kick', cost: 14, dmg: [7, 13], acc: 0.7, stat: 'strength', info: 'Heavy but easy to dodge.' },
  guard:  { name: 'Guard', cost: -12, dmg: [0, 0], acc: 1, guard: true, info: 'Halve the next hit and recover stamina.' },
  qi_palm:{ name: 'Qi Palm', cost: 4, qi: 15, dmg: [12, 20], acc: 0.9, stat: 'qi', info: 'Channel Qi into a palm strike. Needs Qi Condensation.', realm: 1 },
  flame_palm:  { name: 'Burning Palm', cost: 6, qi: 25, dmg: [18, 28], acc: 0.85, stat: 'qi', burn: 3, info: 'Sets the enemy alight for 2 turns.' },
  river_step:  { name: 'Flowing River Step', cost: 2, qi: 12, dmg: [6, 10], acc: 1, stat: 'qi', evade: true, info: 'Strike and become hard to hit next turn.' },
  thunder_fist:{ name: 'Nine Thunder Fist', cost: 10, qi: 40, dmg: [30, 44], acc: 0.8, stat: 'qi', stun: 0.3, info: 'May stun. Huge damage.' },
  iron_skin:   { name: 'Iron Skin', cost: 0, qi: 20, dmg: [0, 0], acc: 1, armor: 3, info: 'Reduce incoming damage for 3 turns.' },
  blood_drain: { name: 'Blood Drain', cost: 6, qi: 20, dmg: [14, 22], acc: 0.85, stat: 'qi', drain: 0.5, info: 'Heals you for half the damage. Demonic.' },
};
export const BASE_MOVES = ['jab', 'punch', 'kick', 'guard'];

// Enemies by gate rank / encounter. lvl scales stats.
export const ENEMIES = [
  { id: 'bully', name: 'School Bully', kind: 'human', realm: 0, hp: 30, str: 30, agi: 25, moves: ['slap', 'punch'] },
  { id: 'thug', name: 'Street Thug', kind: 'human', realm: 0, hp: 45, str: 45, agi: 35, moves: ['jab', 'punch', 'kick'] },
  { id: 'gangster', name: 'Crimson Lotus Thug', kind: 'human', realm: 1, hp: 70, str: 50, agi: 45, moves: ['jab', 'kick', 'qi_palm'] },
  { id: 'hungry_ghost', name: 'Hungry Ghost (饿鬼)', kind: 'spirit', realm: 1, hp: 60, str: 40, agi: 50, moves: ['slap', 'blood_drain'] },
  { id: 'jiangshi', name: 'Jiangshi (僵尸)', kind: 'spirit', realm: 1, hp: 110, str: 65, agi: 15, moves: ['punch', 'kick'] },
  { id: 'fox_spirit', name: 'Huli Jing (狐狸精)', kind: 'spirit', realm: 2, hp: 120, str: 45, agi: 80, moves: ['jab', 'flame_palm', 'river_step'] },
  { id: 'demonic', name: 'Demonic Cultivator', kind: 'human', realm: 2, hp: 160, str: 70, agi: 60, moves: ['punch', 'blood_drain', 'flame_palm'] },
  { id: 'corrupt_soul', name: 'Corrupt Soul', kind: 'spirit', realm: 2, hp: 140, str: 60, agi: 55, moves: ['qi_palm', 'blood_drain'] },
  { id: 'yaoguai', name: 'Mountain Yaoguai (妖怪)', kind: 'spirit', realm: 3, hp: 320, str: 95, agi: 50, moves: ['kick', 'thunder_fist', 'guard'] },
  { id: 'ghost_king', name: 'Ghost King of the Gate', kind: 'spirit', realm: 4, hp: 700, str: 120, agi: 80, moves: ['thunder_fist', 'blood_drain', 'flame_palm'] },
  { id: 'tribulation', name: 'Heavenly Tribulation', kind: 'heaven', realm: 0, hp: 100, str: 60, agi: 60, moves: ['thunder_fist', 'qi_palm'] },
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
  { id: 'demonic_core', name: 'Demonic Core', icon: 'demon', w: 4, use: 'devour' },
  { id: 'gold', name: 'Gold Pouch', icon: 'market', w: 25, use: 'money' },
];
