// The Severed Path: reject Qi entirely and temper the body until it rivals cultivators.
// Each tier counts as a cultivation realm (eq) for power, stat caps, presence, Gates and the Guild —
// but the body path gives far less lifespan, no Qi arts, no meditation and no sects that teach Qi.
export const BODY_TIERS = [
  { id: 'b0', glyph: '人', name: 'Ordinary Body', eq: 0, cap: 100, life: 0, power: 1, need: 60, color: '#9a8f80' },
  { id: 'b1', glyph: '鍛', name: 'Tempered Flesh', eq: 1, cap: 120, life: 3, power: 1.4, need: 130, color: '#d9a36a' },
  { id: 'b2', glyph: '鐵', name: 'Iron Bone', eq: 2, cap: 140, life: 5, power: 1.9, need: 230, color: '#a9b3bf' },
  { id: 'b3', glyph: '鋼', name: 'Steel Sinew', eq: 3, cap: 170, life: 8, power: 3.4, need: 380, color: '#cfd8e3' },
  { id: 'b4', glyph: '岩', name: 'Bedrock Body', eq: 4, cap: 220, life: 10, power: 6.5, need: 600, color: '#b08a5a' },
  { id: 'b5', glyph: '巨', name: 'Titan Frame', eq: 5, cap: 260, life: 12, power: 9.5, need: 900, color: '#e07a4a' },
  { id: 'b6', glyph: '磐', name: 'Unbreakable Body', eq: 6, cap: 300, life: 14, power: 13, need: 1300, color: '#ffb02e' },
  { id: 'b7', glyph: '逆', name: 'Heaven-Defying Body', eq: 7, cap: 340, life: 16, power: 19, need: 1800, color: '#ff4f4f' },
  { id: 'b8', glyph: '破', name: 'Sky-Breaker Body', eq: 8, cap: 390, life: 18, power: 27, need: 2600, color: '#ff4fd8' },
  { id: 'b9', glyph: '無', name: 'The Unbound', eq: 10, cap: 470, life: 22, power: 46, need: Infinity, color: '#ffffff' },
];
// signature techniques, unlocked by tier (they scale fully with the body's power, unlike ordinary punches)
export const BODY_MOVES = {
  phantom_step:     { tier: 1, icon: 'kick', name: 'Phantom Step', cost: 6, dmg: [8, 12], acc: 1, stat: 'agility', body: true, evade: true, info: 'Too fast to follow. Strike and become hard to hit.' },
  bone_crush:       { tier: 2, icon: 'fist', name: 'Bone Crusher', cost: 10, dmg: [16, 24], acc: 0.88, stat: 'strength', body: true, pierce: true, info: 'Ignores Guard and Iron Skin.' },
  mountain_breaker: { tier: 3, icon: 'hammer', name: 'Mountain Breaker', cost: 14, dmg: [24, 36], acc: 0.8, stat: 'strength', body: true, stun: 0.25, info: 'A blow that can split stone. May stun.' },
  blood_rush:       { tier: 5, icon: 'heart', name: 'Blood Rush', cost: -20, dmg: [0, 0], acc: 1, guard: true, info: 'Force your heart to race: recover stamina and brace.' },
  unbound_strike:   { tier: 6, icon: 'star', name: 'Unbound Strike', cost: 22, dmg: [44, 64], acc: 0.85, stat: 'strength', body: true, pierce: true, stun: 0.3, info: 'Everything you are in one strike. Ignores defences, may stun.' },
};
