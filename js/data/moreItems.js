// v0.9.54 More gear: 20 new weapons, armour and jewellery, plus 14 new recipes. Some are sold by merchants (shop), the rest are
// crafted from recipes you discover. Sprites are drawn from the same palettes as the local arms.
import { ITEMS, RECIPES } from './items.js';
import { GEAR_SPRITES } from '../ui/gearSprites.js';
import { MAT, ICON, SLOT } from './localArms.js';

const G = (id, name, shape, mat, stats, price, shop, desc) => ({ id, name, shape, mat, stats, price, shop, desc });
const GEAR = [
  // weapons
  G('hook_swords', 'Twin Hook Swords', 'twin', 'steel', { dmg: 0.26, agi: 5 }, 900, 1, 'Hooked blades that trap a weapon and pull it away.'),
  G('nine_ring_dao', 'Nine-Ring Broadsword', 'saber', 'bronze', { dmg: 0.36, agi: -2 }, 1100, 1, 'The rings rattle with every swing. Loud, heavy, honest.'),
  G('rope_dart', 'Rope Dart', 'dagger', 'leather', { dmg: 0.16, agi: 8 }, 450, 1, 'A blade on a long cord. Strikes from where nobody expects.'),
  G('iron_fan', 'Iron War Fan', 'staff', 'iron', { dmg: 0.2, agi: 4, luck: 3 }, 700, 1, 'Looks like a fan. Blocks like a shield. Cuts like a knife.'),
  G('crescent_halberd', 'Crescent Moon Halberd', 'glaive', 'silver', { dmg: 0.44, agi: -4 }, 1500, 1, 'A moon-shaped blade on a long haft.'),
  G('thunder_mace', 'Thunderclap Mace', 'hammer', 'obsidian', { dmg: 0.5, agi: -5, qi: 0.04 }, 0, 0, 'Struck by lightning during its forging. Still hums.'),
  G('jade_needle_bow', 'Jade Needle Sleeve', 'dagger', 'jade', { dmg: 0.24, agi: 6, qi: 0.05 }, 0, 0, 'A spring-loaded sleeve of Qi-tempered needles.'),
  G('bone_sabre', 'Beast-Bone Sabre', 'saber', 'bone', { dmg: 0.4, luck: 3 }, 0, 0, 'Carved from a spirit beast\'s thigh bone.'),
  G('star_iron_jian', 'Star-Iron Jian', 'sword', 'silver', { dmg: 0.55, agi: 4, qi: 0.06 }, 0, 0, 'Forged from metal that fell from the sky.'),
  // armour
  G('quilted_coat', 'Quilted Cotton Coat', 'robe', 'cloth', { hp: 25 }, 300, 1, 'Cheap, warm, surprisingly good at stopping a knife.'),
  G('brigandine', 'Brigandine', 'vest', 'leather', { hp: 50, agi: -2 }, 1100, 1, 'Steel plates riveted inside heavy cloth.'),
  G('scholar_robe', 'Scholar\'s Silk Robe', 'robe', 'silk', { hp: 20, qi: 0.05 }, 900, 1, 'Light, elegant, threaded with calming patterns.'),
  G('rattan_armour', 'Rattan Armour', 'mail', 'wood', { hp: 40, agi: 2 }, 0, 0, 'Woven rattan boiled in oil. Light and springy.'),
  G('spirit_silk_robe', 'Spirit-Silk Robe', 'robe', 'emerald', { hp: 45, qi: 0.08 }, 0, 0, 'Woven from silk spun by spirit worms.'),
  G('golem_plate', 'Golem-Core Plate', 'plate', 'iron', { hp: 90, agi: -6 }, 0, 0, 'Hammered around a dead golem\'s core. Nearly unbreakable.'),
  G('wyvern_leather', 'Wyvern Leather', 'hide', 'obsidian', { hp: 70, agi: 4 }, 0, 0, 'Storm-wyvern hide. Lightning slides right off.'),
  // jewellery
  G('copper_bangle', 'Copper Bangle', 'ring', 'bronze', { luck: 4, hp: 6 }, 200, 1, 'An old good-luck charm. Turns your wrist green.'),
  G('tiger_tooth', 'Tiger Tooth Pendant', 'fang', 'bone', { dmg: 0.06, agi: 2 }, 650, 1, 'A tooth from a spirit tiger, on a leather cord.'),
  G('moon_pearl', 'Moon Pearl Ring', 'ring', 'silver', { qi: 0.08, luck: 4 }, 0, 0, 'A pearl that glows faintly at night.'),
  G('phoenix_ash_beads', 'Phoenix-Ash Beads', 'beads', 'gold', { hp: 20, qi: 0.06, luck: 5 }, 0, 0, 'Beads of fired phoenix ash. Warm to the touch.'),
];
const describe = s => Object.entries(s).map(([k, v]) => k === 'dmg' ? `${v > 0 ? '+' : ''}${Math.round(v * 100)}% damage` : k === 'qi' ? `+${Math.round(v * 100)}% Qi gain` : k === 'hp' ? `+${Math.round(v / 2)}% max HP` : `${v > 0 ? '+' : ''}${v} ${{ agi: 'Agility', luck: 'Luck' }[k] || k}`).join(', ') + '.';
for (const x of GEAR) {
  const m = MAT[x.mat] || MAT.steel;
  ITEMS[x.id] ||= { name: x.name, icon: ICON[x.shape] || 'chest', type: 'gear', slot: SLOT[x.shape], stats: x.stats, color: m[0], ...(x.price ? { price: x.price } : {}), ...(x.shop ? { shop: 1 } : {}), desc: `${describe(x.stats)} ${x.desc}` };
  GEAR_SPRITES[x.id] ||= { t: x.shape, pal: { a: m[0], b: m[1], c: m[2], h: m[3], g: m[4], x: m[5] } };
}
// extra recipes for existing pills (more ways to brew what you need)
const R = (id, out, inputs, base, n) => ({ id, out, inputs, base, ...(n ? { n } : {}) });
const NEW_R = [
  R('r_thundermace', 'thunder_mace', { iron_ore: 4, spirit_stone: 2, beast_core: 1 }, 0.45),
  R('r_needlesleeve', 'jade_needle_bow', { iron_ore: 2, spirit_stone: 2, cloth: 1 }, 0.5),
  R('r_bonesabre', 'bone_sabre', { beast_core: 3, iron_ore: 1 }, 0.6),
  R('r_stariron', 'star_iron_jian', { spirit_blade: 1, dragon_scale: 1, spirit_stone: 3 }, 0.35),
  R('r_rattan', 'rattan_armour', { cloth: 2, spirit_herb: 2 }, 0.8),
  R('r_spiritsilk', 'spirit_silk_robe', { cloth: 3, spirit_stone: 2 }, 0.55),
  R('r_golemplate', 'golem_plate', { iron_ore: 5, beast_core: 2, spirit_stone: 2 }, 0.4),
  R('r_wyvern', 'wyvern_leather', { dragon_scale: 1, beast_core: 2, cloth: 2 }, 0.45),
  R('r_moonpearl', 'moon_pearl', { spirit_stone: 3, iron_ore: 1 }, 0.55),
  R('r_phoenixbeads', 'phoenix_ash_beads', { phoenix_feather: 1, spirit_stone: 2 }, 0.45),
  R('r_bonetonic', 'heal_pill', { spirit_herb: 1, beast_core: 1 }, 0.8, 2),
  R('r_focus', 'heart_pill', { spirit_herb: 2, spirit_stone: 1 }, 0.65),
  R('r_beastblood', 'qi_pill', { beast_core: 1, spirit_herb: 1 }, 0.7),
  R('r_storm', 'trib_talisman', { spirit_stone: 2, iron_ore: 1, cloth: 1 }, 0.5),
];
for (const r of NEW_R) if (!RECIPES.some(x => x.id === r.id)) RECIPES.push(r);
