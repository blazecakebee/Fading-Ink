// Body-part health: injuries, capacities, amputation, healing, scars, regrowth and prosthetics.
import { PARTS, PART_BY_ID, INJURIES, PROSTHETICS, CAPACITIES } from '../data/body.js';
import { ui } from '../core/bus.js';
import { ri, chance, clamp, pick, weighted } from '../core/rng.js';
import { REALMS } from '../data/realms.js';
import { COUNTRIES } from '../data/countries.js';

const HEIGHTS = { cn: [172, 160], kr: [175, 163], jp: [171, 158], us: [177, 163], gb: [177, 164], br: [173, 161], ng: [171, 160], in: [166, 153], ru: [176, 164], mx: [170, 157], fr: [176, 163], eg: [170, 159] };
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; // ~ -1..1, bell-ish

// Adult height genes come from your country's average (or both parents), then you grow into them.
export function adultHeight(country, gender, parents) {
  if (parents?.length === 2 && parents.every(Boolean)) return Math.round((parents[0] + parents[1]) / 2 + (gender === 'M' ? 6 : -6) + gauss() * 6);
  const [m, f] = HEIGHTS[country] || [172, 160]; return Math.round((gender === 'M' ? m : f) + gauss() * 9);
}
export function heightNow(c) {
  const adult = c.body?.adultHeight || 170; const a = c.age;
  const frac = a >= 18 ? 1 : a <= 0 ? 0.3 : 0.3 + 0.7 * Math.min(1, a / 17) ** 0.85;
  return Math.round(adult * frac - (a > 70 ? (a - 70) * 0.15 : 0));
}
export const fmtHeight = cm => `${cm} cm (${Math.floor(cm / 30.48)}′${Math.round((cm / 2.54) % 12)}″)`;

export function ensureBody(c) {
  if (c.body?.parts) return c.body;
  const parts = {}; for (const p of PARTS) parts[p.id] = { hp: Math.round(p.hp * (1 + (c.qi?.realm || 0) * 0.3)), inj: [], missing: false };
  c.body = { parts, muscle: ri(8, 25), adultHeight: c.body?.adultHeight || adultHeight(c.country, c.gender) };
  return c.body;
}
export const maxHp = (c, p) => Math.round(PART_BY_ID[p].hp * (1 + (c.qi?.realm || 0) * 0.3));
export function isMissing(c, id) { let p = PART_BY_ID[id]; while (p) { if (c.body.parts[p.id].missing) return true; p = PART_BY_ID[p.parent]; } return false; }
const kindOf = id => id.startsWith('arm') ? 'arm' : id.startsWith('leg') ? 'leg' : id.startsWith('hand') ? 'hand' : id.startsWith('foot') ? 'foot' : id.startsWith('eye') ? 'eye' : null;

// How well a single part works, 0..1
export function partEff(c, id) {
  const s = c.body.parts[id];
  if (isMissing(c, id)) { const pr = c.body.parts[id].prosthetic || (PART_BY_ID[id].parent && c.body.parts[PART_BY_ID[id].parent].prosthetic); return pr ? PROSTHETICS[pr].eff : 0; }
  let e = s.hp / maxHp(c, id);
  if (s.inj.some(i => i.type === 'fracture')) e = Math.min(e, 0.35);
  e -= s.inj.filter(i => i.type === 'scar').length * 0.05;
  return clamp(e, 0, 1);
}
// Capacities (0..1): weighted sum of the parts that feed them
export function capacity(c, cap) {
  ensureBody(c); let total = 0, got = 0;
  for (const p of PARTS) { const w = p.cap[cap]; if (!w) continue; total += w; got += w * partEff(c, p.id); }
  return total ? clamp(got / total, 0, 1) : 1;
}
export const allCaps = c => Object.fromEntries(Object.keys(CAPACITIES).map(k => [k, capacity(c, k)]));
export function pain(c) { ensureBody(c); return PARTS.reduce((s, p) => s + c.body.parts[p.id].inj.reduce((t, i) => t + (INJURIES[i.type]?.pain || 0) * (i.sev || 1), 0), 0); }

// Combat multipliers derived from the body
export function combatMods(c) {
  ensureBody(c);
  return { agi: 0.4 + 0.6 * capacity(c, 'moving'), dmg: 0.35 + 0.65 * capacity(c, 'manipulation'), acc: -0.25 * (1 - capacity(c, 'sight')), qi: 0.3 + 0.7 * capacity(c, 'qi'), stam: 0.5 + 0.5 * capacity(c, 'breathing') };
}

// Pick where a hit lands. group = 'head' | 'torso' | 'arms' | 'legs' (targeted) or null (anywhere)
function pickPart(c, group) {
  const outer = PARTS.filter(p => p.cover && !isMissing(c, p.id) && (!group || p.group === group));
  if (!outer.length) return null;
  let p = weighted(outer, x => x.cover);
  const inner = PARTS.filter(x => x.parent === p.id && x.inner && !isMissing(c, x.id));
  if (inner.length && chance(0.25)) p = pick(inner);
  return p;
}

