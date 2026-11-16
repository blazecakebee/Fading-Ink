// v0.8.5 Qi Types. Your Qi awakens as a type shaped by how you lived; it refines into stronger
// permutations as you climb; at Void Refinement you can awaken a second Qi, and at Body Integration
// fuse two COMPATIBLE Qi into one. Numbers are deliberately small: a maxed Mythic Qi is a real edge
// (roughly +10-15% in a fight), never a win button. Effects:
//  combat riders (on your Qi techniques): dmg, burn, heal, drain, pierce, stun, evade, crit, init, hp, holy (vs spirits/demons)
//  passive (bonus system): qi, breakthrough, heal, life, loot, craft, pill, study, train, stressMult, power
export const RARITY = {
  common: { name: 'Common', k: 1, color: '#b9c0ca' }, uncommon: { name: 'Uncommon', k: 1.2, color: '#5fd38a' },
  rare: { name: 'Rare', k: 1.4, color: '#4fa3ff' }, epic: { name: 'Epic', k: 1.6, color: '#b46bff' },
  legendary: { name: 'Legendary', k: 1.85, color: '#ffb02e' }, mythic: { name: 'Mythic', k: 2.1, color: '#ff4f6a' },
};
export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
// snd = which procedural sound family it uses
const Q = (id, name, glyph, rarity, colors, snd, fx, pass, desc, perms, o = {}) => ({ id, name, glyph, rarity, colors, snd, fx, pass, desc, perms: perms.map(([n, r, f, d]) => ({ name: n, rarity: r, fx: f || {}, desc: d })), ...o });

