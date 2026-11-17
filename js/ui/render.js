// Main screen rendering: top bar, age bar, left nav, center tab content, right stats column.
import { effRealm, onBodyPath, canSeeSevered } from '../systems/path.js';
import { G, META, save } from '../core/state.js';
import { ui } from '../core/bus.js';
import { h, icon, $ } from './dom.js';
import { portraitFor, HAIR_COLORS, HAIR_STYLES, NATURAL_HAIR, FACE_BROWS, FACE_MOUTHS, FACE_EYES, FACE_MARKS } from './portrait.js';
import { fx } from './fx.js';
import { choice, openModal, toast, prompt } from './modal.js';
import { inventoryTab, craftingTab, healthTab } from './itemsPanel.js';
import { statusTab } from './statusPanel.js';
import { moodFace, TRAINABLE, decayRate } from '../systems/health.js';
import { COND_BY_ID, condTip } from '../data/conditions.js';
import * as LIC from '../systems/license.js';
import * as PUI from './propertyUI.js';
import * as TALK from '../systems/talk.js';
import * as MRD from '../systems/meridians.js';
import * as PRX from '../systems/practice.js';
import * as SCH from '../systems/school.js';
import * as WL from '../systems/workload.js';
import { lineIcon, moment } from './lineFx.js';
import { emblemSvg } from './sectEmblem.js';
import { playTrain } from './trainGame.js';
import { ITEMS } from '../data/items.js';
import { METHODS } from '../data/realms.js';
import { wage, rollQuality, tiered, QUALITY } from '../systems/life.js';
import * as J from '../systems/jobs.js';
import { fameLabel, addFame, gateFame, maybeTransmigrate, dropRelic } from '../systems/renown.js';
import { PERSONAS, ensurePersona } from '../data/personas.js';
import { TEMPER, MAX_TEMPER } from '../data/temper.js';
import { comfort, willInfo, giftToChild, wealthLabel, statCap, softCap, gainMult, CAPPED, discount, priceFor, country, lifeStage, fullName, fmtMoney, realm as realmOf, lifespan, ageUp, money, stat, addItem, ACTIONS_PER_YEAR, SOCIAL_PER_YEAR } from '../systems/life.js';
import { fatigueMult, realmName, qiCap, power, learnManual, breakthroughInfo, meridianInfo, meditateRange, HELPFUL_ITEMS, sectName, foundReq, foundSect, method, learnMethod } from '../systems/cultivation.js';
import { relLabel, isFamily, bonds, bondList, favor } from '../systems/people.js';
import { traitVal, earnTrait, checkEarned } from '../systems/traits.js';
import { ACTIVITIES, CATEGORIES, SOCIAL } from '../data/activities.js';
import { jobEmoji } from '../data/careers.js';
import { TRAITS, TIERS, TIER_ORDER, TRAIT_BY_ID } from '../data/traits.js';
import { REALMS, ELEMENTS, MANUALS, SECTS } from '../data/realms.js';
import { CAREERS, EDUCATION } from '../data/careers.js';
import { GATE_RANKS, ENEMIES, LOOT, GATE_TYPES, makeGate } from '../data/combat.js';
import { bonusMult } from '../systems/bonus.js';
import { geneName } from '../systems/genetics.js';
import { gainHeirloom, gateHeirloomChance, heirloomsOf } from '../systems/heirlooms.js';
import { S } from '../settings.js';
import { eff, statLimits, STAT_SYSTEMS } from '../systems/body.js';
import { HEIRLOOMS } from '../data/heirlooms.js';
import { WEALTH, TIERS as TIERS_C, BIOMES as BIOMES_C } from '../data/countries.js';
import { ri, pick, chance, weighted } from '../core/rng.js';
import { renderSettings } from './settingsPanel.js';
import { renderLegacy } from './legacyPanel.js';
import { VERSION, CHANGELOG } from '../version.js';
import { ACHIEVEMENTS, achPts } from '../data/achievements.js';
import { OMENS } from '../data/legacyTree.js';
import { flagEl } from './flags.js';
import { svgMap, osmLink } from './worldMap.js';
import { net, hostRoom, joinRoom, leave, sendChat, doCoopAction, COOP_ACTIONS, coopTick, voteInfo, voteAgeUp, inCoopRoom, resonance } from '../net/coop.js';
import { relState, HOSTILE_OK, FRACTURED_OK } from '../systems/fate.js';

// v0.9.0 grouped, collapsible drawers (Life stays on top, always visible)
export const NAV = [
  ['Self & Body', [['life', 'Life', 'life'], ['status', 'Status', 'robe'], ['character', 'Character', 'character'], ['health', 'Health', 'doctor'], ['bloodline', 'Bloodline', 'legacy'], ['wardrobe', 'Wardrobe & Armory', 'robe']]],
  ['Progression', [['skills', 'Skills & Traits', 'skills'], ['cultivation', 'Cultivation', 'cultivation'], ['fables', 'Fables', 'manual'], ['severed', 'Severed Path', 'fist'], ['crafting', 'Crafting & Gear', 'anvil']]],
  ['World & Social', [['people', 'People', 'people'], ['factions', 'Sect & Guild', 'crown'], ['world', 'World', 'world'], ['chronicle', 'Chronicle', 'study'], ['legacy', 'Legacy & Family', 'legacy'], ['coop', 'Co-op', 'people']]],
  ['Economy & Action', [['gates', 'Dungeons & Gates', 'gates'], ['inventory', 'Inventory', 'bag'], ['trade', 'Trade', 'shop'], ['blackmarket', 'Black Market', 'market'], ['career', 'Career', 'career'], ['education', 'Education', 'education'], ['assets', 'Assets & Market', 'assets'], ['market', 'Stock Market', 'stocks']]],
  ['Game', [['achievements', 'Achievements', 'trophy'], ['updates', 'Update Log', 'letter'], ['settings', 'Settings', 'settings']]],
];

// ---------- chronicle logging (used through bus.ui.log)
export function logLine(text, cls = '') {
  const c = G.char; if (!c) return;
  if (cls === 'world' && META.settings.showWorldNews === false) return;
  if (!c.log.length) c.log.push({ age: c.age, year: G.world.year, lines: [] });
  c.log[c.log.length - 1].lines.push({ t: text, c: cls });
  if (c.age > 0) moment(text, cls); // v0.9.18 small alert for notable good/bad moments
}

// ---------- action runner: spends budget, handles repeat-FX rule
// v0.9.23 the update checker never reloads while an activity is running
export async function runActivity(a, el, opt = {}) { window.__fiBusy = (window.__fiBusy || 0) + 1; try { return await runActivity0(a, el, opt); } finally { window.__fiBusy = Math.max(0, window.__fiBusy - 1); } }
async function runActivity0(a, el, opt = {}) {
  const c = G.char; if (!c.alive) return;
  const snap = { ...c.stats, qi: c.qi.qi, money: c.money }, at = el?.getBoundingClientRect?.(); if (el) { el.classList.remove('act-pop'); void el.offsetWidth; el.classList.add('act-pop'); }
  const cost = a.cost === 's' ? 'social' : 'actions';
  const free = a.cost === 'free';
  if (c.fableRun) return toast('You are inside a Fable. Actions can\'t be used until you finish it.');
  if (!free && c[cost] <= 0) return toast('No actions left this year. Age up!');
  if (c.prison && a.cat !== 'mind' && a.cat !== 'training' && a.cat !== 'prison') return toast('You are in prison.');
  fx('click');
  // v0.9.8 practice: optional micro-minigame, then a 4-tier outcome (peak / solid / sloppy / mishap)
  const PID = a.practice || a.id, PR = !free && (!a.canPractice || a.canPractice(c)) && PRX.practiceFor(PID); let roll = null, psnap = null;
  if (PR) { const score = opt.score !== undefined ? opt.score : await playTrain(PRX.gameKind(c, PID), PRX.difficulty(c, PID), a.name);
    if (PR.scoreOnly) c._mg = score; else { roll = PRX.rollTier(c, PID, score); a._roll = roll; psnap = { ...c.stats, qi: c.qi.qi, grades: c.edu?.grades, perf: c.job?.perf }; } }
  let res; try { res = await a.run(c); } finally { delete c._mg; }
  if (res == null) { render(); return; } // cancelled / couldn't afford → no cost
  const r = typeof res === 'string' ? { text: res } : res;
  if (a.name && !free) c.doing = { t: a.name, at: Date.now() };
  if (PR && roll) { const o = PRX.applyPractice(c, PID, psnap, roll); r.text = r.text.replace(/\s*(Strength|Agility|Battle Knowledge|Battle|Smarts|Charisma) \+\d+\.?/g, '').replace(/\s*\+[\d,]+ Qi\.?/g, '') + ' ' + o.text; if (o.cls && r.cls !== 'qi') r.cls = o.cls; if (o.big) r.big = true; if (o.tier === 'peak') fx('milestone'); else if (o.tier === 'mishap') fx('heavy'); }
  if (!free && !r.refund) { c[cost]--; c.usedThisYear = (c.usedThisYear || 0) + 1; WL.addActLoad(c, a); }
  if (!free && traitVal(c, 'refund') && chance(traitVal(c, 'refund'))) { c[cost]++; r.text += ' (D̷U̷P̷L̷I̷C̷A̷T̷E̷D̷ — action refunded)'; }
  c.counts[a.id] = (c.counts[a.id] || 0) + 1; const n = c.counts[a.id];
  if (a.id !== 'meditate' && c.qi.fatigue) c.qi.fatigue = Math.max(0, c.qi.fatigue - 0.5);
  logLine(r.text, r.cls || '');
  if (cost === 'social') { // socialising trains charisma, and close friends may do you a favor
    stat(c, 'charisma', chance(0.6) ? 2 : 1);
    if (a.person && a.person.close >= 75 && chance(0.12)) { const t = favor(c, a.person); if (t) { logLine(t, 'good'); r.big = true; } }
  }
  checkEarned(c);
  // subtle feedback only the first time / on milestones / big moments, so grinding stays quiet
  if (r.big || [1, 10, 25, 50, 100].includes(n)) fx(r.big ? 'milestone' : 'action');
  if (a.person) { a.person.talks = (a.person.talks || 0) + 1; a.person.lastTalk = G.world.year; }
  gainPopups(c, snap, at);
  save(); render();
  if (!c.alive) import('./legacyPanel.js').then(m => m.deathScreen());
}

// v0.9.0 floating +gains rising from the button you pressed
const GAIN_LBL = { health: 'Health', happiness: 'Happy', stress: 'Stress', smarts: 'Smarts', looks: 'Looks', strength: 'Str', battle: 'Battle', agility: 'Agi', charisma: 'Cha', luck: 'Luck', qi: 'Qi', money: '' };
export function gainPopups(c, snap, at, mult = 1) {
  if (!at || S().reduceMotion) return; const layer = document.getElementById('fx') || document.body; let i = 0;
  for (const k of Object.keys(GAIN_LBL)) { const now = k === 'qi' ? c.qi.qi : k === 'money' ? c.money : c.stats[k], d = Math.round((now ?? 0) - (snap[k] ?? 0)); if (!d) continue;
    const good = k === 'stress' ? d < 0 : d > 0, txt = k === 'money' ? `${d > 0 ? '+' : '-'}${fmtMoney(c, Math.abs(d))}` : `${d > 0 ? '+' : ''}${d} ${GAIN_LBL[k]}`;
    const n = h('div', { class: 'gain-pop ' + (good ? 'good' : 'bad') }, txt); n.style.left = (at.left + at.width / 2) + 'px'; n.style.top = (at.top - 6 - i * 22) + 'px'; n.style.animationDelay = (i * 70) + 'ms';
    layer.append(n); setTimeout(() => n.remove(), 1600 + i * 70); if (++i >= 5) break; }
}
// ---------- top + age bar
function topbar() {
  const c = G.char, cty = country(c);
  $('#topbar').replaceChildren(
    h('div', { class: 'who' }, realmFrame(c, h('div', { class: 'mini' }, portraitFor(c, 64))),
      h('div', {}, h('div', { class: 'name display' }, flagEl(c.country, country(c).name), ' ', fullName(c)), h('div', { class: 'sub' }, `${c.qi.realm || onBodyPath(c) ? realmName(c) : 'Human'} · ${c.gender === 'F' ? 'Female' : 'Male'} · Age ${c.age} · ${lifeStage(c.age)}`), c.ownSect ? h('div', { class: 'clan' }, c.ownSect.emblem ? emblemSvg(c.ownSect.emblem, 18) : '👑', ` ${c.gender === 'F' ? 'Matriarch' : 'Patriarch'} of the ${c.ownSect.clan} Clan · ${c.ownSect.name}`) : null)),
    h('div', { class: 'center' }, h('div', {}, h('b', {}, `Year ${G.world.year}`), ' · ', h('span', { class: 'era' }, G.world.era)),
      h('div', { class: 'where' }, '📍 ', `${c.city}, ${cty.name}`)),
    h('div', { class: 'right' }, h('div', {}, icon('market', 'sm'), ' ', h('span', { class: 'money' }, fmtMoney(c, c.money)), ' ', h('span', { class: 'muted', title: `Born into a ${WEALTH.find(w => w.id === c.wealth).name.toLowerCase()} family` }, wealthLabel(c))),
      h('div', { class: 'sub' }, `Fame: ${fameLabel(c.fame || 0)} · Life #${META.lives} · Gen ${c.generation}`),
      h('div', { class: 'row', style: { justifyContent: 'flex-end', gap: '6px' } }, h('button', { class: 'version-chip', title: 'Save & return to the main menu', onclick: () => ui.toMenu?.() }, '☰ Menu'), h('button', { class: 'version-chip', title: 'Update log', onclick: () => openChangelog(CHANGELOG) }, `v${VERSION}`))));
}
function agebar() {
  const c = G.char;
  const pips = (n, max, cls) => h('span', { class: 'pips' }, Array.from({ length: max }, (_, i) => h('i', { class: 'pip ' + cls + (i >= n ? ' used' : '') })));
  $('#agebar').replaceChildren(
    h('span', { class: 'age-title display' }, `AGE ${c.age}`), h('span', { class: 'muted' }, '· ' + lifeStage(c.age)),
    c.alive ? '' : h('span', { class: 'hint' }, 'This life has ended.'),
    h('span', { class: 'budget' }, h('span', { class: 'bud-grp' }, 'Actions ', h('b', {}, `${c.actions}/${c.maxActions || ACTIONS_PER_YEAR}`), pips(c.actions, c.maxActions || ACTIONS_PER_YEAR, '')), h('span', { class: 'bud-sep' }), h('span', { class: 'bud-grp' }, 'Social ', h('b', {}, `${c.social}/${c.maxSocial || SOCIAL_PER_YEAR}`), pips(c.social, c.maxSocial || SOCIAL_PER_YEAR, 'social'))),
    ageBtn(c));
}
// In a co-op room the button becomes a vote: shows who's ready and the countdown.
function ageBtn(c) {
  const v = voteInfo();
  if (!v) return h('button', { id: 'ageup', class: c.alive && c.actions <= 0 ? 'ready-pulse' : '', disabled: !c.alive, onclick: onAgeUp }, 'AGE UP ▶ ', c.age + 1);
  return h('button', { id: 'ageup', class: 'voting' + (v.mine ? ' ready' : ''), disabled: v.mine, title: `Waiting for: ${v.waiting.join(', ')}`, onclick: onAgeUp },
    v.mine ? `READY ${v.yes}/${v.total} · ${v.left}s` : `AGE UP ▶ ${c.age + 1}`, h('small', { style: { display: 'block', fontSize: '11px', opacity: 0.85 } }, v.mine ? `waiting for ${v.waiting.join(', ')}` : `${v.yes}/${v.total} ready · ${v.left}s left`));
}
net.onVote = () => { const b = document.getElementById('ageup'); if (b && G.char) b.replaceWith(ageBtn(G.char)); };
net.doAgeUp = () => realAgeUp();
let aging = false;
async function onAgeUp() {
  const c = G.char; if (aging || !c.alive && !inCoopRoom()) return;
  if (S().confirmAgeUp && (c.actions > 0 || c.social > 0)) {
    const ok = await choice({ title: 'Age up?', icon: 'clock', text: `You still have ${c.actions} action${c.actions === 1 ? '' : 's'} and ${c.social} social action${c.social === 1 ? '' : 's'} left this year. Unused actions are lost.`,
      options: [{ label: 'Age up anyway', value: true }, { label: 'Wait — use them first', value: false, ghost: true }, { label: 'Age up, and stop asking me', value: 'never', ghost: true }] });
    if (!ok) return; if (ok === 'never') { META.settings.confirmAgeUp = false; save(); }
  }
  if (inCoopRoom()) { voteAgeUp(); return; }
  return realAgeUp();
}
async function realAgeUp() {
  const c = G.char; if (aging || !c?.alive) return;
  aging = true; try { await ageUp(); } finally { aging = false; }
  G.ui.tab = c.alive ? G.ui.tab : 'life'; render();
  if (!c.alive) import('./legacyPanel.js').then(m => m.deathScreen());
}

