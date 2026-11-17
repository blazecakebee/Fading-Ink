// v0.9.28 Property & business: vendors (dealerships, estate agents, land brokers, an old factory owner, liquidators,
// commercial brokers and investors), vehicles, homes, and businesses you manage. Business income follows a
// supply-and-demand market per sector, and a business that runs out of money goes bankrupt.
import { G } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp } from '../core/rng.js';
import { stat, money, fmtMoney, country, addItem, priceFor } from './life.js';
import { eff } from './body.js';

const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.5; // ~N(0,1)

// ---------------------------------------------------------------- market sectors
export const SECTORS = {
  grain:        { name: 'Grain', icon: '🌾', vol: 0.08 },
  produce:      { name: 'Fruit & wine', icon: '🍇', vol: 0.10 },
  livestock:    { name: 'Livestock', icon: '🐄', vol: 0.09 },
  herbs:        { name: 'Spirit herbs', icon: '🌿', vol: 0.14 },
  food:         { name: 'Packaged food', icon: '🥫', vol: 0.07 },
  textiles:     { name: 'Textiles', icon: '🧵', vol: 0.10 },
  construction: { name: 'Building materials', icon: '🧱', vol: 0.12 },
  steel:        { name: 'Steel', icon: '⚙️', vol: 0.13 },
  electronics:  { name: 'Electronics', icon: '💡', vol: 0.18 },
  pills:        { name: 'Pills & elixirs', icon: '💊', vol: 0.15 },
  retail:       { name: 'Retail', icon: '🛍️', vol: 0.09 },
  hospitality:  { name: 'Hospitality', icon: '🏨', vol: 0.12 },
};
const MARKET_EVENTS = [
  { t: 'A drought scorches the farmland. Crops are scarce and prices jump.', s: { grain: -0.25, produce: -0.2 } },
  { t: 'A recession bites. People stop spending.', d: { produce: -0.12, textiles: -0.15, construction: -0.18, steel: -0.15, electronics: -0.18, retail: -0.15, hospitality: -0.2 } },
  { t: 'An economic boom! Everyone is buying.', d: { produce: 0.1, textiles: 0.1, construction: 0.15, steel: 0.12, electronics: 0.15, retail: 0.12, hospitality: 0.15 } },
  { t: 'A new gadget craze sweeps the world.', d: { electronics: 0.3 } },
  { t: 'Disease rips through the herds.', s: { livestock: -0.3 }, hurt: 'livestock' },
  { t: 'A cultivation craze: everyone wants herbs and elixirs.', d: { herbs: 0.3, pills: 0.25 } },
  { t: 'A building boom — cranes over every city.', d: { construction: 0.3, steel: 0.2 } },
  { t: 'A bumper harvest floods the markets.', s: { grain: 0.25, produce: 0.2 } },
  { t: 'A tourism boom fills the hotels.', d: { hospitality: 0.3, retail: 0.1 } },
  { t: 'Cheap imports flood the shops.', s: { textiles: 0.2, electronics: 0.15, steel: 0.15 } },
];
export function ensureMarket() {
  const W = G.world; W.biz ||= { year: W.year, news: null, hist: {} };
  for (const k of Object.keys(SECTORS)) { W.biz[k] ||= { d: 1 + gauss() * 0.05, s: 1 + gauss() * 0.05 }; W.biz.hist[k] ||= []; }
  return W.biz;
}
export const priceIdx = k => { const m = ensureMarket()[k]; return clamp(m.d / m.s, 0.55, 1.7); };
export const trend = k => { const h = ensureMarket().hist[k]; return h.length >= 2 ? h[h.length - 1] - h[h.length - 2] : 0; };
function marketYear(c) {
  const B = ensureMarket(); if (B.year === G.world.year) return; B.year = G.world.year; B.news = null;
  const ev = chance(0.3) ? pick(MARKET_EVENTS) : null;
  const own = {}; for (const a of c.assets || []) if (a.type === 'biz') own[a.sector] = (own[a.sector] || 0) + Math.min(0.06, 0.012 * (a.out || 1) * Math.sqrt(a.base / (1e6 * country(c).econ)));
  for (const [k, S] of Object.entries(SECTORS)) {
    const m = B[k], p = clamp(m.d / m.s, 0.55, 1.7);
    m.d = clamp(1 + (m.d - 1) * 0.7 + gauss() * S.vol + (ev?.d?.[k] || 0), 0.5, 1.9);
    m.s = clamp(1 + (m.s - 1) * 0.6 + (p - 1) * 0.3 + gauss() * S.vol * 0.5 + (ev?.s?.[k] || 0) + (own[k] || 0), 0.5, 1.9); // high prices lure new producers in next year
    B.hist[k].push(+priceIdx(k).toFixed(3)); if (B.hist[k].length > 12) B.hist[k].shift();
  }
  if (ev) { B.news = ev; if ((c.assets || []).some(a => a.type === 'biz')) ui.log(`📈 Market news: ${ev.t}`, 'world'); }
}

