// v0.9.24 First-time minigame instructions. howTo(key) resolves once the player presses Start
// (immediately if they've seen this game before, or turned instructions off in Settings).
import { h } from './dom.js';
import { META, save } from '../core/state.js';
import { HOWTO } from '../data/howto.js';
import { fx } from './fx.js';

export const howSeen = key => !!META.howSeen?.[key];
export function resetHowTo() { META.howSeen = {}; save(); }
export function howTo(key, fallback = {}) {
  const H = HOWTO[key]; if (!H || howSeen(key) || META.settings?.mgInstructions === false) return Promise.resolve();
  const title = H.title || fallback.title || 'How to play';
  return new Promise(resolve => {
    let t0 = performance.now();
    const go = () => { if (performance.now() - t0 < 400) return; (META.howSeen ||= {})[key] = true; save(); fx('click'); removeEventListener('keydown', key1, true); wrap.classList.remove('on'); setTimeout(() => { wrap.remove(); resolve(); }, 180); };
    const key1 = e => { if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); go(); } };
    const btn = h('button', { class: 'btn howto-go', onclick: go }, 'Got it — start');
    const wrap = h('div', { class: 'howto-wrap' }, h('div', { class: 'howto-card', role: 'dialog', 'aria-label': title },
      h('div', { class: 'howto-kicker' }, 'First time · How to play'), h('h2', { class: 'display' }, title), h('p', { class: 'howto-goal' }, H.goal),
      h('ol', { class: 'howto-steps' }, H.steps.map(s => h('li', {}, s))),
      h('div', { class: 'howto-ctl' }, h('div', {}, h('b', {}, '📱 Phone '), H.phone), h('div', {}, h('b', {}, '🖱️ PC '), H.pc)),
      H.score ? h('p', { class: 'howto-score small muted' }, H.score) : null,
      h('div', { class: 'howto-foot' }, h('span', { class: 'small muted' }, 'Shown once per game (Settings can bring it back). The game itself can\'t be skipped.'), btn)));
    wrap.addEventListener('pointerdown', e => e.stopPropagation()); // taps here never reach the game underneath
    document.body.append(wrap); requestAnimationFrame(() => { wrap.classList.add('on'); btn.focus({ preventScroll: true }); });
    addEventListener('keydown', key1, true);
  });
}
