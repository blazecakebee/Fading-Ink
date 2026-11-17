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
  // v0.9.25 new arts, each with its own look and sound
  _charge: { shape: 'gather', snd: 'charge' },
  gale_slash: { shape: 'tornado', snd: 'wind' }, frost_lance: { shape: 'icelance', snd: 'ice' }, lotus_bloom: { shape: 'lotus', snd: 'chime' },
  sword_rain: { shape: 'blades', snd: 'blades' }, earth_prison: { shape: 'spikes', snd: 'rumble' }, soul_chains: { shape: 'chains', snd: 'chains' },
  azure_dragon: { shape: 'dragon', snd: 'roar', size: 1.2 }, heaven_mirror: { shape: 'mirror', snd: 'mirror' }, sun_pillar: { shape: 'pillar', snd: 'radiance', size: 1.3 },
  void_collapse: { shape: 'blackhole', snd: 'collapse', size: 1.4 },
  bull_charge: { shape: 'charge', snd: 'stampede' }, whirlwind_kick: { shape: 'cyclone', snd: 'whirl' }, iron_will: { shape: 'aura', snd: 'gong' },
  pressure_point: { shape: 'needle', snd: 'tick' }, earthshaker: { shape: 'shockwave', snd: 'stomp', size: 1.2 }, hundred_fists: { shape: 'barrage', snd: 'barrage' },
  second_wind: { shape: 'aura', snd: 'breath', aura: 'heal' }, titan_grip: { shape: 'grip', snd: 'grip', size: 1.2 }, meteor_dive: { shape: 'dive', snd: 'dive', size: 1.3 },
  world_ender: { shape: 'ender', snd: 'ender', size: 1.6 },
  // v0.9.46 martial art base moves
  box_uppercut: { shape: 'impact', snd: 'punch', size: 1.1 }, box_weave: { shape: 'afterimage', snd: 'swish' }, box_liver: { shape: 'impact', snd: 'crunch' }, box_dempsey: { shape: 'barrage', snd: 'barrage' }, boxing_bolo: { shape: 'spin', snd: 'punch', size: 1.2 },
  kar_maegeri: { shape: 'arc', snd: 'kick' }, kar_ageuke: { shape: 'shield', snd: 'guard' }, kar_gyaku: { shape: 'impact', snd: 'punch', size: 1.1 }, kar_mawashi: { shape: 'arc', snd: 'kick', size: 1.3 },
  tkd_push: { shape: 'arc', snd: 'kick', size: 0.8 }, tkd_back: { shape: 'impact', snd: 'kick', size: 1.2 }, tkd_hook: { shape: 'spin', snd: 'whirl' }, tkd_double: { shape: 'cyclone', snd: 'whirl' },
  kf_tiger: { shape: 'slash', snd: 'grip' }, kf_snake: { shape: 'needle', snd: 'tick' }, kf_mantis: { shape: 'afterimage', snd: 'swish' }, kf_dragon: { shape: 'quake', snd: 'stomp' },
  jd_ukemi: { shape: 'shield', snd: 'thud' }, jd_ogoshi: { shape: 'quake', snd: 'thud' }, jd_juji: { shape: 'grip', snd: 'grip' }, jd_seoi: { shape: 'quake', snd: 'quake', size: 1.3 },
  mt_teep: { shape: 'arc', snd: 'kick', size: 0.8 }, mt_low: { shape: 'arc', snd: 'crunch' }, mt_knee: { shape: 'impact', snd: 'crunch', size: 1.2 }, mt_spin: { shape: 'slash', snd: 'crunch', size: 1.3 },
  wc_chain: { shape: 'barrage', snd: 'jab' }, wc_paksao: { shape: 'impact', snd: 'slap', size: 0.8 }, wc_stop: { shape: 'impact', snd: 'jab', size: 1 }, wc_dummy: { shape: 'barrage', snd: 'barrage', size: 1.1 },
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
      // v0.9.25
      case 'gather': for (let i = 0; i < 10; i++) { const r = 70 + Math.random() * 40, t2 = Math.random() * 6.28; setTimeout(() => spawn('mote', fx0 + Math.cos(t2) * r, fy0 + Math.sin(t2) * r, color, { '--dx': (-Math.cos(t2) * r) + 'px', '--dy': (-Math.sin(t2) * r) + 'px' }, 600), i * 45); } setTimeout(() => spawn('ring', fx0, fy0, color, {}, 700), 420); break;
      case 'tornado': spawn('tornado', tx, ty, color, { '--s': s }, 800); spawn('slash', tx, ty, color, { '--s': s * 0.8, '--r': '-20deg' }); break;
      case 'icelance': { spawn('icelance', fx0, fy0, color, { '--dx': (tx - fx0) + 'px', '--dy': (ty - fy0) + 'px', '--ang': ang + 'deg' }, 420); setTimeout(() => { for (let i = 0; i < 6; i++) spawn('shard', tx, ty, color, { '--r': i * 60 + 'deg' }, 600); }, 330); break; }
      case 'lotus': for (let i = 0; i < 8; i++) spawn('petal', fx0, fy0, color, { '--r': i * 45 + 'deg' }, 1000); spawn('ring', fx0, fy0, '#7fe3a0', {}, 900); break;
      case 'blades': for (let i = 0; i < 5; i++) setTimeout(() => spawn('blade', tx + (Math.random() * 80 - 40), ty, color, { '--s': s }, 450), i * 80); break;
      case 'spikes': for (let i = 0; i < 4; i++) setTimeout(() => spawn('spike', tx + (i - 1.5) * 26, ty + 10, color, { '--s': s, '--r': ((i - 1.5) * -14) + 'deg' }, 700), i * 50); break;
      case 'chains': for (let i = 0; i < 3; i++) spawn('chain', tx, ty, color, { '--r': (i * 60 - 60) + 'deg' }, 900); break;
      case 'dragon': { const d = spawn('dragon', fx0, fy0, color, { '--dx': (tx - fx0) + 'px', '--dy': (ty - fy0) + 'px', '--ang': ang + 'deg', '--s': s }, 650); setTimeout(() => spawn('impact', tx, ty, color, { '--s': s * 1.4 }), 420); break; }
      case 'mirror': spawn('mirror', fx0, fy0, color, {}, 1000); break;
      case 'pillar': spawn('pillar', tx, ty, color, { '--s': s }, 900); setTimeout(() => spawn('flameburst', tx, ty, color, { '--s': s }), 250); break;
      case 'blackhole': spawn('blackhole', tx, ty, color, { '--s': s }, 1100); for (let i = 0; i < 8; i++) { const r = 90, t2 = i * 0.785; spawn('mote', tx + Math.cos(t2) * r, ty + Math.sin(t2) * r, color, { '--dx': (-Math.cos(t2) * r) + 'px', '--dy': (-Math.sin(t2) * r) + 'px' }, 600); } break;
      case 'charge': for (let i = 0; i < 4; i++) setTimeout(() => spawn('streak', fx0 + (tx - fx0) * i / 4, fy0 + (ty - fy0) * i / 4, color, { '--ang': ang + 'deg' }, 300), i * 40); setTimeout(() => spawn('impact', tx, ty, color, { '--s': s * 1.2 }), 170); break;
      case 'cyclone': spawn('cyclone', tx, ty, color, { '--s': s }, 700); break;
      case 'aura': spawn('aura', fx0, fy0, F.aura === 'heal' ? '#7fe3a0' : color, {}, 1000); break;
      case 'needle': spawn('needle', tx, ty, color, {}, 500); setTimeout(() => spawn('ring', tx, ty, color, {}, 500), 120); break;
      case 'shockwave': for (let i = 0; i < 3; i++) setTimeout(() => spawn('quake', tx, ty, color, { '--s': s * (1 + i * 0.3) }, 800), i * 110); break;
      case 'barrage': for (let i = 0; i < 8; i++) setTimeout(() => spawn('impact', tx + (Math.random() * 60 - 30), ty + (Math.random() * 60 - 30), color, { '--s': 0.45 }), i * 45); break;
      case 'grip': spawn('grip', tx, ty, color, { '--s': s }, 700); break;
      case 'dive': spawn('meteor', tx, ty, color, { '--s': s }, 700); setTimeout(() => { spawn('quake', tx, ty, color, { '--s': s * 1.4 }, 800); spawn('flameburst', tx, ty, color, { '--s': s }); }, 380); break;
      case 'ender': spawn('ender', tx, ty, color, { '--s': s }, 1200); setTimeout(() => { spawn('impact', tx, ty, '#ffffff', { '--s': 2.2 }); spawn('quake', tx, ty, color, { '--s': 2 }, 900); }, 300); break;
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
      // v0.9.25
      charge: () => { tone(160, t, 0.7, { type: 'triangle', gain: 0.1, glide: 640 }); noise(t, 0.6, { freq: 3000, gain: 0.05, q: 0.6 }); tone(960, t + 0.55, 0.3, { gain: 0.05 }); },
      wind: () => { noise(t, 0.4, { freq: 1600, gain: 0.16, q: 0.4 }); noise(t + 0.1, 0.3, { freq: 3200, gain: 0.08, q: 0.8 }); },
      ice: () => { [2600, 3100, 3700].forEach((f, i) => tone(f, t + 0.3 + i * 0.03, 0.25, { type: 'triangle', gain: 0.05 })); noise(t + 0.3, 0.15, { freq: 6000, gain: 0.2, type: 'highpass' }); },
      chime: () => [76, 79, 83, 88].forEach((n, i) => tone(440 * Math.pow(2, (n - 69) / 12), t + i * 0.08, 0.8, { gain: 0.06 })),
      blades: () => { for (let i = 0; i < 5; i++) noise(t + i * 0.08, 0.07, { freq: 5200, gain: 0.18, type: 'highpass' }); },
      rumble: () => { tone(50, t, 0.6, { gain: 0.35, glide: 70 }); for (let i = 0; i < 4; i++) noise(t + i * 0.05, 0.12, { freq: 400, gain: 0.25, type: 'lowpass' }); },
      chains: () => { for (let i = 0; i < 6; i++) tone(1400 + Math.random() * 900, t + i * 0.05, 0.08, { type: 'square', gain: 0.03 }); },
      roar: () => { tone(90, t, 0.8, { type: 'sawtooth', gain: 0.12, glide: 60 }); noise(t, 0.7, { freq: 500, gain: 0.25, q: 0.5 }); },
      mirror: () => { tone(1200, t, 0.6, { type: 'triangle', gain: 0.06, glide: 2400 }); tone(1800, t + 0.1, 0.5, { gain: 0.04 }); },
      radiance: () => { tone(220, t, 1, { type: 'sawtooth', gain: 0.05, glide: 880 }); noise(t + 0.2, 0.6, { freq: 300, gain: 0.4, type: 'lowpass' }); [72, 79, 84].forEach(n => tone(440 * Math.pow(2, (n - 69) / 12), t + 0.25, 0.8, { gain: 0.04 })); },
      collapse: () => { tone(400, t, 0.9, { type: 'sawtooth', gain: 0.06, glide: 30 }); tone(40, t + 0.5, 0.8, { gain: 0.45 }); noise(t + 0.6, 0.6, { freq: 120, gain: 0.5, type: 'lowpass' }); },
      stampede: () => { for (let i = 0; i < 3; i++) tone(70, t + i * 0.06, 0.08, { gain: 0.3 }); noise(t + 0.18, 0.2, { freq: 400, gain: 0.4, type: 'lowpass' }); },
      whirl: () => { noise(t, 0.35, { freq: 1500, gain: 0.15, q: 1.2 }); noise(t + 0.15, 0.1, { freq: 800, gain: 0.3 }); noise(t + 0.3, 0.1, { freq: 800, gain: 0.3 }); },
      gong: () => { tone(110, t, 1.2, { type: 'triangle', gain: 0.2 }); tone(165, t, 1, { gain: 0.08 }); },
      tick: () => { tone(2400, t, 0.04, { type: 'square', gain: 0.06 }); tone(300, t + 0.05, 0.2, { gain: 0.15, glide: 120 }); },
      stomp: () => { tone(40, t, 0.8, { gain: 0.5, glide: 25 }); noise(t, 0.6, { freq: 120, gain: 0.5, type: 'lowpass' }); },
      barrage: () => { for (let i = 0; i < 8; i++) noise(t + i * 0.045, 0.05, { freq: 700, gain: 0.25, type: 'lowpass' }); },
      breath: () => { noise(t, 0.6, { freq: 900, gain: 0.08, q: 0.3 }); tone(330, t + 0.2, 0.6, { gain: 0.05, glide: 440 }); },
      grip: () => { noise(t, 0.3, { freq: 2000, gain: 0.3, q: 5 }); tone(60, t + 0.1, 0.3, { gain: 0.35 }); },
      dive: () => { tone(1600, t, 0.38, { gain: 0.05, glide: 200 }); noise(t + 0.38, 0.7, { freq: 160, gain: 0.55, type: 'lowpass' }); },
      ender: () => { tone(30, t, 1.4, { gain: 0.5 }); noise(t + 0.3, 1, { freq: 90, gain: 0.6, type: 'lowpass' }); tone(880, t + 0.3, 0.6, { type: 'sawtooth', gain: 0.04, glide: 55 }); },
      boom: () => { noise(t, 0.4, { freq: 200, gain: 0.55, type: 'lowpass' }); tone(55, t, 0.5, { gain: 0.4, glide: 28 }); }, split: () => { noise(t, 0.08, { freq: 7000, gain: 0.3, type: 'highpass' }); tone(1200, t, 0.3, { type: 'sawtooth', gain: 0.04, glide: 200 }); },
    };
    (S[kind] || S.punch)();
  } catch (e) {} });
}
// damage numbers, anchored to the fight window like the effects
export function floatNum(el, text, color) { if (!el) return; fxHost(el); const [x, y] = center(el); const n = spawn('num', x, y - 30, color, {}, 1100); n.textContent = text; n.style.color = color; }
