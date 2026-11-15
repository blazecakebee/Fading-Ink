// Modular body: parts and organs in a tree. Hits land on outer parts by coverage; internal organs can be hit
// "through" the part that contains them. Each part feeds one or more capacities.
// hp = max HP of the part · cover = relative chance an outer hit lands here · inner = organ inside parent
// vital = destroyed → death · limb = can be severed (with everything below it) · bone = can fracture
// cap = capacities it contributes to (weights are shares of that capacity)
export const PARTS = [
  { id: 'head', name: 'Head', group: 'head', hp: 25, cover: 8, bone: true, cap: { consciousness: 0.2 } },
  { id: 'brain', name: 'Brain', group: 'head', parent: 'head', inner: true, hp: 10, vital: true, cap: { consciousness: 0.8 } },
  { id: 'eye_l', name: 'Left eye', group: 'head', parent: 'head', hp: 8, cover: 1, cap: { sight: 0.5 } },
  { id: 'eye_r', name: 'Right eye', group: 'head', parent: 'head', hp: 8, cover: 1, cap: { sight: 0.5 } },
  { id: 'jaw', name: 'Jaw', group: 'head', parent: 'head', hp: 15, cover: 2, bone: true, cap: { talking: 1 } },
  { id: 'neck', name: 'Neck', group: 'torso', hp: 20, cover: 4, cap: { breathing: 0.2 } },
  { id: 'torso', name: 'Torso', group: 'torso', hp: 45, cover: 30, cap: {} },
  { id: 'ribs', name: 'Ribcage', group: 'torso', parent: 'torso', inner: true, hp: 25, bone: true, cap: { breathing: 0.1 } },
  { id: 'spine', name: 'Spine', group: 'torso', parent: 'torso', inner: true, hp: 25, bone: true, cap: { moving: 0.3 } },
  { id: 'heart', name: 'Heart', group: 'torso', parent: 'torso', inner: true, hp: 15, vital: true, cap: { blood: 1 } },
  { id: 'lung_l', name: 'Left lung', group: 'torso', parent: 'torso', inner: true, hp: 15, cap: { breathing: 0.35 } },
  { id: 'lung_r', name: 'Right lung', group: 'torso', parent: 'torso', inner: true, hp: 15, cap: { breathing: 0.35 } },
  { id: 'liver', name: 'Liver', group: 'torso', parent: 'torso', inner: true, hp: 20, vital: true, cap: { filtration: 0.6 } },
  { id: 'kidney_l', name: 'Left kidney', group: 'torso', parent: 'torso', inner: true, hp: 12, cap: { filtration: 0.2 } },
  { id: 'kidney_r', name: 'Right kidney', group: 'torso', parent: 'torso', inner: true, hp: 12, cap: { filtration: 0.2 } },
  { id: 'stomach', name: 'Stomach', group: 'torso', parent: 'torso', inner: true, hp: 18, cap: { digestion: 1 } },
  { id: 'dantian', name: 'Dantian (Qi Center)', group: 'torso', parent: 'torso', inner: true, hp: 20, cap: { qi: 0.7 }, qiCore: true },
  { id: 'arm_l', name: 'Left arm', group: 'arms', hp: 30, cover: 10, limb: true, bone: true, cap: { manipulation: 0.25, qi: 0.05 } },
  { id: 'hand_l', name: 'Left hand', group: 'arms', parent: 'arm_l', hp: 15, cover: 3, limb: true, bone: true, cap: { manipulation: 0.25 } },
  { id: 'arm_r', name: 'Right arm', group: 'arms', hp: 30, cover: 10, limb: true, bone: true, cap: { manipulation: 0.25, qi: 0.05 } },
  { id: 'hand_r', name: 'Right hand', group: 'arms', parent: 'arm_r', hp: 15, cover: 3, limb: true, bone: true, cap: { manipulation: 0.25 } },
  { id: 'leg_l', name: 'Left leg', group: 'legs', hp: 35, cover: 10, limb: true, bone: true, cap: { moving: 0.25, qi: 0.05 } },
  { id: 'foot_l', name: 'Left foot', group: 'legs', parent: 'leg_l', hp: 15, cover: 3, limb: true, bone: true, cap: { moving: 0.1 } },
  { id: 'leg_r', name: 'Right leg', group: 'legs', hp: 35, cover: 10, limb: true, bone: true, cap: { moving: 0.25, qi: 0.05 } },
  { id: 'foot_r', name: 'Right foot', group: 'legs', parent: 'leg_r', hp: 15, cover: 3, limb: true, bone: true, cap: { moving: 0.1 } },
];
// meridians converge in the Dantian; limbs carry a little of the flow
export const PART_BY_ID = Object.fromEntries(PARTS.map(p => [p.id, p]));
export const GROUPS = {
  head: { name: 'Head', acc: -0.15, note: 'Harder to hit. Can stun, damage eyes or the brain.' },
  torso: { name: 'Torso', acc: 0.05, note: 'Easy to hit. Can reach the heart, lungs, organs or Dantian.' },
  arms: { name: 'Arms', acc: -0.05, note: 'Weakens their attacks. Strong blows can sever.' },
  legs: { name: 'Legs', acc: -0.05, note: 'Slows them down (less agility & dodging).' },
};
export const CAPACITIES = {
  consciousness: 'Consciousness', moving: 'Moving', manipulation: 'Manipulation', sight: 'Sight',
  breathing: 'Breathing', blood: 'Blood pumping', filtration: 'Blood filtration', digestion: 'Digestion', talking: 'Talking', qi: 'Qi flow',
};
export const INJURIES = {
  bruise: { name: 'Bruise', heal: 1, pain: 0.5 },
  cut: { name: 'Cut', heal: 1, pain: 1, scar: 0.15 },
  burn: { name: 'Burn', heal: 2, pain: 1.5, scar: 0.5 },
  fracture: { name: 'Fracture', heal: 2, pain: 2 },
  crush: { name: 'Internal damage', heal: 2, pain: 2, scar: 0.3 },
  scar: { name: 'Scar', heal: 0, pain: 0.2, permanent: true },
};
export const PROSTHETICS = {
  arm: { name: 'Wooden arm', eff: 0.5, price: 800 }, arm2: { name: 'Bionic arm', eff: 0.9, price: 30000 },
  leg: { name: 'Peg leg', eff: 0.5, price: 600 }, leg2: { name: 'Bionic leg', eff: 0.9, price: 25000 },
  hand: { name: 'Hook hand', eff: 0.4, price: 300 }, hand2: { name: 'Bionic hand', eff: 0.85, price: 18000 },
  foot: { name: 'Wooden foot', eff: 0.6, price: 250 }, foot2: { name: 'Bionic foot', eff: 0.9, price: 12000 },
  eye: { name: 'Glass eye', eff: 0, price: 200 }, eye2: { name: 'Bionic eye', eff: 0.8, price: 20000 },
};
