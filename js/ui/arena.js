// Action phases ("arenas") for boss fights, Heavenly Tribulations and Body Trials.
// You steer a glowing orb with the mouse / finger (or arrow keys / WASD), dodge telegraphed attacks,
// and touch the bright marks that appear to land hits. Each phase ends when you land enough hits or time runs out.
// Between phases the enemy may leave an opening: press the attack, or catch your breath.
import { S } from '../settings.js';
import { sfx } from '../audio/sfx.js';

const W = 640, H = 400;
const rnd = (a, b) => a + Math.random() * (b - a);
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
// distance from point to infinite line through (x1,y1) with angle a
const lineDist = (px, py, x, y, a) => Math.abs((px - x) * Math.sin(a) - (py - y) * Math.cos(a));

// ---- attack patterns. Each returns hazard objects: { t0 (start), warn (telegraph secs), live (active secs), hit(px,py,t), draw(ctx,t,phase) }
const P = {
  beam(d, at, o = {}) { const a = o.a ?? rnd(0, Math.PI), x = o.x ?? rnd(80, W - 80), y = o.y ?? rnd(60, H - 60), w = o.w ?? 22 + d * 6;
    return { t0: at, warn: o.warn ?? Math.max(0.45, 0.95 - d * 0.35), live: 0.28, hit: (px, py) => lineDist(px, py, x, y, a) < w / 2 + 6,
      draw(ctx, s, on, k, col) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); if (!on) { ctx.globalAlpha = 0.25 + 0.5 * k; ctx.setLineDash([8, 8]); ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-900, 0); ctx.lineTo(900, 0); ctx.stroke(); ctx.globalAlpha = 0.08; ctx.fillStyle = col; ctx.fillRect(-900, -w / 2, 1800, w); }
        else { ctx.shadowColor = col; ctx.shadowBlur = 24; ctx.fillStyle = '#fff'; ctx.fillRect(-900, -w / 6, 1800, w / 3); ctx.globalAlpha = 0.55; ctx.fillStyle = col; ctx.fillRect(-900, -w / 2, 1800, w); } ctx.restore(); } }; },
  burst(d, at) { const x = rnd(90, W - 90), y = rnd(70, H - 70), n = 3 + Math.round(d * 3); return Array.from({ length: n }, (_, i) => P.beam(d, at + i * 0.05, { x, y, a: i * Math.PI / n + rnd(-0.1, 0.1), w: 12, warn: 0.85 })); },
  cross(d, at) { const x = rnd(120, W - 120), y = rnd(90, H - 90); return [P.beam(d, at, { x, y, a: 0 }), P.beam(d, at, { x, y, a: Math.PI / 2 })]; },
  ring(d, at) { const x = rnd(140, W - 140), y = rnd(100, H - 100), gap = rnd(0, Math.PI * 2), gw = 0.9 - d * 0.25, sp = 190 + d * 80;
    return { t0: at, warn: 0.6, live: 2.6, hit: (px, py, t) => { const r = t * sp, dd = dist(px, py, x, y); if (Math.abs(dd - r) > 9) return false; let ang = Math.atan2(py - y, px - x) - gap; ang = Math.atan2(Math.sin(ang), Math.cos(ang)); return Math.abs(ang) > gw / 2; },
      draw(ctx, t, on, k, col) { ctx.save(); ctx.strokeStyle = col; if (!on) { ctx.globalAlpha = 0.6 * k; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 10 + 6 * k, 0, 7); ctx.stroke(); }
        else { ctx.shadowColor = col; ctx.shadowBlur = 16; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(x, y, t * sp, gap + gw / 2, gap + Math.PI * 2 - gw / 2); ctx.stroke(); } ctx.restore(); } }; },
  orbs(d, at) { const side = Math.floor(rnd(0, 4)), n = 4 + Math.round(d * 4), out = [];
    for (let i = 0; i < n; i++) { const sx = side === 0 ? -10 : side === 1 ? W + 10 : rnd(20, W - 20), sy = side === 2 ? -10 : side === 3 ? H + 10 : rnd(20, H - 20);
      const tx = rnd(100, W - 100), ty = rnd(80, H - 80), a = Math.atan2(ty - sy, tx - sx), sp = 170 + d * 90, t0 = at + i * 0.18;
      out.push({ t0, warn: 0.35, live: 4, hit: (px, py, t) => dist(px, py, sx + Math.cos(a) * sp * t, sy + Math.sin(a) * sp * t) < 13,
        draw(ctx, t, on, k, col) { ctx.save(); if (!on) { ctx.globalAlpha = k; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(Math.min(W - 6, Math.max(6, sx)), Math.min(H - 6, Math.max(6, sy)), 4, 0, 7); ctx.fill(); }
          else { const ox = sx + Math.cos(a) * sp * t, oy = sy + Math.sin(a) * sp * t; ctx.shadowColor = col; ctx.shadowBlur = 14; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(ox, oy, 8, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ox, oy, 3, 0, 7); ctx.fill(); } ctx.restore(); } }); }
    return out; },
  walls(d, at) { const m = 70 + d * 40, horiz = Math.random() < 0.5;
    return { t0: at, warn: 1, live: 2.2, hit: (px, py) => horiz ? (px < m || px > W - m) : (py < m * 0.7 || py > H - m * 0.7),
      draw(ctx, t, on, k, col) { ctx.save(); ctx.fillStyle = col; ctx.globalAlpha = on ? 0.55 : 0.12 + 0.2 * k; if (horiz) { ctx.fillRect(0, 0, m, H); ctx.fillRect(W - m, 0, m, H); } else { ctx.fillRect(0, 0, W, m * 0.7); ctx.fillRect(0, H - m * 0.7, W, m * 0.7); } ctx.restore(); } }; },
  sweep(d, at) { const x = W / 2, y = H / 2, a0 = rnd(0, 6.28), dir = Math.random() < 0.5 ? 1 : -1, spd = 1.2 + d * 0.6;
    return { t0: at, warn: 0.9, live: 2.4, hit: (px, py, t) => { const a = a0 + dir * spd * t; return lineDist(px, py, x, y, a) < 12 && dist(px, py, x, y) > 18; },
      draw(ctx, t, on, k, col) { const a = a0 + dir * spd * (on ? t : 0); ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.strokeStyle = col; ctx.globalAlpha = on ? 0.9 : 0.3 * k; ctx.lineWidth = on ? 10 : 2; if (on) { ctx.shadowColor = col; ctx.shadowBlur = 20; } ctx.beginPath(); ctx.moveTo(-800, 0); ctx.lineTo(800, 0); ctx.stroke(); ctx.restore(); } }; },
  bolt(d, at, me) { // Heavenly Tribulation: lightning that targets where you are
    const x = me.x + rnd(-30, 30), y = me.y + rnd(-30, 30), r = 34 + d * 10;
    return { t0: at, warn: Math.max(0.55, 1 - d * 0.25), live: 0.3, hit: (px, py) => dist(px, py, x, y) < r,
      draw(ctx, t, on, k, col) { ctx.save(); if (!on) { ctx.strokeStyle = col; ctx.globalAlpha = 0.3 + 0.6 * k; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r * (1.4 - 0.4 * k), 0, 7); ctx.stroke(); ctx.globalAlpha = 0.1; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
        else { ctx.shadowColor = col; ctx.shadowBlur = 30; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); let bx = x + rnd(-40, 40), by = -10; ctx.moveTo(bx, by); while (by < y) { bx += rnd(-22, 22); by += rnd(20, 40); ctx.lineTo(by > y ? x : bx, Math.min(by, y)); } ctx.stroke(); ctx.globalAlpha = 0.5; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); } ctx.restore(); } }; },
};
const STYLES = {
  blade: ['beam', 'burst', 'cross', 'beam', 'sweep'],
  beast: ['orbs', 'walls', 'burst', 'ring', 'beam'],
  spirit: ['ring', 'orbs', 'sweep', 'beam', 'walls'],
  demon: ['burst', 'ring', 'orbs', 'cross', 'sweep', 'walls'],
  heaven: ['bolt', 'bolt', 'beam', 'bolt', 'ring', 'bolt'],
};

