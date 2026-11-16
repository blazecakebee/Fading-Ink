// v0.9.13 Sect identity: design your sect's emblem (shape, colours, glyph, border) and its look (robe colour, motto).
import { h } from './dom.js';
import { openModal, toast } from './modal.js';
import { fx } from './fx.js';

export const SHAPES = { circle: 'Circle', shield: 'Shield', diamond: 'Diamond', hexagon: 'Hexagon', banner: 'Banner', lotus: 'Lotus', seal: 'Square seal', star: 'Star' };
export const GLYPHS = ['剑', '龍', '蓮', '雷', '火', '水', '月', '山', '鳳', '虎', '天', '魂', '道', '風', '雪', '血', '影', '玄', '金', '星', '☯', '⚔', '❀', '☾'];
export const COLORS = ['#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#16a085', '#2980b9', '#8e44ad', '#2c3e50', '#ecf0f1', '#7f8c8d', '#d4a017', '#6b2737', '#1b4d3e', '#0b1d3a', '#ff6a8a', '#111111'];
export const BORDERS = { none: 'None', ring: 'Ring', double: 'Double ring', thorns: 'Thorns', rays: 'Sun rays' };
export const ROBES = { white: ['White jade', '#eef1f4'], azure: ['Azure', '#3a7bd5'], crimson: ['Crimson', '#b0222e'], black: ['Ink black', '#16161c'], gold: ['Imperial gold', '#d4a017'], green: ['Bamboo green', '#2f8f5b'], violet: ['Twilight violet', '#6a3fa0'], grey: ['Ash grey', '#7d8590'] };
export const defaultEmblem = () => ({ shape: 'circle', bg: '#2980b9', fg: '#ecf0f1', glyph: '道', border: 'ring', robe: 'white', motto: '' });

const NS = 'http://www.w3.org/2000/svg';
const sv = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
const pts = (n, r, rot = -Math.PI / 2, r2) => Array.from({ length: n * (r2 ? 2 : 1) }, (_, i) => { const rr = r2 && i % 2 ? r2 : r, a = rot + i * Math.PI * 2 / (n * (r2 ? 2 : 1)); return `${50 + Math.cos(a) * rr},${50 + Math.sin(a) * rr}`; }).join(' ');
const SHAPE_SVG = {
  circle: c => sv('circle', { cx: 50, cy: 50, r: 44, fill: c }),
  shield: c => sv('path', { d: 'M50 6 L88 18 L84 58 Q78 82 50 95 Q22 82 16 58 L12 18 Z', fill: c }),
  diamond: c => sv('polygon', { points: '50,4 94,50 50,96 6,50', fill: c }),
  hexagon: c => sv('polygon', { points: pts(6, 45, 0), fill: c }),
  banner: c => sv('path', { d: 'M18 6 H82 V90 L50 74 L18 90 Z', fill: c }),
  lotus: c => { const g = sv('g', {}); for (let i = 0; i < 8; i++) g.append(sv('ellipse', { cx: 50, cy: 26, rx: 13, ry: 24, fill: c, transform: `rotate(${i * 45} 50 50)` })); g.append(sv('circle', { cx: 50, cy: 50, r: 26, fill: c })); return g; },
  seal: c => sv('rect', { x: 8, y: 8, width: 84, height: 84, rx: 8, fill: c }),
  star: c => sv('polygon', { points: pts(5, 47, -Math.PI / 2, 24), fill: c }),
};
// emblem → <svg>
export function emblemSvg(e, size = 56) {
  e = { ...defaultEmblem(), ...(e || {}) };
  const s = sv('svg', { viewBox: '0 0 100 100', width: size, height: size, class: 'sect-emblem' });
  s.append((SHAPE_SVG[e.shape] || SHAPE_SVG.circle)(e.bg));
  if (e.border === 'ring' || e.border === 'double') s.append(sv('circle', { cx: 50, cy: 50, r: 36, fill: 'none', stroke: e.fg, 'stroke-width': 2.5, opacity: 0.85 }));
  if (e.border === 'double') s.append(sv('circle', { cx: 50, cy: 50, r: 31, fill: 'none', stroke: e.fg, 'stroke-width': 1.2, opacity: 0.7 }));
  if (e.border === 'thorns') s.append(sv('polygon', { points: pts(12, 39, 0, 33), fill: 'none', stroke: e.fg, 'stroke-width': 2, opacity: 0.85 }));
  if (e.border === 'rays') for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; s.append(sv('line', { x1: 50 + Math.cos(a) * 32, y1: 50 + Math.sin(a) * 32, x2: 50 + Math.cos(a) * 40, y2: 50 + Math.sin(a) * 40, stroke: e.fg, 'stroke-width': 2.2, opacity: 0.85 })); }
  const t = sv('text', { x: 50, y: 52, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: e.fg, 'font-size': 38, 'font-weight': 700, 'font-family': 'serif' }); t.textContent = e.glyph; s.append(t);
  return s;
}

