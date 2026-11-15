// Cultivation realms. Each major realm has 9 stages (Mortal has 1).
// maxQi = Qi needed to attempt the next stage. life = lifespan bonus in years. power = combat multiplier.
// trib = major breakthrough INTO this realm triggers a Heavenly Tribulation fight.
export const REALMS = [
  { id: 'mortal', name: 'Mortal', stages: 1, maxQi: 40, life: 0, power: 1, color: '#9a8f80' },
  { id: 'qi', name: 'Qi Condensation', stages: 9, maxQi: 100, life: 10, power: 1.6, color: '#7fd1ff', req: { age: 6 } },
  { id: 'foundation', name: 'Foundation Establishment', stages: 9, maxQi: 400, life: 40, power: 3, color: '#7fffb0', req: { pill: 'foundation_pill' }, trib: 1 },
  { id: 'core', name: 'Core Formation', stages: 9, maxQi: 1500, life: 100, power: 6, color: '#ffd36f', trib: 2 },
  { id: 'nascent', name: 'Nascent Soul', stages: 9, maxQi: 6000, life: 250, power: 12, color: '#ff8fd0', trib: 3 },
  { id: 'severing', name: 'Spirit Severing', stages: 9, maxQi: 20000, life: 500, power: 25, color: '#c39bff', trib: 4 },
  { id: 'dao', name: 'Dao Seeking', stages: 9, maxQi: 80000, life: 1000, power: 50, color: '#ffffff', trib: 5 },
  { id: 'immortal', name: 'Immortal Ascension', stages: 1, maxQi: Infinity, life: 5000, power: 120, color: '#fff4b0', trib: 7 },
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
