// Legacy skill tree: permanent upgrades bought with Legacy Points, shared by every life.
// Each node needs its parent (req) unlocked first. Branches fan out so you can specialise.
import { META } from '../core/state.js';

export const BRANCHES = {
  fortune: { name: 'Fortune', icon: 'market', color: '#ffd75a', desc: 'Money, birth status and deals.' },
  cultivation: { name: 'Cultivation', icon: 'cultivation', color: '#7fe3ff', desc: 'Qi talent passed down your bloodline.' },
  body: { name: 'Body', icon: 'fist', color: '#ff7a6a', desc: 'Health, strength and long life.' },
  mind: { name: 'Mind & Spirit', icon: 'mind', color: '#c39bff', desc: 'Smarts, charm, recipes, luck and time.' },
};
export const TREE = [
  // Fortune
  { id: 'f1', branch: 'fortune', name: 'Family Savings', desc: '+500 starting money per level.', cost: 10, max: 3 },
  { id: 'f2', branch: 'fortune', name: 'Old Money', desc: 'Much less likely to be born destitute or poor.', cost: 25, max: 1, req: 'f1' },
  { id: 'f3', branch: 'fortune', name: 'Noble Blood', desc: 'Higher chance to be born into royalty (per level).', cost: 50, max: 2, req: 'f2' },
  { id: 'f4', branch: 'fortune', name: 'Merchant Blood', desc: '+5% discount with every merchant and shop.', cost: 30, max: 1, req: 'f1' },
  { id: 'f5', branch: 'fortune', name: 'Golden Touch', desc: '+10% salary in every life.', cost: 45, max: 1, req: 'f4' },
  // Cultivation
  { id: 'c1', branch: 'cultivation', name: 'Qi-Touched Bloodline', desc: '+15 Qi affinity at birth per level.', cost: 20, max: 3 },
  { id: 'c2', branch: 'cultivation', name: 'Awakened Child', desc: 'Born knowing Qi is real, with the Basic Breathing Scroll.', cost: 35, max: 1, req: 'c1' },
  { id: 'c3', branch: 'cultivation', name: 'Heavenly Lineage', desc: '+15% Qi gain.', cost: 50, max: 1, req: 'c2' },
  { id: 'c4', branch: 'cultivation', name: 'Tribulation Scars', desc: '+5% breakthrough chance.', cost: 60, max: 1, req: 'c3' },
  { id: 'c5', branch: 'cultivation', name: 'Ancestral Method', desc: 'Start every life knowing a random cultivation method.', cost: 40, max: 1, req: 'c2' },
  // Body
  { id: 'b1', branch: 'body', name: 'Hardy Stock', desc: '+5 starting Health per level.', cost: 10, max: 2 },
  { id: 'b2', branch: 'body', name: 'Iron Constitution', desc: '+5 starting Strength.', cost: 20, max: 1, req: 'b1' },
  { id: 'b3', branch: 'body', name: 'Long-Lived Line', desc: '+5 years natural lifespan per level.', cost: 30, max: 3, req: 'b1' },
  { id: 'b4', branch: 'body', name: 'Clean Genes', desc: 'Half as likely to carry genetic conditions.', cost: 35, max: 1, req: 'b3' },
  { id: 'b5', branch: 'body', name: 'Warrior Blood', desc: '+5 Battle Knowledge and +5 Agility at birth.', cost: 30, max: 1, req: 'b2' },
  // Mind
  { id: 'm1', branch: 'mind', name: 'Quick Study', desc: '+5 starting Smarts.', cost: 10, max: 1 },
  { id: 'm2', branch: 'mind', name: 'Silver-Tongued Line', desc: '+5 Charisma and +10% relationship growth.', cost: 25, max: 1, req: 'm1' },
  { id: 'm3', branch: 'mind', name: 'Ancestral Recipes', desc: 'Start every life knowing 2 random pill recipes.', cost: 40, max: 1, req: 'm1' },
  { id: 'm4', branch: 'mind', name: 'Lucky Stars', desc: 'Rarer traits are more likely at birth (per level).', cost: 40, max: 3, req: 'm2' },
  { id: 'm5', branch: 'mind', name: 'Extra Hours', desc: '+1 Action every year.', cost: 120, max: 1, req: 'm4' },
];
export const NODE = Object.fromEntries(TREE.map(n => [n.id, n]));
export const perk = id => META.tree?.[id] || 0;
export const nodeCost = n => n.cost * ((META.tree?.[n.id] || 0) + 1);
export const canBuy = n => (perk(n.id) < n.max) && (!n.req || perk(n.req) > 0) && META.legacy >= nodeCost(n);

// Old perk shop (pre-0.5.2) → tree nodes
export function migratePerks() {
  META.tree ||= {};
  const map = { wealth: 'f1', qiborn: 'c1', stars: 'm4', royal: 'f3' };
  for (const [old, id] of Object.entries(map)) if (META.perks?.[old] && !META.tree[id]) META.tree[id] = Math.min(NODE[id].max, META.perks[old]);
  if (META.tree.f3 && !META.tree.f2) { META.tree.f2 = 1; META.tree.f1 ||= 1; }
  if (META.tree.m4 && !META.tree.m2) { META.tree.m2 = 1; META.tree.m1 ||= 1; }
}