// The designer: resolves { name, clan, emblem } or null. o: { name, clan, emblem, askNames, title, okLabel }
export function designSect(o = {}) {
  return new Promise(res => {
    const E = { ...defaultEmblem(), ...(o.emblem || {}) }; let done = false;
    const preview = h('div', { class: 'se-preview' }), robeDot = h('div', { class: 'se-robe' }), mottoOut = h('div', { class: 'se-motto' });
    const nameIn = h('input', { class: 'chat-in', placeholder: 'e.g. Azure Lotus Sect', maxlength: 32, value: o.name || '' }), clanIn = h('input', { class: 'chat-in', placeholder: 'e.g. Long', maxlength: 16, value: o.clan || '' });
    const mottoIn = h('input', { class: 'chat-in', placeholder: 'A motto (optional)', maxlength: 60, value: E.motto || '', oninput: () => { E.motto = mottoIn.value; draw(); } });
    const draw = () => { preview.replaceChildren(emblemSvg(E, 120)); robeDot.style.background = ROBES[E.robe][1]; robeDot.title = ROBES[E.robe][0]; mottoOut.textContent = E.motto ? `“${E.motto}”` : '';
      root.querySelectorAll('[data-k]').forEach(b => b.classList.toggle('on', E[b.dataset.k] === b.dataset.v)); };
    const opt = (k, v, label, style) => h('button', { class: 'se-opt', 'data-k': k, 'data-v': v, style, title: label, onclick: () => { E[k] = v; fx('click'); draw(); } }, label);
    const row = (label, ...kids) => h('div', { class: 'se-row' }, h('div', { class: 'se-lbl' }, label), h('div', { class: 'se-opts' }, ...kids));
    const swatches = k => COLORS.map(c => opt(k, c, '', { background: c }));
    const root = h('div', { class: 'se' },
      h('div', { class: 'se-top' }, h('div', { class: 'se-show' }, preview, h('div', { class: 'se-look' }, robeDot, h('span', { class: 'muted small' }, 'Disciple robes')), mottoOut),
        h('div', { class: 'se-names' }, o.askNames !== false ? [h('label', { class: 'field' }, 'Sect name', nameIn), h('label', { class: 'field' }, 'Clan surname (your new last name)', clanIn)] : null, h('label', { class: 'field' }, 'Motto', mottoIn))),
      row('Shape', ...Object.entries(SHAPES).map(([k, v]) => opt('shape', k, v))),
      row('Field colour', ...swatches('bg')),
      row('Symbol colour', ...swatches('fg')),
      row('Symbol', ...GLYPHS.map(g => opt('glyph', g, g))),
      row('Border', ...Object.entries(BORDERS).map(([k, v]) => opt('border', k, v))),
      row('Robes', ...Object.entries(ROBES).map(([k, [n, c]]) => opt('robe', k, n, { '--rc': c }))));
    const finish = v => { if (done) return; done = true; m.close(); res(v); };
    const m = openModal([h('h2', {}, o.title || 'Found your sect'), o.text ? h('div', { class: 'text' }, o.text) : null, root,
      h('div', { class: 'opts' }, h('button', { class: 'btn', onclick: () => {
        const name = nameIn.value.trim(), clan = clanIn.value.trim();
        if (o.askNames !== false && (!name || !clan)) return toast('Give your sect a name and a clan surname.');
        fx('milestone'); finish({ name, clan, emblem: { ...E, motto: (E.motto || '').trim() } }); } }, o.okLabel || 'Found the sect'),
        h('button', { class: 'btn ghost', onclick: () => finish(null) }, 'Cancel'))], { cls: 'se-modal', onClose: () => { if (!done) { done = true; res(null); } } });
    draw();
  });
}
