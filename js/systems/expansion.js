// v0.6.0 "Bloodlines" expansion: wires heirlooms, genetics, sects & guild, world news, family life,
// new traits, activities, events and cinematics into the existing game through hooks.
import { noteBad } from './luck.js';
import { G } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp } from '../core/rng.js';
import { HOOKS, stat, money, addItem, country, fmtMoney, fullName, wage } from './life.js';
import { ACTIVITIES, SOCIAL } from '../data/activities.js';
import { GRAD, PHD, TRADE } from './school.js';
import { wrapSocial } from './socialPlay.js';
import { EVENTS } from '../data/events.js';
import { TRAITS, TRAIT_BY_ID } from '../data/traits.js';
import { TRAITS2 } from '../data/traits2.js';
import { WEALTH, COUNTRIES } from '../data/countries.js';
import { REALMS } from '../data/realms.js';
import { ENEMIES } from '../data/combat.js';
import { earnTrait } from './traits.js';
import { ensureDna, grantPoints, childDna, npcDna, geneName } from './genetics.js';
import { canGetQiIllness, clearQiIllness } from './health.js';
import { inheritHeirlooms, migrateHeirlooms, gainHeirloom } from './heirlooms.js';
import { factionsYear } from './factions.js';
import { newsYear, ensureMatchingGate, spawnGate, birthAnomaly, BIRTH_EVENTS, newsMult } from './world.js';
import { FAMILY_SOCIAL, disputeYear, trainedHeir, MOVE_IN, birthYear } from './family.js';
import { haveChild } from '../data/activities.js';
import { MORE_NAMES, NAMES3, REGIONAL } from '../data/names2.js';
import { MARTIAL, SWITCH_ART, PRIVATE, MIGRATE, schoolYear, CHILDHOOD, cloudBonus, DOCTOR } from './schooling.js';
import { portfolioYear, migrateStocks } from './market.js';
import { ownSectYear } from './factions.js';
import { META } from '../core/state.js';
import { GOD_EVENT, GOD_ACHIEVEMENTS } from './endgame.js';
import { FORTUNE_EVENTS } from './fortune.js';
import { TRAINER_SOCIAL, trainersYear } from './trainers.js';
import { AGENT_SOCIAL, jobsYear, gigYear } from './jobs.js';
import { withFlavor } from '../data/flavor.js';
import { withTaste } from '../data/personas.js';
import { SACRIFICE, SACRIFICE_EVENT } from './sacrifice.js';
import { QI_ACTS, awakenQi } from './qitype.js';
import { legacyBirth, legacyYear } from './legacyExtra.js';
import { renownYear, otherworldYear, inOtherworld } from './renown.js';
import { PRISON_ACTS, PRISON_CAT, lawYear } from './law.js';
import { DARK_EVENTS, REHAB, addictionYear } from '../data/darkEvents.js';
import { IDENTITY_ACTS, attractedTo, sexualityOf } from './selfhood.js';
import { appearanceYear } from './appearance.js';
import * as F8 from './fate.js';
import * as PR8 from './property.js';
import * as ASC_LINES from '../data/ascendLines.js';
import '../data/localArms.js'; // v0.9.33 each country's own weapons
import { SECTS } from '../data/realms.js';
import { ITEMS } from '../data/items.js';
import { ambientLine } from '../data/storyPool.js';
import { CATEGORIES } from '../data/activities.js';
import { onBodyPath as onBodyPathQ } from './path.js';
import { rollTemper, temperYear, TEMPER } from '../data/temper.js';
import { gainClose as gainCloseP } from './people.js';
import { REJECT, BODY_ACTS, bodyYear, startPath, SEVERED_EVENTS, migrateBody } from './bodypath.js';
import { ACHIEVEMENTS, ACH_BY_ID } from '../data/achievements.js';

// ---- traits
for (const t of TRAITS2) if (!TRAIT_BY_ID[t.id]) { TRAITS.push(t); TRAIT_BY_ID[t.id] = t; }