// ---------- left nav
function sidebar() {
  const c = G.char;
  const badge = id => id === 'coop' && net.status === 'reconnecting' ? '…' : id === 'coop' && net.status === 'online' ? net.peers.size + 1 : id === 'gates' && c.gates.length ? c.gates.length : id === 'cultivation' && c.qi.realm && c.qi.qi >= qiCap(c) ? '!' : null;
  const curLabel = NAV.flatMap(([, it]) => it).find(([id]) => id === G.ui.tab)?.[1] || 'Menu';
  $('#sidebar').classList.toggle('open', !!G.ui.navOpen);
  const shut = (META.settings.navShut ||= { Game: true }), vis = it => it.filter(([id]) => (id !== 'cultivation' || (!onBodyPath(c) && (c.qi.known || META.bestRealm > 0))) && (id !== 'severed' || canSeeSevered(c)) && (id !== 'fables' || (c.fame || 0) >= 1e5 || !!c.fables || !!c.fableRun) && (id !== 'blackmarket' || !!c.demonic));
  $('#sidebar').replaceChildren(h('button', { class: 'nav-toggle', onclick: () => { fx('click'); G.ui.navOpen = !G.ui.navOpen; render(); } }, h('span', {}, '☰ ', curLabel), h('span', { class: 'muted' }, G.ui.navOpen ? 'Close ▴' : 'All tabs ▾')), ...NAV.flatMap(([g, items]) => { const its = vis(items), here = its.some(([id]) => id === G.ui.tab), closed = shut[g] && !here;
    const b = its.reduce((n, [id]) => n + (badge(id) ? 1 : 0), 0);
    return [h('button', { class: 'nav-group' + (closed ? ' shut' : ''), onclick: () => { fx('click'); shut[g] = !shut[g]; save(); render(); } }, h('span', {}, g), closed && b ? h('span', { class: 'badge' }, b) : null, h('span', { class: 'chev' }, closed ? '▸' : '▾')),
    ...(closed ? [] : its.filter(([id]) => (id !== 'cultivation' || (!onBodyPath(c) && (c.qi.known || META.bestRealm > 0))) && (id !== 'severed' || canSeeSevered(c)) && (id !== 'fables' || (c.fame || 0) >= 1e5 || !!c.fables || !!c.fableRun) && (id !== 'blackmarket' || !!c.demonic)).map(([id, label, ic]) => h('button', { class: 'nav-btn' + (G.ui.tab === id ? ' active' : ''), title: label, 'data-nav': id, onclick: () => { fx('click'); G.ui.tab = id; G.ui.navOpen = false; render(); window.innerWidth <= 760 && document.getElementById('center').scrollIntoView({ behavior: 'smooth' }); } },
      icon(ic), h('span', { class: 'lbl' }, label), badge(id) ? h('span', { class: 'badge' }, badge(id)) : null))),
    ...(g === 'Game' && !closed ? [h('button', { class: 'nav-btn nav-menu', title: 'Save & return to the main menu', onclick: () => { fx('click'); G.ui.navOpen = false; ui.toMenu?.(); } }, icon('life'), h('span', { class: 'lbl' }, 'Main Menu'))] : [])]; }));
}

// ---------- right column
function bar(label, val, color, ic, max = 100, text) {
  return h('div', { class: 'bar-row' }, h('div', { class: 'lbl' }, h('span', {}, ic ? icon(ic, 'sm') : null, ' ', label), h('span', { class: 'val' }, text ?? Math.round(val))),
    h('div', { class: 'bar' }, h('i', { style: { width: Math.max(0, Math.min(100, val / max * 100)) + '%', '--c': color } })));
}
function rightCol() {
  const c = G.char, s = c.stats;
  const out = [
    h('div', {}, bar('Health', s.health, '#ff5a6a', 'heart'), bar(`Happiness ${moodFace(s.happiness)}`, s.happiness, '#ffd84a', 'sun'), bar('Stress', s.stress, '#ff8a3a', 'brokenheart'),
      bar('Smarts', eff(c, 'smarts'), '#6ab0ff', 'mind', 100, eff(c, 'smarts') < s.smarts ? `${eff(c, 'smarts')} (${s.smarts})` : undefined), bar('Looks', s.looks, '#ff8ad0', 'flower'),
      c.qi.known ? bar('Qi', c.qi.qi, 'var(--qi)', 'cultivation', qiCap(c), `${c.qi.qi}/${qiCap(c)}`) : null),
    h('div', { class: 'box' }, h('h3', {}, 'Your Stats'), h('div', { class: 'realm-line' }, icon('cultivation', 'sm'), ' ', h('b', {}, c.qi.known || onBodyPath(c) ? realmName(c) : 'Realm: ???')), h('div', { class: 'stats' },
      ...[['fist', 'Strength', effShow(c, 'strength')], ['combat', 'Battle IQ', effShow(c, 'battle')], ['kick', 'Agility', effShow(c, 'agility')], ['people', 'Charisma', effShow(c, 'charisma')], ['star', 'Luck', s.luck],
        ['combat', 'Power', power(c).toFixed(1)], ['trophy', 'Fights won', c.wins], ['gates', 'Gates', c.gatesCleared],
        ['market', 'Gold', fmtMoney(c, c.money)], (c.fame || 0) < 0 ? ['bell', 'Infamy', (-c.fame).toLocaleString()] : ['bell', 'Fame', (c.fame || 0).toLocaleString()]].map(([ic, k, v]) => h('div', {}, icon(ic, 'sm'), k, h('b', {}, v))))),
    (c.conditions || []).length ? h('div', { class: 'box' }, h('h3', {}, 'Conditions'), c.conditions.map(x => h('span', { class: 'chip', ...condTip(x), style: { '--tc': 'var(--bad)', cursor: 'pointer' }, onclick: () => { G.ui.tab = 'health'; render(); } }, COND_BY_ID[x.id].name))) : null,
    h('div', { class: 'box' }, h('h3', {}, 'Traits'), c.traits.length ? c.traits.map(traitChip) : h('span', { class: 'muted' }, 'None yet.')),
    h('div', { class: 'box' }, h('h3', {}, 'Personality'), (c.temper || []).length ? (c.temper || []).map(temperChip) : h('span', { class: 'muted' }, 'Not yet formed.')),
    (c.omens || []).length ? h('div', { class: 'box' }, h('h3', {}, 'Birth omens'), c.omens.map(id => { const O = OMENS[id]; if (!O) return null; const el = h('span', { class: 'chip omen-chip ' + O.kind, tabindex: 0, 'data-tip-title': O.name, 'data-tip-sub': O.kind === 'blessing' ? 'Birth blessing' : 'Birth curse', 'data-tip': O.desc }, (O.kind === 'blessing' ? '✦ ' : '✖ ') + O.name); return el; })) : null,
  ];
  $('#right').replaceChildren(...out.filter(Boolean));
}
const EARN_HINTS = {
  orphaned: 'lose both parents as a child', wins5: 'win 5 fights', wins25: 'win 25 fights', kill: 'take a life', prison: 'survive prison',
  gates10: 'clear 10 Gates', tribulation_close: 'survive a Heavenly Tribulation on very low HP', devour_core: 'devour a Demonic Core',
  mortal100: 'live to 100 without cultivating', idle30: 'live 30 years in a row without using an action', spam_age: 'press Age Up 5 times in one second',
  ascend: 'reach Immortal Ascension', busy20: 'use every Action for 20 years in a row', spar50: 'spar 50 times', found_sect: 'found your own sect', ghost_king: 'defeat a Ghost King in a Gate',
  recipes8: 'discover 8 crafting recipes', coop_marry: 'marry another player in co-op', divorce3: 'divorce 3 times',
};
export function temperChip(id) {
  const t = TEMPER[id]; if (!t) return null; const col = t.good ? '#7fe0a0' : '#ffb36a';
  const el = h('span', { class: 'chip temper ' + (t.good ? 'good' : 'mixed'), tabindex: 0, 'data-tip-title': t.name, 'data-tip-sub': t.good ? 'Personality · virtue' : 'Personality · trade-off', 'data-tip': t.desc, 'data-tip-color': col }, t.name); el.style.setProperty('--tc', col); return el;
}
export function traitChip(id) {
  const t = TRAIT_BY_ID[id]; if (!t) return null; const tier = TIERS[t.tier];
  const el = h('span', { class: 'chip ' + t.tier, tabindex: 0, 'data-tip-title': t.name, 'data-tip-sub': `${tier.name} trait`, 'data-tip': t.desc, 'data-tip-color': tier.color }, t.name); el.style.setProperty('--tc', tier.color); return el;
}

