// v0.8.7 Law & order: heat, country-dependent policing, standoffs (flee / fight / charm), an active prison life,
// jailbreaks, Guild hunters for escaped cultivators, and the Immortal Penitentiary.
import { G } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp } from '../core/rng.js';
import { stat, money, country, fmtMoney, wage } from './life.js';
import { ENEMIES } from '../data/combat.js';
import { REALMS } from '../data/realms.js';
import { effRealm } from './path.js';
import { eff } from './body.js';
import { traitMult, earnTrait } from './traits.js';

// how good the police are: rich, high-tech countries catch you far more often
export const policeFactor = c => ({ developed: 1.45, emerging: 1.0, developing: 0.65 }[country(c).tier] || 1);
export const heatLabel = h => h >= 75 ? 'Most wanted' : h >= 45 ? 'Under federal investigation' : h >= 20 ? 'Police are asking questions' : h > 0 ? 'A few rumours' : 'Clean';
export const caughtChance = (c, risk) => clamp(risk * 1.5 * traitMult(c, 'crime') * (1 - eff(c, 'agility') / 300) * policeFactor(c) * (1 + (c.heat || 0) / 120), 0.02, 0.95);
export function addHeat(c, n) { c.heat = clamp((c.heat || 0) + n); }

// cornered by police: you decide
export async function standoff(c, years, what) {
  const R = effRealm(c), agi = eff(c, 'agility'), cha = eff(c, 'charisma'), looks = c.stats.looks || 50, pf = policeFactor(c);
  const pFlee = clamp((0.25 + agi / 250 + R * 0.12) / pf, 0.05, 0.95), pCharm = clamp((0.08 + (cha - 50) / 160 + (looks - 50) / 300) / pf, 0.03, 0.8);
  const v = await ui.choice({ title: 'Police!', icon: 'crime', text: `${what}… and the sirens close in. ${pf > 1.2 ? 'These are professionals: drones, cameras, forensics.' : pf < 0.8 ? 'Two tired local cops. This could go any way.' : 'A squad car blocks the alley.'}\nHeat: ${heatLabel(c.heat || 0)}.`,
    options: [{ label: `Flee (${Math.round(pFlee * 100)}%)`, value: 'flee' }, { label: R >= 2 ? 'Fight — they\'re only mortals' : 'Fight', value: 'fight' }, { label: `Talk or flirt your way out (${Math.round(pCharm * 100)}%)`, value: 'charm' }, { label: 'Surrender', value: 'give', ghost: true }] });
  if (v === 'flee' && chance(pFlee)) { addHeat(c, 15); return { text: `${what}. The police cornered me — and I got away.`, cls: 'good' }; }
  if (v === 'charm' && chance(pCharm)) { addHeat(c, 5); return { text: `${what}. I talked my way out of the cuffs. ${pick(['The officer even gave me his number.', 'They let me go with a warning.', 'They apologised for bothering me.'])}`, cls: 'good' }; }
  if (v === 'fight') {
    if (R >= 2) { addHeat(c, 40); c.kills += chance(0.3) ? 1 : 0; c.flags.copFight = true; return { text: `${what}. When the police came I put three of them in hospital. Now the Federal Authorities want me.`, cls: 'bad', big: true }; }
    const r = await ui.fight({ ...ENEMIES.find(e => e.id === 'thug'), name: 'Police Officer', realm: 0 });
    if (r === 'win') { addHeat(c, 35); return { text: `${what}. I fought off the officers and ran. That will not be forgotten.`, cls: 'bad' }; }
    years = Math.round((years || 1) * 1.8);
  }
  if (c.age < 18 || !years) { stat(c, 'happiness', -8); addHeat(c, 5); return { text: `${what}… and got caught. ${c.age < 18 ? 'My parents were called.' : 'I paid a fine.'}`, cls: 'bad' }; }
  c.prison = years + ri(0, years); c.flags.prisonEver = true; c.immortalPrison = false; c.heat = Math.round((c.heat || 0) * 0.5);
  return { text: `${what}… and got caught. Sentenced to ${c.prison} years in prison.`, cls: 'bad', big: true };
}

