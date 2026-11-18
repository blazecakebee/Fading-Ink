// v0.9.9 Action minigames: 3–5 seconds each, built for touch first (keyboard works too). No skipping.
// Every action has its own game; only near-identical actions share one (solo/co-op gym, meditation/co-op Qi).
// playTrain(kind, diff, title) → Promise<score 0..1>. diff 0.45..1 (mastery lowers it, never to zero).
import { h } from './dom.js';
import { fx } from './fx.js';
import { howTo } from './howTo.js';

export const GAMES = {
  lift:    { title: 'Clean form',        how: 'Tap when the bar is in the gold zone. 3 reps.' },
  aim:     { title: 'Take the shot',     how: 'Tap the ball as it moves. 3 shots — closer to the centre is better.' },
  stride:  { title: 'Find your stride',  how: 'Tap LEFT and RIGHT alternately, in time with the pulse.' },
  kata:    { title: 'Follow the kata',   how: 'Watch the stances, then repeat them in order.' },
  react:   { title: 'Read the strike',   how: 'Tap the matching direction (or press WASD / arrow keys) before the strike lands. 4 strikes.' },
  breath: { title: 'Breathe', how: 'Hold while the circle grows (breathe in). Let go while it shrinks (breathe out).' },
  trace:   { title: 'Trace the meridian', how: 'Tap each acupoint while it glows.' },
  order:   { title: 'Speed reading',     how: 'Tap the numbers in order, 1 to 6, as fast as you can.' },
  focus:   { title: 'Flash cards',       how: 'Is the sum right or wrong? Tap RIGHT or WRONG. 5 cards, faster is better.' },
  stack:   { title: 'Stack the work',    how: 'Tap to drop each sliding block onto the stack. Line them up.' },
  pour:    { title: 'Pour the mould',    how: 'Hold to pour molten metal, let go at the gold line. 3 moulds.' },
  sneak:   { title: 'Don\'t get seen',   how: 'Hold to creep forward — but only while the eye is closed.' },
  pins: { title: 'Pick the lock', how: 'Drag each pin up to the gold shear line and let go right on it. 4 pins.' },
  crowd:   { title: 'Work the crowd',    how: 'Tap the wallets as they pass. Never tap a cop.' },
  glint:   { title: 'Spot the glint',    how: 'Watch where things sparkle, then tap all of those spots.' },
  forge:   { title: 'Strike while hot',  how: 'A ring closes on the glowing spot. Tap the moment it meets it. 5 blows.' },
  stitch:  { title: 'Sew the seam',      how: 'Drag along the zigzag seam from left to right. Stay on the line.' },
  brew:    { title: 'Stir the cauldron', how: 'Stir in circles to keep the needle in the gold band. Too slow it sets, too fast it boils.' },
  gem:     { title: 'Set the gem',       how: 'The gem spins. Tap SET when its point lines up with the gold mark. 4 gems.' },
  bite:    { title: 'Wait for the bite', how: 'Tap the moment the float plunges under. Ignore the little twitches.' },
  // v0.9.13 meditation, one game per cultivation method
  m_turtle: { title: 'Turtle Breath', how: 'Feel the slow rhythm, then keep it going on your own once the pulse fades. Tap on each breath.' },
  m_five: { title: 'Five Elements Cycle', how: 'Answer fast: which element feeds which? Wood → Fire → Earth → Metal → Water → Wood.' },
  m_moon: { title: 'Moonlit Absorption', how: 'Swipe the clouds away from the moon and keep it clear.' },
  m_fire: { title: 'Heart-Fire Refinement', how: 'Stoke the fire: tap as fast as you can before it gutters out.' },
  m_thunder: { title: 'Thunder Body Tempering', how: 'Lightning marks a column before it strikes. Tap another column to step out of the way.' },
  m_lotus:   { title: 'Lotus Heart Sutra',    how: 'Each petal opens slowly. Tap it only once it is fully open — never before.' },
  m_sword: { title: 'Sword Intent', how: 'Swipe one clean cut along the dashed line. 3 cuts — match the angle.' },
  m_star: { title: 'Starfall', how: 'Drag the bowl to catch falling stars.' },
  m_dual: { title: 'Yin and Yang', how: 'A dark or light orb appears. Tap YIN for dark, YANG for light. 6 orbs.' },
  m_void:    { title: 'Void Stillness',       how: 'Press and hold, and do not move at all. Stillness is everything. Ignore what you see.' },
  m_souls: { title: 'Myriad Souls', how: 'Drag the red-eyed vengeful souls into the cauldron. Leave the pale ones alone.' },
  m_blood: { title: 'Blood Sea', how: 'Hold to draw blood-Qi. Let go before the heart bursts — it trembles when you are close. 3 draws.' },
  // v0.9.21 social minigames
  s_mood:   { title: 'Read the room',       how: 'They react to what you say. Tap the reaction that fits their mood. 4 moments.' },
  s_words:  { title: 'Find the words',      how: 'Tap the words in the right order to make a sincere compliment.' },
  s_gift:   { title: 'Choose a gift',       how: 'Think about what they love, then pick the gift that suits them.' },
  s_rope:   { title: 'Skip together',       how: 'Tap to jump each time the rope swings under your feet. Stay in sync.' },
  s_temper: { title: 'Keep your temper',    how: 'They throw words at you. Pick how you answer — fast. Calm and fair wins arguments.' },
  s_nerve:  { title: 'Find your nerve',     how: 'Hold to breathe and calm your heart. Let go to speak — when you are calm AND they are looking at you.' },
  balance: { title: 'Keep your footing', how: 'The wind pushes you off balance. Tap the side the dot is drifting towards to push it back into the green.' },
};
const clamp01 = v => Math.max(0, Math.min(1, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const wait = ms => new Promise(r => setTimeout(r, ms));

const REWORKED = new Set(['breath', 'focus', 'm_dual']); // v0.9.48 show the new instructions once, even if you saw the old ones
// v0.9.24 the first time you meet a game, its instructions come first
export function playTrain(kind, diff = 1, title, ctx = {}) { const hk = GAMES[kind] ? kind : 'lift'; return howTo('tg:' + hk + (REWORKED.has(hk) ? '@2' : ''), { title: (GAMES[kind] || GAMES.lift).title }).then(() => playTrain0(kind, diff, title, ctx)); }
function playTrain0(kind, diff = 1, title, ctx = {}) {
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
    G({ stage, diff, done, on, later, loop, tapStage, flash, pips, el, local, ctx, isDone: () => finished });
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
  // v0.9.48 basic meditation, simplified: breathe with the circle. Hold while it grows, let go while it shrinks.
  breath({ stage, diff, done, on, loop, el }) {
    const dur = 6, period = 2.6 - diff * 0.5, ring = el('tg-lung'), word = el('tg-lungw'), bar = el('tg-timer'); bar.append(h('i'));
    let held = false, t = 0, good = 0;
    on(stage, 'pointerdown', e => { e.preventDefault(); held = true; }); on(window, 'pointerup', () => { held = false; }); on(window, 'pointercancel', () => { held = false; });
    on(window, 'keydown', e => { if (e.code === 'Space') { e.preventDefault(); held = true; } }); on(window, 'keyup', e => { if (e.code === 'Space') held = false; });
    loop(dt => { t += dt; const ph = (t % period) / period, inhale = ph < 0.5, size = inhale ? ph * 2 : 2 - ph * 2;
      ring.style.transform = `scale(${0.35 + size * 0.65})`; word.textContent = inhale ? 'Breathe in… (hold)' : 'Breathe out… (let go)';
      const edge = Math.min(ph, Math.abs(ph - 0.5), 1 - ph) < 0.04; const ok = edge || held === inhale; if (ok) good += dt;
      ring.classList.toggle('in', ok); bar.firstChild.style.width = Math.max(0, 1 - t / dur) * 100 + '%';
      if (t >= dur) { done(good / dur * 1.1); return false; } });
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
  // v0.9.48 studying, simplified: flash cards. Is it right or wrong? 5 cards, quick answers score best.
  async focus({ stage, diff, done, on, flash, pips, isDone }) {
    const n = 5, mark = pips(n), card = h('div', { class: 'tg-card' }), Tb = h('button', { class: 'tg-tf yes' }, '✓\uFE0E Right'), Fb = h('button', { class: 'tg-tf no' }, '✗\uFE0E Wrong');
    stage.append(card, h('div', { class: 'tg-feet' }, Fb, Tb)); let sc = 0, answer = null;
    const ask = () => { const big = diff > 0.7, a = 2 + Math.floor(Math.random() * (big ? 11 : 8)), b = 2 + Math.floor(Math.random() * (big ? 11 : 8)), op = Math.random() < 0.5 ? '+' : '×';
      const real = op === '+' ? a + b : a * b, truth = Math.random() < 0.5, shown = truth ? real : real + (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * (op === '×' ? a : 3)));
      card.textContent = `${a} ${op} ${b} = ${shown}`; return shown === real; };
    function press(v) { if (answer) { const a = answer; answer = null; a(v); } }
    on(Tb, 'pointerdown', e => { e.preventDefault(); press(true); }); on(Fb, 'pointerdown', e => { e.preventDefault(); press(false); });
    on(window, 'keydown', e => { if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'y') press(true); if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'n') press(false); });
    for (let k = 0; k < n; k++) { if (isDone()) return; const truth = ask(), t0 = performance.now(), limit = 3000 - diff * 900;
      const pick = await new Promise(res => { const id = setTimeout(() => { answer = null; res(null); }, limit); answer = v => { clearTimeout(id); res(v); }; });
      const right = pick === truth, s = right ? clamp01(1.15 - (performance.now() - t0) / limit * 0.5) : 0; sc += s; mark(k, right ? s : 0); flash(right); card.textContent = ''; await wait(180); }
    done(sc / n);
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
  // ---- v0.9.54 crafting: each kind of item has its own game
  // weapons: a ring closes on the hot spot; strike as it meets the target. 5 blows.
  forge({ stage, diff, done, on, loop, flash, pips, el, local }) {
    const n = 5, mark = pips(n), blade = el('tg-blade'); let k = 0, sc = 0, t = 0, R = 1, x = 0.5, y = 0.5, spot = null, ring = null, active = false, wait = 0.4;
    const spawn = () => { x = rnd(0.2, 0.8); y = rnd(0.35, 0.6); spot?.remove(); ring?.remove(); spot = el('tg-hot'); ring = el('tg-fring'); spot.style.left = ring.style.left = x * 100 + '%'; spot.style.top = ring.style.top = y * 100 + '%'; R = 1; active = true; };
    const strike = () => { if (!active) return; active = false; const s = clamp01(1 - Math.abs(R - 0.32) / 0.32); sc += s; mark(k, s); flash(s >= 0.45); blade.classList.remove('ping'); void blade.offsetWidth; blade.classList.add('ping'); ring.style.opacity = 0; if (++k >= n) return done(sc / n); wait = 0.35; };
    on(stage, 'pointerdown', e => { e.preventDefault(); strike(); }); on(window, 'keydown', e => { if (e.code === 'Space') { e.preventDefault(); strike(); } });
    loop(dt => { if (!active) { wait -= dt; if (wait <= 0 && k < n) spawn(); return; } R -= dt * (0.55 + diff * 0.45); ring.style.transform = `translate(-50%, -50%) scale(${Math.max(0, R) * 2.6 + 0.3})`;
      if (R <= -0.05) { active = false; mark(k, 0); flash(false); ring.style.opacity = 0; if (++k >= n) { done(sc / n); return false; } wait = 0.35; } });
  },
  // armour: drag along the zigzag seam. Stay on the stitch line from start to finish.
  stitch({ stage, diff, done, on, loop, local }) {
    const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 100 60'); svg.setAttribute('preserveAspectRatio', 'none'); svg.classList.add('tg-seam');
    const pts = Array.from({ length: 7 }, (_, i) => [8 + i * 14, i % 2 ? 18 + rnd(0, 8) : 42 - rnd(0, 8)]);
    const path = document.createElementNS(NS, 'polyline'); path.setAttribute('points', pts.map(p => p.join(',')).join(' ')); svg.append(path);
    const sewn = document.createElementNS(NS, 'polyline'); sewn.classList.add('sewn'); svg.append(sewn); stage.append(svg);
    const tol = 7 + (1 - diff) * 4; let held = false, prog = 0, off = 0, samples = 0, t = 0; const done_pts = [];
    const segDist = (px, py) => { let best = 1e9, bi = 0; for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay, u = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))), qx = ax + u * dx, qy = ay + u * dy, d = Math.hypot(px - qx, py - qy); if (d < best) { best = d; bi = i + u; } } return [best, bi]; };
    const move = e => { if (!held) return; const [lx, ly] = local(e), px = lx * 100, py = ly * 60, [d, along] = segDist(px, py); samples++; if (d > tol) off++; else if (along > prog && along - prog < 0.6) { prog = along; done_pts.push(`${px.toFixed(1)},${py.toFixed(1)}`); sewn.setAttribute('points', done_pts.join(' ')); } };
    on(stage, 'pointerdown', e => { e.preventDefault(); held = true; move(e); }); on(stage, 'pointermove', move); on(window, 'pointerup', () => { held = false; }); on(window, 'pointercancel', () => { held = false; });
    loop(dt => { t += dt; if (prog >= pts.length - 1.15 || t > 7 - diff) { const cover = prog / (pts.length - 1), clean = samples ? 1 - off / samples : 0; done(clamp01(cover * (0.35 + 0.75 * clean))); return false; } });
  },
  // pills: stir the cauldron in steady circles. Too slow and it sets, too fast and it boils over.
  brew({ stage, diff, done, on, loop, el, local }) {
    const dur = 5, pot = el('tg-cauldron'), meter = el('tg-stirbar'), needle = el('tg-needle', meter), band = el('tg-band2', meter), bar = el('tg-timer'); bar.append(h('i'));
    const lo = 0.38 + diff * 0.05, hi = 0.68 - diff * 0.04; band.style.left = lo * 100 + '%'; band.style.width = (hi - lo) * 100 + '%';
    let held = false, lastA = null, speed = 0, t = 0, good = 0;
    const move = e => { if (!held) return; const [x, y] = local(e), a = Math.atan2(y - 0.55, (x - 0.5) * 1.6); if (lastA != null) { let d = a - lastA; d = Math.atan2(Math.sin(d), Math.cos(d)); speed += Math.abs(d) * 0.08; } lastA = a; };
    on(stage, 'pointerdown', e => { e.preventDefault(); held = true; lastA = null; }); on(stage, 'pointermove', move); on(window, 'pointerup', () => { held = false; }); on(window, 'pointercancel', () => { held = false; });
    loop(dt => { t += dt; speed = Math.max(0, speed * (1 - dt * 1.6)); const v = Math.min(1, speed); needle.style.left = v * 100 + '%'; const ok = v >= lo && v <= hi; if (ok) good += dt; pot.classList.toggle('ok', ok); pot.classList.toggle('boil', v > hi);
      bar.firstChild.style.width = Math.max(0, 1 - t / dur) * 100 + '%'; if (t >= dur) { done(good / (dur - 0.6) * 1.05); return false; } });
  },
  // jewellery and charms: turn each gem until its facet points at the gold mark. 4 gems.
  gem({ stage, diff, done, on, loop, flash, pips, el }) {
    const n = 4, mark = pips(n), g = el('tg-gemstone', stage, '▲'), tgt = el('tg-gemmark'), btn = h('button', { class: 'tg-tf yes' }, 'Set ✓'); stage.append(h('div', { class: 'tg-feet one' }, btn));
    let k = 0, sc = 0, a = 0, goal = 0, spd = 0;
    const next = () => { goal = rnd(0, 360); tgt.style.transform = `translate(-50%, -50%) rotate(${goal}deg)`; spd = (140 + diff * 140) * (Math.random() < 0.5 ? 1 : -1); };
    next();
    const set = () => { let d = Math.abs(((a - goal) % 360 + 540) % 360 - 180); const s = clamp01(1 - d / (28 + (1 - diff) * 14)); sc += s; mark(k, s); flash(s >= 0.45); if (++k >= n) return done(sc / n); next(); };
    on(btn, 'pointerdown', e => { e.preventDefault(); set(); }); on(window, 'keydown', e => { if (e.code === 'Space') { e.preventDefault(); set(); } });
    loop(dt => { a = (a + spd * dt + 360) % 360; g.style.transform = `translate(-50%, -50%) rotate(${a}deg)`; });
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
  // burglary: drag each pin up to the shear line
  pins({ stage, diff, done, on, flash, pips, el, local }) {
    const n = 4, mark = pips(n), line = 0.72, tol = 0.07 + (1 - diff) * 0.05; let k = 0, sc = 0, y0 = 0, start = null;
    const P = Array.from({ length: n }, (_, i) => { const e = el('tg-pin'); e.style.left = (14 + i * 22) + '%'; e.style.setProperty('--y', 0.15); return e; });
    const mark2 = () => P.forEach((p, i) => p.classList.toggle('lit', i === k)); mark2();
    on(stage, 'pointerdown', e => { e.preventDefault(); if (k >= n) return; start = local(e)[1]; y0 = 0.15; try { stage.setPointerCapture(e.pointerId); } catch (x) {} });
    on(stage, 'pointermove', e => { if (start == null) return; const y = Math.max(0, Math.min(1, y0 + (start - local(e)[1]) * 1.3)); P[k].style.setProperty('--y', y); P[k].dataset.y = y; });
    const up = () => { if (start == null) return; start = null; const y = +(P[k].dataset.y || 0.15), s = clamp01(1 - Math.abs(y - line) / tol * 0.7); sc += s; mark(k, s); flash(s >= 0.45);
      if (s >= 0.45) { P[k].classList.add('set'); P[k].style.setProperty('--y', line); } else { P[k].classList.add('bent'); P[k].style.setProperty('--y', 0.15); } if (++k >= n) return done(sc / n); mark2(); };
    on(window, 'pointerup', up); on(window, 'pointercancel', up);
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


// ---------- v0.9.13 meditation, one game per cultivation method — each with its own mechanic
Object.assign(GAMEFNS, {
  // keep a slow rhythm from memory, with no cue
  async m_turtle({ stage, diff, done, on, flash, pips, el, isDone }) {
    const I = rnd(1.0, 1.3), n = 4, mark = pips(n), pulse = el('tg-pulse tg-slow'), note = el('tg-note', stage, 'Feel it…'); const taps = [];
    for (let i = 0; i < 3; i++) { if (isDone()) return; pulse.classList.remove('beat'); void pulse.offsetWidth; pulse.classList.add('beat'); fx('click'); await wait(I * 1000); }
    pulse.classList.add('gone'); note.textContent = 'Now keep the rhythm'; let last = performance.now() - I * 1000 * 0;
    let k = 0; last = performance.now();
    on(stage, 'pointerdown', e => { e.preventDefault(); const now = performance.now(), gap = (now - last) / 1000; last = now; const s = clamp01(1 - Math.abs(gap - I) / (I * (0.32 - diff * 0.12))); mark(k, s); flash(s >= 0.4); taps.push(s); if (++k >= n) done(taps.reduce((a, b) => a + b, 0) / n); });
    on(window, 'keydown', e => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); stage.dispatchEvent(new PointerEvent('pointerdown')); } });
  },
  // a quick quiz on the generating cycle
  m_five({ stage, diff, done, on, later, flash, pips, el }) {
    const E = [['Wood', '🌿'], ['Fire', '🔥'], ['Earth', '⛰️'], ['Metal', '⚙️'], ['Water', '💧']], n = 5, mark = pips(n), lim = 2.6 - diff * 0.7;
    const q = el('tg-quiz'), opts = el('tg-qopts'), bar = el('tg-timer'); bar.append(h('i')); let k = 0, sc = 0, timer = null;
    const ask = () => { if (k >= n) return done(sc / n); const i = Math.floor(Math.random() * 5), back = Math.random() < 0.4, ans = back ? (i + 4) % 5 : (i + 1) % 5;
      q.textContent = back ? `What feeds ${E[i][1]} ${E[i][0]}?` : `${E[i][1]} ${E[i][0]} feeds…?`;
      const choices = [ans, ...[0, 1, 2, 3, 4].filter(x => x !== ans && x !== i).sort(() => Math.random() - 0.5).slice(0, 2)].sort(() => Math.random() - 0.5);
      const t0 = performance.now(); const b = bar.firstChild; b.style.transition = 'none'; b.style.width = '100%'; void b.offsetWidth; b.style.transition = `width ${lim}s linear`; b.style.width = '0%';
      opts.replaceChildren(...choices.map(c => { const btn = h('button', { class: 'tg-qopt' }, `${E[c][1]} ${E[c][0]}`); on(btn, 'pointerdown', e => { e.preventDefault(); clearTimeout(timer); const ok = c === ans, s = ok ? clamp01(1.15 - (performance.now() - t0) / 1000 / lim * 0.6) : 0; sc += s; mark(k, s); flash(ok); k++; later(ask, 250); }); return btn; }));
      clearTimeout(timer); timer = later(() => { mark(k, 0); flash(false); k++; ask(); }, lim * 1000); };
    later(ask, 300);
  },
  // wipe clouds away from the moon
  m_moon({ stage, diff, done, on, loop, el, local }) {
    const dur = 4.4, moon = el('tg-moon', stage, '🌕'), bar = el('tg-timer'); bar.append(h('i')); moon.style.left = '50%'; moon.style.top = '45%';
    const C = Array.from({ length: 3 + (diff > 0.8 ? 1 : 0) }, () => ({ e: el('tg-cloud', stage, '☁️'), x: rnd(0.2, 0.8), y: rnd(0.3, 0.6), vx: 0, vy: 0 }));
    let held = false, lx = 0, ly = 0, t = 0, clear = 0;
    on(stage, 'pointerdown', e => { e.preventDefault(); held = true; [lx, ly] = local(e); try { stage.setPointerCapture(e.pointerId); } catch (x) {} });
    on(stage, 'pointermove', e => { if (!held) return; const [x, y] = local(e), dx = x - lx, dy = y - ly; for (const c of C) if (Math.hypot((c.x - x) * 1.7, c.y - y) < 0.16) { c.vx += dx * 9; c.vy += dy * 9; } lx = x; ly = y; });
    on(window, 'pointerup', () => { held = false; }); on(window, 'pointercancel', () => { held = false; });
    loop(dt => { t += dt; let covered = false;
      for (const c of C) { c.vx += (0.5 - c.x) * dt * (0.5 + diff * 0.7); c.vy += (0.45 - c.y) * dt * (0.5 + diff * 0.7); c.vx *= 0.94; c.vy *= 0.94; c.x += c.vx * dt; c.y += c.vy * dt; c.x = Math.max(-0.1, Math.min(1.1, c.x)); c.y = Math.max(0, Math.min(0.95, c.y)); c.e.style.left = c.x * 100 + '%'; c.e.style.top = c.y * 100 + '%'; if (Math.hypot((c.x - 0.5) * 1.7, c.y - 0.45) < 0.14) covered = true; }
      if (!covered) clear += dt; moon.classList.toggle('dim', covered); bar.firstChild.style.width = Math.max(0, 1 - t / dur) * 100 + '%'; if (t >= dur) { done(clear / dur * 1.25 - 0.1); return false; } });
  },
  // mash to stoke the fire
  m_fire({ stage, diff, done, loop, tapStage, el }) {
    const dur = 3.2, need = Math.round(16 + diff * 8), col = el('tg-col tg-firecol'), fill = el('tg-heatfill', col), f = el('tg-flame', col, '🔥'), bar = el('tg-timer'); bar.append(h('i')); let taps = 0, t = 0;
    tapStage(() => { taps++; f.classList.remove('puff'); void f.offsetWidth; f.classList.add('puff'); });
    loop(dt => { t += dt; const v = Math.min(1, taps / need); fill.style.height = v * 100 + '%'; f.style.bottom = v * 88 + '%'; bar.firstChild.style.width = Math.max(0, 1 - t / dur) * 100 + '%'; if (t >= dur) { done(taps / need); return false; } });
  },
  // dodge lightning between three columns
  async m_thunder({ stage, diff, done, on, flash, pips, isDone }) {
    const n = 5, mark = pips(n), cols = [0, 1, 2].map(() => { const b = h('button', { class: 'tg-bolt' }); stage.append(b); return b; }); let me = 1, sc = 0;
    const body = h('div', { class: 'tg-me2' }, '🧘'); stage.append(body); const place = () => { body.style.left = (me * 33.3 + 16.6) + '%'; }; place();
    cols.forEach((b, i) => on(b, 'pointerdown', e => { e.preventDefault(); me = i; place(); }));
    on(window, 'keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'a') { me = Math.max(0, me - 1); place(); } if (e.key === 'ArrowRight' || e.key === 'd') { me = Math.min(2, me + 1); place(); } });
    for (let k = 0; k < n; k++) { if (isDone()) return; await wait(rnd(250, 500)); const hits = [Math.floor(Math.random() * 3)]; if (diff > 0.75 && Math.random() < 0.45) hits.push((hits[0] + 1 + Math.floor(Math.random() * 2)) % 3);
      hits.forEach(i => cols[i].classList.add('spark')); await wait(1000 - diff * 380); hits.forEach(i => { cols[i].classList.remove('spark'); cols[i].classList.add('struck'); });
      const ok = !hits.includes(me); sc += ok ? 1 : 0; mark(k, ok ? 1 : 0); flash(ok); fx(ok ? 'click' : 'heavy'); await wait(260); hits.forEach(i => cols[i].classList.remove('struck')); }
    done(sc / n);
  },
  // lotus: patience — tap each petal only once it has fully opened
  m_lotus({ stage, diff, done, on, loop, flash, pips }) {
    const n = 5, mark = pips(n); let k = 0, sc = 0, open = 0, t = 0; const speed = 0.45 + diff * 0.35;
    const P = Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2 - Math.PI / 2, b = h('button', { class: 'tg-petal', style: { left: (50 + Math.cos(a) * 26) + '%', top: (50 + Math.sin(a) * 30) + '%', transform: `translate(-50%,-50%) rotate(${a + Math.PI / 2}rad)` } }); stage.append(b); return b; });
    P.forEach((b, i) => on(b, 'pointerdown', e => { e.preventDefault(); if (i !== k) return flash(false); const s = open >= 1 ? clamp01(1.1 - t * 0.6) : open * 0.3; sc += s; mark(k, s); flash(open >= 1); b.classList.add('done'); k++; open = 0; t = 0; if (k >= n) done(sc / n); }));
    loop(dt => { if (k >= n) return false; open = Math.min(1, open + dt * speed); if (open >= 1) t += dt; P[k].style.setProperty('--o', open); P[k].classList.toggle('full', open >= 1); if (t > 1.8) { mark(k, 0); P[k].classList.add('done'); k++; open = 0; t = 0; if (k >= n) { done(sc / n); return false; } } });
  },
  // one precise swipe along a line
  m_sword({ stage, diff, done, on, later, flash, pips, el, local }) {
    later(() => done(sc / n), 14000);
    const n = 3, mark = pips(n), guide = el('tg-guide'), trail = el('tg-trail'); let k = 0, sc = 0, ang = 0, cx = 0.5, cy = 0.5, s0 = null;
    const setLine = () => { ang = rnd(-1.2, 1.2); cx = rnd(0.35, 0.65); cy = rnd(0.35, 0.65); guide.style.left = cx * 100 + '%'; guide.style.top = cy * 100 + '%'; guide.style.transform = `translate(-50%,-50%) rotate(${ang}rad)`; }; setLine();
    on(stage, 'pointerdown', e => { e.preventDefault(); s0 = local(e); try { stage.setPointerCapture(e.pointerId); } catch (x) {} });
    const up = e => { if (!s0) return; const s1 = local(e), r = stage.getBoundingClientRect(), dx = (s1[0] - s0[0]) * r.width, dy = (s1[1] - s0[1]) * r.height, len = Math.hypot(dx, dy); const st = s0; s0 = null;
      if (len < r.width * 0.25) { mark(k, 0); flash(false); if (++k >= n) return done(sc / n); return setTimeout(setLine, 300); } // a tap isn't a cut let a = Math.atan2(dy, dx); let da = Math.abs(((a - ang) % Math.PI + Math.PI * 1.5) % Math.PI - Math.PI / 2);
      const mx = (st[0] + s1[0]) / 2, my = (st[1] + s1[1]) / 2, off = Math.abs(-(mx - cx) * Math.sin(ang) * r.width + (my - cy) * Math.cos(ang) * r.height) / r.height;
      const s = clamp01(1 - da / (0.28 + (1 - diff) * 0.15) * 0.8 - off * 1.8); sc += s; mark(k, s); flash(s >= 0.45); trail.style.cssText = `left:${mx * 100}%;top:${my * 100}%;width:${len}px;transform:translate(-50%,-50%) rotate(${a}rad)`; trail.classList.remove('show'); void trail.offsetWidth; trail.classList.add('show');
      if (++k >= n) return done(sc / n); setTimeout(setLine, 300); };
    on(window, 'pointerup', up); on(window, 'pointercancel', () => { s0 = null; });
  },
  // drag a bowl to catch falling stars
  m_star({ stage, diff, done, on, loop, el, local }) {
    const bowl = el('tg-bowl', stage, '🥣'); let bx = 0.5, t = 0, spawn = 0.3, got = 0, total = 0, held = false; const items = [], dur = 4.6, keys = {};
    const move = e => { bx = Math.max(0.06, Math.min(0.94, local(e)[0])); };
    on(stage, 'pointerdown', e => { e.preventDefault(); held = true; move(e); try { stage.setPointerCapture(e.pointerId); } catch (x) {} }); on(stage, 'pointermove', e => { if (held || e.pointerType === 'mouse') move(e); });
    on(window, 'pointerup', () => { held = false; }); on(window, 'keydown', e => { keys[e.key] = true; }); on(window, 'keyup', e => { keys[e.key] = false; });
    loop(dt => { t += dt; spawn -= dt; if (keys.ArrowLeft || keys.a) bx = Math.max(0.06, bx - dt * 1.2); if (keys.ArrowRight || keys.d) bx = Math.min(0.94, bx + dt * 1.2); bowl.style.left = bx * 100 + '%';
      if (spawn <= 0 && t < dur - 0.9) { items.push({ e: el('tg-faller', stage, '⭐'), x: rnd(0.08, 0.92), y: -0.05, sp: rnd(0.5, 0.75) * (0.8 + diff * 0.45) }); total++; spawn = rnd(0.45, 0.8); }
      for (const it of items) { if (it.done) continue; it.y += it.sp * dt; it.e.style.left = it.x * 100 + '%'; it.e.style.top = it.y * 100 + '%';
        if (it.y > 0.82) { it.done = true; if (Math.abs(it.x - bx) < 0.1 + (1 - diff) * 0.04) { got++; it.e.classList.add('gone'); fx('click'); } else it.e.classList.add('lost'); } }
      if (t >= dur) { done(total ? got / total : 0.5); return false; } });
  },
  // v0.9.48 yin and yang, simplified: a dark or light orb appears. Tap the matching side. 6 orbs.
  async m_dual({ stage, diff, done, on, flash, pips, isDone }) {
    const n = 6, mark = pips(n), orb = h('div', { class: 'tg-yyorb' }), Y = h('button', { class: 'tg-yy yin' }, '● YIN'), G = h('button', { class: 'tg-yy yang' }, 'YANG ○');
    stage.append(orb, h('div', { class: 'tg-feet' }, Y, G)); let sc = 0, answer = null;
    const press = v => { if (answer) { const a = answer; answer = null; a(v); } };
    on(Y, 'pointerdown', e => { e.preventDefault(); press('yin'); }); on(G, 'pointerdown', e => { e.preventDefault(); press('yang'); });
    on(window, 'keydown', e => { if (e.key === 'a' || e.key === 'ArrowLeft') press('yin'); if (e.key === 'd' || e.key === 'ArrowRight') press('yang'); });
    for (let k = 0; k < n; k++) { if (isDone()) return; await wait(250 + Math.random() * 300); const want = Math.random() < 0.5 ? 'yin' : 'yang', t0 = performance.now(), limit = 1500 - diff * 500;
      orb.className = 'tg-yyorb show ' + want;
      const got = await new Promise(res => { const id = setTimeout(() => { answer = null; res(null); }, limit); answer = v => { clearTimeout(id); res(v); }; });
      const ok = got === want, s = ok ? clamp01(1.2 - (performance.now() - t0) / limit * 0.6) : 0; sc += s; mark(k, s); flash(ok); orb.className = 'tg-yyorb'; }
    done(sc / n);
  },
  // stillness: hold and don't move while distractions flash
  m_void({ stage, diff, done, on, loop, el }) {
    const dur = 4, dot = el('tg-voiddot'), bar = el('tg-timer'), lure = el('tg-lure'); bar.append(h('i'));
    let held = false, t = 0, still = 0, x0 = null, y0 = null, broke = 0, started = false;
    on(stage, 'pointerdown', e => { e.preventDefault(); held = true; started = true; x0 = e.clientX; y0 = e.clientY; });
    on(window, 'pointermove', e => { if (held && x0 != null && Math.hypot(e.clientX - x0, e.clientY - y0) > 14 - diff * 6) { broke++; x0 = e.clientX; y0 = e.clientY; stage.classList.add('miss'); setTimeout(() => stage.classList.remove('miss'), 150); } });
    on(window, 'pointerup', () => { if (held) broke++; held = false; }); on(window, 'pointercancel', () => { held = false; });
    on(window, 'keydown', e => { if (e.code === 'Space') { e.preventDefault(); if (!held) { held = true; started = true; } } }); on(window, 'keyup', e => { if (e.code === 'Space') { held = false; broke++; } });
    const LURES = ['👁️', '🔔', '🦋', '💭', '🕯️', '🐦'];
    loop(dt => { if (!started) return; t += dt; if (held) still += dt; dot.classList.toggle('in', held);
      if (Math.random() < dt * (1.2 + diff)) { lure.textContent = LURES[Math.floor(Math.random() * LURES.length)]; lure.style.left = rnd(10, 85) + '%'; lure.style.top = rnd(10, 80) + '%'; lure.classList.remove('pop'); void lure.offsetWidth; lure.classList.add('pop'); }
      bar.firstChild.style.width = Math.max(0, 1 - t / dur) * 100 + '%'; if (t >= dur) { done(still / dur - broke * 0.12); return false; } });
  },
  // drag vengeful souls into the cauldron
  m_souls({ stage, diff, done, on, loop, flash, el, local }) {
    const pot = el('tg-pot', stage, '🏺'); let t = 0, spawn = 0.1, got = 0, sin = 0, evil = 0, drag = null; const items = [], dur = 5;
    on(stage, 'pointerdown', e => { e.preventDefault(); const [px, py] = local(e); drag = items.filter(it => !it.gone).sort((a, b) => Math.hypot(a.x - px, a.y - py) - Math.hypot(b.x - px, b.y - py))[0]; if (drag && Math.hypot((drag.x - px) * 1.7, drag.y - py) > 0.16) drag = null; try { stage.setPointerCapture(e.pointerId); } catch (x) {} });
    on(stage, 'pointermove', e => { if (!drag) return; [drag.x, drag.y] = local(e); });
    const up = () => { if (!drag) return; const d = drag; drag = null; if (Math.hypot((d.x - 0.5) * 1.7, d.y - 0.85) < 0.18) { d.gone = true; d.e.classList.add('gone'); if (d.evil) { got++; flash(true); } else { sin++; flash(false); } } };
    on(window, 'pointerup', up); on(window, 'pointercancel', up);
    loop(dt => { t += dt; spawn -= dt; if (spawn <= 0 && t < dur - 1.2 && items.filter(i => !i.gone).length < 5) { const ev = Math.random() < 0.6; const it = { e: el('tg-soul' + (ev ? ' evil' : ''), stage, ev ? '👹' : '👻'), x: rnd(0.1, 0.9), y: rnd(0.1, 0.45), ph: Math.random() * 6, evil: ev }; items.push(it); if (ev) evil++; spawn = rnd(0.5, 0.9); }
      for (const it of items) { if (it !== drag && !it.gone) { it.x += Math.sin(t * (1.4 + diff) + it.ph) * dt * 0.18; it.y += Math.cos(t * 1.1 + it.ph) * dt * 0.08; } it.e.style.left = it.x * 100 + '%'; it.e.style.top = it.y * 100 + '%'; }
      if (t >= dur) { done(Math.min(1, got / Math.max(2, Math.min(evil, 4))) - sin * 0.3); return false; } });
  },
  // push your luck: draw as much as you dare, release before the heart bursts
  m_blood({ stage, diff, done, on, loop, flash, pips, el }) {
    const n = 3, mark = pips(n), vial = el('tg-mould tg-vial'), fill = el('tg-metal tg-blood', vial), heart = el('tg-heart', stage, '❤️'); let k = 0, sc = 0, v = 0, held = false, limit = rnd(0.6, 0.95), burst = false;
    const reset = () => { v = 0; limit = rnd(0.55, 0.95); burst = false; fill.style.height = '0%'; heart.textContent = '❤️'; };
    const release = () => { if (!held) return; held = false; if (burst) return; const s = clamp01(v / limit * 1.05); sc += s; mark(k, s); flash(s >= 0.6); if (++k >= n) return done(sc / n); setTimeout(reset, 300); };
    on(stage, 'pointerdown', e => { e.preventDefault(); if (k < n && !burst) held = true; }); on(window, 'pointerup', release); on(window, 'pointercancel', release);
    on(window, 'keydown', e => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); if (k < n && !burst) held = true; } }); on(window, 'keyup', e => { if (e.code === 'Space') release(); });
    loop(dt => { if (held && !burst) { v += dt * (0.3 + diff * 0.15); fill.style.height = Math.min(1, v) * 100 + '%'; const near = v / limit; heart.style.transform = `translate(-50%,0) scale(${1 + Math.max(0, near - 0.6) * 0.6}) rotate(${(Math.random() - 0.5) * Math.max(0, near - 0.65) * 40}deg)`;
        if (v >= limit) { burst = true; held = false; heart.textContent = '💥'; mark(k, 0); flash(false); fx('heavy'); if (++k >= n) { done(sc / n); return false; } setTimeout(reset, 500); } } });
  },
});

