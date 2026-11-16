// v0.8.5 Qi badges (glyph on a gradient of the Qi's colours, framed by rarity) and in-fight Qi bursts.
import { h } from './dom.js';
import { QI, RARITY, compatible, SECOND_REALM, FUSE_REALM } from '../data/qitypes.js';
import { qiOf, formName, formRarity, formFx, refineInfo, fuseInfo } from '../systems/qitype.js';
import { REALMS } from '../data/realms.js';
import { fxHost } from './moveFx.js';

export function qiBadge(f, size = 34, fusedWith = null) {
  const T = QI[f.type], r = RARITY[formRarity(f)], c2 = fusedWith ? QI[fusedWith.type].colors[0] : T.colors[1];
  const el = h('span', { class: 'qibadge' + (r === RARITY.mythic ? ' mythic' : ''), title: `${formName(f)} · ${r.name}`, style: { width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.55) + 'px' } },
    fusedWith ? `${T.glyph}${QI[fusedWith.type].glyph}` : T.glyph);
  el.style.setProperty('--q1', T.colors[0]); el.style.setProperty('--q2', c2); el.style.setProperty('--qr', r.color);
  if (fusedWith) el.style.fontSize = Math.round(size * 0.36) + 'px';
  return el;
}
const FX_TXT = { dmg: v => `+${Math.round(v * 100)}% Qi technique damage`, burn: v => `${Math.round(v * 100)}% chance to burn`, heal: v => `heal ${Math.round(v * 100)}% of damage dealt`, drain: v => `drain ${Math.round(v * 100)}% of damage`, pierce: v => `${Math.round(v * 100)}% chance to ignore guard`, stun: v => `${Math.round(v * 100)}% stun chance`, evade: v => `${Math.round(v * 100)}% chance to become hard to hit`, crit: v => `+${Math.round(v * 100)}% crit`, init: v => `+${Math.round(v)} initiative`, hp: v => `+${Math.round(v * 100)}% HP in fights`, holy: v => `+${Math.round(v * 100)}% vs spirits & demons` };
export const fxLine = fx => Object.entries(fx).filter(([, v]) => v).map(([k, v]) => FX_TXT[k]?.(v)).filter(Boolean).join(' · ');

function formCard(f, label, extra) {
  const T = QI[f.type], r = RARITY[formRarity(f)];
  return h('div', { class: 'card row', style: { alignItems: 'flex-start' } }, qiBadge(f, 46),
    h('div', { style: { flex: 1 } }, h('div', { class: 'muted small' }, label), h('b', {}, formName(f)), h('span', { class: 'small', style: { color: r.color, marginLeft: '6px' } }, r.name),
      h('div', { class: 'small' }, f.perm ? T.perms[f.perm - 1].desc : T.desc), h('div', { class: 'muted small', style: { marginTop: '4px' } }, fxLine(formFx(f)) || '—'),
      h('div', { class: 'muted small' }, `Path: ${[T.name, ...T.perms.map(p => p.name)].map((n, i) => i <= (f.perm || 0) ? n : '???').join(' → ')}`), extra || null));
}
// the "Your Qi" box on the Cultivation tab
export function qiPanel(c) {
  const q = qiOf(c);
  if (!q) return h('div', { class: 'box', style: { marginTop: '14px' } }, h('h3', {}, 'Your Qi'), h('div', { class: 'muted' }, c.qi.realm ? 'Your Qi is still settling. It will reveal its nature by the end of the year.' : 'Reach Qi Refining and your Qi will awaken. What it becomes depends on how you have lived.'));
  const R = refineInfo(c), F = fuseInfo(c);
  return h('div', { class: 'box', style: { marginTop: '14px' } }, h('h3', {}, 'Your Qi'),
    q.fused && q.secondary ? h('div', { class: 'row', style: { marginBottom: '8px' } }, qiBadge(q.primary, 40, q.secondary), h('div', {}, h('b', {}, q.fusedName), h('div', { class: 'muted small' }, 'Fused: your second Qi adds 80% of its power to every Qi technique.'))) : null,
    h('div', { class: 'grid2' }, formCard(q.primary, 'Primary Qi', R?.done ? h('div', { class: 'small good' }, 'Fully refined.') : R ? h('div', { class: 'small' }, R.ok ? `Next: refine at ${Math.round(R.p * 100)}% (once a year, Cultivation actions)` : `Next permutation unlocks at ${REALMS[R.need].name}.`) : null),
      q.secondary ? formCard(q.secondary, q.fused ? 'Second Qi (fused)' : 'Second Qi (not fused: half passives, no combat effect)',
        F ? h('div', { class: 'small' + (F.ok ? '' : ' bad') }, F.ok ? (F.realmOk ? `Fusion possible: ${F.name} (${Math.round(F.p * 100)}%)` : `Can fuse into ${F.name} at ${REALMS[FUSE_REALM].name}.`) : 'These two Qi clash. Only Chaos Qi can fuse opposites.') : null)
        : h('div', { class: 'card muted small' }, `A second Qi can awaken at ${REALMS[SECOND_REALM].name}. Some pairs can later fuse at ${REALMS[FUSE_REALM].name}; opposites (Fire/Water, Yin/Yang, Righteous/Demonic…) never can — unless one is Chaos.`)));
}
// burst of Qi-coloured particles over an element (fight screen)
export function qiBurst(target, colors, big) {
  if (!target) return; const layer = fxHost(target), o = layer.getBoundingClientRect(), r0 = target.getBoundingClientRect(); const k = (o.width / (layer.offsetWidth || o.width)) || 1; const r = { left: (r0.left - o.left) / k, top: (r0.top - o.top) / k + (layer.parentElement?.scrollTop || 0), width: r0.width / k, height: r0.height / k };
  for (let i = 0; i < (big ? 18 : 10); i++) {
    const p = h('div', { class: 'qi-spark' }); const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * (big ? 70 : 45);
    p.style.left = (r.left + r.width / 2) + 'px'; p.style.top = (r.top + r.height / 2) + 'px';
    p.style.setProperty('--dx', Math.cos(a) * d + 'px'); p.style.setProperty('--dy', Math.sin(a) * d + 'px'); p.style.setProperty('--qc', colors[i % colors.length]);
    layer.append(p); setTimeout(() => p.remove(), 700);
  }
  target.style.setProperty('--qglow', colors[0]); target.classList.remove('qi-hit'); void target.offsetWidth; target.classList.add('qi-hit');
}
