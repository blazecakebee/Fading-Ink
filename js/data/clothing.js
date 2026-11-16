// Clothing: buy in the Wardrobe tab, wear one item per slot. Price is in base money (scaled by local economy).
// style = how fashionable it is; your outfit's total style gives a small social bonus.
const C = { black: '#22222a', white: '#e9e6df', navy: '#24345e', red: '#a8323e', green: '#2f6b4c', grey: '#6a6a72', beige: '#cdb89a', pink: '#e58fb0', sky: '#6aa7e0', purple: '#6a4a9a', gold: '#c9a23a', brown: '#6e4a30', olive: '#5d6633', teal: '#2f8a8a', denim: '#3d5a86' };
const mk = (slot, base, kind, price, style, colors) => colors.map(col => ({ id: `${base.toLowerCase().replace(/[^a-z]+/g, '_')}_${col}`, slot, kind, name: `${col[0].toUpperCase() + col.slice(1)} ${base}`, color: C[col], price, style }));
export const CLOTHES = [
  // tops
  ...mk('top', 'T-shirt', 'shirt', 15, 1, ['white', 'black', 'red']),
  ...mk('top', 'Hoodie', 'shirt', 45, 2, ['grey', 'navy']),
  ...mk('top', 'Silk Blouse', 'shirt', 90, 4, ['white', 'pink']),
  ...mk('top', 'Button-up Shirt', 'shirt', 40, 3, ['sky', 'white']),
  ...mk('top', 'Knit Sweater', 'shirt', 60, 3, ['beige', 'green']),
  ...mk('top', 'Tang Jacket', 'shirt', 120, 5, ['red', 'black']),
  ...mk('top', 'Tank Top', 'shirt', 12, 1, ['black', 'white']),
  ...mk('top', 'Crop Top', 'shirt', 25, 2, ['pink', 'purple']),
  // bottoms
  ...mk('bottom', 'Jeans', 'pants', 50, 2, ['denim', 'black']),
  ...mk('bottom', 'Cargo Pants', 'pants', 45, 2, ['olive', 'beige']),
  ...mk('bottom', 'Tailored Slacks', 'pants', 90, 4, ['black', 'grey']),
  ...mk('bottom', 'Track Pants', 'pants', 30, 1, ['navy', 'black']),
  ...mk('bottom', 'Martial Pants', 'pants', 35, 2, ['white', 'black']),
  ...mk('bottom', 'Shorts', 'shorts', 20, 1, ['beige', 'denim']),
  ...mk('bottom', 'Pleated Skirt', 'skirt', 40, 3, ['navy', 'red']),
  ...mk('bottom', 'Long Skirt', 'skirt', 55, 3, ['beige', 'green']),
  ...mk('bottom', 'Mini Skirt', 'skirt', 35, 2, ['black', 'pink']),
  // dresses (cover top + bottom)
  ...mk('dress', 'Sundress', 'dress', 60, 3, ['sky', 'white']),
  ...mk('dress', 'Qipao', 'dress', 180, 6, ['red', 'teal']),
  ...mk('dress', 'Hanfu', 'dress', 220, 6, ['pink', 'white']),
  ...mk('dress', 'Evening Gown', 'dress', 600, 9, ['black', 'gold']),
  ...mk('dress', 'Summer Dress', 'dress', 45, 2, ['green', 'purple']),
  // outerwear
  ...mk('outer', 'Leather Jacket', 'jacket', 220, 6, ['black', 'brown']),
  ...mk('outer', 'Trench Coat', 'jacket', 260, 6, ['beige', 'navy']),
  ...mk('outer', 'Puffer Jacket', 'jacket', 120, 3, ['red', 'black']),
  ...mk('outer', 'Cultivator Robe', 'robe', 300, 7, ['white', 'teal', 'purple']),
  ...mk('outer', 'Blazer', 'jacket', 180, 5, ['navy', 'grey']),
  ...mk('outer', 'Hunter Coat', 'jacket', 350, 6, ['olive', 'black']),
  // socks
  ...mk('socks', 'Ankle Socks', 'socks', 5, 0, ['white', 'black']),
  ...mk('socks', 'Knee Socks', 'socks', 12, 1, ['black', 'white', 'navy']),
  ...mk('socks', 'Striped Socks', 'socks', 10, 1, ['red', 'teal']),
  // shoes
  ...mk('shoes', 'Sneakers', 'shoes', 70, 2, ['white', 'black']),
  ...mk('shoes', 'Leather Boots', 'shoes', 150, 4, ['brown', 'black']),
  ...mk('shoes', 'Cloth Shoes', 'shoes', 25, 1, ['black']),
  ...mk('shoes', 'Heels', 'shoes', 140, 5, ['red', 'black']),
  ...mk('shoes', 'Dress Shoes', 'shoes', 160, 5, ['black']),
  ...mk('shoes', 'Sandals', 'shoes', 20, 1, ['brown']),
  // hats
  ...mk('hat', 'Baseball Cap', 'hat', 20, 1, ['red', 'navy']),
  ...mk('hat', 'Beanie', 'hat', 15, 1, ['grey', 'black']),
  ...mk('hat', 'Straw Hat', 'hat', 30, 2, ['beige']),
  ...mk('hat', 'Jade Crown', 'hat', 900, 8, ['teal']),
];
export const CLOTH_BY_ID = Object.fromEntries(CLOTHES.map(x => [x.id, x]));
export const CLOTH_SLOTS = { top: 'Tops', bottom: 'Bottoms', dress: 'Dresses', outer: 'Outerwear', socks: 'Socks', shoes: 'Shoes', hat: 'Hats' };
// what the renderer needs
export function outfitFor(c) {
  const o = {}; for (const [slot, id] of Object.entries(c.outfit || {})) { const it = CLOTH_BY_ID[id]; if (it) o[slot] = { color: it.color, kind: it.kind }; }
  return o;
}
export const outfitStyle = c => Object.values(c.outfit || {}).reduce((s, id) => s + (CLOTH_BY_ID[id]?.style || 0), 0);
