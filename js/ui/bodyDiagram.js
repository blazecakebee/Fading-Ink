// Body diagram: an original front-facing silhouette where each part is coloured by how well it works,
// plus a side panel listing injuries. Click a part to focus it.
import { h } from './dom.js';
import { PARTS, PART_BY_ID, INJURIES, PROSTHETICS } from '../data/body.js';
import { partEff, isMissing, maxHp, prostheticOf } from '../systems/body.js';
import { G } from '../core/state.js';
import { hairMask } from './portrait.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
// shapes in a 120 x 250 box (my own simple doll design)
const SHAPES = {
  head: ['ellipse', { cx: 60, cy: 26, rx: 17, ry: 20 }],
  neck: ['rect', { x: 53, y: 44, width: 14, height: 10, rx: 4 }],
  torso: ['path', { d: 'M36 56 Q60 50 84 56 L88 112 Q86 128 78 134 L42 134 Q34 128 32 112 Z' }],
  arm_l: ['path', { d: 'M34 58 Q24 60 22 72 L16 118 Q16 124 22 124 Q27 124 28 118 L34 80 Z' }],
  arm_r: ['path', { d: 'M86 58 Q96 60 98 72 L104 118 Q104 124 98 124 Q93 124 92 118 L86 80 Z' }],
  hand_l: ['ellipse', { cx: 19, cy: 133, rx: 7, ry: 9 }],
  hand_r: ['ellipse', { cx: 101, cy: 133, rx: 7, ry: 9 }],
  leg_l: ['path', { d: 'M42 136 L58 136 L56 214 Q55 220 49 220 Q43 220 43 214 Z' }],
  leg_r: ['path', { d: 'M62 136 L78 136 L77 214 Q77 220 71 220 Q65 220 64 214 Z' }],
  foot_l: ['path', { d: 'M43 222 L56 222 L57 232 Q50 236 38 233 Q38 226 43 222 Z' }],
  foot_r: ['path', { d: 'M64 222 L77 222 L82 233 Q70 236 63 232 Z' }],
};
// v0.8.7 anatomical organ shapes (paths drawn around 0,0 and moved onto each organ's spot)
const ORGAN_SHAPES = {
  brain: 'M-8 2 C-10 -6 -4 -9 0 -7 C4 -9 10 -6 8 2 C6 6 -6 6 -8 2 Z M-4 -5 Q-2 -1 -5 2 M2 -6 Q0 -2 3 1 M0 -7 L0 4',
  eye_l: 'M-4 0 Q0 -3 4 0 Q0 3 -4 0 Z', eye_r: 'M-4 0 Q0 -3 4 0 Q0 3 -4 0 Z', jaw: 'M-6 -2 Q0 5 6 -2',
  heart: 'M0 5 C-7 0 -7 -6 -3 -6 C-1 -6 0 -4 0 -3 C0 -4 1 -6 3 -6 C7 -6 7 0 0 5 Z',
  lung_l: 'M2 -9 C-5 -8 -7 0 -6 8 C-3 9 1 7 2 4 Z', lung_r: 'M-2 -9 C5 -8 7 0 6 8 C3 9 -1 7 -2 4 Z',
  liver: 'M-9 -2 C-6 -6 6 -6 9 -3 C6 2 0 5 -6 4 C-9 3 -10 1 -9 -2 Z', stomach: 'M-3 -6 C-1 -6 0 -4 2 -3 C7 -1 6 6 1 6 C-4 6 -5 2 -3 -1 C-4 -3 -4 -5 -3 -6 Z',
  kidney_l: 'M1 -5 C-5 -5 -5 5 1 5 C3 5 3 2 1 0 C3 -2 3 -5 1 -5 Z', kidney_r: 'M-1 -5 C5 -5 5 5 -1 5 C-3 5 -3 2 -1 0 C-3 -2 -3 -5 -1 -5 Z',
  spine: 'M0 -20 L0 22 M-2 -16 L2 -16 M-2 -10 L2 -10 M-2 -4 L2 -4 M-2 2 L2 2 M-2 8 L2 8 M-2 14 L2 14',
  ribs: 'M-12 -4 Q-6 -8 0 -6 Q6 -8 12 -4 M-12 0 Q-6 -4 0 -2 Q6 -4 12 0 M-11 4 Q-6 0 0 2 Q6 0 11 4',
  dantian: 'M-4 0 A4 4 0 1 0 4 0 A4 4 0 1 0 -4 0 Z',
};
const LINE_ORGANS = ['spine', 'ribs', 'jaw'];
const ORGAN_DOTS = { brain: [60, 18], eye_l: [53, 26], eye_r: [67, 26], jaw: [60, 38], heart: [66, 74], lung_l: [50, 72], lung_r: [72, 70], liver: [52, 92], stomach: [66, 94], kidney_l: [50, 106], kidney_r: [70, 106], spine: [60, 84], ribs: [60, 64], dantian: [60, 118] };
const PROSTH_COLOR = '#5fb4ff'; // artificial parts glow a cool blue
const color = (c, id) => {
  if (isMissing(c, id)) return prostheticOf(c, id) ? PROSTH_COLOR : 'none';
  const e = partEff(c, id); return e > 0.9 ? '#eef2f7' : e > 0.65 ? '#ffd25a' : e > 0.35 ? '#ff8a3a' : e > 0 ? '#e23b3b' : '#5a1a1a';
};

