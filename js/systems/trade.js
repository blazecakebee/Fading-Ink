// v0.9.33 Trade: every merchant in town. Stock rotates every year, some things run low (and get pricier),
// some sell out, and every country's smiths make their own weapons.
import { G } from '../core/state.js';
import { ri, pick, chance, clamp } from '../core/rng.js';
import { country, priceFor, money, addItem, fmtMoney } from './life.js';
import { ITEMS, marketValue } from '../data/items.js';
import { CLOTHES } from '../data/clothing.js';
import { LOCAL } from '../data/localArms.js';

const TRAD = /Qipao|Hanfu|Tang|Cultivator|Kimono|Hanbok|Ao Dai|Sari|Hakama|Haori|Daoist|Kung-fu|Wushu|Martial|Geta|Tabi|Jade|Guan|Lotus|Turban|Rice Hat|Cloud-Step|Kitsune|Oni|Hannya|Veil|Cloth Shoes/;
const tailorOf = x => x.slot === 'hat' || x.slot === 'mask' ? 'milliner' : TRAD.test(x.name) ? 'silkroad' : x.slot === 'shoes' || x.slot === 'socks' ? 'cobbler' : x.style >= 4 ? 'atelier' : x.style <= 2 ? 'street' : 'corner';
const APOTH = { qi_pill: 300, heal_pill: 250, calm_incense: 400, heart_pill: 600, mending_salve: 900, purity_pill: 1500, marrow_pill: 3000, foundation_pill: 6000, trib_talisman: 5000 };
const MATS = ['cloth', 'iron_ore', 'spirit_herb', 'beast_core', 'spirit_stone', 'ginseng'];
const shopGear = slots => Object.entries(ITEMS).filter(([, it]) => it.shop && slots.includes(it.slot)).map(([id]) => id);

// group → merchants. kind: gear | cloth | goods
export const MERCHANTS = [
  { id: 'armory', group: 'arms', kind: 'gear', icon: '⚔️', name: 'The City Armory', blurb: 'Everyday blades and armour. Reliable, never exciting.', pool: () => shopGear(['weapon', 'armor']), show: 0.75 },
  { id: 'smith', group: 'arms', kind: 'gear', icon: '🔨', name: c => `${country(c).name}'s Master Smith`, blurb: c => `Weapons you can only buy in ${country(c).name}. A few are made each year — when they're gone, they're gone.`, pool: c => (LOCAL[c.country] || []).map(x => x.id), show: 0.7, scarce: true },
  { id: 'dealer', group: 'arms', kind: 'gear', icon: '🧳', name: 'A Travelling Arms Dealer', blurb: 'Foreign steel, smuggled in. Only here some years — and the import costs extra.', pool: c => Object.entries(LOCAL).filter(([k]) => k !== c.country).flatMap(([, l]) => l.map(x => x.id)), pick: 3, markup: 1.6, chance: 0.45 },
  { id: 'street', group: 'tailors', kind: 'cloth', icon: '👕', name: 'Street Threads', blurb: 'Cheap, cheerful, everywhere.', pool: () => CLOTHES.filter(x => tailorOf(x) === 'street').map(x => x.id), show: 0.7 },
  { id: 'corner', group: 'tailors', kind: 'cloth', icon: '🧵', name: "Mrs. Fong's Corner Tailor", blurb: 'Good cloth, fair prices, takes in your hems for free.', pool: () => CLOTHES.filter(x => tailorOf(x) === 'corner').map(x => x.id), show: 0.7 },
  { id: 'atelier', group: 'tailors', kind: 'cloth', icon: '💎', name: 'Golden Thread Atelier', blurb: 'High fashion. The shop assistant looks at your shoes first.', pool: () => CLOTHES.filter(x => tailorOf(x) === 'atelier').map(x => x.id), show: 0.65, scarce: true },
  { id: 'silkroad', group: 'tailors', kind: 'cloth', icon: '🏮', name: 'Silk Road Couture', blurb: 'Traditional dress from every corner of the world, and robes for cultivators.', pool: () => CLOTHES.filter(x => tailorOf(x) === 'silkroad').map(x => x.id), show: 0.7, scarce: true },
  { id: 'cobbler', group: 'tailors', kind: 'cloth', icon: '👞', name: "Cobbler Wu's", blurb: 'Shoes and socks. Wu can tell your whole life story from your heels.', pool: () => CLOTHES.filter(x => tailorOf(x) === 'cobbler').map(x => x.id), show: 0.75 },
  { id: 'milliner', group: 'tailors', kind: 'cloth', icon: '🎭', name: 'The Mask & Millinery', blurb: 'Hats for every head and masks for every face you might need.', pool: () => CLOTHES.filter(x => tailorOf(x) === 'milliner').map(x => x.id), show: 0.7 },
  { id: 'jeweller', group: 'goods', kind: 'gear', icon: '💍', name: 'Silver Lotus Jewellers', blurb: 'Rings, pendants and lucky charms.', pool: () => shopGear(['ring', 'necklace', 'charm']), show: 0.85 },
  { id: 'apothecary', group: 'goods', kind: 'goods', icon: '⚗️', name: 'Old Hu\'s Apothecary', blurb: 'Pills, salves and incense. Rare stock comes and goes.', pool: () => Object.keys(APOTH).filter(id => ITEMS[id]), show: 0.6, scarce: true, needQi: true },
  { id: 'materials', group: 'goods', kind: 'goods', icon: '📦', name: 'Harbour Materials Trader', blurb: 'Cloth, ingots, herbs and cores by the crate.', pool: () => MATS.filter(id => ITEMS[id]), show: 0.85 },
];
export const TRADE_GROUPS = { arms: 'Arms & armour', tailors: 'Tailors', goods: 'Jewellers & goods' };
export const nameOf = (c, m) => typeof m.name === 'function' ? m.name(c) : m.name;
export const blurbOf = (c, m) => typeof m.blurb === 'function' ? m.blurb(c) : m.blurb;

