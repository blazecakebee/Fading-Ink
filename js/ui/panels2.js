// v0.6.3 tabs: Market (stocks with charts) and Wardrobe & Armory (clothing + gear shop).
import { G } from '../core/state.js';
import { h, icon } from './dom.js';
import { choice, toast } from './modal.js';
import { fmtMoney, priceFor, country, money, addItem, stat } from '../systems/life.js';
import { STOCKS, STOCK, market, holdings, portfolioValue, buy, sell } from '../systems/market.js';
import { CLOTHES, CLOTH_BY_ID, CLOTH_SLOTS, outfitStyle } from '../data/clothing.js';
import { ITEMS } from '../data/items.js';
import { BODY_TIERS, BODY_MOVES } from '../data/bodypath.js';
import { REALMS } from '../data/realms.js';
import { drawFullBody } from './portrait.js';
import { gearSprite } from './gearSprites.js';
import { heightNow } from '../systems/body.js';
import { outfitFor } from '../data/clothing.js';
import { onBodyPath, bodyTier } from '../systems/path.js';

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
      h('div', { class: 'small', style: { marginTop: '6px' } }, 'This year: ', h('b', {}, NEWS_NAMES[n] || '—'), ' · prices move once a year with each company\'s risk and the world news. Each trade costs a 2% broker fee.')),
    c.age < 18 ? h('p', { class: 'muted' }, 'You can trade once you turn 18.') : null,
    h('div', { class: 'grid2' }, rows)];
}

