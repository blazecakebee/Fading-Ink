// v0.9.28 Vendors (Assets tab) and the business management window
import { h, icon } from './dom.js';
import { G, save } from '../core/state.js';
import { fmtMoney, money } from '../systems/life.js';
import { choice, openModal, toast } from './modal.js';
import { fx } from './fx.js';
import * as PR from '../systems/property.js';
import * as LIC from '../systems/license.js';

const rerender = () => import('./render.js').then(m => m.render());
const logLine = (t, cls) => import('./render.js').then(m => m.logLine(t, cls));
const arrow = v => v > 0.03 ? '▲' : v < -0.03 ? '▼' : '▬';
const pct = v => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}%`;

// a little sparkline of a sector's price history
function spark(k) {
  const hs = PR.ensureMarket().hist[k] || [], W = 70, H = 20; if (hs.length < 2) return h('span', { class: 'muted small' }, '—');
  const pts = hs.map((v, i) => `${(i / (hs.length - 1) * W).toFixed(1)},${(H - (v - 0.55) / 1.15 * H).toFixed(1)}`).join(' ');
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', `0 0 ${W} ${H}`); s.setAttribute('class', 'spark');
  s.innerHTML = `<line x1="0" x2="${W}" y1="${H - (1 - 0.55) / 1.15 * H}" y2="${H - (1 - 0.55) / 1.15 * H}" stroke="currentColor" stroke-opacity=".25" stroke-dasharray="2 2"/><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.6"/>`;
  return s;
}
function marketBox() {
  const B = PR.ensureMarket();
  return h('details', { class: 'box', style: { marginTop: '12px' } }, h('summary', {}, h('h3', { style: { display: 'inline' } }, '📈 Commodity market')),
    h('p', { class: 'small muted' }, 'Business income follows these prices. ×1.00 is a normal year. High prices tempt new producers in, so booms tend to end in gluts — and the other way round.' + (B.news ? ` Latest: ${B.news.t}` : '')),
    h('div', { class: 'mkt-grid' }, Object.entries(PR.SECTORS).map(([k, S]) => { const p = PR.priceIdx(k), t = PR.trend(k);
      return h('div', { class: 'mkt-row' }, h('span', {}, S.icon, ' ', S.name), spark(k), h('b', { class: p >= 1.08 ? 'pos' : p <= 0.92 ? 'neg' : '' }, `×${p.toFixed(2)} ${arrow(t)}`)); })));
}
function itemLine(c, it) {
  if (it.cat === 'vehicle') return `${{ car: 'Car', moto: 'Motorbike', boat: 'Boat', plane: 'Aircraft' }[it.kind]}${it.prestige ? ' · ' + '✨'.repeat(it.prestige) : ''} · upkeep ~${fmtMoney(c, PR.askPrice(c, it) * it.upkeep)}/yr${it.work ? ' · helps your businesses' : ''}`;
  if (it.cat === 'home') return `${it.desc} ${it.prestige ? '✨'.repeat(it.prestige) + ' · ' : ''}upkeep ~${fmtMoney(c, PR.askPrice(c, it) * it.upkeep)}/yr`;
  const p = PR.priceIdx(it.sector), exp = it.rev * (1 - it.varC) - it.fixed;
  return `${PR.SECTORS[it.sector].icon} ${PR.SECTORS[it.sector].name} (×${p.toFixed(2)}) · normal-year profit ~${Math.round(exp * 100)}% of price${it.cond ? ` · condition ${Math.round(it.cond * 100)}%` : ''}. ${it.desc}`;
}
function vendorCard(c, v) {
  const list = PR.stock(c, v), lic = LIC.hasLicense(c);
  return h('div', { class: 'card vendor' }, h('div', { class: 'vend-head' }, h('span', { class: 'vend-ic' }, v.icon), h('div', {}, h('b', {}, v.name), h('div', { class: 'small muted' }, v.blurb))),
    list.length ? list.map(it => { const p = PR.askPrice(c, it), why = PR.canBuy(c, it, lic);
      return h('div', { class: 'vend-item' }, h('div', { style: { flex: 1 } }, h('b', {}, it.name), h('div', { class: 'small muted' }, itemLine(c, it))),
        h('button', { class: 'btn mini', disabled: !!why || !c.alive, 'data-tip': why || '', onclick: async () => {
          const ok = await choice({ title: `Buy ${it.name}?`, text: `${v.name}\nPrice: ${fmtMoney(c, p)}${it.cat === 'biz' ? '\n\nA business needs managing: set production and wages, hire a manager or run it yourself each year (an action). If it runs out of money and the debt grows past half its worth, it goes bankrupt and you lose it.' : ''}`, icon: 'market', options: [{ label: `Buy for ${fmtMoney(c, p)}`, value: true }, { label: 'Cancel', value: false, ghost: true }] });
          if (!ok) return; const t = PR.buy(c, it, v.name); fx('coin'); logLine(t, 'good'); save(); rerender(); } }, fmtMoney(c, p))); })
      : h('div', { class: 'small muted' }, v.rotating ? 'Nothing left for sale this year. Come back next year.' : 'Sold out.'));
}
function investorsCard(c) {
  const biz = c.assets.filter(a => a.type === 'biz');
  return h('div', { class: 'card vendor' }, h('div', { class: 'vend-head' }, h('span', { class: 'vend-ic' }, '💼'), h('div', {}, h('b', {}, 'Harbor Capital Investors'), h('div', { class: 'small muted' }, 'They buy businesses, take stakes and lend against them. Open any business you own (Manage) to deal with them.'))),
    biz.length ? biz.map(a => h('div', { class: 'vend-item' }, h('div', { style: { flex: 1 } }, h('b', {}, a.name), h('div', { class: 'small muted' }, `Their valuation: ${fmtMoney(c, PR.valuation(a))}${a.stake < 1 ? ` · you own ${Math.round(a.stake * 100)}%` : ''}`)), h('button', { class: 'btn mini ghost', onclick: () => bizModal(a) }, 'Deal'))) : h('div', { class: 'small muted' }, 'Own a business first.'));
}
export function vendorsSection(c) {
  const tab = G.ui.vendTab || 'vehicles';
  const seg = h('div', { class: 'seg vend-seg' }, Object.entries(PR.GROUPS).map(([k, n]) => h('button', { class: tab === k ? 'on' : '', onclick: () => { G.ui.vendTab = k; rerender(); } }, n)));
  const body = tab === 'investors' ? [investorsCard(c)] : PR.VENDORS.filter(v => v.group === tab).map(v => vendorCard(c, v));
  return [h('h3', { class: 'display', style: { margin: '16px 0 8px' } }, 'Vendors'), seg, tab === 'vehicles' && !LIC.hasLicense(c) ? h('p', { class: 'small muted' }, 'Cars and motorbikes need a driver\'s license. Boats and aircraft don\'t.') : null,
    ['land', 'industry', 'commercial', 'investors'].includes(tab) ? marketBox() : null, h('div', { class: 'grid2 vend-grid' }, body)];
}
// card for an owned business in the "Owned" list
export function bizCard(c, a) {
  const f = PR.forecast(c, a), last = a.hist[a.hist.length - 1];
  return h('div', { class: 'card biz-card' + (a.warn ? ' warn' : '') }, h('div', { class: 'row' }, h('span', { style: { fontSize: '1.4rem' } }, PR.SECTORS[a.sector].icon), h('div', { style: { flex: 1 } }, h('b', {}, a.name),
    h('div', { class: 'small muted' }, `Worth ${fmtMoney(c, PR.valuation(a))} · cash ${fmtMoney(c, a.cash)}${a.loan ? ` · loan ${fmtMoney(c, a.loan)}` : ''}`),
    h('div', { class: 'small ' + (f.profit >= 0 ? 'pos' : 'neg') }, `This year looks like: ${f.profit >= 0 ? '+' : '−'}${fmtMoney(c, Math.abs(f.profit))}${last ? ` · last year ${last.profit >= 0 ? '+' : '−'}${fmtMoney(c, Math.abs(last.profit))}` : ''}`),
    a.warn ? h('div', { class: 'small neg' }, '⚠️ Creditors are circling — bankruptcy next year unless the debt comes down.') : null),
    h('button', { class: 'btn', onclick: () => bizModal(a) }, 'Manage')));
}
export function bizModal(a) {
  const c = G.char; let m;
  const act = (fn) => { const t = fn(); if (t) { logLine(t, 'good'); fx('coin'); } save(); m.close(); rerender(); if (c.assets.includes(a)) bizModal(a); };
  const f = PR.forecast(c, a), D = PR.bizDef(a);
  const opt = (label, cur, opts, names, set) => h('div', { class: 'biz-opt' }, h('span', { class: 'small muted' }, label), h('div', { class: 'seg' }, opts.map(o => h('button', { class: cur === o ? 'on' : '', onclick: () => act(() => { set(o); return null; }) }, names[o]))));
  const rows = a.hist.slice().reverse().map(x => h('tr', {}, h('td', {}, x.year), h('td', {}, `×${x.p.toFixed(2)}`), h('td', {}, fmtMoney(c, x.rev)), h('td', {}, fmtMoney(c, x.cost)), h('td', { class: x.profit >= 0 ? 'pos' : 'neg' }, fmtMoney(c, x.profit)), h('td', { class: 'small muted' }, x.ev.join('; '))));
  m = openModal([h('h2', {}, PR.SECTORS[a.sector].icon, ' ', a.name), h('p', { class: 'small muted' }, D.desc),
    h('table', { class: 'kv' }, [['Market', `${PR.SECTORS[a.sector].name}: prices ×${f.p.toFixed(2)} ${arrow(PR.trend(a.sector))}`], ['Condition', `${Math.round(a.cond * 100)}% · level ${a.level}/3`], ['Ownership', `${Math.round(a.stake * 100)}%`],
      ['Cash', fmtMoney(c, a.cash)], ['Loan', a.loan ? `${fmtMoney(c, a.loan)} at 9%` : 'None'], ['Valuation', fmtMoney(c, PR.valuation(a))],
      ['Forecast', `Revenue ${fmtMoney(c, f.rev)} − production ${fmtMoney(c, f.cost)} − fixed ${fmtMoney(c, f.fixed)} = ${fmtMoney(c, f.profit)}${a.stake < 1 ? ' (your share)' : ''}`],
      ['Management', a.mgr ? `A hired manager runs it (${fmtMoney(c, PR.mgrCost(a))}/yr)` : PR.managedThisYear(c) ? 'You are running it yourself this year' : 'Nobody is running it — output −15%. Hire a manager or use "Manage your businesses" (an action).']].map(([k, v]) => h('tr', {}, h('td', {}, k), h('td', {}, v)))),
    opt('Production', a.prod, ['low', 'normal', 'high'], PR.PROD_NAME, v => a.prod = v),
    h('div', { class: 'small muted' }, 'Producing more earns more when prices are high — and loses more in a glut. Full tilt wears the place down and breaks machines.'),
    opt('Wages', a.wages, ['cheap', 'fair', 'generous'], PR.WAGE_NAME, v => a.wages = v),
    h('div', { class: 'small muted' }, 'Cheap wages cut costs but strikes are common. Generous wages cost more, but the work is better and inspectors find nothing.'),
    h('div', { class: 'biz-btns' },
      h('button', { class: 'btn ghost', onclick: () => act(() => { a.mgr = !a.mgr; return a.mgr ? `I hired a manager for my ${a.name}.` : `I let the manager of my ${a.name} go.`; }) }, a.mgr ? 'Fire manager' : `Hire manager (${fmtMoney(c, PR.mgrCost(a))}/yr)`),
      h('button', { class: 'btn ghost', disabled: a.level >= 3 || c.money < PR.upgradeCost(a), onclick: () => act(() => PR.upgrade(c, a)) }, a.level >= 3 ? 'Fully expanded' : `Expand (${fmtMoney(c, PR.upgradeCost(a))})`),
      h('button', { class: 'btn ghost', disabled: a.cond >= 1 || c.money < PR.repairCost(a), onclick: () => act(() => PR.repair(c, a)) }, a.cond >= 1 ? 'In perfect repair' : `Repair (${fmtMoney(c, PR.repairCost(a))})`),
      h('button', { class: 'btn ghost', disabled: c.money <= 0, onclick: async () => { const amt = await choice({ title: 'Put money in', text: `Your cash: ${fmtMoney(c, c.money)}`, options: [0.1, 0.25, 0.5].map(x => ({ label: fmtMoney(c, c.money * x), value: Math.floor(c.money * x) })).concat([{ label: 'Cancel', value: null, ghost: true }]) }); if (amt) act(() => { money(c, -amt); a.cash += amt; return `I put ${fmtMoney(c, amt)} into my ${a.name}.`; }); } }, 'Deposit'),
      h('button', { class: 'btn ghost', disabled: a.cash <= 0, onclick: async () => { const amt = await choice({ title: 'Take money out', text: `Business cash: ${fmtMoney(c, a.cash)}. Leave enough for bad years.`, options: [0.25, 0.5, 1].map(x => ({ label: fmtMoney(c, a.cash * x), value: Math.floor(a.cash * x) })).concat([{ label: 'Cancel', value: null, ghost: true }]) }); if (amt) act(() => { a.cash -= amt; money(c, amt); return `I took ${fmtMoney(c, amt)} out of my ${a.name}.`; }); } }, 'Withdraw')),
    h('h3', {}, '💼 Harbor Capital Investors'),
    h('div', { class: 'biz-btns' },
      h('button', { class: 'btn ghost', disabled: a.loan > 0, onclick: () => act(() => PR.takeLoan(c, a)) }, `Borrow ${fmtMoney(c, a.base * 0.3)} at 9%`),
      h('button', { class: 'btn ghost', disabled: !a.loan || a.cash <= 0, onclick: () => act(() => PR.repayLoan(c, a)) }, 'Repay loan'),
      h('button', { class: 'btn ghost', disabled: a.stake < 0.5, onclick: async () => { const ok = await choice({ title: 'Sell a 25% stake?', text: `You get cash now; investors take 25% of every future profit (and loss).`, options: [{ label: 'Sell', value: true }, { label: 'Cancel', value: false, ghost: true }] }); if (ok) act(() => PR.sellBiz(c, a, 0.25)); } }, 'Sell 25% stake'),
      h('button', { class: 'btn', onclick: async () => { const ok = await choice({ title: `Sell ${a.name}?`, text: `Harbor Capital offers about ${fmtMoney(c, PR.valuation(a) * 0.9)} (better with Charisma).`, options: [{ label: 'Sell', value: true }, { label: 'Cancel', value: false, ghost: true }] }); if (ok) act(() => PR.sellBiz(c, a, 1)); } }, 'Sell the business'),
      h('button', { class: 'btn ghost danger', onclick: async () => { const ok = await choice({ title: 'Declare bankruptcy?', text: 'You walk away with nothing, but the debt stops being your problem.', options: [{ label: 'Declare bankruptcy', value: true }, { label: 'Cancel', value: false, ghost: true }] }); if (ok) act(() => { PR.declareBankruptcy(c, a); return null; }); } }, 'Declare bankruptcy')),
    a.hist.length ? h('div', { class: 'biz-hist' }, h('table', { class: 'kv small' }, h('tr', {}, ...['Year', 'Price', 'Revenue', 'Costs', 'Profit', 'What happened'].map(x => h('th', {}, x))), rows)) : h('p', { class: 'small muted' }, 'No full year of trading yet.'),
  ], { cls: 'biz-modal' });
}