// Apply a hit to a character's body. type: 'blunt' | 'cut' | 'burn'. ratio = attacker power / defender power.
// Returns { text, part, fatal, lost } for the combat log.
export function hitBody(c, { amount, type = 'blunt', group = null, ratio = 1, sparring = false }) {
  ensureBody(c); const p = pickPart(c, group); if (!p) return { text: '' };
  const s = c.body.parts[p.id], mx = maxHp(c, p.id);
  const dmg = Math.max(1, Math.round(amount * (sparring ? 0.25 : 0.6)));
  s.hp = Math.max(0, s.hp - dmg);
  let inj = type === 'burn' ? 'burn' : type === 'cut' ? 'cut' : p.inner ? 'crush' : 'bruise';
  if (!sparring && p.bone && type !== 'burn' && dmg >= mx * 0.3 && chance(0.3 + (ratio - 1) * 0.15)) inj = 'fracture';
  if (sparring && inj !== 'bruise') inj = 'bruise';
  s.inj.push({ type: inj, sev: dmg >= mx * 0.5 ? 2 : 1, age: c.age });
  let text = `${INJURIES[inj].name} to the ${p.name.toLowerCase()}`, lost = false, fatal = false;
  if (inj === 'fracture') ui.fx('heavy');
  if (s.hp <= 0 && !sparring) {
    if (p.limb && (type === 'cut' || ratio >= 2) && chance(type === 'cut' ? 0.45 : 0.3)) {
      s.missing = true; s.lostAt = c.age; s.inj = []; lost = true; c.flags.limbLost = true; text = `${p.name} SEVERED`; ui.fx('limb');
    } else if (p.vital) {
      if (chance(0.5)) { s.hp = 1; text = `${p.name} critically damaged`; } else { fatal = true; text = `${p.name} destroyed`; }
    } else text = `${p.name} destroyed`;
  }
  checkBlind(c);
  return { text, part: p, fatal, lost };
}
function checkBlind(c) {
  const blind = partEff(c, 'eye_l') === 0 && partEff(c, 'eye_r') === 0;
  c.conditions ||= [];
  if (blind && !c.conditions.some(x => x.id === 'blindness')) { c.conditions.push({ id: 'blindness', years: 0, sev: 1 }); ui.log('I have lost my sight.', 'bad'); }
}

// Yearly natural healing. Strong Qi heals cleanly; weak Qi (or none) can leave scars.
export function bodyYear(c) {
  ensureBody(c);
  const strongQi = c.qi.realm >= 1 && c.qi.qi >= 0.5 * (REALMS[c.qi.realm].maxQi || 100);
  for (const p of PARTS) {
    const s = c.body.parts[p.id]; if (s.missing) { if (!s.permanent && c.age - (s.lostAt ?? c.age) > 2) { s.permanent = true; ui.log(`My ${p.name.toLowerCase()} can no longer be regrown. Only a prosthetic can replace it now.`, 'bad'); } continue; }
    s.inj = s.inj.filter(i => {
      const I = INJURIES[i.type]; if (I.permanent) return true;
      if (c.age - i.age >= I.heal) { if (I.scar && chance(I.scar * (strongQi ? 0.3 : 1))) { i.type = 'scar'; ui.log(`The ${I.name.toLowerCase()} on my ${p.name.toLowerCase()} healed into a scar.`); return true; } return false; }
      return true;
    });
    s.hp = Math.min(maxHp(c, p.id), s.hp + Math.ceil(maxHp(c, p.id) * (0.5 + c.qi.realm * 0.1)));
  }
  // muscle fades slowly without training
  if ((c.age - (c.lastTrained?.strength ?? c.age)) >= 3) c.body.muscle = Math.max(0, c.body.muscle - 1);
  const pn = pain(c); if (pn > 3) c.stats.happiness = clamp(c.stats.happiness - Math.round(pn));
}

