// v0.9.4 Gate Breach lane defence. Five lanes, nine columns. Place formations with Qi, hold three city wards.
// Resolves { win, leaks, fled }.
import { h, icon } from './dom.js';
import { openModal } from './modal.js';
import { fx } from './fx.js';
import { howTo } from './howTo.js';
import { effRealm } from '../systems/path.js';
import { GATE_RANKS } from '../data/combat.js';

const ROWS = 5, COLS = 9;
export const DEF = {
  well:    { name: 'Qi Well',          cost: 50,  cd: 6,  hp: 300,  glyph: '◎', desc: 'Makes 25 Qi every 9s.' },
  sword:   { name: 'Sword Formation',  cost: 100, cd: 6,  hp: 300,  glyph: '⚔', desc: 'Fires flying swords down its lane.' },
  barrier: { name: 'Jade Barrier',     cost: 50,  cd: 18, hp: 1400, glyph: '▣', desc: 'A wall. Soaks damage.' },
  frost:   { name: 'Frost Array',      cost: 175, cd: 8,  hp: 300,  glyph: '❄', desc: 'Weaker shots that slow by half.' },
  thunder: { name: 'Thunder Seal',     cost: 150, cd: 30, hp: 1,    glyph: 'ϟ', desc: 'Explodes at once: big damage in a 3×3 area.' },
};
const FOE = {
  ghoul:  { name: 'Gate Ghoul', hp: 190,  spd: 0.26, dps: 40,  glyph: '☠', w: 6 },
  wraith: { name: 'Wraith',     hp: 140,  spd: 0.5,  dps: 30,  glyph: '👻', w: 3 },
  brute:  { name: 'Gate Brute', hp: 680,  spd: 0.17, dps: 85,  glyph: '👹', w: 2 },
  lord:   { name: 'Breach Lord', hp: 2600, spd: 0.14, dps: 170, glyph: '♛', w: 0 },
};
const RANK_MULT = { SSS: 1.15, X: 1.4, Z: 1.75 }, WAVES = { SSS: 3, X: 4, Z: 5 };