// ---------------------------------------------------------------- catalogue
// vehicles: kind car (needs license) | moto (license) | boat | plane. prestige 0..3 = extra happiness a year. upkeep = share of price a year.
const V = (id, name, price, kind, prestige = 0, upkeep = 0.04, extra = {}) => ({ id, name, price, kind, prestige, upkeep, cat: 'vehicle', ...extra });
const HSE = (id, name, price, prestige, upkeep, desc, extra = {}) => ({ id, name, price, prestige, upkeep, desc, cat: 'home', ...extra });
// businesses: rev = revenue as a share of price at a normal market, varC = share of revenue spent producing it, fixed = yearly fixed cost (share of price)
const BIZ = (id, name, price, sector, rev, varC, fixed, desc, extra = {}) => ({ id, name, price, sector, rev, varC, fixed, desc, cat: 'biz', ...extra });

export const VENDORS = [
  // ---- vehicles
  { id: 'bob', group: 'vehicles', name: "Budget Bob's Used Cars", icon: '🚙', blurb: 'Cheap, honest-ish, cash only. No refunds.', items: [
    V('old_hatch', 'Old hatchback', 3000, 'car', 0, 0.08), V('rusty_pickup', 'Rusty pickup', 4500, 'car', 0, 0.08), V('used_sedan', 'Used sedan', 7000, 'car', 0, 0.06), V('used_moto', 'Used motorbike', 2000, 'moto', 0, 0.06)] },
  { id: 'kestrel', group: 'vehicles', name: 'Kestrel Motors', icon: '🚗', blurb: 'Reliable family cars from the biggest brand in the country.', items: [
    V('k_wren', 'Kestrel Wren (hatchback)', 18000, 'car', 0), V('k_falcon', 'Kestrel Falcon (sedan)', 26000, 'car', 1), V('k_family', 'Kestrel Nest (minivan)', 32000, 'car', 1), V('k_ridge', 'Kestrel Ridge (SUV)', 38000, 'car', 1), V('k_volt', 'Kestrel Volt (electric)', 42000, 'car', 1, 0.025)] },
  { id: 'ironhide', group: 'vehicles', name: 'Ironhide Trucks', icon: '🛻', blurb: 'Built for work. Business owners get their money\'s worth.', items: [
    V('i_mule', 'Ironhide Mule (pickup)', 34000, 'car', 1, 0.04, { work: 0.03 }), V('i_hauler', 'Ironhide Hauler (box truck)', 60000, 'car', 0, 0.05, { work: 0.06 }), V('i_titan', 'Ironhide Titan (off-roader)', 75000, 'car', 2, 0.05)] },
  { id: 'hanzo', group: 'vehicles', name: 'Hanzo Motorcycles', icon: '🏍️', blurb: 'Two wheels, one soul.', items: [
    V('h_street', 'Hanzo Street 250', 9000, 'moto', 1), V('h_sport', 'Hanzo Kaze (sport bike)', 22000, 'moto', 2), V('h_tourer', 'Hanzo Tabi (tourer)', 30000, 'moto', 2)] },
  { id: 'velluto', group: 'vehicles', name: 'Velluto Luxury', icon: '✨', blurb: 'Leather, silence and a waiting list.', items: [
    V('v_serena', 'Velluto Serena (sedan)', 95000, 'car', 2, 0.04), V('v_gt', 'Velluto GT (coupe)', 160000, 'car', 3, 0.05), V('v_imperatore', 'Velluto Imperatore (limousine)', 240000, 'car', 3, 0.06)] },
  { id: 'aurum', group: 'vehicles', name: 'Aurum Supercars', icon: '🏎️', blurb: 'By appointment only.', items: [
    V('a_strale', 'Aurum Strale', 320000, 'car', 3, 0.06), V('a_fulmine', 'Aurum Fulmine (hypercar)', 1800000, 'car', 3, 0.07)] },
  { id: 'bluewater', group: 'vehicles', name: 'Bluewater Marina & Aviation', icon: '⛵', blurb: 'Boats and aircraft. Pilots and crew included in the upkeep.', items: [
    V('jetski', 'Jet ski', 15000, 'boat', 1, 0.06), V('sailboat', 'Sailboat', 90000, 'boat', 2, 0.06), V('yacht', 'Motor yacht', 2500000, 'boat', 3, 0.08), V('cessna', 'Light aircraft', 450000, 'plane', 3, 0.1), V('jet', 'Private jet', 12000000, 'plane', 3, 0.12)] },
  // ---- homes
  { id: 'cornerstone', group: 'homes', name: 'Cornerstone Realty', icon: '🏠', blurb: 'Homes for real people.', items: [
    HSE('studio', 'Studio apartment', 60000, 0, 0.01, 'Small, but yours.'), HSE('fixer', 'Fixer-upper house', 90000, 0, 0.025, 'Cheap. Needs work — high upkeep until you sell it.'), HSE('flat', 'One-bedroom flat', 110000, 0, 0.01, 'A real home.'),
    HSE('townhouse', 'Townhouse', 180000, 1, 0.012, 'Two floors and a tiny garden.'), HSE('family', 'Family house', 250000, 1, 0.012, 'Room for children and a dog.')] },
  { id: 'lotus', group: 'homes', name: 'Lotus Heritage Homes', icon: '🏯', blurb: 'Old houses with old souls.', items: [
    HSE('courtyard', 'Courtyard house', 650000, 2, 0.015, 'Four wings around a quiet courtyard.'), HSE('teamanor', 'Tea-plantation manor', 1500000, 2, 0.02, 'Mist, hills and very good tea.'),
    HSE('retreat', "Cultivator's mountain retreat", 2000000, 2, 0.02, 'Dense spiritual Qi. +6% Qi gain while you live here.', { qi: 1.06, needQi: true })] },
  { id: 'skyline', group: 'homes', name: 'Skyline Estates', icon: '🌆', blurb: 'Luxury property for people who never check the price.', items: [
    HSE('villa', 'Mountain villa', 900000, 3, 0.015, 'Views for days.'), HSE('penthouse', 'City penthouse', 1200000, 3, 0.015, 'The whole city at your feet.'),
    HSE('mansion', 'Lakeside mansion', 2800000, 3, 0.02, 'Twenty rooms. You will use four.'), HSE('island', 'Private island', 15000000, 3, 0.025, 'A beach, a dock and nobody else.')] },
  // ---- land & farms
  { id: 'greenfield', group: 'land', name: 'Greenfield Land & Agriculture', icon: '🌾', blurb: 'Working farms, sold with the equipment and the staff.', items: [
    BIZ('rice', 'Rice paddies', 180000, 'grain', 0.5, 0.62, 0.06, 'Steady, low-risk farming.'), BIZ('wheat', 'Wheat farm', 220000, 'grain', 0.5, 0.62, 0.06, 'Bread for half the province.'),
    BIZ('orchard', 'Orchard', 260000, 'produce', 0.5, 0.6, 0.065, 'Apples, pears and peaches.'), BIZ('poultry', 'Poultry farm', 300000, 'livestock', 0.52, 0.63, 0.06, 'Eggs and chickens. Vulnerable to disease.'),
    BIZ('vineyard', 'Vineyard', 600000, 'produce', 0.5, 0.58, 0.07, 'Good years are very good.'), BIZ('ranch', 'Cattle ranch', 900000, 'livestock', 0.52, 0.62, 0.065, 'Big land, big herds, big risks.'),
    BIZ('herbgarden', 'Spirit herb garden', 1400000, 'herbs', 0.55, 0.55, 0.08, 'Grows Spirit Herbs for the cultivation world. Sometimes gives you herbs too.', { needQi: true, yields: 'spirit_herb' })] },
  // ---- industry
  { id: 'wen', group: 'industry', name: 'Old Man Wen (retiring factory owner)', icon: '🏭', blurb: '"I built these with my own hands. Treat them well." His listings change every year, and they are not new.', rotating: 3, used: true, items: [
    BIZ('textile', 'Textile mill', 1200000, 'textiles', 0.7, 0.72, 0.08, 'Looms and long shifts.'), BIZ('brickworks', 'Brickworks', 800000, 'construction', 0.68, 0.7, 0.08, 'Rides the building cycle.'),
    BIZ('cannery', 'Food cannery', 1600000, 'food', 0.7, 0.74, 0.07, 'Boring. Reliable.'), BIZ('steelworks', 'Steel works', 4500000, 'steel', 0.76, 0.72, 0.09, 'Huge, hot, cyclical.'),
    BIZ('electronics', 'Electronics plant', 8000000, 'electronics', 0.8, 0.75, 0.09, 'Boom and bust.'), BIZ('refinery', 'Pill refinery', 3000000, 'pills', 0.72, 0.68, 0.09, 'Makes elixirs for cultivators. Sometimes gives you pills too.', { needQi: true, yields: 'qi_pill' })] },
  { id: 'liquidators', group: 'industry', name: 'The Liquidators Guild', icon: '⚖️', blurb: 'Bankrupt businesses, sold off cheap. Rough condition, deep discounts.', rotating: 2, used: true, cheap: true, items: [] },
  // ---- commercial
  { id: 'meridian', group: 'commercial', name: 'Meridian Commercial Brokers', icon: '🏬', blurb: 'Shops, restaurants and hotels, open for business.', items: [
    BIZ('cornershop', 'Corner shop', 150000, 'retail', 0.9, 0.82, 0.06, 'Long hours, small margins.'), BIZ('noodles', 'Noodle restaurant', 250000, 'hospitality', 0.75, 0.7, 0.1, 'Loved by locals.'),
    BIZ('teahouse', 'Tea house', 400000, 'hospitality', 0.75, 0.68, 0.1, 'Quiet money.'), BIZ('hotel', 'Hotel', 3500000, 'hospitality', 0.75, 0.7, 0.1, 'Forty rooms and a rooftop bar.'),
    BIZ('mall', 'Shopping mall', 25000000, 'retail', 0.9, 0.77, 0.07, 'A cathedral of shopping.')] },
];
export const ALL_ITEMS = Object.fromEntries(VENDORS.flatMap(v => v.items).map(x => [x.id, x]));
export const GROUPS = { vehicles: 'Dealerships', homes: 'Real estate', land: 'Land & farms', industry: 'Industry', commercial: 'Commercial', investors: 'Investors' };

