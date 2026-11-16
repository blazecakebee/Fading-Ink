// Original generative background music (Web Audio). Every station composes itself from scales and
// chord progressions at runtime, so nothing here is a copy of an existing song. Each station aims for a
// general *mood* (dusty frontier, neon night, lo-fi tape, quirky toy-box, rainy guitar, mountain sect).
// Players can also load their own audio files ("Your Music") — those stay on their device.
import { audio, bus, tone, noise } from './sfx.js';

const N = n => 440 * Math.pow(2, (n - 69) / 12);
let timer = null, step = 0, nextTime = 0, current = null, verb = null, delay = null, hiss = null;
const fileAudio = new Audio(); fileAudio.loop = false; let playlist = [], plIndex = 0, fileNode = null;

function fx() {
  const ctx = audio();
  if (!verb) {
    verb = ctx.createConvolver(); const len = ctx.sampleRate * 2.6, b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
    verb.buffer = b; const vg = ctx.createGain(); vg.gain.value = 0.35; verb.connect(vg).connect(bus.music);
    delay = ctx.createDelay(1.5); const fb = ctx.createGain(); fb.gain.value = 0.32; const dg = ctx.createGain(); dg.gain.value = 0.25;
    delay.connect(fb).connect(delay); delay.connect(dg).connect(bus.music);
  }
}
// voice helpers routed to music bus (+ optional reverb/delay sends)
function v(freq, t, dur, o = {}) {
  const ctx = audio(); const osc = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
  osc.type = o.type || 'triangle'; osc.frequency.value = freq; if (o.detune) osc.detune.value = o.detune;
  if (o.vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = o.vib; lg.gain.value = o.vibAmt || 6; l.connect(lg).connect(osc.detune); l.start(t); l.stop(t + dur + 0.1); }
  f.type = 'lowpass'; f.frequency.setValueAtTime(o.cut || 3000, t); if (o.cutEnd) f.frequency.exponentialRampToValueAtTime(o.cutEnd, t + dur);
  const a = o.attack ?? 0.005, gain = o.gain ?? 0.1;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + a);
  if (o.sustain) { g.gain.setValueAtTime(gain, t + dur - 0.1); g.gain.linearRampToValueAtTime(0.0001, t + dur); } else g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(f).connect(g); g.connect(bus.music); if (o.verb) g.connect(verb); if (o.delay) g.connect(delay);
  osc.start(t); osc.stop(t + dur + 0.05);
}
const kick = t => { const ctx = audio(); const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.connect(g).connect(bus.music); o.start(t); o.stop(t + 0.32); };
const snare = (t, gn = 0.12) => noise(t, 0.16, { freq: 1800, gain: gn, q: 0.7, out: bus.music });
const hat = (t, gn = 0.04) => noise(t, 0.04, { freq: 8000, gain: gn, q: 1, type: 'highpass', out: bus.music });
const pick = a => a[Math.floor(Math.random() * a.length)];

// scales relative to root
const PENTA_MAJ = [0, 2, 4, 7, 9], PENTA_MIN = [0, 3, 5, 7, 10], MINOR = [0, 2, 3, 5, 7, 8, 10], DORIAN = [0, 2, 3, 5, 7, 9, 10], MAJOR = [0, 2, 4, 5, 7, 9, 11];
const chordNotes = (root, q) => ({ maj: [0, 4, 7], min: [0, 3, 7], maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], sus: [0, 5, 7], add9: [0, 4, 7, 14] }[q]).map(i => root + i);
let melodyPos = 0;
const walk = (scale, root, range = 7) => { melodyPos = Math.max(0, Math.min(range * 2, melodyPos + pick([-2, -1, -1, 0, 1, 1, 2, 3, -3]))); const o = Math.floor(melodyPos / scale.length); return root + 12 * o + scale[melodyPos % scale.length]; };

