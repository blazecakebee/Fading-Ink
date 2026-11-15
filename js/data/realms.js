// Cultivation realms. Each major realm has 9 stages (Mortal has 1).
// maxQi = Qi needed to attempt the next stage. life = lifespan bonus in years. power = combat multiplier.
// trib = major breakthrough INTO this realm triggers a Heavenly Tribulation fight.
// cap = highest any trainable stat can go in this realm. Gains slow down past 70% of the cap (soft cap).
export const REALMS = [
  { id: 'mortal', cap: 100, name: 'Mortal', stages: 1, maxQi: 40, life: 0, power: 1, color: '#9a8f80' },
  { id: 'qi', cap: 120, name: 'Qi Condensation', stages: 5, maxQi: 100, life: 10, power: 1.6, color: '#7fd1ff', req: { age: 6 } },
  { id: 'foundation', cap: 150, name: 'Foundation Establishment', stages: 5, maxQi: 400, life: 40, power: 3, color: '#7fffb0', req: { pill: 'foundation_pill' }, trib: 1 },
  { id: 'core', cap: 200, name: 'Core Formation', stages: 5, maxQi: 1500, life: 100, power: 6, color: '#ffd36f', trib: 2 },
  { id: 'nascent', cap: 260, name: 'Nascent Soul', stages: 5, maxQi: 6000, life: 250, power: 12, color: '#ff8fd0', trib: 3 },
  { id: 'severing', cap: 340, name: 'Spirit Severing', stages: 5, maxQi: 20000, life: 500, power: 25, color: '#c39bff', trib: 4 },
  { id: 'dao', cap: 450, name: 'Dao Seeking', stages: 5, maxQi: 80000, life: 1000, power: 50, color: '#ffffff', trib: 5 },
  { id: 'immortal', cap: 600, name: 'Immortal Ascension', stages: 1, maxQi: Infinity, life: 5000, power: 120, color: '#fff4b0', trib: 7 },
];

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
  { id: 'moonlit', name: 'Moonlit Absorption', qi: 1.4, desc: '+40% Qi, but long nights alone (-2 Mood per session).', side: { mood: -2 } },
  { id: 'heart_fire', name: 'Heart-Fire Refinement', qi: 1.3, desc: '+30% Qi, but it burns (+3 Stress per session).', side: { stress: 3 } },
  { id: 'thunder', name: 'Thunder Body Tempering', qi: 1.15, desc: '+15% Qi, +2 Strength per session, -2 Health.', side: { strength: 2, health: -2 } },
  { id: 'lotus', name: 'Lotus Heart Sutra', qi: 1.1, desc: '+10% Qi, +4 Mood per session; slowly heals the mind (5% chance to ease a mental condition).', side: { mood: 4 }, mind: 0.05 },
  { id: 'sword_intent', name: 'Sword Intent Contemplation', qi: 1.05, desc: '+5% Qi, +2 Agility per session. Favoured by sword cultivators.', side: { agility: 2 } },
  { id: 'starfall', name: 'Starfall Meridian Method', qi: 1.2, merid: 0.1, desc: '+20% Qi and +10% meridian opening chance.' },
  { id: 'dual', name: 'Yin-Yang Dual Cultivation', qi: 1.2, dual: 0.3, desc: '+20% Qi, plus another +30% while you have a cultivator partner.' },
  { id: 'void', name: 'Void Stillness Scripture', qi: 1.5, bt: 0.05, minRealm: 3, desc: '+50% Qi and +5% breakthrough chance. Needs Core Formation to practise.' },
  { id: 'blood_sea', name: 'Blood Sea Method (demonic)', qi: 1.7, demonic: true, desc: '+70% Qi, -4 Health per session, 5% chance of Qi corruption each time.', side: { health: -4 } },
];
