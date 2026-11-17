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
  // v0.9.35 capstones (need 15 nodes in their branch) and the Ultimate (needs all five capstones)
  { id: 'f_cap', branch: 'fortune', cap: true, name: 'Midas Dynasty', desc: 'Capstone. +8% salary, +8% loot, start every life with +20,000 money.', cost: 500, max: 1, reqN: 15, mods: { pay: 0.08, loot: 0.08 }, birth: { money: 20000 } },
  { id: 'c_cap', branch: 'cultivation', cap: true, name: 'Heaven-Born', desc: 'Capstone. +8% Qi gain, +3% breakthrough chance, +15 Qi affinity at birth.', cost: 500, max: 1, reqN: 15, mods: { qi: 0.08, breakthrough: 0.03 }, birth: { affinity: 15 } },
  { id: 'b_cap', branch: 'body', cap: true, name: "Titan's Lineage", desc: 'Capstone. +4% combat power, +4 years of life, +6 Strength and Agility at birth.', cost: 500, max: 1, reqN: 15, mods: { power: 0.04, life: 4 }, birth: { strength: 6, agility: 6 } },
  { id: 'm_cap', branch: 'mind', cap: true, name: 'Sage Lineage', desc: 'Capstone. +8% study gains, +6% closeness gains, +6 Smarts at birth.', cost: 500, max: 1, reqN: 15, mods: { study: 0.08, social: 0.06 }, birth: { smarts: 6 } },
  { id: 'd_cap', branch: 'destiny', cap: true, name: 'Fate-Weaver', desc: 'Capstone. +8 Luck at birth, +6% loot, 2% chance an action costs nothing.', cost: 500, max: 1, reqN: 15, mods: { loot: 0.06, refund: 0.02 }, birth: { luck: 8 } },
  { id: 'u_cap', branch: 'ultimate', cap: true, ultimate: true, name: 'The Eternal Bloodline', desc: 'The ultimate goal. +6% to Qi, training, study, salary and loot, +3% combat power, +5 years of life, +1 Social point a year.', cost: 2500, max: 1, reqAll: ['f_cap', 'c_cap', 'b_cap', 'm_cap', 'd_cap'], mods: { qi: 0.06, train: 0.06, study: 0.06, pay: 0.06, loot: 0.06, power: 0.03, life: 5, extraSocial: 1 } },
  // v0.9.25 twenty more nodes per branch (mods: per-level bonus, birth: per-level start bonus)
  { id: 'f9', branch: 'fortune', name: 'Penny Wise', desc: '+3% salary per level.', cost: 25, max: 3, req: 'f1', mods: { pay: 0.03 } },
  { id: 'f10', branch: 'fortune', name: 'Nest Egg', desc: '+1,000 starting money per level.', cost: 20, max: 3, req: 'f9', birth: { money: 1000 } },
  { id: 'f11', branch: 'fortune', name: 'Street Smarts', desc: '8% less likely to be caught committing crimes per level.', cost: 30, max: 2, req: 'f9', mods: { crime: -0.08 } },
  { id: 'f12', branch: 'fortune', name: 'Pawnbroker\'s Eye', desc: '+5% Gate loot.', cost: 35, max: 1, req: 'f11', mods: { loot: 0.05 } },
  { id: 'f13', branch: 'fortune', name: 'Market Instinct', desc: '+2 Luck and +2 Smarts at birth per level.', cost: 25, max: 2, req: 'f10', birth: { luck: 2, smarts: 2 } },
  { id: 'f14', branch: 'fortune', name: 'Hard Bargain', desc: '+4% salary.', cost: 40, max: 1, req: 'f13', mods: { pay: 0.04 } },
  { id: 'f15', branch: 'fortune', name: 'Old Ledger', desc: 'Start with +2,500 money.', cost: 45, max: 1, req: 'f10', birth: { money: 2500 } },
  { id: 'f16', branch: 'fortune', name: 'Silver Spoon', desc: '+4 Happiness and +3 Looks at birth.', cost: 30, max: 1, req: 'f15', birth: { happiness: 4, looks: 3 } },
  { id: 'f17', branch: 'fortune', name: 'Patron\'s Favour', desc: '+3% closeness gains per level.', cost: 30, max: 2, req: 'f16', mods: { social: 0.03 } },
  { id: 'f18', branch: 'fortune', name: 'Tax Shelter', desc: 'Stress builds 3% slower (money worries matter less).', cost: 40, max: 1, req: 'f14', mods: { stressMult: -0.03 } },
  { id: 'f19', branch: 'fortune', name: 'Smuggler\'s Routes', desc: 'A further 10% less likely to be caught.', cost: 50, max: 1, req: 'f11', mods: { crime: -0.1 } },
  { id: 'f20', branch: 'fortune', name: 'Hoarder\'s Luck', desc: '+4% gathering yields per level.', cost: 30, max: 2, req: 'f12', mods: { gather: 0.04 } },
  { id: 'f21', branch: 'fortune', name: 'Family Bank', desc: 'Start with +5,000 money.', cost: 70, max: 1, req: 'f15', birth: { money: 5000 } },
  { id: 'f22', branch: 'fortune', name: 'Guild Accounts', desc: '+3% salary per level.', cost: 60, max: 2, req: 'f14', mods: { pay: 0.03 } },
  { id: 'f23', branch: 'fortune', name: 'Treasure Hunter', desc: '+4% Gate loot per level.', cost: 55, max: 2, req: 'f12', mods: { loot: 0.04 } },
  { id: 'f24', branch: 'fortune', name: 'Golden Cradle', desc: '+5 Charisma at birth.', cost: 45, max: 1, req: 'f16', birth: { charisma: 5 } },
  { id: 'f25', branch: 'fortune', name: 'Pill Merchant\'s Line', desc: 'Pills work 4% better.', cost: 60, max: 1, req: 'f20', mods: { pill: 0.04 } },
  { id: 'f26', branch: 'fortune', name: 'Dynasty Fund', desc: 'Start with +10,000 money.', cost: 110, max: 1, req: 'f21', birth: { money: 10000 } },
  { id: 'f27', branch: 'fortune', name: 'Lucky Coin', desc: '+4 Luck at birth per level.', cost: 50, max: 2, req: 'f24', birth: { luck: 4 } },
  { id: 'f28', branch: 'fortune', name: 'Empire Builder', desc: '+5% salary and +3% closeness gains.', cost: 140, max: 1, req: 'f22', mods: { pay: 0.05, social: 0.03 } },
  { id: 'c9', branch: 'cultivation', name: 'Calm Dantian', desc: '+3% Qi gain per level.', cost: 30, max: 3, req: 'c1', mods: { qi: 0.03 } },
  { id: 'c10', branch: 'cultivation', name: 'Spirit Roots', desc: '+5 Qi affinity at birth per level.', cost: 25, max: 3, req: 'c1', birth: { affinity: 5 } },
  { id: 'c11', branch: 'cultivation', name: 'Clear Channels', desc: '+4% chance to open meridians.', cost: 35, max: 1, req: 'c10', mods: { merid: 0.04 } },
  { id: 'c12', branch: 'cultivation', name: 'Pill Tolerance', desc: 'Pills work 4% better per level.', cost: 35, max: 2, req: 'c9', mods: { pill: 0.04 } },
  { id: 'c13', branch: 'cultivation', name: 'Steady Breath', desc: 'Stress builds 3% slower.', cost: 30, max: 1, req: 'c9', mods: { stressMult: -0.03 } },
  { id: 'c14', branch: 'cultivation', name: 'Elder\'s Guidance', desc: '+1% breakthrough chance per level.', cost: 45, max: 3, req: 'c4', mods: { breakthrough: 0.01 } },
  { id: 'c15', branch: 'cultivation', name: 'Ancestral Meridians', desc: '+3% chance to open meridians per level.', cost: 45, max: 2, req: 'c11', mods: { merid: 0.03 } },
  { id: 'c16', branch: 'cultivation', name: 'Lineage Insight', desc: '+3% study gains (scriptures and manuals).', cost: 30, max: 1, req: 'c13', mods: { study: 0.03 } },
  { id: 'c17', branch: 'cultivation', name: 'Spirit Ward', desc: 'Spirits hurt you 6% less per level.', cost: 35, max: 2, req: 'c13', mods: { spiritBane: 0.06 } },
  { id: 'c18', branch: 'cultivation', name: 'Qi-Fed Body', desc: '+2 years of life per level.', cost: 40, max: 2, req: 'c12', mods: { life: 2 } },
  { id: 'c19', branch: 'cultivation', name: 'Inner Furnace', desc: '+4% Qi gain.', cost: 60, max: 1, req: 'c9', mods: { qi: 0.04 } },
  { id: 'c20', branch: 'cultivation', name: 'Bloodline Resonance', desc: '+10 Qi affinity at birth.', cost: 55, max: 1, req: 'c10', birth: { affinity: 10 } },
  { id: 'c21', branch: 'cultivation', name: 'Sword Heart', desc: '+2% combat power per level.', cost: 60, max: 2, req: 'c19', mods: { power: 0.02 } },
  { id: 'c22', branch: 'cultivation', name: 'Alchemist\'s Root', desc: '+3 Craftsmanship per level.', cost: 30, max: 2, req: 'c12', mods: { craft: 3 } },
  { id: 'c23', branch: 'cultivation', name: 'Quick Reflexes', desc: 'You act first in fights more often.', cost: 50, max: 1, req: 'c21', mods: { initiative: 0.1 } },
  { id: 'c24', branch: 'cultivation', name: 'Heaven\'s Patience', desc: '+1% breakthrough chance per level.', cost: 70, max: 2, req: 'c14', mods: { breakthrough: 0.01 } },
  { id: 'c25', branch: 'cultivation', name: 'Nascent Spark', desc: '+3% Qi gain per level.', cost: 80, max: 2, req: 'c19', mods: { qi: 0.03 } },
  { id: 'c26', branch: 'cultivation', name: 'Dao Comprehension', desc: '+4% study and +2% Qi gain.', cost: 90, max: 1, req: 'c16', mods: { study: 0.04, qi: 0.02 } },
  { id: 'c27', branch: 'cultivation', name: 'Undying Ember', desc: '+4 years of life.', cost: 100, max: 1, req: 'c18', mods: { life: 4 } },
  { id: 'c28', branch: 'cultivation', name: 'Ascendant Bloodline', desc: '+3% Qi gain, +1% breakthrough chance and +5 Qi affinity at birth.', cost: 160, max: 1, req: 'c25', mods: { qi: 0.03, breakthrough: 0.01 }, birth: { affinity: 5 } },
  { id: 'b9', branch: 'body', name: 'Sturdy Frame', desc: '+3 Strength at birth per level.', cost: 20, max: 2, req: 'b1', birth: { strength: 3 } },
  { id: 'b10', branch: 'body', name: 'Light Feet', desc: '+3 Agility at birth per level.', cost: 20, max: 2, req: 'b1', birth: { agility: 3 } },
  { id: 'b11', branch: 'body', name: 'Training Genes', desc: '+3% training gains per level.', cost: 30, max: 3, req: 'b9', mods: { train: 0.03 } },
  { id: 'b12', branch: 'body', name: 'Quick Mend', desc: '+5% healing per level.', cost: 25, max: 2, req: 'b8', mods: { healRate: 0.05 } },
  { id: 'b13', branch: 'body', name: 'Iron Lungs', desc: '+3 Health at birth per level.', cost: 20, max: 2, req: 'b1', birth: { health: 3 } },
  { id: 'b14', branch: 'body', name: 'Pain Tolerance', desc: 'Stress builds 3% slower.', cost: 35, max: 1, req: 'b13', mods: { stressMult: -0.03 } },
  { id: 'b15', branch: 'body', name: 'Brawler\'s Blood', desc: '+3 Battle Knowledge at birth per level.', cost: 30, max: 2, req: 'b5', birth: { battle: 3 } },
  { id: 'b16', branch: 'body', name: 'Natural Athlete', desc: '+3% training gains.', cost: 45, max: 1, req: 'b11', mods: { train: 0.03 } },
  { id: 'b17', branch: 'body', name: 'Hollow Bones', desc: 'You act first in fights more often.', cost: 45, max: 1, req: 'b10', mods: { initiative: 0.1 } },
  { id: 'b18', branch: 'body', name: 'Deep Roots', desc: '+2 years of life per level.', cost: 35, max: 3, req: 'b3', mods: { life: 2 } },
  { id: 'b19', branch: 'body', name: 'Fast Recovery', desc: '+1 Health healed when you rest, per level.', cost: 30, max: 2, req: 'b12', mods: { heal: 1 } },
  { id: 'b20', branch: 'body', name: 'Bone Density', desc: '+2% combat power per level.', cost: 55, max: 2, req: 'b6', mods: { power: 0.02 } },
  { id: 'b21', branch: 'body', name: 'Good Posture', desc: '+3 Looks at birth.', cost: 25, max: 1, req: 'b13', birth: { looks: 3 } },
  { id: 'b22', branch: 'body', name: 'Ironclad', desc: '+5 Strength and +5 Health at birth.', cost: 60, max: 1, req: 'b9', birth: { strength: 5, health: 5 } },
  { id: 'b23', branch: 'body', name: 'Wolf\'s Stamina', desc: '+4% training gains per level.', cost: 70, max: 2, req: 'b16', mods: { train: 0.04 } },
  { id: 'b24', branch: 'body', name: 'Spirit-Proof Skin', desc: 'Spirits hurt you 6% less.', cost: 40, max: 1, req: 'b20', mods: { spiritBane: 0.06 } },
  { id: 'b25', branch: 'body', name: 'Centenarian Line', desc: '+4 years of life.', cost: 90, max: 1, req: 'b18', mods: { life: 4 } },
  { id: 'b26', branch: 'body', name: 'Regenerator', desc: '+8% healing.', cost: 70, max: 1, req: 'b19', mods: { healRate: 0.08 } },
  { id: 'b27', branch: 'body', name: 'War Body', desc: '+3% combat power and +3 Agility at birth.', cost: 120, max: 1, req: 'b20', mods: { power: 0.03 }, birth: { agility: 3 } },
  { id: 'b28', branch: 'body', name: 'Titan\'s Heir', desc: '+5 Strength, +5 Agility and +5 Battle Knowledge at birth.', cost: 150, max: 1, req: 'b22', birth: { strength: 5, agility: 5, battle: 5 } },
  { id: 'm9', branch: 'mind', name: 'Bookworm Line', desc: '+3% study gains per level.', cost: 25, max: 3, req: 'm1', mods: { study: 0.03 } },
  { id: 'm10', branch: 'mind', name: 'Bright Eyes', desc: '+3 Smarts at birth per level.', cost: 20, max: 2, req: 'm1', birth: { smarts: 3 } },
  { id: 'm11', branch: 'mind', name: 'Warm Smile', desc: '+3 Charisma at birth per level.', cost: 20, max: 2, req: 'm2', birth: { charisma: 3 } },
  { id: 'm12', branch: 'mind', name: 'Good Listener', desc: '+3% closeness gains per level.', cost: 30, max: 2, req: 'm2', mods: { social: 0.03 } },
  { id: 'm13', branch: 'mind', name: 'Even Temper', desc: 'Stress builds 3% slower per level.', cost: 35, max: 2, req: 'm1', mods: { stressMult: -0.03 } },
  { id: 'm14', branch: 'mind', name: 'Steady Hands', desc: '+3 Craftsmanship per level.', cost: 25, max: 2, req: 'm6', mods: { craft: 3 } },
  { id: 'm15', branch: 'mind', name: 'Cheerful Line', desc: '+5 Happiness at birth.', cost: 20, max: 1, req: 'm13', birth: { happiness: 5 } },
  { id: 'm16', branch: 'mind', name: 'Gifted Pupil', desc: '+4% study gains.', cost: 45, max: 1, req: 'm9', mods: { study: 0.04 } },
  { id: 'm17', branch: 'mind', name: 'Born Leader', desc: '+4 Charisma and +2% closeness gains.', cost: 50, max: 1, req: 'm11', birth: { charisma: 4 }, mods: { social: 0.02 } },
  { id: 'm18', branch: 'mind', name: 'Pill Lore', desc: 'Pills work 3% better per level.', cost: 35, max: 2, req: 'm3', mods: { pill: 0.03 } },
  { id: 'm19', branch: 'mind', name: 'Forager\'s Wit', desc: '+4% gathering yields per level.', cost: 30, max: 2, req: 'm10', mods: { gather: 0.04 } },
  { id: 'm20', branch: 'mind', name: 'Second Wind', desc: '2% chance per level that an action costs nothing.', cost: 80, max: 2, req: 'm5', mods: { refund: 0.02 } },
  { id: 'm21', branch: 'mind', name: 'Social Butterfly', desc: '+1 Social point every year.', cost: 140, max: 1, req: 'm12', mods: { extraSocial: 1 } },
  { id: 'm22', branch: 'mind', name: 'Prodigy', desc: '+5 Smarts at birth.', cost: 55, max: 1, req: 'm10', birth: { smarts: 5 } },
  { id: 'm23', branch: 'mind', name: 'Master Artisan Line', desc: '+5 Craftsmanship.', cost: 60, max: 1, req: 'm14', mods: { craft: 5 } },
  { id: 'm24', branch: 'mind', name: 'Tranquil Mind', desc: 'Stress builds 4% slower.', cost: 70, max: 1, req: 'm13', mods: { stressMult: -0.04 } },
  { id: 'm25', branch: 'mind', name: 'Lucky Charm', desc: '+3 Luck at birth per level.', cost: 35, max: 2, req: 'm4', birth: { luck: 3 } },
  { id: 'm26', branch: 'mind', name: 'Scholar Dynasty', desc: '+4% study gains per level.', cost: 80, max: 2, req: 'm16', mods: { study: 0.04 } },
  { id: 'm27', branch: 'mind', name: 'Silver Voice', desc: '+4% closeness gains and +3% salary.', cost: 90, max: 1, req: 'm17', mods: { social: 0.04, pay: 0.03 } },
  { id: 'm28', branch: 'mind', name: 'Sage\'s Heir', desc: '+5 Smarts, +5 Charisma and +3% study gains.', cost: 150, max: 1, req: 'm22', birth: { smarts: 5, charisma: 5 }, mods: { study: 0.03 } },
  { id: 'd6', branch: 'destiny', name: 'Gate Instinct', desc: '+3% Gate loot per level.', cost: 25, max: 3, req: 'd2', mods: { loot: 0.03 } },
  { id: 'd7', branch: 'destiny', name: 'Close Call', desc: '+3 Luck at birth per level.', cost: 20, max: 2, req: 'd1', birth: { luck: 3 } },
  { id: 'd8', branch: 'destiny', name: 'Ghost Sight', desc: 'Spirits hurt you 6% less per level.', cost: 30, max: 2, req: 'd1', mods: { spiritBane: 0.06 } },
  { id: 'd9', branch: 'destiny', name: 'Hunter\'s Instinct', desc: 'You act first in fights more often.', cost: 40, max: 1, req: 'd2', mods: { initiative: 0.1 } },
  { id: 'd10', branch: 'destiny', name: 'Fated Strength', desc: '+2% combat power per level.', cost: 50, max: 2, req: 'd9', mods: { power: 0.02 } },
  { id: 'd11', branch: 'destiny', name: 'Blessed Birth', desc: '+5 Happiness and +3 Health at birth.', cost: 25, max: 1, req: 'd7', birth: { happiness: 5, health: 3 } },
  { id: 'd12', branch: 'destiny', name: 'Star-Crossed Charm', desc: '+3% closeness gains.', cost: 30, max: 1, req: 'd7', mods: { social: 0.03 } },
  { id: 'd13', branch: 'destiny', name: 'Omen Reader', desc: '+1% breakthrough chance per level.', cost: 45, max: 2, req: 'd3', mods: { breakthrough: 0.01 } },
  { id: 'd14', branch: 'destiny', name: 'Scavenger\'s Fate', desc: '+4% gathering yields per level.', cost: 30, max: 2, req: 'd6', mods: { gather: 0.04 } },
  { id: 'd15', branch: 'destiny', name: 'Heaven-Sent Pills', desc: 'Pills work 3% better per level.', cost: 40, max: 2, req: 'd13', mods: { pill: 0.03 } },
  { id: 'd16', branch: 'destiny', name: 'Charmed Life', desc: '+2 years of life per level.', cost: 40, max: 2, req: 'd11', mods: { life: 2 } },
  { id: 'd17', branch: 'destiny', name: 'Fate\'s Shield', desc: 'Stress builds 3% slower.', cost: 35, max: 1, req: 'd11', mods: { stressMult: -0.03 } },
  { id: 'd18', branch: 'destiny', name: 'Warrior\'s Destiny', desc: '+3% training gains per level.', cost: 40, max: 2, req: 'd10', mods: { train: 0.03 } },
  { id: 'd19', branch: 'destiny', name: 'Spoils of Fate', desc: '+5% Gate loot.', cost: 60, max: 1, req: 'd6', mods: { loot: 0.05 } },
  { id: 'd20', branch: 'destiny', name: 'Lucky Break', desc: '1% chance per level that an action costs nothing.', cost: 60, max: 2, req: 'd5', mods: { refund: 0.01 } },
  { id: 'd21', branch: 'destiny', name: 'Fortune\'s Child', desc: '+5 Luck at birth.', cost: 55, max: 1, req: 'd7', birth: { luck: 5 } },
  { id: 'd22', branch: 'destiny', name: 'Chosen One', desc: '+3% Qi gain and +3% training gains.', cost: 90, max: 1, req: 'd18', mods: { qi: 0.03, train: 0.03 } },
  { id: 'd23', branch: 'destiny', name: 'Slayer\'s Mark', desc: '+3% combat power.', cost: 100, max: 1, req: 'd10', mods: { power: 0.03 } },
  { id: 'd24', branch: 'destiny', name: 'Destiny\'s Favour', desc: '+1% breakthrough chance and +3% Gate loot.', cost: 110, max: 1, req: 'd13', mods: { breakthrough: 0.01, loot: 0.03 } },
  { id: 'd25', branch: 'destiny', name: 'Heaven\'s Darling', desc: '+5 Luck, +3 years of life and +2% to Qi, training and study gains.', cost: 170, max: 1, req: 'd21', birth: { luck: 5 }, mods: { life: 3, qi: 0.02, train: 0.02, study: 0.02 } },
];
// passive bonuses from the tree (fed into the bonus system)
const ADDITIVE = ['breakthrough', 'life', 'refund', 'heal', 'craft', 'merid', 'extraSocial', 'extraAction'];
export function legacyMods() {
  const m = { healRate: 1 + 0.1 * perk('b8'), loot: 1 + 0.08 * perk('d2') };
  for (const n of TREE) { const l = perk(n.id); if (!l || !n.mods) continue;
    for (const [k, v] of Object.entries(n.mods)) m[k] = ADDITIVE.includes(k) ? (m[k] || 0) + v * l : (m[k] ?? 1) * (1 + v * l); }
  return m;
}
// v0.9.25 birth bonuses from the tree (stats, Qi affinity, starting money)
export function legacyBirth(c) {
  for (const n of TREE) { const l = perk(n.id); if (!l || !n.birth) continue;
    for (const [k, v] of Object.entries(n.birth)) {
      if (k === 'money') c.money += v * l;
      else if (k === 'affinity') c.qi.affinity = Math.min(100, c.qi.affinity + v * l);
      else if (k in c.stats) c.stats[k] = Math.max(0, Math.min(100, (c.stats[k] || 0) + v * l));
    }
  }
}
// v0.8.6 one-time blessings: bought now, used up by your next life (a new life or an heir)
// v0.9.11 the old next-life blessing shop is gone. Kept only so queued blessings can be refunded.
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
export function refundBlessings() { const q = META.nextLife || []; if (!q.length) return 0; const pts = q.reduce((s, id) => s + (BLESSING[id]?.cost || 0), 0); META.legacy += pts; META.nextLife = []; return pts; }