// Each station: bpm, steps per bar (16ths), progression [root midi, quality], and play(step, t, s) where s = seconds per step.
export const STATIONS = {
  // v0.8.5 the game's first real soundtrack (an audio file, not generated)
  forgive: { name: 'Forgive (OST)', mood: 'The Fading Ink theme', file: 'assets/music/forgive.mp3', ost: true },
  frontier: { name: 'Frontier Dusk', mood: 'Lonely acoustic plucks under a wide sky', bpm: 76, prog: [[50, 'maj'], [55, 'maj'], [57, 'sus'], [50, 'maj']],
    play(st, t, s, ch) { const i = st % 16; const notes = chordNotes(ch[0], ch[1]);
      if ([0, 3, 6, 8, 11, 14].includes(i)) v(N(notes[(i / 3 | 0) % notes.length] + 12), t, s * 6, { type: 'triangle', gain: 0.07, cut: 2200, cutEnd: 600, verb: 1 });
      if (i === 0) v(N(ch[0] - 12), t, s * 15, { type: 'sine', gain: 0.08, verb: 1 });
      if (i % 4 === 2 && Math.random() < 0.35) v(N(walk(PENTA_MAJ, ch[0] + 12)), t, s * 4, { type: 'sine', gain: 0.05, delay: 1, verb: 1, vib: 5 }); } },
  neon: { name: 'Neon Rain', mood: 'Synthwave night drive, pulsing bass', bpm: 104, prog: [[45, 'min'], [41, 'maj'], [48, 'maj'], [43, 'maj']],
    play(st, t, s, ch) { const i = st % 16; const notes = chordNotes(ch[0], ch[1]);
      v(N(ch[0] - 12 + (i % 2 ? 12 : 0)), t, s * 0.9, { type: 'sawtooth', gain: 0.06, cut: 900 });
      if (i % 4 === 0) kick(t); if (i === 4 || i === 12) snare(t); if (i % 2 === 1) hat(t);
      v(N(notes[i % 3] + 24), t, s * 0.8, { type: 'square', gain: 0.025, cut: 2500, delay: 1 });
      if (i === 0) notes.forEach(n => v(N(n + 12), t, s * 16, { type: 'sawtooth', gain: 0.025, cut: 1400, attack: 0.4, sustain: 1, detune: 8, verb: 1 }));
      if ((i === 0 || i === 6 || i === 10) && Math.random() < 0.6) v(N(walk(PENTA_MIN, ch[0] + 24)), t, s * 3, { type: 'square', gain: 0.03, cut: 3200, delay: 1, vib: 6 }); } },
  tape: { name: 'Faded Tape', mood: 'Warm, wobbly lo-fi chords and soft hiss', bpm: 72, prog: [[53, 'maj7'], [52, 'min7'], [50, 'min7'], [55, 'add9']], hiss: true,
    play(st, t, s, ch) { const i = st % 16; const notes = chordNotes(ch[0], ch[1]);
      if (i === 0 || i === 10) notes.forEach((n, k) => v(N(n), t + k * 0.02, s * 9, { type: 'triangle', gain: 0.045, cut: 1500, attack: 0.03, vib: 0.7, vibAmt: 14 }));
      if (i === 0 || i === 7 || i === 10) kick(t); if (i === 4 || i === 12) snare(t, 0.06); if (i % 2 === 0) hat(t, 0.02);
      if (i % 4 === 2 && Math.random() < 0.4) v(N(walk(MAJOR, ch[0] + 12)), t, s * 3, { type: 'sine', gain: 0.05, vib: 0.8, vibAmt: 18, verb: 1 }); } },
  toybox: { name: 'Toy Box', mood: 'Quirky, bouncy, a little off-kilter', bpm: 118, prog: [[60, 'maj'], [65, 'maj'], [62, 'min'], [67, 'maj']],
    play(st, t, s, ch) { const i = st % 16;
      if (i % 4 === 0) v(N(ch[0] - 12), t, s * 1.5, { type: 'square', gain: 0.05, cut: 800 }); if (i % 4 === 2) v(N(ch[0] - 5), t, s * 1.5, { type: 'square', gain: 0.04, cut: 800 });
      if (i % 2 === 0 && Math.random() < 0.7) v(N(walk(MAJOR, ch[0]) + (Math.random() < 0.08 ? 1 : 0)), t, s * 1.2, { type: 'square', gain: 0.035, cut: 2600 });
      if (i % 8 === 4) noise(t, 0.05, { freq: 3000, gain: 0.06, q: 6, out: bus.music }); if (i === 14 && Math.random() < 0.5) v(N(ch[0] + 24), t, s, { type: 'sine', gain: 0.05 }); } },
  rain: { name: 'Rainy Window', mood: 'Melancholy clean-guitar arpeggios', bpm: 66, prog: [[52, 'min'], [48, 'maj7'], [55, 'maj'], [50, 'add9']], hiss: true,
    play(st, t, s, ch) { const i = st % 12; const notes = chordNotes(ch[0], ch[1]); const arp = [0, 1, 2, 3, 2, 1];
      if (i % 2 === 0) v(N(notes[arp[(i / 2) % 6] % notes.length] + 12), t, s * 5, { type: 'triangle', gain: 0.06, cut: 2600, cutEnd: 900, delay: 1, verb: 1 });
      if (i === 0) v(N(ch[0] - 12), t, s * 11, { type: 'sine', gain: 0.07 });
      if (i === 6 && Math.random() < 0.5) v(N(walk(MINOR, ch[0] + 24)), t, s * 5, { type: 'sine', gain: 0.04, verb: 1, delay: 1 }); }, steps: 12 },
  sect: { name: 'Mountain Sect', mood: 'Plucked zither, pentatonic, mist and incense', bpm: 62, prog: [[50, 'sus'], [55, 'sus'], [52, 'min'], [50, 'sus']],
    play(st, t, s, ch) { const i = st % 16;
      if (i % 2 === 0 && Math.random() < 0.65) { const n = walk(PENTA_MIN, ch[0] + 12); v(N(n), t, s * 6, { type: 'triangle', gain: 0.07, cut: 3500, cutEnd: 700, verb: 1, delay: 1 }); if (Math.random() < 0.2) v(N(n), t + s * 0.5, s * 3, { type: 'triangle', gain: 0.03, cut: 2000, verb: 1 }); }
      if (i === 0) [0, 7].forEach(k => v(N(ch[0] - 12 + k), t, s * 16, { type: 'sine', gain: 0.05, attack: 1.5, sustain: 1, verb: 1 }));
      if (i === 8 && Math.random() < 0.3) noise(t, 0.6, { freq: 400, gain: 0.05, q: 8, out: bus.music }); } },
  menu: { name: 'Fading Ink (Menu Theme)', mood: 'Gentle rainy-night guitar with a slow, wistful melody', bpm: 84, prog: [[52, 'add9'], [48, 'maj7'], [55, 'maj'], [50, 'sus']], hiss: true, menuOnly: true,
    play(st, t, s, ch) { const i = st % 16; const notes = chordNotes(ch[0], ch[1]);
      if (i % 2 === 0) v(N(notes[(i / 2) % notes.length] + 12), t, s * 6, { type: 'triangle', gain: 0.055, cut: 2400, cutEnd: 800, delay: 1, verb: 1 });
      if (i === 0) { v(N(ch[0] - 12), t, s * 15, { type: 'sine', gain: 0.07 }); notes.forEach(n => v(N(n), t, s * 16, { type: 'sine', gain: 0.018, attack: 1.2, sustain: 1, verb: 1 })); }
      if ((i === 3 || i === 7 || i === 11) && Math.random() < 0.6) v(N(walk(PENTA_MAJ, ch[0] + 24)), t, s * 4, { type: 'sine', gain: 0.045, vib: 5, vibAmt: 8, delay: 1, verb: 1 });
      if (i === 8 && Math.random() < 0.4) noise(t, 0.05, { freq: 6000, gain: 0.015, q: 1, type: 'highpass', out: bus.music }); } },
  koi: { name: 'Koi Pond', mood: 'Slow koto plucks over still water', bpm: 58, prog: [[55, 'maj'], [52, 'min'], [50, 'sus'], [53, 'maj7']],
    play(st, t, s, ch) { const i = st % 16;
      if ([0, 3, 5, 8, 11, 13].includes(i) && Math.random() < 0.8) v(N(walk(PENTA_MAJ, ch[0] + 12)), t, s * 7, { type: 'triangle', gain: 0.065, cut: 3200, cutEnd: 500, verb: 1, delay: 1 });
      if (i === 0) v(N(ch[0] - 12), t, s * 16, { type: 'sine', gain: 0.07, attack: 0.8, sustain: 1, verb: 1 });
      if (i === 6 && Math.random() < 0.25) noise(t, 0.4, { freq: 700, gain: 0.03, q: 3, out: bus.music }); } },
  lantern: { name: 'Lantern Festival', mood: 'Bright, bouncing festival melody', bpm: 112, prog: [[60, 'maj'], [57, 'min'], [65, 'maj'], [67, 'maj']],
    play(st, t, s, ch) { const i = st % 16; const notes = chordNotes(ch[0], ch[1]);
      if (i % 4 === 0) kick(t, 0.08); if (i % 4 === 2) hat(t, 0.03); if (i === 12) snare(t, 0.07);
      if (i % 2 === 0) v(N(walk(PENTA_MAJ, ch[0] + 12)), t, s * 1.8, { type: 'sawtooth', gain: 0.03, cut: 2400, vib: 6, vibAmt: 10 });
      if (i % 4 === 1) v(N(notes[(i >> 2) % notes.length]), t, s * 1.4, { type: 'square', gain: 0.025, cut: 1600 }); } },
  dojo: { name: 'Dojo Drums', mood: 'Taiko thunder and a lone flute', bpm: 96, prog: [[50, 'min'], [50, 'min'], [48, 'maj'], [53, 'maj']],
    play(st, t, s, ch) { const i = st % 16;
      if ([0, 6, 8, 11].includes(i)) kick(t, 0.16); if (i === 4 || i === 12) noise(t, 0.12, { freq: 900, gain: 0.08, q: 2, out: bus.music });
      if ((i === 0 || i === 8) && Math.random() < 0.7) v(N(walk(PENTA_MIN, ch[0] + 24)), t, s * 6, { type: 'sine', gain: 0.05, vib: 5, vibAmt: 12, verb: 1, attack: 0.08 }); } },
  starlight: { name: 'Starlit Meditation', mood: 'Shimmering pads and distant bells', bpm: 54, prog: [[48, 'maj7'], [45, 'min7'], [53, 'add9'], [50, 'sus']], hiss: true,
    play(st, t, s, ch) { const i = st % 16; const notes = chordNotes(ch[0], ch[1]);
      if (i === 0) notes.forEach(n => v(N(n + 12), t, s * 16, { type: 'sine', gain: 0.03, attack: 2, sustain: 1, verb: 1 }));
      if (i % 4 === 2 && Math.random() < 0.5) v(N(notes[i % notes.length] + 36), t, s * 8, { type: 'sine', gain: 0.025, delay: 1, verb: 1 }); } },
  citylights: { name: 'City Lights', mood: 'Funky bass and late-night city pop', bpm: 108, prog: [[53, 'maj7'], [52, 'min7'], [50, 'min7'], [55, 'add9']],
    play(st, t, s, ch) { const i = st % 16; const notes = chordNotes(ch[0], ch[1]);
      if ([0, 3, 6, 10, 13].includes(i)) v(N(ch[0] - 12 + (i === 6 ? 7 : i === 13 ? 12 : 0)), t, s * 1.2, { type: 'sawtooth', gain: 0.05, cut: 700 });
      if (i % 4 === 0) kick(t, 0.1); if (i === 4 || i === 12) snare(t, 0.08); if (i % 2 === 1) hat(t, 0.02);
      if (i === 2 || i === 10) notes.forEach(n => v(N(n + 12), t, s * 1.5, { type: 'square', gain: 0.018, cut: 2200 }));
      if ((i === 7 || i === 15) && Math.random() < 0.5) v(N(walk(MAJOR, ch[0] + 24)), t, s * 2, { type: 'triangle', gain: 0.04, delay: 1 }); } },
  shuffle: { name: '🔀 Rotate all songs', mood: 'Moves on to a different song every couple of minutes', shuffle: true },
  battle: { name: 'Clash of Qi', mood: 'Driving drums for fights', bpm: 140, prog: [[45, 'min'], [45, 'min'], [43, 'maj'], [44, 'maj']],
    play(st, t, s, ch) { const i = st % 16;
      if ([0, 3, 6, 8, 10].includes(i)) kick(t); if (i === 4 || i === 12) snare(t, 0.14); hat(t, 0.025);
      v(N(ch[0] - 12 + (i % 4 === 3 ? 7 : 0)), t, s * 0.8, { type: 'sawtooth', gain: 0.05, cut: 700 });
      if (i % 2 === 0) v(N(walk(MINOR, ch[0] + 12)), t, s * 1.6, { type: 'square', gain: 0.03, cut: 2000 }); } },
};