// ---- main entry: returns Promise<{ result: 'win'|'lose', bossLeft: 0..1, lives, livesMax }>
// o: { title, phases: [names], color, style, difficulty 0..1.5, lives, hitsPerPhase, lines: { intro, phase: [..], opening, win, lose } }
export function arena(o) {
  return new Promise(done => {
    const fast = S().reduceMotion;
    const col = o.color || '#ff5a4a', phases = o.phases || ['Phase I', 'Phase II', 'Phase III'];
    const livesMax = Math.max(2, o.lives || 4), need = o.hitsPerPhase || 3, dur = o.phaseTime || 15, d0 = o.difficulty ?? 0.5;
    const root = document.createElement('div'); root.className = 'arena-wrap';
    const hud = document.createElement('div'); hud.className = 'arena-hud';
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; cv.className = 'arena-cv'; cv.style.setProperty('--c', col);
    const line = document.createElement('div'); line.className = 'arena-line';
    const btns = document.createElement('div'); btns.className = 'arena-btns';
    const auto = document.createElement('button'); auto.className = 'btn ghost mini'; auto.textContent = 'Auto-resolve';
    btns.append(auto); root.append(h2(o.title), hud, cv, line, btns); document.body.append(root);
    requestAnimationFrame(() => root.classList.add('on'));
    const ctx = cv.getContext('2d');
    const me = { x: W / 2, y: H * 0.75, tx: W / 2, ty: H * 0.75, inv: 0 };
    let lives = livesMax, phase = 0, phaseT = 0, hits = 0, totalHits = 0, haz = [], nextAt = 0.8, mark = null, nextMark = 1.2, last = performance.now(), paused = true, over = false, flash = 0;
    const totalNeed = need * phases.length; let bonus = 0;
    const say = t => { line.textContent = t || ''; line.classList.remove('in'); void line.offsetWidth; line.classList.add('in'); };
    // controls
    const toLocal = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
    cv.addEventListener('pointermove', e => { [me.tx, me.ty] = toLocal(e); });
    cv.addEventListener('pointerdown', e => { [me.tx, me.ty] = toLocal(e); cv.setPointerCapture?.(e.pointerId); });
    const keys = {}; const kd = e => { keys[e.key.toLowerCase()] = e.type === 'keydown'; }; addEventListener('keydown', kd); addEventListener('keyup', kd);
    function drawHud() {
      const pips = Array.from({ length: livesMax }, (_, i) => `<i class="${i < lives ? 'on' : ''}"></i>`).join('');
      const hp = Array.from({ length: need }, (_, i) => `<b class="${i < hits ? 'on' : ''}"></b>`).join('');
      hud.innerHTML = `<span class="lives">${pips}</span><span>Hits ${hp}</span><span>Phase <strong>${phases[phase] || ''}</strong></span><span>${Math.max(0, dur - phaseT).toFixed(1)}s</span><span class="boss"><em style="width:${Math.max(0, 100 - (totalHits + bonus) / totalNeed * 100)}%"></em></span>`;
    }
    function spawn() {
      const d = d0 + phase * 0.18 + phaseT / dur * 0.15; const style = STYLES[o.style] || STYLES.blade;
      const kind = style[Math.floor(Math.random() * style.length)]; const made = P[kind](d, phaseT, me);
      haz.push(...(Array.isArray(made) ? made : [made]));
      nextAt = phaseT + Math.max(0.55, 1.5 - d * 0.6) * rnd(0.8, 1.2);
    }
    function hurt() { if (me.inv > 0) return; lives--; me.inv = 1; flash = 0.35; sfx('heavy'); if (S().screenShake) { root.classList.remove('shake'); void root.offsetWidth; root.classList.add('shake'); } if (lives <= 0) finish('lose'); }
    function nextPhase() {
      paused = true; haz = []; mark = null;
      if (phase >= phases.length - 1 || totalHits + bonus >= totalNeed) return finish('win');
      say(o.lines?.opening || 'An opening.');
      const box = document.createElement('div'); box.className = 'arena-choice';
      box.innerHTML = `<div class="t">${o.lines?.openingTitle || 'An opening'}</div>`;
      const c1 = document.createElement('button'); c1.className = 'btn'; c1.innerHTML = `Press the attack<small>Land a free blow (+${need} hits) — but it may cost you</small>`;
      const c2 = document.createElement('button'); c2.className = 'btn ghost'; c2.innerHTML = `Catch your breath<small>Recover one life</small>`;
      c1.onclick = () => { bonus += need; if (Math.random() < 0.35) { lives = Math.max(1, lives - 1); say('You strike — and take a wound in return.'); } else say('Your blow lands clean.'); sfx('crit'); go(); };
      c2.onclick = () => { lives = Math.min(livesMax, lives + 1); say('You steady your breath.'); go(); };
      const go = () => { box.remove(); phase++; phaseT = 0; hits = 0; nextAt = 0.9; nextMark = 1.2; if (o.lines?.phase?.[phase]) say(o.lines.phase[phase]); paused = false; last = performance.now(); };
      box.append(c1, c2); root.append(box); drawHud();
    }
    function finish(result) {
      if (over) return; over = true; paused = true;
      removeEventListener('keydown', kd); removeEventListener('keyup', kd);
      const bossLeft = Math.max(0, 1 - (totalHits + bonus) / totalNeed);
      say(result === 'win' ? (o.lines?.win || 'It is over.') : (o.lines?.lose || 'You fall.'));
      sfx(result === 'win' ? 'win' : 'lose');
      setTimeout(() => { root.classList.add('out'); setTimeout(() => { root.remove(); done({ result, bossLeft, lives: Math.max(0, lives), livesMax }); }, 450); }, 1500);
    }
    auto.onclick = () => { // accessibility: resolve by stats instead of reflexes
      if (over) return; const p = o.autoChance ?? 0.5; const win = Math.random() < p;
      totalHits = Math.round(totalNeed * (win ? rnd(0.6, 1) : rnd(0.1, 0.5))); lives = win ? Math.max(1, Math.round(livesMax * rnd(0.3, 0.9))) : 0; finish(win ? 'win' : 'lose');
    };
    function frame(now) {
      if (over && !root.isConnected) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!paused) {
        phaseT += dt; me.inv = Math.max(0, me.inv - dt); flash = Math.max(0, flash - dt);
        // movement: follow pointer with max speed, or keys
        const kx = (keys.arrowright || keys.d ? 1 : 0) - (keys.arrowleft || keys.a ? 1 : 0), ky = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0);
        if (kx || ky) { me.tx = me.x + kx * 40; me.ty = me.y + ky * 40; }
        const dx = me.tx - me.x, dy = me.ty - me.y, dd = Math.hypot(dx, dy), sp = 420 * dt;
        if (dd > 0.5) { const m = Math.min(1, sp / dd); me.x += dx * m; me.y += dy * m; }
        me.x = Math.max(8, Math.min(W - 8, me.x)); me.y = Math.max(8, Math.min(H - 8, me.y));
        if (phaseT >= nextAt) spawn();
        if (!mark && phaseT >= nextMark) mark = { x: rnd(60, W - 60), y: rnd(50, H - 50), t: phaseT };
        if (mark && dist(me.x, me.y, mark.x, mark.y) < 22) { hits++; totalHits++; mark = null; nextMark = phaseT + rnd(1.4, 2.4); sfx('hit'); if (hits >= need) { say(o.lines?.stagger || 'They stagger.'); return requestAnimationFrame(t => { nextPhase(); requestAnimationFrame(frame); }); } }
        if (mark && phaseT - mark.t > 2.6) { mark = null; nextMark = phaseT + 0.8; }
        for (const z of haz) { const t = phaseT - z.t0 - z.warn; if (t >= 0 && t <= z.live && z.hit(me.x, me.y, t)) { hurt(); break; } }
        haz = haz.filter(z => phaseT - z.t0 < z.warn + z.live + 0.1);
        if (phaseT >= dur && !over) { say(o.lines?.timeout || 'The moment passes.'); nextPhase(); }
      }
      // draw
      ctx.fillStyle = '#07060b'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#ffffff08'; ctx.lineWidth = 1; for (let x = 0; x < W; x += 32) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = 0; y < H; y += 32) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      for (const z of haz) { const t = phaseT - z.t0; if (t < 0) continue; const on = t >= z.warn; z.draw(ctx, on ? t - z.warn : t, on, on ? 1 : t / z.warn, col); }
      if (mark) { const k = (phaseT - mark.t); ctx.save(); ctx.strokeStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 12; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(mark.x, mark.y, 14 + Math.sin(k * 6) * 3, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(mark.x - 6, mark.y); ctx.lineTo(mark.x + 6, mark.y); ctx.moveTo(mark.x, mark.y - 6); ctx.lineTo(mark.x, mark.y + 6); ctx.stroke(); ctx.restore(); }
      ctx.save(); ctx.globalAlpha = me.inv > 0 && Math.floor(me.inv * 12) % 2 ? 0.35 : 1; ctx.shadowColor = '#bfe8ff'; ctx.shadowBlur = 18; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(me.x, me.y, 7, 0, 7); ctx.fill(); ctx.restore();
      if (flash > 0) { ctx.fillStyle = `rgba(255,40,40,${flash})`; ctx.fillRect(0, 0, W, H); }
      if (paused && !over && phase === 0 && phaseT === 0) { ctx.fillStyle = '#ffffffcc'; ctx.font = '16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Move with your mouse / finger (or WASD). Dodge the light. Touch the bright marks to strike.', W / 2, H / 2 - 10); ctx.fillText('Click to begin', W / 2, H / 2 + 18); }
      drawHud(); if (!over || root.isConnected) requestAnimationFrame(frame);
    }
    function h2(t) { const e = document.createElement('div'); e.className = 'arena-title'; e.textContent = t || ''; return e; }
    say(o.lines?.intro || ''); drawHud();
    const start = () => { if (!paused || over || phaseT > 0) return; paused = false; last = performance.now(); if (o.lines?.phase?.[0]) say(o.lines.phase[0]); };
    cv.addEventListener('pointerdown', start); addEventListener('keydown', function k1(e) { if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'enter'].includes(e.key.toLowerCase())) { start(); removeEventListener('keydown', k1); } });
    if (fast) setTimeout(start, 600);
    requestAnimationFrame(frame);
  });
}
