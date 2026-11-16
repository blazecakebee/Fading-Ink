// v0.8.7 Move FX registry: every move gets its own visual shape and sound. New moves don't need an entry —
// fxFor() infers a style from the move's fields (pierce → beam, burn → fireball, drain → siphon, stun → shockwave…).
import { h } from './dom.js';
import { MOVES } from '../data/combat.js';

const MOVE_FX = {
  slap: { shape: 'impact', snd: 'slap', size: 0.6 }, jab: { shape: 'impact', snd: 'jab', size: 0.7 }, punch: { shape: 'impact', snd: 'punch', size: 1 }, kick: { shape: 'arc', snd: 'kick' },
  guard: { shape: 'shield', snd: 'guard' }, iron_skin: { shape: 'shield', snd: 'metal' }, blood_rush: { shape: 'shield', snd: 'heart' },
  qi_palm: { shape: 'orb', snd: 'palm' }, flame_palm: { shape: 'orb', snd: 'flame', burst: 'flame' }, river_step: { shape: 'afterimage', snd: 'swish' },
  thunder_fist: { shape: 'bolt', snd: 'thunder' }, void_rend: { shape: 'rift', snd: 'void' }, star_fall: { shape: 'meteor', snd: 'star' }, qilin_flame: { shape: 'orb', snd: 'flame', burst: 'flame', size: 1.3 },
  blood_drain: { shape: 'siphon', snd: 'drain' }, phantom_step: { shape: 'afterimage', snd: 'swish' }, bone_crush: { shape: 'impact', snd: 'crunch', size: 1.2 }, mountain_breaker: { shape: 'quake', snd: 'quake' },
  unbound_strike: { shape: 'impact', snd: 'boom', size: 1.6 }, heaven_splitter: { shape: 'slash', snd: 'split', size: 1.6 },
  karate_ikken: { shape: 'impact', snd: 'punch', size: 1.3 }, tkd_tornado: { shape: 'spin', snd: 'swish' }, kungfu_crane: { shape: 'arc', snd: 'swish' }, judo_throw: { shape: 'quake', snd: 'thud' },
  muay_elbow: { shape: 'slash', snd: 'crunch' }, wingchun_inch: { shape: 'impact', snd: 'jab', size: 0.9 }, severed_rebound: { shape: 'quake', snd: 'boom' }, sect_hidden: { shape: 'siphon', snd: 'palm' },
};
// future-proof: derive a look from what a move does
export function fxFor(key) {
  if (MOVE_FX[key]) return MOVE_FX[key];
  const m = MOVES[key] || {};
  if (m.guard || m.armor) return { shape: 'shield', snd: 'guard' };
  if (m.drain) return { shape: 'siphon', snd: 'drain' };
  if (m.evade) return { shape: 'afterimage', snd: 'swish' };
  if (m.pierce) return { shape: m.stat === 'qi' ? 'rift' : 'slash', snd: m.stat === 'qi' ? 'void' : 'split' };
  if (m.burn) return { shape: 'orb', snd: 'flame', burst: 'flame' };
  if (m.stun) return { shape: m.stat === 'qi' ? 'bolt' : 'quake', snd: m.stat === 'qi' ? 'thunder' : 'quake' };
  if (m.stat === 'qi') return { shape: 'orb', snd: 'palm' };
  return { shape: (m.dmg?.[1] || 0) > 15 ? 'impact' : 'arc', snd: 'punch', size: Math.min(1.6, 0.6 + (m.dmg?.[1] || 6) / 30) };
}
// effects live in an overlay inside the fight window, positioned relative to it (immune to page scroll/blur transforms)
let HOST = null;
export function fxHost(anyEl) { const host = anyEl?.closest?.('.modal') || anyEl?.parentElement || document.body; let ov = host.querySelector(':scope > .mfx-layer'); if (!ov) { ov = h('div', { class: 'mfx-layer' }); host.append(ov); } HOST = ov; return ov; }
const center = el => { const H = HOST || document.body, r = el.getBoundingClientRect(), o = H.getBoundingClientRect(), k = (o.width / (H.offsetWidth || o.width)) || 1; return [(r.left + r.width / 2 - o.left) / k, (r.top + r.height / 2 - o.top + (H.parentElement?.scrollTop || 0) * k) / k]; }; // zoom & scroll safe
function spawn(cls, x, y, color, style = {}, ms = 700) {
  const el = h('div', { class: 'mfx ' + cls }); el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.setProperty('--fc', color);
  for (const [k, v] of Object.entries(style)) el.style.setProperty(k, v); (HOST || document.body).append(el); setTimeout(() => el.remove(), ms); return el;
}
// play a move's effect from the attacker's portrait to the defender's
export function playMoveFx(key, fromEl, toEl, color, crit) {
  try {
    const F = fxFor(key); if (!toEl || !fromEl) return; fxHost(toEl); const [tx, ty] = center(toEl), [fx0, fy0] = center(fromEl), s = (F.size || 1) * (crit ? 1.35 : 1);
    const ang = Math.atan2(ty - fy0, tx - fx0) * 180 / Math.PI, len = Math.hypot(tx - fx0, ty - fy0);
    switch (F.shape) {
      case 'impact': spawn('impact', tx, ty, color, { '--s': s }); break;
      case 'arc': spawn('arc', tx, ty, color, { '--s': s, '--r': (Math.random() * 60 - 30) + 'deg' }); break;
      case 'slash': spawn('slash', tx, ty, color, { '--s': s, '--r': '-35deg' }); setTimeout(() => spawn('slash', tx, ty, color, { '--s': s * 0.8, '--r': '35deg' }), 90); break;
      case 'spin': for (let i = 0; i < 3; i++) setTimeout(() => spawn('arc', tx, ty, color, { '--s': s, '--r': i * 120 + 'deg' }), i * 70); break;
      case 'shield': spawn('shield', fx0, fy0, color, {}, 900); break;
      case 'afterimage': for (let i = 0; i < 3; i++) setTimeout(() => spawn('ghost', fx0 + (tx - fx0) * (i + 1) / 4, fy0 + (ty - fy0) * (i + 1) / 4, color), i * 60); spawn('impact', tx, ty, color, { '--s': 0.7 }); break;
      case 'orb': { const o = spawn('orb', fx0, fy0, color, { '--dx': (tx - fx0) + 'px', '--dy': (ty - fy0) + 'px', '--s': s }, 600); setTimeout(() => spawn(F.burst === 'flame' ? 'flameburst' : 'impact', tx, ty, color, { '--s': s }), 330); break; }
      case 'beam': spawn('beam', fx0, fy0, color, { '--len': len + 'px', '--ang': ang + 'deg' }); break;
      case 'bolt': spawn('bolt', tx, ty, color, { '--s': s }, 600); spawn('impact', tx, ty, color, { '--s': s }); break;
      case 'rift': spawn('rift', tx, ty, color, { '--s': s, '--r': (Math.random() * 180) + 'deg' }, 900); break;
      case 'meteor': spawn('meteor', tx, ty, color, { '--s': s }, 700); setTimeout(() => spawn('flameburst', tx, ty, color, { '--s': s * 1.3 }), 380); break;
      case 'siphon': for (let i = 0; i < 6; i++) setTimeout(() => spawn('siphon', tx, ty, color, { '--dx': (fx0 - tx) + 'px', '--dy': (fy0 - ty) + 'px' }), i * 50); break;
      case 'quake': spawn('quake', tx, ty, color, { '--s': s }, 800); break;
    }
    moveSfx(F.snd, crit);
  } catch (e) {}
}
// procedural sound per move family
export function moveSfx(kind, crit) {
  import('../audio/sfx.js').then(({ audio, tone, noise }) => { try {
    const t = audio().currentTime + 0.005, g = crit ? 1.4 : 1;
    const S = {
      slap: () => noise(t, 0.05, { freq: 3000, gain: 0.25 * g, q: 1 }), jab: () => { noise(t, 0.06, { freq: 1200, gain: 0.25 * g }); tone(180, t, 0.06, { gain: 0.15, glide: 90 }); },
      punch: () => { noise(t, 0.1, { freq: 500, gain: 0.35 * g, type: 'lowpass' }); tone(110, t, 0.12, { gain: 0.25, glide: 50 }); },
      kick: () => { noise(t, 0.15, { freq: 900, gain: 0.2 * g, q: 0.5 }); tone(90, t + 0.05, 0.15, { gain: 0.3, glide: 45 }); },
      guard: () => tone(520, t, 0.25, { type: 'triangle', gain: 0.08, glide: 700 }), metal: () => [880, 1320].forEach(f => tone(f, t, 0.5, { gain: 0.05 })),
      heart: () => { tone(60, t, 0.12, { gain: 0.3 }); tone(60, t + 0.18, 0.12, { gain: 0.25 }); },
      palm: () => { tone(300, t, 0.25, { gain: 0.1, glide: 900 }); noise(t, 0.2, { freq: 4000, gain: 0.05 }); },
      flame: () => { for (let i = 0; i < 5; i++) noise(t + i * 0.03, 0.06, { freq: 1800 + Math.random() * 2000, gain: 0.12, q: 2 }); noise(t, 0.35, { freq: 260, gain: 0.2, type: 'lowpass' }); },
      swish: () => noise(t, 0.22, { freq: 2200, gain: 0.12, q: 0.6 }), thunder: () => { noise(t, 0.05, { freq: 6000, gain: 0.35, type: 'highpass' }); noise(t + 0.03, 0.5, { freq: 180, gain: 0.4, type: 'lowpass' }); },
      void: () => { tone(55, t, 0.7, { gain: 0.3, glide: 30 }); tone(880, t, 0.3, { type: 'sawtooth', gain: 0.03, glide: 110 }); },
      star: () => { tone(1800, t, 0.4, { gain: 0.05, glide: 300 }); noise(t + 0.35, 0.5, { freq: 300, gain: 0.45, type: 'lowpass' }); },
      drain: () => { tone(500, t, 0.5, { type: 'sawtooth', gain: 0.04, glide: 120 }); }, crunch: () => { noise(t, 0.12, { freq: 1500, gain: 0.4 * g, q: 4 }); tone(80, t, 0.15, { gain: 0.3 }); },
      quake: () => { tone(45, t, 0.6, { gain: 0.4, glide: 25 }); noise(t, 0.5, { freq: 150, gain: 0.4, type: 'lowpass' }); }, thud: () => { tone(70, t, 0.3, { gain: 0.45, glide: 35 }); },
      boom: () => { noise(t, 0.4, { freq: 200, gain: 0.55, type: 'lowpass' }); tone(55, t, 0.5, { gain: 0.4, glide: 28 }); }, split: () => { noise(t, 0.08, { freq: 7000, gain: 0.3, type: 'highpass' }); tone(1200, t, 0.3, { type: 'sawtooth', gain: 0.04, glide: 200 }); },
    };
    (S[kind] || S.punch)();
  } catch (e) {} });
}
// damage numbers, anchored to the fight window like the effects
export function floatNum(el, text, color) { if (!el) return; fxHost(el); const [x, y] = center(el); const n = spawn('num', x, y - 30, color, {}, 1100); n.textContent = text; n.style.color = color; }
