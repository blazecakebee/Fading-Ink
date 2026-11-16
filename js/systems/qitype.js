// v0.8.5 Qi Types: awakening (shaped by your life), refinement into permutations, a second Qi, and fusion.
import { G } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp, weighted } from '../core/rng.js';
import { QI, QI_TYPES, RARITY, compatible, fusedName, SECOND_REALM, FUSE_REALM, PERM_REALMS } from '../data/qitypes.js';
import { REALMS } from '../data/realms.js';
import { onBodyPath } from './path.js';
import { perk } from '../data/legacyTree.js';

const K = r => RARITY[r]?.k || 1;
export const FX_SCALE = 0.4;
export const formRarity = f => f.perm ? QI[f.type].perms[f.perm - 1].rarity : QI[f.type].rarity;
export const formName = f => f.perm ? QI[f.type].perms[f.perm - 1].name : QI[f.type].name;
export const qiOf = c => (!onBodyPath(c) && (c?.qi?.realm || 0) >= 1 && c.qiType) || null;
// combined combat riders of one Qi form (base + every permutation reached), scaled by its rarity
export function formFx(f) {
  const T = QI[f.type], out = { ...T.fx };
  for (let i = 0; i < (f.perm || 0); i++) for (const [k, v] of Object.entries(T.perms[i].fx)) out[k] = (out[k] || 0) + v;
  // tuned by simulation: even a fully refined Mythic Qi is worth ~+10% wins for an average fighter
  const k = K(formRarity(f)) * FX_SCALE; for (const key in out) out[key] *= k * (key === 'stun' ? 0.5 : key === 'init' ? 2.5 : 1); return out;
}
function formPass(f) {
  const T = QI[f.type], parts = [T.pass, ...(T.permPass || []).slice(0, f.perm || 0)], k = K(formRarity(f)), out = {};
  for (const p of parts) for (const [key, v] of Object.entries(p || {})) {
    const mult = ['qi', 'pill', 'heal', 'loot', 'craft', 'train', 'study', 'social', 'stressMult', 'power'].includes(key);
    out[key] = mult ? (out[key] ?? 1) * (1 + (v - 1) * k) : (out[key] || 0) + v * k;
  }
  return out;
}
const scalePass = (p, s) => Object.fromEntries(Object.entries(p).map(([k, v]) => [k, ['breakthrough', 'life'].includes(k) ? v * s : 1 + (v - 1) * s]));
// what your Qi does in a fight: your primary in full; a fused second Qi at 80%; an unfused second Qi does nothing in combat
export function combatFx(c) {
  const q = qiOf(c); if (!q) return {};
  const out = formFx(q.primary);
  if (q.secondary && q.fused) for (const [k, v] of Object.entries(formFx(q.secondary))) out[k] = (out[k] || 0) + v * 0.8;
  return out;
}
// passive bonuses for the bonus system
export function qiPassives(c) {
  const q = qiOf(c); if (!q) return [];
  const out = [formPass(q.primary)];
  if (q.secondary) out.push(scalePass(formPass(q.secondary), q.fused ? 0.8 : 0.5));
  return out;
}
export const qiColors = c => { const q = qiOf(c); if (!q) return ['#cfe3ff', '#ffffff']; return q.fused && q.secondary ? [QI[q.primary.type].colors[0], QI[q.secondary.type].colors[0]] : QI[q.primary.type].colors; };

