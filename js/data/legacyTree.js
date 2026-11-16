// Legacy skill tree: permanent upgrades bought with Legacy Points, shared by every life.
// Each node needs its parent (req) unlocked first. Branches fan out so you can specialise.
import { META } from '../core/state.js';

export const BRANCHES = {
  fortune: { name: 'Fortune', icon: 'market', color: '#ffd75a', desc: 'Money, birth status and deals.' },
  cultivation: { name: 'Cultivation', icon: 'cultivation', color: '#7fe3ff', desc: 'Qi talent passed down your bloodline.' },
  body: { name: 'Body', icon: 'fist', color: '#ff7a6a', desc: 'Health, strength and long life.' },
  mind: { name: 'Mind & Spirit', icon: 'mind', color: '#c39bff', desc: 'Smarts, charm, recipes, luck and time.' },
  destiny: { name: 'Destiny', icon: 'star', color: '#ff8fd0', desc: 'Fate, Gates, gods and the hunt.' },
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
  // v0.8.6 more to spend on
  { id: 'f6', branch: 'fortune', name: 'Family Heirloom Car', desc: 'Every life starts with an old family car (comfort and a little resale value).', cost: 20, max: 1, req: 'f1' },
  { id: 'f7', branch: 'fortune', name: 'Trust Fund', desc: 'At 18 you receive a trust fund payout (bigger per level).', cost: 45, max: 2, req: 'f2' },
  { id: 'f8', branch: 'fortune', name: 'Connections', desc: '+6% chance to be hired, and job agents cost 20% less.', cost: 35, max: 1, req: 'f5' },
  { id: 'c6', branch: 'cultivation', name: 'Ancestral Qi', desc: 'Rare and Epic Qi types are more likely when your Qi awakens (per level).', cost: 45, max: 2, req: 'c1' },
  { id: 'c7', branch: 'cultivation', name: 'Meridian Map', desc: 'Born with your first meridian already open.', cost: 50, max: 1, req: 'c3' },
  { id: 'c8', branch: 'cultivation', name: 'Second Root', desc: '+10% chance to awaken a second Qi and to fuse Qi.', cost: 70, max: 1, req: 'c4' },
  { id: 'b6', branch: 'body', name: 'Thick Bones', desc: 'Every body part has 15% more HP — harder to break, harder to lose.', cost: 30, max: 1, req: 'b2' },
  { id: 'b7', branch: 'body', name: 'Severed Heritage', desc: 'Your family remembers the Severed Path: you know of it from birth.', cost: 35, max: 1, req: 'b5' },
  { id: 'b8', branch: 'body', name: 'Iron Stomach', desc: '+10% healing per level.', cost: 25, max: 2, req: 'b1' },
  { id: 'm6', branch: 'mind', name: 'Crafter\'s Line', desc: 'Start every life with +10 Craftsmanship per level.', cost: 25, max: 2, req: 'm1' },
  { id: 'm7', branch: 'mind', name: 'Old Soul', desc: 'Always born with at least one virtue in your personality.', cost: 40, max: 1, req: 'm2' },
  { id: 'm8', branch: 'mind', name: 'Teacher\'s Favour', desc: 'Your teachers start out liking you (+25 closeness).', cost: 30, max: 1, req: 'm2' },
  { id: 'd1', branch: 'destiny', name: 'Fate\'s Mercy', desc: '+15% chance per level that fate turns a fatal accident aside (once a life).', cost: 40, max: 2 },
  { id: 'd2', branch: 'destiny', name: 'Gate Sense', desc: '+8% Gate loot per level.', cost: 30, max: 2 },
  { id: 'd3', branch: 'destiny', name: 'Divine Notice', desc: 'Gods are twice as likely to cross your path.', cost: 60, max: 1, req: 'd1' },
  { id: 'd4', branch: 'destiny', name: 'Hunter\'s Blood', desc: 'End-game Hunts pay 10% more and are a little less deadly.', cost: 50, max: 1, req: 'd2' },
  { id: 'd5', branch: 'destiny', name: 'Fortune\'s Favourite', desc: '+5 Luck at birth, and loot rolls High grade more often.', cost: 80, max: 1, req: 'd3' },
];
// passive bonuses from the tree (fed into the bonus system)
export const legacyMods = () => ({ healRate: 1 + 0.1 * perk('b8'), loot: 1 + 0.08 * perk('d2') });
// v0.8.6 one-time blessings: bought now, used up by your next life (a new life or an heir)
export const BLESSINGS = [
  { id: 'nl_storm', name: 'Born in the Storm', desc: 'Lightning strikes at your birth: +3% breakthroughs and a strong pull toward Lightning Qi.', cost: 35 },
  { id: 'nl_prodigy', name: 'Prodigy', desc: '+12 Smarts and +5 Charisma at birth.', cost: 25 },
  { id: 'nl_spoon', name: 'Silver Spoon', desc: 'Born at least middle class, with extra savings.', cost: 30 },
  { id: 'nl_heirloom', name: 'Ancestor\'s Gift', desc: 'Start with a random Rare heirloom.', cost: 60 },
  { id: 'nl_awaken', name: 'Spirit-Touched', desc: 'Born knowing Qi is real, +20 Qi affinity.', cost: 35 },
  { id: 'nl_virtue', name: 'Good Heart', desc: 'Born with a random virtue added to your personality.', cost: 20 },
  { id: 'nl_kit', name: 'Survival Kit', desc: 'Start with 3 Healing Pills and 2 Qi Pills (High grade).', cost: 15 },
  { id: 'nl_body', name: 'Born Strong', desc: '+8 Strength, +8 Agility, +10 Health at birth.', cost: 25 },
];
export const BLESSING = Object.fromEntries(BLESSINGS.map(b => [b.id, b]));
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