// ---------- center tabs
// Remember how many chronicle lines were already shown so re-renders don't replay the ink-in animation (no flicker).
const seen = { key: null, n: 0 };
function seenLines(c, cur) { const k = c.id + ':' + cur.age; const n = seen.key === k ? seen.n : 0; seen.key = k; seen.n = cur.lines.length; return n; }
// GPA on a 4.0 scale from the 0-100 grade average (90+ = A = 4.0)
export const gpa = g => SCH.gpaOf(g).toFixed(2);
const gpaText = g => { const v = +gpa(g); const L = SCH.letter(v); return `${v.toFixed(2)} / 4.0 (${L}) — the higher the better`; };
// effective (usable) stat, with the trained value shown when injuries hold it back
const effShow = (c, k) => { const e = eff(c, k), b = c.stats[k] ?? 0; return e < b ? h('span', { 'data-tip': `Trained ${b}, but your body only lets you use ${e}. ${statLimits(c, k).map(([n, x]) => `${n} ${Math.round(x * 100)}%`).join(', ')}`, style: { color: 'var(--bad, #ff7a6a)' } }, `${e}`, h('small', { class: 'muted' }, ` /${b}`)) : b; };
// v0.9.0 People: favourites + most-seen contacts, one tap away
function innerCircle(c) {
  const live = c.people.filter(p => p.alive && p.role !== 'Enemy'), fav = live.filter(p => p.fav);
  const frequent = live.filter(p => !p.fav && p.talks).sort((a, b) => b.talks - a.talks).slice(0, Math.max(0, 6 - fav.length)).slice(0, 3);
  const list = [...fav, ...frequent]; if (!list.length) return h('div', { class: 'muted small', style: { margin: '6px 0' } }, 'Tap ☆ on anyone to keep them in your Inner Circle.');
  return h('div', { class: 'inner-circle' }, h('div', { class: 'muted small' }, 'Inner Circle'), h('div', { class: 'ic-row' }, list.map(p => h('button', { class: 'ic-person', title: `${p.role} · ${p.close}%`, onclick: () => personModal(p) }, h('div', { class: 'pframe' }, portraitFor(p, 40)), h('span', {}, p.first, p.fav ? ' ★' : '')))));
}
// ---------- v0.9.0 Life tab helpers: pins, repeatable routine, batch
const RISKY = ['crime', 'adventure'];
// actions safe to repeat automatically (no prompts, no fights)
const REPEATABLE = ['gym', 'run', 'sports', 'combat_drills', 'meditate', 'study', 'library', 'walk', 'journal', 'work_hard', 'gather', 'fishing', 'alchemy_texts', 'body_condition', 'body_endure', 'pill', 'social_media', 'play_toys', 'cloud_watch'];
const availActs = c => ACTIVITIES.filter(a => c.age >= (a.minAge ?? 0) && c.age <= (a.maxAge ?? 999) && (!a.need || a.need(c)) && !(a.cat === 'cultivation' && (!c.qi.known || onBodyPath(c))));
function actBtn(a) {
  const c = G.char, pins = (META.settings.pins ||= []), pinned = pins.includes(a.id);
  return h('button', { class: 'act' + (RISKY.includes(a.cat) ? ' risky' : ''), disabled: (a.cost === 's' ? c.social : c.actions) <= 0, onclick: e => runActivity(a, e.currentTarget) },
    icon(a.icon), h('span', {}, a.name, PRX.practiceFor(a.id) && !PRX.practiceFor(a.id).scoreOnly ? h('span', { class: 'meta' }, `${PRX.masteryLabel(PRX.mastery(c, a.id))} · `, h('b', { class: 'risk' + (PRX.risk(c, a.id) >= 0.12 ? ' hi' : ''), 'data-tip': 'Chance this goes wrong (injury, backlash or strain). Rises when you repeat it in one year, or train hurt, stressed or sick. Mastery lowers it.' }, `${Math.round(PRX.risk(c, a.id) * 100)}% risk`), PRX.reps(c, a.id) >= 2 ? h('span', { class: 'tired', 'data-tip': 'You\'ve done this a lot this year: each extra session gives less.' }, ' · tired') : null) : c.counts[a.id] ? h('span', { class: 'meta' }, `done ${c.counts[a.id]}×`) : null),
    h('span', { class: 'pin' + (pinned ? ' on' : ''), title: pinned ? 'Unpin' : 'Pin to the top', onclick: e => { e.stopPropagation(); if (pinned) META.settings.pins = pins.filter(x => x !== a.id); else if (pins.length < 4) pins.push(a.id); else return toast('You can pin up to 4 actions.'); save(); render(); } }, pinned ? '★' : '☆'),
    h('span', { class: 'cost' }, a.cost === 's' ? '💬1' : '⚡1'));
}
async function runMany(list, el) { // runs a list of activities in order while actions last, with one combined popup
  const c = G.char, snap = { ...c.stats, qi: c.qi.qi, money: c.money }, at = el?.getBoundingClientRect?.(); let done = 0;
  const scores = {}; // one minigame per distinct action; its score counts for every repeat in the batch
  for (const a of list) { if (c.actions <= 0 || !c.alive) break; if (a.need && !a.need(c)) continue; const id = a.practice || a.id, P = PRX.practiceFor(id);
    if (P && !(id in scores) && (!a.canPractice || a.canPractice(c))) scores[id] = await playTrain(PRX.gameKind(c, id), PRX.difficulty(c, id), `${a.name} ×${list.filter(x => x.id === a.id).length}`);
    await runActivity(a, null, P ? { score: scores[id] } : {}); done++; }
  gainPopups(c, snap, at); if (done) toast(`Did ${done} action${done > 1 ? 's' : ''}.`);
}
// v0.9.32 the twelve meridians: what's open, what each does, the four circuits and the progress bar
function meridianPanel(c) {
  if (!c.qi.known || (c.qi.realm || 0) < 1) return null; MRD.ensureMer(c);
  const done = MRD.circuitsDone(c), info = meridianInfo(c);
  return h('div', { class: 'mer-panel' }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('b', {}, `Meridians ${c.qi.mer.length}/12`), h('span', { class: 'small muted' }, `Your realm can hold ${MRD.maxOpen(c)} open`)),
    c.qi.mer.length < 12 ? h('div', { class: 'mer-prog', title: 'Channel progress — never lost' }, h('i', { style: { width: Math.min(100, info.prog / info.need * 100) + '%' } }), h('span', {}, `${info.prog}/${info.need}`)) : null,
    h('div', { class: 'mer-circuits' }, Object.entries(MRD.CIRCUITS).map(([k, C]) => h('div', { class: 'mer-circ' + (done.includes(k) ? ' done' : '') },
      h('div', { class: 'small' }, h('b', {}, C.name), done.includes(k) ? ' ✓' : ''), h('div', { class: 'small muted' }, C.desc),
      MRD.MERIDIANS.filter(m => m.circuit === k).map(m => h('div', { class: 'mer-node' + (MRD.has(c, m.id) ? ' on' : '') }, h('i'), h('span', {}, m.name), h('small', {}, m.desc)))))),
    c.qi.mer.length >= 12 ? h('div', { class: 'small', style: { color: 'var(--qi)', marginTop: '6px' } }, `✦ ${MRD.GRAND.name}: ${MRD.GRAND.desc}`) : h('div', { class: 'small muted', style: { marginTop: '6px' } }, `Every open meridian also adds +5% Qi gain, +1.5% breakthrough chance and +5 battle Qi. Open all twelve for ${MRD.GRAND.name}.`));
}
// v0.9.29 the portrait frame grows more ornate with every realm (or Severed body tier)
import { BODY_TIERS as _BT } from '../data/bodypath.js';
function realmFrame(c, el) {
  const body = onBodyPath(c), R = body ? (c.bodyPath?.tier || 0) : (c.qi?.realm || 0); if (!R || !c.alive) return el;
  const col = body ? _BT[R]?.color : REALMS[R]?.color, tier = R >= 12 ? 5 : R >= 10 ? 4 : R >= 7 ? 3 : R >= 4 ? 2 : 1;
  el.classList.add('rf', 'rf' + tier); if (body) el.classList.add('rf-body'); el.style.setProperty('--rc', col || '#7fe3ff'); el.title = `${realmName(c)} — your frame changes as you ascend`;
  if (tier >= 3) for (const k of ['tl', 'tr', 'bl', 'br']) el.append(h('i', { class: 'rf-corner ' + k }));
  if (tier >= 4) el.append(h('i', { class: 'rf-aura' }));
  return el;
}
// v0.9.28 react to what someone just told you
function reactRow(c, id) {
  const t = TALK.talkOpen(c, id); if (!t) return null;
  return h('span', { class: 'react-row' }, TALK.REACT[t.mood].map(([label], i) => h('button', { class: 'react-chip', onclick: e => { e.stopPropagation(); fx('click'); TALK.respond(c, id, i); save(); render(); } }, label)));
}
function quickBar(c) {
  if (!c.alive) return null; const av = availActs(c), pins = (META.settings.pins || []).map(id => av.find(a => a.id === id)).filter(Boolean);
  // v0.9.25 the repeat-routine / batch bar is gone; only pinned actions remain
  return h('div', { class: 'quickbar' },
    pins.length ? h('div', { class: 'acts pinned' }, pins.slice(0, 4).map(actBtn)) : h('div', { class: 'muted small' }, 'Tap ☆ on any action to pin it here (up to 4).'));
}
// v0.9.7 driver's license panel (Assets tab)
function licenseBox(c) {
  const st = LIC.licenseState(c), F = LIC.fees(c), L = c.license || {}, busy = !c.alive || c.prison || c.actions <= 0;
  const act = (id, label, fn, dis) => h('button', { class: 'btn' + (id === 'lesson' ? ' ghost' : ''), disabled: busy || dis, onclick: e => runActivity({ id: 'lic_' + id, cat: 'work', run: fn }, e.currentTarget) }, label);
  const status = { none: 'No license', permit: `Learner's permit · ${L.lessons || 0}/4 lessons${L.fails ? ` · ${L.fails} failed test${L.fails > 1 ? 's' : ''}` : ''}`, full: `Full license since ${L.year}`, suspended: `Suspended until ${L.suspended}` }[st];
  return h('div', { class: 'box lic-box', style: { marginTop: '12px' } }, h('h3', {}, icon('car', 'sm'), " Driver's license"),
    h('div', { class: 'small lic-' + st }, status),
    st === 'none' ? [h('div', { class: 'muted small' }, `Needed to buy a car or work as a driver. Step 1: the theory test (age ${LIC.LICENSE_AGE.theory}+), three road-rules questions; get 2 right for a learner's permit.`),
      h('div', { class: 'row', style: { marginTop: '8px' } }, act('theory', `Take the theory test · ${fmtMoney(c, F.theory)} (⚡1)`, cc => LIC.theoryTest(cc), c.age < LIC.LICENSE_AGE.theory || c.money < F.theory))] : null,
    st === 'permit' ? [h('div', { class: 'muted small' }, `Lessons raise your pass chance. The test has one road situation — the wrong call is an instant fail — then the examiner judges your driving (${Math.round(LIC.testChance(c) * 100)}% now, from Agility, Smarts and lessons).`),
      h('div', { class: 'row', style: { marginTop: '8px', gap: '6px' } }, act('lesson', `Driving lesson · ${fmtMoney(c, F.lesson)} (⚡1)`, cc => LIC.lesson(cc), c.money < F.lesson || (L.lessons || 0) >= 4),
        act('test', `Take the driving test · ${fmtMoney(c, F.test)} (⚡1)`, cc => LIC.practicalTest(cc), c.age < LIC.LICENSE_AGE.test || c.money < F.test))] : null,
    st === 'full' ? h('div', { class: 'muted small' }, 'You can buy cars and take driving jobs. Drunk driving or prison will get it suspended.') : null);
}
// v0.9.19 workload meter: commitments + how hard you push this year → stress at year end
function workloadChip(c) {
  if (c.age < 6) return null; const L = WL.totalLoad(c), lv = WL.loadLevel(L), C = WL.commitments(c), pr = WL.projected(c);
  const tip = [...C.map(([l, v]) => `• ${l}: ${v}`), `• This year's actions: ${(c.yearLoad || 0) >= 0 ? '' : ''}${(c.yearLoad || 0).toFixed(1)}`, `Total ${L.toFixed(1)} / ${WL.CAPACITY} you can carry.`,
    pr ? `At year end: about +${pr} Stress${c.busyStreak ? ` (worse after ${c.busyStreak} hard year${c.busyStreak > 1 ? 's' : ''} in a row)` : ''}.` : 'No strain this year.', 'Rest (walks, journaling, fishing, a vacation) lowers it. Jobs, side gigs, school, a sect and young kids all add up.'].join('\n');
  const el = h('span', { class: 'wl-chip ' + lv.id, tabindex: 0, 'data-tip-title': `Workload: ${lv.name}`, 'data-tip': tip }, h('i', { style: { width: Math.min(100, L / (WL.CAPACITY + 8) * 100) + '%' } }), `Workload: ${lv.name}`);
  el.style.setProperty('--wc', lv.color); return el;
}
export const TABS = {
  // v0.9.2 Story stage: the last years scroll like a chronicle; actions live in a compact dock below
  life() {
    const c = G.char, cur = c.log[c.log.length - 1] || { lines: [] }, fresh = seenLines(c, cur);
    const KEY = ['good', 'bad', 'big', 'qi', 'death'];
    const years = c.log.slice(-7).map((y, yi, arr) => { const now = yi === arr.length - 1;
      return h('div', { class: 'st-year' + (now ? ' now' : '') }, h('div', { class: 'st-age' }, h('span', {}, `Age ${y.age}`)),
        ...(y.lines.length ? y.lines : [{ t: now ? (c.age === 0 ? 'A new story begins in faded ink.' : 'The year is still unwritten.') : 'A quiet year.', c: 'ambient' }]).map((l, li) =>
          h('p', { class: 'st-line ' + (l.c || '') + (KEY.some(k => (l.c || '').includes(k)) ? ' key' : '') + (now && li >= fresh ? ' fresh' : '') }, (() => { const ic = META.settings.showIcons !== false && lineIcon(l.t, l.c); return [...(ic ? [h('span', { class: 'st-ic' }, ic), l.t] : [l.t]), l.tk ? reactRow(c, l.tk) : null]; })()))); });
    const stage = h('div', { class: 'story-stage' }, ...years);
    // Keep the reader's place on re-renders (dock chips etc.); only jump to the end when new lines arrive. Instant, no smooth sweep.
    const sig = c.log.length + ':' + cur.lines.length, prev = G.ui.stage || {};
    stage.addEventListener('scroll', () => { G.ui.stage = { sig, top: stage.scrollTop, atEnd: stage.scrollTop + stage.clientHeight >= stage.scrollHeight - 30 }; }, { passive: true });
    requestAnimationFrame(() => { stage.scrollTop = (prev.sig === sig && !prev.atEnd) ? prev.top : stage.scrollHeight; G.ui.stage = { sig, top: stage.scrollTop, atEnd: prev.sig === sig ? prev.atEnd !== false : true }; });
    if (!c.alive) return [stage, h('div', { class: 'row', style: { marginTop: '16px' } }, h('button', { class: 'btn', onclick: () => import('./legacyPanel.js').then(m => m.deathScreen()) }, 'Continue your legacy'))];
    const cats = CATEGORIES.map(cat => { if (cat.id === 'cultivation' && (!c.qi.known || onBodyPath(c))) return null;
      const acts = ACTIVITIES.filter(a => a.cat === cat.id && c.age >= (a.minAge ?? 0) && c.age <= (a.maxAge ?? 999) && (!a.need || a.need(c)));
      return acts.length ? { cat, acts } : null; }).filter(Boolean);
    let open = cats.find(x => x.cat.id === G.ui.dock);
    const dock = h('div', { class: 'dock' }, cats.map(({ cat, acts }) => h('button', { class: 'dock-chip' + (open?.cat.id === cat.id ? ' on' : '') + (RISKY.includes(cat.id) ? ' risky' : ''), onclick: () => { fx('click'); G.ui.dock = G.ui.dock === cat.id ? null : cat.id; render(); } }, icon(cat.icon, 'sm'), cat.name, h('span', { class: 'n' }, acts.length))));
    const panel = open ? h('div', { class: 'dock-panel' + (RISKY.includes(open.cat.id) ? ' risky' : '') }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('b', {}, icon(open.cat.icon, 'sm'), ' ', open.cat.name), h('button', { class: 'btn ghost mini', onclick: () => { G.ui.dock = null; render(); } }, 'Close ✕')),
      h('div', { class: 'acts' }, open.acts.map(actBtn))) : null;
    return [stage, h('div', { class: 'year-bar' }, h('span', { class: 'display' }, `This year`), h('span', { class: 'muted small' }, workloadChip(c), `${c.actions} action${c.actions === 1 ? '' : 's'} · ${c.social} social left`)), quickBar(c), dock, panel];
  },

  character() {
    const c = G.char, cty = country(c);
    return [h('div', { class: 'row', style: { gap: '24px', alignItems: 'flex-start' } },
      realmFrame(c, h('div', { class: 'pframe' }, portraitFor(c, Math.max(160, (META.settings.portraitSize || 64) * 2.5)))),
      h('div', { style: { flex: 1, minWidth: '240px' } }, h('h2', { class: 'display', style: { fontSize: '2.2rem' } }, fullName(c)),
        h('table', { class: 'kv' }, [['Born', `${c.city}, ${cty.name} (year ${c.birthYear})`], ['Family wealth', WEALTH.find(w => w.id === c.wealth).name], ['Age', `${c.age} · ${lifeStage(c.age)}`],
          ['Expected lifespan', `~${lifespan(c)} years`], ['Hair', `${(c.hair?.style || c.genes.style)} · ${(c.hair?.color || c.genes.hairColor)}`], ['Base looks', c.genes.looks + ' (fixed at birth)'], ['Body type', `${{ lean: 'Lean', average: 'Average', chubby: 'Chubby' }[c.body?.build || c.genes.build || 'average']}${(c.body?.muscle || 0) >= 45 ? ' · broad from muscle' : ''} (training trims you down, idle years fill you out)`],
          ['Generation', c.generation], ['Heirlooms', heirloomsOf(c).map(x => HEIRLOOMS[x.id].name).join(', ') || '—']].map(([k, v]) => h('tr', {}, h('td', {}, k), h('td', {}, v)))),
        h('div', { class: 'row', style: { marginTop: '12px' } }, h('button', { class: 'btn', disabled: c.age < 13 || !c.alive, onclick: openSalon }, icon('salon', 'sm'), ' Visit the salon'), h('button', { class: 'btn ghost', disabled: c.age < 18 || !c.alive || c.actions <= 0, onclick: openSurgery }, icon('doctor', 'sm'), ' Plastic surgery')),
        h('p', { class: 'muted' }, 'You\'re born with your face and base looks. The salon changes your hair; plastic surgery (18+) can raise your Looks — at a price, and with a risk of going wrong. Cultivation and fitness help too.'))),
      h('div', { class: 'box', style: { marginTop: '16px' } }, h('h3', {}, 'Traits'), c.traits.map(id => { const t = TRAIT_BY_ID[id]; return h('div', { style: { margin: '6px 0' } }, traitChip(id), ' ', h('span', { class: 'muted' }, t.desc)); }))];
  },

  skills() {
    const c = G.char;
    return [h('h2', { class: 'display' }, 'Skills & Traits'),
      h('p', { class: 'muted' }, `Stat cap: ${statCap(c)} in ${c.qi.realm ? REALMS[c.qi.realm].name : 'the mortal realm'} (soft cap ${softCap(c)} — gains shrink past it). Each new cultivation realm raises the cap. ` + 'Trainable skills fade very slowly if you neglect them for 5+ years — about 1 point every 2 years, and 2 a year only after 20 idle years (never below 15). School keeps Smarts in use. Looks only fade with age.'),
      h('div', { class: 'grid2', style: { marginTop: '12px' } }, Object.entries(c.stats).map(([k, v]) => { const label = k === 'battle' ? 'Battle Knowledge' : k[0].toUpperCase() + k.slice(1); const tr = TRAINABLE.includes(k); const idle = tr ? c.age - ((c.lastTrained || {})[k] ?? Math.min(c.age, 6)) : 0;
        const loss = tr && v > 15 ? decayRate(c, k) : 0;
        const capped = CAPPED.includes(k), cap = capped ? statCap(c) : 100;
        const ev = STAT_SYSTEMS[k] ? eff(c, k) : v, lim = ev < v ? statLimits(c, k) : [];
        return h('div', { class: 'card' }, lim.length ? h('div', { class: 'small', style: { color: 'var(--bad, #ff7a6a)' } }, `Usable: ${ev} of ${v} — held back by ${lim.map(([n, x]) => `${n} ${Math.round(x * 100)}%`).join(', ')}`) : null, bar(label, v, v >= softCap(c) && capped ? 'var(--legend)' : 'var(--accent2)', null, cap, capped ? `${v} / ${cap}` : undefined), capped && v >= softCap(c) ? h('div', { class: 'small', style: { color: 'var(--legend)' } }, `Soft cap: gains ×${gainMult(c, k).toFixed(2)} — break through to raise the cap`) : null, k === 'battle' ? h('div', { class: 'muted small' }, `+${Math.round(v / 4)}% hit chance, +${Math.round(v / 2.5)}% damage, +${(v / 20).toFixed(1)}% crit in fights`) : null, tr ? h('div', { class: 'muted small' }, idle <= 0 ? 'Trained this year ✓' : `Last trained ${idle}y ago${loss ? ` · fading ~${loss}/yr` : idle < 5 ? ' · safe for now' : ''}`) : k === 'looks' ? h('div', { class: 'muted small' }, 'Fades with age only') : null); })),
      h('div', { class: 'box', style: { marginTop: '14px' } }, h('h3', {}, 'Sub-skills'),
        h('div', { class: 'row' }, icon('hammer'), h('div', { style: { flex: 1 } }, h('b', {}, `Craftsmanship ${Math.floor(c.craftsman || 0)} / 100`), h('span', { class: 'muted small' }, ` · ${c.craftsman >= 90 ? 'Grandmaster' : c.craftsman >= 70 ? 'Master' : c.craftsman >= 50 ? 'Artisan' : c.craftsman >= 30 ? 'Journeyman' : c.craftsman >= 12 ? 'Apprentice' : 'Novice'}`),
          h('div', { class: 'bar' }, h('i', { style: { width: (c.craftsman || 0) + '%', '--c': '#ffb02e' } })), h('div', { class: 'muted small' }, 'Every craft raises it. Better odds and better-grade gear and pills.')))),
      h('div', { class: 'box', style: { marginTop: '14px' } }, h('h3', {}, 'Records'), h('table', { class: 'kv' },
        [['Fights won', c.wins], ['Lives taken', c.kills], ['Gates cleared', c.gatesCleared], ['Combat power', power(c).toFixed(2)], ['Most repeated activity', Object.entries(c.counts).sort((a, b) => b[1] - a[1])[0]?.join(' × ') || '—']].map(([k, v]) => h('tr', {}, h('td', {}, k), h('td', {}, v))))),
      h('div', { class: 'box', style: { marginTop: '14px' } }, h('h3', {}, 'Trait Codex'), h('p', { class: 'muted' }, 'Traits come in 8 tiers. Some can only be earned by doing specific things.'),
        h('p', { class: 'muted small' }, `Discovered ${TRAITS.filter(t => META.unlockedTraits[t.id] || c.traits.includes(t.id)).length} / ${TRAITS.length}. A trait's name and effect stay hidden until you've had it in some life.`),
        h('div', { class: 'small', style: { margin: '8px 0 4px' } }, h('b', {}, 'Your traits')), h('div', { style: { marginBottom: '10px' } }, c.traits.length ? c.traits.map(id => { const t = TRAIT_BY_ID[id]; return t ? h('div', { style: { margin: '4px 0' } }, traitChip(id), ' ', h('span', { class: 'muted small' }, t.desc)) : null; }) : h('span', { class: 'muted small' }, 'None this life.')),
        h('div', { class: 'muted small', style: { marginBottom: '4px' } }, 'Open a tier to browse it.'),
        TIER_ORDER.map(tier => { const list = TRAITS.filter(t => t.tier === tier); const tierBirth = TIERS[tier].birth / TRAITS.filter(t => t.tier === tier && t.birth !== 0).length;
          const found = list.filter(t => META.unlockedTraits[t.id] || c.traits.includes(t.id)).length, mine = list.filter(t => c.traits.includes(t.id)).length;
          G.ui.codexOpen ||= {};
          return h('details', { class: 'codex-tier', open: !!G.ui.codexOpen[tier], ontoggle: e => { G.ui.codexOpen[tier] = e.target.open; } }, h('summary', { class: 'tier-h', style: { color: TIERS[tier].color } }, `${TIERS[tier].name}`, h('span', { class: 'muted small' }, ` · ${found}/${list.length} discovered${mine ? ` · ${mine} yours` : ''}`)),
            h('div', { class: 'codex' }, list.map(t => { const found = META.unlockedTraits[t.id] || c.traits.includes(t.id);
              const how = t.birth === 0 ? '🔒 Earned: ' + (EARN_HINTS[t.earn] || 'through a special deed') : `🎲 Birth roll (~${(tierBirth / 100 * 1.6).toPrecision(2)}% per life)`;
              const el = h('div', { class: 'codex-card' + (found ? ' found' : '') + (c.traits.includes(t.id) ? ' mine' : '') }, h('b', {}, found ? t.name : '??? ' + '▮'.repeat(Math.min(8, Math.ceil(t.name.length / 2))), c.traits.includes(t.id) ? ' ✓' : ''), h('div', { class: 'small' }, found ? t.desc : h('i', { class: 'muted' }, 'Undiscovered — its name and effect are hidden.')), h('div', { class: 'muted small' }, how));
              el.style.setProperty('--tc', TIERS[tier].color); return el; }))); }))];
  },

  cultivation() {
    const c = G.char, q = c.qi, R = REALMS[q.realm], el = ELEMENTS.find(e => e.id === q.elem);
    if (!q.known) return [h('h2', { class: 'display' }, 'Cultivation'), h('p', { class: 'feed' }, 'There are rumors. Old men who never age. Gangs whose members punch through brick. You don\'t know anything for sure yet.'),
      h('p', { class: 'muted' }, 'Ways in: explore old alleys, watch the clouds, help a strange beggar, or grow close to someone who cultivates — they may teach you.')];
    const act = id => ACTIVITIES.find(a => a.id === id);
    const can = a => c.alive && c.actions > 0 && (!a.need || a.need(c)) && c.age >= (a.minAge || 0);
    const pc = p => Math.round(p * 100) + '%';
    const bi = breakthroughInfo(c), mi = meridianInfo(c), [mLo, mHi] = meditateRange(c), M = method(c);
    // action cards: what it does, what it costs, odds — before you press it
    const card = (id, title, lines, extra) => { const a = act(id); return h('div', { class: 'card action-card' }, h('div', { class: 'row' }, icon(a.icon, 'lg'), h('h4', {}, title || a.name)),
      h('ul', { class: 'notes small' }, lines.filter(Boolean).map(l => h('li', {}, l))), extra || null,
      h('button', { class: 'btn', disabled: !can(a), onclick: () => runActivity(a) }, `${title || a.name} (⚡1)`)); };
    const cards = [
      card('meditate', 'Meditate', [!q.manuals.length ? 'Without a manual you only calm your mind (-Stress).' : `Gathers about ${mLo}–${mHi} Qi using the ${M.name}.`, M.side ? 'Method effect: ' + M.desc : null, `Sessions this year: ${q.medYear || 0}/3. Meridian fatigue ${Math.round((q.fatigue || 0) * 10) / 10} → gains ×${fatigueMult(c).toFixed(2)} (do other things to recover).`, '-5 Stress.', q.realm === 0 && q.manuals.length ? 'Fill your Qi to enter Qi Condensation on your next birthday.' : null]),
      q.realm >= 1 ? card('meridian', 'Work on your meridians', mi.open >= 12 ? ['All twelve meridians are open — Grand Circulation.'] : mi.open >= mi.max ? [`Your realm can hold ${mi.max} open meridians. Break through to open more.`, `Progress saved: ${mi.prog}/${mi.need}.`] : [`Costs ${mi.cost} Qi and 1–4 Health.`, `Channel progress ${mi.prog}/${mi.need} — never lost, not even on a breakthrough. A better minigame means more progress.`, `When the bar fills, you choose which meridian opens (${mi.open}/${mi.max} at this realm).`, mi.tired < 1 ? `Repeating it this year: progress ×${mi.tired.toFixed(2)}.` : null, 'Breakthroughs widen your channels: +20 progress (+60 for a new realm).']) : null,
      q.realm >= 1 ? card('breakthrough', bi.major ? `Break into ${bi.next?.name || '—'}` : `Break to Stage ${q.stage + 1}`, [
        `Success chance: ${pc(bi.p)}.`, bi.trib ? `⚡ A Heavenly Tribulation (${bi.trib} bolts) must be survived first.` : null,
        'On success: Qi resets, +Health, more power and lifespan.', 'On failure: lose half your Qi, some Health, 40% risk of Qi Deviation Sickness.', ...bi.blockers.map(b => '⛔ ' + b)],
        h('table', { class: 'kv small' }, bi.parts.map(([l, v]) => h('tr', {}, h('td', {}, l), h('td', { class: v >= 0 ? 'good' : 'bad' }, (v >= 0 ? '+' : '') + Math.round(v * 100) + '%'))))) : null,
      c.inv.qi_pill ? card('pill', 'Consume Qi Pill', [`Restores ${Math.round(qiCap(c) * 0.4)} Qi. You have ${c.inv.qi_pill}.`]) : null,
      !c.sect ? card('seek_sect', 'Seek a hidden sect', ['Search for a sect or gang that will take you in.', 'Members learn manuals and may receive pills.', 'Each sect has requirements (Smarts, Strength or a trait).']) : null,
    ].filter(Boolean);
    const fr = foundReq(c);
    const helpful = HELPFUL_ITEMS.map(id => h('div', { class: 'row small', style: { margin: '3px 0' } }, icon(ITEMS[id].icon, 'sm'), h('b', {}, `${ITEMS[id].name} ×${c.inv[id] || 0}`), h('span', { class: 'muted' }, ITEMS[id].desc)));
    const methods = (q.methods ||= ['basic']);
    return [h('h2', { class: 'display' }, 'Cultivation'),
      h('div', { class: 'year-card', style: { marginTop: '10px' } }, h('h2', { class: 'display', style: { color: R.color } }, realmName(c)),
        bar('Qi', q.qi, 'var(--qi)', 'cultivation', qiCap(c), `${q.qi}/${qiCap(c)}`),
        h('div', { class: 'row' }, h('span', {}, icon(el.icon, 'sm'), ` ${el.name} affinity ${q.affinity}`), h('span', { class: 'muted' }, `· Power ×${power(c).toFixed(2)} · Lifespan ~${lifespan(c)}y (grows with every stage)`)),
        meridianPanel(c)),
      h('div', { class: 'grid2', style: { marginTop: '14px' } }, cards),
      h('h3', { class: 'display', style: { margin: '18px 0 8px' } }, `Cultivation methods (${methods.length}/${METHODS.length})`),
      h('p', { class: 'muted small' }, 'You meditate with one method at a time. Learn more from close friends who cultivate, sects, Gates and the Ghost Market.'),
      h('div', { class: 'grid2' }, METHODS.map(m => { const knows = methods.includes(m.id); const active = M.id === m.id; const locked = q.realm < (m.minRealm || 0);
        return h('div', { class: 'card', style: { opacity: knows ? 1 : 0.45, borderColor: active ? 'var(--accent)' : '' } }, h('h4', {}, knows ? m.name : '??? Unknown method', active ? h('span', { class: 'new-tag' }, 'ACTIVE') : null),
          h('div', { class: 'muted small' }, knows ? m.desc : 'Not yet learned.'),
          knows && !active ? h('button', { class: 'btn ghost mini', style: { marginTop: '6px' }, disabled: locked, onclick: () => { q.method = m.id; fx('click'); logLine(`I switched to the ${m.name}.`); render(); } }, locked ? `Needs ${REALMS[m.minRealm].name}` : 'Practise this') : null); })),
      h('h3', { class: 'display', style: { margin: '18px 0 8px' } }, 'Items that help'),
      h('div', { class: 'box' }, helpful, h('div', { class: 'muted small', style: { marginTop: '6px' } }, 'Craft them in Crafting & Gear, find them in Gates, or get them from friends and sects.')),
      h('div', { class: 'grid2', style: { marginTop: '14px' } },
        h('div', { class: 'card' }, h('h4', {}, 'Sect / Gang'), c.sect ? h('div', {}, c.ownSect?.emblem ? emblemSvg(c.ownSect.emblem, 28) : null, ' ', sectName(c), c.ownSect ? h('div', { class: 'muted small' }, `Founded by you · ${c.ownSect.disciples} disciples · +10% Qi · yearly tithes`) : null) : h('span', { class: 'muted' }, 'Unaffiliated.')),
        !c.ownSect ? h('div', { class: 'card' }, h('h4', {}, '👑 Found your own sect'), h('div', { class: 'muted small' }, 'Become the head of a new clan. Your surname becomes the clan name, passed to your children like a royal house. Disciples join every year and pay tithes.'),
          fr.missing.length ? h('div', { class: 'small bad', style: { marginTop: '6px' } }, 'Needs: ' + fr.missing.join(', ')) : null,
          h('button', { class: 'btn', style: { marginTop: '8px' }, disabled: !!fr.missing.length || c.actions <= 0, onclick: async () => {
            const SE = await import('./sectEmblem.js'); const v = await SE.designSect({ text: `Cost: ${fmtMoney(c, fr.cost)}. Choose wisely — this name and emblem will outlive you.` });
            if (v) runActivity({ id: 'found_sect', cat: 'cultivation', run: cc => foundSect(cc, v.name, v.clan, v.emblem) }); } }, 'Found sect (⚡1)')) : null,
      ),
      h('h3', { class: 'display', style: { margin: '18px 0 8px' } }, 'Path of Ascension'), realmLadder(c),
    ];
  },

  gates() {
    const c = G.char;
    const inv = Object.entries(c.inv);
    return [h('h2', { class: 'display' }, 'Dungeons & Gates'),
      h('p', { class: 'muted' }, 'Gates tear open around the world. Inside: corrupt souls, demonic cultivators and hungry spirits — and the pills and manuals that make cultivators. Entering costs 1 action.'),
      c.gates.length ? h('div', { class: 'grid2' }, c.gates.map((g, i) => { const R = GATE_RANKS.find(r => r.rank === g.rank), T = gateType(g);
        const bossE = ENEMIES.find(e => e.id === T.boss[g.rank]);
        return h('div', { class: 'card' }, h('div', { class: 'row' }, icon(T.icon, 'lg'), h('div', {}, h('h4', { style: { color: R.color } }, `${g.rank}-Rank · ${T.name}`), h('div', { class: 'muted small' }, T.desc))),
          h('div', { class: 'muted small', style: { marginTop: '6px' } }, `${R.fights} fights · Boss: ${bossE?.name || '?'} · closes in ${g.years}y · recommended: ${REALMS[R.realm].name}`),
          h('div', { class: 'small', style: { marginTop: '4px' } }, 'Loot: ', Object.keys(T.loot).map(id => id === 'gold' ? 'gold' : id === 'manual' ? 'manuals & methods' : ITEMS[id]?.name).join(', ')),
          gateYield(c, R) < 1 ? h('div', { class: 'small', style: { color: 'var(--bad, #ff7a6a)', marginTop: '4px' } }, `Outlevelled — only ${Math.round(gateYield(c, R) * 100)}% loot`) : null,
          h('div', { class: 'row', style: { marginTop: '8px', gap: '6px' } },
            h('button', { class: 'btn', disabled: !c.alive || c.actions <= 0 || c.age < 14, onclick: () => enterGate(i) }, icon('gates', 'sm'), ' Enter'),
            effRealm(c) - R.realm >= 3 ? h('button', { class: 'btn ghost', disabled: !c.alive || c.actions <= 0, 'data-tip': 'You are 3+ realms above this Gate. Its monsters cannot even stand before you.', onclick: () => enterGate(i, true) }, icon('crown', 'sm'), ' Sweep with presence') : null)); }))
        : h('div', { class: 'card muted' }, 'No open Gates near you. Hike the mountains or wait for news.'),
      h('div', { class: 'row', style: { marginTop: '14px' } }, h('button', { class: 'btn ghost', onclick: () => { G.ui.tab = 'inventory'; render(); } }, icon('bag', 'sm'), ` Open inventory (${inv.reduce((s, [, n]) => s + n, 0)} items)`))];
  },

  people() {
    const c = G.char;
    const groups = [['Family', p => isFamily(p) && p.role !== 'Spouse', 'fam'], ['Love', p => ['Spouse', 'Partner', 'Crush', 'Ex'].includes(p.role), 'love'], ['Friends & Players', p => p.role === 'Friend' || p.role === 'Co-op Friend', 'friend'], ['School & Work', p => ['Classmate', 'Coworker', 'Acquaintance'].includes(p.role), 'work'], ['Teachers & Agents', p => !!p.trainer || !!p.agent, 'teach'], ['Enemies', p => p.role === 'Enemy', 'enemy']];
    const gSym = p => h('span', { class: 'gsym ' + (p.gender === 'F' ? 'f' : 'm'), title: p.gender === 'F' ? 'Female' : 'Male' }, p.gender === 'F' ? ' ♀' : ' ♂');
    const bl = bondList(c), best = bonds(c).best;
    return [h('h2', { class: 'display' }, 'People'), h('p', { class: 'muted' }, `Social actions left: ${c.social}/${c.maxSocial || SOCIAL_PER_YEAR}. Click someone to interact. Socialising trains Charisma; people at 75%+ may gift you things or teach you skills, recipes and cultivation methods.`),
      innerCircle(c),
      h('div', { class: 'box' }, h('h3', {}, 'Bonds'), bl.length ? bl.map(b => h('div', { style: { margin: '4px 0' } }, h('b', {}, `${b.label}: ${b.who.first}`), h('span', { class: 'muted' }, ' — ' + b.perks.join(' · ')))) : h('div', { class: 'muted' }, 'Get a friend to 80% closeness to make them your Best Friend, or a partner to 50%+, to unlock training, study, Qi and salary bonuses.')),
      ...groups.map(([g, f, cls]) => { const ps = c.people.filter(f); if (!ps.length) return null;
        return [h('h3', { class: 'display grp-h ' + cls, style: { margin: '16px 0 8px' } }, g), h('div', { class: 'grid2' }, ps.map(p => h('div', { class: `card person grp-${cls}` + (p.alive ? '' : ' dead'), onclick: () => personModal(p) }, p.alive ? h('button', { class: 'fav' + (p.fav ? ' on' : ''), title: p.fav ? 'Remove from Inner Circle' : 'Add to Inner Circle', onclick: e => { e.stopPropagation(); p.fav = !p.fav; fx('click'); save(); render(); } }, p.fav ? '★' : '☆') : null,
          h('div', { class: 'pframe' }, portraitFor(p, 52)), h('div', { style: { flex: 1 } }, h('b', {}, best === p ? '★ ' : '', `${p.first} ${p.last}`, gSym(p), p.coop ? h('span', { class: 'online' + (p.online ? ' on' : ''), title: p.online ? 'Player online' : 'Player offline' }, p.online ? ' ● player' : ' ○ player') : null), h('div', { class: 'rel' }, `${p.role} · ${p.age}${p.alive ? '' : ' · deceased'} · ${relLabel(p)}`), p.coop ? null : (ensurePersona(p), h('div', { class: 'rel persona' }, p.persona.map(t => p.known.includes(t) ? PERSONAS[t].name : '???').join(' · '))),
            h('div', { class: 'bar' }, h('i', { style: { width: p.close + '%', '--c': 'var(--grp)' } }))))))]; })];
  },

  career() {
    const c = G.char; const cur = c.job && CAREERS.find(j => j.id === c.job.id);
    // degree jobs need the matching major; university students can only work part-time
    return [h('h2', { class: 'display' }, 'Career'),
      cur ? h('div', { class: 'year-card', style: { marginTop: '10px' } }, h('h3', {}, h('span', { class: 'job-emoji' }, jobEmoji(cur.id)), ` ${cur.name}`), h('div', {}, `Years: ${c.job.years} · Performance ${c.job.perf}%${c.job.raise > 1 ? ` · raises: +${Math.round((c.job.raise - 1) * 100)}%` : ''}`), bar('Performance', c.job.perf, 'var(--good)'),
        h('div', { class: 'row' }, h('button', { class: 'btn ghost', onclick: () => { logLine(`I quit my job as a ${cur.name}.`); c.job = null; render(); } }, 'Quit job')))
        : h('p', { class: 'muted' }, c.prison ? 'You are in prison.' : 'Unemployed.'),
      (() => { const A = J.agentOf(c);
        return h('div', { class: 'box', style: { marginTop: '12px' } }, h('h3', {}, icon('career', 'sm'), ' Job agent'),
          A ? [h('div', {}, h('b', {}, `${A.first} ${A.last}`), h('span', { class: 'muted' }, ` · ${J.AGENTS[A.agent.tier].name} · ${fmtMoney(c, J.agentFee(c, A.agent.tier))} a year`)),
            h('div', { class: 'muted small' }, `+${Math.round(J.AGENTS[A.agent.tier].hire * 100)}% hiring chance, more openings each year. Ask them for leads in the People tab (1 social, once a year).`)]
            : [h('div', { class: 'muted small' }, 'Only some jobs are hiring each year. A job agent finds openings you qualify for and talks you up — for a yearly fee.'),
              h('div', { class: 'row', style: { marginTop: '8px', flexWrap: 'wrap' } }, Object.entries(J.AGENTS).map(([k, a]) => { const fee = J.agentFee(c, k);
                return h('button', { class: 'btn ghost', title: a.desc, disabled: !c.alive || c.age < 15 || c.money < fee, onclick: () => { const t = J.hireAgent(c, k); if (t) { logLine(t, 'good'); fx('coin'); render(); } } }, `${a.name} · ${fmtMoney(c, fee)}/yr`); }))]); })(),
      h('h3', { class: 'display', style: { margin: '16px 0 8px' } }, `Hiring this year (${J.listed(c).length} of ${CAREERS.length} jobs)`),
      J.listed(c).length ? null : h('p', { class: 'muted' }, 'Nobody is hiring right now. Try again next year, or get a job agent.'),
      h('div', { class: 'grid2' }, J.listed(c).map(j => { const ok = J.eligible(c, j), lead = J.jobBoard(c).leads.includes(j.id);
        return h('div', { class: 'card' + (ok ? '' : ' locked') }, h('h4', {}, h('span', { class: 'job-emoji' }, jobEmoji(j.id)), ' ', j.name, j.part ? h('span', { class: 'muted' }, ' (part-time)') : '', lead ? h('span', { class: 'grade', style: { background: '#7fd1ff' } }, 'Agent lead') : ''),
        h('div', { class: 'muted' }, `${fmtMoney(c, j.pay * wage(c) * (j.part ? 0.5 : 1))}/yr · age ${j.minAge}+ · ${EDUCATION[j.edu]}${j.major ? ' in ' + j.major.join(' or ') : ''}${j.stat ? ' · ' + Object.entries(j.stat).map(([k, v]) => `${k} ${v}+`).join(', ') : ''}${j.realm ? ' · ' + REALMS[j.realm].name : ''}${j.license ? ' · driver\'s license' : ''}${j.trade ? ` · ${j.trade} certificate` : ''}`),
        h('div', { class: 'row', style: { marginTop: '8px' } }, h('button', { class: 'btn', disabled: !c.alive || c.prison || c.actions <= 0 || !ok || c.job?.id === j.id,
          onclick: () => runActivity({ id: 'apply_' + j.id, cat: 'work', run: async cc => { const b = J.jobBoard(cc); const r = await J.interview(cc, j); if (r.hired) { cc.job = { id: j.id, years: 0, perf: 50 }; b.ids = b.ids.filter(x => x !== j.id); b.leads = b.leads.filter(x => x !== j.id); } return r; } }) }, 'Apply (⚡1)'),
          ok ? h('span', { class: 'muted small' }, `${Math.round(J.hireChance(c, j) * 100)}% chance`) : h('span', { class: 'muted small' }, 'Not qualified'))); }))];
  },

  education() { // v0.9.19 full school life
    const c = G.char, e = c.edu; if (e.school) SCH.ensureSchool(c);
    const acts = ACTIVITIES.filter(a => a.cat === 'school' && c.age >= (a.minAge || 0) && (!a.need || a.need(c)));
    const busy = !c.alive || c.prison || c.actions <= 0, g = SCH.gpaOf(e.grades), R = e.school ? SCH.rank(c) : null, T = e.school && e.teacher;
    const tile = (k, v, sub) => h('div', { class: 'ed-tile' }, h('small', {}, k), h('b', {}, v), sub ? h('div', { class: 'muted small' }, sub) : null);
    const recs = (e.records || []).slice(-10);
    const out = [h('h2', { class: 'display' }, 'Education'),
      h('div', { class: 'ed-tiles' }, tile('Currently', e.school ? (e.school + (e.private ? ' · private' : '')) : 'Not enrolled', e.scholarship && e.school ? '🎓 On a scholarship' : null), tile('Highest', EDUCATION[e.level]),
        tile('GPA', e.school || e.level ? `${g.toFixed(2)} (${SCH.letter(g)})` : '—', e.school ? `Your natural level: ${SCH.gpaOf(SCH.natural(c)).toFixed(2)}` : null),
        R ? tile('Class rank', `#${R.r} of ${R.n}`, R.r <= Math.ceil(R.n * 0.1) ? 'Top 10%' : R.r > R.n * 0.75 ? 'Bottom quarter' : null) : null, e.major ? tile('Major', e.major + (e.gradMajor && e.gradMajor !== e.major ? ` · ${e.gradMajor}` : ''), e.school === 'University' ? `Year ${e.uniYears + 1} of 4` : e.school === "Master's Program" ? `Master's year ${e.gradYears + 1} of 2` : e.school === 'Doctoral Program' ? `PhD year ${e.phdYears + 1} of 4` : null) : null,
        (e.trades || []).length || e.school === 'Trade School' ? tile('Certificates', (e.trades || []).join(', ') || '—', e.school === 'Trade School' ? `Training: ${e.tradeField} (year ${e.tradeYears + 1} of 2)` : null) : null)];
    if (e.school) {
      out.push(h('p', { class: 'muted small' }, 'Marks drift back toward your natural level each year (set by your Smarts, stress, teacher and school). Studying pushes you above it, but every extra point is harder to earn: a real 4.0 takes near-perfect marks.'));
      out.push(h('div', { class: 'grid2', style: { marginTop: '10px' } },
        h('div', { class: 'card' }, h('h4', {}, '🧑‍🏫 Your teacher'), h('div', {}, h('b', {}, `${T.gender === 'F' ? 'Ms' : 'Mr'} ${T.first} ${T.last}`), h('span', { class: 'muted small' }, ` · ${T.subject}`)), h('div', { class: 'muted small' }, T.desc), h('div', { class: 'small' }, `Rapport: ${T.close}%${T.close >= 70 ? ' — they believe in you (+marks)' : ''}`),
          h('button', { class: 'btn mini', style: { marginTop: '6px' }, disabled: busy, onclick: e2 => runActivity({ id: 'ask_teacher', cat: 'school', name: 'Ask the teacher for help', run: cc => SCH.askTeacher(cc) }, e2.currentTarget) }, 'Ask for extra help (⚡1)')),
        h('div', { class: 'card' }, h('h4', {}, '🎓 Scholarship'), h('div', { class: 'muted small' }, 'Judged on GPA, Smarts, clubs and awards. Poorer students get a little extra consideration. One application a year.'), h('div', { class: 'small' }, `Your odds: ${Math.round(SCH.scholarshipOdds(c) * 100)}%`),
          e.scholarship ? h('div', { class: 'small good' }, 'You already have one.') : h('button', { class: 'btn mini', style: { marginTop: '6px' }, disabled: busy || e.schYear === G.world.year, onclick: e2 => runActivity({ id: 'scholarship', cat: 'school', name: 'Apply for a scholarship', run: cc => SCH.applyScholarship(cc) }, e2.currentTarget) }, e.schYear === G.world.year ? 'Applied this year' : 'Apply (⚡1)'))));
      const cm = SCH.classmates(c).sort((a, b) => (b.grade ?? 0) - (a.grade ?? 0));
      out.push(h('h3', { class: 'display', style: { margin: '16px 0 8px' } }, `Classmates (${cm.length} you know)`), h('div', { class: 'grid3' }, cm.map(p => h('div', { class: 'card person ed-mate', onclick: () => personModal(p) }, h('div', { class: 'pframe' }, portraitFor(p, 40)),
        h('div', {}, h('b', {}, p.first + ' ' + p.last), h('div', { class: 'rel' }, `${relLabel(p)} · ${p.close}%`), h('div', { class: 'muted small' }, `GPA ${SCH.gpaOf(p.grade ?? 60).toFixed(2)} ${(p.grade ?? 60) > e.grades ? '· ahead of you' : '· behind you'}`))))));
      const clubs = Object.entries(SCH.CLUBS).filter(([, K]) => c.age >= K.minAge), mine = e.clubs || [];
      out.push(h('h3', { class: 'display', style: { margin: '16px 0 8px' } }, `Clubs (${mine.length}/${SCH.MAX_CLUBS})`), h('p', { class: 'muted small' }, 'Clubs run all year: free to join, they add to your workload. Sports can injure you; academic clubs lift your marks; all of them look good on a scholarship application.'),
        h('div', { class: 'ed-clubs' }, clubs.map(([id, K]) => { const on = mine.includes(id);
          return h('div', { class: 'card ed-club' + (on ? ' on' : '') }, h('div', { class: 'row', style: { gap: '8px' } }, h('span', { class: 'ed-emoji' }, K.emoji), h('div', { style: { flex: 1 } }, h('b', {}, K.name), h('div', { class: 'muted small' }, `${K.kind} · ${Object.entries(K.eff).map(([k, v]) => `${v > 0 ? '+' : ''}${v} ${k}`).join(', ')}${K.grades ? `, +${K.grades} marks` : ''}${K.risk ? ' · injury risk' : ''}`))),
            on ? h('button', { class: 'btn ghost mini', onclick: () => { SCH.leaveClub(c, id); logLine(`I quit the ${K.name.toLowerCase()}.`); render(); } }, 'Leave') : h('button', { class: 'btn mini', disabled: mine.length >= SCH.MAX_CLUBS || !c.alive, onclick: () => { const r = SCH.joinClub(c, id); if (r) logLine(r.text, r.cls); fx('click'); render(); } }, 'Join')); })));
    }
    out.push(h('h3', { class: 'display', style: { margin: '16px 0 8px' } }, 'Report card'),
      recs.length ? h('div', { class: 'ed-chart' }, recs.map(r => { const el = h('div', { class: 'ed-bar', 'data-tip-title': `Age ${r.age}`, 'data-tip': `${r.school}\nGPA ${r.gpa.toFixed(2)} (${SCH.letter(r.gpa)})\nRank #${r.rank} of ${r.of}` }, h('i', { style: { height: Math.max(4, r.gpa / 4 * 100) + '%' } }), h('small', {}, r.age)); el.style.setProperty('--gc', r.gpa >= 3.5 ? '#5fd38a' : r.gpa >= 2.5 ? '#9ad0ff' : r.gpa >= 1.5 ? '#ffb02e' : '#e05555'); return el; })) : h('p', { class: 'muted small' }, 'No report cards yet.'),
      h('div', { class: 'ed-stats small' }, [['Times studied hard', c.counts.study || 0], ['Classes skipped', c.counts.skip || 0], ['Teacher help sessions', c.counts.ask_teacher || 0], ['Scholarship applications', c.counts.scholarship || 0], ['Clubs', (e.clubs || []).map(id => SCH.CLUBS[id]?.name).join(', ') || 'none']].map(([k, v]) => h('div', {}, h('span', { class: 'muted' }, k + ': '), h('b', {}, v)))),
      (e.awards || []).length ? h('div', { class: 'box', style: { marginTop: '10px' } }, h('h3', {}, '🏅 Awards'), e.awards.slice(-12).map(a => h('div', { class: 'small' }, '• ' + a))) : null,
      acts.length ? h('div', { class: 'row', style: { marginTop: '12px' } }, acts.map(a => h('button', { class: 'btn', disabled: busy, onclick: e2 => runActivity(a, e2.currentTarget) }, icon(a.icon, 'sm'), ' ', a.name))) : null);
    return out;
  },

  assets() {
    const c = G.char, k = country(c).econ;
        return [h('h2', { class: 'display' }, 'Assets & Market'), h('table', { class: 'kv', style: { marginTop: '10px' } }, [['Cash', fmtMoney(c, c.money)], ['Investments', fmtMoney(c, c.stocks)], ['Net worth', fmtMoney(c, c.money + c.stocks + c.assets.reduce((s, a) => s + a.value, 0))]].map(([a, b]) => h('tr', {}, h('td', {}, a), h('td', {}, b)))),
      (() => { const cf = comfort(c); return h('div', { class: 'box', style: { marginTop: '12px' } }, h('h3', {}, 'Comfort'),
        cf.lines.length ? cf.lines.map(([ic, name, eff]) => h('div', { class: 'row small', style: { margin: '4px 0' } }, h('span', {}, ic), h('b', {}, name), h('span', { class: 'muted' }, eff)))
          : h('div', { class: 'muted small' }, 'You own nothing that makes life cosier yet. A home, a car or a pet each give yearly Happiness and less Stress.')); })(),
      (() => { const w = willInfo(c); const kids = w.kids;
        return h('div', { class: 'box', style: { marginTop: '12px' } }, h('h3', {}, 'Inheritance'),
          h('div', { class: 'small' }, w.heir === 'spouse' ? `If you die, ${w.spouse.first} (your spouse) inherits everything — you have no prenup.` : w.heir === 'children' ? `If you die, your ${kids.length > 1 ? kids.length + ' children split' : 'child inherits'} everything: your money, investments, homes, cars and pets.${w.spouse ? ' Your prenup keeps it in the bloodline.' : ''}` : 'With no spouse or children, your estate would go to the state.'),
          kids.length ? h('div', { class: 'row', style: { marginTop: '8px' } }, h('span', { class: 'muted small' }, 'Give money now:'), ...kids.map(k => h('button', { class: 'pill', disabled: c.money < 1000 * country(c).econ, onclick: async () => {
            const amt = await choice({ title: `Gift money to ${k.first}`, text: `Cash: ${fmtMoney(c, c.money)}. Gifts wait for them — if you continue as ${k.first}, it's theirs.`, icon: 'gift', options: [0.1, 0.25, 0.5].map(f => ({ label: `${Math.round(f * 100)}% (${fmtMoney(c, c.money * f)})`, value: Math.floor(c.money * f) })).concat([{ label: 'Cancel', value: null, ghost: true }]) });
            if (amt) { const t = giftToChild(c, k, { money: amt }); if (t) { logLine(t, 'good'); fx('coin'); render(); } } } }, `🎁 ${k.first}`))) : null); })(),
      h('h3', { class: 'display', style: { margin: '16px 0 8px' } }, 'Owned'),
      c.assets.length ? h('div', { class: 'grid2' }, c.assets.map((a, i) => a.type === 'biz' ? PUI.bizCard(c, a) : h('div', { class: 'card row' }, icon(a.type === 'pet' ? 'pet' : ['boat', 'plane'].includes(a.type) ? 'travel' : a.type), h('div', { style: { flex: 1 } }, h('b', {}, a.name, a.prestige ? ' ' + '✨'.repeat(a.prestige) : ''), h('div', { class: 'muted' }, a.type === 'pet' ? 'Pet' : `${fmtMoney(c, a.value)}${a.tenant ? ` · rented ${fmtMoney(c, a.rent)}/yr` : ''}`)),
        a.type === 'house' ? h('button', { class: 'btn ghost', onclick: () => { a.tenant = !a.tenant; a.rent = Math.round(a.value * 0.05); logLine(a.tenant ? `I rented out my ${a.name}.` : `I evicted my tenant.`); render(); } }, a.tenant ? 'Evict' : 'Rent out') : null,
        a.type !== 'pet' ? h('button', { class: 'btn ghost', onclick: () => { money(c, a.value); c.assets.splice(i, 1); fx('coin'); logLine(`I sold my ${a.name} for ${fmtMoney(c, a.value)}.`); render(); } }, 'Sell') : null,
        willInfo(c).kids.length ? h('button', { class: 'btn ghost', title: 'Hand this to one of your children now', onclick: async () => { const kids = willInfo(c).kids; const k = kids.length === 1 ? kids[0] : await choice({ title: `Give ${a.name} to…`, options: kids.map(x => ({ label: `${x.first} (${x.role.toLowerCase()}, ${x.age})`, value: x })).concat([{ label: 'Cancel', value: null, ghost: true }]) }); if (!k) return; const t = giftToChild(c, k, { asset: a }); if (t) { logLine(t, 'good'); fx('action'); render(); } } }, 'Give') : null))) : h('div', { class: 'muted' }, 'Nothing yet.'),
      licenseBox(c),
      ...PUI.vendorsSection(c), // v0.9.28 dealerships, estate agents, farms, factories, investors
      h('div', { class: 'row', style: { marginTop: '14px' } }, h('button', { class: 'btn', disabled: c.age < 18, onclick: () => { G.ui.tab = 'market'; render(); } }, icon('stocks', 'sm'), ' Open the stock market'))];
  },

  world() {
    const c = G.char, cty = country(c);
    const news = c.log.flatMap(y => y.lines.filter(l => l.c === 'world').map(l => `Age ${y.age} — ${l.t}`)).slice(-12).reverse();
    const zoom = !!G.ui.mapZoom;
    const map = h('div', { class: 'map-card' },
      h('div', { class: 'map-head' }, flagEl(cty.id), h('b', {}, ` ${cty.name}`), h('span', { class: 'muted small' }, ` · 📍 ${c.city}`),
        h('div', { class: 'seg mini-seg' }, h('button', { class: zoom ? '' : 'on', onclick: () => { G.ui.mapZoom = false; render(); } }, 'Country'), h('button', { class: zoom ? 'on' : '', onclick: () => { G.ui.mapZoom = true; render(); } }, 'City'))),
      svgMap(cty.id, cty.name, c.city, zoom),
      h('div', { class: 'muted small map-credit' }, 'Borders: Natural Earth (public domain) · ', h('a', { href: osmLink(cty.id, c.city), target: '_blank', rel: 'noopener' }, 'Open in OpenStreetMap ↗')));
    return [h('h2', { class: 'display' }, 'World'), map, h('table', { class: 'kv', style: { marginTop: '10px' } },
      [['Year', G.world.year], ['Era', G.world.era], ['Country', h('span', {}, flagEl(cty.id), ' ', cty.name)], ['Development', `${TIERS_C[cty.tier]?.name} — ${TIERS_C[cty.tier]?.desc} (Legacy ×${TIERS_C[cty.tier]?.legacy})`], ['Climate', BIOMES_C[cty.biome]?.name || '—'], ['City', c.city], ['Economy', cty.econ >= 1.2 ? 'Strong' : cty.econ >= 0.8 ? 'Average' : 'Developing'], ['Spiritual density (Qi)', cty.qi >= 1.3 ? 'Very high' : cty.qi >= 1 ? 'High' : 'Thin'], ['Danger', cty.danger > 0.45 ? 'High' : cty.danger > 0.25 ? 'Moderate' : 'Low']].map(([a, b]) => h('tr', {}, h('td', {}, a), h('td', {}, b)))),
      h('h3', { class: 'display', style: { margin: '16px 0 8px' } }, 'Headlines'), h('div', { class: 'feed' }, news.length ? news.map(n => h('p', { class: 'world' }, n)) : h('p', { class: 'muted' }, 'Quiet years.'))];
  },

  chronicle() {
    const c = G.char;
    return [h('h2', { class: 'display' }, `The Chronicle of ${fullName(c)}`), h('div', { class: 'feed' }, c.log.flatMap(y => [h('p', { class: 'big' }, `Age ${y.age} · Year ${y.year}`), ...y.lines.map(l => h('p', { class: l.c }, l.t))]))];
  },
  coop() {
    const c = G.char;
    const intro = h('p', { class: 'muted' }, 'Play alongside friends. Each of you lives your own life and ages at your own pace — but you can hang out, hit the gym, train Qi, spar, invite each other into your sect or gang, date, marry and have children together. Co-op players appear in your People tab.');
    if (net.status === 'reconnecting') return [h('h2', { class: 'display' }, 'Co-op'), h('div', { class: 'year-card' }, h('h3', {}, `Reconnecting to room ${net.code}…`), h('p', { class: 'muted' }, 'Hang tight — this happens after a refresh or if the host reloaded.'), h('button', { class: 'btn ghost', onclick: () => leave() }, 'Stop & leave room'))];
    if (net.status !== 'online') {
      const input = h('input', { class: 'code-in', 'data-keep': 'room', placeholder: 'ROOM CODE', maxlength: 5, onkeydown: e => { if (e.key === 'Enter') joinRoom(input.value); } });
      return [h('h2', { class: 'display' }, 'Co-op'), intro,
        h('div', { class: 'grid2', style: { marginTop: '12px' } },
          h('div', { class: 'card' }, h('h4', {}, 'Host a room'), h('p', { class: 'muted' }, 'Your browser becomes the room. Keep this tab open while friends play.'),
            h('button', { class: 'btn', disabled: net.status === 'connecting', onclick: () => { fx('click'); hostRoom(); } }, net.status === 'connecting' ? 'Connecting…' : 'Create room')),
          h('div', { class: 'card' }, h('h4', {}, 'Join a room'), h('p', { class: 'muted' }, 'Type the 5-letter code your friend gives you.'),
            h('div', { class: 'row' }, input, h('button', { class: 'btn', disabled: net.status === 'connecting', onclick: () => { fx('click'); joinRoom(input.value); } }, 'Join')))),
        net.chat.length ? h('div', { class: 'box', style: { marginTop: '12px' } }, net.chat.slice(-4).map(m => h('div', { class: 'muted' }, m.text))) : null];
    }
    const players = [...net.peers.entries()];
    const log = h('div', { class: 'chatlog' }, net.chat.map(m => h('div', { class: m.who === '•' ? 'muted' : '' }, m.who === '•' ? m.text : [h('b', { style: { color: m.me ? 'var(--accent2)' : 'var(--qi)' } }, m.who + ': '), m.text])));
    requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });
    const send = () => { const v = msg.value; msg.value = ''; sendChat(v); };
    const msg = h('input', { class: 'chat-in', 'data-keep': 'chat', placeholder: 'Say something…', maxlength: 300, onkeydown: e => { if (e.key === 'Enter') send(); } });
    return [h('h2', { class: 'display' }, 'Co-op'),
      h('div', { class: 'year-card', style: { marginTop: '10px' } }, h('div', { class: 'row' }, h('span', { class: 'muted' }, net.role === 'host' ? 'You are hosting · room code' : 'Connected · room code'),
        h('span', { class: 'room-code' }, net.code), h('button', { class: 'btn ghost', onclick: () => { navigator.clipboard?.writeText(net.code); toast('Code copied'); } }, 'Copy'),
        h('button', { class: 'btn ghost', style: { marginLeft: 'auto' }, onclick: () => leave() }, 'Leave room'))),
      h('h3', { class: 'display', style: { margin: '16px 0 8px' } }, `Players (${players.length + 1})`),
      h('p', { class: 'muted small' }, `Each joint action costs 1 Social (you have ${c.social}). Train together and Qi resonance play a quick minigame, and you both share the result: a peak session for both, or an injury for both. Elements matter for Qi resonance: matching or feeding elements amplify, clashing ones can backfire unless you keep control. Doing the same thing with the same person over and over gives less each time.`),
      h('div', { class: 'grid2 co-grid' }, coopCard(c, null, null, true), players.map(([pid, pr]) => coopCard(c, pr, c.people.find(x => x.coop === pr.charId), false))),
      h('h3', { class: 'display', style: { margin: '16px 0 8px' } }, 'Chat'), log, h('div', { class: 'row', style: { marginTop: '8px' } }, msg, h('button', { class: 'btn', onclick: send }, 'Send'))];
  },
  status: () => statusTab(),
  inventory: () => inventoryTab(),
  crafting: () => craftingTab(),
  health: () => healthTab(),
  achievements() {
    const done = META.achievements || {}; const n = ACHIEVEMENTS.filter(a => done[a.id]).length;
    return [h('h2', { class: 'display' }, 'Achievements'), h('p', { class: 'muted' }, `${n} / ${ACHIEVEMENTS.length} unlocked across all your lives · each one pays Legacy Points the first time. Locked achievements stay a mystery until you earn them.`),
      h('div', { class: 'ach-grid' }, ACHIEVEMENTS.map(a => h('div', { class: 'ach' + (done[a.id] ? ' done' : '') }, h('b', {}, done[a.id] ? '🏆 ' + a.name : '🔒 ??? ' + '▮'.repeat(Math.min(7, Math.ceil(a.name.length / 2)))), h('div', { class: 'small muted' }, done[a.id] ? a.desc : h('i', {}, 'Undiscovered — do something new to find out.')), h('div', { class: 'small', style: { color: 'var(--legend)' } }, `+${achPts(a)} Legacy`))))];
  },
  updates() {
    return [h('h2', { class: 'display' }, 'Update Log'), h('p', { class: 'muted' }, `You're playing version ${VERSION}. When a new version goes live, the game lets you know and refreshes itself.`), changelogBody(CHANGELOG)];
  },
  legacy: () => renderLegacy(),
  settings: () => renderSettings(),
};

