// v0.9.35 The Legacy tree as a real skill tree: a hub of five branch hexes around the Ultimate, and each branch
// drawn as a node graph you can pan and zoom. Capstones (15 nodes in a branch) lead to the ultimate goal.
import { h } from './dom.js';
import { G, META, save } from '../core/state.js';
import { TREE, BRANCHES, NODE, perk, nodeCost, canBuy, reqMet, branchOwned } from '../data/legacyTree.js';
import { fx } from './fx.js';

const rerender = () => import('./render.js').then(m => m.render());
const ICO = { fortune: '💰', cultivation: '🌀', body: '💪', mind: '🧠', destiny: '⭐', ultimate: '♾️' };
const SVGNS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, ...kids) => { const e = document.createElementNS(SVGNS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); kids.forEach(k => k && e.append(k)); return e; };
const hexPts = (cx, cy, r) => Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 180 * (60 * i - 30); return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`; }).join(' ');
const spent = br => TREE.filter(n => n.branch === br).reduce((t, n) => { let s = 0; for (let l = 0; l < perk(n.id); l++) s += n.cost * (l + 1); return t + s; }, 0);
const stateOf = n => perk(n.id) >= n.max ? 'maxed' : perk(n.id) > 0 ? 'owned' : reqMet(n) ? (canBuy(n) ? 'buyable' : 'open') : 'locked';
const reqText = n => n.reqAll ? `Needs all five capstones (${n.reqAll.filter(id => perk(id)).length}/5)` : n.reqN ? `Needs ${n.reqN} upgrades in ${BRANCHES[n.branch].name} (${branchOwned(n.branch)}/${n.reqN})` : n.req ? `Needs ${NODE[n.req].name}` : '';

function buy(n) { if (!canBuy(n)) return; META.legacy -= nodeCost(n); META.tree[n.id] = perk(n.id) + 1; fx(n.cap ? 'ascend' : 'milestone'); save(); rerender(); }

// ---------- the hub
function hub() {
  const W = 560, H = 470, cx = W / 2, cy = H / 2, R = 78, d = 158;
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'tt-hub' });
  const keys = Object.keys(BRANCHES), pos = keys.map((k, i) => { const a = (-90 + i * 72) * Math.PI / 180; return [k, cx + Math.cos(a) * d, cy + Math.sin(a) * d]; });
  for (const [k, x, y] of pos) s.append(svg('line', { x1: cx, y1: cy, x2: x, y2: y, class: 'tt-hubline' + (perk(k[0] + '_cap') ? ' lit' : ''), style: `--bc:${BRANCHES[k].color}` }));
  const hex = (k, x, y, r, title, sub, sub2, color, on) => {
    const g = svg('g', { class: 'tt-hex' + (on ? ' on' : ''), style: `--bc:${color}`, tabindex: 0, role: 'button' });
    g.append(svg('polygon', { points: hexPts(x, y, r), class: 'tt-hex-bg' }), svg('polygon', { points: hexPts(x, y, r - 6), class: 'tt-hex-in' }));
    const t = (ty, txt, cls) => { const e = svg('text', { x, y: ty, class: cls, 'text-anchor': 'middle' }); e.textContent = txt; g.append(e); };
    t(y - 18, ICO[k], 'tt-hex-ico'); t(y + 12, title, 'tt-hex-title'); t(y + 30, sub, 'tt-hex-sub'); if (sub2) t(y + 46, sub2, 'tt-hex-sub2');
    g.addEventListener('click', () => { fx('click'); G.ui.ttBranch = k; rerender(); }); g.addEventListener('keydown', e => { if (e.key === 'Enter') g.dispatchEvent(new Event('click')); });
    s.append(g);
  };
  for (const [k, x, y] of pos) { const B = BRANCHES[k], tot = TREE.filter(n => n.branch === k && !n.cap).length;
    hex(k, x, y, R, B.name, `${branchOwned(k)}/${tot} unlocked`, perk(k[0] + '_cap') ? '★ Capstone' : `${spent(k)} pts spent`, B.color, perk(k[0] + '_cap') > 0); }
  const U = NODE.u_cap; hex('ultimate', cx, cy, R + 6, 'Ultimate', perk('u_cap') ? 'Achieved' : `${U.reqAll.filter(id => perk(id)).length}/5 capstones`, null, '#ffd36f', perk('u_cap') > 0);
  return s;
}

// ---------- one branch as a tree
function layout(br) {
  const nodes = TREE.filter(n => n.branch === br && !n.cap), kids = id => nodes.filter(n => (n.req || null) === id);
  const pos = {}; let leaf = 0;
  const place = (n, depth) => { const ch = kids(n.id); if (!ch.length) { pos[n.id] = [leaf++, depth]; return pos[n.id][0]; } const xs = ch.map(k => place(k, depth + 1)); pos[n.id] = [(Math.min(...xs) + Math.max(...xs)) / 2, depth]; return pos[n.id][0]; };
  for (const r of kids(null)) place(r, 0);
  const maxD = Math.max(0, ...Object.values(pos).map(p => p[1])), cap = TREE.find(n => n.branch === br && n.cap);
  if (cap) pos[cap.id] = [(leaf - 1) / 2, maxD + 1.4];
  return { nodes: cap ? [...nodes, cap] : nodes, pos, width: leaf, depth: maxD + 2 };
}
function branchView(br) {
  const B = BRANCHES[br] || { name: 'Ultimate', color: '#ffd36f', desc: 'The end of every bloodline\'s road.' };
  const L = br === 'ultimate' ? { nodes: [NODE.u_cap], pos: { u_cap: [0, 0] }, width: 1, depth: 1 } : layout(br);
  const SX = 108, SY = 110, PAD = 70, W = Math.max(1, L.width) * SX + PAD * 2, H = L.depth * SY + PAD * 2;
  const P = id => [PAD + L.pos[id][0] * SX + SX / 2 - SX / 2, PAD + L.pos[id][1] * SY];
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: 'tt-svg', style: `--bc:${B.color}` });
  // links
  for (const n of L.nodes) {
    const parents = n.req ? [n.req] : n.cap && !n.ultimate ? L.nodes.filter(x => !x.cap && !L.nodes.some(y => y.req === x.id)).map(x => x.id) : [];
    for (const pid of parents) { if (!L.pos[pid]) continue; const [x1, y1] = P(pid), [x2, y2] = P(n.id), my = (y1 + y2) / 2;
      s.append(svg('path', { d: `M${x1},${y1 + 34} C${x1},${my} ${x2},${my} ${x2},${y2 - 34}`, class: 'tt-link' + (perk(pid) ? ' lit' : '') + (n.cap ? ' cap' : '') })); }
  }
  // nodes
  const sel = G.ui.ttSel && L.pos[G.ui.ttSel] ? G.ui.ttSel : null;
  for (const n of L.nodes) { const [x, y] = P(n.id), st = stateOf(n), r = n.cap ? 42 : 32;
    const g = svg('g', { class: `tt-node ${st}${n.cap ? ' cap' : ''}${sel === n.id ? ' sel' : ''}`, tabindex: 0, role: 'button' });
    g.append(svg('polygon', { points: hexPts(x, y, r), class: 'tt-n-bg' }), svg('polygon', { points: hexPts(x, y, r - 5), class: 'tt-n-in' }));
    const tx = (ty, txt, cls) => { const e = svg('text', { x, y: ty, 'text-anchor': 'middle', class: cls }); e.textContent = txt; g.append(e); };
    tx(y + (n.cap ? 6 : 5), n.cap ? (n.ultimate ? '♾️' : '★') : st === 'locked' ? '🔒' : ICO[n.branch], 'tt-n-ico');
    const nm = n.name.length > 15 ? n.name.slice(0, 14) + '…' : n.name; tx(y + r + 15, nm, 'tt-n-name');
    if (n.max > 1 || perk(n.id)) tx(y + r + 28, '◆'.repeat(perk(n.id)) + '◇'.repeat(n.max - perk(n.id)), 'tt-n-pips');
    const t = svg('title'); t.textContent = `${n.name}\n${n.desc}${st === 'locked' ? '\n' + reqText(n) : ''}`; g.append(t);
    g.addEventListener('click', e => { e.stopPropagation(); G.ui.ttSel = n.id; fx('click'); rerender(); });
    g.addEventListener('keydown', e => { if (e.key === 'Enter') { G.ui.ttSel = n.id; rerender(); } });
    s.append(g);
  }
  // pan & zoom
  const zoom = G.ui.ttZoom ?? (innerWidth < 700 ? 0.7 : 0.85); s.style.transform = `scale(${zoom})`; s.style.transformOrigin = '0 0';
  const wrap = h('div', { class: 'tt-wrap' }, h('div', { class: 'tt-canvas', style: { width: W * zoom + 'px', height: H * zoom + 'px' } }, s));
  let drag = null; wrap.addEventListener('pointerdown', e => { if (e.target.closest('.tt-node') || e.pointerType === 'touch') return; drag = [e.clientX, e.clientY, wrap.scrollLeft, wrap.scrollTop]; wrap.classList.add('drag'); try { wrap.setPointerCapture(e.pointerId); } catch (x) {} });
  wrap.addEventListener('pointermove', e => { if (drag) { wrap.scrollLeft = drag[2] - (e.clientX - drag[0]); wrap.scrollTop = drag[3] - (e.clientY - drag[1]); } });
  const stop = () => { drag = null; wrap.classList.remove('drag'); }; wrap.addEventListener('pointerup', stop); wrap.addEventListener('pointercancel', stop);
  requestAnimationFrame(() => { const k = 'tt_scroll_' + br, sv = G.ui[k]; if (sv) { wrap.scrollLeft = sv[0]; wrap.scrollTop = sv[1]; } else wrap.scrollLeft = (wrap.scrollWidth - wrap.clientWidth) / 2; });
  wrap.addEventListener('scroll', () => { G.ui['tt_scroll_' + br] = [wrap.scrollLeft, wrap.scrollTop]; });
  // detail card for the selected node
  const n = sel ? NODE[sel] : null;
  const detail = n ? (() => { const st = stateOf(n), lvl = perk(n.id);
    return h('div', { class: 'card tt-detail ' + st, style: { '--bc': B.color } }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('b', {}, (n.cap ? '★ ' : '') + n.name), h('span', { class: 'pips-l' }, '◆'.repeat(lvl) + '◇'.repeat(n.max - lvl))),
      h('div', { class: 'small' }, n.desc), st === 'locked' ? h('div', { class: 'small muted' }, '🔒 ' + reqText(n)) : null,
      h('button', { class: 'btn', disabled: !canBuy(n), onclick: () => buy(n) }, st === 'maxed' ? 'Maxed' : st === 'locked' ? 'Locked' : `Unlock · ${nodeCost(n)} pts`)); })()
    : h('div', { class: 'card tt-detail muted small' }, 'Tap a node to see what it does. Drag to look around. Bright lines lead from what you own to what you can unlock next.');
  return h('div', {}, h('div', { class: 'row tt-bar' }, h('button', { class: 'btn ghost', onclick: () => { G.ui.ttBranch = null; G.ui.ttSel = null; rerender(); } }, '← All branches'),
      h('b', { style: { color: B.color } }, `${ICO[br]} ${B.name}`), h('span', { class: 'small muted' }, B.desc),
      h('span', { style: { marginLeft: 'auto' }, class: 'row' }, h('button', { class: 'btn ghost mini', onclick: () => { G.ui.ttZoom = Math.max(0.5, +(zoom - 0.15).toFixed(2)); rerender(); } }, '−'), h('span', { class: 'small' }, Math.round(zoom * 100) + '%'), h('button', { class: 'btn ghost mini', onclick: () => { G.ui.ttZoom = Math.min(1.6, +(zoom + 0.15).toFixed(2)); rerender(); } }, '+'))),
    wrap, detail);
}

export function talentTree() {
  META.tree ||= {};
  const br = G.ui.ttBranch;
  return h('div', { class: 'tt' }, h('div', { class: 'tt-head' }, h('h3', { class: 'display' }, 'Legacy Tree'), h('div', { class: 'tt-pts' }, `${META.legacy.toLocaleString()} Legacy Points`)),
    br ? branchView(br) : h('div', {}, h('p', { class: 'muted small', style: { textAlign: 'center' } }, 'Five branches, each ending in a Capstone once you own 15 of its upgrades. Earn all five Capstones to unlock the Ultimate: The Eternal Bloodline.'), hub()));
}
