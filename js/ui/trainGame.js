// v0.9.8 Training micro-minigames: 3–5 seconds each, keyboard or tap. Resolve a score 0..1, or null when skipped
// (Skip = Quick Train). diff 0.45..1: higher = harder (narrower zones, faster). Mastery lowers it, never to zero.
import { h } from './dom.js';
import { fx } from './fx.js';

const INFO = {
  timing: { title: 'Clean form', how: 'Tap (or press Space) when the marker is in the gold zone. 3 reps.' },
  pace:   { title: 'Find your pace', how: 'Tap (or Space) as the marker crosses the gold zone. 3 strides.' },
  breath: { title: 'Breathe with the Qi', how: 'Tap (or Space) when the pulsing ring lines up with the gold circle. 3 breaths.' },
  react:  { title: 'Read the strike', how: 'Press the matching arrow (or tap it) before the strike lands. 4 strikes.' },
  focus:  { title: 'Hold your focus', how: 'Hold the mouse/Space to lift the marker; let go to drop it. Keep it in the gold band.' },
  heat:   { title: 'Control the flame', how: 'Hold to stoke the furnace, let go to cool it. Keep the heat in the gold band.' },
};

export function playTrain(kind, diff = 1, title) {
  return new Promise(resolve => {
    const I = INFO[kind] || INFO.timing;
    const stage = h('div', { class: 'tg-stage tg-' + kind }), info = h('div', { class: 'tg-info' }, I.how), res = h('div', { class: 'tg-res' });
    const skip = h('button', { class: 'btn ghost mini', onclick: () => done(null) }, 'Quick train (skip)');
    const root = h('div', { class: 'tg-wrap' }, h('div', { class: 'tg-box' }, h('div', { class: 'tg-head' }, h('b', {}, title || I.title), skip), info, stage, res));
    document.body.append(root); requestAnimationFrame(() => root.classList.add('on'));
    let finished = false, raf, cleanup = [];
    const on = (t, ev, f, o) => { t.addEventListener(ev, f, o); cleanup.push(() => t.removeEventListener(ev, f, o)); };
    function done(score) {
      if (finished) return; finished = true; cancelAnimationFrame(raf); cleanup.forEach(f => f());
      if (score != null) { res.textContent = score >= 0.85 ? 'Perfect!' : score >= 0.6 ? 'Good' : score >= 0.35 ? 'Okay' : 'Off'; res.className = 'tg-res show ' + (score >= 0.6 ? 'good' : score >= 0.35 ? '' : 'bad'); }
      setTimeout(() => { root.classList.remove('on'); setTimeout(() => root.remove(), 200); resolve(score); }, score == null ? 0 : 650);
    }
    const flash = (good) => { stage.classList.remove('hit', 'miss'); void stage.offsetWidth; stage.classList.add(good ? 'hit' : 'miss'); fx(good ? 'click' : 'miss'); };

    if (kind === 'timing' || kind === 'pace' || kind === 'breath') {
      const zone = 0.1 + (1 - diff) * 0.22, speed = 0.55 + diff * 0.75, reps = 3; let n = 0, t = Math.random() * 3, scores = [];
      let center = 0.5 + (Math.random() - 0.5) * 0.4;
      const track = h('div', { class: 'tg-track' }), z = h('i', { class: 'tg-zone' }), mk = h('i', { class: 'tg-mark' }), ring = h('i', { class: 'tg-ring' }), target = h('i', { class: 'tg-target' }), dots = h('div', { class: 'tg-dots' });
      if (kind === 'breath') stage.append(target, ring, dots); else { track.append(z, mk); stage.append(track, dots); }
      const pos = () => kind === 'pace' ? (t * speed * 0.5) % 1 : 0.5 + 0.5 * Math.sin(t * speed * Math.PI);
      const place = () => { if (kind === 'breath') { target.style.setProperty('--s', 0.25 + center * 0.7); target.style.setProperty('--w', zone); } else { z.style.left = (center - zone / 2) * 100 + '%'; z.style.width = zone * 100 + '%'; } };
      place();
      const tap = () => { if (finished) return; const p = pos(), err = Math.abs(p - center), sc = clamp01(1 - err / (zone * 1.6));
        scores.push(sc); flash(sc >= 0.4); dots.append(h('span', { class: sc >= 0.75 ? 'g' : sc >= 0.4 ? 'o' : 'b' })); n++;
        if (n >= reps) return done(scores.reduce((a, b) => a + b, 0) / reps);
        center = 0.5 + (Math.random() - 0.5) * 0.5; place(); };
      on(stage, 'pointerdown', e => { e.preventDefault(); tap(); }); on(window, 'keydown', e => { if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); tap(); } });
      let last = performance.now();
      const loop = now => { t += (now - last) / 1000; last = now; const p = pos(); if (kind === 'breath') ring.style.setProperty('--s', 0.25 + p * 0.7); else mk.style.left = p * 100 + '%'; if (t > 30) return done(0.2); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    }
    if (kind === 'react') {
      const ARR = [['ArrowLeft', '←'], ['ArrowUp', '↑'], ['ArrowRight', '→'], ['ArrowDown', '↓']], total = 4, win = 1.25 - diff * 0.5;
      let i = 0, sc = 0, cur = null, timer = null;
      const big = h('div', { class: 'tg-arrow' }), pads = h('div', { class: 'tg-pads' }, ARR.map(([k, g]) => h('button', { class: 'tg-pad', onpointerdown: e => { e.preventDefault(); hit(k); } }, g)));
      const bar = h('div', { class: 'tg-timer' }, h('i'));
      stage.append(big, bar, pads);
      const next = () => { if (i >= total) return done(sc / total); cur = ARR[Math.floor(Math.random() * 4)]; big.textContent = cur[1]; big.classList.remove('pop'); void big.offsetWidth; big.classList.add('pop');
        bar.firstChild.style.transition = 'none'; bar.firstChild.style.width = '100%'; void bar.offsetWidth; bar.firstChild.style.transition = `width ${win}s linear`; bar.firstChild.style.width = '0%';
        const t0 = performance.now(); cur.t0 = t0; clearTimeout(timer); timer = setTimeout(() => { flash(false); i++; next(); }, win * 1000); };
      const hit = k => { if (finished || !cur) return; clearTimeout(timer); const ok = k === cur[0]; const speedBonus = ok ? clamp01(1 - (performance.now() - cur.t0) / (win * 1000)) : 0; sc += ok ? 0.7 + 0.3 * speedBonus : 0; flash(ok); i++; cur = null; setTimeout(next, 220); };
      on(window, 'keydown', e => { if (e.key.startsWith('Arrow')) { e.preventDefault(); hit(e.key); } });
      cleanup.push(() => clearTimeout(timer)); setTimeout(next, 450);
    }
    if (kind === 'focus' || kind === 'heat') {
      const dur = 3.6, band = 0.16 + (1 - diff) * 0.16; let y = 0.2, v = 0, held = false, t = 0, inside = 0, bc = 0.5;
      const col = h('div', { class: 'tg-col' }), b = h('i', { class: 'tg-band' }), mk = h('i', { class: 'tg-dot' }), prog = h('div', { class: 'tg-timer' }, h('i'));
      col.append(b, mk); stage.append(col, prog);
      on(stage, 'pointerdown', e => { e.preventDefault(); held = true; }); on(window, 'pointerup', () => { held = false; });
      on(window, 'keydown', e => { if (e.code === 'Space') { e.preventDefault(); held = true; } }); on(window, 'keyup', e => { if (e.code === 'Space') held = false; });
      let last = performance.now();
      const loop = now => { const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
        bc = 0.5 + Math.sin(t * (0.9 + diff * 0.9)) * 0.28; // the band drifts
        v += (held ? 1.9 : -1.6) * dt * (0.8 + diff * 0.4); v *= 0.92; y = clamp01(y + v * dt * 3);
        if (Math.abs(y - bc) < band / 2) inside += dt;
        b.style.bottom = (bc - band / 2) * 100 + '%'; b.style.height = band * 100 + '%'; mk.style.bottom = y * 100 + '%'; mk.classList.toggle('in', Math.abs(y - bc) < band / 2);
        prog.firstChild.style.width = Math.max(0, 1 - t / dur) * 100 + '%';
        if (t >= dur) return done(clamp01(inside / dur * 1.15)); raf = requestAnimationFrame(loop); };
      raf = requestAnimationFrame(loop);
    }
  });
}
const clamp01 = v => Math.max(0, Math.min(1, v));