export function playBreach(c, rank, opts = {}) { return howTo('breach').then(() => playBreach0(c, rank, opts)); } // v0.9.24
function playBreach0(c, rank, opts = {}) {
  return new Promise(resolve => {
    const R = GATE_RANKS.find(r => r.rank === rank) || GATE_RANKS[7], mult = RANK_MULT[rank] || 1, nWaves = WAVES[rank] || 3;
    const power = 1 + Math.min(0.25, (effRealm(c) || 0) / 16 * 0.25); // a strong cultivator's formations hit a little harder
    const S = { qi: 200, wards: 3, wave: 0, t: 0, prep: 25, spawnLeft: 0, spawnT: 0, done: false, speed: 1, sel: null, cds: {}, grid: [...Array(ROWS)].map(() => Array(COLS).fill(null)), foes: [], shots: [], leaks: 0, nextQi: 7 };
    const board = h('div', { class: 'br-board' }), cells = [];
    for (let r = 0; r < ROWS; r++) for (let col = 0; col < COLS; col++) { const el = h('div', { class: 'br-cell' + ((r + col) % 2 ? ' alt' : ''), onclick: () => place(r, col) }); cells.push(el); board.append(el); }
    const layer = h('div', { class: 'br-layer' }); board.append(layer);
    const qiEl = h('b', {}), waveEl = h('span', {}), wardEl = h('span', { class: 'br-wards' }), msg = h('div', { class: 'br-msg' });
    const cards = Object.entries(DEF).map(([id, d]) => { const cd = h('i', { class: 'br-cd' });
      const el = h('button', { class: 'br-card', title: d.desc, onclick: () => { S.sel = S.sel === id ? null : id; fx('click'); paintCards(); } }, h('span', { class: 'g' }, d.glyph), h('span', { class: 'n' }, d.name), h('span', { class: 'c' }, `${d.cost}`), cd);
      el._id = id; el._cd = cd; return el; });
    const shovel = h('button', { class: 'br-card shovel', title: 'Remove a formation (no refund)', onclick: () => { S.sel = S.sel === 'remove' ? null : 'remove'; paintCards(); } }, h('span', { class: 'g' }, '✕'), h('span', { class: 'n' }, 'Remove'));
    const spdBtn = h('button', { class: 'btn ghost mini', onclick: () => { S.speed = S.speed === 1 ? 2 : 1; spdBtn.textContent = `Speed ×${S.speed}`; } }, 'Speed ×1');
    const m = openModal([
      h('div', { class: 'br-head' }, h('h2', { class: 'display' }, icon('gates', 'lg'), ` ${rank}-rank Gate Breach`), h('div', { class: 'br-stats' }, h('span', { class: 'br-qi' }, '✦ Qi ', qiEl), waveEl, wardEl, spdBtn,
        h('button', { class: 'btn ghost mini danger', onclick: () => end(false, true) }, 'Abandon the city'))),
      h('p', { class: 'muted small' }, 'Monsters pour in from the right. Pick a formation, then tap a square. Anything that reaches the left edge breaks one of your three city wards. Qi trickles in on its own; Qi Wells make more.'),
      h('div', { class: 'br-cards' }, cards, shovel), h('div', { class: 'br-wrap' }, board, msg)], { cls: 'breach-modal', dismiss: false });
    m.box.style.setProperty('--rc', R.color);

    function paintCards() { cards.forEach(el => { const d = DEF[el._id], cd = S.cds[el._id] || 0; el.classList.toggle('on', S.sel === el._id); el.classList.toggle('poor', S.qi < d.cost || cd > 0); el._cd.style.height = cd > 0 ? (cd / d.cd * 100) + '%' : '0'; }); shovel.classList.toggle('on', S.sel === 'remove'); }
    function place(r, col) {
      if (S.done || !S.sel) return; const cur = S.grid[r][col];
      if (S.sel === 'remove') { if (cur) { cur.el.remove(); S.grid[r][col] = null; fx('click'); } return; }
      const d = DEF[S.sel]; if (cur || S.qi < d.cost || (S.cds[S.sel] || 0) > 0) return;
      S.qi -= d.cost; S.cds[S.sel] = d.cd; fx('click');
      if (S.sel === 'thunder') { boom(r, col); S.sel = null; paintCards(); return; }
      const el = h('div', { class: 'br-def ' + S.sel, style: { left: `${col / COLS * 100}%`, top: `${r / ROWS * 100}%` } }, h('span', {}, d.glyph), h('i', { class: 'hpb' }));
      layer.append(el); S.grid[r][col] = { id: S.sel, hp: d.hp, max: d.hp, t: S.sel === 'well' ? 6 : 0.4, el };
      if (!opts.keepSel) S.sel = null; paintCards();
    }
    function boom(r, col) {
      const fl = h('div', { class: 'br-boom', style: { left: `${(col - 1) / COLS * 100}%`, top: `${(r - 1) / ROWS * 100}%` } }); layer.append(fl); setTimeout(() => fl.remove(), 600); fx('heavy');
      for (const f of S.foes) if (Math.abs(f.row - r) <= 1 && Math.abs(f.x - col) <= 1.5) f.hp -= 480 * power;
    }
    function spawn(kind) {
      const F = FOE[kind], row = Math.floor(Math.random() * ROWS), hp = Math.round(F.hp * mult * (1 + S.wave * 0.08));
      const el = h('div', { class: 'br-foe ' + kind }, h('span', {}, F.glyph), h('i', { class: 'hpb' })); layer.append(el);
      S.foes.push({ kind, row, x: COLS - 0.05, hp, max: hp, spd: F.spd * (0.9 + Math.random() * 0.2), dps: F.dps * mult, slow: 0, el });
    }
    function startWave() {
      S.wave++; S.spawnLeft = 3 + S.wave * 4 + (rank === 'Z' ? 2 : 0); S.spawnT = S.wave === 1 ? 4 : 1; S.boss = S.wave === nWaves;
      msg.textContent = S.boss ? 'Final wave — the Breach Lord comes!' : `Wave ${S.wave}`; msg.classList.add('show'); setTimeout(() => msg.classList.remove('show'), 1600); fx(S.boss ? 'heavy' : 'click');
    }
    const pickFoe = () => { const pool = Object.entries(FOE).filter(([k, f]) => f.w && (k !== 'brute' || S.wave >= (rank === 'SSS' ? 3 : 2)) && (k !== 'wraith' || S.wave >= 2)); let n = Math.random() * pool.reduce((s, [, f]) => s + f.w, 0); for (const [k, f] of pool) if ((n -= f.w) < 0) return k; return 'ghoul'; };
    function end(win, fled = false) {
      if (S.done) return; S.done = true; cancelAnimationFrame(raf);
      msg.textContent = win ? 'The breach is sealed.' : fled ? 'You abandoned the city.' : 'The wards have fallen.'; msg.classList.add('show', win ? 'good' : 'bad');
      setTimeout(() => { m.close(); resolve({ win, leaks: S.leaks, fled, wave: S.wave }); }, opts.fast ? 0 : 1800);
    }
    let last = performance.now(), raf;
    function tick(now) {
      let dt = Math.min(0.05, (now - last) / 1000) * S.speed * (opts.timeScale || 1); last = now;
      step(dt); if (opts.timeScale) for (let i = 1; i < (opts.substeps || 1); i++) step(dt);
      if (!S.done) raf = requestAnimationFrame(tick);
    }
    function step(dt) {
      if (S.done) return; S.t += dt;
      S.nextQi -= dt; if (S.nextQi <= 0) { S.nextQi = 7; S.qi += 25; }
      for (const k in S.cds) S.cds[k] = Math.max(0, S.cds[k] - dt);
      if (S.prep > 0) { S.prep -= dt; if (S.prep <= 0) startWave(); }
      else if (S.spawnLeft > 0) { S.spawnT -= dt; if (S.spawnT <= 0) { S.spawnLeft--; spawn(S.boss && S.spawnLeft === 0 ? 'lord' : pickFoe()); S.spawnT = Math.max(1.1, (S.wave === 1 ? 5 : 3.4) - S.wave * 0.35) * (0.7 + Math.random() * 0.6); } }
      else if (!S.foes.length) { if (S.wave >= nWaves) return end(true); S.prep = 8; }
      // formations
      for (let r = 0; r < ROWS; r++) for (let col = 0; col < COLS; col++) { const d = S.grid[r][col]; if (!d) continue;
        d.t -= dt; if (d.t > 0) continue;
        if (d.id === 'well') { d.t = 9; S.qi += 25; const p = h('div', { class: 'br-pop', style: { left: `${col / COLS * 100}%`, top: `${r / ROWS * 100}%` } }, '+25'); layer.append(p); setTimeout(() => p.remove(), 900); }
        else if ((d.id === 'sword' || d.id === 'frost') && S.foes.some(f => f.row === r && f.x >= col - 0.2)) {
          d.t = d.id === 'sword' ? 1.35 : 1.6; const el = h('div', { class: 'br-shot ' + d.id }); layer.append(el);
          S.shots.push({ row: r, x: col + 0.6, dmg: (d.id === 'sword' ? 22 : 15) * power, slow: d.id === 'frost', el }); } else d.t = 0.2; }
      // shots
      for (const s of S.shots) { s.x += 6 * dt; const hit = S.foes.find(f => f.row === s.row && Math.abs(f.x - s.x) < 0.35 && f.hp > 0);
        if (hit) { hit.hp -= s.dmg; if (s.slow) hit.slow = 2.5; s.dead = true; } else if (s.x > COLS + 0.5) s.dead = true;
        s.el.style.left = `${s.x / COLS * 100}%`; s.el.style.top = `${(s.row + 0.5) / ROWS * 100}%`; }
      S.shots = S.shots.filter(s => (s.dead && s.el.remove(), !s.dead));
      // foes
      for (const f of S.foes) { if (f.hp <= 0) continue;
        const col = Math.floor(f.x + 0.15), d = col >= 0 && col < COLS ? S.grid[f.row][col] : null; f.slow = Math.max(0, f.slow - dt);
        if (d && f.x - col < 0.75) { d.hp -= f.dps * dt * (f.slow ? 0.5 : 1); f.el.classList.add('eat'); if (d.hp <= 0) { d.el.remove(); S.grid[f.row][col] = null; } else d.el.lastChild.style.width = (d.hp / d.max * 100) + '%'; }
        else { f.el.classList.remove('eat'); f.x -= f.spd * dt * (f.slow ? 0.5 : 1); }
        if (f.x < -0.3) { f.hp = 0; f.leaked = true; S.wards--; S.leaks++; fx('heavy'); board.classList.add('hurt'); setTimeout(() => board.classList.remove('hurt'), 300); }
        f.el.style.left = `${f.x / COLS * 100}%`; f.el.style.top = `${f.row / ROWS * 100}%`; f.el.lastChild.style.width = Math.max(0, f.hp / f.max * 100) + '%'; f.el.classList.toggle('slowed', f.slow > 0); }
      S.foes = S.foes.filter(f => (f.hp <= 0 && f.el.remove(), f.hp > 0));
      if (S.wards <= 0) return end(false);
      qiEl.textContent = Math.floor(S.qi); waveEl.textContent = S.prep > 0 && S.wave === 0 ? `Prepare: ${Math.ceil(S.prep)}s` : `Wave ${S.wave}/${nWaves}`;
      wardEl.textContent = '●'.repeat(S.wards) + '○'.repeat(3 - S.wards); paintCards();
    }
    S.api = { place: (r, col, id) => { S.sel = id; place(r, col); }, state: S }; if (opts.expose) opts.expose(S.api);
    raf = requestAnimationFrame(tick);
  });
}