// rotating stock (Old Man Wen, the Liquidators): rebuilt every year
export function stock(c, v) {
  if (!v.rotating) return v.items;
  c.vend ||= {}; const k = v.id;
  if (c.vend[k]?.year !== G.world.year) {
    const pool = v.cheap ? VENDORS.filter(x => ['land', 'industry', 'commercial'].includes(x.group) && x.id !== 'liquidators').flatMap(x => x.items).filter(x => x.price <= 5e6) : v.items;
    c.vend[k] = { year: G.world.year, list: pool.slice().sort(() => Math.random() - 0.5).slice(0, v.rotating).map(x => ({ id: x.id, cond: v.cheap ? +(0.5 + Math.random() * 0.3).toFixed(2) : +(0.65 + Math.random() * 0.3).toFixed(2), sold: false })) };
  }
  return c.vend[k].list.filter(x => !x.sold).map(x => ({ ...ALL_ITEMS[x.id], cond: x.cond, _slot: x }));
}
export const askPrice = (c, it) => priceFor(c, it.price * country(c).econ * (it.cond ? (it.cond * (it.cheap ? 0.75 : 0.85) + 0.05) : 1));
export function canBuy(c, it, hasLicense) {
  if (c.age < 18) return 'You must be 18.';
  if (it.needQi && !c.qi?.known) return 'Only cultivators know where to sell this.';
  if (it.cat === 'vehicle' && (it.kind === 'car' || it.kind === 'moto') && !hasLicense) return "You need a driver's license.";
  if (c.money < askPrice(c, it)) return 'Not enough money.';
  return null;
}
export function buy(c, it, vendorName) {
  const p = askPrice(c, it), k = country(c).econ; money(c, -p);
  if (it._slot) it._slot.sold = true;
  if (it.cat === 'vehicle') c.assets.push({ type: it.kind === 'boat' ? 'boat' : it.kind === 'plane' ? 'plane' : 'car', kind: it.kind, def: it.id, name: it.name, value: p, prestige: it.prestige, upkeep: it.upkeep, work: it.work || 0 });
  else if (it.cat === 'home') c.assets.push({ type: 'house', def: it.id, name: it.name, value: p, prestige: it.prestige, upkeep: it.upkeep, qi: it.qi });
  else c.assets.push({ type: 'biz', def: it.id, name: it.name, sector: it.sector, base: Math.round(it.price * k), value: p, cond: it.cond || 1, level: 1, prod: 'normal', wages: 'fair', mgr: false, cash: Math.round(it.price * k * 0.08), loan: 0, stake: 1, hist: [], warn: 0, bought: G.world.year });
  stat(c, 'happiness', it.cat === 'biz' ? 6 : 8 + (it.prestige || 0) * 2);
  return `I bought ${/^[aeiou]/i.test(it.name) ? 'an' : 'a'} ${it.name.toLowerCase()} from ${vendorName || 'a dealer'} for ${fmtMoney(c, p)}.`;
}

