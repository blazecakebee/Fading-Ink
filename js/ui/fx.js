// Visual + audio feedback. Kept subtle; big effects reserved for milestones, breakthroughs, rare traits.
import { h } from './dom.js';
import { sfx } from '../audio/sfx.js';
import { S } from '../settings.js';
import { TIERS } from '../data/traits.js';

const layer = () => document.getElementById('fx');
function burst(x, y, color, n = 10) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 60;
    const el = h('i', { class: 'spark', style: { left: x + 'px', top: y + 'px', '--c': color, '--dx': Math.cos(a) * d + 'px', '--dy': Math.sin(a) * d + 'px' } });
    el.style.setProperty('--c', color); el.style.setProperty('--dx', Math.cos(a) * d + 'px'); el.style.setProperty('--dy', Math.sin(a) * d + 'px');
    layer().append(el); setTimeout(() => el.remove(), 1000);
  }
}
export function floatText(text, x, y, color) {
  const el = h('div', { class: 'float', style: { left: x + 'px', top: y + 'px', color } }, text); layer().append(el); setTimeout(() => el.remove(), 1300);
}
function flash(color) { const el = h('div', { class: 'flash' }); el.style.setProperty('--c', color); layer().append(el); setTimeout(() => el.remove(), 1000); }
function banner(text, sub, color) { const el = h('div', { class: 'banner' }, text, sub ? h('small', {}, sub) : null); el.style.setProperty('--c', color); layer().append(el); setTimeout(() => el.remove(), 2400); }
export function shake(el) { if (!S().screenShake || !el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }

let lastPointer = { x: innerWidth / 2, y: innerHeight / 2 };
addEventListener('pointerdown', e => { lastPointer = { x: e.clientX, y: e.clientY }; }, true);

export function fx(kind, o = {}) {
  const s = S(); const sound = n => sfx(n);
  const accent = getComputedStyle(document.body).getPropertyValue('--accent2').trim() || '#ffd84a';
  const qi = getComputedStyle(document.body).getPropertyValue('--qi').trim() || '#7fe3ff';
  switch (kind) {
    case 'click': if (s.uiSounds) sound('click'); return;
    case 'action': sound('action'); if (s.fxOn) burst(lastPointer.x, lastPointer.y, accent, 8); return;
    case 'ageup': sound('ageup'); return;
    case 'milestone': sound('milestone'); if (s.fxOn) { burst(lastPointer.x, lastPointer.y, accent, 16); } return;
    case 'coin': sound('coin'); return;
    case 'breakthrough': sound('breakthrough'); if (s.fxOn) { flash(qi); if (o.major) banner('BREAKTHROUGH', 'A new realm opens before you', qi); burst(innerWidth / 2, innerHeight / 2, qi, 30); } return;
    case 'trait': { const t = TIERS[o.tier] || TIERS.common; sound(o.tier === 'glitched' ? 'glitch' : 'trait');
      if (s.fxOn && ['rare', 'legendary', 'mythical', 'secret', 'glitched', 'god'].includes(o.tier)) { banner(o.name, t.name + ' trait', t.color); if (o.tier !== 'rare') flash(t.color); } return; }
    case 'death': sound('death'); return;
    case 'fail': sound('fail'); return;
    default: sound(kind);
  }
}
