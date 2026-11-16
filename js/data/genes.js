// Genetics. Everyone carries 3 mundane base genes. Cultivators can awaken dormant genes on a branching tree,
// spending Awakening points (1 per major realm, +1 at adulthood, rare Bloodline Essence).
// Some paths force you to accept a NEGATIVE gene as a bridge before the transcendent gene beyond it.
// Fields work like traits (multipliers / additive). Player gene cap: 3 base + 7 awakened. NPCs: 3 base, rarely 1–2 more.
export const BASE_GENES = {
  g_sturdy:   { name: 'Sturdy Bones', desc: '+1 Health a year.', heal: 1 },
  g_lean:     { name: 'Lean Muscle', desc: '+3% training gains.', train: 1.03 },
  g_sharp:    { name: 'Sharp Mind', desc: '+3% study gains.', study: 1.03 },
  g_calm:     { name: 'Calm Temperament', desc: 'Stress builds 3% slower.', stressMult: 0.97 },
  g_voice:    { name: 'Warm Voice', desc: '+3% closeness gains.', social: 1.03 },
  g_lungs:    { name: 'Deep Lungs', desc: '+2% Qi gains.', qi: 1.02 },
  g_twitch:   { name: 'Fast-Twitch Fibres', desc: '+2% combat power.', power: 1.02 },
  g_telomere: { name: 'Long Telomeres', desc: '+2 years of life.', life: 2 },
  g_thrift:   { name: 'Thrifty Instinct', desc: '+2% salary.', pay: 1.02 },
  g_owl:      { name: 'Light Sleeper', desc: '+2% study, stress builds 2% faster.', study: 1.02, stressMult: 1.02 },
  g_blood:    { name: 'Thick Blood', desc: '+1% combat power, +1 Health a year.', power: 1.01, heal: 1 },
  g_bonds:    { name: 'Social Wiring', desc: 'Best friend & partner bonuses +5%.', bondMult: 1.05 },
};
export const BASE_IDS = Object.keys(BASE_GENES);

