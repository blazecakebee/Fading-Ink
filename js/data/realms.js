// Cultivation realms.
// Each major realm has 5 stages (Mortal and Immortal Ascension have 1). glyph = the character shown on the realm ladder.
// Nobody lives forever: even an Immortal's years run out (~700 years at the very peak).
// maxQi = Qi needed to attempt the next stage. life = lifespan bonus in years. power = combat multiplier.
// trib = major breakthrough INTO this realm triggers a Heavenly Tribulation fight.
// cap = highest any trainable stat can go in this realm. Gains slow down past 70% of the cap (soft cap).
export const REALMS = [
  { id: 'mortal', glyph: '凡', cap: 100, name: 'Mortal', stages: 1, maxQi: 40, life: 0, power: 1, color: '#9a8f80' },
  { id: 'refining', glyph: '煉', cap: 110, name: 'Qi Refining', stages: 5, maxQi: 60, life: 2, power: 1.3, color: '#a9d4ff' },
  { id: 'qi', glyph: '結', cap: 120, name: 'Qi Condensation', stages: 5, maxQi: 100, life: 5, power: 1.6, color: '#7fd1ff' },
  { id: 'foundation', glyph: '築', cap: 150, name: 'Foundation Establishment', stages: 5, maxQi: 400, life: 12, power: 3, color: '#7fffb0', req: { pill: 'foundation_pill' }, trib: 1 },
  { id: 'core', glyph: '金', cap: 200, name: 'Golden Core', stages: 5, maxQi: 1500, life: 25, power: 6, color: '#ffd36f', trib: 2 },
  { id: 'origin', glyph: '具', cap: 230, name: 'Origin Spirit', stages: 5, maxQi: 3500, life: 35, power: 9, color: '#b07fff', trib: 2 },
  { id: 'nascent', glyph: '元', cap: 260, name: 'Nascent Soul', stages: 5, maxQi: 7000, life: 45, power: 12, color: '#ff8fd0', trib: 3 },
  { id: 'soulform', glyph: '化', cap: 300, name: 'Soul Formation', stages: 5, maxQi: 14000, life: 55, power: 18, color: '#ff6a5a', trib: 3 },
  { id: 'severing', glyph: '斬', cap: 340, name: 'Spirit Severing', stages: 5, maxQi: 25000, life: 65, power: 25, color: '#c39bff', trib: 4 },
  { id: 'void', glyph: '虛', cap: 380, name: 'Void Refinement', stages: 5, maxQi: 40000, life: 75, power: 33, color: '#8fa8ff', trib: 4 },
  { id: 'integration', glyph: '合', cap: 420, name: 'Body Integration', stages: 5, maxQi: 65000, life: 85, power: 42, color: '#6fe0d0', trib: 5 },
  { id: 'dao', glyph: '道', cap: 480, name: 'Dao Seeking', stages: 5, maxQi: 100000, life: 100, power: 55, color: '#ffffff', trib: 5 },
  { id: 'immortal', glyph: '羽', cap: 600, name: 'Immortal Ascension', stages: 1, maxQi: Infinity, life: 150, power: 120, color: '#fff4b0', trib: 7 },
];
export const RI = Object.fromEntries(REALMS.map((r, i) => [r.id, i]));   // realm index by id, e.g. RI.foundation
// Saves from before v0.5.8 used the old 8-realm list; this maps old index → new index.
export const OLD_REALM_MAP = [0, 2, 3, 4, 6, 8, 11, 12];
// v0.6.0 inserted Void Refinement and Body Integration before Dao Seeking (v0.5.8–0.5.9 index → new index).
export const V2_REALM_MAP = [0, 1, 2, 3, 4, 5, 6, 7, 8, 11, 12];

export const ELEMENTS = [
  { id: 'fire', name: 'Fire', icon: 'fire', color: '#ff6a3d' },
  { id: 'water', name: 'Water', icon: 'water', color: '#4fb3ff' },
  { id: 'wood', name: 'Wood', icon: 'wood', color: '#6fd36f' },
  { id: 'metal', name: 'Metal', icon: 'metal', color: '#d0d6e0' },
  { id: 'earth', name: 'Earth', icon: 'earth', color: '#c69a5b' },
  { id: 'lightning', name: 'Lightning', icon: 'lightning', color: '#b18cff' },
];

