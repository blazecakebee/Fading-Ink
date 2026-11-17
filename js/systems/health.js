// Mood, skill decay, illnesses & mental health, and treatment (doctor, therapy, rest, Qi healing, Qi medicine).
import { effRealm, bodyTier } from './path.js';
import { HARD } from '../core/hard.js';
import { ui } from '../core/bus.js';
import { ri, chance, clamp, pick } from '../core/rng.js';
import { CONDITIONS, COND_BY_ID, QI_MEDS, GENETIC } from '../data/conditions.js';
import { ITEMS } from '../data/items.js';
import { REALMS } from '../data/realms.js';
import { stat, money, fmtMoney, country, addItem, priceFor } from './life.js';
import { qiCap } from './cultivation.js';
import { bonds } from './people.js';

export const TRAINABLE = ['strength', 'battle', 'agility', 'smarts', 'charisma'];
export const has = (c, id) => (c.conditions || []).some(x => x.id === id);

// Qi-born ailments only strike people who actually cultivate Qi: not mortals, not the Severed.
export const canGetQiIllness = c => c.path !== 'body' && (c.qi?.realm || 0) >= 1;
export function clearQiIllness(c) { const before = (c.conditions || []).length; c.conditions = (c.conditions || []).filter(x => COND_BY_ID[x.id]?.kind !== 'qi'); return before - c.conditions.length; }
export function addCondition(c, id, quiet) {
  c.conditions ||= []; if (has(c, id)) return false;
  const C = COND_BY_ID[id];
  if (C.kind === 'qi' && !canGetQiIllness(c)) return false; // no cultivated Qi (or none at all) → nothing for Qi to go wrong with
  c.conditions.push({ id, years: 0, sev: 1 });
  if (!quiet) ui.log(`I was diagnosed with ${C.name}.`, C.kind === 'mind' ? 'bad' : 'bad');
  return true;
}
function cure(c, id, how) {
  c.conditions = c.conditions.filter(x => x.id !== id);
  if (COND_BY_ID[id].genetic) (c.flags.geneCured ||= []).push(id);
  ui.fx('milestone'); return `My ${COND_BY_ID[id].name} ${COND_BY_ID[id].kind === 'mind' ? 'eased — I feel like myself again' : 'was cured'} (${how}).`;
}
// Qi gain multiplier from conditions
export const condQiMult = c => (c.conditions || []).reduce((m, x) => m * (COND_BY_ID[x.id].qiMult || 1), 1);
// Happiness multiplies how well actions go: 0.85x at 0, 1.05x at 100
export const moodMult = c => 0.85 + (c.stats.happiness ?? 60) / 500;
export const moodFace = m => m >= 80 ? '😄' : m >= 60 ? '🙂' : m >= 40 ? '😐' : m >= 20 ? '😟' : '😢';

// Years since you last trained a skill → how much it fades this year (0 for the first 2 years, then 1, 2, 3… up to 5)
export function decayRate(c, k) {
  const idle = c.age - ((c.lastTrained || {})[k] ?? Math.min(c.age, 6));
  // very slow: nothing for 5 years, then about 1 point every 2 years, rising to 2 a year only after 20 idle years
  if (idle < 5 || c.age < 12) return 0;
  return idle < 12 ? 0.5 : idle < 20 ? 1 : 2;
}

export function healthYear(c) {
  // ---- happiness drifts toward a baseline set by stress and your bonds
  const { best, partner } = bonds(c);
  const base = 62 - c.stats.stress * 0.35 + (best ? 6 : 0) + (partner ? 6 : 0);
  c.stats.happiness = clamp(Math.round(c.stats.happiness * 0.7 + base * 0.3 + ri(-4, 4)));

  // ---- skill decay: the longer since you last trained a skill, the faster it fades
  c.lastTrained ||= {};
  for (const k of TRAINABLE) {
    const last = c.lastTrained[k] ?? Math.min(c.age, 6);
    const idle = c.age - last;
    const r = decayRate(c, k); const loss = Math.floor(r) + (chance(r % 1) ? 1 : 0);
    if (loss >= 1 && c.stats[k] > 15) c.stats[k] = Math.max(15, c.stats[k] - loss); // skills never fade below 15
    c.stats[k] = Math.min(c.stats[k], c.path === 'body' ? bodyTier(c).cap : (REALMS[c.qi.realm].cap || 100));
  }
  // ---- looks only fade with age (cultivation slows or stops it)
  if (c.age > 30) { const rate = c.qi.realm >= 3 ? 0 : c.qi.realm >= 1 ? 0.25 : c.age > 50 ? 1 : 0.5; if (chance(rate)) c.stats.looks = clamp(c.stats.looks - 1); }

  // ---- existing conditions
  c.conditions ||= [];
  for (const x of [...c.conditions]) {
    const C = COND_BY_ID[x.id]; x.years++;
    if (C.grows) x.sev = Math.min(3, x.sev + 0.4);
    if (!(c.demonic && C.kind === 'qi' && x.id === 'corruption')) for (const [k, v] of Object.entries(C.eff)) stat(c, k, Math.round(v * x.sev)); // v0.9.23 the demonic path is immune
    if (C.dur && x.years >= C.dur) { c.conditions = c.conditions.filter(y => y !== x); ui.log(`My ${C.name} passed.`, 'good'); }
  }
  // ---- genetic conditions waking up
  geneticCheck(c);
  // ---- new conditions (at most one per year)
  for (const C of CONDITIONS) { if (!has(c, C.id) && chance(C.onset(c) * (1 + (HARD - 1) * 0.6))) { addCondition(c, C.id); break; } }
}

