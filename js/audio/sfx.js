// Synthesized UI sound effects (Web Audio, no files). Shared AudioContext + mixer buses.
let ctx = null; export const bus = {};
export function audio() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    bus.master = ctx.createGain(); bus.master.connect(ctx.destination);
    bus.sfx = ctx.createGain(); bus.sfx.connect(bus.master);
    bus.music = ctx.createGain(); bus.music.connect(bus.master);
    setVolumes(window.__vol || { master: 0.8, sfx: 0.7, music: 0.5 });
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
export function setVolumes(v) {
  window.__vol = v; if (!ctx) return;
  bus.master.gain.value = v.master; bus.sfx.gain.value = v.sfx; bus.music.gain.value = v.music;
}
function tone(freq, t, dur, { type = 'sine', gain = 0.2, attack = 0.005, glide = null, out = bus.sfx } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t); if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.02);
}
function noise(t, dur, { gain = 0.2, freq = 1200, q = 1, type = 'bandpass', out = bus.sfx } = {}) {
  const len = Math.ceil(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = buf; f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(out); s.start(t);
}
export { tone, noise };

const N = n => 440 * Math.pow(2, (n - 69) / 12);
const SOUNDS = {
  click: t => tone(1400, t, 0.05, { type: 'triangle', gain: 0.08 }),
  hover: t => tone(2200, t, 0.03, { gain: 0.02 }),
  action: t => { tone(N(76), t, 0.18, { type: 'triangle', gain: 0.12 }); tone(N(83), t + 0.07, 0.22, { type: 'triangle', gain: 0.1 }); },
  ageup: t => [72, 76, 79, 84].forEach((n, i) => tone(N(n), t + i * 0.06, 0.35, { type: 'triangle', gain: 0.11 })),
  milestone: t => [72, 76, 79].forEach(n => tone(N(n), t, 0.7, { type: 'sine', gain: 0.1 })),
  coin: t => { tone(N(88), t, 0.08, { type: 'square', gain: 0.05 }); tone(N(93), t + 0.07, 0.25, { type: 'square', gain: 0.05 }); },
  breakthrough: t => { tone(120, t, 1.2, { type: 'sawtooth', gain: 0.08, glide: 900 }); noise(t, 1.0, { freq: 3000, gain: 0.08, q: 0.5 }); [60, 67, 72, 76, 79].forEach((n, i) => tone(N(n + 12), t + 0.5 + i * 0.05, 1.4, { type: 'triangle', gain: 0.08 })); },
  trait: t => [84, 88, 91, 96].forEach((n, i) => tone(N(n), t + i * 0.05, 0.4, { type: 'sine', gain: 0.07 })),
  glitch: t => { for (let i = 0; i < 8; i++) tone(200 + Math.random() * 2000, t + i * 0.03, 0.03, { type: 'square', gain: 0.05 }); },
  death: t => [64, 60, 57, 52].forEach((n, i) => tone(N(n - 12), t + i * 0.28, 0.8, { type: 'triangle', gain: 0.12 })),
  fail: t => { tone(180, t, 0.25, { type: 'sawtooth', gain: 0.07, glide: 90 }); },
  hit: t => { noise(t, 0.12, { freq: 400, gain: 0.35, q: 0.8, type: 'lowpass' }); tone(110, t, 0.12, { gain: 0.25, glide: 50 }); },
  crit: t => { noise(t, 0.2, { freq: 800, gain: 0.4 }); tone(220, t, 0.2, { type: 'square', gain: 0.1, glide: 60 }); },
  miss: t => noise(t, 0.18, { freq: 2500, gain: 0.08, q: 3 }),
  qi: t => { tone(N(81), t, 0.5, { gain: 0.07, glide: N(93) }); noise(t, 0.4, { freq: 5000, gain: 0.04 }); },
  win: t => [67, 72, 76, 79, 84].forEach((n, i) => tone(N(n), t + i * 0.08, 0.5, { type: 'square', gain: 0.05 })),
  lose: t => [67, 63, 60].forEach((n, i) => tone(N(n), t + i * 0.15, 0.5, { type: 'triangle', gain: 0.09 })),
};
export function sfx(name) { try { const c = audio(); SOUNDS[name]?.(c.currentTime + 0.005); } catch (e) {} }
