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