// ---------------------------------------------------------------- business mechanics
const PROD = { low: 0.7, normal: 1, high: 1.3 }, WAGE = { cheap: 0.9, fair: 1, generous: 1.08 };
export const PROD_NAME = { low: 'Cautious (70%)', normal: 'Normal', high: 'Full tilt (130%)' }, WAGE_NAME = { cheap: 'Cheap', fair: 'Fair', generous: 'Generous' };
export const bizDef = a => ALL_ITEMS[a.def];
export const capacity = a => (1 + (a.level - 1) * 0.2) * a.cond;
export const mgrCost = a => Math.round(a.base * 0.025);
export const upgradeCost = a => Math.round(a.base * 0.25 * a.level);
export const managedThisYear = c => c.bizManaged === G.world.year;
// what this year is likely to look like, for the UI
export function forecast(c, a) {
  const D = bizDef(a), p = priceIdx(a.sector), eff2 = mgmtMult(c, a), out = PROD[a.prod] * capacity(a) * eff2;
  const rev = a.base * D.rev * out * p * (a.wages === 'generous' ? 1.04 : 1), cost = a.base * D.rev * D.varC * out * WAGE[a.wages], fixed = a.base * D.fixed + (a.mgr ? mgrCost(a) : 0) + a.loan * 0.09;
  return { rev, cost, fixed, profit: (rev - cost - fixed) * a.stake, p, out };
}
function mgmtMult(c, a) {
  const smart = (eff(c, 'smarts') - 50) / 500;
  const work = (c.assets || []).reduce((m, x) => Math.max(m, x.work || 0), 0); // a work truck helps logistics
  return (a.mgr ? 1.03 : managedThisYear(c) ? 1 + Math.max(0, smart) + 0.02 : 0.85) + work;
}
export function valuation(a) {
  const h = a.hist.slice(-3), avg = h.length ? h.reduce((s, x) => s + x.profit, 0) / h.length / a.base : 0.12;
  return Math.max(0, Math.round((a.base * a.cond * (1 + 0.15 * (a.level - 1)) * clamp(0.6 + avg / 0.13 * 0.4, 0.3, 1.8)) * a.stake + a.cash - a.loan));
}
function bizYear(c, a) {
  const D = bizDef(a); if (!D) return;
  const f = forecast(c, a); let { rev, cost, fixed } = f; const ev = [];
  // things happen
  const strike = a.wages === 'cheap' ? 0.3 : a.wages === 'fair' ? 0.06 : 0.01;
  if (chance(strike)) { rev *= 0.6; cost *= 0.6; ev.push('Workers went on strike over pay'); }
  if (['textiles', 'construction', 'steel', 'electronics', 'pills', 'food'].includes(a.sector) && chance(a.prod === 'high' ? 0.18 : 0.06)) { const r = a.base * 0.05; fixed += r; a.cond = Math.max(0.4, +(a.cond - 0.05).toFixed(2)); ev.push(`A machine broke down (${fmtMoney(c, r)} in repairs)`); }
  if (chance(0.08)) { rev *= 1.2; ev.push('Landed a big contract'); }
  if (chance(a.wages === 'generous' ? 0.02 : 0.06)) { const fine = a.base * 0.02; fixed += fine; ev.push(`Fined by inspectors (${fmtMoney(c, fine)})`); }
  if (G.world.biz.news?.hurt === a.sector && chance(0.4)) { rev *= 0.5; cost *= 0.6; ev.push('Our own herds caught the disease'); }
  if (a.prod === 'high') a.cond = Math.max(0.4, +(a.cond - 0.02).toFixed(2)); // running flat-out wears things out
  const profit = Math.round((rev - cost - fixed) * a.stake);
  a.cash += profit; if (a.cash < 0) a.cash = Math.round(a.cash * 1.12); // overdrafts cost 12%
  a.hist.push({ year: G.world.year, rev: Math.round(rev), cost: Math.round(cost + fixed), profit, p: +f.p.toFixed(2), ev }); if (a.hist.length > 8) a.hist.shift();
  if (D.yields && profit > 0 && chance(0.5)) { addItem(c, D.yields, ri(1, 3)); ev.push(`You received some ${D.yields === 'spirit_herb' ? 'Spirit Herbs' : 'Qi Gathering Pills'}`); }
  a.value = valuation(a);
  // bankruptcy: debt beyond half of what the business is worth on paper
  const debt = Math.max(0, -a.cash) + a.loan, limit = a.base * a.cond * 0.5;
  if (debt > limit) {
    if (a.warn >= 1) return bankrupt(c, a);
    a.warn++; ui.log(`⚠️ My ${a.name} is drowning in debt (${fmtMoney(c, debt)}). Creditors want ${fmtMoney(c, debt - limit * 0.7)} or they will force it into bankruptcy next year.`, 'bad');
  } else if (a.warn && debt < limit * 0.7) a.warn = 0;
  const line = `${a.name}: ${profit >= 0 ? 'profit' : 'loss'} of ${fmtMoney(c, Math.abs(profit))} (${SECTORS[a.sector].name} prices ×${f.p.toFixed(2)})${ev.length ? ' — ' + ev.join('; ') : ''}.`;
  ui.log(line, profit >= 0 ? 'good' : 'bad');
}
function bankrupt(c, a) {
  c.assets.splice(c.assets.indexOf(a), 1); c.flags.bankruptcies = (c.flags.bankruptcies || 0) + 1;
  stat(c, 'stress', 20); stat(c, 'happiness', -15);
  ui.log(`💥 My ${a.name} went bankrupt. The creditors seized everything. Years of work, gone.`, 'death');
}
export function declareBankruptcy(c, a) { bankrupt(c, a); }
export function sellBiz(c, a, share = 1) {
  const v = Math.round(valuation(a) * (0.85 + Math.min(0.15, eff(c, 'charisma') / 600)));
  if (share >= 1) { c.assets.splice(c.assets.indexOf(a), 1); money(c, Math.max(0, v)); return `Harbor Capital bought my ${a.name} for ${fmtMoney(c, Math.max(0, v))}.`; }
  const got = Math.round(v / a.stake * share); a.stake = +(a.stake - share).toFixed(2); money(c, got); a.value = valuation(a);
  return `I sold a ${Math.round(share * 100)}% stake in my ${a.name} to investors for ${fmtMoney(c, got)}. They now take their share of the profits.`;
}
export function takeLoan(c, a) { const amt = Math.round(a.base * 0.3); a.loan += amt; a.cash += amt; return `Harbor Capital lent my ${a.name} ${fmtMoney(c, amt)} at 9% a year.`; }
export function repayLoan(c, a) { const amt = Math.min(a.loan, Math.max(0, a.cash)); a.loan -= amt; a.cash -= amt; return amt ? `Repaid ${fmtMoney(c, amt)} of the loan.` : null; }
export function upgrade(c, a) { const k = upgradeCost(a); if (a.level >= 3 || c.money < k) return null; money(c, -k); a.level++; a.cond = Math.min(1, +(a.cond + 0.25).toFixed(2)); a.value = valuation(a); return `I expanded and refitted my ${a.name} (level ${a.level}).`; }
export function repair(c, a) { const k = Math.round(a.base * (1 - a.cond) * 0.6); if (a.cond >= 1 || c.money < k) return null; money(c, -k); a.cond = 1; a.value = valuation(a); return `I repaired my ${a.name} for ${fmtMoney(c, k)}.`; }
export const repairCost = a => Math.round(a.base * (1 - a.cond) * 0.6);