// ---- awakening: the life you lived decides your Qi
export function awakenQi(c, quiet) {
  if (c.qiType || onBodyPath(c)) return null;
  const n = k => c.counts?.[k] || 0, has = id => (c.temper || []).includes(id);
  const W = {};
  for (const T of QI_TYPES) if (!T.concept && !['legendary', 'mythic'].includes(T.rarity)) W[T.id] = { common: 10, uncommon: 4, rare: 1.6, epic: 0.4 }[T.rarity] || 0;
  const add = (id, w) => { if (W[id] != null) W[id] += w; };
  add(c.qi.elem, 18); // the element you were born leaning toward
  add('fire', n('crafted') * 0.5 + n('alchemy_texts') * 0.5); add('magma', n('crafted') * 0.15);
  add('wood', n('gather') * 0.6 + n('doctor') * 0.4); add('poison', n('alchemy_texts') * 0.3 + n('gather') * 0.15);
  add('demonic', (c.kills || 0) * 2 + (c.sacrifices || 0) * 8 + ((c.qi.methods || []).includes('blood_sea') ? 10 : 0) + (has('psychopath') || has('cruel') ? 8 : 0));
  add('righteous', n('library') * 0.4 + n('study') * 0.2 + (has('honest') || has('kind') || has('devout') ? 8 : 0));
  add('metal', n('gym') * 0.25 + n('combat_drills') * 0.4); add('earth', n('gym') * 0.25 + n('hike') * 0.2);
  add('wind', n('hike') * 0.4 + n('run') * 0.3); add('water', n('fishing') * 0.6 + (has('calm') ? 5 : 0));
  add('ice', ['ru'].includes(c.country) ? 6 : 0); add('lightning', c.flags?.stormBorn ? 25 : 0);
  add('ghost', (c.grief ? 4 : 0) + (c.flags?.rescued ? 6 : 0) + (has('melancholic') ? 5 : 0));
  add('yang', has('hotheaded') || has('brave') ? 4 : 0); add('yin', has('cold') || has('melancholic') ? 4 : 0);
  add('normal', n('meditate') * 0.2);
  const luck = (c.stats.luck || 50) / 50 * (1 + 0.6 * perk('c6')); for (const id in W) if (['rare', 'epic'].includes(QI[id].rarity)) W[id] *= luck;
  const id = weighted(Object.keys(W), k => Math.max(0.01, W[k]));
  c.qiType = { primary: { type: id, perm: 0 }, secondary: null, fused: false, tries: {} };
  if (!quiet) { qiSfx(QI[id].snd); ui.log(`My Qi awakened as ${QI[id].name} (${RARITY[QI[id].rarity].name}). ${QI[id].desc}`, 'qi'); }
  return id;
}

const once = (c, key) => { c.qiType.tries ||= {}; if (c.qiType.tries[key] === G.world.year) return false; c.qiType.tries[key] = G.world.year; return true; };
// ---- refine into the next permutation
export const refineInfo = c => { const q = qiOf(c); if (!q) return null; const f = q.primary, nx = f.perm; if (nx >= 3) return { done: true };
  const need = PERM_REALMS[nx]; return { next: QI[f.type].perms[nx], need, ok: c.qi.realm >= need, p: clamp(0.35 + c.qi.affinity / 300 + c.qi.meridians * 0.01 - nx * 0.06, 0.1, 0.8) }; };
