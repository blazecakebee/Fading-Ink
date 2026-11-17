// v0.9.23 Black Market tab (demonic path only) and a Karma / Fame card
import { h, icon } from './dom.js';
import { G, save } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ITEMS } from '../data/items.js';
import { fmtMoney } from '../systems/life.js';
import * as FT from '../systems/fate.js';
import { fameLabel } from '../systems/renown.js';

export function fateCard(c) {
  const k = c.karma || 0, f = c.fame || 0, chips = [];
  if (c.demonic) chips.push(h('span', { class: 'chip fate-dem' }, '⛧ Demonic path'));
  if (c.qi?.tainted) chips.push(h('span', { class: 'chip fate-dem', title: '+15% Qi gain, +5% combat power, but you heal 15% slower' }, `Tainted Qi · ${FT.taintName(c)}`));
  if (c.flags?.reincarnated) chips.push(h('span', { class: 'chip fate-re', title: '×1.2 to Qi, combat, training, study, social, pay, loot, crafting and healing. Cannot reincarnate again.' }, '☯ Reincarnated'));
  if (c.flags?.regressed) chips.push(h('span', { class: 'chip fate-re' }, (c.unstableQi || 0) > 0 ? `⟲ Regressed · Qi unstable (${c.unstableQi}y)` : '⟲ Regressed'));
  if (c.flags?.possessed) chips.push(h('span', { class: 'chip fate-dem' }, `Possessed by ${c.flags.possessed}`));
  return h('div', { class: 'box fate-card' }, h('h3', {}, icon('star', 'sm'), ' Karma & Reputation'),
    h('div', { class: 'row', style: { gap: '14px', flexWrap: 'wrap' } },
      h('div', {}, h('div', { class: 'small muted' }, 'Karma'), h('b', { class: k < -20 ? 'neg' : k > 20 ? 'pos' : '' }, `${FT.karmaLabel(k)} (${k > 0 ? '+' : ''}${k})`)),
      h('div', {}, h('div', { class: 'small muted' }, f < 0 ? 'Infamy' : 'Fame'), h('b', { class: f < 0 ? 'neg' : '' }, `${fameLabel(f)} (${Math.abs(f).toLocaleString()})`))),
    chips.length ? h('div', { style: { marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' } }, chips) : null,
    !c.demonic && (c.demonPts || 0) >= 30 ? h('div', { class: 'small neg', style: { marginTop: '6px' } }, `The demonic path is pulling at you (${Math.min(99, c.demonPts)}%).`) : null);
}

export function blackMarketTab() {
  const c = G.char; if (!c.demonic) return [h('h2', { class: 'display' }, 'Black Market'), h('p', { class: 'muted' }, 'Only those who walk the demonic path know where to find it.')];
  const stock = FT.blackMarket(c);
  const grid = h('div', { class: 'grid2' }, stock.map(it => { const I = ITEMS[it.id], p = FT.bmPrice(c, it);
    return h('div', { class: 'card bm-item' + (I.demonic ? ' dem' : '') }, h('div', { class: 'row' }, icon(I.icon || 'bag', 'sm'), h('b', {}, I.name), it.q === 'hi' ? h('span', { class: 'chip' }, 'High grade') : null),
      h('div', { class: 'small muted' }, I.desc || ''), h('div', { class: 'row', style: { justifyContent: 'space-between', marginTop: '6px' } }, h('span', {}, fmtMoney(c, p), h('span', { class: 'small muted' }, ` · ${it.left} left`)),
        h('button', { class: 'btn mini', disabled: it.left <= 0 || c.money < p, onclick: () => { const t = FT.bmBuy(c, it); if (t) { ui.log(t, 'qi'); save(); ui.toast?.(`Bought ${I.name}`); G.render?.(); import('./render.js').then(m => m.render()); } } }, it.left <= 0 ? 'Sold out' : 'Buy'))); }));
  return [h('h2', { class: 'display' }, '⛧ Black Market'), h('p', { class: 'muted' }, `A masked broker, a candle, a ledger written in blood. The stock changes every year (next: age ${c.age + 1}). Everything here is high-end — and every purchase adds a little to your infamy.`), grid];
}