// ---------- interactions
async function personModal(p) {
  const c = G.char;
  if (p.coop) return coopPersonModal(p);
  const rs = relState(p), okIds = rs === 'hostile' ? HOSTILE_OK : rs === 'fractured' ? FRACTURED_OK : null; // v0.9.23 enemies won't train with you
  const opts = SOCIAL.filter(s => p.alive && c.alive && c.age >= (s.age || 0) && (!s.need || s.need(c, p)) && (!okIds || okIds.includes(s.id)));
  const { indexCard } = await import('./conversation.js');
  const v = await choice({ title: `${p.first} ${p.last}`, portrait: indexCard(p),
    text: `${p.role}${bonds(c).best === p ? ' · ★ Best Friend' : ''} · Age ${p.age}${p.job ? ' · ' + p.job : ''}${p.realm ? ' · senses of Qi about them' : ''}${p.blessed ? ' · 🌸 blessed with longevity' : ''}${p.dna ? '\nGenes: ' + p.dna.map(geneName).join(', ') : ''}\nRelationship: ${relLabel(p)} (${p.close}%)${p.close >= 75 ? '\nThey might gift you something or teach you what they know.' : ''}${p.alive ? '' : '\nDeceased.'}\nSocial actions left: ${c.social}`,
    options: [...opts.map(s => ({ label: `${s.emoji || '•'}  ${s.name}   · 1 social`, value: s.id, disabled: c.social <= 0 })), { label: 'Close', value: null, ghost: true }] });
  if (!v) return;
  const s = SOCIAL.find(x => x.id === v);
  await runActivity({ id: 'soc_' + s.id, cost: 's', person: p, run: cc => s.run(cc, p) });
}

