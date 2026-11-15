// Popups: choice dialogs, info dialogs, toasts.
import { h, icon } from './dom.js';
import { fx } from './fx.js';

export function openModal(content, { cls = '', onClose, dismiss = true } = {}) {
  const root = document.getElementById('modal-root');
  const box = h('div', { class: 'panel corners modal ' + cls }, content);
  const back = h('div', { class: 'modal-back' }, box);
  const close = () => { back.remove(); onClose?.(); };
  if (dismiss) back.addEventListener('pointerdown', e => { if (e.target === back) close(); });
  root.append(back); return { close, box, back };
}
// Returns a promise resolving to the chosen option's value (or null if dismissed)
export function choice({ title, text, icon: ic, options = [], portrait = null, dismiss = true }) {
  return new Promise(res => {
    let done = false;
    const finish = v => { if (done) return; done = true; m.close(); res(v); };
    const m = openModal([
      h('h2', {}, ic ? icon(ic, 'lg') : null, title),
      portrait ? h('div', { class: 'row', style: { marginBottom: '8px' } }, portrait) : null,
      h('div', { class: 'text' }, text || ''),
      h('div', { class: 'opts' }, options.map(o => h('button', { class: 'btn' + (o.ghost ? ' ghost' : ''), disabled: o.disabled, onclick: () => { fx('click'); finish(o.value); } }, o.label))),
    ], { dismiss, onClose: () => { if (!done) { done = true; res(null); } } });
  });
}
export function openInfo(title, body, ic) { return openModal([h('h2', {}, ic ? icon(ic, 'lg') : null, title), body]); }
export function toast(text, cls = '') {
  const el = h('div', { class: 'toast ' + cls }, text); document.getElementById('toasts').append(el); setTimeout(() => el.remove(), 3200);
}
// Text-input dialog. fields: [{ key, label, placeholder, max }] → resolves {key: value} or null
export function prompt({ title, text, icon: ic, fields, okLabel = 'Confirm' }) {
  return new Promise(res => {
    let done = false; const inputs = {};
    const finish = v => { if (done) return; done = true; m.close(); res(v); };
    const m = openModal([h('h2', {}, ic ? icon(ic, 'lg') : null, title), h('div', { class: 'text' }, text || ''),
      ...fields.map(f => h('label', { class: 'field' }, f.label, inputs[f.key] = h('input', { class: 'chat-in', placeholder: f.placeholder || '', maxlength: f.max || 30 }))),
      h('div', { class: 'opts' }, h('button', { class: 'btn', onclick: () => { const v = Object.fromEntries(Object.entries(inputs).map(([k, el]) => [k, el.value.trim()])); if (Object.values(v).some(x => !x)) return; fx('click'); finish(v); } }, okLabel),
        h('button', { class: 'btn ghost', onclick: () => finish(null) }, 'Cancel'))], { onClose: () => { if (!done) { done = true; res(null); } } });
  });
}
