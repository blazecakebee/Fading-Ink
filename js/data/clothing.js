// Clothing: buy in the Wardrobe tab, wear one item per slot. Price is in base money (scaled by local economy).
// style = how fashionable it is; your outfit's total style gives a small social bonus.
const C = { black: '#22222a', white: '#e9e6df', navy: '#24345e', red: '#a8323e', green: '#2f6b4c', grey: '#6a6a72', beige: '#cdb89a', pink: '#e58fb0', sky: '#6aa7e0', purple: '#6a4a9a', gold: '#c9a23a', brown: '#6e4a30', olive: '#5d6633', teal: '#2f8a8a', denim: '#3d5a86',
  cream: '#efe4c8', charcoal: '#3a3a42', maroon: '#6a1e2a', mint: '#8fd6b4', lavender: '#b4a2dc', orange: '#e0782f', yellow: '#e6c33a', silver: '#c8ccd4', crimson: '#c0182e', ivory: '#f4efe2', indigo: '#2e2a6e', jade: '#3fa36a' };
const mk = (slot, base, kind, price, style, colors, extra = {}) => colors.map(col => ({ id: `${base.toLowerCase().replace(/[^a-z]+/g, '_')}_${col}`, slot, kind, name: `${col[0].toUpperCase() + col.slice(1)} ${base}`, color: C[col], price, style, ...extra }));
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
  ...mk('hat', 'Baseball Cap', 'hat', 20, 1, ['red', 'navy'], { hk: 'cap' }),
  ...mk('hat', 'Beanie', 'hat', 15, 1, ['grey', 'black'], { hk: 'beanie' }),
  ...mk('hat', 'Straw Hat', 'hat', 30, 2, ['beige'], { hk: 'wide' }),
  ...mk('hat', 'Jade Crown', 'hat', 900, 8, ['teal'], { hk: 'crown' }),
  // ---- v0.9.33 fifteen more in every category, many more hats, and masks
  ...mk('top', 'Polo Shirt', 'shirt', 35, 2, ['navy', 'white']), ...mk('top', 'Turtleneck', 'shirt', 55, 3, ['black', 'cream']), ...mk('top', 'Flannel Shirt', 'shirt', 40, 2, ['red', 'green']),
  ...mk('top', 'Graphic Tee', 'shirt', 25, 2, ['white']), ...mk('top', 'Silk Camisole', 'shirt', 70, 4, ['ivory']), ...mk('top', 'Cardigan', 'shirt', 50, 3, ['mint', 'lavender']),
  ...mk('top', 'Hanfu Inner Top', 'shirt', 80, 4, ['white']), ...mk('top', 'Wushu Uniform Top', 'shirt', 60, 3, ['red']), ...mk('top', 'Varsity Sweatshirt', 'shirt', 45, 2, ['maroon']),
  ...mk('top', 'Linen Shirt', 'shirt', 50, 3, ['beige']), ...mk('top', 'Sequin Top', 'shirt', 150, 6, ['gold']),
  ...mk('bottom', 'Wide-leg Trousers', 'pants', 70, 4, ['cream', 'charcoal']), ...mk('bottom', 'Joggers', 'pants', 30, 1, ['grey', 'black']), ...mk('bottom', 'Leather Pants', 'pants', 160, 5, ['black']),
  ...mk('bottom', 'Culottes', 'shorts', 55, 3, ['mint', 'beige']), ...mk('bottom', 'Hakama', 'pants', 120, 5, ['navy', 'black']), ...mk('bottom', 'Denim Skirt', 'skirt', 40, 2, ['denim']),
  ...mk('bottom', 'Pencil Skirt', 'skirt', 70, 4, ['charcoal', 'maroon']), ...mk('bottom', 'Ripped Jeans', 'pants', 60, 3, ['denim', 'black']), ...mk('bottom', 'Linen Trousers', 'pants', 55, 3, ['beige']),
  ...mk('dress', 'Ao Dai', 'dress', 160, 6, ['white', 'sky', 'red']), ...mk('dress', 'Hanbok', 'dress', 220, 6, ['pink', 'mint']), ...mk('dress', 'Kimono', 'dress', 280, 7, ['crimson', 'navy']),
  ...mk('dress', 'Cocktail Dress', 'dress', 220, 7, ['maroon', 'black']), ...mk('dress', 'Sari', 'dress', 200, 6, ['orange', 'purple']), ...mk('dress', 'Wrap Dress', 'dress', 90, 4, ['lavender', 'green']),
  ...mk('dress', 'Ballgown', 'dress', 900, 10, ['ivory']), ...mk('dress', 'Jumpsuit', 'dress', 110, 4, ['black']),
  ...mk('outer', 'Bomber Jacket', 'jacket', 140, 4, ['olive', 'black']), ...mk('outer', 'Denim Jacket', 'jacket', 90, 3, ['denim']), ...mk('outer', 'Wool Overcoat', 'jacket', 320, 6, ['charcoal', 'brown']),
  ...mk('outer', 'Raincoat', 'jacket', 60, 2, ['yellow']), ...mk('outer', 'Haori', 'robe', 200, 6, ['navy', 'crimson']), ...mk('outer', 'Fur Cloak', 'robe', 600, 8, ['white']),
  ...mk('outer', 'Varsity Jacket', 'jacket', 130, 4, ['maroon', 'navy']), ...mk('outer', 'Daoist Crane Robe', 'robe', 450, 8, ['white', 'black']), ...mk('outer', 'Windbreaker', 'jacket', 70, 2, ['orange']), ...mk('outer', 'Cape', 'robe', 250, 6, ['crimson']),
  ...mk('socks', 'Wool Socks', 'socks', 15, 1, ['cream', 'grey']), ...mk('socks', 'Thigh-highs', 'socks', 20, 2, ['black', 'white']), ...mk('socks', 'Toe Socks', 'socks', 12, 1, ['orange', 'mint']),
  ...mk('socks', 'Sport Socks', 'socks', 8, 0, ['white', 'navy']), ...mk('socks', 'Fishnet Stockings', 'socks', 25, 3, ['black']), ...mk('socks', 'Tabi Socks', 'socks', 18, 2, ['white', 'navy']),
  ...mk('socks', 'Argyle Socks', 'socks', 14, 2, ['maroon', 'green']), ...mk('socks', 'Silk Stockings', 'socks', 40, 3, ['ivory']), ...mk('socks', 'Fuzzy Socks', 'socks', 10, 1, ['pink']),
  ...mk('shoes', 'Running Shoes', 'shoes', 110, 2, ['orange', 'sky']), ...mk('shoes', 'Loafers', 'shoes', 140, 4, ['brown', 'black']), ...mk('shoes', 'Ankle Boots', 'shoes', 160, 4, ['black', 'brown']),
  ...mk('shoes', 'Geta', 'shoes', 40, 3, ['brown']), ...mk('shoes', 'Combat Boots', 'shoes', 130, 3, ['black', 'olive']), ...mk('shoes', 'Ballet Flats', 'shoes', 70, 3, ['pink', 'black']),
  ...mk('shoes', 'Kung-fu Slippers', 'shoes', 30, 2, ['black']), ...mk('shoes', 'High-tops', 'shoes', 120, 3, ['red', 'white']), ...mk('shoes', 'Cloud-Step Boots', 'shoes', 400, 7, ['white']),
  ...mk('hat', 'Top Hat', 'hat', 120, 5, ['black'], { hk: 'top' }), ...mk('hat', 'Fedora', 'hat', 90, 4, ['charcoal', 'brown'], { hk: 'brim' }), ...mk('hat', 'Beret', 'hat', 40, 3, ['red', 'black'], { hk: 'beret' }),
  ...mk('hat', 'Rice Hat', 'hat', 25, 2, ['beige'], { hk: 'wide' }), ...mk('hat', 'Cowboy Hat', 'hat', 80, 3, ['brown'], { hk: 'brim' }), ...mk('hat', 'Bucket Hat', 'hat', 30, 2, ['olive', 'cream'], { hk: 'bucket' }),
  ...mk('hat', 'Cultivator Guan', 'hat', 300, 7, ['black', 'gold'], { hk: 'guan' }), ...mk('hat', 'Bandana', 'hat', 15, 1, ['red', 'navy'], { hk: 'band' }), ...mk('hat', 'Headband', 'hat', 10, 1, ['white'], { hk: 'band' }),
  ...mk('hat', 'Tiara', 'hat', 700, 8, ['silver'], { hk: 'crown' }), ...mk('hat', 'Lotus Crown', 'hat', 1200, 9, ['gold'], { hk: 'crown' }), ...mk('hat', 'Hood', 'hat', 40, 2, ['charcoal', 'crimson'], { hk: 'hood' }),
  ...mk('hat', 'Earmuffs', 'hat', 20, 1, ['pink'], { hk: 'band' }), ...mk('hat', 'Ushanka', 'hat', 70, 3, ['brown'], { hk: 'beanie' }), ...mk('hat', 'Turban', 'hat', 60, 4, ['white', 'indigo'], { hk: 'turban' }),
  ...mk('mask', 'Surgical Mask', 'mask', 5, 0, ['white', 'sky'], { mk: 'mouth' }), ...mk('mask', 'Kitsune Mask', 'mask', 120, 5, ['white', 'red'], { mk: 'full' }), ...mk('mask', 'Oni Mask', 'mask', 150, 5, ['red', 'black'], { mk: 'full' }),
  ...mk('mask', 'Opera Mask', 'mask', 200, 6, ['gold', 'black'], { mk: 'eyes' }), ...mk('mask', 'Masquerade Mask', 'mask', 180, 6, ['purple', 'silver'], { mk: 'eyes' }), ...mk('mask', 'Bandit Bandana', 'mask', 15, 2, ['red', 'navy'], { mk: 'mouth' }),
  ...mk('mask', 'Cultivator Veil', 'mask', 250, 6, ['white', 'lavender'], { mk: 'veil' }), ...mk('mask', 'Hannya Mask', 'mask', 300, 6, ['ivory'], { mk: 'full' }), ...mk('mask', 'Iron Faceguard', 'mask', 140, 3, ['grey'], { mk: 'mouth' }),
  ...mk('mask', 'Sunglasses', 'mask', 60, 4, ['black', 'gold'], { mk: 'shades' }), ...mk('mask', 'Jade Mask', 'mask', 900, 8, ['jade'], { mk: 'full' }),
];
export const CLOTH_BY_ID = Object.fromEntries(CLOTHES.map(x => [x.id, x]));
export const CLOTH_SLOTS = { top: 'Tops', bottom: 'Bottoms', dress: 'Dresses', outer: 'Outerwear', socks: 'Socks', shoes: 'Shoes', hat: 'Hats', mask: 'Masks' };
// what the renderer needs
export function outfitFor(c) {
  const o = {}; for (const [slot, id] of Object.entries(c.outfit || {})) { const it = CLOTH_BY_ID[id]; if (it) o[slot] = { color: it.color, kind: it.kind, hk: it.hk, mk: it.mk }; }
  return o;
}
export const outfitStyle = c => Object.values(c.outfit || {}).reduce((s, id) => s + (CLOTH_BY_ID[id]?.style || 0), 0);
