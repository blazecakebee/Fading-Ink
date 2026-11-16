// Every ownable item: materials, consumables, gear. Inventory is c.inv = { itemId: count }.
// Gear stats: dmg (+% damage), hp (+max HP), agi, luck, qi (+% Qi gain). Equipped gear lives in c.gear.
export const ITEMS = {
  // materials
  spirit_herb:  { name: 'Spirit Herb', icon: 'herb', type: 'material', price: 120, desc: 'A glowing herb. Base of most pills.' },
  spirit_stone: { name: 'Spirit Stone', icon: 'gem', type: 'material', price: 400, sell: 300, desc: 'Crystallised Qi. Sellable, or used in alchemy and forging.' },
  iron_ore:     { name: 'Iron Ingot', icon: 'metal', type: 'material', price: 80, desc: 'For forging weapons and armour.' },
  cloth:        { name: 'Silk Cloth', icon: 'cloth', type: 'material', price: 60, desc: 'For robes, charms and incense wraps.' },
  ginseng:      { name: 'Thousand-Year Ginseng', icon: 'ginseng', type: 'material', price: 2500, desc: 'Rare root. Powerful in pills.' },
  beast_core:   { name: 'Beast Core', icon: 'earth', type: 'material', desc: 'Dropped by spirit beasts in Gates.' },
  demonic_core: { name: 'Demonic Core', icon: 'demon', type: 'material', use: 'devour', desc: 'Pulses with corrupt Qi. Craft with it… or devour it.' },
  dragon_scale: { name: 'Dragon Scale', icon: 'fire', type: 'material', desc: 'Only found in high-rank Gates.' },
  // consumables
  qi_pill:         { name: 'Qi Gathering Pill', icon: 'pill', type: 'consumable', use: 'qi', desc: 'Restores 40% of your Qi capacity.' },
  heal_pill:       { name: 'Healing Pill', icon: 'health', type: 'consumable', use: 'heal', desc: 'Restores 25 Health.' },
  foundation_pill: { name: 'Foundation Establishment Pill', icon: 'flask', type: 'consumable', use: 'key', desc: 'Required to break into Foundation Establishment. Used automatically.' },
  core_pill:       { name: 'Core Condensing Pill', icon: 'pill', type: 'consumable', use: 'passive', bt: { realm: 'core', bonus: 0.2 }, desc: 'Kept in your pocket: +20% when breaking into Core Formation. Used up on that attempt.' },
  soul_pill:       { name: 'Nascent Soul Fruit', icon: 'ginseng', type: 'consumable', use: 'passive', bt: { realm: 'nascent', bonus: 0.2 }, desc: '+20% when breaking into Nascent Soul. Used up on that attempt.' },
  sever_pill:      { name: 'Spirit Severing Elixir', icon: 'flask', type: 'consumable', use: 'passive', bt: { realm: 'severing', bonus: 0.2 }, desc: '+20% when breaking into Spirit Severing. Used up on that attempt.' },
  void_pill:       { name: 'Void Crossing Pill', icon: 'pill', type: 'consumable', use: 'passive', bt: { realm: 'void', bonus: 0.2 }, desc: '+20% when breaking into Void Refinement.' },
  unity_pill:      { name: 'Heaven-Earth Unity Pill', icon: 'flask', type: 'consumable', use: 'passive', bt: { realm: 'integration', bonus: 0.2 }, desc: '+20% when breaking into Body Integration.' },
  bloodline_essence: { name: 'Bloodline Essence', icon: 'flask', type: 'consumable', use: 'essence', desc: 'Refine it (Cultivation) for +1 Awakening point.' },
  dao_pill:        { name: 'Dao Insight Incense', icon: 'meditate', type: 'consumable', use: 'passive', bt: { realm: 'dao', bonus: 0.2 }, desc: '+20% when breaking into Dao Seeking. Used up on that attempt.' },
  ascend_pill:     { name: 'Ascension Lotus Pill', icon: 'flower', type: 'consumable', use: 'passive', bt: { realm: 'immortal', bonus: 0.25 }, desc: '+25% when attempting Immortal Ascension. Used up on that attempt.' },
  marrow_pill:     { name: 'Marrow Cleansing Pill', icon: 'pill', type: 'consumable', use: 'marrow', desc: 'Permanently +8 Qi affinity.' },
  calm_incense:    { name: 'Calming Incense', icon: 'meditate', type: 'consumable', use: 'incense', desc: 'Burn before a breakthrough: -15 Stress and +12% breakthrough chance on your next attempt.' },
  trib_talisman:   { name: 'Lightning Ward Talisman', icon: 'talisman', type: 'consumable', use: 'passive', desc: 'Kept in your pocket: +15% on major breakthroughs and Heavenly Tribulations hit 30% softer. Used up on your next major breakthrough.' },
  mending_salve:   { name: 'Meridian Mending Salve', icon: 'mortar', type: 'consumable', use: 'med', desc: 'Qi medicine. 70% chance to cure a bodily illness, 50% for Qi sicknesses. Use it from the Health tab.' },
  heart_pill:      { name: 'Heart-Calming Pill', icon: 'pill', type: 'consumable', use: 'med', desc: 'Qi medicine for the mind. 70% chance to ease depression, anxiety, insomnia, PTSD or burnout.' },
  purity_pill:     { name: 'Purification Pill', icon: 'flask', type: 'consumable', use: 'med', desc: 'Qi medicine. 85% chance to purge Qi corruption, deviation or blockages.' },
  recipe_scroll:   { name: 'Alchemy Recipe Scroll', icon: 'manual', type: 'consumable', use: 'recipe', desc: 'Read it to learn a random recipe you don\'t know yet.' },
  ink_of_fading:   { name: 'Ink of Fading', icon: 'flask', type: 'consumable', use: 'ink', desc: 'Writes words that should not exist.' },
  // gear
  iron_sword:    { name: 'Iron Sword', icon: 'knife', type: 'gear', slot: 'weapon', stats: { dmg: 0.15 }, desc: '+15% damage.' },
  spirit_blade:  { name: 'Spirit Blade', icon: 'broadsword', type: 'gear', slot: 'weapon', stats: { dmg: 0.35, qi: 0.05 }, desc: '+35% damage, +5% Qi gain.' },
  demon_saber:   { name: 'Demon Fang Saber', icon: 'saber', type: 'gear', slot: 'weapon', stats: { dmg: 0.6 }, desc: '+60% damage. Whispers at night.' },
  padded_robe:   { name: 'Padded Robe', icon: 'robe', type: 'gear', slot: 'armor', stats: { hp: 15 }, desc: '+15 max HP in fights.' },
  iron_mail:     { name: 'Iron Chainmail', icon: 'chainmail', type: 'gear', slot: 'armor', stats: { hp: 35, agi: -5 }, desc: '+35 HP, -5 Agility.' },
  dragon_vest:   { name: 'Dragon Scale Vest', icon: 'scalevest', type: 'gear', slot: 'armor', stats: { hp: 80, agi: 5 }, desc: '+80 HP, +5 Agility.' },
  jade_charm:    { name: 'Jade Charm', icon: 'amulet', type: 'gear', slot: 'charm', stats: { luck: 10, qi: 0.1 }, desc: '+10 Luck, +10% Qi gain.' },
  // v0.6.3 gear — the first group is sold at the Armory, the rest drop in Gates
  bronze_dagger:   { name: 'Bronze Dagger', icon: 'knife', type: 'gear', slot: 'weapon', price: 120, shop: 1, stats: { dmg: 0.08, agi: 3 }, desc: '+8% damage, +3 Agility.' },
  wooden_staff:    { name: 'Wooden Staff', icon: 'feather', type: 'gear', slot: 'weapon', price: 90, shop: 1, stats: { dmg: 0.1, qi: 0.03 }, desc: '+10% damage, +3% Qi gain.' },
  steel_saber:     { name: 'Steel Saber', icon: 'saber', type: 'gear', slot: 'weapon', price: 600, shop: 1, stats: { dmg: 0.25 }, desc: '+25% damage.' },
  twin_daggers:    { name: 'Twin Daggers', icon: 'knife', type: 'gear', slot: 'weapon', price: 700, shop: 1, stats: { dmg: 0.2, agi: 6 }, desc: '+20% damage, +6 Agility.' },
  war_hammer:      { name: 'War Hammer', icon: 'hammer', type: 'gear', slot: 'weapon', price: 800, shop: 1, stats: { dmg: 0.4, agi: -6 }, desc: '+40% damage, -6 Agility.' },
  long_spear:      { name: 'Long Spear', icon: 'broadsword', type: 'gear', slot: 'weapon', price: 650, shop: 1, stats: { dmg: 0.28, agi: 2 }, desc: '+28% damage, +2 Agility.' },
  jade_sword:      { name: 'Jade Spirit Sword', icon: 'broadsword', type: 'gear', slot: 'weapon', stats: { dmg: 0.32, qi: 0.08 }, desc: '+32% damage, +8% Qi gain.' },
  flame_glaive:    { name: 'Flame Glaive', icon: 'fire', type: 'gear', slot: 'weapon', stats: { dmg: 0.5 }, desc: '+50% damage.' },
  thunder_blade:   { name: 'Thunder Blade', icon: 'lightning', type: 'gear', slot: 'weapon', stats: { dmg: 0.6, qi: 0.05 }, desc: '+60% damage, +5% Qi gain.' },
  void_edge:       { name: 'Void Edge', icon: 'eye', type: 'gear', slot: 'weapon', stats: { dmg: 0.85, qi: 0.08 }, desc: '+85% damage, +8% Qi gain.' },
  celestial_sword: { name: 'Celestial Sword', icon: 'star', type: 'gear', slot: 'weapon', stats: { dmg: 1.05, qi: 0.12 }, desc: '+105% damage, +12% Qi gain.' },
  leather_vest:    { name: 'Leather Vest', icon: 'robe', type: 'gear', slot: 'armor', price: 150, shop: 1, stats: { hp: 10 }, desc: '+10 HP.' },
  sect_robe:       { name: 'Reinforced Sect Robe', icon: 'robe', type: 'gear', slot: 'armor', price: 500, shop: 1, stats: { hp: 20, qi: 0.03 }, desc: '+20 HP, +3% Qi gain.' },
  bronze_plate:    { name: 'Bronze Plate', icon: 'chainmail', type: 'gear', slot: 'armor', price: 900, shop: 1, stats: { hp: 45, agi: -6 }, desc: '+45 HP, -6 Agility.' },
  beast_hide:      { name: 'Beast Hide Armour', icon: 'claw', type: 'gear', slot: 'armor', stats: { hp: 30, agi: 2 }, desc: '+30 HP, +2 Agility.' },
  jade_scale:      { name: 'Jade Scale Armour', icon: 'scalevest', type: 'gear', slot: 'armor', stats: { hp: 60, qi: 0.05 }, desc: '+60 HP, +5% Qi gain.' },
  void_mantle:     { name: 'Void Mantle', icon: 'robe', type: 'gear', slot: 'armor', stats: { hp: 120, agi: 8 }, desc: '+120 HP, +8 Agility.' },
  // v0.9.6 craftable gear (20 new recipes below)
  bone_club:     { name: 'Beast-Bone Club', icon: 'hammer', type: 'gear', slot: 'weapon', stats: { dmg: 0.15, agi: -2 }, desc: '+15% damage, -2 Agility. Crude but heavy.' },
  jade_spear:    { name: 'Jade-Tipped Spear', icon: 'broadsword', type: 'gear', slot: 'weapon', stats: { dmg: 0.34, agi: 3 }, desc: '+34% damage, +3 Agility.' },
  void_needles:  { name: 'Void-Silk Needles', icon: 'knife', type: 'gear', slot: 'weapon', stats: { dmg: 0.45, agi: 10 }, desc: '+45% damage, +10 Agility.' },
  scale_glaive:  { name: 'Dragonscale Glaive', icon: 'fire', type: 'gear', slot: 'weapon', stats: { dmg: 0.62, agi: 2 }, desc: '+62% damage, +2 Agility.' },
  herb_robe:     { name: "Herbalist's Robe", icon: 'robe', type: 'gear', slot: 'armor', stats: { hp: 15, qi: 0.02 }, desc: '+15 HP, +2% Qi gain.' },
  core_lamellar: { name: 'Beast-Core Lamellar', icon: 'chainmail', type: 'gear', slot: 'armor', stats: { hp: 50, agi: -2 }, desc: '+50 HP, -2 Agility.' },
  demon_harness: { name: 'Demon-Bone Harness', icon: 'claw', type: 'gear', slot: 'armor', stats: { hp: 70, agi: 6 }, desc: '+70 HP, +6 Agility.' },
  scale_coat:    { name: 'Dragonscale Coat', icon: 'scalevest', type: 'gear', slot: 'armor', stats: { hp: 95, agi: 4 }, desc: '+95 HP, +4 Agility.' },
  herb_sachet:   { name: 'Herb Sachet', icon: 'herb', type: 'gear', slot: 'charm', stats: { luck: 3, qi: 0.02 }, desc: '+3 Luck, +2% Qi gain.' },
  demon_eye:     { name: 'Demon-Eye Charm', icon: 'eye', type: 'gear', slot: 'charm', stats: { dmg: 0.08, luck: -3 }, desc: '+8% damage, -3 Luck.' },
  core_ring:     { name: 'Beast-Core Ring', icon: 'ring', type: 'gear', slot: 'ring', stats: { hp: 15, agi: 2 }, color: '#c98a4a', desc: '+15 HP, +2 Agility.' },
  jade_ring:     { name: 'Jade Focus Ring', icon: 'ring', type: 'gear', slot: 'ring', stats: { qi: 0.05 }, color: '#5fd38a', desc: '+5% Qi gain.' },
  scale_amulet:  { name: 'Dragonscale Amulet', icon: 'amulet', type: 'gear', slot: 'necklace', stats: { hp: 40, dmg: 0.04 }, color: '#ff8a3d', desc: '+40 HP, +4% damage.' },
  // v0.9.4 Fable-only gear: only earned by finishing Fable Quests
  fable_locket: { name: "Bride's Lantern Locket", icon: 'lantern', type: 'gear', slot: 'necklace', fable: true, stats: { qi: 0.14, luck: 8, hp: 30 }, color: '#ff9d5c', desc: 'Fable gear. +14% Qi gain, +8 Luck, +30 HP.' },
  fable_robe:   { name: 'Robe of Drowned Pages', icon: 'robe', type: 'gear', slot: 'armor', fable: true, stats: { hp: 220, agi: 12, qi: 0.1 }, desc: 'Fable gear. +220 HP, +12 Agility, +10% Qi gain.' },
  fable_sword:  { name: 'Oathkeeper', icon: 'broadsword', type: 'gear', slot: 'weapon', fable: true, stats: { dmg: 1.3, agi: 6, qi: 0.1 }, desc: 'Fable gear. +130% damage, +6 Agility, +10% Qi gain.' },
  fable_ring:   { name: 'Ring of the Paid Debt', icon: 'ring', type: 'gear', slot: 'ring', fable: true, stats: { dmg: 0.16, luck: 10, qi: 0.06 }, color: '#d8d0ff', desc: 'Fable gear. +16% damage, +10 Luck, +6% Qi gain.' },
  celestial_armor: { name: 'Celestial Armour', icon: 'shield', type: 'gear', slot: 'armor', stats: { hp: 180, agi: 10 }, desc: '+180 HP, +10 Agility.' },
  lucky_coin:      { name: 'Lucky Coin', icon: 'market', type: 'gear', slot: 'charm', price: 200, shop: 1, stats: { luck: 5 }, desc: '+5 Luck.' },
  phoenix_feather: { name: 'Phoenix Feather', icon: 'feather', type: 'gear', slot: 'charm', stats: { hp: 25, qi: 0.05 }, desc: '+25 HP, +5% Qi gain.' },
  fang_necklace: { name: 'Beast Fang Necklace', icon: 'claw', type: 'gear', slot: 'charm', stats: { agi: 8 }, desc: '+8 Agility.' },
  // v0.8.7 Rare Relics: sell for a fortune, or enshrine (Inventory) for permanent meditation Qi
  // v0.8.7 accessories: necklaces & rings (shown on your character)
  silver_locket:   { name: 'Silver Locket', icon: 'amulet', type: 'gear', slot: 'necklace', price: 400, shop: 1, stats: { luck: 4 }, color: '#d8dde6', desc: '+4 Luck.' },
  spirit_pendant:  { name: 'Spirit Jade Pendant', icon: 'amulet', type: 'gear', slot: 'necklace', stats: { qi: 0.06 }, color: '#5fd38a', desc: '+6% Qi gain.' },
  dragon_tooth:    { name: 'Dragon-Tooth Necklace', icon: 'claw', type: 'gear', slot: 'necklace', stats: { dmg: 0.08, hp: 10 }, color: '#f2efe6', desc: '+8% damage, +10 HP.' },
  prayer_beads:    { name: 'Prayer Beads', icon: 'amulet', type: 'gear', slot: 'necklace', price: 900, shop: 1, stats: { qi: 0.03, luck: 2 }, color: '#8a5a3a', desc: '+3% Qi gain, +2 Luck.' },
  iron_band:       { name: 'Iron Band', icon: 'ring', type: 'gear', slot: 'ring', price: 250, shop: 1, stats: { agi: 3 }, color: '#a9b3bf', desc: '+3 Agility.' },
  ruby_ring:       { name: 'Blood Ruby Ring', icon: 'ring', type: 'gear', slot: 'ring', stats: { hp: 30 }, color: '#d81b3a', desc: '+30 HP in fights.' },
  storage_ring:    { name: 'Storage Ring', icon: 'ring', type: 'gear', slot: 'ring', stats: { luck: 6, qi: 0.03 }, color: '#ffd36f', desc: 'A cultivator\'s classic. +6 Luck, +3% Qi gain.' },
  sword_ring:      { name: 'Sword-Intent Ring', icon: 'ring', type: 'gear', slot: 'ring', stats: { dmg: 0.1 }, color: '#e0e6ff', desc: '+10% damage.' },
  relic_lotus:  { name: 'Jade Lotus Relic', icon: 'flower', type: 'relic', desc: 'Enshrined: +10% Qi from meditation. Or sell it to a collector.' },
  relic_bone:   { name: 'Saint\'s Finger-Bone', icon: 'skull', type: 'relic', desc: 'Enshrined: +12% Qi. Or sell it to a collector.' },
  relic_mirror: { name: 'Mirror of the Ninth Sky', icon: 'eye', type: 'relic', desc: 'Enshrined: +15% Qi. Or sell it to a collector.' },
  relic_bell:   { name: 'Bell of the First Sect', icon: 'bell', type: 'relic', desc: 'Enshrined: +8% Qi. Or sell it to a collector.' },
  relic_seed:   { name: 'World-Tree Seed', icon: 'wood', type: 'relic', desc: 'Enshrined: +18% Qi. Or sell it to a collector.' },
};
export const SLOTS = { weapon: 'Weapon', armor: 'Armour', charm: 'Charm', necklace: 'Necklace', ring: 'Ring' };