const basePrice = (m, id) => m.kind === 'cloth' ? (CLOTHES.find(x => x.id === id)?.price || 50) : m.kind === 'goods' ? (APOTH[id] || ITEMS[id]?.price || marketValue(id) || 200) : (ITEMS[id]?.price || marketValue(id) || 300);
// the year's stock, rebuilt each year (and when you move country)
export function stockOf(c, m) {
  const T = (c.trade ||= {});
  if (T.year !== G.world.year || T.cty !== c.country) { T.year = G.world.year; T.cty = c.country; T.s = {}; }
  if (!T.s[m.id]) {
    let ids = m.pool(c);
    if (m.chance != null && !chance(m.chance)) ids = [];
    ids = m.pick ? ids.sort(() => Math.random() - 0.5).slice(0, m.pick) : ids.filter(() => chance(m.show ?? 1));
    T.s[m.id] = ids.map(id => { const bp = basePrice(m, id), rare = bp * (m.markup || 1) >= 900;
      const roll = Math.random(), state = roll < 0.12 ? 'shortage' : roll < 0.22 ? 'surplus' : 'normal';
      const left = state === 'shortage' ? 1 : (m.scarce || rare) ? ri(1, 3) : ri(2, 6);
      return { id, left, state, mult: +((m.markup || 1) * (0.9 + Math.random() * 0.25) * (state === 'shortage' ? 1.5 : state === 'surplus' ? 0.85 : 1)).toFixed(3) }; });
  }
  return T.s[m.id];
}
export const priceOf = (c, m, s) => priceFor(c, Math.round(basePrice(m, s.id) * country(c).econ * s.mult * (s.left === 1 && s.state !== 'shortage' ? 1.25 : 1)));
export const stockLabel = s => s.left <= 0 ? 'Sold out' : s.state === 'shortage' ? 'Shortage — last one' : s.left === 1 ? 'Last one (price up)' : s.state === 'surplus' ? `Surplus — on sale (${s.left} left)` : `${s.left} in stock`;
export function canBuy(c, m, s) {
  if (s.left <= 0) return 'Sold out.';
  if (m.needQi && !c.qi?.known && ['foundation_pill', 'marrow_pill', 'purity_pill'].includes(s.id)) return 'Old Hu won\'t sell this to someone who can\'t feel Qi.';
  if (m.kind !== 'cloth' && c.age < 12) return 'Too young.';
  if (m.kind === 'cloth' && (c.closet || []).includes(s.id)) return 'You already own this.';
  if (c.money < priceOf(c, m, s)) return 'Not enough money.';
  return null;
}
export function buy(c, m, s) {
  const p = priceOf(c, m, s), why = canBuy(c, m, s); if (why) return null;
  money(c, -p); s.left--;
  if (m.kind === 'cloth') { const it = CLOTHES.find(x => x.id === s.id); (c.closet ||= []).push(s.id); (c.outfit ||= {})[it.slot] = s.id; if (it.slot === 'dress') { delete c.outfit.top; delete c.outfit.bottom; } if (['top', 'bottom'].includes(it.slot)) delete c.outfit.dress; return `I bought a ${it.name.toLowerCase()} at ${nameOf(c, m)} and put it on. (${fmtMoney(c, p)})`; }
  addItem(c, s.id); return `I bought ${ITEMS[s.id].name} from ${nameOf(c, m)}. (${fmtMoney(c, p)})`;
}
