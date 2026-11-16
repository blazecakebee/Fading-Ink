// v0.9.4 Fable Quests: an immersive story window, the Fables tab, and the glyph-lock puzzle.
import { h, icon } from './dom.js';
import { openModal, toast } from './modal.js';
import { fx } from './fx.js';
import { G, save } from '../core/state.js';
import * as FB from '../systems/fables.js';

const fmtPct = p => Math.round(p * 100) + '%';

export async function openFable(id) {
  const c = G.char, F = FB.FABLE[id]; if (!c?.alive || !F) return;
  const st = FB.fableStatus(c, F); if (!st.ok) return toast(st.why);
  const feed = h('div', { class: 'fb-feed' }), act = h('div', { class: 'fb-act' });
  const hpFill = h('i'), hpTxt = h('b');
  const hp = () => { const v = Math.max(0, Math.round(c.stats.health)); hpFill.style.width = v + '%'; hpTxt.textContent = `${v}`; };
  const m = openModal([
    h('div', { class: 'fb-head' }, h('span', { class: 'fb-ic' }, icon(F.icon, 'lg')), h('div', {}, h('div', { class: 'fb-kicker' }, 'Fable Quest'), h('h2', { class: 'display' }, F.name)),
      h('div', { class: 'fb-meta' }, h('span', { class: 'fb-frozen' }, '⏸ Time stands still'), h('span', { class: 'fb-hp' }, icon('health', 'sm'), h('span', { class: 'fb-hpbar' }, hpFill), hpTxt))),
    h('div', { class: 'fb-warn' }, 'Death inside a Fable is permanent. Injuries and choices follow you home.'),
    feed, act], { cls: 'fable-modal', dismiss: false });
  m.box.style.setProperty('--fc', F.color); hp();
  const scroll = () => requestAnimationFrame(() => { feed.scrollTop = feed.scrollHeight; });
  const UI = {
    say(lines, cls = '') { const blk = h('div', { class: 'fb-block ' + cls }, lines.map(t => h('p', {}, t))); feed.append(blk); hp(); scroll(); },
    note(text, cls = '') { if (!text) return; feed.append(h('div', { class: 'fb-note ' + cls }, text)); hp(); scroll(); },
    hide() { m.back.style.display = 'none'; }, show() { m.back.style.display = ''; hp(); },
    choose(opts) {
      return new Promise(res => {
        act.replaceChildren(h('div', { class: 'fb-opts' }, opts.map((o, i) => h('button', { class: 'fb-opt' + (o.leave ? ' leave' : '') + (o.boss ? ' boss' : o.fight ? ' fight' : ''), onclick: () => {
          fx('click'); act.replaceChildren(); feed.append(h('div', { class: 'fb-you' }, '› ' + o.label)); scroll(); res(i); } },
          h('span', { class: 'fb-lbl' }, o.label),
          o.chance != null ? h('span', { class: 'fb-tag check', style: { '--p': fmtPct(o.chance) } }, `${o.stat} · ${fmtPct(o.chance)}`) :
          o.boss ? h('span', { class: 'fb-tag boss' }, '☠ Boss fight') : o.fight ? h('span', { class: 'fb-tag fight' }, '⚔ Fight') :
          o.leave ? h('span', { class: 'fb-tag' }, 'Seals it 3 years') : null))));
        scroll();
      });
    },
    puzzle(P, penalise) {
      return new Promise(res => {
        let pick = [], tries = P.tries;
        const slots = h('div', { class: 'fb-slots' }), info = h('div', { class: 'muted small' });
        const draw = () => { slots.replaceChildren(...P.answer.map((_, i) => h('span', { class: 'fb-slot' + (pick[i] ? ' on' : '') }, pick[i] || ''))); info.textContent = `Tap the glyphs in the right order. Tries left: ${tries}. Each wrong order costs Health.`; };
        const btns = P.glyphs.map(g => h('button', { class: 'fb-glyph', onclick: e => { if (pick.includes(g)) return; fx('click'); pick.push(g); e.currentTarget.disabled = true; draw();
          if (pick.length === P.answer.length) {
            const ok = pick.every((x, i) => x === P.answer[i]);
            if (ok) { act.replaceChildren(); UI.note('The lock opens.', 'good'); fx('milestone'); return res(true); }
            tries--; const alive = penalise(P.pen); if (!alive) { act.replaceChildren(); return res(false); }
            if (tries <= 0) { act.replaceChildren(); UI.note('The lock seals for good.', 'bad'); return res(false); }
            slots.classList.add('shake'); setTimeout(() => slots.classList.remove('shake'), 400); pick = []; btns.forEach(b => b.disabled = false); draw(); } } }, g));
        draw(); act.replaceChildren(h('div', { class: 'fb-puzzle' }, slots, h('div', { class: 'fb-glyphs' }, btns), info,
          h('button', { class: 'btn ghost mini', onclick: () => { pick = []; btns.forEach(b => b.disabled = false); draw(); } }, 'Clear')));
        scroll();
      });
    },
    done(got, tier) {
      act.replaceChildren(h('div', { class: 'fb-reward' }, h('h3', {}, tier === 'best' ? 'Best ending' : tier === 'dark' ? 'It followed you home' : 'Fable complete'), h('ul', {}, got.map(g => h('li', {}, g)))));
    },
  };
  const result = await FB.playFable(c, id, UI);
  save(); hp();
  act.append(h('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '10px' } }, h('button', { class: 'btn', onclick: async () => {
    m.close(); const R = await import('./render.js'); R.render(); if (!c.alive) import('./legacyPanel.js').then(x => x.deathScreen()); } }, result === 'dead' ? 'Accept your fate' : 'Return to the world')));
  scroll();
}

