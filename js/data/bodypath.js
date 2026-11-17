// v0.7.9: nerfed — each tier is ~10% weaker than the matching Qi realm (stages make the gap ~20%) and lives shorter.
// v0.7.8: 13 tiers. The Unbound now stands level with Immortal Ascension.
// The Severed Path: reject Qi entirely and temper the body until it rivals cultivators.
// Each tier counts as a cultivation realm (eq) for power, stat caps, presence, Gates and the Guild —
// but the body path gives far less lifespan, no Qi arts, no meditation and no sects that teach Qi.
export const BODY_TIERS = [
  { id: 'b0', glyph: '人', name: 'Ordinary Body', eq: 0, cap: 100, life: 0, power: 1, need: 60, color: '#9a8f80' },
  { id: 'b1', glyph: '鍛', name: 'Tempered Flesh', eq: 1, cap: 115, life: 2, power: 1.2, need: 160, color: '#d9a36a' },
  { id: 'b2', glyph: '鐵', name: 'Iron Bone', eq: 2, cap: 135, life: 4, power: 1.45, need: 300, color: '#a9b3bf' },
  { id: 'b3', glyph: '鋼', name: 'Steel Sinew', eq: 3, cap: 160, life: 6, power: 2.7, need: 520, color: '#cfd8e3' },
  { id: 'b4', glyph: '岩', name: 'Bedrock Body', eq: 4, cap: 200, life: 8, power: 5.4, need: 850, color: '#b08a5a' },
  { id: 'b5', glyph: '巨', name: 'Titan Frame', eq: 5, cap: 230, life: 9, power: 8.6, need: 1300, color: '#e07a4a' },
  { id: 'b6', glyph: '磐', name: 'Unbreakable Body', eq: 6, cap: 260, life: 10, power: 10.8, need: 1900, color: '#ffb02e' },
  { id: 'b7', glyph: '逆', name: 'Heaven-Defying Body', eq: 7, cap: 300, life: 11, power: 16, need: 2700, color: '#ff4f4f' },
  { id: 'b8', glyph: '破', name: 'Sky-Breaker Body', eq: 8, cap: 335, life: 12, power: 22.5, need: 3800, color: '#ff4fd8' },
  { id: 'b9', glyph: '渡', name: 'Void-Walker Body', eq: 9, cap: 370, life: 12, power: 30, need: 5000, color: '#8fa8ff' },
  { id: 'b10', glyph: '擔', name: 'World-Bearing Body', eq: 10, cap: 400, life: 13, power: 38, need: 6500, color: '#6fe0d0' },
  { id: 'b11', glyph: '霸', name: 'Titan Sovereign', eq: 11, cap: 440, life: 14, power: 50, need: 8500, color: '#ffd36f' },
  { id: 'b12', glyph: '無', name: 'The Unbound', eq: 12, cap: 500, life: 15, power: 105, need: Infinity, color: '#ffffff' },
];
// signature techniques, unlocked by tier (they scale fully with the body's power, unlike ordinary punches)
export const BODY_MOVES = {
  phantom_step:     { tier: 1, icon: 'kick', name: 'Phantom Step', cost: 6, dmg: [8, 12], acc: 1, stat: 'agility', body: true, evade: true, info: 'Too fast to follow. Strike and become hard to hit.' },
  bone_crush:       { tier: 2, icon: 'fist', name: 'Bone Crusher', cost: 10, dmg: [16, 24], acc: 0.88, stat: 'strength', body: true, pierce: true, info: 'Ignores Guard and Iron Skin.' },
  mountain_breaker: { tier: 3, icon: 'hammer', name: 'Mountain Breaker', cost: 14, dmg: [24, 36], acc: 0.8, stat: 'strength', body: true, stun: 0.25, info: 'A blow that can split stone. May stun.' },
  blood_rush:       { tier: 5, icon: 'heart', name: 'Blood Rush', cost: -20, dmg: [0, 0], acc: 1, guard: true, info: 'Force your heart to race: recover stamina and brace.' },
  heaven_splitter:  { tier: 9, icon: 'lightning', name: 'Heaven Splitter', cost: 26, dmg: [62, 88], acc: 0.8, stat: 'strength', body: true, pierce: true, info: 'A blow that splits clouds. Ignores defences.' },
  unbound_strike:   { tier: 6, icon: 'star', name: 'Unbound Strike', cost: 22, dmg: [42, 60], acc: 0.84, stat: 'strength', body: true, pierce: true, stun: 0.3, info: 'Everything you are in one strike. Ignores defences, may stun.' },
  // v0.9.25 ten more Severed techniques (unlock as your body tier rises)
  bull_charge:      { tier: 1, icon: 'kick', name: 'Bull Charge', cost: 9, dmg: [10, 15], acc: 0.85, stat: 'strength', body: true, stun: 0.15, info: 'Shoulder-first through their guard. May stun.' },
  whirlwind_kick:   { tier: 2, icon: 'combat', name: 'Whirlwind Kick', cost: 12, dmg: [7, 10], hits: 2, acc: 0.9, stat: 'agility', body: true, info: 'Spin and strike twice.' },
  iron_will:        { tier: 2, icon: 'shield', name: 'Iron Will', cost: -10, dmg: [0, 0], acc: 1, armor: 2, info: 'Clench every muscle: take half damage for 2 hits and catch your breath.' },
  pressure_point:   { tier: 3, icon: 'claw', name: 'Pressure Point Strike', cost: 8, dmg: [10, 14], acc: 0.95, stat: 'agility', body: true, sap: 35, weaken: 2, info: 'A finger to the nerve: drains 35 stamina and weakens their blows for 2 turns.' },
  earthshaker:      { tier: 4, icon: 'hammer', name: 'Earthshaker Stomp', cost: 16, dmg: [28, 40], acc: 0.82, stat: 'strength', body: true, stun: 0.35, info: 'The ground cracks under them. May stun.' },
  hundred_fists:    { tier: 5, icon: 'fist', name: 'Hundred Fists', cost: 18, dmg: [10, 14], hits: 4, acc: 0.78, stat: 'agility', body: true, info: 'A blur of four strikes.' },
  second_wind:      { tier: 6, icon: 'heart', name: 'Second Wind', cost: -30, dmg: [0, 0], acc: 1, heal: 0.15, info: 'Breathe deep: heal 15% of your max HP and recover stamina.' },
  titan_grip:       { tier: 7, icon: 'fist', name: 'Titan Grip', cost: 20, dmg: [46, 62], acc: 0.85, stat: 'strength', body: true, shatter: true, weaken: 2, info: 'Seize and crush: breaks Guard and Iron Skin and weakens them for 2 turns.' },
  meteor_dive:      { tier: 8, icon: 'star', name: 'Meteor Dive', cost: 28, dmg: [58, 80], acc: 0.76, stat: 'strength', body: true, pierce: true, stun: 0.3, info: 'Leap into the sky and come down like a meteor. Ignores defences.' },
  world_ender:      { tier: 11, icon: 'sun', name: 'World-Ending Fist', cost: 34, dmg: [100, 140], acc: 0.8, stat: 'strength', body: true, pierce: true, stun: 0.4, info: 'One fist with the weight of the world behind it.' },
};
