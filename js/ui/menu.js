// Main menu: pixel city at night, the ink-cat logo, an ink-fade title, save slots and cloud saves.
import { h } from './dom.js';
import { SLOTS, META, deleteSlot } from '../core/state.js';
import { portraitFor } from './portrait.js';
import { REALMS } from '../data/realms.js';
import { COUNTRIES } from '../data/countries.js';
import { flagEl } from './flags.js';
import { choice, toast } from './modal.js';
import { fx } from './fx.js';
import { VERSION } from '../version.js';
import { playStation } from '../audio/music.js';
import { S } from '../settings.js';
import { cloud, cloudConfigured, cloudLinked, connect, syncNow, disconnect } from '../net/cloud.js';

let raf = null;
// ---- procedural city skyline (original pixel art drawn every frame at low resolution)
function cityCanvas() {
  const cv = h('canvas', { class: 'menu-city' }); const ctx = cv.getContext('2d');
  const W = 320, H = 180; cv.width = W; cv.height = H;
  const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(42);
  const layers = [0.025, 0.06, 0.12].map((speed, li) => ({ speed, b: Array.from({ length: 40 }, (_, i) => ({ x: i * (14 + li * 6), w: 10 + Math.floor(rnd() * (12 + li * 8)), h: 30 + Math.floor(rnd() * (50 + li * 35)), lit: Array.from({ length: 60 }, () => rnd() < 0.35), sign: rnd() < 0.12 ? ['#ff2f6a', '#2fe0ff', '#ffd23f'][Math.floor(rnd() * 3)] : null })) }));
  const drops = Array.from({ length: 70 }, () => ({ x: rnd() * W, y: rnd() * H, v: 1.5 + rnd() * 2 }));
  let t = 0;
  const draw = () => {
    t++; const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#07060f'); g.addColorStop(0.6, '#1a0f2a'); g.addColorStop(1, '#3a1a20');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f3e6c8'; ctx.beginPath(); ctx.arc(250, 38, 14, 0, 7); ctx.fill(); ctx.fillStyle = '#07060f'; ctx.beginPath(); ctx.arc(256, 34, 13, 0, 7); ctx.fill(); // crescent
    layers.forEach((L, li) => {
      const span = L.b.reduce((s, b) => Math.max(s, b.x + b.w), 0) + 20;
      for (const b of L.b) {
        const x = Math.floor(((b.x - t * L.speed) % span + span) % span) - 20, y = H - b.h;
        ctx.fillStyle = ['#120d1f', '#1b1330', '#24183a'][li]; ctx.fillRect(x, y, b.w, b.h);
        if (li > 0) { let k = 0; for (let wy = y + 4; wy < H - 4; wy += 5) for (let wx = x + 2; wx < x + b.w - 2; wx += 4) { if (b.lit[k++ % 60] && (t / 90 + k) % 37 > 1) { ctx.fillStyle = li === 2 ? '#ffcf6a' : '#a0702a'; ctx.fillRect(wx, wy, 2, 2); } } }
        if (b.sign && li === 2) { ctx.fillStyle = b.sign; ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t / 15 + b.x); ctx.fillRect(x + 2, y + 6, b.w - 4, 3); ctx.globalAlpha = 1; }
      }
    });
    ctx.fillStyle = '#9ab0ff55'; for (const d of drops) { d.y += d.v; d.x -= d.v * 0.3; if (d.y > H) { d.y = -4; d.x = Math.random() * W + 20; } ctx.fillRect(d.x, d.y, 1, 3); }
    raf = requestAnimationFrame(draw);
  };
  draw(); return cv;
}

