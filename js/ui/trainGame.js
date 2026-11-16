// v0.9.9 Action minigames: 3–5 seconds each, built for touch first (keyboard works too). No skipping.
// Every action has its own game; only near-identical actions share one (solo/co-op gym, meditation/co-op Qi).
// playTrain(kind, diff, title) → Promise<score 0..1>. diff 0.45..1 (mastery lowers it, never to zero).
import { h } from './dom.js';
import { fx } from './fx.js';

export const GAMES = {
  lift:    { title: 'Clean form',        how: 'Tap when the bar is in the gold zone. 3 reps.' },
  aim:     { title: 'Take the shot',     how: 'Tap the ball as it moves. 3 shots — closer to the centre is better.' },
  stride:  { title: 'Find your stride',  how: 'Tap LEFT and RIGHT alternately, in time with the pulse.' },
  kata:    { title: 'Follow the kata',   how: 'Watch the stances, then repeat them in order.' },
  react:   { title: 'Read the strike',   how: 'Tap the matching direction (or press WASD / arrow keys) before the strike lands. 4 strikes.' },
  breath:  { title: 'Breathe with the Qi', how: 'Tap when the pulsing ring matches the gold circle. 3 breaths.' },
  trace:   { title: 'Trace the meridian', how: 'Tap each acupoint while it glows.' },
  order:   { title: 'Speed reading',     how: 'Tap the numbers in order, 1 to 6, as fast as you can.' },
  focus:   { title: 'Hold your focus',   how: 'Hold anywhere to lift the dot, let go to drop it. Stay in the gold band.' },
  stack:   { title: 'Stack the work',    how: 'Tap to drop each sliding block onto the stack. Line them up.' },
  pour:    { title: 'Pour the mould',    how: 'Hold to pour molten metal, let go at the gold line. 3 moulds.' },
  sneak:   { title: 'Don\'t get seen',   how: 'Hold to creep forward — but only while the eye is closed.' },
  pins:    { title: 'Pick the lock',     how: 'Tap when the lit pin reaches the top. 4 pins.' },
  crowd:   { title: 'Work the crowd',    how: 'Tap the wallets as they pass. Never tap a cop.' },
  glint:   { title: 'Spot the glint',    how: 'Watch where things sparkle, then tap all of those spots.' },
  bite:    { title: 'Wait for the bite', how: 'Tap the moment the float plunges under. Ignore the little twitches.' },
  balance: { title: 'Keep your footing', how: 'The wind pushes you off balance. Tap the side the dot is drifting towards to push it back into the green.' },
};
const clamp01 = v => Math.max(0, Math.min(1, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const wait = ms => new Promise(r => setTimeout(r, ms));

export function playTrain(kind, diff = 1, title) {
  return new Promise(resolve => {
    const I = GAMES[kind] || GAMES.lift;
    const stage = h('div', { class: 'tg-stage tg-' + kind }), res = h('div', { class: 'tg-res' }), prog = h('div', { class: 'tg-prog' });
    const root = h('div', { class: 'tg-wrap' }, h('div', { class: 'tg-box' }, h('div', { class: 'tg-head' }, h('b', {}, title || I.title), prog), h('div', { class: 'tg-info' }, I.how), stage, res));
    root.addEventListener('contextmenu', e => e.preventDefault()); // long-press on phones must not open menus
    document.body.append(root); requestAnimationFrame(() => root.classList.add('on'));
    let finished = false, raf = 0; const cleanup = [];
    const on = (t, ev, f, o) => { t.addEventListener(ev, f, o); cleanup.push(() => t.removeEventListener(ev, f, o)); };
    const later = (f, ms) => { const id = setTimeout(f, ms); cleanup.push(() => clearTimeout(id)); return id; };
    const loop = f => { let last = performance.now(); const step = now => { if (finished) return; const dt = Math.min(0.05, (now - last) / 1000); last = now; if (f(dt) !== false) raf = requestAnimationFrame(step); }; raf = requestAnimationFrame(step); };
    const tapStage = f => { on(stage, 'pointerdown', e => { e.preventDefault(); f(e); }); on(window, 'keydown', e => { if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); f(e); } }); };
    const flash = good => { stage.classList.remove('hit', 'miss'); void stage.offsetWidth; stage.classList.add(good ? 'hit' : 'miss'); fx(good ? 'click' : 'miss'); };
    const pips = (n) => { prog.replaceChildren(...Array.from({ length: n }, () => h('i'))); return (i, good) => { const p = prog.children[i]; if (p) p.className = good >= 0.75 ? 'g' : good >= 0.4 ? 'o' : 'b'; }; };
    const el = (cls, parent = stage, txt) => { const e = txt ? h('div', { class: cls }, txt) : h('div', { class: cls }); parent.append(e); return e; };
    const local = e => { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
    function done(score) {
      if (finished) return; finished = true; cancelAnimationFrame(raf); cleanup.forEach(f => f()); score = clamp01(score);
      res.textContent = score >= 0.85 ? 'Perfect!' : score >= 0.6 ? 'Good' : score >= 0.35 ? 'Okay' : 'Rough'; res.className = 'tg-res show ' + (score >= 0.6 ? 'good' : score >= 0.35 ? '' : 'bad');
      setTimeout(() => { root.classList.remove('on'); setTimeout(() => root.remove(), 200); resolve(score); }, 650);
    }
    const G = GAMEFNS[kind] || GAMEFNS.lift;
    G({ stage, diff, done, on, later, loop, tapStage, flash, pips, el, local, isDone: () => finished });
  });
}

const GAMEFNS = {
  // gym: a power bar swings; tap in the gold zone
  lift({ stage, diff, done, loop, tapStage, flash, pips, el }) {
    const zone = 0.1 + (1 - diff) * 0.22, speed = 0.55 + diff * 0.75, mark = pips(3); let n = 0, t = Math.random() * 3, sc = 0, center = rnd(0.3, 0.7);
    const track = el('tg-track'), z = el('tg-zone', track), mk = el('tg-mark', track);
    const place = () => { z.style.left = (center - zone / 2) * 100 + '%'; z.style.width = zone * 100 + '%'; }; place();
    const pos = () => 0.5 + 0.5 * Math.sin(t * speed * Math.PI);
    tapStage(() => { const s = clamp01(1 - Math.abs(pos() - center) / (zone * 1.6)); sc += s; mark(n, s); flash(s >= 0.4); if (++n >= 3) return done(sc / 3); center = rnd(0.25, 0.75); place(); });
    loop(dt => { t += dt; mk.style.left = pos() * 100 + '%'; });
  },
  // sports: tap a bouncing ball
  aim({ stage, diff, done, on, loop, flash, pips, el, local }) {
    const ball = el('tg-ball', stage, '⚽'), mark = pips(3), r = 0.11 - diff * 0.03; let x = 0.5, y = 0.5, vx = rnd(0.35, 0.55) * (0.7 + diff * 0.6), vy = rnd(0.3, 0.5) * (0.7 + diff * 0.6), n = 0, sc = 0;
    on(stage, 'pointerdown', e => { e.preventDefault(); const [px, py] = local(e); const d = Math.hypot((px - x) * 1.6, py - y); const s = clamp01(1 - d / (r * 2.2)); sc += s; mark(n, s); flash(s > 0.3); vx *= 1.15; vy *= 1.15; if (++n >= 3) done(sc / 3); });
    loop(dt => { x += vx * dt; y += vy * dt; if (x < 0.06 || x > 0.94) vx *= -1; if (y < 0.1 || y > 0.9) vy *= -1; x = Math.max(0.06, Math.min(0.94, x)); y = Math.max(0.1, Math.min(0.9, y)); ball.style.left = x * 100 + '%'; ball.style.top = y * 100 + '%'; });
  },
  // running: alternate left/right taps on the beat
  stride({ stage, diff, done, on, loop, flash, pips, el }) {
    const beat = 0.62 - (1 - diff) * 0.1, steps = 8, mark = pips(steps); let t = 0, n = 0, sc = 0, want = 'L', lastBeat = 0;
    const pulse = el('tg-pulse'), L = h('button', { class: 'tg-foot' }, 'LEFT'), R = h('button', { class: 'tg-foot' }, 'RIGHT'); stage.append(h('div', { class: 'tg-feet' }, L, R));
    const step = side => { if (side !== want) { mark(n, 0); flash(false); } else { const off = Math.abs(((t % beat) + beat / 2) % beat - beat / 2) / (beat / 2); const s = clamp01(1 - off * (0.7 + diff * 0.5)); sc += s; mark(n, s); flash(s >= 0.45); want = want === 'L' ? 'R' : 'L'; }
      L.classList.toggle('next', want === 'L'); R.classList.toggle('next', want === 'R'); if (++n >= steps) done(sc / steps); };
    on(L, 'pointerdown', e => { e.preventDefault(); step('L'); }); on(R, 'pointerdown', e => { e.preventDefault(); step('R'); });
    on(window, 'keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'a') step('L'); if (e.key === 'ArrowRight' || e.key === 'd') step('R'); });
    L.classList.add('next');
    loop(dt => { t += dt; const ph = (t % beat) / beat; pulse.style.transform = `scale(${1.25 - Math.min(ph, 1 - ph) * 0.9})`; pulse.style.opacity = 1 - ph * 0.7; if (t > steps * beat * 2.2) { done(sc / steps); return false; } });
  },
  // martial arts: watch a sequence of stances, repeat it
  async kata({ stage, diff, done, on, flash, pips, isDone }) {
    const ST = ['🐯', '🐍', '🦅', '🐉'], len = diff > 0.75 ? 5 : 4, seq = Array.from({ length: len }, () => Math.floor(Math.random() * 4)), mark = pips(len);
    const btns = ST.map(s => h('button', { class: 'tg-stance', disabled: true }, s)); stage.append(h('div', { class: 'tg-stances' }, btns));
    await wait(450);
    for (const i of seq) { if (isDone()) return; btns[i].classList.add('lit'); fx('click'); await wait(620 - diff * 200); btns[i].classList.remove('lit'); await wait(140); }
    let pos = 0, sc = 0; btns.forEach((b, i) => { b.disabled = false; on(b, 'pointerdown', e => { e.preventDefault(); const ok = i === seq[pos]; sc += ok ? 1 : 0; mark(pos, ok ? 1 : 0); flash(ok); b.classList.add('lit'); setTimeout(() => b.classList.remove('lit'), 140); if (++pos >= len) done(sc / len); }); });
  },
  // fight drills: directional strikes
  react({ stage, diff, done, on, later, flash, pips, el }) {
    const ARR = [['ArrowLeft', '←'], ['ArrowUp', '↑'], ['ArrowRight', '→'], ['ArrowDown', '↓']], total = 4, win = 1.3 - diff * 0.5, mark = pips(total);
    let i = 0, sc = 0, cur = null, timer = null;
    const big = el('tg-arrow'), bar = el('tg-timer'); bar.append(h('i'));
    const KEY = { ArrowLeft: 'A', ArrowUp: 'W', ArrowRight: 'D', ArrowDown: 'S' };
    const pads = h('div', { class: 'tg-pads' }, ARR.map(([k, g]) => { const b = h('button', { class: 'tg-pad' }, g, h('small', { class: 'tg-key' }, KEY[k])); on(b, 'pointerdown', e => { e.preventDefault(); hit(k); }); return b; })); stage.append(pads);
    const next = () => { if (i >= total) return done(sc / total); cur = ARR[Math.floor(Math.random() * 4)]; big.textContent = cur[1]; big.classList.remove('pop'); void big.offsetWidth; big.classList.add('pop');
      const b = bar.firstChild; b.style.transition = 'none'; b.style.width = '100%'; void b.offsetWidth; b.style.transition = `width ${win}s linear`; b.style.width = '0%';
      cur.t0 = performance.now(); clearTimeout(timer); timer = later(() => { mark(i, 0); flash(false); i++; cur = null; next(); }, win * 1000); };
    const hit = k => { if (!cur) return; clearTimeout(timer); const ok = k === cur[0], s = ok ? 0.7 + 0.3 * clamp01(1 - (performance.now() - cur.t0) / (win * 1000)) : 0; sc += s; mark(i, s); flash(ok); i++; cur = null; later(next, 220); };
    const WASD = { w: 'ArrowUp', a: 'ArrowLeft', s: 'ArrowDown', d: 'ArrowRight' };
    on(window, 'keydown', e => { if (e.repeat) return; const k = e.key.startsWith('Arrow') ? e.key : WASD[e.key.toLowerCase()]; if (k) { e.preventDefault(); hit(k); } });
    later(next, 450);
  },
  // meditation: a ring breathes in and out; tap when it matches the gold circle
  breath({ stage, diff, done, loop, tapStage, flash, pips, el }) {
    const zone = 0.1 + (1 - diff) * 0.2, speed = 0.45 + diff * 0.5, mark = pips(3); let t = Math.random() * 2, n = 0, sc = 0, center = rnd(0.35, 0.75);
    const target = el('tg-target'), ring = el('tg-ring');
    const place = () => { target.style.setProperty('--s', 0.25 + center * 0.7); target.style.setProperty('--w', zone); }; place();
    const pos = () => 0.5 + 0.5 * Math.sin(t * speed * Math.PI);
    tapStage(() => { const s = clamp01(1 - Math.abs(pos() - center) / (zone * 1.6)); sc += s; mark(n, s); flash(s >= 0.4); if (++n >= 3) return done(sc / 3); center = rnd(0.3, 0.8); place(); });
    loop(dt => { t += dt; ring.style.setProperty('--s', 0.25 + pos() * 0.7); });
  },
  // meridians: acupoints light up one by one; tap each while lit
  async trace({ stage, diff, done, on, flash, pips, isDone }) {
    const PTS = [[0.5, 0.12], [0.5, 0.32], [0.3, 0.42], [0.7, 0.42], [0.5, 0.55], [0.35, 0.8], [0.65, 0.8]], n = 5, mark = pips(n); let sc = 0;
    const nodes = PTS.map(([x, y]) => { const b = h('button', { class: 'tg-node', style: { left: x * 100 + '%', top: y * 100 + '%' } }); stage.append(b); return b; });
    stage.append(h('div', { class: 'tg-body' }));
    let lit = -1, t0 = 0, got = false;
    nodes.forEach((b, i) => on(b, 'pointerdown', e => { e.preventDefault(); if (i === lit && !got) { got = true; const s = clamp01(1 - (performance.now() - t0) / (1000 * (1.1 - diff * 0.4)) * 0.6); sc += s; b.classList.add('done'); flash(true); } else { flash(false); } }));
    for (let k = 0; k < n; k++) { if (isDone()) return; await wait(250); lit = Math.floor(Math.random() * nodes.length); got = false; t0 = performance.now(); nodes[lit].classList.add('lit'); await wait(1000 * (1.1 - diff * 0.4)); nodes[lit].classList.remove('lit', 'done'); mark(k, got ? 1 : 0); }
    done(sc / n);
  },
  // library: tap 1→6 scattered numbers
  order({ stage, diff, done, on, loop, flash, pips }) {
    const n = 6, mark = pips(n), spots = []; let next = 1, t = 0, errs = 0; const limit = 6 - (1 - diff) * 1.5;
    for (let i = 1; i <= n; i++) { let x, y, k = 0; do { x = rnd(0.1, 0.9); y = rnd(0.15, 0.85); k++; } while (k < 40 && spots.some(([a, b]) => Math.hypot((a - x) * 1.8, b - y) < 0.24)); spots.push([x, y]);
      const b = h('button', { class: 'tg-num', style: { left: x * 100 + '%', top: y * 100 + '%' } }, String(i)); stage.append(b);
      on(b, 'pointerdown', e => { e.preventDefault(); if (i === next) { b.classList.add('done'); mark(next - 1, 1); fx('click'); if (++next > n) done(clamp01(1.15 - t / limit * 0.6 - errs * 0.12)); } else { errs++; flash(false); } }); }
    loop(dt => { t += dt; if (t > limit * 1.6) { done((next - 1) / n * 0.5); return false; } });
  },
  // school study: hold to keep a dot inside a drifting band
  focus({ stage, diff, done, on, loop, el }) {
    const dur = 3.8, band = 0.16 + (1 - diff) * 0.16; let y = 0.2, v = 0, held = false, t = 0, inside = 0;
    const col = el('tg-col'), b = el('tg-band', col), mk = el('tg-dot', col), bar = el('tg-timer'); bar.append(h('i'));
    on(stage, 'pointerdown', e => { e.preventDefault(); held = true; }); on(window, 'pointerup', () => { held = false; }); on(window, 'pointercancel', () => { held = false; });
    on(window, 'keydown', e => { if (e.code === 'Space') { e.preventDefault(); held = true; } }); on(window, 'keyup', e => { if (e.code === 'Space') held = false; });
    loop(dt => { t += dt; const bc = 0.5 + Math.sin(t * (0.9 + diff * 0.9)) * 0.28;
      v += (held ? 1.9 : -1.6) * dt * (0.8 + diff * 0.4); v *= 0.92; y = clamp01(y + v * dt * 3); const ins = Math.abs(y - bc) < band / 2; if (ins) inside += dt;
      b.style.bottom = (bc - band / 2) * 100 + '%'; b.style.height = band * 100 + '%'; mk.style.bottom = y * 100 + '%'; mk.classList.toggle('in', ins); bar.firstChild.style.width = Math.max(0, 1 - t / dur) * 100 + '%';
      if (t >= dur) { done(inside / dur * 1.15); return false; } });
  },
  // working harder: drop sliding blocks onto a stack
  stack({ stage, diff, done, loop, tapStage, flash, pips, el }) {
    const n = 3, mark = pips(n), w0 = 0.42; let k = 0, sc = 0, x = 0, dir = 1, base = 0.29, width = w0, cur = null;
    const tower = []; el('tg-base').style.cssText = `left:${base * 100}%;width:${w0 * 100}%`;
    const spawn = () => { cur = el('tg-block'); cur.style.width = width * 100 + '%'; cur.style.bottom = (18 + (k + 1) * 26) + 'px'; x = dir > 0 ? 0 : 1 - width; };
    spawn();
    tapStage(() => { if (!cur) return; const over = Math.max(0, Math.min(x + width, base + width) - Math.max(x, base)), s = clamp01(over / width * 1.08 - 0.08); sc += s; mark(k, s); flash(s >= 0.5);
      cur.classList.add('set'); if (over > 0.02) { base = Math.max(x, base); width = Math.max(0.12, over); cur.style.left = base * 100 + '%'; cur.style.width = width * 100 + '%'; }
      tower.push(cur); cur = null; if (++k >= n) return done(sc / n); dir *= -1; setTimeout(spawn, 200); });
    loop(dt => { if (!cur) return; x += dir * (0.45 + diff * 0.5) * dt; if (x > 1 - width) { x = 1 - width; dir = -1; } if (x < 0) { x = 0; dir = 1; } cur.style.left = x * 100 + '%'; });
  },
  // crafting: hold to pour molten metal, let go at the line
  pour({ stage, diff, done, on, loop, flash, pips, el }) {
    const n = 3, mark = pips(n); let k = 0, sc = 0, fill = 0, pouring = false, line = rnd(0.55, 0.85), rate = 0.42 + diff * 0.35;
    const mould = el('tg-mould'), metal = el('tg-metal', mould), ln = el('tg-line', mould), stream = el('tg-stream');
    const place = () => { ln.style.bottom = line * 100 + '%'; fill = 0; metal.style.height = '0%'; }; place();
    const stop = () => { if (!pouring) return; pouring = false; stream.classList.remove('on'); const s = clamp01(1 - Math.abs(fill - line) / (0.12 + (1 - diff) * 0.06)); sc += s; mark(k, s); flash(s >= 0.45); if (++k >= n) return done(sc / n); setTimeout(() => { line = rnd(0.45, 0.88); place(); }, 260); };
    on(stage, 'pointerdown', e => { e.preventDefault(); if (k < n) { pouring = true; stream.classList.add('on'); } }); on(window, 'pointerup', stop); on(window, 'pointercancel', stop);
    on(window, 'keydown', e => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); pouring = true; stream.classList.add('on'); } }); on(window, 'keyup', e => { if (e.code === 'Space') stop(); });
    loop(dt => { if (pouring) { fill = Math.min(1, fill + rate * dt * (0.6 + fill)); metal.style.height = fill * 100 + '%'; if (fill >= 1) stop(); } });
  },
  // shoplifting: creep forward only while the eye is shut
  sneak({ stage, diff, done, on, loop, flash, el }) {
    let x = 0, held = false, t = 0, open = false, nextFlip = rnd(0.8, 1.4), seen = 0;
    const eye = el('tg-eye', stage, '😑'), lane = el('tg-lane'), me = el('tg-me', lane, '🧍'), goal = el('tg-goal', lane, '🛒');
    on(stage, 'pointerdown', e => { e.preventDefault(); held = true; }); on(window, 'pointerup', () => { held = false; }); on(window, 'pointercancel', () => { held = false; });
    on(window, 'keydown', e => { if (e.code === 'Space') { e.preventDefault(); held = true; } }); on(window, 'keyup', e => { if (e.code === 'Space') held = false; });
    loop(dt => { t += dt; nextFlip -= dt;
      if (nextFlip <= 0) { open = !open; eye.textContent = open ? '👁️' : '😑'; eye.classList.toggle('open', open); nextFlip = open ? rnd(0.6, 1.1) : rnd(0.5, 1.3) * (1.2 - diff * 0.4); if (open) fx('click'); }
      if (held) { x += dt * 0.46; if (open) { seen += dt; stage.classList.add('miss'); } else stage.classList.remove('miss'); }
      me.style.left = Math.min(1, x) * 88 + '%';
      if (x >= 1) { done(1 - Math.min(1, seen * 1.6) * 0.9 - Math.max(0, t - 5) * 0.08); return false; }
      if (t > 8) { done(x * 0.5 - seen); return false; } });
  },
  // burglary: four pins bob up and down; tap when the lit one is at the top
  pins({ stage, diff, done, loop, tapStage, flash, pips, el }) {
    const n = 4, mark = pips(n); let k = 0, sc = 0, t = 0;
    const P = Array.from({ length: n }, (_, i) => ({ e: el('tg-pin'), sp: (1.6 + i * 0.35) * (0.7 + diff * 0.5), ph: Math.random() * 6 }));
    const cur = () => 0.5 + 0.5 * Math.sin(t * P[k].sp + P[k].ph);
    tapStage(() => { if (k >= n) return; const s = clamp01((cur() - (0.55 + diff * 0.12)) / (0.45 - diff * 0.12)); sc += s; mark(k, s); flash(s >= 0.4); P[k].e.classList.add(s >= 0.4 ? 'set' : 'bent'); if (++k >= n) done(sc / n); });
    loop(dt => { t += dt; P.forEach((p, i) => { const y = i < k ? (p.e.classList.contains('set') ? 1 : 0.2) : 0.5 + 0.5 * Math.sin(t * p.sp + p.ph); p.e.style.setProperty('--y', y); p.e.classList.toggle('lit', i === k); p.e.style.left = (14 + i * 22) + '%'; }); });
  },
  // pickpocketing: wallets and cops stream past; tap wallets, never cops
  crowd({ stage, diff, done, on, loop, flash, el, local }) {
    let t = 0, spawnT = 0.2, got = 0, wallets = 0, cops = 0; const items = [], dur = 4.5;
    const lane = el('tg-street');
    on(stage, 'pointerdown', e => { e.preventDefault(); const [px, py] = local(e); const hit = items.find(it => !it.gone && Math.abs(it.x - px) < 0.09 && Math.abs(py - 0.55) < 0.3);
      if (!hit) return; hit.gone = true; hit.e.classList.add('gone'); if (hit.cop) { cops++; flash(false); } else { got++; flash(true); } });
    loop(dt => { t += dt; spawnT -= dt;
      if (spawnT <= 0 && t < dur - 0.8) { const cop = Math.random() < 0.3 + diff * 0.1; const e = el('tg-walker', lane, cop ? '👮' : '👛'); items.push({ e, x: 1.05, cop }); if (!cop) wallets++; spawnT = rnd(0.35, 0.7) * (1.15 - diff * 0.3); }
      for (const it of items) { it.x -= dt * (0.38 + diff * 0.28); it.e.style.left = it.x * 100 + '%'; }
      if (t >= dur) { done(wallets ? got / wallets - cops * 0.4 : 0.5); return false; } });
  },
  // gathering: sparkles flash in a field; remember and tap every one
  async glint({ stage, diff, done, on, flash, pips }) {
    const N = 12, want = diff > 0.75 ? 4 : 3, mark = pips(want), pick = []; while (pick.length < want) { const r = Math.floor(Math.random() * N); if (!pick.includes(r)) pick.push(r); }
    const tiles = Array.from({ length: N }, () => h('button', { class: 'tg-grass', disabled: true }, '🌿')); stage.append(h('div', { class: 'tg-field' }, tiles));
    await wait(400); for (const i of pick) { tiles[i].classList.add('lit'); fx('click'); await wait(520 - diff * 160); tiles[i].classList.remove('lit'); await wait(90); }
    let found = 0, tries = 0; tiles.forEach((b, i) => { b.disabled = false; b.onpointerdown = e => { e.preventDefault(); if (b.classList.contains('done')) return; tries++; const ok = pick.includes(i); b.classList.add(ok ? 'done' : 'bad'); b.textContent = ok ? '✨' : '🪨'; flash(ok); if (ok) mark(found++, 1); if (found >= want || tries >= want + 1) done(found / want - (tries - found) * 0.1); }; });
  },
  // fishing: ignore the twitches, strike on the real bite
  fishing: null,
  async bite({ stage, diff, done, on, later, flash, el }) {
    const water = el('tg-water'), float = el('tg-float', water, '🔴'); let state = 'wait', t0 = 0, fakes = 0;
    on(stage, 'pointerdown', e => { e.preventDefault(); if (state === 'bite') { state = 'x'; const s = clamp01(1.05 - (performance.now() - t0) / (700 - diff * 250)); float.classList.add('caught'); flash(true); done(s - fakes * 0.15); } else if (state !== 'x') { fakes++; flash(false); float.classList.add('splash'); setTimeout(() => float.classList.remove('splash'), 200); } });
    const twitches = Math.floor(rnd(1, 3.5)); let i = 0;
    const twitch = () => { if (state !== 'wait') return; if (i++ < twitches) { float.classList.add('twitch'); setTimeout(() => float.classList.remove('twitch'), 260); later(twitch, rnd(600, 1100)); } else { state = 'bite'; t0 = performance.now(); float.classList.add('dunk'); fx('click'); later(() => { if (state === 'bite') { state = 'x'; flash(false); done(0.1 - fakes * 0.1); } }, 700 - diff * 250); } };
    later(twitch, rnd(700, 1200));
  },
  // hiking: wind shoves your balance; tap a side to push back
  balance({ stage, diff, done, on, loop, el }) {
    const dur = 4, bar = el('tg-beam'), dot = el('tg-bdot', bar), safe = el('tg-safe', bar), tm = el('tg-timer'); tm.append(h('i'));
    let x = 0, v = 0, t = 0, good = 0, gust = 0; const w = 0.28 + (1 - diff) * 0.14; safe.style.left = (50 - w * 50) + '%'; safe.style.width = w * 100 + '%';
    const push = d => { v += d * 0.75; };
    on(stage, 'pointerdown', e => { e.preventDefault(); const r = stage.getBoundingClientRect(); push(e.clientX < r.left + r.width / 2 ? 1 : -1); });
    on(window, 'keydown', e => { if (e.key === 'ArrowLeft') push(1); if (e.key === 'ArrowRight') push(-1); });
    stage.append(h('div', { class: 'tg-sides' }, h('span', {}, '◀ tap'), h('span', {}, 'tap ▶')));
    loop(dt => { t += dt; gust += (Math.random() - 0.5) * dt * 6 * (0.7 + diff * 0.6); gust *= 0.98; v += gust * dt * 2.2 + x * dt * 1.1 * diff; v *= 0.95; x = Math.max(-1, Math.min(1, x + v * dt));
      if (Math.abs(x) < w) good += dt; dot.style.left = (50 + x * 48) + '%'; dot.classList.toggle('in', Math.abs(x) < w); tm.firstChild.style.width = Math.max(0, 1 - t / dur) * 100 + '%';
      if (t >= dur) { done(good / dur * 1.12); return false; } });
  },
};
delete GAMEFNS.fishing;
