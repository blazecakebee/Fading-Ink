// Family heirlooms. They pass only from parent to child — when a bloodline ends, so do they.
// Only your 3 best heirlooms are attuned (give bonuses) at once, so a vault never snowballs.
// Fields use the same names as traits: qi/power/study/train/pay/social/stressMult multiply,
// breakthrough/heal/life add. loss = chance the piece is lost each time it passes down a generation.
export const HEIRLOOM_TIERS = {
  common:    { name: 'Heirloom',  color: '#c9b79a', w: 70,   loss: 0.08 },
  rare:      { name: 'Rare',      color: '#4fa3ff', w: 25,   loss: 0.05 },
  legendary: { name: 'Legendary', color: '#ffb02e', w: 4.9,  loss: 0.03 },
  mythic:    { name: 'Mythic',    color: '#ff4fd8', w: 0.1,  loss: 0.015 },   // 0.1% of heirloom finds
};
export const HEIRLOOM_ORDER = ['mythic', 'legendary', 'rare', 'common'];
export const MAX_ATTUNED = 3;

export const HEIRLOOMS = {
  // v0.9.4 Fable heirlooms: only from Fable Quests, never found at random
  red_lantern:     { tier: 'legendary', fable: true, icon: 'lantern', name: 'Red Wedding Lantern', desc: '+8% Qi gains, stress builds 10% slower.', qi: 1.08, stressMult: 0.9 },
  unfinished_book: { tier: 'legendary', fable: true, icon: 'manual', name: 'The Unfinished Book', desc: '+10% study, +3% breakthrough.', study: 1.1, breakthrough: 0.03 },
  general_seal:    { tier: 'legendary', fable: true, icon: 'shield', name: "Rusted General's Seal", desc: '+6% combat power, +6% training.', power: 1.06, train: 1.06 },
  moon_coin:       { tier: 'legendary', fable: true, icon: 'moon', name: 'The One Real Moon-Coin', desc: '+12% loot, +6% salary.', loot: 1.12, pay: 1.06 },
  // common — small, flavourful
  jade_pendant:  { tier: 'common', icon: 'amulet', name: "Grandmother's Jade Pendant", desc: 'Stress builds 5% slower.', stressMult: 0.95 },
  iron_ring:     { tier: 'common', icon: 'ring', name: 'Worn Iron Ring', desc: '+3% combat power.', power: 1.03 },
  brush:         { tier: 'common', icon: 'feather', name: 'Ancestral Calligraphy Brush', desc: '+5% study gains.', study: 1.05 },
  abacus:        { tier: 'common', icon: 'market', name: 'Family Abacus', desc: '+4% salary.', pay: 1.04 },
  tea_set:       { tier: 'common', icon: 'tea', name: 'Clay Tea Set', desc: '+5% closeness gains.', social: 1.05 },
  prayer_beads:  { tier: 'common', icon: 'meditate', name: 'Sandalwood Prayer Beads', desc: '+3% Qi gains.', qi: 1.03 },
  war_medal:     { tier: 'common', icon: 'star', name: 'Old War Medal', desc: '+5% training gains.', train: 1.05 },
  notes:         { tier: 'common', icon: 'manual', name: 'Cultivation Notes', desc: '+2% Qi gains, +1% breakthrough.', qi: 1.02, breakthrough: 0.01 },
  // rare
  spirit_jade:   { tier: 'rare', icon: 'gem', name: 'Spirit Jade Bi Disc', desc: '+6% Qi gains, +2% breakthrough.', qi: 1.06, breakthrough: 0.02 },
  bronze_mirror: { tier: 'rare', icon: 'eye', name: 'Bronze Mirror of Clarity', desc: '+8% study, stress builds 8% slower.', study: 1.08, stressMult: 0.92 },
  tiger_tally:   { tier: 'rare', icon: 'claw', name: 'Bronze Tiger Tally', desc: '+5% combat power, +5% training.', power: 1.05, train: 1.05 },
  phoenix_pin:   { tier: 'rare', icon: 'flower', name: 'Phoenix Hairpin', desc: '+8% closeness gains, +1 Health a year.', social: 1.08, heal: 1 },
  clan_ledger:   { tier: 'rare', icon: 'letter', name: 'Merchant Clan Ledger', desc: '+8% salary and tithes.', pay: 1.08 },
  hero_tassel:   { tier: 'rare', icon: 'saber', name: "Fallen Hero's Sword Tassel", desc: '+6% combat power.', power: 1.06 },
  // legendary
  dragon_flute:  { tier: 'legendary', icon: 'music', name: 'Dragon-Bone Flute', desc: '+10% Qi gains, +3% breakthrough.', qi: 1.10, breakthrough: 0.03 },
  stone_peach:   { tier: 'legendary', icon: 'cake', name: 'Petrified Longevity Peach', desc: '+5 years of life, +2 Health a year.', life: 5, heal: 2 },
  heaven_seal:   { tier: 'legendary', icon: 'talisman', name: 'Heaven-Sealing Talisman', desc: '+5% breakthrough chance.', breakthrough: 0.05 },
  star_sword:    { tier: 'legendary', icon: 'broadsword', name: 'Star-Iron Ancestral Sword', desc: '+10% combat power.', power: 1.10 },
  // mythic — once in a thousand finds. Strong, never game-breaking.
  chaos_lotus:   { tier: 'mythic', icon: 'flower', name: 'Primordial Chaos Lotus', desc: '+18% Qi gains, +5% breakthrough, +10 years of life.', qi: 1.18, breakthrough: 0.05, life: 10 },
  emperor_seal:  { tier: 'mythic', icon: 'crown', name: 'Jade Seal of the First Emperor', desc: '+20% salary, +15% closeness, +8% combat power.', pay: 1.2, social: 1.15, power: 1.08 },
  fate_ink:      { tier: 'mythic', icon: 'flask', name: 'Ink of Fate', desc: '+30% Gate loot, 4% chance an action is refunded, +3% breakthrough.', loot: 1.3, refund: 0.04, breakthrough: 0.03 },
  sky_mirror:    { tier: 'mythic', icon: 'moon', name: 'Mirror of Myriad Heavens', desc: '+20% study, +10% Qi, stress builds 25% slower.', study: 1.2, qi: 1.1, stressMult: 0.75 },
};