// v0.9.11 Birth omens: every new life (or heir) has a 5% chance of a blessing and a separate 5% chance of a curse.
// stat: changed once at birth; mods: permanent, read by bonus.js (same field names as traits).
export const OMEN_CHANCE = 0.05;
export const OMENS = {
  // blessings
  nl_storm:    { kind: 'blessing', name: 'Born in the Storm', desc: 'Lightning struck at your birth: +3% breakthroughs, a strong pull toward Lightning Qi.' },
  nl_prodigy:  { kind: 'blessing', name: 'Prodigy', desc: '+12 Smarts and +5 Charisma at birth.', stat: { smarts: 12, charisma: 5 } },
  nl_spoon:    { kind: 'blessing', name: 'Silver Spoon', desc: 'Born at least middle class, with extra family savings.' },
  nl_heirloom: { kind: 'blessing', name: "Ancestor's Gift", desc: 'Born holding a random Rare heirloom.' },
  nl_awaken:   { kind: 'blessing', name: 'Spirit-Touched', desc: 'Born knowing Qi is real, +20 Qi affinity.' },
  nl_virtue:   { kind: 'blessing', name: 'Good Heart', desc: 'Born with an extra virtue in your personality.' },
  nl_kit:      { kind: 'blessing', name: 'Swaddled in Medicine', desc: 'A wandering healer left 3 Healing Pills and 2 Qi Pills (High grade) with your family.' },
  nl_body:     { kind: 'blessing', name: 'Born Strong', desc: '+8 Strength, +8 Agility, +10 Health at birth.', stat: { strength: 8, agility: 8, health: 10 } },
  nl_star:     { kind: 'blessing', name: 'Lucky Star', desc: 'A falling star on your first night. +12 Luck, +5% Gate loot.', stat: { luck: 12 }, mods: { loot: 1.05 } },
  nl_moon:     { kind: 'blessing', name: 'Moon-Kissed', desc: '+12 Looks, +5% closeness gains.', stat: { looks: 12 }, mods: { social: 1.05 } },
  nl_long:     { kind: 'blessing', name: 'Long-Lived Line', desc: 'Your bloodline runs long. +4 years of life.', mods: { life: 4 } },
  nl_bones:    { kind: 'blessing', name: 'Iron Bones', desc: '+5 Health, and you heal 10% faster.', stat: { health: 5 }, mods: { healRate: 1.1 } },
  nl_memory:   { kind: 'blessing', name: "Old Soul's Memory", desc: 'Echoes of a past life. +8% study gains.', mods: { study: 1.08 } },
  nl_ley:      { kind: 'blessing', name: 'Born on a Ley Line', desc: 'Your cradle sat on a vein of Qi. +6% Qi gains.', mods: { qi: 1.06 } },
  nl_tongue:   { kind: 'blessing', name: 'Silver Tongue', desc: '+10 Charisma, +4% salary.', stat: { charisma: 10 }, mods: { pay: 1.04 } },
  nl_still:    { kind: 'blessing', name: 'Still Waters', desc: 'A calm baby, a calm soul. Stress builds 12% slower.', mods: { stressMult: 0.88 } },
  nl_swift:    { kind: 'blessing', name: 'Swift Feet', desc: '+10 Agility, +3% combat power.', stat: { agility: 10 }, mods: { power: 1.03 } },
  nl_teacher:  { kind: 'blessing', name: 'Fated Teacher', desc: 'An old master watched over your childhood. +10 Battle Knowledge, +4% training.', stat: { battle: 10 }, mods: { train: 1.04 } },
  // curses
  cu_frail:    { kind: 'curse', name: 'Frail Birth', desc: 'A hard, early birth. -12 Health, and you heal 10% slower.', stat: { health: -12 }, mods: { healRate: 0.9 } },
  cu_jinx:     { kind: 'curse', name: 'Jinxed', desc: 'A black cat crossed the cradle. -12 Luck, -5% Gate loot.', stat: { luck: -12 }, mods: { loot: 0.95 } },
  cu_thread:   { kind: 'curse', name: 'Short Thread', desc: 'A fortune teller went pale at your birth. -4 years of life.', mods: { life: -4 } },
  cu_fog:      { kind: 'curse', name: 'Clouded Mind', desc: '-10 Smarts, -6% study gains.', stat: { smarts: -10 }, mods: { study: 0.94 } },
  cu_dantian:  { kind: 'curse', name: 'Knotted Dantian', desc: 'Your Qi centre formed crooked. -7% Qi gains.', mods: { qi: 0.93 } },
  cu_restless: { kind: 'curse', name: 'Restless Spirit', desc: 'You never quite settle. Stress builds 12% faster.', mods: { stressMult: 1.12 } },
  cu_mark:     { kind: 'curse', name: 'Mark of Ill Omen', desc: 'A dark birthmark people whisper about. -10 Looks, -6% closeness gains.', stat: { looks: -10 }, mods: { social: 0.94 } },
  cu_fallen:   { kind: 'curse', name: 'Fallen House', desc: 'Your family lost everything the year you were born. One wealth class lower, half the savings.' },
  cu_limbs:    { kind: 'curse', name: 'Weak Limbs', desc: '-8 Strength, -8 Agility.', stat: { strength: -8, agility: -8 } },
  cu_haunted:  { kind: 'curse', name: 'Haunted', desc: 'Something followed you into the world. Spirits hit you harder, stress builds 5% faster.', mods: { spiritBane: 0.9, stressMult: 1.05 } },
};
export const omenMods = c => (c?.omens || []).map(id => OMENS[id]?.mods).filter(Boolean);