// The awakening tree. x/y place nodes on a 4-column grid; req = genes needed first; realm = minimum realm index.
export const BRANCHES = [
  { id: 'body', name: 'Body', color: '#ff8a5a' },
  { id: 'mind', name: 'Mind', color: '#7fd1ff' },
  { id: 'spirit', name: 'Spirit', color: '#b18cff' },
  { id: 'blood', name: 'Blood', color: '#ff4f6a' },
];
export const TREE_GENES = {
  // Body
  b1:  { branch: 'body', row: 0, name: 'Dense Muscle', desc: '+6% training gains.', cost: 1, realm: 1, req: [], train: 1.06 },
  b2:  { branch: 'body', row: 1, name: 'Iron Marrow', desc: '+2 Health a year, +4% combat power.', cost: 2, realm: 3, req: ['b1'], heal: 2, power: 1.04 },
  bn:  { branch: 'body', row: 2, neg: true, name: 'Metabolic Furnace', desc: 'NEGATIVE: your body burns resources — -10% salary, -1 Health a year.', cost: 1, realm: 4, req: ['b2'], pay: 0.9, heal: -1 },
  t_body: { branch: 'body', row: 3, trans: true, name: 'Primordial Physique', desc: '+12% combat power, +3 Health a year, +8 years of life.', cost: 3, realm: 6, req: ['bn'], power: 1.12, heal: 3, life: 8 },
  // Mind
  m1:  { branch: 'mind', row: 0, name: 'Eidetic Memory', desc: '+7% study gains.', cost: 1, realm: 1, req: [], study: 1.07 },
  m2:  { branch: 'mind', row: 1, name: 'Lattice Mind', desc: '+6% study, +2% breakthrough.', cost: 2, realm: 3, req: ['m1'], study: 1.06, breakthrough: 0.02 },
  mn:  { branch: 'mind', row: 2, neg: true, name: 'Emotional Volatility', desc: 'NEGATIVE: stress builds 25% faster.', cost: 1, realm: 4, req: ['m2'], stressMult: 1.25 },
  t_mind: { branch: 'mind', row: 3, trans: true, name: 'Heavenly Insight', desc: '+6% breakthrough, +12% study.', cost: 3, realm: 7, req: ['mn'], breakthrough: 0.06, study: 1.12 },
  // Spirit
  s1:  { branch: 'spirit', row: 0, name: 'Open Channels', desc: '+5% Qi gains.', cost: 1, realm: 1, req: [], qi: 1.05 },
  s2:  { branch: 'spirit', row: 1, name: 'Spirit Root Resonance', desc: '+7% Qi gains.', cost: 2, realm: 3, req: ['s1'], qi: 1.07 },
  sn:  { branch: 'spirit', row: 2, neg: true, name: 'Fragile Meridians', desc: 'NEGATIVE: -4% breakthrough chance.', cost: 1, realm: 5, req: ['s2'], breakthrough: -0.04 },
  t_spirit: { branch: 'spirit', row: 3, trans: true, name: 'Chaos Spirit Root', desc: '+16% Qi gains, +3% breakthrough.', cost: 3, realm: 7, req: ['sn'], qi: 1.16, breakthrough: 0.03 },
  // Blood
  l1:  { branch: 'blood', row: 0, name: 'Kin Bond', desc: 'Best friend & partner bonuses +15%, +4% closeness.', cost: 1, realm: 1, req: [], bondMult: 1.15, social: 1.04 },
  l2:  { branch: 'blood', row: 1, name: 'Ancestral Echo', desc: '+4 years of life.', cost: 2, realm: 4, req: ['l1'], life: 4 },
  ln:  { branch: 'blood', row: 2, neg: true, name: 'Thin Blood', desc: 'NEGATIVE: -2 Health a year, injuries bleed more.', cost: 1, realm: 5, req: ['l2'], heal: -2 },
  t_blood: { branch: 'blood', row: 3, trans: true, name: 'Immortal Bloodline', desc: '+15 years of life, +2 Health a year. Passes to children more often.', cost: 3, realm: 8, req: ['ln'], life: 15, heal: 2 },
  // Cross-branch
  x1:  { branch: 'cross', row: 1, name: 'Predator Instinct', desc: '+6% combat power. Needs Dense Muscle and Open Channels.', cost: 2, realm: 2, req: ['b1', 's1'], power: 1.06 },
  // v0.8.7 deeper bloodline: a 5th tier past each transcendent gene (needs the realms beyond Immortal Ascension) and more cross genes
  u_body: { branch: 'body', row: 4, trans: true, name: 'Titan Ancestry', desc: '+8% combat power, +10% training.', cost: 4, realm: 13, req: ['t_body'], power: 1.08, train: 1.1 },
  u_mind: { branch: 'mind', row: 4, trans: true, name: 'Dao Comprehension', desc: '+5% breakthrough, -15% stress.', cost: 4, realm: 13, req: ['t_mind'], breakthrough: 0.05, stressMult: 0.85 },
  u_spirit: { branch: 'spirit', row: 4, trans: true, name: 'Origin Spirit Sea', desc: '+12% Qi gains, +5% Gate loot.', cost: 4, realm: 13, req: ['t_spirit'], qi: 1.12, loot: 1.05 },
  u_blood: { branch: 'blood', row: 4, trans: true, name: 'Eternal Lineage', desc: '+20 years of life. Your children start with more Awakening points.', cost: 4, realm: 14, req: ['t_blood'], life: 20 },
  x2:  { branch: 'cross', row: 2, name: 'Silver Tongue Blood', desc: '+6% closeness, +5% salary. Needs Eidetic Memory and Kin Bond.', cost: 2, realm: 3, req: ['m1', 'l1'], social: 1.06, pay: 1.05 },
  x3:  { branch: 'cross', row: 3, name: 'Alchemist\'s Blood', desc: '+10% pill potency, +8% crafting. Needs Lattice Mind and Spirit Root Resonance.', cost: 2, realm: 4, req: ['m2', 's2'], pill: 1.1, craft: 1.08 },
  x4:  { branch: 'cross', row: 4, name: 'Undying Will', desc: '+3 Health a year, heal 10% faster. Needs Iron Marrow and Ancestral Echo.', cost: 3, realm: 6, req: ['b2', 'l2'], heal: 3, healRate: 1.1 },
};
export const GENE = id => BASE_GENES[id] || TREE_GENES[id];
export const MAX_AWAKENED = 10; // v0.8.7: 10 strands