// Sects and underground gangs that hoard cultivation knowledge.
export const SECTS = [
  { id: 'azure', name: 'Azure Cloud Sect', kind: 'sect', align: 'orthodox', req: { smarts: 50 }, desc: 'Ancient orthodox sect hiding behind a tea-house chain.' },
  { id: 'crimson', name: 'Crimson Lotus Society', kind: 'gang', align: 'demonic', req: { strength: 45 }, desc: 'A street gang that feeds members blood pills. Fast power, high cost.' },
  { id: 'ink', name: 'The Fading Ink Pavilion', kind: 'sect', align: 'hidden', req: { trait: 'ink_touched' }, desc: 'A library that only exists for those who can read it.' },
  { id: 'iron', name: 'Iron Fist Syndicate', kind: 'gang', align: 'neutral', req: { strength: 40 }, desc: 'Fight clubs and protection rackets. Body-tempering techniques.' },
];

export const MANUALS = [
  { id: 'breathing', name: 'Basic Breathing Scroll', qi: 1.0, tech: null, desc: 'The first step. Lets you gather Qi.' },
  { id: 'flame_palm', name: 'Burning Palm Manual', qi: 1.1, tech: 'flame_palm', elem: 'fire' },
  { id: 'river_step', name: 'Flowing River Steps', qi: 1.1, tech: 'river_step', elem: 'water' },
  { id: 'thunder_fist', name: 'Nine Thunder Fist', qi: 1.2, tech: 'thunder_fist', elem: 'lightning' },
  { id: 'iron_skin', name: 'Iron Skin Body Art', qi: 1.05, tech: 'iron_skin', elem: 'metal' },
  { id: 'blood_art', name: 'Blood Refining Art (demonic)', qi: 1.6, tech: 'blood_drain', elem: 'fire', demonic: true },
];

// Meditation / cultivation methods. You can know several but cultivate with one at a time.
// qi = Qi gain multiplier; merid / bt = bonus to meridian / breakthrough chance; side(c) = extra effect each session.
export const METHODS = [
  { id: 'basic', name: 'Basic Breathing', qi: 1, desc: 'Steady and safe. No side effects.' },
  { id: 'turtle', name: 'Turtle Breath Method', qi: 1.1, desc: '+10% Qi. Slow breaths melt stress (-5 Stress per session).', side: { stress: -5 } },
  { id: 'five_elements', name: 'Five Elements Cycle', qi: 1.25, desc: '+25% Qi by circulating all five phases in turn.' },
  { id: 'moonlit', name: 'Moonlit Absorption', qi: 1.4, desc: '+40% Qi, but long nights alone (-2 Happiness per session).', side: { happiness: -2 } },
  { id: 'heart_fire', name: 'Heart-Fire Refinement', qi: 1.3, desc: '+30% Qi, but it burns (+3 Stress per session).', side: { stress: 3 } },
  { id: 'thunder', name: 'Thunder Body Tempering', qi: 1.15, desc: '+15% Qi, +2 Strength per session, -2 Health.', side: { strength: 2, health: -2 } },
  { id: 'lotus', name: 'Lotus Heart Sutra', qi: 1.1, desc: '+10% Qi, +4 Happiness per session; slowly heals the mind (5% chance to ease a mental condition).', side: { happiness: 4 }, mind: 0.05 },
  { id: 'sword_intent', name: 'Sword Intent Contemplation', qi: 1.05, desc: '+5% Qi, +2 Agility per session. Favoured by sword cultivators.', side: { agility: 2 } },
  { id: 'starfall', name: 'Starfall Meridian Method', qi: 1.2, merid: 0.1, desc: '+20% Qi and +10% meridian opening chance.' },
  { id: 'dual', name: 'Yin-Yang Dual Cultivation', qi: 1.2, dual: 0.3, desc: '+20% Qi, plus another +30% while you have a cultivator partner.' },
  { id: 'void', name: 'Void Stillness Scripture', qi: 1.5, bt: 0.05, minRealm: 4, desc: '+50% Qi and +5% breakthrough chance. Needs Core Formation to practise.' },
  { id: 'myriad_souls', name: 'Myriad Souls Refinement (forbidden)', qi: 0.9, demonic: true, hidden: true, desc: '-10% Qi from meditation, but unlocks Blood Sacrifice: take a life for a huge surge of Qi and a better next breakthrough. It scars the mind.' },
  { id: 'blood_sea', name: 'Blood Sea Method (demonic)', qi: 1.7, demonic: true, desc: '+70% Qi, -4 Health per session, 5% chance of Qi corruption each time.', side: { health: -4 } },
];