// v0.9.8 co-op: one entry point so joint sessions get the minigame and shared outcome
async function coopDo(p, v, el) { const act = { id: 'coop_' + v, name: (COOP_ACTIONS.find(a => a.id === v)?.name || v), cost: 's', run: () => doCoopAction(p, v, act._roll) }; await runActivity(act, el); }
const ELEM_COL = { fire: '#ff6a3d', water: '#4fb3ff', wood: '#6fd36f', metal: '#d0d6e0', earth: '#c69a5b', lightning: '#b18cff' };
const ago = t => { const s = Math.round((Date.now() - t) / 1000); return s < 60 ? 'just now' : s < 3600 ? `${Math.round(s / 60)}m ago` : `${Math.round(s / 3600)}h ago`; };
function coopCard(c, pr, person, me) {
  const p = person || {}, online = me || (p.online && net.peers.has(p.peerId)), R = !me && c.qi.known && pr.elem ? resonance(c.qi.elem, pr.elem) : null;
  const hp = me ? c.stats.health : pr.health ?? p.hp ?? 0, elem = me ? (c.qi.known ? c.qi.elem : null) : pr.elem, doing = me ? c.doing : pr.doing;
  const quick = me || !person ? [] : [['gym', '🏋️', 'Train together'], ['train', '🌀', 'Qi resonance'], ['spar', '⚔️', 'Spar'], ['hangout', '🍵', 'Hang out']]
    .map(([id, em, label]) => { const A = COOP_ACTIONS.find(a => a.id === id); if (!A || (A.age && c.age < A.age) || (A.need && !A.need(c, person))) return null;
      return h('button', { class: 'btn mini co-act', disabled: !online || c.social <= 0 || !c.alive, 'data-tip': id === 'train' && R ? `${R.label}: ${R.note}` : id === 'gym' ? 'A joint workout. You play the minigame; you both share the outcome.' : id === 'spar' ? 'A real fight against their build. Bruises happen. You learn more from losing.' : 'Relax together: closeness up, stress down.', onclick: e => coopDo(person, id, e.currentTarget) }, `${em} ${label}`); }).filter(Boolean);
  const card = h('div', { class: 'card co-card' + (online ? ' on' : ''), style: elem ? { '--ec': ELEM_COL[elem] } : {} },
    h('div', { class: 'row', style: { gap: '10px', alignItems: 'center' } }, h('div', { class: 'pframe' }, me ? portraitFor(c, 52) : portraitFor({ ...pr, qi: null, realm: pr.realm }, 52)),
      h('div', { style: { flex: 1, minWidth: 0 } }, h('div', {}, h('i', { class: 'co-dot' + (online ? ' on' : '') }), h('b', {}, me ? fullName(c) + ' (you)' : `${pr.first} ${pr.last}`)),
        h('div', { class: 'rel' }, `Age ${me ? c.age : pr.age} · ${me ? (c.qi.realm ? realmName(c) : 'Mortal') : pr.realmName || (pr.realm ? 'Cultivator' : 'Mortal')}${!me && person ? ` · ${person.role} ${person.close}%` : ''}${!me && pr.alive === false ? ' · deceased' : ''}`),
        h('div', { class: 'co-chips' }, elem ? h('span', { class: 'co-chip elem' }, elem[0].toUpperCase() + elem.slice(1)) : h('span', { class: 'co-chip' }, 'No element yet'),
          h('span', { class: 'co-chip hp', 'data-tip': `Health ${Math.round(hp)}/100` }, h('i', { style: { width: Math.max(0, Math.min(100, hp)) + '%' } })),
          (me ? (c.conditions || []).length : pr.hurt) ? h('span', { class: 'co-chip bad' }, `${me ? c.conditions.length : pr.hurt} ailment${(me ? c.conditions.length : pr.hurt) > 1 ? 's' : ''}`) : null,
          R ? h('span', { class: 'co-chip res ' + R.label.toLowerCase(), 'data-tip': R.note }, R.label) : null))),
    h('div', { class: 'co-doing muted small' }, doing ? `Last: ${doing.t} · ${ago(doing.at)}` : 'Hasn\'t done anything yet this session.', !me && pr.actions != null ? ` · ${pr.actions} actions, ${pr.social} social left` : ''),
    quick.length ? h('div', { class: 'co-acts' }, quick, h('button', { class: 'btn ghost mini', onclick: () => coopPersonModal(person) }, '⋯ More')) : null);
  return card;
}
const traitVal0 = c => c.traits.reduce((m, id) => m * (TRAIT_BY_ID[id]?.loot || 1), 1) * bonusMult(c, 'loot');

