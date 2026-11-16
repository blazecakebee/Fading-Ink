// v0.6.0 "Bloodlines" expansion: wires heirlooms, genetics, sects & guild, world news, family life,
// new traits, activities, events and cinematics into the existing game through hooks.
import { G } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp } from '../core/rng.js';
import { HOOKS, stat, money, addItem, country, fmtMoney, fullName } from './life.js';
import { ACTIVITIES, SOCIAL } from '../data/activities.js';
import { EVENTS } from '../data/events.js';
import { TRAITS, TRAIT_BY_ID } from '../data/traits.js';
import { TRAITS2 } from '../data/traits2.js';
import { WEALTH, COUNTRIES } from '../data/countries.js';
import { REALMS } from '../data/realms.js';
import { ENEMIES } from '../data/combat.js';
import { earnTrait } from './traits.js';
import { ensureDna, grantPoints, childDna, npcDna, geneName } from './genetics.js';
import { inheritHeirlooms, migrateHeirlooms, gainHeirloom } from './heirlooms.js';
import { factionsYear } from './factions.js';
import { newsYear, ensureMatchingGate, spawnGate, birthAnomaly, BIRTH_EVENTS, newsMult } from './world.js';
import { FAMILY_SOCIAL, disputeYear, trainedHeir, MOVE_IN, birthYear } from './family.js';
import { haveChild } from '../data/activities.js';
import { MORE_NAMES } from '../data/names2.js';
import { MARTIAL, SWITCH_ART, PRIVATE, MIGRATE, schoolYear, CHILDHOOD, cloudBonus } from './schooling.js';
import { portfolioYear, migrateStocks } from './market.js';
import { ownSectYear } from './factions.js';
import { META } from '../core/state.js';
import { REJECT, BODY_ACTS, bodyYear, startPath, SEVERED_EVENTS } from './bodypath.js';
import { ACHIEVEMENTS, ACH_BY_ID } from '../data/achievements.js';

// ---- traits
for (const t of TRAITS2) if (!TRAIT_BY_ID[t.id]) { TRAITS.push(t); TRAIT_BY_ID[t.id] = t; }

// ---- social actions (children, blessing, moving in)
SOCIAL.push(...FAMILY_SOCIAL, MOVE_IN);
// ---- more names (fewer repeats)
for (const cty of COUNTRIES) { const x = MORE_NAMES[cty.id]; if (x && !cty._more) { cty._more = 1; cty.m = [...new Set([...cty.m, ...x.m.split(' ')])]; cty.f = [...new Set([...cty.f, ...x.f.split(' ')])]; } }
// ---- martial arts schools replace the old all-you-can-eat class; private school, migration
{ const i = ACTIVITIES.findIndex(a => a.id === 'martial'); if (i >= 0) ACTIVITIES[i] = MARTIAL; else ACTIVITIES.push(MARTIAL); }
ACTIVITIES.push(SWITCH_ART, PRIVATE, MIGRATE, REJECT, ...BODY_ACTS);
// born without Qi at all
for (const t of [{ id: 'heaven_severed', tier: 'legendary', name: 'Heaven-Severed', desc: 'Born with no Qi at all. You walk the Severed Path from birth: +12 Strength, +10 Agility, +10 Health.', mods: { strength: 12, agility: 10, health: 10 } }]) if (!TRAIT_BY_ID[t.id]) { TRAITS.push(t); TRAIT_BY_ID[t.id] = t; }
for (const a of [{ id: 'severed', name: 'Severed', desc: 'Walk the Severed Path.', pts: 5, check: c => c.path === 'body' }, { id: 'iron_body', name: 'Steel Without Qi', desc: 'Reach Steel Sinew on the Severed Path.', pts: 10, check: c => (c.bodyPath?.tier || 0) >= 3 }, { id: 'unbound', name: 'The Unbound', desc: 'Complete the Severed Path.', pts: 40, check: c => (c.bodyPath?.tier || 0) >= 9 }]) if (!ACH_BY_ID[a.id]) { ACHIEVEMENTS.push(a); ACH_BY_ID[a.id] = a; }
// childhood activities now each grow something (stats, friends, family bonds, Qi affinity)
for (const a of CHILDHOOD) { const i = ACTIVITIES.findIndex(x => x.id === a.id); if (i >= 0) ACTIVITIES[i] = a; else ACTIVITIES.splice(ACTIVITIES.findIndex(x => x.cat === 'childhood'), 0, a); }
globalThis.__cloudBonus = cloudBonus;