// ---------------- Wardrobe & Armory
// tiny pixel icons for each kind of clothing, tinted with the item's colour
const MASKS = {
  shirt: ['..XX..XX..', 'XXXXXXXXXX', 'XXXXXXXXXX', '.XXXXXXXX.', '..XXXXXX..', '..XXXXXX..', '..XXXXXX..', '..XXXXXX..'],
  jacket: ['.XXX..XXX.', 'XXXXX.XXXX', 'XXXXX.XXXX', 'XXXXX.XXXX', 'XX.XX.XX.X', 'XX.XX.XX.X', '...XX.XX..', '...XXXXX..'],
  robe: ['..XX..XX..', '.XXXXXXXX.', 'XXXXXXXXXX', '.XXXXXXXX.', '.XXXXXXXX.', 'XXXXXXXXXX', 'XXXXXXXXXX', 'XXXXXXXXXX'],
  pants: ['.XXXXXXXX.', '.XXXXXXXX.', '.XXX..XXX.', '.XXX..XXX.', '.XXX..XXX.', '.XXX..XXX.', '.XXX..XXX.', '.XXX..XXX.'],
  shorts: ['.XXXXXXXX.', '.XXXXXXXX.', '.XXX..XXX.', '.XXX..XXX.', '..........', '..........', '..........', '..........'],
  skirt: ['..XXXXXX..', '..XXXXXX..', '.XXXXXXXX.', '.XXXXXXXX.', 'XXXXXXXXXX', 'XXXXXXXXXX', '..........', '..........'],
  dress: ['..X....X..', '..XXXXXX..', '..XXXXXX..', '...XXXX...', '..XXXXXX..', '.XXXXXXXX.', 'XXXXXXXXXX', 'XXXXXXXXXX'],
  socks: ['..XX..XX..', '..XX..XX..', '..XX..XX..', '..XX..XX..', '..XXX.XXX.', '..XXX.XXX.', '..........', '..........'],
  shoes: ['..........', '..........', '..........', 'XX....XX..', 'XXX...XXX.', 'XXXXX.XXXXX', 'XXXXX.XXXXX', '..........'],
  hat: ['..........', '...XXXX...', '..XXXXXX..', '..XXXXXX..', '..XXXXXX..', 'XXXXXXXXXX', '..........', '..........'],
};
export function clothIcon(kind, color, size = 28) {
  const m = MASKS[kind] || MASKS.shirt, cv = document.createElement('canvas'); cv.width = 12; cv.height = 10; const ctx = cv.getContext('2d');
  m.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'X') { ctx.fillStyle = '#120c18'; ctx.fillRect(x + 1, y + 1, 1, 1); } }));
  m.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'X') { ctx.fillStyle = color; ctx.fillRect(x + 1, y + 1, 1, 1); } }));
  m.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'X' && (y === 0 || m[y - 1][x] !== 'X')) { ctx.fillStyle = '#ffffff55'; ctx.fillRect(x + 1, y + 1, 1, 1); } }));
  Object.assign(cv.style, { width: size + 'px', height: size * 10 / 12 + 'px', imageRendering: 'pixelated', verticalAlign: 'middle', marginRight: '6px', background: '#0003', borderRadius: '6px', padding: '2px' });
  return cv;
}
// live preview of your character wearing what you're looking at
let tryOn = null;
function previewBody(c, cv) {
  const outfit = { ...(c.outfit || {}) }, gear = { ...(c.gear || {}) };
  if (tryOn?.slot) { outfit[tryOn.slot] = tryOn.id; if (tryOn.slot === 'dress') { delete outfit.top; delete outfit.bottom; } if (['top', 'bottom'].includes(tryOn.slot)) delete outfit.dress; }
  if (tryOn?.gear) gear[ITEMS[tryOn.gear].slot] = tryOn.gear;
  drawFullBody(cv, c.genes, { age: c.age, gender: c.gender, realm: c.qi.realm, hair: c.face ? { ...(c.hair || {}), ...c.face } : c.hair, outfit: outfitFor({ outfit }), gear, body: c.body, heightCm: heightNow(c) });
}
export function wardrobeTab() {
  const c = G.char; c.closet ||= []; c.outfit ||= {};
  const slot = G.ui.wardSlot || 'top'; tryOn = null;
  const price = it => priceFor(c, Math.round(it.price * country(c).econ));
  const items = CLOTHES.filter(x => x.slot === slot);
  const cv = document.createElement('canvas'); Object.assign(cv.style, { width: '128px', height: '256px', imageRendering: 'pixelated' }); previewBody(c, cv);
  const label = h('div', { class: 'muted small', style: { textAlign: 'center', minHeight: '2.4em' } }, 'Hover or tap an item to try it on.');
  const look = (t, name) => { tryOn = t; previewBody(c, cv); label.textContent = name ? `Trying on: ${name}` : 'Your current look'; };
  const hover = (t, name) => ({ onmouseenter: () => look(t, name), onmouseleave: () => look(null), onfocus: () => look(t, name) });
  const card = it => { const own = c.closet.includes(it.id), on = c.outfit[it.slot] === it.id;
    return h('div', { class: 'card', style: { cursor: 'pointer', ...(on ? { borderColor: 'var(--accent2)' } : {}) }, ...hover({ slot: it.slot, id: it.id }, it.name), onclick: e => { if (e.target.tagName !== 'BUTTON') look({ slot: it.slot, id: it.id }, it.name); } },
      h('div', { class: 'row', style: { alignItems: 'center', flexWrap: 'nowrap' } }, clothIcon(it.kind, it.color), h('div', {}, h('b', {}, it.name), h('div', { class: 'muted small' }, `Style ${'★'.repeat(Math.min(5, Math.ceil(it.style / 2))) || '·'}${own ? ' · owned' : ' · ' + fmtMoney(c, price(it))}`))),
      h('div', { class: 'row', style: { marginTop: '6px', gap: '6px' } },
        own ? h('button', { class: 'btn mini' + (on ? ' ghost' : ''), onclick: () => { if (on) delete c.outfit[it.slot]; else { c.outfit[it.slot] = it.id; if (it.slot === 'dress') { delete c.outfit.top; delete c.outfit.bottom; } if (['top', 'bottom'].includes(it.slot)) delete c.outfit.dress; } R.render(); } }, on ? 'Take off' : 'Wear')
          : h('button', { class: 'btn mini', disabled: c.money < price(it), onclick: () => R.run({ id: 'buy_clothes', cost: 'free', run: cc => { money(cc, -price(it)); cc.closet.push(it.id); cc.outfit[it.slot] = it.id; if (it.slot === 'dress') { delete cc.outfit.top; delete cc.outfit.bottom; } if (['top', 'bottom'].includes(it.slot)) delete cc.outfit.dress; stat(cc, 'happiness', 1 + Math.floor(it.style / 3)); return `I bought a ${it.name.toLowerCase()} and put it on.`; } }) }, 'Buy & wear'))); };
  const armory = Object.entries(ITEMS).filter(([, it]) => it.shop);
  const preview = h('div', { class: 'card ward-preview' }, h('b', {}, 'Fitting mirror'), h('div', { style: { display: 'flex', justifyContent: 'center', margin: '8px 0' } }, cv), label);
  return [h('h2', { class: 'display' }, 'Wardrobe & Armory'),
    h('p', { class: 'muted' }, `Your outfit shows on your Status page. Style score ${outfitStyle(c)} → +${Math.min(15, outfitStyle(c))}% closeness gains. Dresses replace a top and bottom.`),
    h('div', { class: 'ward-layout' }, preview, h('div', {},
      h('div', { class: 'seg', style: { flexWrap: 'wrap', marginBottom: '10px' } }, Object.entries(CLOTH_SLOTS).map(([k, v]) => h('button', { class: slot === k ? 'on' : '', onclick: () => { G.ui.wardSlot = k; R.render(); } }, `${v} (${c.closet.filter(id => CLOTH_BY_ID[id]?.slot === k).length}/${CLOTHES.filter(x => x.slot === k).length})`))),
      h('div', { class: 'grid2' }, items.map(card)),
      h('h3', { class: 'display', style: { margin: '18px 0 6px' } }, 'Armory'),
      h('p', { class: 'muted small' }, 'Everyday weapons and armour. Hover to see them on you. Legendary gear only drops in high-rank Gates. Equip gear from your Inventory.'),
      h('div', { class: 'grid2' }, armory.map(([id, it]) => { const pr = priceFor(c, Math.round(it.price * country(c).econ));
        return h('div', { class: 'card', style: { cursor: 'pointer' }, ...hover({ gear: id }, it.name), onclick: e => { if (e.target.tagName !== 'BUTTON') look({ gear: id }, it.name); } },
          h('div', { class: 'row', style: { alignItems: 'center', flexWrap: 'nowrap' } }, h('span', { style: { background: '#0004', borderRadius: '8px', padding: '3px', marginRight: '8px', display: 'inline-flex' } }, gearSprite(id, 40)), h('div', {}, h('b', {}, it.name), h('div', { class: 'muted small' }, `${it.desc} · ${fmtMoney(c, pr)}${c.inv[id] ? ` · owned ×${c.inv[id]}` : ''}`))),
          h('button', { class: 'btn mini', style: { marginTop: '6px' }, disabled: c.money < pr || c.age < 12, onclick: () => R.run({ id: 'buy_gear', cost: 'free', run: cc => { money(cc, -pr); addItem(cc, id); return `I bought a ${it.name}.`; } }) }, 'Buy')); }))))];
}

