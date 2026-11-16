// Full-screen ink cinematics: threads of ink descend, a motif draws itself stroke by stroke, sparks twinkle,
// lines of story fade in one by one, then a title with an underline. Click or "Skip" to close. Queued.
import { S } from '../settings.js';
import { sfx } from '../audio/sfx.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 1000, H = 620, CX = 500, CY = 300;
const rnd = (a, b) => a + Math.random() * (b - a);
const P = (x, y) => `${x.toFixed(1)} ${y.toFixed(1)}`;
const polar = (r, a, cx = CX, cy = CY) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];

// ---- motif generators: return { paths: [{d, w, t, dur}], dots: [[x,y]], glyph? }
function threads(n = 7, toR = 120) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const x0 = rnd(60, 940), tx = CX + (x0 - CX) * rnd(0.12, 0.22), ty = CY - toR * rnd(0.6, 1);
    out.push({ d: `M${P(x0, -240)} Q${P((x0 + tx) / 2 + rnd(-40, 40), ty * 0.3)} ${P(tx, ty)}`, w: rnd(1.2, 2.2), t: i * 0.12, dur: rnd(1.1, 1.6) });
  }
  return out;
}
const MOTIFS = {
  enso() {
    const paths = [], dots = [];
    const a0 = rnd(0, 6.28), r = 130; let d = ''; const steps = 60;
    for (let i = 0; i <= steps; i++) { const a = a0 + (i / steps) * 5.9; const rr = r + Math.sin(i * 0.4) * 3; const [x, y] = polar(rr, a); d += (i ? 'L' : 'M') + P(x, y); }
    paths.push({ d, w: 9, t: 1.2, dur: 1.6 });
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; const [x1, y1] = polar(30, a), [x2, y2] = polar(100, a); paths.push({ d: `M${P(x1, y1)}L${P(x2, y2)}`, w: 1.2, t: 2 + i * 0.05, dur: 0.6 }); dots.push(polar(rnd(40, 100), a)); }
    return { paths, dots };
  },
  lotus() {
    const paths = [], dots = [];
    for (const [n, r, off] of [[8, 120, 0], [8, 80, Math.PI / 8], [6, 44, 0]]) for (let i = 0; i < n; i++) {
      const a = off + i / n * 6.283, w = Math.PI / n * 0.9; const tip = polar(r, a), l = polar(r * 0.55, a - w), rr = polar(r * 0.55, a + w);
      paths.push({ d: `M${P(CX, CY)}Q${P(...l)} ${P(...tip)}Q${P(...rr)} ${P(CX, CY)}`, w: r > 100 ? 1.6 : 1.2, t: 1.2 + (120 - r) / 120 + i * 0.06, dur: 0.9 }); dots.push(tip);
    }
    paths.push({ d: `M${P(CX - 14, CY)}a14 14 0 1 0 28 0a14 14 0 1 0 -28 0`, w: 2, t: 2.4, dur: 0.6 });
    return { paths, dots };
  },
  seal() {
    const paths = [], dots = [];
    [130, 98, 66].forEach((r, k) => { const rot = k % 2 ? Math.PI / 4 : 0; let d = ''; for (let i = 0; i <= 4; i++) { const [x, y] = polar(r, rot + i * Math.PI / 2 + Math.PI / 4); d += (i ? 'L' : 'M') + P(x, y); dots.push([x, y]); } paths.push({ d, w: 2.2 - k * 0.4, t: 1.2 + k * 0.35, dur: 1 }); });
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; const [x1, y1] = polar(20, a), [x2, y2] = polar(130 * (i % 2 ? 0.75 : 1), a); paths.push({ d: `M${P(x1, y1)}L${P(x2, y2)}`, w: 1, t: 2.3 + i * 0.05, dur: 0.5 }); }
    return { paths, dots };
  },
  crack() {
    const paths = [], dots = [];
    for (let i = 0; i < 9; i++) {
      let a = i / 9 * 6.283 + rnd(-0.2, 0.2), r = 8, d = `M${P(CX, CY)}`;
      while (r < 150) { r += rnd(14, 26); a += rnd(-0.25, 0.25); const [x, y] = polar(r, a); d += `L${P(x, y)}`; if (Math.random() < 0.25) dots.push([x, y]); }
      paths.push({ d, w: rnd(1.2, 2.6), t: 1.1 + i * 0.07, dur: 0.7 });
    }
    return { paths, dots };
  },
  helix() {
    const paths = [], dots = []; let a = '', b = '';
    for (let i = 0; i <= 60; i++) { const y = CY - 150 + i * 5, s = Math.sin(i * 0.26) * 60; a += (i ? 'L' : 'M') + P(CX + s, y); b += (i ? 'L' : 'M') + P(CX - s, y); if (i % 5 === 2) { paths.push({ d: `M${P(CX + s, y)}L${P(CX - s, y)}`, w: 1, t: 2 + i * 0.015, dur: 0.4 }); dots.push([CX + s, y]); } }
    paths.unshift({ d: a, w: 2.2, t: 1.2, dur: 1.4 }, { d: b, w: 2.2, t: 1.3, dur: 1.4 });
    return { paths, dots };
  },
  sword() {
    const paths = [{ d: `M${P(CX, CY - 170)}L${P(CX + 12, CY - 140)}L${P(CX + 9, CY + 70)}L${P(CX - 9, CY + 70)}L${P(CX - 12, CY - 140)}Z`, w: 2, t: 1.2, dur: 1.2 },
      { d: `M${P(CX - 60, CY + 70)}L${P(CX + 60, CY + 70)}`, w: 3, t: 2, dur: 0.5 }, { d: `M${P(CX, CY + 72)}L${P(CX, CY + 140)}`, w: 5, t: 2.2, dur: 0.4 }];
    const dots = [];
    for (let i = 0; i < 10; i++) { const a = rnd(0, 6.283); const [x1, y1] = polar(rnd(60, 90), a), [x2, y2] = polar(rnd(150, 190), a); paths.push({ d: `M${P(x1, y1)}L${P(x2, y2)}`, w: 1, t: 2.4 + i * 0.04, dur: 0.35 }); dots.push([x2, y2]); }
    return { paths, dots };
  },
  tree() {
    const paths = [], dots = [];
    const grow = (x, y, a, len, depth, t) => {
      if (depth > 6) { dots.push([x, y]); return; }
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      paths.push({ d: `M${P(x, y)}Q${P((x + x2) / 2 + rnd(-8, 8), (y + y2) / 2)} ${P(x2, y2)}`, w: Math.max(0.8, 5 - depth * 0.8), t, dur: 0.45 });
      grow(x2, y2, a - rnd(0.3, 0.55), len * 0.74, depth + 1, t + 0.3);
      if (depth < 5 || Math.random() < 0.6) grow(x2, y2, a + rnd(0.3, 0.55), len * 0.74, depth + 1, t + 0.32);
    };
    grow(CX, CY + 170, -Math.PI / 2, 75, 0, 1.1);
    return { paths, dots };
  },
  mountain() {
    const paths = [], dots = [];
    [[CY + 120, 160, 0], [CY + 80, 120, 0.3], [CY + 40, 90, 0.6]].forEach(([base, hgt, t], k) => {
      let d = `M${P(150, base)}`; for (let x = 150; x <= 850; x += 35) { const y = base - Math.abs(Math.sin((x + k * 90) / 90)) * hgt * rnd(0.6, 1); d += `L${P(x, y)}`; if (Math.random() < 0.15) dots.push([x, y]); }
      paths.push({ d, w: 2 - k * 0.4, t: 1.2 + t, dur: 1.4 });
    });
    paths.push({ d: `M${P(CX + 150, CY - 120)}a36 36 0 1 0 1 0`, w: 2, t: 2.2, dur: 0.8 });
    return { paths, dots };
  },
};
MOTIFS.glyph = MOTIFS.enso;
// a bowed figure's peak under rain (final blows, endings)
MOTIFS.triangle = () => { const paths = [], dots = []; const top = [CX, CY - 150], l = [CX - 230, CY + 220], r = [CX + 230, CY + 220];
  paths.push({ d: `M${P(...l)}L${P(...top)}L${P(...r)}`, w: 2.4, t: 1, dur: 1.6 }, { d: `M${P(CX - 120, CY + 220)}L${P(...top)}L${P(CX + 120, CY + 220)}`, w: 1, t: 1.6, dur: 1.2 });
  for (let i = 0; i < 14; i++) { const x = rnd(120, 880), y = rnd(-40, 300); paths.push({ d: `M${P(x, y)}L${P(x - 6, y + 40)}`, w: 0.8, t: 2 + i * 0.08, dur: 0.4 }); }
  for (let i = 0; i < 8; i++) dots.push([CX + rnd(-140, 140), CY + rnd(40, 200)]); return { paths, dots }; };