// ---- activities
const econ = c => country(c).econ;
ACTIVITIES.push(
  { id: 'mercenary', cat: 'work', name: 'Take a mercenary contract', icon: 'saber', minAge: 18, need: c => (c.stats.battle || 0) >= 25, run: async c => {
      const e = pick(ENEMIES.filter(x => x.kind === 'human' && x.realm <= c.qi.realm + 1 && x.id !== 'tribulation' && x.id !== 'bully'));
      const r = await ui.fight({ ...e, realm: Math.max(e.realm, Math.min(c.qi.realm, 10)), name: `${e.name} (target)` });
      if (r !== 'win') return { text: 'The contract went bad. I came back empty-handed and bruised.', cls: 'bad' };
      c.wins++; const m = Math.round(ri(800, 2500) * (1 + c.qi.realm) * econ(c)); money(c, m);
      return { text: `Mercenary contract fulfilled. Paid ${fmtMoney(c, m)}, no questions asked.`, cls: 'good' }; } },
  { id: 'refine_essence', cat: 'cultivation', name: 'Refine Bloodline Essence', icon: 'flask', minAge: 14, need: c => c.inv.bloodline_essence > 0, run: c => {
      addItem(c, 'bloodline_essence', -1); ensureDna(c).points++; return { text: 'I refined the Bloodline Essence. Something dormant in my blood opened its eyes (+1 Awakening point).', cls: 'qi', big: true }; } },
);

// ---- events
const gs = EVENTS.find(e => e.id === 'gate_spawn');
if (gs) { Object.defineProperty(gs, 'w', { get: () => newsMult('gate_surge') ? 12 : 5 }); gs.run = c => { spawnGate(c); }; }
EVENTS.push(...SEVERED_EVENTS,
  { id: 'ruins', cond: c => c.age >= 16, w: 0.25, run: async c => {
      const v = await ui.choice({ title: 'Collapsed Ruins', icon: 'chest', text: 'A landslide has exposed the corner of an ancient storehouse. Something glints under the rubble.', options: [{ label: 'Dig carefully', value: 'dig' }, { label: 'Leave it', value: false }] });
      if (!v) return ui.log('I left the ruins alone.');
      if (chance(0.35 + (c.stats.luck - 50) / 250)) gainHeirloom(c, 'ancient ruins'); else { stat(c, 'health', -ri(3, 8)); ui.log('The ruins shifted while I dug. I got out with scrapes and nothing else.', 'bad'); } } },
  { id: 'pressure', cond: c => c.age >= 12, w: 1.2, run: async c => {
      const er = clamp(c.qi.realm + ri(3, 5), 3, REALMS.length - 2);
      const v = await ui.choice({ title: 'An Overwhelming Presence', icon: 'eye', text: `A ${REALMS[er].name} cultivator walks down the street. The air turns to lead — everyone around you drops to their knees.`, options: [{ label: 'Kneel like everyone else', value: 'kneel' }, { label: `Try to stay standing (Health ${c.stats.health})`, value: 'stand' }] });
      if (v === 'stand') { if (chance(0.15 + c.qi.realm * 0.03)) { stat(c, 'happiness', 6); c.qi.affinity = clamp(c.qi.affinity + 2); ui.log('I stayed on my feet. The cultivator glanced back — and smiled. My Qi affinity rose.', 'qi'); } else { stat(c, 'health', -ri(6, 14)); ui.log('Their presence crushed me into the pavement. I coughed blood for a week.', 'bad'); } }
      else ui.log('I knelt until the presence passed. Some gaps cannot be crossed by will alone.'); } },
  { id: 'lower_realm', cond: c => c.qi.realm >= 4 && c.age >= 18, w: 1, run: c => {
      const p = pick(c.people.filter(p => p.alive && p.role === 'Enemy')); if (p && (p.realm || 0) <= c.qi.realm - 3) { p.role = 'Acquaintance'; p.close = 10; p.hostile = false; ui.log(`${p.first} tried to start trouble — then felt my presence and fled. They won't bother me again.`, 'qi'); }
      else { const t = pick(['A gang of thugs blocked my path. One look from me and they scattered.', 'A rogue cultivator challenged me, then fell to his knees before I spoke a word.']); ui.log(t, 'qi'); } } },
);


// ---- cinematic texts
function birthIntro(c, anomaly) {
  const cty = COUNTRIES.find(x => x.id === c.country); const w = WEALTH.find(x => x.id === c.wealth);
  const ps = c.people.filter(p => ['Father', 'Mother'].includes(p.role));
  const lines = [`You were born in ${c.city}, ${cty?.name || ''}.`, ps.length ? `${ps.map(p => p.first).join(' and ')} hold${ps.length === 1 ? 's' : ''} you for the first time.` : 'No one came to hold you.', anomaly?.line || `A ${(w?.name || '').toLowerCase()} family. An ordinary beginning.`];
  const motif = anomaly?.motif || { royal: 'seal', rich: 'lotus', wealthy: 'lotus', middle: 'enso', poor: 'mountain', destitute: 'crack' }[c.wealth] || 'enso';
  const color = anomaly ? '#ffd36f' : { royal: '#ffd36f', destitute: '#9a8f80' }[c.wealth] || '#ff5a6a';
  return { motif, color, lines, title: anomaly?.title || `House of ${c.last}`, sub: anomaly ? `House of ${c.last}` : `Generation ${c.generation || 1}`, sound: 'birth' };
}