export const NODE = Object.fromEntries(TREE.map(n => [n.id, n]));
export const perk = id => META.tree?.[id] || 0;
export const nodeCost = n => n.cost * ((META.tree?.[n.id] || 0) + 1);
export const branchOwned = br => TREE.filter(n => n.branch === br && !n.cap && perk(n.id) > 0).length;
export const reqMet = n => (!n.req || perk(n.req) > 0) && (!n.reqN || branchOwned(n.branch) >= n.reqN) && (!n.reqAll || n.reqAll.every(id => perk(id) > 0));
export const canBuy = n => (perk(n.id) < n.max) && reqMet(n) && META.legacy >= nodeCost(n);

// Old perk shop (pre-0.5.2) → tree nodes
export function migratePerks() {
  META.tree ||= {};
  const map = { wealth: 'f1', qiborn: 'c1', stars: 'm4', royal: 'f3' };
  for (const [old, id] of Object.entries(map)) if (META.perks?.[old] && !META.tree[id]) META.tree[id] = Math.min(NODE[id].max, META.perks[old]);
  if (META.tree.f3 && !META.tree.f2) { META.tree.f2 = 1; META.tree.f1 ||= 1; }
  if (META.tree.m4 && !META.tree.m2) { META.tree.m2 = 1; META.tree.m1 ||= 1; }
}