async function coopPersonModal(p) {
  const c = G.char;
  const acts = COOP_ACTIONS.filter(a => p.alive && c.alive && c.age >= (a.age || 0) && (!a.need || a.need(c, p)));
  const { indexCard } = await import('./conversation.js');
  const v = await choice({ title: `${p.first} ${p.last}`, portrait: indexCard(p),
    text: `Player · ${p.role} · Age ${p.age}${p.sectName ? ' · ' + p.sectName : ''}${p.pregnant ? ' · expecting a baby' : ''}${p.livesWith ? ' · lives with you' : ''}\n${p.online ? 'Online now' : 'Offline — they need to be in your co-op room'}\nRelationship: ${relLabel(p)} (${p.close}%)\nSocial actions left: ${c.social}`,
    options: [...acts.map(a => ({ label: `${a.emoji || '•'}  ${a.name}   · 1 social`, value: a.id, disabled: c.social <= 0 || !p.online })), { label: 'Open chat', value: '_chat', ghost: true }, { label: 'Close', value: null, ghost: true }] });
  if (!v) return; if (v === '_chat') { G.ui.tab = 'coop'; return render(); }
  await coopDo(p, v);
}

const gateType = g => { if (!g.type) Object.assign(g, makeGate(g.rank), { years: g.years }); return GATE_TYPES.find(t => t.id === g.type); };
// Before a big boss's turn-based fight: an action phase. Land hits to wear it down; get hit and you start hurt.
export async function bossPhase(c, def, e, awakened) {
  if (!ui.arenaOn?.() || !ui.arena) return def;
  const style = ['demonic', 'blood_cultist', 'heavenly_demon', 'ghost_king'].includes(e.id) ? 'demon' : e.kind === 'beast' || e.kind === 'construct' ? 'beast' : e.kind === 'spirit' ? 'spirit' : 'blade';
  const ar = await ui.arena({ title: def.name, style, color: { demon: '#ff3a4a', beast: '#ffb02e', spirit: '#7fe3ff', blade: '#e0e6ff' }[style], phases: awakened ? ['Opening Moves', 'Fury', 'Last Stand'] : ['Opening Moves', 'Fury'],
    difficulty: 0.3 + (awakened ? 0.35 : 0) + Math.max(0, (def.realm || 0) - effRealm(c)) * 0.1, lives: 3 + Math.floor(c.stats.health / 40), autoChance: Math.min(0.85, 0.3 + power(c) / (power(c) + (REALMS[def.realm || 0]?.power || 1)) * 0.6),
    lines: { intro: `${e.name} looms over you. Read its attacks.`, stagger: `${e.name} staggers.`, opening: `${e.name} leaves itself open.`, win: 'You have the upper hand.', lose: 'You are thrown back, bleeding.' } });
  const out = { ...def, hp: Math.round(def.hp * (0.35 + 0.65 * ar.bossLeft)) };
  if (ar.result !== 'win') { stat(c, 'health', -12); out.str = Math.round(out.str * 1.15); }
  logLine(ar.result === 'win' ? `I outfought ${e.name} in the opening exchange — it's badly hurt.` : `${e.name} battered me before the real fight even began.`, ar.result === 'win' ? 'good' : 'bad');
  return out;
}
// Outlevelled gates give sharply less: 2 realms above → 55%, 3 → 30%, 4+ → 15%.
export const gateYield = (c, R) => { const gap = effRealm(c) - R.realm; return gap >= 4 ? 0.15 : gap === 3 ? 0.3 : gap === 2 ? 0.55 : 1; };
async function enterGate(i, sweep) {
  const c = G.char, g = c.gates[i], R = GATE_RANKS.find(r => r.rank === g.rank), T = gateType(g);
  await runActivity({ id: 'gate', cat: 'adventure', run: async cc => {
    let awakened = false;
    if (!sweep && maybeTransmigrate(cc)) { cc.gates.splice(i, 1); return { text: `The ${g.rank}-rank Gate was not what it seemed. It took me to another world.`, cls: 'big', big: true }; }
    if (sweep) { cc.flags.presenceWin = true; cc.wins += R.fights; }
    else for (let f = 0; f < R.fights; f++) {
      const boss = f === R.fights - 1;
      if (f > 0 && f === Math.floor(R.fights / 2)) { // v0.8.7 a quiet chamber between waves: meditate for Qi scaled to the Gate
        const tier = GATE_RANKS.indexOf(R), mult = 1.5 + tier * 0.5;
        const v = await choice({ title: 'A quiet chamber', icon: 'meditate', text: `Halfway through the ${T.name}. The Qi here is thick${tier >= 4 ? ' as syrup' : ''}.\nMeditate (×${mult.toFixed(1)} Qi, heal a little — but something may find you first) or press on?`, options: [{ label: 'Meditate', value: true }, { label: 'Press on', value: false, ghost: true }] });
        if (v) { const { qiGain, qiCap } = await import('../systems/cultivation.js'); const q = cc.qi.realm ? Math.round(qiGain(cc, ri(10, 18)) * mult) : 0; if (q) cc.qi.qi = Math.min(qiCap(cc), cc.qi.qi + q); stat(cc, 'health', ri(3, 8));
          logLine(q ? `I meditated in the Gate's quiet chamber. +${q} Qi.` : 'I rested in a quiet chamber of the Gate.', 'qi'); if (chance(0.2)) logLine('Something smelled me meditating. The next fight came early.', 'bad'); }
      }
      const eid = boss ? T.boss[g.rank] || pick(T.pool) : pick(T.pool); const e = ENEMIES.find(x => x.id === eid) || ENEMIES.find(x => x.id === T.pool[0]); // v0.9.6 fix: pick once (picking inside find() could miss every enemy and freeze the Gate)
      // bosses of C-rank and up may be AWAKENED: much tougher, much richer. Big bosses get an entrance.
      if (boss && GATE_RANKS.indexOf(R) >= 2 && chance(0.25)) awakened = true;
      const er = R.realm + (boss && awakened ? 1 : 0); // v0.8.7: Gate foes fight at the Gate's realm (not their native one)
      if (boss && (awakened || GATE_RANKS.indexOf(R) >= 4)) await ui.cinematic?.({ motif: awakened ? 'crack' : 'seal', color: awakened ? '#ff3a4a' : R.color, threads: 9, lines: [awakened ? 'The air in the Gate turns to iron.' : 'The deepest chamber of the Gate.', `${e.name} rises${awakened ? ', eyes burning — AWAKENED' : ''}.`], title: e.name, sub: awakened ? 'Awakened Boss' : `${g.rank}-rank Boss`, sound: 'heavy', hold: 1.6 });
      let def = boss ? { ...e, realm: er, hp: Math.round(e.hp * (awakened ? 1.6 : 1.4)), str: Math.round(e.str * (awakened ? 1.3 : 1.1)), name: `${awakened ? 'AWAKENED' : 'BOSS'} · ${e.name}` } : { ...e, realm: R.realm, name: `${e.name} (${f + 1}/${R.fights})` };
      if (boss && (awakened || GATE_RANKS.indexOf(R) >= 4)) def = await bossPhase(cc, def, e, awakened);
      const r = await import('./combat.js').then(m => m.fight(def));
      if (r === 'win' && boss && (awakened || GATE_RANKS.indexOf(R) >= 4)) await ui.cinematic?.({ motif: 'triangle', color: awakened ? '#ff3a4a' : R.color, threads: 0, lines: [`${e.name} drops to one knee.`, awakened ? 'The burning light in its eyes gutters out.' : 'The Gate begins to close around you.'], title: 'Victory', sub: `${g.rank}-rank ${T.name}`, sound: 'milestone', hold: 1.6 });
      if (r === 'win' && e.id === 'ghost_king') cc.flags.ghostKing = true;
      if (r !== 'win') return { text: r === 'flee' ? `I fled the ${T.name}.` : `I was beaten inside the ${g.rank}-rank ${T.name} and dragged myself out.`, cls: 'bad' };
      cc.wins++;
    }
    cc.gates.splice(i, 1); cc.gatesCleared++; addFame(cc, gateFame(GATE_RANKS.indexOf(R)) * (awakened ? 2 : 1), true); if (cc.gatesCleared >= 10) earnTrait(cc, 'gatebreaker'); if (/^S/.test(g.rank)) cc.flags.gateS = true;
    const tier = GATE_RANKS.indexOf(R), yld = gateYield(cc, R);
    const n = Math.max(1, Math.round((ri(2, 3) + Math.floor(tier / 2) + (awakened ? 3 : 0)) * traitVal0(cc) * yld));
    const table = Object.entries(T.loot).map(([id, w]) => ({ id, w }));
    const got = {};
    const add = (name, k = 1) => { got[name] = (got[name] || 0) + k; };
    for (let k = 0; k < n; k++) {
      const L = weighted(table, x => x.w);
      if (L.id === 'gold') { const m = Math.round(ri(100, 900) * (1 + tier) * (1 + Math.max(0, tier - 5)) * yld * wage(cc)); money(cc, m); add(fmtMoney(cc, m)); }
      else if (L.id === 'manual') { const mm = METHODS.filter(x => !x.hidden && !(cc.qi.methods || ['basic']).includes(x.id) && (T.id === 'altar' || !x.demonic)); const m = pick(MANUALS.filter(x => x.id !== 'breathing' && !cc.qi.manuals.includes(x.id)));
        if (mm.length && (chance(0.5) || !m)) { const x = pick(mm); learnMethod(cc, x.id); add(x.name); } else if (m) { learnManual(cc, m.id); add(m.name); } }
      else { const q = rollQuality(cc, awakened ? 0.08 : 0); addItem(cc, L.id, 1, q); add((tiered(L.id) && q !== 'mid' ? QUALITY[q].short + ' ' : '') + (ITEMS[L.id]?.name || L.id)); }
    }
    if (awakened) { addItem(cc, pick(['bloodline_essence', 'recipe_scroll', 'trib_talisman', 'marrow_pill'])); add('Awakened core'); }
    if (chance((GATE_RANKS.indexOf(R) + 1) * 0.012 * (awakened ? 2 : 1))) add(dropRelic(cc) + ' (Rare Relic!)');
    add(`Fame +${(gateFame(GATE_RANKS.indexOf(R)) * (awakened ? 2 : 1)).toLocaleString()}`);
    if (chance(gateHeirloomChance(tier) * yld * (awakened ? 2.5 : 1))) { const x = gainHeirloom(cc, `${g.rank}-rank ${T.name}`); if (x) add(HEIRLOOMS[x.id].name); }
    if (cc.guild && tier >= cc.guild.rank - 1) cc.guild.merit += Math.round((tier + 1) * 8 * yld);
    return { text: `${sweep ? `I walked into the ${g.rank}-rank ${T.name} and nothing inside dared move. ` : ''}I cleared the ${g.rank}-rank ${T.name}${awakened ? ' and slew its AWAKENED boss' : ''}!${yld < 1 ? ` (outlevelled: ${Math.round(yld * 100)}% loot)` : ''} Loot: ${Object.entries(got).map(([k, v]) => v > 1 ? `${v}× ${k}` : k).join(', ')}.`, cls: 'good', big: true };
  } });
}

