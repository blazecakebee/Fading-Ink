// v0.6.3 tabs: Market (stocks with charts) and Wardrobe & Armory (clothing + gear shop).
import { G } from '../core/state.js';
import { h, icon } from './dom.js';
import { choice, toast } from './modal.js';
import { fmtMoney, priceFor, country, money, addItem, stat } from '../systems/life.js';
import { STOCKS, STOCK, market, holdings, portfolioValue, buy, sell } from '../systems/market.js';
import { CLOTHES, CLOTH_BY_ID, CLOTH_SLOTS, outfitStyle } from '../data/clothing.js';
import { ITEMS } from '../data/items.js';

let R = null; export function bindPanels2(render, run) { R = { render, run }; }
const NEWS_NAMES = { crash: 'Market crash', boom: 'Economic boom', gate_surge: 'Gate surge', beast_tide: 'Beast tide', qi_tide: 'Spirit Tide', qi_drought: 'Qi drought', plague: 'Plague', sect_war: 'Sect war', golden_age: 'Golden age', calm: 'Calm year' };

// tiny SVG line chart
export function chart(data, w = 220, hgt = 56, color) {
  const NS = 'http://www.w3.org/2000/svg'; const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${w} ${hgt}`); svg.setAttribute('class', 'mchart'); svg.style.width = w + 'px'; svg.style.height = hgt + 'px';
  if (data.length < 2) data = [data[0] || 0, data[0] || 0];
  const lo = Math.min(...data), hi = Math.max(...data), span = hi - lo || 1;
  const pts = data.map((v, i) => [i / (data.length - 1) * (w - 4) + 2, hgt - 4 - (v - lo) / span * (hgt - 8)]);
  const up = data[data.length - 1] >= data[0]; const col = color || (up ? '#4fd17a' : '#ff6a6a');
  const area = document.createElementNS(NS, 'path'); area.setAttribute('d', `M${pts[0][0]} ${hgt}L${pts.map(p => p.join(' ')).join('L')}L${pts[pts.length - 1][0]} ${hgt}Z`); area.setAttribute('fill', col + '22');
  const line = document.createElementNS(NS, 'polyline'); line.setAttribute('points', pts.map(p => p.join(',')).join(' ')); line.setAttribute('fill', 'none'); line.setAttribute('stroke', col); line.setAttribute('stroke-width', '2');
  svg.append(area, line); return svg;
}

export function marketTab() {
  const c = G.char, m = market(), val = portfolioValue(c);
  const n = G.world.news?.year === G.world.year ? G.world.news.id : null;
  const rows = STOCKS.map(s => {
    const hist = m.hist[s.id], p = m.prices[s.id], prev = hist[hist.length - 2] ?? p, ch = (p - prev) / prev * 100, own = c.portfolio?.[s.id] || 0;
    return h('div', { class: 'card stock' },
      h('div', { class: 'row', style: { justifyContent: 'space-between', alignItems: 'flex-start' } },
        h('div', {}, h('b', {}, `${s.id} · ${s.name}`), h('div', { class: 'muted small' }, s.desc)),
        h('div', { style: { textAlign: 'right' } }, h('b', {}, fmtMoney(c, p)), h('div', { class: 'small', style: { color: ch >= 0 ? '#4fd17a' : '#ff6a6a' } }, `${ch >= 0 ? '▲' : '▼'} ${Math.abs(ch).toFixed(1)}% this year`))),
      chart(hist.slice(-25), 300, 60),
      h('div', { class: 'row', style: { justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' } },
        h('span', { class: 'small' }, own ? `You own ${(+own.toFixed(3)).toLocaleString()} shares · ${fmtMoney(c, own * p)}` : h('span', { class: 'muted' }, 'You own none')),
        h('span', { class: 'row', style: { gap: '6px' } },
          h('button', { class: 'btn mini', disabled: c.money <= 0 || c.age < 18, onclick: async () => {
            const opts = [0.1, 0.25, 0.5, 1].map(f => ({ label: `${f === 1 ? 'All cash' : f * 100 + '%'} (${fmtMoney(c, c.money * f)})`, value: f }));
            const f = await choice({ title: `Buy ${s.name}`, icon: 'stocks', text: `Cash: ${fmtMoney(c, c.money)} · Price ${fmtMoney(c, p)}/share`, options: [...opts, { label: 'Cancel', value: null, ghost: true }] });
            if (f) { const t = buy(c, s.id, c.money * f); if (t) R.run({ id: 'trade', cost: 'free', run: () => t }); } } }, 'Buy'),
          h('button', { class: 'btn mini ghost', disabled: !own, onclick: async () => {
            const f = await choice({ title: `Sell ${s.name}`, icon: 'stocks', text: `You hold ${fmtMoney(c, own * p)}.`, options: [0.25, 0.5, 1].map(x => ({ label: x === 1 ? 'Sell everything' : `Sell ${x * 100}%`, value: x })).concat([{ label: 'Cancel', value: null, ghost: true }]) });
            if (f) { const t = sell(c, s.id, f); if (t) R.run({ id: 'trade', cost: 'free', run: () => t }); } } }, 'Sell'))));
  });
  return [h('h2', { class: 'display' }, 'Stock Market'),
    h('div', { class: 'year-card' }, h('div', { class: 'row', style: { justifyContent: 'space-between' } },
      h('div', {}, h('div', { class: 'muted small' }, 'Portfolio value'), h('h3', {}, fmtMoney(c, val)), h('div', { class: 'muted small' }, `Cash ${fmtMoney(c, c.money)}${c.money < 0 ? ' — you can\'t invest while in debt' : ''}`)),
      (c.portHist || []).length > 1 ? chart(c.portHist.slice(-25), 260, 64, '#7fd1ff') : null),
      h('div', { class: 'small', style: { marginTop: '6px' } }, 'This year: ', h('b', {}, NEWS_NAMES[n] || '—'), ' · prices move once a year with each company\'s risk and the world news. Trading is free.')),
    c.age < 18 ? h('p', { class: 'muted' }, 'You can trade once you turn 18.') : null,
    h('div', { class: 'grid2' }, rows)];
}

// ---------------- Wardrobe & Armory
export function wardrobeTab() {
  const c = G.char; c.closet ||= []; c.outfit ||= {};
  const slot = G.ui.wardSlot || 'top';
  const price = it => priceFor(c, Math.round(it.price * country(c).econ));
  const items = CLOTHES.filter(x => x.slot === slot);
  const swatch = col => h('span', { style: { display: 'inline-block', width: '14px', height: '14px', borderRadius: '4px', background: col, border: '1px solid #0006', verticalAlign: 'middle', marginRight: '6px' } });
  const card = it => { const own = c.closet.includes(it.id), on = c.outfit[it.slot] === it.id;
    return h('div', { class: 'card', style: on ? { borderColor: 'var(--accent2)' } : {} }, h('div', {}, swatch(it.color), h('b', {}, it.name)), h('div', { class: 'muted small' }, `Style ${'★'.repeat(Math.min(5, Math.ceil(it.style / 2))) || '·'}${own ? '' : ' · ' + fmtMoney(c, price(it))}`),
      h('div', { class: 'row', style: { marginTop: '6px', gap: '6px' } },
        own ? h('button', { class: 'btn mini' + (on ? ' ghost' : ''), onclick: () => { if (on) delete c.outfit[it.slot]; else { c.outfit[it.slot] = it.id; if (it.slot === 'dress') { delete c.outfit.top; delete c.outfit.bottom; } if (['top', 'bottom'].includes(it.slot)) delete c.outfit.dress; } R.render(); } }, on ? 'Take off' : 'Wear')
          : h('button', { class: 'btn mini', disabled: c.money < price(it), onclick: () => R.run({ id: 'buy_clothes', cost: 'free', run: cc => { money(cc, -price(it)); cc.closet.push(it.id); cc.outfit[it.slot] = it.id; if (it.slot === 'dress') { delete cc.outfit.top; delete cc.outfit.bottom; } stat(cc, 'happiness', 1 + Math.floor(it.style / 3)); return `I bought a ${it.name.toLowerCase()} and put it on.`; } }) }, 'Buy & wear'))); };
  const armory = Object.entries(ITEMS).filter(([, it]) => it.shop);
  return [h('h2', { class: 'display' }, 'Wardrobe & Armory'),
    h('p', { class: 'muted' }, `Your outfit shows on your Status page. Style score ${outfitStyle(c)} → +${Math.min(15, outfitStyle(c))}% closeness gains. Dresses replace a top and bottom.`),
    h('div', { class: 'seg', style: { flexWrap: 'wrap', marginBottom: '10px' } }, Object.entries(CLOTH_SLOTS).map(([k, v]) => h('button', { class: slot === k ? 'on' : '', onclick: () => { G.ui.wardSlot = k; R.render(); } }, `${v} (${c.closet.filter(id => CLOTH_BY_ID[id]?.slot === k).length}/${CLOTHES.filter(x => x.slot === k).length})`))),
    h('div', { class: 'grid2' }, items.map(card)),
    h('h3', { class: 'display', style: { margin: '18px 0 6px' } }, 'Armory'),
    h('p', { class: 'muted small' }, 'Everyday weapons and armour. Legendary gear only drops in high-rank Gates. Equip gear from your Inventory.'),
    h('div', { class: 'grid2' }, armory.map(([id, it]) => { const pr = priceFor(c, Math.round(it.price * country(c).econ));
      return h('div', { class: 'card' }, h('div', {}, icon(it.icon, 'sm'), ' ', h('b', {}, it.name)), h('div', { class: 'muted small' }, `${it.desc} · ${fmtMoney(c, pr)}${c.inv[id] ? ` · owned ×${c.inv[id]}` : ''}`),
        h('button', { class: 'btn mini', style: { marginTop: '6px' }, disabled: c.money < pr || c.age < 12, onclick: () => R.run({ id: 'buy_gear', cost: 'free', run: cc => { money(cc, -pr); addItem(cc, id); return `I bought a ${it.name}.`; } }) }, 'Buy')); }))];
}