// ---- social actions (children, blessing, moving in)
SOCIAL.push(...FAMILY_SOCIAL, MOVE_IN, ...TRAINER_SOCIAL, ...AGENT_SOCIAL);
{ const d = SOCIAL.find(s => s.id === 'date'); if (d) { const r0 = d.run; d.run = (c, p) => attractedTo(p, c) ? r0(c, p) : { text: `${p.first} smiled kindly. "You're lovely — but you're not who I'm looking for."`, cls: 'bad' }; } } // everyone has a sexuality now
for (const s of SOCIAL) s.run = withTaste(s.id, withFlavor(s.id, s.run), gainCloseP); // what you did, and whether THEY enjoyed it
wrapSocial(SOCIAL); // v0.9.21 people can say no; each interaction has its own minigame
SOCIAL.push(F8.ASSAULT, F8.MURDER); // v0.9.23 you can hurt anyone you know (added after wrapping: no declines, no flavour bonuses)
for (const s of F8.DEMONIC_SECTS) if (!SECTS.some(x => x.id === s.id)) SECTS.push(s);
for (const [id, it] of Object.entries(F8.DEMON_GEAR)) if (!ITEMS[id]) ITEMS[id] = it;
ACTIVITIES.push(F8.SEARCH_PAST);
ACTIVITIES.push(PR8.MANAGE);
{ const r0 = SACRIFICE.run; SACRIFICE.run = async c => { const r = await r0(c); if (r) { F8.addKarma(c, -25); F8.addInfamy(c, 400); c.demonPts = (c.demonPts || 0) + 20; } return r; }; }
// ---- more names (fewer repeats)
for (const cty of COUNTRIES) { const x = MORE_NAMES[cty.id]; if (x && !cty._more) { cty._more = 1; cty.m = [...new Set([...cty.m, ...x.m.split(' ')])]; cty.f = [...new Set([...cty.f, ...x.f.split(' ')])]; } }
// v0.9.17 much bigger pools + city-specific names
for (const cty of COUNTRIES) { const x = NAMES3[cty.id]; if (x && !cty._more3) { cty._more3 = 1; const sp = v => (v || '').split('|').map(t => t.trim()).filter(Boolean); cty.m = [...new Set([...cty.m, ...sp(x.m)])]; cty.f = [...new Set([...cty.f, ...sp(x.f)])]; cty.last = [...new Set([...cty.last, ...sp(x.last)])]; }
  const R = REGIONAL[cty.id]; if (R && !cty.regional) cty.regional = Object.fromEntries(Object.entries(R).map(([city, v]) => [city, { m: v.m.split('|'), f: v.f.split('|'), last: v.last.split('|') }])); }
// ---- martial arts schools replace the old all-you-can-eat class; private school, migration
{ const i = ACTIVITIES.findIndex(a => a.id === 'martial'); if (i >= 0) ACTIVITIES[i] = MARTIAL; else ACTIVITIES.push(MARTIAL); }
{ const i = ACTIVITIES.findIndex(a => a.id === 'doctor'); if (i >= 0) ACTIVITIES[i] = DOCTOR; else ACTIVITIES.push(DOCTOR); }
ACTIVITIES.push(GRAD, PHD, TRADE); // v0.9.21 higher education & trades
ACTIVITIES.push(SWITCH_ART, PRIVATE, MIGRATE, REJECT, ...BODY_ACTS, SACRIFICE, ...QI_ACTS, ...PRISON_ACTS, REHAB, ...IDENTITY_ACTS);
if (!CATEGORIES.some(x => x.id === 'prison')) CATEGORIES.push(PRISON_CAT);
// born without Qi at all
for (const t of [{ id: 'heaven_severed', tier: 'legendary', name: 'Heaven-Severed', desc: 'Born with no Qi at all. You walk the Severed Path from birth: +12 Strength, +10 Agility, +10 Health.', mods: { strength: 12, agility: 10, health: 10 } }]) if (!TRAIT_BY_ID[t.id]) { TRAITS.push(t); TRAIT_BY_ID[t.id] = t; }
for (const a of [{ id: 'severed', name: 'Severed', desc: 'Walk the Severed Path.', pts: 5, check: c => c.path === 'body' }, { id: 'iron_body', name: 'Steel Without Qi', desc: 'Reach Steel Sinew on the Severed Path.', pts: 10, check: c => (c.bodyPath?.tier || 0) >= 3 }, { id: 'unbound', name: 'The Unbound', desc: 'Complete the Severed Path.', pts: 40, check: c => (c.bodyPath?.tier || 0) >= 12 }, ...GOD_ACHIEVEMENTS]) if (!ACH_BY_ID[a.id]) { ACHIEVEMENTS.push(a); ACH_BY_ID[a.id] = a; }
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
      c.wins++; const m = Math.round(ri(400, 1200) * (1 + c.qi.realm) * wage(c)); money(c, m);
      return { text: `Mercenary contract fulfilled. Paid ${fmtMoney(c, m)}, no questions asked.`, cls: 'good' }; } },
  { id: 'refine_essence', cat: 'cultivation', name: 'Refine Bloodline Essence', icon: 'flask', minAge: 14, need: c => c.inv.bloodline_essence > 0, run: c => {
      addItem(c, 'bloodline_essence', -1); ensureDna(c).points++; return { text: 'I refined the Bloodline Essence. Something dormant in my blood opened its eyes (+1 Awakening point).', cls: 'qi', big: true }; } },
);