export function bodyDiagram(c, rerender) {
  const focus = G.ui.bodyFocus || null;
  const svg = el('svg', { viewBox: '0 0 120 250', class: 'body-svg' });
  // your current hairstyle, whited out like the rest of the dummy, drawn behind the head
  try {
    const m = hairMask(c.genes, { age: c.age, gender: c.gender, realm: c.qi?.realm || 0, hair: c.face ? { ...(c.hair || {}), ...c.face } : c.hair });
    const k = 40 / Math.max(1, m.bottom - m.top), ox = 60 - 16 * k, oy = 6 - m.top * k; // portrait head → doll head (y 6..46)
    const gH = el('g', { class: 'doll-hair', 'shape-rendering': 'crispEdges' });
    // one path per layer (no seams): a dark, slightly fatter copy underneath makes the outline
    const sq = pad => m.px.map(([x, y]) => `M${(ox + x * k - pad).toFixed(2)} ${(oy + y * k - pad).toFixed(2)}h${(k + pad * 2).toFixed(2)}v${(k + pad * 2).toFixed(2)}h-${(k + pad * 2).toFixed(2)}z`).join('');
    gH.append(el('path', { d: sq(1), fill: '#0b0e16' }), el('path', { d: sq(0.25), fill: '#eef2f7' }));
    svg.append(gH);
  } catch (e) { /* hair is decoration only */ }
  for (const [id, [tag, attrs]] of Object.entries(SHAPES)) {
    const miss = isMissing(c, id), s = el(tag, { ...attrs, fill: color(c, id), class: 'bpart' + (focus === id ? ' focus' : '') + (miss ? (prostheticOf(c, id) ? ' artificial' : ' missing') : '') });
    const t = el('title', {}); t.textContent = `${PART_BY_ID[id].name}: ${miss ? (prostheticOf(c, id) ? PROSTHETICS[prostheticOf(c, id)].name : 'missing') : Math.round(partEff(c, id) * 100) + '%'}`; s.append(t);
    s.addEventListener('click', () => { G.ui.bodyFocus = focus === id ? null : id; rerender(); });
    svg.append(s);
    // scars and wounds drawn as little slashes
    const inj = c.body.parts[id].inj; const bb = attrs.cx ? [attrs.cx, attrs.cy] : null;
    inj.slice(0, 4).forEach((i, k) => { const [x, y] = bb || centroid(id); const ln = el('line', { x1: x - 4 + k * 3, y1: y - 4 + k * 4, x2: x + 3 + k * 3, y2: y + 1 + k * 4, class: 'wound ' + i.type }); svg.append(ln); });
  }
  for (const [id, [x, y]] of Object.entries(ORGAN_DOTS).sort((a, b) => LINE_ORGANS.includes(b[0]) - LINE_ORGANS.includes(a[0]))) { // bones first, organs on top
    if (isMissing(c, id) && !['eye_l', 'eye_r'].includes(id)) continue;
    const col = id === 'dantian' ? 'var(--qi)' : color(c, id), line = LINE_ORGANS.includes(id);
    const d = ORGAN_SHAPES[id] ? el('path', { d: ORGAN_SHAPES[id], transform: `translate(${x} ${y})`, fill: line ? 'none' : col, stroke: line ? col : '#0b0e16', 'stroke-width': line ? 1.6 : 0.7, class: 'organ' + (line ? ' line' : '') + (id === 'dantian' ? ' dantian' : '') + (focus === id ? ' focus' : '') })
      : el('circle', { cx: x, cy: y, r: 2.4, fill: col, class: 'organ' + (focus === id ? ' focus' : '') });
    const t = el('title', {}); t.textContent = `${PART_BY_ID[id].name}: ${Math.round(partEff(c, id) * 100)}%`; d.append(t);
    d.addEventListener('click', e => { e.stopPropagation(); G.ui.bodyFocus = focus === id ? null : id; rerender(); });
    svg.append(d);
  }
  const hurt = PARTS.filter(p => (focus ? p.id === focus || p.parent === focus : true) && (c.body.parts[p.id].inj.length || isMissing(c, p.id) || partEff(c, p.id) < 0.95));
  const list = h('div', { class: 'body-list' },
    focus ? h('div', { class: 'row small' }, h('b', {}, PART_BY_ID[focus].name), h('button', { class: 'pill', style: { marginLeft: 'auto', padding: '4px 10px' }, onclick: () => { G.ui.bodyFocus = null; rerender(); } }, 'Show all')) : null,
    hurt.length ? hurt.map(p => { const s = c.body.parts[p.id], miss = isMissing(c, p.id), e = partEff(c, p.id);
      return h('div', { class: 'blist-part' }, h('div', { class: 'blist-head' }, h('b', {}, p.name), h('span', { class: 'blist-bar' }, h('i', { style: { width: e * 100 + '%', background: color(c, p.id) === 'none' ? 'transparent' : color(c, p.id) } }))),
        miss ? h('div', { class: 'blist-inj ' + (prostheticOf(c, p.id) ? 'artificial' : 'lost') }, s.prosthetic ? `Replaced: ${PROSTHETICS[s.prosthetic].name}` : prostheticOf(c, p.id) ? `Part of the ${PROSTHETICS[prostheticOf(c, p.id)].name.toLowerCase()}` : s.missing ? (s.permanent ? 'Lost — permanent' : 'Lost — can still be regrown with Qi') : 'Lost with the limb above it') : null,
        ...s.inj.map(i => h('div', { class: 'blist-inj ' + i.type }, INJURIES[i.type].name, i.sev > 1 ? h('span', { class: 'muted' }, ' (severe)') : null, ['cut', 'burn'].includes(i.type) ? h('span', { class: 'drop' }, '💧') : null)),
        !miss && !s.inj.length ? h('div', { class: 'blist-inj muted' }, `Weakened — ${s.hp}/${maxHp(c, p.id)} HP`) : null); })
      : h('div', { class: 'good', style: { padding: '10px' } }, focus ? `${PART_BY_ID[focus].name} is healthy.` : 'No injuries. Your body is whole.'));
  return h('div', { class: 'body-diagram' }, h('div', { class: 'body-fig' }, svg, h('div', { class: 'body-legend small' }, ['#eef2f7', '#ffd25a', '#ff8a3a', '#e23b3b', '#5fb4ff'].map((col, i) => h('span', {}, h('i', { style: { background: col } }), ['Healthy', 'Hurt', 'Badly hurt', 'Critical', 'Prosthetic'][i])))), list);
}
function centroid(id) { return { torso: [60, 96], neck: [60, 49], arm_l: [25, 92], arm_r: [95, 92], leg_l: [50, 176], leg_r: [70, 176], foot_l: [48, 228], foot_r: [72, 228] }[id] || [60, 120]; }