// ---- prison life (actions you can take inside)
const inMortal = c => c.prison > 0 && !c.immortalPrison;
export const PRISON_CAT = { id: 'prison', name: 'Prison', icon: 'crime' };
export const PRISON_ACTS = [
  { id: 'jailbreak', cat: 'prison', name: 'Break out', icon: 'travel', minAge: 14, need: c => c.prison > 0, run: async c => {
    const R = effRealm(c), p = c.immortalPrison ? clamp((R - 11) * 0.05, 0, 0.15) : clamp(0.12 + eff(c, 'agility') / 400 + R * 0.25, 0.05, 0.98);
    if (!chance(p)) { c.prison += c.immortalPrison ? 10 : 2; stat(c, 'health', -ri(5, 15)); return { text: `I tried to break out (${Math.round(p * 100)}%) and failed. They added ${c.immortalPrison ? 10 : 2} years.`, cls: 'bad' }; }
    const was = c.immortalPrison; c.prison = 0; c.immortalPrison = false; c.fugitive = { since: G.world.year }; addHeat(c, 100);
    return { text: was ? 'I broke out of the Immortal Penitentiary. Nobody has ever done that. They will never stop hunting me.' : R >= 2 ? 'Mortal walls. Mortal guards. I simply walked through them. The Guild Association has been told.' : 'I dug out through the laundry drain. I\'m a fugitive now.', cls: 'big', big: true }; } },
  { id: 'prison_yard', cat: 'prison', name: 'Fight for respect in the yard', icon: 'fist', minAge: 14, need: inMortal, run: async c => {
    const r = await ui.fight({ ...ENEMIES.find(e => e.id === 'thug'), name: 'Yard Boss', realm: Math.min(effRealm(c), 1) });
    if (r === 'win') { c.wins++; stat(c, 'happiness', 4); c.flags.yardRespect = true; return { text: 'I beat the yard boss. Nobody bothers me now.', cls: 'good' }; }
    stat(c, 'health', -ri(5, 12)); return { text: 'I got beaten in the yard.', cls: 'bad' }; } },
  { id: 'prison_work', cat: 'prison', name: 'Work in the prison laundry', icon: 'career', minAge: 14, need: c => c.prison > 0, run: c => { const m = Math.round(ri(80, 200) * wage(c)); money(c, m); return `Folded sheets for a year's worth of cigarettes and ${fmtMoney(c, m)}.`; } },
  { id: 'prison_appeal', cat: 'prison', name: 'File an appeal', icon: 'study', minAge: 18, need: inMortal, run: c => { const p = clamp(0.08 + (eff(c, 'smarts') - 50) / 200, 0.03, 0.4); money(c, -Math.round(1500 * wage(c)));
    if (chance(p)) { c.prison = Math.max(0, c.prison - ri(1, 4)); return { text: 'My appeal worked: my sentence was cut.', cls: 'good' }; } return { text: 'My appeal was denied.', cls: 'bad' }; } },
];

// ---- yearly: heat cools, fugitives get hunted
export async function lawYear(c) {
  if (c.heat) c.heat = Math.max(0, c.heat - Math.round(14 / policeFactor(c)));
  if (c.prison > 0 && c.immortalPrison) { stat(c, 'happiness', -4); if (chance(0.15)) ui.log(pick(['A guard of Nascent Soul realm walked past my cell. The air froze.', 'Another prisoner tried to break out. They did not succeed.', 'The array on my cell hums all night.']), 'bad'); }
  const f = c.fugitive; if (!f || c.prison) return;
  if (G.world.year - f.since >= 6) { c.fugitive = null; ui.log('Six years on the run. The Guild seems to have given up on me — for now.', 'good'); return; }
  if (!chance(0.35)) return;
  const R = effRealm(c), e = ENEMIES.find(x => x.id === pick(['sword_saint', 'demonic', 'void_wraith']));
  ui.log('A Guild Association hunter found me.', 'bad');
  const r = await ui.fight({ ...e, kind: 'human', realm: clamp(R + 1, 1, REALMS.length - 1), name: `Guild Hunter ${pick(['Han', 'Seo', 'Vale', 'Mirelle', 'Okafor', 'Ito'])}` }, { noFlee: true });
  if (r === 'win') { c.wins++; addHeat(c, 20); ui.log('I beat the Guild\'s hunter. They will send a stronger one.', 'qi'); return; }
  c.fugitive = null; c.prison = ri(50, 80); c.immortalPrison = true; c.flags.prisonEver = true;
  ui.cinematic?.({ motif: 'seal', color: '#8fa8ff', lines: ['Seals close over your meridians one by one.', 'The Immortal Penitentiary has not lost a prisoner in nine hundred years.'], title: 'Immortal Penitentiary', sub: `${c.prison} years`, sound: 'heavy', hold: 2 });
  ui.log(`The Guild dragged me to the Immortal Penitentiary. Sentence: ${c.prison} years.`, 'death');
}