// Genetic conditions: manifest at birth or when you reach their age window
export function geneticCheck(c, birth) {
  for (const id of c.genes.carriers || []) {
    const C = COND_BY_ID[id]; if (!C || has(c, id) || (c.flags.geneCured || []).includes(id)) continue;
    const [a, b] = C.genetic;
    if (c.age >= a && c.age <= b && chance(birth && a === 0 ? 0.7 : 1 / (b - a + 1) * 1.5)) { addCondition(c, id, true); ui.log(birth ? `I was born with ${C.name}.` : `A hidden inheritance surfaced: I was diagnosed with ${C.name}.`, 'bad'); }
  }
}
export const bleedMult = c => (c.conditions || []).reduce((m, x) => m * (COND_BY_ID[x.id].bleed || 1), 1);
// Sudden death can happen at any age; heart problems and severe illness raise the odds.
// Random deaths are rare when you're healthy and whole: they come from old age, sickness, wounds and risk instead.
export function suddenDeathChance(c) {
  const hurt = c.body ? Object.values(c.body.parts || {}).some(p => p.missing || (p.inj && p.inj.length)) : false;
  const base = c.stats.health >= 70 && !(c.conditions || []).length && !hurt ? 0.0002 : c.stats.health >= 40 ? 0.0007 : 0.002;
  // accidents (stairs, cars, stray beasts) fade as your body is refined by cultivation
  return Math.max(0, base / (1 + effRealm(c) * 0.6) + (c.conditions || []).reduce((s, x) => s + (COND_BY_ID[x.id].sudden || 0) + (x.id === 'heart' ? 0.01 : 0) + (COND_BY_ID[x.id].grows ? 0.004 * x.sev : 0), 0) - c.qi.realm * 0.0003);
}

// Trauma hooks other systems can call
export function trauma(c, chanceOf = 0.3) { if (chance(chanceOf)) addCondition(c, 'ptsd'); }

// ---- treatments. Each returns chronicle text or null (couldn't afford → no action spent)
export function treatOptions(c, x) {
  const C = COND_BY_ID[x.id], k = country(c).econ, out = [];
  if (C.cure.doctor) out.push({ id: 'doctor', label: C.id === 'cancer' ? 'Surgery & chemo' : 'See a doctor', cost: priceFor(c, (C.cost || 3) * 100 * k), chance: C.cure.doctor });
  if (C.cure.therapy) out.push({ id: 'therapy', label: 'Therapy sessions', cost: priceFor(c, 250 * k), chance: C.cure.therapy });
  if (C.cure.rest) out.push({ id: 'rest', label: 'Rest & self-care', cost: 0, chance: C.cure.rest });
  if (C.cure.qi && c.qi.realm >= 1) out.push({ id: 'qi', label: 'Qi healing (self)', qi: qiHealCost(c), chance: qiHealChance(c, C) });
  for (const [med, by] of Object.entries(QI_MEDS)) if (by[C.kind] && c.inv[med]) out.push({ id: 'med:' + med, label: `Use ${ITEMS[med].name}`, cost: 0, chance: by[C.kind] });
  return out;
}
export const qiHealCost = c => Math.round(qiCap(c) * 0.5);
export const qiHealChance = (c, C) => clamp(C.cure.qi + c.qi.realm * 0.06 + c.qi.affinity / 400 - (C.kind === 'qi' ? 0 : 0.05), 0.05, 0.95);

export function treat(c, id, how) {
  const x = (c.conditions || []).find(y => y.id === id); if (!x) return null; const C = COND_BY_ID[id];
  const opt = treatOptions(c, x).find(o => o.id === how); if (!opt) return null;
  if (opt.cost && c.age >= 18) { if (c.money < opt.cost) return null; money(c, -opt.cost); }
  if (opt.qi) { if (c.qi.qi < opt.qi) return null; c.qi.qi -= opt.qi; }
  if (how.startsWith('med:')) addItem(c, how.slice(4), -1);
  if (how === 'rest') { stat(c, 'stress', -12); stat(c, 'happiness', 5); }
  if (how === 'therapy') { stat(c, 'happiness', 6); stat(c, 'stress', -6); }
  if (chance(opt.chance)) { c.flags.cured = true; return { text: cure(c, id, opt.label.toLowerCase()), cls: 'good', big: true }; }
  if (how === 'qi' && chance(0.15)) { addCondition(c, 'qi_deviation', true); return { text: `My Qi turned on me while healing my ${C.name}. Qi Deviation Sickness!`, cls: 'bad' }; }
  if (x.sev > 1) x.sev = Math.max(1, x.sev - 0.5);
  return { text: `${opt.label} helped a little, but my ${C.name} remains.${opt.cost ? ` (${fmtMoney(c, opt.cost)})` : ''}`, cls: '' };
}