// Recipes: inputs is a multiset. base = success chance before Smarts/traits/bonds. known = starter recipe.
export const RECIPES = [
  { id: 'r_heal', out: 'heal_pill', inputs: { spirit_herb: 2 }, base: 0.8 },
  { id: 'r_sword', out: 'iron_sword', inputs: { iron_ore: 2 }, base: 0.8, known: true },
  { id: 'r_robe', out: 'padded_robe', inputs: { cloth: 2 }, base: 0.85, known: true },
  { id: 'r_qi', out: 'qi_pill', inputs: { spirit_herb: 1, spirit_stone: 1 }, base: 0.7 },
  { id: 'r_incense', out: 'calm_incense', inputs: { spirit_herb: 1, cloth: 1 }, base: 0.75 },
  { id: 'r_charm', out: 'jade_charm', inputs: { spirit_stone: 1, cloth: 1 }, base: 0.6 },
  { id: 'r_fang', out: 'fang_necklace', inputs: { beast_core: 1, cloth: 1 }, base: 0.6 },
  { id: 'r_mail', out: 'iron_mail', inputs: { iron_ore: 2, cloth: 1 }, base: 0.65 },
  { id: 'r_blade', out: 'spirit_blade', inputs: { iron_sword: 1, spirit_stone: 2 }, base: 0.55 },
  { id: 'r_marrow', out: 'marrow_pill', inputs: { beast_core: 1, spirit_herb: 2, spirit_stone: 1 }, base: 0.45 },
  { id: 'r_ginseng', out: 'marrow_pill', inputs: { ginseng: 1, spirit_herb: 1 }, base: 0.7, n: 2 },
  { id: 'r_ward', out: 'trib_talisman', inputs: { spirit_stone: 2, beast_core: 1 }, base: 0.5 },
  { id: 'r_found', out: 'foundation_pill', inputs: { qi_pill: 2, spirit_stone: 1 }, base: 0.6 },
  { id: 'r_found2', out: 'foundation_pill', inputs: { spirit_herb: 3, ginseng: 1 }, base: 0.7 },
  { id: 'r_core', out: 'core_pill', inputs: { spirit_stone: 3, beast_core: 2, ginseng: 1 }, base: 0.5 },
  { id: 'r_soul', out: 'soul_pill', inputs: { spirit_stone: 4, dragon_scale: 1, ginseng: 1 }, base: 0.45 },
  { id: 'r_sever', out: 'sever_pill', inputs: { demonic_core: 1, purity_pill: 1, spirit_stone: 4 }, base: 0.4 },
  { id: 'r_dao', out: 'dao_pill', inputs: { calm_incense: 2, ginseng: 2, spirit_stone: 3 }, base: 0.4 },
  { id: 'r_ascend', out: 'ascend_pill', inputs: { dragon_scale: 2, ginseng: 2, marrow_pill: 1, spirit_stone: 5 }, base: 0.35 },
  { id: 'r_vest', out: 'dragon_vest', inputs: { dragon_scale: 1, cloth: 1, spirit_stone: 1 }, base: 0.45 },
  { id: 'r_saber', out: 'demon_saber', inputs: { spirit_blade: 1, demonic_core: 1 }, base: 0.4 },
  { id: 'r_salve', out: 'mending_salve', inputs: { spirit_herb: 2, cloth: 1 }, base: 0.65 },
  { id: 'r_heart', out: 'heart_pill', inputs: { spirit_herb: 1, calm_incense: 1 }, base: 0.6 },
  { id: 'r_purity', out: 'purity_pill', inputs: { spirit_stone: 2, ginseng: 1 }, base: 0.55 },
  // v0.9.6 twenty new recipes
  { id: 'r_club', out: 'bone_club', inputs: { beast_core: 1, iron_ore: 1 }, base: 0.8 },
  { id: 'r_spear', out: 'jade_spear', inputs: { iron_ore: 3, spirit_stone: 2 }, base: 0.6 },
  { id: 'r_needles', out: 'void_needles', inputs: { demonic_core: 1, cloth: 2, spirit_stone: 3 }, base: 0.45 },
  { id: 'r_glaive', out: 'scale_glaive', inputs: { dragon_scale: 2, iron_ore: 3, spirit_stone: 3 }, base: 0.35 },
  { id: 'r_herbrobe', out: 'herb_robe', inputs: { cloth: 2, spirit_herb: 1 }, base: 0.85 },
  { id: 'r_lamellar', out: 'core_lamellar', inputs: { beast_core: 2, iron_ore: 3 }, base: 0.6 },
  { id: 'r_harness', out: 'demon_harness', inputs: { demonic_core: 2, beast_core: 2, cloth: 1 }, base: 0.45 },
  { id: 'r_scalecoat', out: 'scale_coat', inputs: { dragon_scale: 2, cloth: 2, spirit_stone: 2 }, base: 0.4 },
  { id: 'r_sachet', out: 'herb_sachet', inputs: { spirit_herb: 2, cloth: 1 }, base: 0.85 },
  { id: 'r_demoneye', out: 'demon_eye', inputs: { demonic_core: 1, spirit_stone: 1 }, base: 0.55 },
  { id: 'r_corering', out: 'core_ring', inputs: { beast_core: 1, iron_ore: 1 }, base: 0.75 },
  { id: 'r_jadering', out: 'jade_ring', inputs: { spirit_stone: 2, iron_ore: 1 }, base: 0.6 },
  { id: 'r_amulet', out: 'scale_amulet', inputs: { dragon_scale: 1, spirit_stone: 2 }, base: 0.5 },
  { id: 'r_heal2', out: 'heal_pill', inputs: { ginseng: 1, spirit_herb: 2 }, base: 0.75, n: 3 },
  { id: 'r_beads', out: 'prayer_beads', inputs: { spirit_stone: 1, cloth: 1 }, base: 0.7 },
  { id: 'r_locket', out: 'silver_locket', inputs: { iron_ore: 1, spirit_stone: 1 }, base: 0.7 },
  { id: 'r_hide', out: 'beast_hide', inputs: { beast_core: 2, cloth: 1 }, base: 0.7 },
  { id: 'r_jadesword', out: 'jade_sword', inputs: { spirit_blade: 1, spirit_stone: 3 }, base: 0.5 },
  { id: 'r_feather', out: 'phoenix_feather', inputs: { dragon_scale: 1, spirit_herb: 3, ginseng: 1 }, base: 0.4 },
  { id: 'r_storage', out: 'storage_ring', inputs: { spirit_stone: 4, iron_ore: 2, beast_core: 1 }, base: 0.4 },
  { id: 'r_ink', out: 'ink_of_fading', inputs: { demonic_core: 1, spirit_herb: 1, cloth: 1 }, base: 0.3 },
];

// v0.9.6 pawn shop: anything you can carry sells, but for far less than it's worth (a quarter of market value).
// Items without a shop price get an estimated value from their stats (gear) or rarity (materials).
const MAT_VALUE = { beast_core: 300, demonic_core: 900, dragon_scale: 2500, recipe_scroll: 600, bloodline_essence: 4000 };
export const PAWN_RATE = 0.25;
export function marketValue(id) {
  const it = ITEMS[id]; if (!it) return 0;
  if (it.price) return it.price;
  if (MAT_VALUE[id]) return MAT_VALUE[id];
  if (it.type === 'gear') { const s = it.stats || {}; return Math.round(300 + Math.max(0, s.dmg || 0) * 6000 + Math.max(0, s.hp || 0) * 50 + Math.max(0, s.agi || 0) * 70 + Math.max(0, s.luck || 0) * 70 + Math.max(0, s.qi || 0) * 8000); }
  return 0;
}
export const canPawn = id => { const it = ITEMS[id]; return !!it && !it.fable && (it.type === 'gear' || it.type === 'material') && marketValue(id) > 0; };
export const pawnValue = (id, qMult = 1) => Math.max(1, Math.round(marketValue(id) * PAWN_RATE * qMult));