// ---- hooks
HOOKS.birth.push((c, opts) => {
  ensureDna(c);
  if (c.traits.includes('heaven_severed')) startPath(c, 'born');
  const an = opts.generation > 1 ? null : birthAnomaly(c);
  c.flags.intro = birthIntro(c, an);
});
HOOKS.inherit.push((old, c, ch) => {
  const partner = old.people.find(p => p.id === old.partnerId) || old.people.find(p => p.id === ch.otherParent);
  const mine = [...(old.dna?.base || []), ...(old.dna?.awakened || [])], theirs = partner?.dna || npcDna(partner?.realm || 0);
  c.dna = ch.dna && ch.dnaFromParents ? ch.dna : childDna(mine, theirs);
  if (c.dna.awakened.length) ui.log(`I was born with awakened blood carried down from my parents: ${c.dna.awakened.map(geneName).join(', ')}.`, 'qi');
  inheritHeirlooms(old, c); trainedHeir(ch, c);
  c.flags.intro = { motif: 'tree', color: '#7fe3a0', lines: [`${fullName(old)} has died: ${old.cause || 'their story ended'}.`, 'The ink of their life dries on the page.', 'Their blood runs on in you.'], title: fullName(c), sub: `Generation ${c.generation}`, sound: 'birth' };
});
HOOKS.yearStart.push(c => { newsYear(c); portfolioYear(c); birthYear(c, haveChild); });
HOOKS.yearEnd.push(async c => {
  grantPoints(c); schoolYear(c); ownSectYear(c); bodyYear(c);
  await factionsYear(c);
  if (c.alive) await disputeYear(c);
  ensureMatchingGate(c);
  for (const t of TRAITS2) if (t.earnIf && !c.traits.includes(t.id) && t.earnIf(c)) earnTrait(c, t.id);
});
HOOKS.death.push(c => {
  const born = G.world.year - c.age;
  ui.cinematic?.({ motif: 'crack', color: '#b9b0c0', threads: 4, lines: [`${c.cause ? (c.cause[0].toUpperCase() + c.cause.slice(1)).replace(/^I /, 'You ').replace(/\bmy\b/g, 'your') : 'The end came'}.`, c.heirlooms?.length || c.people.some(p => ['Son', 'Daughter'].includes(p.role) && p.alive) ? 'What you leave behind waits for your heirs.' : 'With no heir, your bloodline — and all it carried — ends here.'], title: fullName(c), sub: `${born} – ${G.world.year} · aged ${c.age}`, sound: 'death', introSound: 'click' });
});

// ---- install UI-side pieces (called by main.js once the UI hooks exist)
export async function installExpansion() {
  const [{ cinematic }, { TABS, render, runActivity }, P] = await Promise.all([import('../ui/cinematic.js'), import('../ui/render.js'), import('../ui/expansionPanels.js')]);
  ui.cinematic = o => cinematic(o);
  TABS.bloodline = P.bloodlineTab; TABS.factions = P.factionsTab;
  P.bindPanels(render, runActivity);
  const P2 = await import('../ui/panels2.js'); const { NAV } = await import('../ui/render.js');
  TABS.market = P2.marketTab; TABS.wardrobe = P2.wardrobeTab; TABS.severed = P2.bodyPathTab; P2.bindPanels2(render, runActivity);
  if (!NAV[0][1].some(x => x[0] === 'severed')) NAV[0][1].splice(7, 0, ['severed', 'Severed Path', 'fist']);
  if (!NAV[0][1].some(x => x[0] === 'wardrobe')) NAV[0][1].push(['wardrobe', 'Wardrobe & Armory', 'robe']);
  if (!NAV[1][1].some(x => x[0] === 'market')) NAV[1][1].splice(5, 0, ['market', 'Stock Market', 'stocks']);
  if (!META.shuffleSet) { META.shuffleSet = true; META.settings.station = 'shuffle'; }
  const fx0 = ui.fx;
  ui.fx = (kind, o = {}) => {
    if (kind === 'breakthrough' && o.major) {
      const R = REALMS.find(r => r.name === o.realm) || REALMS[G.char?.qi.realm || 1];
      return cinematic({ motif: 'glyph', glyph: R.glyph, color: R.color, lines: ['The heavens take note.', R.id === 'immortal' ? 'Even Immortals count their years.' : 'Your limits shatter and re-form.'], title: R.name, sub: 'You have ascended to', sound: 'ascend', hold: 2 });
    }
    return fx0(kind, o);
  };
}

// ---- save migration for characters from before v0.6.0
export function migrateExpansion(c) {
  if (!c) return;
  migrateHeirlooms(c); ensureDna(c); migrateStocks(c); c.closet ||= []; c.outfit ||= {};
  if (c.sect && c.sectRank == null) { c.sectRank = c.sect === 'own' ? 4 : 0; c.contrib ??= 0; c.flags.sectJoined ??= G.world?.year; }
  for (const p of c.people || []) p.dna ||= npcDna(p.realm || 0);
  // award points for realms already reached
  const d = c.dna; if (!d.migrated) { d.migrated = true; let n = 0; if (c.age >= 18) { d.earned.adult = 1; n++; } for (let r = 1; r <= c.qi.realm; r++) { d.earned['r' + r] = 1; n++; } d.points += n; }
}
export { BIRTH_EVENTS };
