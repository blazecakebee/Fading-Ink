// Trait tiers, rarest last. weight = relative birth chance. Traits with `birth:0` can ONLY be earned.
export const TIERS = {
  common:    { name: 'Common',    color: '#b9b9b9', birth: 60 },
  uncommon:  { name: 'Uncommon',  color: '#6fd36f', birth: 25 },
  rare:      { name: 'Rare',      color: '#4fa3ff', birth: 10 },
  legendary: { name: 'Legendary', color: '#ffb02e', birth: 3.5 },
  mythical:  { name: 'Mythical',  color: '#ff4fd8', birth: 1.2 },
  secret:    { name: 'Secret',    color: '#7cfff0', birth: 0.25 },
  glitched:  { name: 'GLITCHED',  color: '#00ff66', birth: 0.04 },
  god:       { name: 'God',       color: '#fff4b0', birth: 0.008 },
};
export const TIER_ORDER = Object.keys(TIERS);

// mods: added to stats at birth (or when earned). qi: multiplier on Qi gains. power: combat multiplier.
// earn: how it's unlocked if not at birth (checked by systems/traits.js against life events).
export const TRAITS = [
  // COMMON
  { id: 'sturdy', tier: 'common', name: 'Sturdy', desc: '+8 Health, +5 Strength.', mods: { health: 8, strength: 5 } },
  { id: 'bookworm', tier: 'common', name: 'Bookworm', desc: '+8 Smarts. Studying is more effective.', mods: { smarts: 8 }, study: 1.25 },
  { id: 'cheerful', tier: 'common', name: 'Cheerful', desc: '+10 Happiness, stress builds slower.', mods: { happiness: 10 }, stressMult: 0.85 },
  { id: 'clumsy', tier: 'common', name: 'Clumsy', desc: '-5 Agility. Small accidents happen.', mods: { agility: -5 } },
  { id: 'shy', tier: 'common', name: 'Shy', desc: '-6 Charisma, +4 Smarts.', mods: { charisma: -6, smarts: 4 } },
  { id: 'night_owl', tier: 'common', name: 'Night Owl', desc: 'Meditation at night grants slightly more Qi.', qi: 1.05 },
  { id: 'glutton', tier: 'common', name: 'Glutton', desc: '+5 Happiness, -4 Health.', mods: { happiness: 5, health: -4 } },
  { id: 'hothead', tier: 'common', name: 'Hothead', desc: '+5 Strength, more fights find you.', mods: { strength: 5 }, fights: 1.5 },
  // UNCOMMON
  { id: 'quick', tier: 'uncommon', name: 'Quick Reflexes', desc: '+12 Agility. Act first in combat more often.', mods: { agility: 12 }, initiative: 1 },
  { id: 'silver_tongue', tier: 'uncommon', name: 'Silver Tongue', desc: '+12 Charisma. Better at talking your way out.', mods: { charisma: 12 } },
  { id: 'lucky', tier: 'uncommon', name: 'Lucky', desc: '+15 Luck.', mods: { luck: 15 } },
  { id: 'orphans_grit', tier: 'uncommon', name: "Orphan's Grit", desc: 'Hardship hardens you. +10 Vitality-like Health, +stress resistance.', mods: { health: 10 }, stressMult: 0.8, birth: 0, earn: 'orphaned' },
  { id: 'street_smart', tier: 'uncommon', name: 'Street Smart', desc: 'Crimes are less likely to get you caught.', crime: 0.7 },
  { id: 'pretty', tier: 'uncommon', name: 'Striking Looks', desc: '+15 Looks.', mods: { looks: 15 } },
  { id: 'sickly', tier: 'uncommon', name: 'Sickly', desc: '-15 Health, but +10 Smarts.', mods: { health: -15, smarts: 10 } },
  { id: 'brawler', tier: 'uncommon', name: 'Brawler', desc: 'Won 5 fights. +10% combat power.', power: 1.1, birth: 0, earn: 'wins5' },
  // RARE
  { id: 'qi_sensitive', tier: 'rare', name: 'Qi Sensitive', desc: 'You can feel Qi as a child. Cultivation unlocks early, +30% Qi.', qi: 1.3, earlyQi: true },
  { id: 'genius', tier: 'rare', name: 'Genius', desc: '+25 Smarts. Learn manuals faster.', mods: { smarts: 25 }, study: 1.5 },
  { id: 'iron_bones', tier: 'rare', name: 'Iron Bones', desc: '+20 Health, +15% combat power.', mods: { health: 20 }, power: 1.15 },
  { id: 'cursed', tier: 'rare', name: 'Cursed', desc: 'Misfortune follows you. -15 Luck, but evil spirits fear you (+25% vs spirits).', mods: { luck: -15 }, spiritBane: 1.25 },
  { id: 'bloodstained', tier: 'rare', name: 'Bloodstained', desc: 'You have taken a life. +15% power, people sense it. -10 Charisma.', mods: { charisma: -10 }, power: 1.15, birth: 0, earn: 'kill' },
  { id: 'jailbird', tier: 'rare', name: 'Jailbird', desc: 'Survived prison. +10 Strength, crime contacts.', mods: { strength: 10 }, crime: 0.85, birth: 0, earn: 'prison' },
  // LEGENDARY
  { id: 'heavenly_root', tier: 'legendary', name: 'Heavenly Spirit Root', desc: 'A single pure spirit root. +80% Qi gain, breakthroughs easier.', qi: 1.8, breakthrough: 0.15 },
  { id: 'dragon_blood', tier: 'legendary', name: 'Dragon Bloodline', desc: '+25 Strength, +30% combat power, +20 years lifespan.', mods: { strength: 25 }, power: 1.3, life: 20 },
  { id: 'gatebreaker', tier: 'legendary', name: 'Gatebreaker', desc: 'Cleared 10 Gates. Loot from Gates is doubled.', loot: 2, birth: 0, earn: 'gates10' },
  { id: 'heaven_defier', tier: 'legendary', name: 'Heaven Defier', desc: 'Survived a Heavenly Tribulation at low health. +25% breakthrough chance.', breakthrough: 0.25, birth: 0, earn: 'tribulation_close' },
  // MYTHICAL
  { id: 'reincarnator', tier: 'mythical', name: 'Reincarnator', desc: 'Fragments of a past life. +20 Smarts, start knowing Qi exists.', mods: { smarts: 20 }, earlyQi: true, qi: 1.2 },
  { id: 'chaos_body', tier: 'mythical', name: 'Primordial Chaos Body', desc: 'Every element obeys you. x2.2 Qi gain.', qi: 2.2, power: 1.2 },
  { id: 'kinslayer', tier: 'mythical', name: 'Demonic Heart', desc: 'Devoured a demonic core. x1.5 power, but tribulations are deadlier.', power: 1.5, breakthrough: -0.1, birth: 0, earn: 'devour_core' },
  // SECRET
  { id: 'ink_touched', tier: 'secret', name: 'Ink-Touched', desc: 'You can read the faded words between lines. Hidden events appear.', qi: 1.3, hidden: true },
  { id: 'centenarian', tier: 'secret', name: 'Century Walker', desc: 'Lived to 100 as a mortal. Your descendants inherit +5 Health.', birth: 0, earn: 'mortal100' },
  { id: 'nobody', tier: 'secret', name: 'Nobody', desc: 'Lived 30 years without ever using an action. The world forgets you exist.', crime: 0.2, birth: 0, earn: 'idle30' },
  // GLITCHED
  { id: 'null_ptr', tier: 'glitched', name: 'NULL_POINTER', desc: 'ERR: stat overflow. Random stat set to 100 every birthday.', glitch: true },
  { id: 'duplicate', tier: 'glitched', name: 'D̷u̷p̷l̷i̷c̷a̷t̷e̷', desc: 'Pressed Age Up 5 times in a single second. Some actions refund themselves.', refund: 0.25, birth: 0, earn: 'spam_age' },
  // GOD
  { id: 'mandate', tier: 'god', name: 'Mandate of Heaven', desc: 'Heaven itself chose you. x3 Qi, tribulations kneel.', qi: 3, breakthrough: 0.4, power: 1.5, life: 200 },
  { id: 'author', tier: 'god', name: 'The Author', desc: 'You found the pen that writes the world. Reach Immortal Ascension to earn.', birth: 0, earn: 'ascend', power: 2 },
  // ===== v0.3.0 additions =====
  // COMMON
  { id: 'early_bird', tier: 'common', name: 'Early Bird', desc: '+3 Health. Studying is a bit more effective.', mods: { health: 3 }, study: 1.1 },
  { id: 'gym_rat', tier: 'common', name: 'Gym Rat', desc: 'Training gains +20%.', train: 1.2 },
  { id: 'chatterbox', tier: 'common', name: 'Chatterbox', desc: 'Relationships grow 15% faster. -3 Smarts.', social: 1.15, mods: { smarts: -3 } },
  { id: 'frugal', tier: 'common', name: 'Frugal', desc: 'You squeeze every coin. Salary +5%.', pay: 1.05 },
  { id: 'insomniac', tier: 'common', name: 'Insomniac', desc: 'Stress builds 15% faster, but late-night meditation gives +5% Qi.', stressMult: 1.15, qi: 1.05 },
  { id: 'tinkerer', tier: 'common', name: 'Tinkerer', desc: '+8% crafting success.', craft: 0.08 },
  // UNCOMMON
  { id: 'herbalist', tier: 'uncommon', name: 'Herbalist', desc: '+12% crafting success, find 50% more herbs when gathering.', craft: 0.12, gather: 1.5 },
  { id: 'charming_smile', tier: 'uncommon', name: 'Charming Smile', desc: '+8 Looks, +6 Charisma.', mods: { looks: 8, charisma: 6 } },
  { id: 'workaholic', tier: 'uncommon', name: 'Workaholic', desc: 'Salary +20%, stress builds 20% faster.', pay: 1.2, stressMult: 1.2 },
  { id: 'loyal_heart', tier: 'uncommon', name: 'Loyal Heart', desc: 'Relationships grow 30% faster.', social: 1.3 },
  { id: 'iron_stomach', tier: 'uncommon', name: 'Iron Stomach', desc: 'Pills are 30% more effective.', pill: 1.3 },
  { id: 'quick_learner', tier: 'uncommon', name: 'Quick Learner', desc: 'Studying and reading are 30% more effective.', study: 1.3 },
  // RARE
  { id: 'alchemist', tier: 'rare', name: 'Alchemy Prodigy', desc: '+25% crafting success.', craft: 0.25 },
  { id: 'beast_tamer', tier: 'rare', name: 'Beast Tamer', desc: 'Spirit beasts drop more cores. Gate loot +20%.', loot: 1.2 },
  { id: 'twin_soul', tier: 'rare', name: 'Twin Soul', desc: 'Bonds with your partner and best friend are twice as powerful.', bondMult: 2 },
  { id: 'golden_fingers', tier: 'rare', name: 'Golden Fingers', desc: 'Money finds you. Salary +50%.', pay: 1.5 },
  { id: 'battle_hungry', tier: 'rare', name: 'Battle Hungry', desc: 'Won 25 fights. +20% combat power.', power: 1.2, birth: 0, earn: 'wins25' },
  // LEGENDARY
  { id: 'sword_saint', tier: 'legendary', name: 'Sword Saint', desc: 'Sparred 50 times. +40% combat power, act first more often.', power: 1.4, initiative: 1, birth: 0, earn: 'spar50' },
  { id: 'clan_founder', tier: 'legendary', name: 'Clan Founder', desc: 'Founded your own sect. Relationships +30%, income +30%.', social: 1.3, pay: 1.3, birth: 0, earn: 'found_sect' },
  { id: 'cauldron_heart', tier: 'legendary', name: 'Cauldron Heart', desc: '+35% crafting success, pills 50% stronger.', craft: 0.35, pill: 1.5 },
  { id: 'phoenix_marrow', tier: 'legendary', name: 'Phoenix Marrow', desc: '+40 years lifespan, heal 5 Health every year.', life: 40, heal: 5 },
  // MYTHICAL
  { id: 'void_meridians', tier: 'mythical', name: 'Void Meridians', desc: 'x1.8 Qi, meridians open far more easily.', qi: 1.8, merid: 0.3 },
  { id: 'gate_breaker_king', tier: 'mythical', name: 'Kingslayer of Gates', desc: 'Slew a Ghost King. x1.5 power, x2 Gate loot.', power: 1.5, loot: 2, birth: 0, earn: 'ghost_king' },
  { id: 'heavenly_tongue', tier: 'mythical', name: 'Heavenly Tongue', desc: '+30 Charisma, relationships grow 60% faster.', mods: { charisma: 30 }, social: 1.6 },
  { id: 'blood_moon', tier: 'mythical', name: 'Born Under a Blood Moon', desc: 'x1.6 combat power, -10 Luck.', power: 1.6, mods: { luck: -10 } },
  // SECRET
  { id: 'first_crafter', tier: 'secret', name: 'First Crafter', desc: 'Discovered 8 recipes. +30% crafting success, crafting never wastes all ingredients.', craft: 0.3, birth: 0, earn: 'recipes8' },
  { id: 'soulbound', tier: 'secret', name: 'Soulbound', desc: 'Married another player. Partner bonds are 2.5x stronger.', bondMult: 2.5, birth: 0, earn: 'coop_marry' },
  { id: 'heartless', tier: 'secret', name: 'Heartless', desc: 'Divorced 3 times. Stress barely touches you; relationships grow slower.', stressMult: 0.3, social: 0.6, birth: 0, earn: 'divorce3' },
  // GLITCHED
  { id: 'stack_overflow', tier: 'glitched', name: 'STACK_OVERFLOW', desc: '+1 Action every year. The year has a 13th month nobody remembers.', extraAction: 1 },
  // GOD
  { id: 'primordial_forge', tier: 'god', name: 'Primordial Forge', desc: 'Everything you craft succeeds. Pills x2.', craft: 1, pill: 2 },
];
export const TRAIT_BY_ID = Object.fromEntries(TRAITS.map(t => [t.id, t]));
