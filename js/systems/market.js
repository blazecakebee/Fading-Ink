// Stock market: a handful of companies whose prices move every year with their own volatility AND the year's world news.
// Prices are shared by the world (G.world.market); your holdings are c.portfolio (shares). c.stocks mirrors the value.
import { G } from '../core/state.js';
import { ui } from '../core/bus.js';
import { clamp } from '../core/rng.js';
import { money, fmtMoney } from './life.js';

export const STOCKS = [
  { id: 'FIDX', name: 'World Index Fund', sector: 'index', price: 100, vol: 0.07, drift: 0.05, desc: 'A slice of everything. Slow and steady.' },
  { id: 'HNTR', name: 'Hunter Arms Co.', sector: 'gates', price: 40, vol: 0.22, drift: 0.04, desc: 'Gear for Gate hunters. Loves Gate surges and beast tides.' },
  { id: 'SPRX', name: 'Spirit Pharma', sector: 'qi', price: 60, vol: 0.2, drift: 0.05, desc: 'Pills and medicine. Rises with Spirit Tides, droughts and plagues.' },
  { id: 'NEON', name: 'Neon Grid Tech', sector: 'tech', price: 25, vol: 0.3, drift: 0.07, desc: 'High risk, high reward. Thrives in golden ages.' },
  { id: 'JADE', name: 'Jade Bank', sector: 'finance', price: 80, vol: 0.14, drift: 0.04, desc: 'Banks love booms and hate crashes.' },
  { id: 'LOTS', name: 'Lotus Foods', sector: 'consumer', price: 30, vol: 0.09, drift: 0.035, desc: 'People always need to eat.' },
  { id: 'SHLD', name: 'Bulwark Insurance', sector: 'insurance', price: 55, vol: 0.12, drift: 0.04, desc: 'Pays out when disaster strikes — and suffers for it.' },
  { id: 'MOON', name: 'Moonpetal Media', sector: 'media', price: 12, vol: 0.38, drift: 0.05, desc: 'Celebrity, streaming, hype. Wild swings.' },
];
export const STOCK = Object.fromEntries(STOCKS.map(s => [s.id, s]));
// how each world condition hits each sector
const NEWS = {
  crash: { all: -0.2, finance: -0.12, tech: -0.1 }, boom: { all: 0.1, finance: 0.06, tech: 0.06 },
  gate_surge: { gates: 0.25, insurance: -0.12 }, beast_tide: { gates: 0.15, insurance: -0.2, consumer: -0.05 },
  qi_tide: { qi: 0.2 }, qi_drought: { qi: 0.15, consumer: -0.05 }, plague: { qi: 0.12, consumer: -0.08, media: 0.05 },
  sect_war: { gates: 0.1, insurance: -0.06 }, golden_age: { all: 0.05, tech: 0.12, media: 0.1 },
};
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
export function market() {
  const m = (G.world.market ||= { year: G.world.year, prices: {}, hist: {} });
  for (const s of STOCKS) { m.prices[s.id] ??= s.price; if (!m.hist[s.id]) { // a fresh world gets 15 years of back-history for the charts
      const h = [s.price]; for (let i = 0; i < 15; i++) h.unshift(Math.max(1, Math.round(h[0] / (1 + clamp(s.drift + gauss() * s.vol, -0.5, 0.9)) * 100) / 100)); m.hist[s.id] = h; } }
  return m;
}
export function marketYear() {
  const m = market(); if (m.year === G.world.year) return; m.year = G.world.year;
  const n = G.world.news?.year === G.world.year ? NEWS[G.world.news.id] || {} : {};
  for (const s of STOCKS) {
    const r = clamp(s.drift + gauss() * s.vol + (n.all || 0) + (n[s.sector] || 0), -0.6, 1.2);
    m.prices[s.id] = Math.max(1, Math.round(m.prices[s.id] * (1 + r) * 100) / 100);
    m.hist[s.id].push(m.prices[s.id]); m.hist[s.id] = m.hist[s.id].slice(-40);
  }
}
export const holdings = c => Object.entries(c.portfolio || {}).filter(([, n]) => n > 0);
export const portfolioValue = c => holdings(c).reduce((t, [id, n]) => t + n * (market().prices[id] || 0), 0);
export function syncStocks(c) { c.stocks = Math.round(portfolioValue(c)); }
export function buy(c, id, cash) {
  cash = Math.min(cash, c.money); if (cash <= 0) return null; // no investing with money you don't have
  const p = market().prices[id]; const n = Math.floor(cash / p * 1000) / 1000; if (n <= 0) return null;
  money(c, -n * p); (c.portfolio ||= {})[id] = (c.portfolio[id] || 0) + n; syncStocks(c);
  return `I bought ${n.toLocaleString()} shares of ${STOCK[id].name} for ${fmtMoney(c, n * p)}.`;
}
export function sell(c, id, frac) {
  const have = c.portfolio?.[id] || 0; if (have <= 0) return null;
  const n = frac >= 1 ? have : Math.floor(have * frac * 1000) / 1000; const v = n * market().prices[id];
  c.portfolio[id] = have - n; if (c.portfolio[id] < 1e-6) delete c.portfolio[id]; money(c, v); syncStocks(c);
  return `I sold ${n.toLocaleString()} shares of ${STOCK[id].name} for ${fmtMoney(c, v)}.`;
}
// yearly: prices move (once per world year), then your net worth follows
export function portfolioYear(c) {
  const before = portfolioValue(c); marketYear(); const after = portfolioValue(c); syncStocks(c);
  if (before > 0) { const d = after - before; ui.log(`My portfolio ${d >= 0 ? 'gained' : 'lost'} ${fmtMoney(c, Math.abs(d))} (${(d / before * 100).toFixed(1)}%). See the Market tab.`, d >= 0 ? 'good' : 'bad'); }
  (c.portHist ||= []).push(Math.round(after)); c.portHist = c.portHist.slice(-40);
}
// pre-0.6.3 saves had one lump "investments" number → move it into the index fund
export function migrateStocks(c) { if (c.stocks > 0 && !c.portfolio) { c.portfolio = { FIDX: c.stocks / market().prices.FIDX }; } c.portfolio ||= {}; }