const ago = ms => { const m = Math.round((Date.now() - ms) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };

export function showMenu(onPlay) {
  cancelAnimationFrame(raf);
  document.getElementById('menu')?.remove();
  document.getElementById('app').style.display = 'none';
  const slots = [...SLOTS.list].sort((a, b) => (b.updated || 0) - (a.updated || 0));
  const active = slots.find(s => s.id === SLOTS.active) || slots[0];
  const go = id => { fx('click'); leave(() => onPlay(id)); };
  const cloudBox = h('div', { class: 'menu-cloud' });
  const drawCloud = () => {
    if (!cloudConfigured()) return cloudBox.replaceChildren(h('span', { class: 'muted small' }, '☁ Cloud saves are not set up on this site yet.'));
    const linked = cloudLinked();
    cloudBox.replaceChildren(
      h('button', { class: 'btn ghost', onclick: async () => { try { cloud.status = 'syncing'; drawCloud(); linked ? await syncNow() : await connect(); toast('Cloud save synced ✓'); rebuild(); } catch (e) { toast('Cloud: ' + e.message); drawCloud(); } } },
        h('span', { class: 'g-logo' }, 'G'), linked ? ' Sync with Google now' : ' Connect with Google'),
      h('span', { class: 'muted small' }, cloud.status === 'syncing' ? 'Syncing…' : cloud.status === 'error' ? `⚠ ${cloud.error}` : linked ? `Linked${cloud.last ? ' · synced ' + ago(cloud.last) : ''}. Your local saves are always kept.` : 'Back up and sync your saves. Connecting never deletes local progress.'),
      linked ? h('button', { class: 'btn ghost mini', onclick: () => { disconnect(); drawCloud(); } }, 'Unlink') : null);
  };
  const rebuild = () => showMenu(onPlay);
  drawCloud();
  const slotCard = s => h('div', { class: 'slot' + (s.id === active?.id ? ' current' : '') + (s.alive === false ? ' dead' : '') },
    h('div', { class: 'pframe' }, portraitFor({ genes: s.genes, age: s.age, gender: s.gender, realm: s.realm, hair: s.hair }, 56)),
    h('div', { class: 'slot-info' }, h('b', {}, flagEl(s.country), ' ', s.name),
      h('div', { class: 'muted small' }, `Age ${s.age} · ${s.realm ? REALMS[s.realm].name + ' ' + s.stage : 'Mortal'}${s.gen > 1 ? ` · Gen ${s.gen}` : ''}${s.alive === false ? ' · ✝ deceased' : ''}`),
      h('div', { class: 'muted small' }, ago(s.updated || 0))),
    h('div', { class: 'slot-btns' }, h('button', { class: 'btn', onclick: () => go(s.id) }, s.alive === false ? 'Legacy' : 'Play'),
      h('button', { class: 'btn ghost mini', title: 'Delete', onclick: async () => {
        const ok = await choice({ title: `Delete ${s.name}?`, text: 'This slot will be gone for good on this device. Legacy points, perks and your codex are shared and stay.', options: [{ label: 'Delete forever', value: true }, { label: 'Keep it', value: false, ghost: true }] });
        if (ok) { deleteSlot(s.id); rebuild(); } } }, '🗑')));
  const title = h('h1', { class: 'menu-title' }, [...'Fading Ink'].map((ch, i) => h('span', { style: { animationDelay: (0.15 + i * 0.09) + 's' } }, ch === ' ' ? ' ' : ch)));
  const root = h('div', { id: 'menu' }, cityCanvas(), h('div', { class: 'menu-vignette' }),
    h('div', { class: 'menu-inner' },
      h('div', { class: 'menu-brand' }, h('img', { class: 'menu-logo', src: 'assets/logo.png', alt: 'Fading Ink logo' }), title, h('div', { class: 'menu-sub' }, 'a life written in fading ink')),
      h('div', { class: 'menu-actions' },
        active ? h('button', { class: 'btn big', onclick: () => go(active.id) }, active.alive === false ? '▶ Continue legacy' : `▶ Continue — ${active.name.split(' ')[0]}`) : null,
        h('button', { class: 'btn big' + (active ? ' ghost' : ''), onclick: () => go(null) }, '✒ New life')),
      slots.length ? h('div', { class: 'menu-slots' }, h('div', { class: 'menu-h' }, `Save slots (${slots.length})`), slots.map(slotCard)) : null,
      cloudBox,
      h('div', { class: 'menu-foot muted small' }, `v${VERSION} · Legacy ${META.legacy} · ${META.lives} lives lived`)));
  document.body.append(root);
  // menu theme (browsers only allow sound after the first click/tap)
  const startMenuMusic = () => { if (document.getElementById('menu') && S().musicOn) playStation('menu'); };
  startMenuMusic(); addEventListener('pointerdown', startMenuMusic, { once: true });
}
function leave(then) {
  const m = document.getElementById('menu'); if (!m) return then();
  const wipe = h('div', { class: 'ink-wipe' }); document.body.append(wipe);
  setTimeout(() => { cancelAnimationFrame(raf); m.remove(); document.getElementById('app').style.display = ''; then(); if (S().musicOn) playStation(S().station); }, 650);
  setTimeout(() => wipe.remove(), 1400);
}