export function refineQi(c) {
  const R = refineInfo(c); if (!R || R.done || !R.ok) return null; if (!once(c, 'refine')) return { text: 'My Qi is still settling from the last attempt. (Once a year)', cls: '' };
  if (chance(R.p)) { c.qiType.primary.perm++; qiSfx(QI[c.qiType.primary.type].snd); ui.cinematic?.({ motif: 'enso', color: QI[c.qiType.primary.type].colors[0], lines: ['Your Qi folds in on itself and comes back changed.'], title: R.next.name, sub: RARITY[R.next.rarity].name + ' Qi', sound: 'milestone', hold: 1.4 });
    return { text: `My Qi refined into ${R.next.name} (${RARITY[R.next.rarity].name})! ${R.next.desc}`, cls: 'big', big: true }; }
  c.qi.qi = Math.round(c.qi.qi * 0.5); let sick = '';
  if (chance(0.25)) { import('./health.js').then(m => m.addCondition(c, 'qi_deviation', true)); sick = ' My Qi turned on me — Qi Deviation Sickness.'; }
  return { text: `I failed to refine my Qi (${Math.round(R.p * 100)}%). Half my Qi scattered.${sick}`, cls: 'bad' };
}
// ---- a second Qi (Void Refinement+): may be a conceptual Qi — Sword, Stars, Space, Time, even Chaos
export function awakenSecond(c) {
  const q = qiOf(c); if (!q || q.secondary || c.qi.realm < SECOND_REALM) return null; if (!once(c, 'second')) return { text: 'The second Qi will not come twice in one year.', cls: '' };
  if (!chance(clamp(0.3 + c.qi.affinity / 400 + (c.stats.luck - 50) / 400 + (perk('c8') ? 0.1 : 0), 0.1, 0.7))) { c.qi.qi = Math.round(c.qi.qi * 0.6); return { text: 'I reached for a second Qi and found nothing but silence. (Try again next year.)', cls: 'bad' }; }
  const luck = (c.stats.luck || 50) / 50;
  const pool = QI_TYPES.filter(T => T.id !== q.primary.type && (T.id !== 'chaos' || c.qi.realm >= 11));
  const id = weighted(pool, T => ({ common: 6, uncommon: 4, rare: 3, epic: 1.6 * luck, legendary: 0.7 * luck, mythic: 0.12 * luck }[T.rarity])).id;
  q.secondary = { type: id, perm: 0 }; qiSfx(QI[id].snd);
  ui.cinematic?.({ motif: 'helix', color: QI[id].colors[0], lines: ['A second river opens beside the first.', `${QI[id].name}.`], title: 'Second Qi', sub: RARITY[QI[id].rarity].name, sound: 'ascend', hold: 1.6 });
  return { text: `A second Qi awakened in me: ${QI[id].name} (${RARITY[QI[id].rarity].name}). ${compatible(q.primary.type, id) ? 'It could one day fuse with my first.' : 'It clashes with my first Qi — they can never be fused without Chaos.'}`, cls: 'big', big: true };
}
// ---- fusion (Body Integration+), compatible pairs only
export const fuseInfo = c => { const q = qiOf(c); if (!q?.secondary || q.fused) return null; const ok = compatible(q.primary.type, q.secondary.type);
  return { ok, realmOk: c.qi.realm >= FUSE_REALM, name: fusedName(q.primary.type, q.secondary.type), p: clamp(0.25 + c.qi.affinity / 400 + (q.primary.perm + q.secondary.perm) * 0.05 + (perk('c8') ? 0.1 : 0), 0.1, 0.7) }; };
export function fuseQi(c) {
  const F = fuseInfo(c); if (!F || !F.ok || !F.realmOk) return null;
  const q = c.qiType; if ((q.fuseCd || 0) > G.world.year) return { text: `My meridians are still scarred from the last fusion. (Again in ${q.fuseCd - G.world.year} years)`, cls: '' };
  if (chance(F.p)) { q.fused = true; q.fusedName = F.name; qiSfx(QI[q.primary.type].snd); setTimeout(() => qiSfx(QI[q.secondary.type].snd), 250);
    ui.cinematic?.({ motif: 'helix', color: QI[q.primary.type].colors[0], lines: ['Two rivers meet and do not fight.', 'They become one.'], title: F.name, sub: 'Qi Fusion', sound: 'ascend', hold: 2 });
    return { text: `I fused my two Qi into ${F.name}!`, cls: 'big', big: true }; }
  q.fuseCd = G.world.year + 3; c.stats.health = Math.max(1, c.stats.health - ri(15, 30)); c.qi.qi = Math.round(c.qi.qi * 0.3);
  import('./health.js').then(m => m.addCondition(c, 'qi_deviation', true));
  return { text: `The fusion collapsed (${Math.round(F.p * 100)}%). My meridians tore — Qi Deviation Sickness. I can't try again for 3 years.`, cls: 'bad', big: true };
}