// ---------------- The Severed Path
export function bodyPathTab() {
  const c = G.char, on = onBodyPath(c), b = c.bodyPath || { tier: 0, prog: 0 }, T = bodyTier(c);
  const ladder = h('div', { class: 'ladder' }, BODY_TIERS.map((t, i) => [t, i]).reverse().map(([t, i]) => {
    const cur = on && i === b.tier, done = on && i < b.tier;
    const row = h('div', { class: 'rung' + (cur ? ' current' : done ? ' done' : ' locked') }, h('span', { class: 'rung-glyph', style: { '--rc': t.color } }, t.glyph),
      h('span', { class: 'rung-name' }, t.name, h('small', { class: 'muted' }, ` · fights like ${t.eq ? REALMS[t.eq].name : 'a mortal'}`)), null);
    row.style.setProperty('--rc', t.color); row.title = `Stat cap ${t.cap} · power ×${t.power} · +${t.life}y lifespan`; return row; }));
  const moves = Object.values(BODY_MOVES).map(m => h('div', { class: 'small', style: { opacity: on && b.tier >= m.tier ? 1 : 0.5 } }, icon(m.icon, 'sm'), ' ', h('b', {}, m.name), ` (${BODY_TIERS[m.tier].name}) — ${m.info}`));
  return [h('h2', { class: 'display' }, 'The Severed Path'),
    h('p', { class: 'muted' }, 'Some are born without Qi. Some tear it out. Either way, heaven stops watching them — and their bodies stop having limits. Each tier of the body counts as a cultivation realm in every fight, Gate and Guild exam.'),
    on ? h('div', { class: 'year-card' }, h('h3', {}, `${T.name}`), h('div', { class: 'muted small' }, b.tier < BODY_TIERS.length - 1 ? `Tempering ${Math.round(b.prog)} / ${T.need}${b.prog >= T.need ? ' — ready for your Body Trial!' : ''}` : 'You are Unbound. There is nothing left to break.'),
      b.tier < BODY_TIERS.length - 1 ? h('div', { class: 'bar', style: { marginTop: '6px' } }, h('i', { style: { width: Math.min(100, b.prog / T.need * 100) + '%', '--c': T.color } })) : null,
      h('div', { class: 'small', style: { marginTop: '8px' } }, 'Gain Tempering from the Severed training activities (Training), winning fights (+6) and clearing Gates (+20). When the bar is full, face your Body Trial — a no-escape fight against something a realm above you.'))
      : h('div', { class: 'year-card' }, h('b', {}, 'You still carry Qi.'), h('div', { class: 'muted small' }, c.age < 12 ? 'At 12 you may choose to reject it (Mind & Body activities).' : 'You can reject it forever from the Mind & Body activities. Once you cut it, you can never cultivate — and once you begin cultivating, this path closes for good.')),
    h('div', { class: 'grid2', style: { marginTop: '12px' } },
      h('div', { class: 'card' }, h('h4', {}, 'Strengths'), h('div', { class: 'small' }, '• Stat caps and combat power rise with each tier, like realms.', h('br'), '• Immune to the presence of stronger cultivators.', h('br'), '• +15% damage against Qi users and spirits — they can\'t sense you.', h('br'), '• Signature techniques that scale with your whole body.', h('br'), '• Heal faster every year.')),
      h('div', { class: 'card' }, h('h4', {}, 'Costs'), h('div', { class: 'small' }, '• No meditation, breakthroughs, Qi arts or Qi medicine — ever.', h('br'), '• Lifespan grows only a little (about +115 years at the very top).', h('br'), '• Qi sects won\'t keep you (the Iron Fist Syndicate will).'))),
    h('h3', { class: 'display', style: { margin: '14px 0 6px' } }, 'Techniques'), h('div', { class: 'card' }, moves),
    h('h3', { class: 'display', style: { margin: '14px 0 6px' } }, `The ${BODY_TIERS.length - 1} tiers`), ladder];
}