// lightning from the sky (Heavenly Tribulations)
MOTIFS.bolt = () => { const paths = [], dots = [];
  for (let k = 0; k < 5; k++) { let x = rnd(200, 800), y = -60, d = `M${P(x, y)}`; while (y < CY + 160) { x += rnd(-40, 40); y += rnd(30, 60); d += `L${P(x, y)}`; if (Math.random() < 0.2) dots.push([x, y]); } paths.push({ d, w: k ? 1.4 : 3, t: 0.8 + k * 0.35, dur: 0.5 }); }
  paths.push({ d: `M${P(CX - 300, CY + 170)}Q${P(CX, CY + 120)} ${P(CX + 300, CY + 170)}`, w: 1.4, t: 2.4, dur: 0.8 }); return { paths, dots }; };

const queue = []; let busy = false;
export function cinematic(o) {
  if (S().cinematics === false || !S().fxOn) { if (o.sound !== false) sfx(o.sound || 'milestone'); return Promise.resolve(); }
  return new Promise(res => { queue.push({ o, res }); if (!busy) next(); });
}
function next() {
  const it = queue.shift(); if (!it) { busy = false; return; }
  busy = true; play(it.o).then(() => { it.res(); setTimeout(next, 150); });
}
function play(o) {
  return new Promise(done => {
    const fast = S().reduceMotion ? 0.35 : 1 / (S().animSpeed || 1);
    const color = o.color || '#ff4f4f';
    const m = (MOTIFS[o.motif] || MOTIFS.enso)();
    const all = [...threads(o.threads ?? 7), ...m.paths];
    const root = document.createElement('div'); root.className = 'cine'; root.style.setProperty('--c', color);
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    for (const p of all) {
      const el = document.createElementNS(NS, 'path'); el.setAttribute('d', p.d); el.setAttribute('pathLength', '1');
      el.setAttribute('stroke-width', p.w); el.style.animationDelay = (p.t * fast) + 's'; el.style.animationDuration = (p.dur * fast) + 's'; svg.append(el);
    }
    m.dots.slice(0, 26).forEach(([x, y], i) => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', rnd(1.6, 3)); c.style.animationDelay = ((2.6 + i * 0.07) * fast) + 's'; svg.append(c); });
    if (o.glyph) { const t = document.createElementNS(NS, 'text'); t.setAttribute('x', CX); t.setAttribute('y', CY + 38); t.setAttribute('class', 'cine-glyph'); t.textContent = o.glyph; t.style.animationDelay = (1.8 * fast) + 's'; svg.append(t); }
    const center = document.createElementNS(NS, 'circle'); center.setAttribute('cx', CX); center.setAttribute('cy', CY); center.setAttribute('r', 5); center.setAttribute('class', 'cine-core'); center.style.animationDelay = (2.4 * fast) + 's'; svg.append(center);
    const text = document.createElement('div'); text.className = 'cine-text';
    const lines = (o.lines || []).filter(Boolean);
    const lineEls = lines.map(l => { const p = document.createElement('p'); p.textContent = l; text.append(p); return p; });
    const title = document.createElement('div'); title.className = 'cine-title';
    if (o.sub) { const s = document.createElement('small'); s.textContent = o.sub; title.append(s); }
    const tt = document.createElement('span'); tt.textContent = o.title || ''; title.append(tt, document.createElement('i'));
    const skip = document.createElement('button'); skip.className = 'cine-skip'; skip.textContent = 'Skip';
    root.append(svg, text, title, skip); document.body.append(root);
    requestAnimationFrame(() => root.classList.add('on'));
    sfx(o.introSound || 'action');
    const timers = []; const at = (s, f) => timers.push(setTimeout(f, s * 1000 * fast));
    const t0 = 3.0; lineEls.forEach((p, i) => at(t0 + i * 1.5, () => { lineEls.forEach(q => q.classList.remove('now')); p.classList.add('in', 'now'); }));
    const tTitle = t0 + lines.length * 1.5 + 0.3;
    at(tTitle, () => { text.classList.add('dim'); title.classList.add('in'); root.classList.add('pulse'); sfx(o.sound || 'trait'); });
    let closed = false;
    const close = () => { if (closed) return; closed = true; timers.forEach(clearTimeout); root.classList.add('out'); setTimeout(() => { root.remove(); done(); }, 600); };
    at(tTitle + (o.hold || 2.6), close);
    skip.onclick = e => { e.stopPropagation(); close(); };
    root.onclick = () => { if (title.classList.contains('in')) close(); };
  });
}