export const QI_TYPES = [
  Q('normal', 'Normal Qi', '氣', 'common', ['#cfe3ff', '#ffffff'], 'pure', { dmg: 0.02 }, { qi: 1.03 }, 'Balanced and predictable. Works with every technique; no elemental tricks.', [
    ['Tempered Pure Qi', 'uncommon', { hp: 0.04 }, 'Deeper reserves and sturdier meridians: more HP in fights.'],
    ['Flowing Meridian Qi', 'rare', { dmg: 0.03 }, 'Techniques flow without waste: stronger Qi techniques.'],
    ['Origin Uncarved Block Qi', 'epic', { hp: 0.04, dmg: 0.03 }, 'Untouched by any element. Faster comprehension of every art.']]),
  // ---- Five Phases
  Q('fire', 'Fire Qi', '火', 'common', ['#ff6a3d', '#ffd36f'], 'fire', { burn: 0.15, dmg: 0.02 }, { pill: 1.05 }, 'Burst damage and burning. Helps with alchemy.', [
    ['Blazing Hellfire', 'uncommon', { burn: 0.1, dmg: 0.02 }, 'Hotter, wilder flames.'],
    ['Samadhi True Fire', 'rare', { burn: 0.08 }, 'Burns the Qi out of its target. Better pills.', ],
    ['Phoenix Nirvana Flame', 'legendary', { heal: 0.05 }, 'Part of the burn becomes your own healing.']]),
  Q('water', 'Water Qi', '水', 'common', ['#4fb3ff', '#bff2ff'], 'water', { heal: 0.05, evade: 0.06 }, { heal: 1.05 }, 'Recovery and evasion. Washes away poison.', [
    ['Spirit Spring Dew', 'uncommon', { heal: 0.04 }, 'Rapid healing of body and meridians.'],
    ['Black Tortoise Heavy Water', 'rare', { hp: 0.05 }, 'Dense, heavy Qi: much harder to hurt.'],
    ['Raging Abyssal Tide', 'epic', { pierce: 0.12 }, 'Waves that pour through shields.']]),
  Q('wood', 'Wood Qi', '木', 'common', ['#6fd36f', '#d8ff9a'], 'wood', { drain: 0.05 }, { life: 2, heal: 1.05 }, 'Vitality: steady regeneration, a longer life, more herbs.', [
    ['Blood-Thorn Parasitic Vine', 'uncommon', { drain: 0.04 }, 'Thorns that drink from your enemy.'],
    ['Wither-Rot Decay Qi', 'rare', { dmg: 0.03 }, 'Rot that eats away at armour and flesh.'],
    ['World Tree Evergreen Qi', 'legendary', { drain: 0.03 }, 'The world tree\'s patience: a longer life.']]),
  Q('metal', 'Metal Qi', '金', 'common', ['#d0d6e0', '#ffffff'], 'metal', { pierce: 0.12, dmg: 0.02 }, { craft: 1.05 }, 'Armour-piercing edge. Weapons love it.', [
    ['Liquid Mercury Qi', 'uncommon', { dmg: 0.03 }, 'Fluid metal: fast, flowing strikes.'],
    ['Vajra Indestructible Gold', 'rare', { hp: 0.06 }, 'Unbreakable: a body like gold.'],
    ['White Tiger Slaughter Qi', 'epic', { crit: 0.04, pierce: 0.06 }, 'The killing intent of the White Tiger: critical strikes.']]),
  Q('earth', 'Earth Qi', '土', 'common', ['#c69a5b', '#f0d9a8'], 'earth', { hp: 0.05, stun: 0.04 }, { train: 1.04 }, 'Fortress Qi: more HP and heavy, staggering blows.', [
    ['Tectonic Tremor Qi', 'uncommon', { stun: 0.04 }, 'Shockwaves that stun.'],
    ['Jade Bastion Crystal Qi', 'rare', { hp: 0.04 }, 'Crystal barriers that shrug off blows.'],
    ['Mount Tai Suppression Qi', 'epic', { stun: 0.04, dmg: 0.02 }, 'The weight of a mountain pins your foe.']]),
  // ---- Mutated
  Q('wind', 'Wind Qi', '風', 'uncommon', ['#9ff0d0', '#e8fff6'], 'wind', { evade: 0.08, init: 10 }, { loot: 1.03 }, 'Speed and evasion. Strikes first, slips away.', [
    ['Traceless Zephyr', 'uncommon', { evade: 0.05 }, 'Gone before they swing.'],
    ['Tempest Vortex Qi', 'rare', { stun: 0.04 }, 'A vortex that throws your enemy off balance.'],
    ['Nine-Abyss Astral Gale', 'epic', { dmg: 0.03, pierce: 0.05 }, 'Vacuum blades that cut deep.']]),
  Q('ice', 'Ice Qi', '冰', 'uncommon', ['#9fe8ff', '#ffffff'], 'ice', { stun: 0.07, hp: 0.02 }, { stressMult: 0.97 }, 'Slows and freezes. Cold, calm, defensive.', [
    ['Glacial Mirror Ice', 'uncommon', { hp: 0.04 }, 'Frost shields that deflect blows.'],
    ['Soul-Freezing Yin Frost', 'rare', { stun: 0.03 }, 'Freezes the meridians of anyone you touch.'],
    ['Absolute Zero Permafrost', 'epic', { stun: 0.03, dmg: 0.03 }, 'Freeze, then shatter.']]),
  Q('poison', 'Poison Qi', '毒', 'uncommon', ['#9be04f', '#5a2a8a'], 'poison', { burn: 0.12, drain: 0.02 }, { pill: 1.04 }, 'Stacking toxins that wear enemies down.', [
    ['Corpse-Dissolving Acid Miasma', 'uncommon', { pierce: 0.08 }, 'Acid that eats through armour.'],
    ['Colorless Heart-Rot Mist', 'rare', { burn: 0.08 }, 'A delayed, creeping toxin.'],
    ['Ten-Thousand Gu Venom', 'epic', { burn: 0.06, dmg: 0.03 }, 'Venom that adapts to any resistance.']]),
  Q('magma', 'Magma Qi', '炎', 'rare', ['#ff3a1a', '#3a1a10'], 'fire', { burn: 0.12, pierce: 0.06, dmg: 0.02 }, { craft: 1.06 }, 'Molten Qi: melts armour and burns. A forger\'s gift.', [
    ['Pyroclastic Ash Storm', 'rare', { evade: 0.04 }, 'Ash that blinds your enemy.'],
    ['Obsidian Glass Shrapnel', 'epic', { crit: 0.03 }, 'Volcanic glass that leaves deep cuts.'],
    ['Earth-Core Molten Blood', 'legendary', { hp: 0.05 }, 'The planet\'s heat in your veins.']]),
  Q('lightning', 'Lightning Qi', '雷', 'rare', ['#b18cff', '#fff4b0'], 'lightning', { init: 15, stun: 0.06, holy: 0.06 }, { breakthrough: 0.01 }, 'Speed, paralysis, and bane of demons and ghosts.', [
    ['Shadow-Step Arc Lightning', 'rare', { evade: 0.05, init: 5 }, 'Move like a spark.'],
    ['Crimson Calamity Plasma', 'epic', { burn: 0.08, stun: 0.03 }, 'Scorching thunder that paralyses and melts.'],
    ['Nine-Heavens Divine Tribulation', 'legendary', { holy: 0.08 }, 'Heaven\'s own lightning: deadly to the wicked.']]),
  // ---- Alignment
  Q('righteous', 'Righteous Qi', '義', 'common', ['#ffe9a8', '#ffffff'], 'pure', { holy: 0.05 }, { breakthrough: 0.03 }, 'Steady and safe: the lowest risk of failed breakthroughs.', [
    ['Daoist Natural Harmony', 'uncommon', {}, 'In tune with the Dao: breakthroughs come easier.', ],
    ['Confucian Scholarly Aura', 'rare', {}, 'Your words carry weight. Disciples stay loyal.'],
    ['Buddhist Golden Vajra Qi', 'epic', { hp: 0.04, holy: 0.04 }, 'A mind no demon can touch.']], { permPass: [{ breakthrough: 0.02 }, { social: 1.05, study: 1.03 }, { stressMult: 0.95 }] }),
  Q('demonic', 'Demonic Qi', '魔', 'uncommon', ['#b0001a', '#2a0008'], 'demon', { drain: 0.07, dmg: 0.03 }, { qi: 1.08, breakthrough: -0.03, stressMult: 1.05 }, 'Fast power through blood — at a price: harsher breakthroughs, a darker mind.', [
    ['Blood-Shadow Parasite Qi', 'uncommon', { drain: 0.03 }, 'Steals life from every foe you strike.'],
    ['Heart-Demon Nightmare Qi', 'rare', { evade: 0.04 }, 'Your enemies see their worst fears.'],
    ['Asura Slaughter Sea', 'legendary', { dmg: 0.04 }, 'The longer you fight, the hungrier you get.']]),
  Q('ghost', 'Ghost Qi', '鬼', 'rare', ['#7fe3ff', '#20203a'], 'ghost', { pierce: 0.1, evade: 0.05 }, { study: 1.03 }, 'Strikes the soul, slips past armour.', [
    ['Soul-Devouring Wraith Qi', 'rare', { drain: 0.04 }, 'Feeds on the souls of the fallen.'],
    ['Undying Corpse-King Qi', 'epic', { hp: 0.06 }, 'A body that will not stay down.'],
    ['Yellow Springs Underworld Qi', 'legendary', { pierce: 0.08 }, 'Corrosion from the underworld itself.']]),
  Q('yang', 'Pure Yang Qi', '陽', 'rare', ['#ffcf3a', '#ff7a1a'], 'fire', { holy: 0.08, dmg: 0.03 }, { train: 1.05 }, 'Blazing life force, bane of the Yin and the dead.', [
    ['Furnace-Core Inner Yang', 'rare', {}, 'A stable furnace: smoother cultivation.'],
    ['Crimson Dragon Blood-Yang', 'epic', { dmg: 0.04 }, 'A dragon\'s strength in every blow.'],
    ['Blazing Solar Emperor Qi', 'legendary', { holy: 0.08, hp: 0.03 }, 'A radiant aura no curse survives.']], { permPass: [{ qi: 1.04 }, {}, {}] }),
  Q('yin', 'Pure Yin Qi', '陰', 'rare', ['#6a7bff', '#d8dcff'], 'ghost', { evade: 0.07, heal: 0.03 }, { qi: 1.06 }, 'Soft, deep, silent: absorbs Qi faster, hard to hit.', [
    ['Ethereal Mist Veil', 'rare', { evade: 0.04 }, 'A veil of mist around you.'],
    ['Cold Moon Illusory Qi', 'epic', { stun: 0.04 }, 'Illusions that confuse your foe.'],
    ['Profound Yin Bone-Chill', 'legendary', { stun: 0.03, init: 8 }, 'A touch that chills blood and slows the heart.']]),
  // ---- Conceptual (cannot awaken as your first Qi)
  Q('sword', 'Sword Intent', '劍', 'epic', ['#e0e6ff', '#7fa8ff'], 'metal', { crit: 0.05, pierce: 0.08, dmg: 0.02 }, { power: 1.02 }, 'The will of the blade. Cuts through everything.', [
    ['Myriad-Blade Storm Intent', 'epic', { dmg: 0.03 }, 'A storm of floating swords.'],
    ['Heart-Sword Formless Intent', 'legendary', { crit: 0.03 }, 'The sword is in your heart; your hands are enough.'],
    ['Heaven-Severing Single Strike', 'mythic', { pierce: 0.08 }, 'One strike that ignores almost any defence.']], { concept: true }),
  Q('star', 'Starlight Qi', '星', 'epic', ['#c9b6ff', '#1a1a4a'], 'star', { crit: 0.04, heal: 0.02 }, { loot: 1.06, breakthrough: 0.02 }, 'Starlight sharpens your senses and your luck.', [
    ['Astral Projection Soul Qi', 'epic', { evade: 0.04 }, 'Your soul scouts ahead of you.'],
    ['Falling Meteor Starfall Qi', 'legendary', { dmg: 0.04, burn: 0.05 }, 'Call down a falling star.'],
    ['Polaris Guiding Star Qi', 'mythic', {}, 'The guiding star: better loot and enlightenment.']], { concept: true, permPass: [{}, {}, { loot: 1.08, breakthrough: 0.03 }] }),
  Q('space', 'Space Qi', '空', 'legendary', ['#8fa8ff', '#05060f'], 'void', { pierce: 0.12, evade: 0.06 }, { loot: 1.04 }, 'Folds space: strikes through barriers, steps out of danger.', [
    ['Void-Step Blink Qi', 'legendary', { evade: 0.05 }, 'Blink out of every blow.'],
    ['Dimensional Rift Blade', 'legendary', { pierce: 0.06, dmg: 0.02 }, 'Cuts through space itself.'],
    ['Pocket-Realm Collapse', 'mythic', { dmg: 0.04 }, 'Crush your enemy inside a collapsing realm.']], { concept: true }),
  Q('time', 'Time Qi', '時', 'legendary', ['#ffe9a8', '#3a2a10'], 'void', { init: 20, stun: 0.05 }, { qi: 1.06, train: 1.04 }, 'Bends time: you act first, they act late.', [
    ['Time-Dilation Cultivation', 'legendary', {}, 'Your meditation runs faster than the world.'],
    ['Temporal Stasis Lock', 'mythic', { stun: 0.04 }, 'Freeze a moment of your enemy\'s life.'],
    ['Erosion of Years', 'mythic', { drain: 0.04 }, 'Steal the years from your enemy\'s body.']], { concept: true, permPass: [{ qi: 1.05 }, {}, {}] }),
  Q('chaos', 'Chaos Qi', '混', 'mythic', ['#ff4fd8', '#4fe3ff'], 'chaos', { dmg: 0.03, hp: 0.03, drain: 0.02 }, { qi: 1.04, breakthrough: 0.02 }, 'Primordial origin energy. Harmonises with any Qi — the only way to fuse opposites.', [
    ['Yin-Yang Genesis Chaos', 'mythic', {}, 'Opposites become one: fuse anything with anything.'],
    ['All-Devouring Primordial Vortex', 'mythic', { heal: 0.04 }, 'Swallows incoming energy and makes it yours.'],
    ['World-Creation Origin Qi', 'mythic', { dmg: 0.02, hp: 0.02 }, 'A little of everything, perfected.']], { concept: true }),
];
export const QI = Object.fromEntries(QI_TYPES.map(q => [q.id, q]));