// Qi healing: mends injuries; regrows limbs lost within 2 years (needs Foundation Establishment or higher)
export function qiHealInfo(c) {
  const cost = Math.round((REALMS[c.qi.realm].maxQi || 40) * 0.6); const weak = c.qi.qi < cost * 1.5 || c.qi.realm < 3;
  const regrow = PARTS.filter(p => c.body.parts[p.id].missing && !c.body.parts[p.id].permanent);
  return { cost, weak, regrow, scarChance: weak ? 0.45 : 0.08 };
}
export function qiHeal(c) {
  ensureBody(c); const info = qiHealInfo(c);
  if (c.qi.realm < 1) return null; if (c.qi.qi < info.cost) return null;
  c.qi.qi -= info.cost; let healed = 0, scars = 0, regrown = null;
  for (const p of PARTS) { const s = c.body.parts[p.id]; if (s.missing) continue;
    s.inj = s.inj.filter(i => { if (i.type === 'scar') return true; healed++; if (chance(info.scarChance)) { i.type = 'scar'; scars++; return true; } return false; });
    s.hp = maxHp(c, p.id); }
  if (info.regrow.length && c.qi.realm >= 3 && chance(0.4 + c.qi.realm * 0.06)) { const p = info.regrow[0]; c.body.parts[p.id].missing = false; c.body.parts[p.id].hp = Math.round(maxHp(c, p.id) * 0.5); c.body.parts[p.id].prosthetic = null; regrown = p.name; c.flags.regrown = true; ui.fx('breakthrough', { major: false }); }
  c.conditions = (c.conditions || []).filter(x => x.id !== 'blindness' || (partEff(c, 'eye_l') === 0 && partEff(c, 'eye_r') === 0));
  return { text: `I guided Qi through my wounds. ${healed ? `${healed} injur${healed === 1 ? 'y' : 'ies'} mended` : 'My body is whole'}${scars ? `, but ${scars} healed as scar${scars > 1 ? 's' : ''} — my Qi was too weak` : ''}.${regrown ? ` My ${regrown.toLowerCase()} GREW BACK!` : ''}`, cls: regrown ? 'qi' : 'good', big: !!regrown };
}
export function prostheticOptions(c, id) { const k = kindOf(id); return k ? [k, k + '2'].map(x => ({ id: x, ...PROSTHETICS[x] })) : []; }
export function fitProsthetic(c, id, pid, price) {
  if (c.money < price) return null; c.money -= price; c.body.parts[id].prosthetic = pid; c.flags.prosthetic = true;
  return { text: `I was fitted with a ${PROSTHETICS[pid].name.toLowerCase()} for my missing ${PART_BY_ID[id].name.toLowerCase()}.`, cls: 'good' };
}
// Muscle from training; a little looks boost as you get fitter
export function addMuscle(c, n) {
  ensureBody(c); const before = c.body.muscle; c.body.muscle = clamp(c.body.muscle + n);
  if (Math.floor(c.body.muscle / 12) > Math.floor(before / 12)) { c.stats.looks = Math.min(c.stats.looks + 1, REALMS[c.qi.realm].cap || 100); return true; }
  return false;
}
export const muscleLabel = m => m >= 80 ? 'Herculean' : m >= 60 ? 'Muscular' : m >= 40 ? 'Athletic' : m >= 20 ? 'Fit' : 'Slender';

// ---- v0.7.1: every body system feeds into your stats. Trained stats stay as your "base"; what you can
// actually use (effective stat) is scaled by the capacities that stat depends on.
export const STAT_SYSTEMS = {
  agility:  [['moving', 1], ['sight', 0.2], ['consciousness', 0.3]],
  strength: [['manipulation', 0.5], ['moving', 0.3], ['blood', 0.4], ['breathing', 0.3]],
  battle:   [['manipulation', 0.4], ['moving', 0.4], ['sight', 0.5], ['consciousness', 0.5]],
  smarts:   [['consciousness', 0.9], ['sight', 0.15]],
  charisma: [['talking', 0.7], ['consciousness', 0.3]],
};
const _mcache = new WeakMap();
export function statMult(c, k) {
  const sys = STAT_SYSTEMS[k]; if (!sys || !c?.body) return 1;
  return sys.reduce((m, [cap, w]) => m * Math.max(0.05, capacity(c, cap)) ** w, 1);
}
export const eff = (c, k) => { const v = c?.stats?.[k] ?? 0; const m = statMult(c, k); return m >= 0.999 ? v : Math.round(v * m); };
// which system is holding a stat back (for tooltips)
export function statLimits(c, k) { return (STAT_SYSTEMS[k] || []).map(([cap, w]) => [CAPACITIES[cap], capacity(c, cap)]).filter(([, v]) => v < 0.995); }
// other systems
export const healMult = c => (0.4 + 0.6 * capacity(c, 'filtration')) * (0.5 + 0.5 * capacity(c, 'digestion'));
export const workMult = c => 0.4 + 0.6 * Math.min(1, (capacity(c, 'manipulation') + capacity(c, 'moving') + 2 * capacity(c, 'consciousness')) / 4);
export const socialMult = c => 0.4 + 0.6 * capacity(c, 'talking');
export const studyMult = c => (0.3 + 0.7 * capacity(c, 'consciousness')) * (0.7 + 0.3 * capacity(c, 'sight'));
export const qiFlowMult = c => 0.3 + 0.7 * capacity(c, 'qi');
// Doctors fit prosthetics for missing limbs (or upgrade old ones). Never as good as the real thing.
export function prostheticOffers(c) {
  ensureBody(c); const out = [];
  for (const p of PARTS) { const s = c.body.parts[p.id]; if (!s?.missing) continue;
    const cur = s.prosthetic ? PROSTHETICS[s.prosthetic].eff : -1;
    for (const o of prostheticOptions(c, p.id)) if (o.eff > cur) out.push({ part: p, ...o }); }
  return out;
}