// ---- procedural sound per Qi family
export function qiSfx(kind) {
  import('../audio/sfx.js').then(({ audio, tone, noise }) => { try {
    const t = audio().currentTime + 0.01, N = n => 440 * Math.pow(2, (n - 69) / 12);
    const S = {
      pure: () => { tone(N(84), t, 0.4, { gain: 0.06 }); tone(N(91), t + 0.05, 0.45, { gain: 0.04 }); },
      fire: () => { for (let i = 0; i < 6; i++) noise(t + i * 0.04 + Math.random() * 0.03, 0.06, { freq: 1500 + Math.random() * 2500, gain: 0.12, q: 2 }); noise(t, 0.4, { freq: 300, gain: 0.15, type: 'lowpass' }); },
      water: () => { noise(t, 0.5, { freq: 900, gain: 0.12, q: 0.6 }); for (let i = 0; i < 3; i++) tone(N(79 + i * 5), t + 0.1 + i * 0.07, 0.12, { gain: 0.05, glide: N(86 + i * 5) }); },
      wood: () => { tone(N(67), t, 0.25, { type: 'triangle', gain: 0.08 }); noise(t, 0.15, { freq: 2200, gain: 0.06, q: 4 }); },
      metal: () => [88, 95, 100].forEach((n, i) => tone(N(n) * (1 + i * 0.003), t, 0.9 - i * 0.2, { gain: 0.05 - i * 0.012 })),
      earth: () => { tone(60, t, 0.45, { gain: 0.3, glide: 30 }); noise(t, 0.35, { freq: 180, gain: 0.3, type: 'lowpass' }); },
      wind: () => noise(t, 0.6, { freq: 1200, gain: 0.1, q: 0.4 }),
      ice: () => { [96, 101, 103].forEach((n, i) => tone(N(n), t + i * 0.05, 0.3, { type: 'triangle', gain: 0.035 })); noise(t, 0.1, { freq: 6000, gain: 0.06, type: 'highpass' }); },
      poison: () => { tone(N(50), t, 0.5, { type: 'sawtooth', gain: 0.04, glide: N(46) }); noise(t, 0.4, { freq: 600, gain: 0.08, q: 3 }); },
      lightning: () => { noise(t, 0.05, { freq: 5000, gain: 0.35, type: 'highpass' }); noise(t + 0.04, 0.5, { freq: 200, gain: 0.35, type: 'lowpass' }); tone(N(98), t, 0.08, { type: 'square', gain: 0.05 }); },
      demon: () => { tone(N(38), t, 0.6, { type: 'sawtooth', gain: 0.08, glide: N(31) }); tone(N(41), t, 0.6, { type: 'sawtooth', gain: 0.05 }); },
      ghost: () => { [72, 72.4].forEach(n => tone(N(n), t, 0.8, { gain: 0.04, glide: N(n - 5) })); noise(t, 0.6, { freq: 3500, gain: 0.03, q: 6 }); },
      star: () => [84, 88, 91, 96, 100].forEach((n, i) => tone(N(n), t + i * 0.04, 0.5, { gain: 0.035 })),
      void: () => { tone(45, t, 0.9, { gain: 0.25 }); tone(90.5, t, 0.9, { gain: 0.05 }); },
      chaos: () => { ['fire', 'water', 'lightning', 'void'].forEach((k, i) => setTimeout(() => qiSfx(k), i * 90)); },
    };
    (S[kind] || S.pure)();
  } catch (e) {} });
}

// ---- activities (Cultivation)
export const QI_ACTS = [
  { id: 'qi_refine', cat: 'cultivation', name: 'Refine your Qi (next permutation)', icon: 'cultivation', minAge: 10, need: c => { const R = refineInfo(c); return !!R && !R.done && R.ok; }, run: c => refineQi(c) },
  { id: 'qi_second', cat: 'cultivation', name: 'Seek a second Qi', icon: 'star', minAge: 16, need: c => !!qiOf(c) && !c.qiType.secondary && c.qi.realm >= SECOND_REALM, run: c => awakenSecond(c) },
  { id: 'qi_fuse', cat: 'cultivation', name: 'Attempt Qi Fusion', icon: 'lightning', minAge: 16, need: c => { const F = fuseInfo(c); return !!F && F.ok && F.realmOk; }, run: c => fuseQi(c) },
];