function startHiss() { if (hiss) return; const ctx = audio(); const len = ctx.sampleRate * 2, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.5; hiss = ctx.createBufferSource(); hiss.buffer = b; hiss.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 5000; f.Q.value = 0.4; const g = ctx.createGain(); g.gain.value = 0.012;
  hiss.connect(f).connect(g).connect(bus.music); hiss.start(); }
function stopHiss() { try { hiss?.stop(); } catch (e) {} hiss = null; }

// Rotation: play one station for ~2.5 minutes, then move to a different one
let rotateTimer = null;
const ROTATION = () => Object.entries(STATIONS).filter(([k, x]) => !x.shuffle && !x.menuOnly && k !== 'battle').map(([k]) => k);
export function playStation(id) {
  clearTimeout(rotateTimer);
  if (id === 'shuffle') { const pool = ROTATION().filter(k => k !== lastRot); const k = pool[Math.floor(Math.random() * pool.length)]; lastRot = k; playStation(k); current = 'shuffle'; if (!STATIONS[k].file) rotateTimer = setTimeout(() => { if (current === 'shuffle') playStation('shuffle'); }, 150000); return; } // recorded tracks play to the end
  stopMusic(); if (!id || id === 'off') return;
  if (id === 'files') return playFiles();
  const S = STATIONS[id]; if (!S) return;
  if (S.file) return playOst(id, S);
  const ctx = audio(); fx(); current = id; step = 0; melodyPos = 5; nextTime = ctx.currentTime + 0.1;
  if (S.hiss) startHiss();
  const steps = S.steps || 16;
  timer = setInterval(() => {
    const s = 60 / S.bpm / 4;
    while (nextTime < ctx.currentTime + 0.15) {
      const ch = S.prog[Math.floor(step / steps) % S.prog.length];
      try { S.play(step, nextTime, s, ch); } catch (e) {}
      nextTime += s; step++;
    }
  }, 30);
}
// a recorded track: streams through the music bus (so the volume slider works); in shuffle it moves on when it ends
function playOst(id, S) {
  const ctx = audio(); current = id;
  if (!fileNode) { fileNode = ctx.createMediaElementSource(fileAudio); fileNode.connect(bus.music); }
  fileAudio.src = S.file; fileAudio.currentTime = 0; fileAudio.play().catch(() => {});
  fileAudio.onended = () => { if (current === id) playStation(id); else if (current === 'shuffle') playStation('shuffle'); };
}
export function stopMusic() { clearTimeout(rotateTimer); clearInterval(timer); timer = null; current = null; stopHiss(); fileAudio.pause(); }
let lastRot = null;
export const currentStation = () => current;
export const nowPlaying = () => current === 'shuffle' ? STATIONS[lastRot]?.name : STATIONS[current]?.name;

// ---- player-loaded files (kept in memory only)
export function loadFiles(files) { playlist = [...files].filter(f => f.type.startsWith('audio')).map(f => ({ name: f.name, url: URL.createObjectURL(f) })); plIndex = 0; return playlist.length; }
export const playlistNames = () => playlist.map(p => p.name);
function playFiles() {
  if (!playlist.length) return; const ctx = audio(); current = 'files';
  if (!fileNode) { fileNode = ctx.createMediaElementSource(fileAudio); fileNode.connect(bus.music); }
  fileAudio.src = playlist[plIndex % playlist.length].url; fileAudio.play();
  fileAudio.onended = () => { plIndex++; if (current === 'files') playFiles(); };
}
export function skipTrack() { if (current === 'files') { plIndex++; playFiles(); } else if (current) playStation(current); }