// ---- compatibility. Pairs here cannot be fused (Wu Xing overcoming cycle + true opposites) unless one is Chaos.
const CLASH = [['water', 'fire'], ['fire', 'metal'], ['metal', 'wood'], ['wood', 'earth'], ['earth', 'water'], ['ice', 'fire'], ['ice', 'magma'], ['water', 'magma'],
  ['righteous', 'demonic'], ['yang', 'yin'], ['yang', 'ghost'], ['righteous', 'ghost'], ['lightning', 'earth'], ['time', 'space'], ['wind', 'earth']];
export const compatible = (a, b) => a !== b && (a === 'chaos' || b === 'chaos' || !CLASH.some(([x, y]) => (x === a && y === b) || (x === b && y === a)));
// named fusions; anything else gets a generated name
const FUSED = { 'fire+wind': 'Blazing Tempest Qi', 'lightning+water': 'Storm-Tide Qi', 'yang+yin': 'Taiji Eclipse Qi', 'space+sword': 'Dimensional Severance Qi', 'earth+fire': 'Volcanic Heart Qi',
  'fire+wood': 'Wildfire Bloom Qi', 'metal+water': 'Quicksilver Tide Qi', 'earth+metal': 'Iron Mountain Qi', 'water+wood': 'Spring Rain Qi', 'ice+wind': 'Blizzard Qi', 'lightning+wind': 'Thunderstorm Qi',
  'demonic+ghost': 'Hell-Wraith Qi', 'righteous+yang': 'Heaven\'s Sun Qi', 'star+time': 'Eternal Night Sky Qi', 'poison+wood': 'Rotting Garden Qi', 'magma+metal': 'Forgefire Qi', 'ghost+yin': 'Moonless Grave Qi',
  'demonic+fire': 'Hellfire Qi', 'righteous+sword': 'Upright Blade Qi', 'chaos+normal': 'Primordial Harmony Qi' };
export const fusedName = (a, b) => FUSED[[a, b].sort().join('+')] || `${QI[a].name.replace(/ Qi$| Intent$/, '')}-${QI[b].name.replace(/ Qi$| Intent$/, '')} Fusion Qi`;
export const SECOND_REALM = 9, FUSE_REALM = 10, PERM_REALMS = [3, 6, 9]; // Void Refinement / Body Integration / Foundation, Nascent Soul, Void