// ---------------------------------------------------------------- yearly
export function propertyYear(c) {
  marketYear(c);
  let up = 0;
  for (const a of [...(c.assets || [])]) {
    if (a.type === 'biz') { bizYear(c, a); continue; }
    if (a.upkeep) up += a.value * a.upkeep * (a.tenant ? 0.5 : 1);
  }
  if (up > 0) { up = Math.round(up); money(c, -up); if (up > 0.02 * Math.max(1, c.money)) ui.log(`Upkeep, insurance and property tax on what I own: ${fmtMoney(c, up)}.`, ''); }
}
// passive bonuses (the cultivator's retreat)
export const propertyMods = c => (c.assets || []).filter(a => a.qi && a.type === 'house' && !a.tenant).map(a => ({ qi: a.qi }));
// "Manage your businesses" action
export const MANAGE = { id: 'manage_biz', cat: 'work', name: 'Manage your businesses', icon: 'career', minAge: 18, need: c => (c.assets || []).some(a => a.type === 'biz' && !a.mgr) && !managedThisYear(c), run: c => {
  c.bizManaged = G.world.year; stat(c, 'stress', 3);
  const n = c.assets.filter(a => a.type === 'biz' && !a.mgr).length;
  return { text: `I spent the year checking books, chasing suppliers and walking the floor of my ${n > 1 ? n + ' businesses' : 'business'}. They will run properly this year.`, cls: 'good' }; } };
