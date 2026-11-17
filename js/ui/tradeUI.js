// v0.9.33 The Trade tab: every merchant, armourer and tailor in town, with a fitting mirror.
import { h } from './dom.js';
import { G, save } from '../core/state.js';
import { ITEMS } from '../data/items.js';
import { CLOTHES } from '../data/clothing.js';
import { outfitFor } from '../data/clothing.js';
import { drawFullBody } from './portrait.js';
import { heightNow } from '../systems/body.js';
import { gearSprite } from './gearSprites.js';
import { clothIcon } from './panels2.js';
import { icon } from './dom.js';
import { fmtMoney, discount, country } from '../systems/life.js';
import { fx } from './fx.js';
import * as TR from '../systems/trade.js';

const rerender = () => import('./render.js').then(m => m.render());
const logLine = (t, c) => import('./render.js').then(m => m.logLine(t, c));

export function tradeTab() {
  const c = G.char, grp = G.ui.tradeGroup || 'arms';
  // fitting mirror: hover anything wearable to see it on you
  const cv = document.createElement('canvas'); Object.assign(cv.style, { width: '112px', height: '224px', imageRendering: 'pixelated' });
  const label = h('div', { class: 'muted small', style: { textAlign: 'center', minHeight: '2.4em' } }, 'Hover anything to try it on.');
  const draw = t => { const outfit = { ...(c.outfit || {}) }, gear = { ...(c.gear || {}) };
    if (t?.cloth) { const it = CLOTHES.find(x => x.id === t.cloth); outfit[it.slot] = it.id; if (it.slot === 'dress') { delete outfit.top; delete outfit.bottom; } if (['top', 'bottom'].includes(it.slot)) delete outfit.dress; }
    if (t?.gear && ITEMS[t.gear]?.type === 'gear') gear[ITEMS[t.gear].slot] = t.gear;
    drawFullBody(cv, c.genes, { age: c.age, gender: c.gender, realm: c.qi.realm, hair: c.face ? { ...(c.hair || {}), ...c.face } : c.hair, outfit: outfitFor({ outfit }), gear, body: c.body, heightCm: heightNow(c) }); };
  draw(null);
  const look = (t, name) => { draw(t); label.textContent = t ? `Trying on: ${name}` : 'Your current look'; };

  const row = (m, s) => {
    const cloth = m.kind === 'cloth', it = cloth ? CLOTHES.find(x => x.id === s.id) : ITEMS[s.id]; if (!it) return null;
    const p = TR.priceOf(c, m, s), why = TR.canBuy(c, m, s), wear = cloth ? { cloth: s.id } : it.type === 'gear' ? { gear: s.id } : null;
    const pic = cloth ? clothIcon(it.kind, it.color, 30) : it.type === 'gear' ? gearSprite(s.id, 34) : icon(it.icon || 'chest');
    const desc = cloth ? `${{ top: 'Top', bottom: 'Bottom', dress: 'Dress', outer: 'Outerwear', socks: 'Socks', shoes: 'Shoes', hat: 'Hat', mask: 'Mask' }[it.slot]} · Style ${'★'.repeat(Math.min(5, Math.ceil(it.style / 2))) || '·'}` : it.desc || '';
    return h('div', { class: 'trade-item' + (s.left <= 0 ? ' out' : ''), ...(wear ? { onmouseenter: () => look(wear, it.name), onmouseleave: () => look(null), onclick: e => { if (e.target.tagName !== 'BUTTON') look(wear, it.name); } } : {}) },
      h('span', { class: 'trade-pic' }, pic),
      h('div', { style: { flex: 1, minWidth: 0 } }, h('b', {}, it.name, it.local && it.local === c.country ? h('span', { class: 'chip trade-local' }, 'Local') : it.local ? h('span', { class: 'chip trade-import' }, 'Import') : null),
        h('div', { class: 'small muted' }, desc), h('div', { class: 'small trade-stock ' + s.state + (s.left === 1 ? ' last' : '') }, TR.stockLabel(s))),
      h('button', { class: 'btn mini', disabled: !!why || !c.alive, 'data-tip': why || '', onclick: () => { const t = TR.buy(c, m, s); if (t) { fx('coin'); logLine(t, 'good'); save(); rerender(); } } }, s.left <= 0 ? '—' : fmtMoney(c, p)));
  };
  const merchants = TR.MERCHANTS.filter(m => m.group === grp).map(m => {
    const st = TR.stockOf(c, m), name = TR.nameOf(c, m);
    if (!st.length && m.id === 'dealer') return h('div', { class: 'card trade-merchant muted' }, h('div', { class: 'trade-head' }, h('span', { class: 'trade-ic' }, m.icon), h('div', {}, h('b', {}, name), h('div', { class: 'small' }, 'Not in town this year. Maybe next year.'))));
    return h('div', { class: 'card trade-merchant' }, h('div', { class: 'trade-head' }, h('span', { class: 'trade-ic' }, m.icon), h('div', {}, h('b', {}, name), h('div', { class: 'small muted' }, TR.blurbOf(c, m)))),
      st.length ? st.map(s => row(m, s)) : h('div', { class: 'small muted' }, 'Nothing on the shelves this year.'));
  });
  return [h('h2', { class: 'display' }, 'Trade'),
    h('p', { class: 'muted' }, `Every merchant restocks once a year. Popular things sell out, rare things get pricier when they run low, and ${country(c).name}'s smiths make weapons you can't buy anywhere else.${discount(c) ? ` Your Charisma gets you ${Math.round(discount(c) * 100)}% off.` : ''} Manage what you own in Wardrobe & Armory and Inventory.`),
    h('div', { class: 'seg trade-seg' }, Object.entries(TR.TRADE_GROUPS).map(([k, v]) => h('button', { class: grp === k ? 'on' : '', onclick: () => { G.ui.tradeGroup = k; rerender(); } }, v))),
    h('div', { class: 'ward-layout' }, h('div', { class: 'card ward-preview' }, h('b', {}, 'Fitting mirror'), h('div', { style: { display: 'flex', justifyContent: 'center', margin: '8px 0' } }, cv), label),
      h('div', { class: 'grid2 trade-grid' }, merchants))];
}