export function fablesTab() {
  const c = G.char, S = c.fables || { done: [], titles: [], scars: [] }, fame = c.fame || 0, open = FB.fablesOpen(c);
  return [h('h2', { class: 'display' }, 'Fables'),
    h('p', { class: 'muted' }, 'Legendary stories that open only to the most famous people alive. Inside a Fable time stands still: you don\'t age and your stats don\'t fade, but you can\'t use actions either. Every Fable mixes choices, skill checks, puzzles and fights. If you die inside one, your life ends. You can turn back at the first scene, but the Fable then closes for three years.'),
    !open ? h('div', { class: 'card fb-lock' }, h('b', {}, `Fame ${fame.toLocaleString()} / ${FB.FABLE_FAME.toLocaleString()}`), h('div', { class: 'bar' }, h('i', { style: { width: Math.min(100, fame / FB.FABLE_FAME * 100) + '%' } })),
      h('div', { class: 'muted small' }, 'Clear high Gates, hunt bounties and finish Hunts to spread your name.')) : null,
    c.fableRun ? h('div', { class: 'card fb-resume' }, h('b', {}, `You are inside ${FB.FABLE[c.fableRun.id].name}.`), h('div', { class: 'muted small' }, 'Time is frozen until you finish or die.'),
      h('button', { class: 'btn', onclick: () => openFable(c.fableRun.id) }, 'Resume the Fable')) : null,
    h('div', { class: 'grid2 fb-grid' }, FB.FABLES.map(F => { const s = FB.fableStatus(c, F), done = (S.done || []).includes(F.id);
      const el = h('div', { class: 'card fb-card' + (done ? ' done' : '') + (s.ok ? '' : ' locked') },
        h('div', { class: 'row', style: { gap: '10px', alignItems: 'center' } }, h('span', { class: 'fb-ic' }, icon(F.icon)), h('div', {}, h('b', {}, F.name), h('div', { class: 'muted small' }, F.blurb))),
        h('div', { class: 'small fb-title-line' }, `Title: ${FB.TITLES[F.id].name} — ${FB.TITLES[F.id].desc}`),
        done ? h('div', { class: 'small', style: { color: F.color } }, '✓ Finished this life') :
          s.ok ? h('button', { class: 'btn mini', onclick: () => openFable(F.id) }, c.fableRun?.id === F.id ? 'Resume' : 'Enter the Fable') : h('div', { class: 'muted small' }, s.why));
      el.style.setProperty('--fc', F.color); return el; })),
    (S.titles || []).length ? h('div', { class: 'box', style: { marginTop: '14px' } }, h('h3', {}, 'Your titles (all active)'),
      S.titles.map(t => { const T = FB.TITLES[t]; const el = h('div', { class: 'fb-titlechip' }, h('b', {}, T.name), h('span', { class: 'muted small' }, ' ' + T.desc)); el.style.setProperty('--fc', T.color); return el; })) : null,
    (S.scars || []).length ? h('div', { class: 'box', style: { marginTop: '10px' } }, h('h3', {}, 'What the Fables left on you'), S.scars.map(x => h('div', { class: 'small', style: { margin: '4px 0' } }, h('b', {}, x.name), ' — ', x.desc))) : null];
}
