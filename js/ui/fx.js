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

// Realm ascension: ink bloom, expanding rings, rising sparks and the realm's name
function ascend(realmName, color) {
  sfx('ascend'); if (!S().fxOn) return;
  const L = layer(); const wrap = h('div', { class: 'ascend' }); wrap.style.setProperty('--c', color);
  wrap.append(h('div', { class: 'ascend-ink' }), ...[0, 1, 2].map(i => { const r = h('div', { class: 'ascend-ring' }); r.style.animationDelay = i * 0.35 + 's'; return r; }),
    h('div', { class: 'ascend-text' }, h('small', {}, 'You have ascended to'), realmName || 'a new realm'));
  for (let i = 0; i < 40; i++) { const sp = h('i', { class: 'ascend-spark' }); sp.style.left = Math.random() * 100 + '%'; sp.style.animationDelay = Math.random() * 1.6 + 's'; sp.style.animationDuration = 1.6 + Math.random() * 1.5 + 's'; wrap.append(sp); }
  L.append(wrap); setTimeout(() => wrap.remove(), 4200);
}

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
    case 'breakthrough': if (o.major) return ascend(o.realm, o.color || qi); sound('breakthrough'); if (s.fxOn) { flash(qi); burst(innerWidth / 2, innerHeight / 2, qi, 30); } return;
    case 'birth': sound('birth'); if (s.fxOn) burst(innerWidth / 2, innerHeight / 3, '#ffb7d0', 24); return;
    case 'heavy': sound('heavy'); if (s.fxOn && s.screenShake) shake(document.getElementById('app')); return;
    case 'limb': sound('limb'); if (s.fxOn) { flash('#b0141e'); if (s.screenShake) shake(document.getElementById('app')); } return;
    case 'cash': sound('cash'); if (s.fxOn) burst(innerWidth - 160, 60, '#ffd75a', 22); return;
    case 'trait': { const t = TIERS[o.tier] || TIERS.common; sound(o.tier === 'glitched' ? 'glitch' : 'trait');
      if (s.fxOn && ['rare', 'legendary', 'mythical', 'secret', 'glitched', 'god'].includes(o.tier)) { banner(o.name, t.name + ' trait', t.color); if (o.tier !== 'rare') flash(t.color); } return; }
    case 'death': sound('death'); return;
    case 'fail': sound('fail'); return;
    default: sound(kind);
  }
}
