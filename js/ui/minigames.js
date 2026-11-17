// Combat mini-games. Each enemy type has its own "special" you can try once per fight.
// Every game draws into a box and resolves to true (success) or false.
import { h, icon } from './dom.js';
import { sfx } from '../audio/sfx.js';
import { ri } from '../core/rng.js';
import { howTo } from './howTo.js';

export const MINIS = {
  seal:      { name: 'Seal Talisman', icon: 'talisman', vs: 'spirits', how: 'Memorise the glowing runes, then press them in the same order.', win: 'Spirit sealed: it loses 30% of its HP and is stunned.' },
  dodge:     { name: 'Read & Dodge', icon: 'kick', vs: 'beasts & brawlers', how: 'Tap each target before it vanishes.', win: 'Perfect dodge: full momentum and you are hard to hit next turn.' },
  qi_clash:  { name: 'Qi Clash', icon: 'lightning', vs: 'cultivators & tribulations', how: 'Stop the marker inside the bright zone. Three tries, need two.', win: 'Your Qi overpowers theirs: a huge hit (25% of their HP). Fail and the backlash hurts you.' },
  breath:    { name: 'Hold Your Breath', icon: 'water', vs: 'jiangshi & drowned dead', how: 'They hunt by breath. Hold the button for between 2 and 3 seconds, then let go.', win: 'It loses you: stunned for 2 turns.' },
  weakpoint: { name: 'Find the Weak Point', icon: 'eye', vs: 'golems, giants & dragons', how: 'One tile flashes. Remember it and pick it.', win: 'Weak point exposed: +50% damage for the rest of the fight.' },
};

const wait = ms => new Promise(r => setTimeout(r, ms));
const RUNES = ['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷'];

export function playMini(kind, box, difficulty = 1) { return howTo('mini:' + kind).then(() => playMini0(kind, box, difficulty)); } // v0.9.24
function playMini0(kind, box, difficulty = 1) {
  const M = MINIS[kind];
  return new Promise(async resolve => {
    const done = ok => { sfx(ok ? 'win' : 'fail'); status.textContent = ok ? 'Success!' : 'Failed…'; setTimeout(() => resolve(ok), 700); };
    const status = h('div', { class: 'mg-status' }, M.how);
    const area = h('div', { class: 'mg-area' });
    box.replaceChildren(h('div', { class: 'mg' }, h('div', { class: 'mg-title' }, icon(M.icon, 'sm'), ' ', M.name), status, area));

    if (kind === 'seal') { // sequence memory
      const len = 3 + difficulty; const seq = Array.from({ length: len }, () => ri(0, 7));
      const btns = RUNES.map((r, i) => h('button', { class: 'mg-rune', disabled: true }, r)); area.append(h('div', { class: 'mg-grid4' }, btns));
      await wait(500);
      for (const i of seq) { btns[i].classList.add('lit'); sfx('click'); await wait(520); btns[i].classList.remove('lit'); await wait(160); }
      status.textContent = 'Your turn!'; let pos = 0;
      btns.forEach((b, i) => { b.disabled = false; b.onclick = () => { if (i === seq[pos]) { sfx('click'); b.classList.add('lit'); setTimeout(() => b.classList.remove('lit'), 150); if (++pos === seq.length) { btns.forEach(x => x.disabled = true); done(true); } } else { btns.forEach(x => x.disabled = true); done(false); } }; });
    }

    if (kind === 'dodge') { // reaction targets
      const field = h('div', { class: 'mg-field' }); area.append(field); let hits = 0; const total = 5;
      for (let n = 0; n < total; n++) {
        const t = h('button', { class: 'mg-target', style: { left: ri(5, 80) + '%', top: ri(5, 70) + '%' } }, '✦');
        let got = false; t.onclick = () => { got = true; sfx('hit'); t.remove(); };
        field.append(t); await wait(Math.max(520, 900 - difficulty * 120)); if (!got) t.remove(); else hits++;
        status.textContent = `${hits}/${total}`; await wait(150);
      }
      done(hits >= total - 1);
    }

    if (kind === 'qi_clash') { // timing bar
      let wins = 0, tries = 0; const bar = h('div', { class: 'mg-bar' }); const zone = h('i', { class: 'mg-zone' }); const mark = h('b', { class: 'mg-mark' }); bar.append(zone, mark);
      const btn = h('button', { class: 'btn' }, 'STRIKE'); area.append(bar, btn);
      // speed in % of the bar per second (time-based, so it's the same on 60Hz and 144Hz screens)
      let x = 0, dir = 1, raf, last = performance.now(); const speed = 32 + difficulty * 8;
      const placeZone = () => { const w = Math.max(14, 24 - difficulty * 3); zone.style.left = ri(10, 85 - w) + '%'; zone.style.width = w + '%'; zone.dataset.l = parseFloat(zone.style.left); zone.dataset.w = w; };
      placeZone();
      const tick = now => { const dt = Math.min(0.05, ((now || performance.now()) - last) / 1000); last = now || performance.now(); x += dir * speed * dt; if (x >= 100) { x = 100; dir = -1; } if (x <= 0) { x = 0; dir = 1; } mark.style.left = x + '%'; raf = requestAnimationFrame(tick); }; tick();
      btn.onclick = () => {
        const l = +zone.dataset.l, w = +zone.dataset.w; const ok = x >= l && x <= l + w; tries++; if (ok) wins++; sfx(ok ? 'qi' : 'miss');
        status.textContent = `${wins} / ${tries} (need 2 of 3)`; placeZone();
        if (wins >= 2 || tries - wins >= 2) { cancelAnimationFrame(raf); btn.disabled = true; done(wins >= 2); }
      };
    }

    if (kind === 'breath') { // hold for 2–3 s
      const meter = h('div', { class: 'mg-bar' }); const fill = h('i', { class: 'mg-fill' }); const z = h('i', { class: 'mg-zone', style: { left: '50%', width: '25%' } }); meter.append(z, fill);
      const btn = h('button', { class: 'btn mg-hold' }, 'Hold…'); area.append(meter, btn);
      let start = 0, raf; const max = 4000;
      const tick = () => { const t = performance.now() - start; fill.style.width = Math.min(100, t / max * 100) + '%'; if (t > max) return end(); raf = requestAnimationFrame(tick); };
      const end = () => { if (!start) return; cancelAnimationFrame(raf); const t = performance.now() - start; start = 0; btn.disabled = true; done(t >= 2000 && t <= 3000); };
      btn.addEventListener('pointerdown', e => { e.preventDefault(); if (btn.disabled) return; start = performance.now(); btn.textContent = 'Holding…'; tick(); });
      btn.addEventListener('pointerup', end); btn.addEventListener('pointerleave', end);
    }

    if (kind === 'weakpoint') { // memory flash
      const size = 9 + (difficulty > 1 ? 7 : 0), cols = size > 9 ? 4 : 3; const target = ri(0, size - 1);
      const tiles = Array.from({ length: size }, () => h('button', { class: 'mg-tile', disabled: true }));
      area.append(h('div', { class: 'mg-grid', style: { gridTemplateColumns: `repeat(${cols}, 1fr)` } }, tiles));
      await wait(500); tiles[target].classList.add('lit'); sfx('click'); await wait(Math.max(250, 600 - difficulty * 120)); tiles[target].classList.remove('lit');
      await wait(250); status.textContent = 'Where was it?';
      tiles.forEach((t, i) => { t.disabled = false; t.onclick = () => { tiles.forEach(x => x.disabled = true); tiles[target].classList.add('lit'); done(i === target); }; });
    }
  });
}