// ---------- v0.9.21 social minigames (one per interaction)
Object.assign(GAMEFNS, {
  s_mood({ stage, diff, done, on, later, flash, pips, el }) {
    const M = [['😢', 'sad', '🤗'], ['😡', 'angry', '🙏'], ['😂', 'laughing', '😄'], ['😳', 'embarrassed', '🙈'], ['🥳', 'excited', '🎉'], ['😴', 'tired', '☕'], ['😟', 'worried', '🫶']], n = 4, mark = pips(n), lim = 2.4 - diff * 0.6;
    const face = el('tg-face'), opts = el('tg-qopts tg-q4'), bar = el('tg-timer'); bar.append(h('i')); let k = 0, sc = 0, tm = null;
    const ask = () => { if (k >= n) return done(sc / n); const m = M[Math.floor(Math.random() * M.length)], others = M.filter(x => x !== m).sort(() => Math.random() - 0.5).slice(0, 3), ch = [m, ...others].sort(() => Math.random() - 0.5);
      face.textContent = m[0]; face.classList.remove('pop'); void face.offsetWidth; face.classList.add('pop'); const t0 = performance.now();
      const b = bar.firstChild; b.style.transition = 'none'; b.style.width = '100%'; void b.offsetWidth; b.style.transition = `width ${lim}s linear`; b.style.width = '0%';
      opts.replaceChildren(...ch.map(x => { const bt = h('button', { class: 'tg-qopt big' }, x[2]); on(bt, 'pointerdown', e => { e.preventDefault(); clearTimeout(tm); const ok = x === m, s = ok ? clamp01(1.1 - (performance.now() - t0) / 1000 / lim * 0.5) : 0; sc += s; mark(k, s); flash(ok); k++; later(ask, 250); }); return bt; }));
      clearTimeout(tm); tm = later(() => { mark(k, 0); flash(false); k++; ask(); }, lim * 1000); };
    later(ask, 300);
  },
  s_words({ stage, diff, done, on, flash, pips, el, ctx }) {
    const L = [['You', 'always', 'make', 'me', 'laugh'], ['I', 'admire', 'how', 'brave', 'you', 'are'], ['You', 'have', 'a', 'kind', 'heart'], ['Your', 'smile', 'lights', 'up', 'rooms'], ['You', 'are', 'really', 'good', 'at', 'this'], ['I', 'trust', 'you', 'completely']];
    const line = L[Math.floor(Math.random() * L.length)].slice(0, diff > 0.8 ? 6 : 5), mark = pips(line.length); let k = 0, errs = 0; const t0 = performance.now();
    const out = el('tg-sentence'), pool = el('tg-wordpool');
    line.map((w, i) => ({ w, i })).sort(() => Math.random() - 0.5).forEach(({ w, i }) => { const b = h('button', { class: 'tg-word' }, w); pool.append(b);
      on(b, 'pointerdown', e => { e.preventDefault(); if (b.disabled) return; if (line[k] === w) { b.disabled = true; out.append(h('span', {}, w + ' ')); mark(k, 1); k++; if (k >= line.length) done(1 - errs * 0.18 - Math.max(0, (performance.now() - t0) / 1000 - 5) * 0.05); } else { errs++; flash(false); if (errs >= 4) done(k / line.length * 0.4); } }); });
  },
  s_gift({ stage, done, on, flash, el, ctx }) {
    const CAT = { tea: ['🍵', 'Fine tea set'], book: ['📚', 'Rare old book'], food: ['🍜', 'Street-food tour voucher'], cat: ['🐱', 'Cat café pass'], music: ['🎤', 'Karaoke night'], game: ['🎮', 'New video game'], chess: ['♟️', 'Carved chess set'], garden: ['🌱', 'Bonsai tree'], bike: ['🏍️', 'Riding jacket'], star: ['🔭', 'Small telescope'], art: ['🖌️', 'Calligraphy brushes'], film: ['🎬', 'Martial-arts film box set'] };
    const MAP = [[/tea/, 'tea'], [/book/, 'book'], [/food|spicy/, 'food'], [/cat/, 'cat'], [/karaoke|music/, 'music'], [/video game/, 'game'], [/chess/, 'chess'], [/garden/, 'garden'], [/motorbike/, 'bike'], [/star/, 'star'], [/calligraph|paint|art/, 'art'], [/film|movie/, 'film'], [/rain|night market/, 'food']];
    const likes = ctx.likes || '', right = (MAP.find(([re]) => re.test(likes)) || [0, 'tea'])[1];
    const opts = [right, ...Object.keys(CAT).filter(k => k !== right).sort(() => Math.random() - 0.5).slice(0, 3)].sort(() => Math.random() - 0.5);
    el('tg-quiz', stage, ctx.known ? `${ctx.name} loves ${likes}.` : `What would ${ctx.name || 'they'} like? (Talk to people to learn their tastes.)`);
    const box = el('tg-qopts tg-q4'); opts.forEach(k => { const b = h('button', { class: 'tg-qopt big' }, h('div', {}, CAT[k][0]), h('small', {}, CAT[k][1])); on(b, 'pointerdown', e => { e.preventDefault(); const ok = k === right; flash(ok); done(ok ? 1 : 0.35); }); box.append(b); });
  },
  s_rope({ stage, diff, done, loop, tapStage, flash, pips, el }) {
    const n = 6, mark = pips(n), rope = el('tg-rope'), me = el('tg-jumper', stage, '🧍'), pal = el('tg-jumper pal', stage, '🧍'); let a = Math.PI, k = 0, sc = 0, sp = 3 + diff * 1.5, air = 0, judged = -1;
    tapStage(() => { if (air > 0) return; air = 0.42; me.classList.add('up'); setTimeout(() => me.classList.remove('up'), 380); });
    loop(dt => { a += dt * sp; air = Math.max(0, air - dt); const turns = Math.floor((a - Math.PI) / (Math.PI * 2)); const ph = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      rope.style.transform = `scaleY(${Math.cos(a).toFixed(3)})`; pal.classList.toggle('up', Math.cos(a) > 0.75);
      if (Math.cos(a) > 0.92 && judged !== turns) { judged = turns; const ok = air > 0.05; sc += ok ? 1 : 0; mark(k, ok ? 1 : 0); flash(ok); if (++k >= n) { done(sc / n); return false; } sp *= 1.04; } });
  },
  s_temper({ stage, diff, done, on, later, flash, pips, el }) {
    const R = [['"You never listen to me!"', ['"You\'re right — I\'m listening now."', 2], ['"Neither do you."', 1], ['"Whatever."', 0]], ['"This is all your fault."', ['"Let\'s figure out what went wrong together."', 2], ['"Part of it, maybe."', 1], ['"Grow up."', 0]],
      ['"You always do this!"', ['"Tell me what I keep doing."', 2], ['"Always? Really?"', 1], ['"And you\'re perfect?"', 0]], ['"I can\'t believe you."', ['"I hear you. I\'m sorry it hurt."', 2], ['"Let me explain."', 1], ['"Believe what you want."', 0]]];
    const n = 3, mark = pips(n), lim = 3 - diff * 0.7, q = el('tg-quiz'), opts = el('tg-qopts tg-q1'), bar = el('tg-timer'); bar.append(h('i')); let k = 0, sc = 0, tm = null; const pool = R.slice().sort(() => Math.random() - 0.5);
    const ask = () => { if (k >= n) return done(sc / n); const [line, ...ans] = pool[k]; q.textContent = line; const b = bar.firstChild; b.style.transition = 'none'; b.style.width = '100%'; void b.offsetWidth; b.style.transition = `width ${lim}s linear`; b.style.width = '0%';
      opts.replaceChildren(...ans.slice().sort(() => Math.random() - 0.5).map(([t, v]) => { const bt = h('button', { class: 'tg-qopt' }, t); on(bt, 'pointerdown', e => { e.preventDefault(); clearTimeout(tm); sc += v / 2; mark(k, v / 2); flash(v >= 1); k++; later(ask, 250); }); return bt; }));
      clearTimeout(tm); tm = later(() => { sc += 0.2; mark(k, 0.2); flash(false); k++; ask(); }, lim * 1000); };
    later(ask, 300);
  },
  s_nerve({ stage, diff, done, on, loop, flash, el }) {
    const heart = el('tg-heart2', stage, '💓'), meter = el('tg-nervebar'), fill = el('tg-nervefill', meter), zone = el('tg-nervezone', meter), them = el('tg-them', stage, '🙂');
    let v = 0.75, held = false, t = 0, look = false, flip = 0.8, started = false; const calm = 0.3 + (1 - diff) * 0.1; zone.style.width = calm * 100 + '%';
    const speak = () => { if (!held) return; held = false; const ok = v <= calm && look; const s = (v <= calm ? 0.55 : 0.15 * (1 - v)) + (look ? 0.45 : 0); flash(ok); done(s); };
    on(stage, 'pointerdown', e => { e.preventDefault(); held = true; started = true; }); on(window, 'pointerup', speak); on(window, 'pointercancel', speak);
    on(window, 'keydown', e => { if (e.code === 'Space' && !e.repeat) { e.preventDefault(); held = true; started = true; } }); on(window, 'keyup', e => { if (e.code === 'Space') speak(); });
    loop(dt => { t += dt; flip -= dt; if (flip <= 0) { look = !look; them.textContent = look ? '🙂' : '🙄'; them.classList.toggle('look', look); flip = look ? 0.6 + Math.random() * 0.6 * (1.2 - diff * 0.4) : 0.7 + Math.random(); }
      v = Math.max(0, Math.min(1, v + (held ? -0.28 : 0.12 + diff * 0.06) * dt + (Math.random() - 0.5) * dt * 0.3)); fill.style.width = v * 100 + '%'; heart.style.transform = `scale(${1 + v * 0.35})`;
      if (t > 9) { done(0.2); return false; } });
  },
});
