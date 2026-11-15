// DOM helpers + sprite icons from assets/icons.png (packed from the CC0 pixel-art-atlas dataset).
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat(Infinity)) if (k != null && k !== false) el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  return el;
}
let ICONS = { icons: {}, cols: 16, tile: 16 };
export async function loadIcons() { try { ICONS = await (await fetch('assets/icons.json')).json(); } catch (e) { console.warn('icons.json missing'); } }
export function icon(name, cls = '') {
  const meta = ICONS.icons[name]; const el = h('span', { class: 'icon ' + cls, 'aria-hidden': 'true' });
  if (!meta) { el.style.visibility = 'hidden'; return el; }
  requestAnimationFrame(() => {
    const size = el.offsetWidth || 24, scale = size / ICONS.tile;
    const rows = Math.ceil(Object.keys(ICONS.icons).length / ICONS.cols);
    el.style.backgroundSize = `${ICONS.cols * size}px ${rows * size}px`;
    el.style.backgroundPosition = `-${(meta.i % ICONS.cols) * size}px -${Math.floor(meta.i / ICONS.cols) * size}px`;
  });
  return el;
}
export const $ = s => document.querySelector(s);

// ---- custom tooltips: any element with data-tip shows a styled popover on hover, focus or tap
let tipEl = null, tipFor = null;
function showTip(t, x, y) {
  if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'tip'; document.body.append(tipEl); }
  tipFor = t; tipEl.replaceChildren(
    t.dataset.tipTitle ? h('b', { style: { color: t.dataset.tipColor || '' } }, t.dataset.tipTitle) : null,
    t.dataset.tipSub ? h('small', {}, t.dataset.tipSub) : null, h('div', {}, t.dataset.tip));
  tipEl.style.display = 'block'; place(x, y);
}
function place(x, y) { if (!tipEl) return; const r = tipEl.getBoundingClientRect(); let L = x + 14, T = y + 16; if (L + r.width > innerWidth - 8) L = x - r.width - 14; if (T + r.height > innerHeight - 8) T = y - r.height - 12; tipEl.style.left = Math.max(8, L) + 'px'; tipEl.style.top = Math.max(8, T) + 'px'; }
function hideTip() { if (tipEl) tipEl.style.display = 'none'; tipFor = null; }
addEventListener('pointerover', e => { const t = e.target.closest?.('[data-tip]'); if (t && e.pointerType !== 'touch') showTip(t, e.clientX, e.clientY); else if (!t) hideTip(); });
addEventListener('pointermove', e => { if (tipFor && e.pointerType !== 'touch') place(e.clientX, e.clientY); });
addEventListener('pointerdown', e => { const t = e.target.closest?.('[data-tip]'); if (t && e.pointerType === 'touch') { if (tipFor === t) hideTip(); else { const r = t.getBoundingClientRect(); showTip(t, r.left, r.bottom); } } else if (!t) hideTip(); });
addEventListener('focusin', e => { const t = e.target.closest?.('[data-tip]'); if (t) { const r = t.getBoundingClientRect(); showTip(t, r.left, r.bottom); } });
addEventListener('focusout', hideTip); addEventListener('scroll', hideTip, true);