// ---- events
const gs = EVENTS.find(e => e.id === 'gate_spawn');
if (gs) { Object.defineProperty(gs, 'w', { get: () => newsMult('gate_surge') ? 8 : 2 }); gs.run = c => { spawnGate(c); }; }
EVENTS.push(GOD_EVENT, SACRIFICE_EVENT, ...DARK_EVENTS, ...SEVERED_EVENTS, ...FORTUNE_EVENTS,
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
HOOKS.yearStart.push(c => { if (c.alive && Math.random() < 0.7) ui.log(ambientLine(c), 'ambient'); }); // a quiet line of atmosphere for the new year
HOOKS.yearStart.push(c => { newsYear(c); portfolioYear(c); birthYear(c, haveChild); });
HOOKS.yearEnd.push(async c => { if (c.alive) { trainersYear(c); jobsYear(c); gigYear(c); appearanceYear(c); addictionYear(c); if (!c.alive) return; temperYear(c, ui, stat); legacyYear(c); renownYear(c); await lawYear(c); if (!c.alive) return; if (inOtherworld(c)) await otherworldYear(c); if (!c.alive) return; if (!isFinite(c.qi.qi) || isNaN(c.qi.qi)) c.qi.qi = (await import('./cultivation.js')).qiCap(c); if (c.qi.realm >= 1 && !c.qiType && !onBodyPathQ(c)) awakenQi(c); } });
HOOKS.birth.push(c => { rollTemper(c); legacyBirth(c); c.birthSex = c.gender; sexualityOf(c); ui.log(`Personality: ${c.temper.map(id => TEMPER[id].name).join(', ')}.`); });
// v0.9.21 decisions at work
HOOKS.yearEnd.push(async c => { if (c.alive) await (await import('./workEvents.js')).workEvent(c); });
// v0.9.19 school life: marks drift, clubs, awards, report card
HOOKS.yearEnd.push(async c => { if (c.alive) (await import('./school.js')).schoolLife(c); });
// v0.9.15 the people in your life react, ask, drift and pay you back (runs after the year's other events)
HOOKS.yearEnd.push(async c => { if (c.alive) await (await import('./social.js')).socialYear(c); });
// v0.9.4 Gate breaches: one rupture a year is fought out on the city wall
HOOKS.yearEnd.push(async c => {
  if (!c.alive || !(c.breaches || []).length || !ui.breach) return;
  const B = await import('./breach.js'); const rank = c.breaches.sort((a, b) => B.breachTier(b) - B.breachTier(a))[0]; c.breaches = [];
  if (c.prison || c.otherworld) { B.breachLost(c, rank, { leaks: 3, fled: false }); return; }
  ui.cinematic?.({ motif: 'crack', color: '#ff4f4f', lines: [`The ${rank}-rank Gate tears wide open.`, 'Everything inside it is coming out.'], title: 'Gate Breach', sub: c.city, sound: 'heavy', hold: 1.6 });
  const res = await ui.breach(c, rank); if (res?.win) B.breachWon(c, rank, res); else B.breachLost(c, rank, res || { leaks: 3, fled: true });
});
HOOKS.yearEnd.push(async c => {
  grantPoints(c); schoolYear(c); ownSectYear(c); bodyYear(c);
  if (!canGetQiIllness(c) && clearQiIllness(c)) ui.log('Without cultivated Qi in my body, the Qi sickness simply faded away.', 'good');
  await factionsYear(c);
  if (c.alive) await disputeYear(c);
  ensureMatchingGate(c);
  for (const t of TRAITS2) if (t.earnIf && !c.traits.includes(t.id) && t.earnIf(c)) earnTrait(c, t.id);
  // special occasions get their own scenes (once per life)
  const once = (k, cond, o) => { if (!c.flags['cine_' + k] && cond) { c.flags['cine_' + k] = 1; ui.cinematic?.(o); } };
  once('qi', c.qi.known, { motif: 'enso', color: '#7fe3ff', lines: ['For the first time, you see it: the air breathing.', 'Qi. It was always there.'], title: 'Awakening', sub: `${c.first} ${c.last}`, sound: 'trait' });
  once('gate', c.gatesCleared >= 1, { motif: 'seal', color: '#ffb02e', lines: ['The Gate collapses behind you like a held breath let go.', 'You walked into the dark — and walked out.'], title: 'First Gate Cleared', sub: 'Gate hunter', sound: 'milestone' });
  once('grad', c.edu.level >= 2, { motif: 'lotus', color: '#ffd36f', lines: ['Caps in the air. A rolled paper with your name on it.', c.edu.major ? `A degree in ${c.edu.major}.` : 'Four years, finally done.'], title: 'Graduation', sub: 'University', sound: 'milestone' });
  once('sect', !!c.ownSect, { motif: 'seal', color: '#ffd36f', lines: ['A plaque is hung above a gate that did not exist last year.', `The ${c.ownSect?.name || 'sect'} is born. The ${c.ownSect?.clan || c.last} clan begins.`], title: c.ownSect?.name || 'A New Sect', sub: 'Founded', sound: 'ascend' });
  once('guildS', (c.guild?.rank || 0) >= 5, { motif: 'sword', color: '#ff4f4f', lines: ['Your name goes up on the top board of the Guild hall.', 'Children whisper it in the streets.'], title: 'S-Rank Hunter', sub: 'Hunter Guild', sound: 'ascend' });
  once('century', c.age >= 100, { motif: 'tree', color: '#7fe3a0', lines: ['A hundred winters.', 'Most of the faces you knew are portraits now.'], title: 'One Hundred Years', sub: `${c.first} ${c.last}`, sound: 'milestone' });
  once('elder', (c.sectRank || 0) === 3, { motif: 'seal', color: '#c39bff', lines: ['They give you a seat at the long table.', 'Younger disciples bow when you pass.'], title: 'Elder', sub: 'Sect promotion', sound: 'milestone' });
});
HOOKS.death.push(c => { F8.rollFate(c); });
HOOKS.yearEnd.push(async c => { if (c.alive) await F8.fateYear(c); });
HOOKS.yearEnd.push(async c => { if (c.alive) (await import('./skills.js')).skillsYear(c); });
HOOKS.yearEnd.push(async c => { if (c.alive) (await import('./property.js')).propertyYear(c); }); // v0.9.28 businesses, market, upkeep
HOOKS.yearEnd.push(async c => { if (c.alive) await (await import('./situations.js')).situationYear(c); }); // v0.9.30 a dilemma every couple of years // v0.9.25 comprehend new Qi arts
HOOKS.death.push(c => {
  const born = G.world.year - c.age;
  ui.cinematic?.({ motif: 'crack', color: '#b9b0c0', threads: 4, lines: [`${c.cause ? (c.cause[0].toUpperCase() + c.cause.slice(1)).replace(/^I /, 'You ').replace(/\bmy\b/g, 'your') : 'The end came'}.`, c.heirlooms?.length || c.people.some(p => ['Son', 'Daughter'].includes(p.role) && p.alive) ? 'What you leave behind waits for your heirs.' : 'With no heir, your bloodline — and all it carried — ends here.'], title: fullName(c), sub: `${born} – ${G.world.year} · aged ${c.age}`, sound: 'death', introSound: 'click' });
});

// ---- install UI-side pieces (called by main.js once the UI hooks exist)
export async function installExpansion() {
  { const l0 = ui.log; ui.log = (t, cls, ...r) => { if (cls === 'bad' && G.char?.alive) noteBad(G.char); return l0(t, cls, ...r); }; } // v0.9.45 luck.js lull
  const [{ cinematic }, { TABS, render, runActivity }, P] = await Promise.all([import('../ui/cinematic.js'), import('../ui/render.js'), import('../ui/expansionPanels.js')]);
  const SP = await import('../data/storyPool.js'); ui.cinematic = o => cinematic(o.keepLines ? o : SP.varyCinematic(o)); // v0.9.2 varied scenes
  const AR = await import('../ui/arena.js'); const { S } = await import('../settings.js');
  ui.arena = o => AR.arena(o); ui.arenaOn = () => S().arenaFights !== false;
  ui.bossPhase = (await import('../ui/render.js')).bossPhase;
  { const FU = await import('../ui/fableUI.js'); TABS.fables = FU.fablesTab; }
  { const base = TABS.cultivation, SK = await import('./skills.js'), { MOVES } = await import('../data/combat.js'), { h, icon } = await import('../ui/dom.js'); // v0.9.25 techniques list
    TABS.cultivation = () => { const out = [base()].flat(), c = G.char; if (!c?.qi?.known || onBodyPathQ(c)) return out;
      const known = c.qi.techs.filter(id => MOVES[id]), row = (id, has, note) => { const M = MOVES[id]; return h('div', { class: 'tech-row' + (has ? '' : ' locked') }, icon(M.icon, 'sm'), h('div', {}, h('b', {}, has ? M.name : '???'), ' ', h('span', { class: 'small muted' }, has ? `${M.qi ? M.qi + ' Qi · ' : ''}${M.info}` : note))); };
      const box = h('details', { class: 'box', open: true, style: { marginTop: '14px' } }, h('summary', {}, h('h3', { style: { display: 'inline' } }, 'Combat techniques')),
        h('p', { class: 'small muted' }, 'Manuals teach some arts. Others you must comprehend yourself: every meditation gives a chance (better if the art matches your element), and reaching a new realm often brings a sudden insight. In battle your meridians hold ' + (80 + c.qi.realm * 35) + ' Qi; use Charge Qi to draw more from your dantian.'),
        known.map(id => row(id, true)), SK.QI_ARTS.filter(a => !known.includes(a.id)).map(a => row(a.id, false, `Not yet comprehended · needs ${(REALMS[a.realm] || {}).name || 'realm ' + a.realm}${a.elem === c.qi.elem ? ' · suits your element' : ''}`)));
      return [...out, box]; }; }
  { const TU = await import('../ui/tradeUI.js'); TABS.trade = TU.tradeTab; }
  { const FTU = await import('../ui/fateUI.js'); TABS.blackmarket = FTU.blackMarketTab; const ch0 = TABS.character; TABS.character = function () { return [...[].concat(ch0.call(this)), FTU.fateCard(G.char)]; }; }
  { const BG = await import('../ui/breachGame.js'); ui.breach = (c, rank) => BG.playBreach(c, rank); }
  TABS.bloodline = P.bloodlineTab; TABS.factions = P.factionsTab;
  { const base = TABS.gates; TABS.gates = () => [...[base()].flat(), P.huntsPanel()]; }
  { const base = TABS.cultivation; const QB = await import('../ui/qiBadge.js'); TABS.cultivation = () => { const out = [base()].flat(); return G.char?.qi?.known ? [...out.slice(0, 1), QB.qiPanel(G.char), ...out.slice(1)] : out; }; }
  P.bindPanels(render, runActivity);
  const P2 = await import('../ui/panels2.js'); // (Severed Path, Wardrobe and Stock Market are part of the grouped NAV since v0.9.0)
  TABS.market = P2.marketTab; TABS.wardrobe = P2.wardrobeTab; TABS.severed = P2.bodyPathTab; P2.bindPanels2(render, runActivity);
  if (!META.shuffleSet) { META.shuffleSet = true; META.settings.station = 'shuffle'; }
  const fx0 = ui.fx;
  ui.fx = (kind, o = {}) => {
    if (kind === 'breakthrough' && o.major) {
      const R = REALMS.find(r => r.name === o.realm) || REALMS[G.char?.qi.realm || 1];
      // v0.9.31 a shuffled bag of flavour lines, so every breakthrough reads differently
      const AL = ASC_LINES, list = R.id === 'immortal' ? AL.IMMORTAL_LINES : AL.ASCEND_LINES, key = R.id === 'immortal' ? 'ascBagI' : 'ascBag';
      if (!META[key]?.length) META[key] = list.map((_, i) => i).sort(() => Math.random() - 0.5);
      const pair = list[META[key].pop()] || list[0];
      return cinematic({ motif: 'glyph', glyph: R.glyph, color: R.color, lines: pair, title: R.name, sub: 'You have ascended to', sound: 'ascend', hold: 2, keepLines: true });
    }
    return fx0(kind, o);
  };
}

// ---- save migration for characters from before v0.6.0
export function migrateExpansion(c) {
  if (!c) return;
  migrateHeirlooms(c); ensureDna(c); migrateBody(c); if (!canGetQiIllness(c)) clearQiIllness(c); migrateStocks(c); c.closet ||= []; c.outfit ||= {};
  if (c.sect && c.sectRank == null) { c.sectRank = c.sect === 'own' ? 4 : 0; c.contrib ??= 0; c.flags.sectJoined ??= G.world?.year; }
  for (const p of c.people || []) p.dna ||= npcDna(p.realm || 0);
  // award points for realms already reached
  const d = c.dna; if (!d.migrated) { d.migrated = true; let n = 0; if (c.age >= 18) { d.earned.adult = 1; n++; } for (let r = 1; r <= c.qi.realm; r++) { d.earned['r' + r] = 1; n++; } d.points += n; }
}
export { BIRTH_EVENTS };