// Plastic surgery: pay for a chance at better Looks. Cheaper clinics fail (and botch) more often.
export async function openSurgery() {
  const c = G.char, k = country(c).econ;
  const CLINICS = [
    { id: 'minor', name: 'Touch-up at a local clinic', price: 4000, ok: 0.75, gain: [2, 5], botch: 0.1 },
    { id: 'major', name: 'Full facial reconstruction', price: 20000, ok: 0.6, gain: [6, 14], botch: 0.18 },
    { id: 'elite', name: 'Elite surgeon abroad', price: 80000, ok: 0.85, gain: [8, 18], botch: 0.04 },
  ].map(x => ({ ...x, cost: priceFor(c, x.price * k) }));
  const v = await choice({ title: 'Plastic surgery', icon: 'doctor', text: `Looks: ${c.stats.looks}. Results aren't guaranteed — a botched job can make things worse.\nCosts 1 Action.`,
    options: [...CLINICS.map(x => ({ label: `${x.name} — ${fmtMoney(c, x.cost)} · ${Math.round(x.ok * 100)}% success · +${x.gain[0]}–${x.gain[1]} Looks`, value: x.id, disabled: c.money < x.cost })), { label: 'Never mind', value: null, ghost: true }] });
  const x = CLINICS.find(y => y.id === v); if (!x) return;
  await runActivity({ id: 'surgery', cat: 'mind', run: cc => {
    money(cc, -x.cost); cc.flags.surgery = true; stat(cc, 'stress', 6);
    if (chance(x.ok)) { const g = ri(...x.gain); stat(cc, 'looks', g); stat(cc, 'happiness', 10); return { text: `The surgery went well. Looks +${g}. I barely recognise myself in the mirror — in a good way.`, cls: 'good', big: true }; }
    if (chance(x.botch / (1 - x.ok))) { const l = ri(3, 10); stat(cc, 'looks', -l); stat(cc, 'happiness', -15); return { text: `The surgery was botched. Looks -${l}. I can't stop staring at the scars.`, cls: 'bad', big: true }; }
    return { text: 'The surgery healed fine, but nobody can tell the difference.', cls: '' }; } });
}

// Realm ladder: highest realm at the top, your realm highlighted with an ink-brush stroke
function realmLadder(c) {
  const q = c.qi;
  return h('div', { class: 'ladder' }, [...REALMS.map((r, i) => [r, i])].reverse().map(([r, i]) => {
    const cur = i === q.realm, done = i < q.realm;
    const row = h('div', { class: 'rung' + (cur ? ' current' : done ? ' done' : ' locked') },
      h('span', { class: 'rung-glyph', style: { '--rc': r.color } }, r.glyph),
      h('span', { class: 'rung-name' }, r.name, cur && r.stages > 1 ? h('small', {}, ` · Stage ${q.stage}/${r.stages}`) : null),
      null);
    row.style.setProperty('--rc', r.color);
    row.title = `${r.name} — stat cap ${r.cap}, +${r.life}y lifespan, power ×${r.power}`;
    return row;
  }));
}

export function openSalon() {
  const c = G.char; const preview = h('div', { class: 'pframe' });
  const f0 = c.face || {}; let sel = { style: c.hair?.style || c.genes.style, color: c.hair?.color || c.genes.hairColor, brow: f0.brow ?? c.genes.brow ?? 0, mouth: f0.mouth ?? c.genes.mouth ?? 0, eyes: f0.eyes ?? c.genes.eyes ?? 0, mark: f0.mark ?? c.genes.mark ?? 0 };
  const hairCost = priceFor(c, Math.round(60 * country(c).econ)), faceCost = priceFor(c, Math.round(250 * country(c).econ));
  const cur = { ...sel };
  const total = () => ((sel.style !== cur.style || sel.color !== cur.color) ? hairCost : 0) + (['brow', 'mouth', 'eyes', 'mark'].some(k => sel[k] !== cur[k]) ? faceCost : 0);
  const costEl = h('div', { class: 'muted' });
  const redraw = () => { preview.replaceChildren(portraitFor({ ...c, hair: { style: sel.style, color: sel.color }, face: { brow: sel.brow, mouth: sel.mouth, eyes: sel.eyes, mark: sel.mark } }, 128)); costEl.textContent = `Haircut & dye ${fmtMoney(c, hairCost)} · face styling ${fmtMoney(c, faceCost)}\nTotal: ${fmtMoney(c, total())} (you have ${fmtMoney(c, c.money)})`; okBtn.disabled = !total() || c.money < total(); };
  const row = (label, list, key) => [h('h3', { style: { margin: '10px 0 4px' } }, label), h('div', { class: 'row', style: { flexWrap: 'wrap', gap: '4px' } }, list.map((nm, i) => h('button', { class: 'btn ghost mini', onclick: () => { sel[key] = typeof nm === 'string' && key === 'style' ? nm : i; redraw(); } }, nm)))];
  const okBtn = h('button', { class: 'btn', onclick: () => { const t = total(); if (c.money < t) return; money(c, -t); c.hair = { style: sel.style, color: sel.color }; c.face = { brow: sel.brow, mouth: sel.mouth, eyes: sel.eyes, mark: sel.mark }; stat(c, 'happiness', 4); logLine(`I got a new look at the salon (${fmtMoney(c, t)}).`); fx('action'); m.close(); render(); } }, 'Pay & confirm');
  const body = h('div', {}, h('div', { class: 'row' }, preview, costEl),
    ...row(`Hair style (${HAIR_STYLES.F.length + HAIR_STYLES.M.length})`, [...HAIR_STYLES.F, ...HAIR_STYLES.M], 'style'),
    h('h3', { style: { margin: '10px 0 4px' } }, 'Color'), h('div', { class: 'row' }, Object.entries(HAIR_COLORS).map(([k, v]) => h('button', { class: 'btn ghost', title: k, style: { background: v, width: '34px', height: '34px', padding: 0 }, onclick: () => { sel.color = k; redraw(); } }))),
    ...row('Brows', FACE_BROWS, 'brow'), ...row('Eyes', FACE_EYES, 'eyes'), ...row('Mouth', FACE_MOUTHS, 'mouth'), ...row('Marks', FACE_MARKS, 'mark'),
    h('div', { class: 'row', style: { marginTop: '14px' } }, okBtn));
  redraw(); const m = openModal([h('h2', {}, icon('salon', 'lg'), 'Salon'), body]);
}

function changelogBody(entries) {
  return h('div', {}, entries.map((e, i) => h('div', { class: 'box', style: { marginTop: '12px' } },
    h('h3', {}, `v${e.v} — ${e.title}`, i === 0 && e.v === VERSION ? h('span', { class: 'new-tag' }, 'CURRENT') : null), h('div', { class: 'muted', style: { marginBottom: '6px' } }, e.date),
    h('ul', { class: 'notes' }, e.notes.map(n => h('li', {}, n))))));
}
export function openChangelog(entries, fresh) {
  openModal([h('h2', {}, icon('letter', 'lg'), fresh ? `Updated to v${VERSION}!` : 'Update Log'), changelogBody(entries)]);
}

export function render() {
  if (!G.char) return;
  topbar(); agebar(); sidebar(); rightCol(); coopTick();
  const center = $('#center'); const fn = TABS[G.ui.tab] || TABS.life;
  // keep anything the player is typing (chat, room code…) when the screen redraws
  const kept = [...center.querySelectorAll('[data-keep]')].map(el => ({ k: el.dataset.keep, v: el.value, focus: document.activeElement === el, s: el.selectionStart, e: el.selectionEnd }));
  center.replaceChildren(...[fn()].flat(3).filter(Boolean));
  if (G.char.flags?.intro) { const o = G.char.flags.intro; delete G.char.flags.intro; ui.cinematic?.(o); }
  for (const st of kept) { const el = center.querySelector(`[data-keep="${st.k}"]`); if (!el) continue; el.value = st.v; if (st.focus) { el.focus(); try { el.setSelectionRange(st.s, st.e); } catch (e) {} } }
}
