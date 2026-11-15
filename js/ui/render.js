// Main screen rendering: top bar, age bar, left nav, center tab content, right stats column.
import { G, META, save } from '../core/state.js';
import { h, icon, $ } from './dom.js';
import { portraitFor, HAIR_COLORS, HAIR_STYLES, NATURAL_HAIR } from './portrait.js';
import { fx } from './fx.js';
import { choice, openModal, toast, prompt } from './modal.js';
import { inventoryTab, craftingTab, healthTab } from './itemsPanel.js';
import { moodFace, TRAINABLE, decayRate } from '../systems/health.js';
import { COND_BY_ID } from '../data/conditions.js';
import { ITEMS } from '../data/items.js';
import { METHODS } from '../data/realms.js';
import { statCap, softCap, gainMult, CAPPED, discount, priceFor, country, lifeStage, fullName, fmtMoney, realm as realmOf, lifespan, ageUp, money, stat, addItem, ACTIONS_PER_YEAR, SOCIAL_PER_YEAR } from '../systems/life.js';
import { realmName, qiCap, power, learnManual, breakthroughInfo, meridianInfo, meditateRange, HELPFUL_ITEMS, sectName, foundReq, foundSect, method, learnMethod } from '../systems/cultivation.js';
import { relLabel, isFamily, bonds, bondList, favor } from '../systems/people.js';
import { traitVal, earnTrait, checkEarned } from '../systems/traits.js';
import { ACTIVITIES, CATEGORIES, SOCIAL } from '../data/activities.js';
import { TRAITS, TIERS, TIER_ORDER, TRAIT_BY_ID } from '../data/traits.js';
import { REALMS, ELEMENTS, MANUALS, SECTS } from '../data/realms.js';
import { CAREERS, EDUCATION } from '../data/careers.js';
import { GATE_RANKS, ENEMIES, LOOT } from '../data/combat.js';
import { WEALTH } from '../data/countries.js';
import { ri, pick, chance, weighted } from '../core/rng.js';
import { renderSettings } from './settingsPanel.js';
import { renderLegacy } from './legacyPanel.js';
import { VERSION, CHANGELOG } from '../version.js';
import { net, hostRoom, joinRoom, leave, sendChat, doCoopAction, COOP_ACTIONS, coopTick } from '../net/coop.js';

export const NAV = [
  ['Your Life', [['life', 'Life', 'life'], ['character', 'Character', 'character'], ['skills', 'Skills & Traits', 'skills'], ['health', 'Health', 'doctor'], ['inventory', 'Inventory', 'bag'], ['cultivation', 'Cultivation', 'cultivation'], ['crafting', 'Crafting & Gear', 'anvil'], ['gates', 'Dungeons & Gates', 'gates']]],
  ['People & Places', [['people', 'People', 'people'], ['career', 'Career', 'career'], ['education', 'Education', 'education'], ['assets', 'Assets & Market', 'assets'], ['world', 'World', 'world']]],
  ['Your Story', [['chronicle', 'Chronicle', 'study'], ['legacy', 'Legacy & Family', 'legacy'], ['coop', 'Co-op', 'people'], ['updates', 'Update Log', 'letter'], ['settings', 'Settings', 'settings']]],
];

// ---------- chronicle logging (used through bus.ui.log)
export function logLine(text, cls = '') {
  const c = G.char; if (!c) return;
  if (cls === 'world' && META.settings.showWorldNews === false) return;
  if (!c.log.length) c.log.push({ age: c.age, year: G.world.year, lines: [] });
  c.log[c.log.length - 1].lines.push({ t: text, c: cls });
}

// ---------- action runner: spends budget, handles repeat-FX rule
export async function runActivity(a) {
  const c = G.char; if (!c.alive) return;
  const cost = a.cost === 's' ? 'social' : 'actions';
  if (c[cost] <= 0) return toast('No actions left this year. Age up!');
  if (c.prison && a.cat !== 'mind' && a.cat !== 'training') return toast('You are in prison.');
  fx('click');
  const res = await a.run(c);
  if (res == null) { render(); return; } // cancelled / couldn't afford → no cost
  const r = typeof res === 'string' ? { text: res } : res;
  c[cost]--; c.usedThisYear = (c.usedThisYear || 0) + 1;
  if (traitVal(c, 'refund') && chance(traitVal(c, 'refund'))) { c[cost]++; r.text += ' (D̷U̷P̷L̷I̷C̷A̷T̷E̷D̷ — action refunded)'; }
  c.counts[a.id] = (c.counts[a.id] || 0) + 1; const n = c.counts[a.id];
  logLine(r.text, r.cls || '');
  if (cost === 'social') { // socialising trains charisma, and close friends may do you a favor
    stat(c, 'charisma', chance(0.6) ? 2 : 1);
    if (a.person && a.person.close >= 75 && chance(0.12)) { const t = favor(c, a.person); if (t) { logLine(t, 'good'); r.big = true; } }
  }
  checkEarned(c);
  // subtle feedback only the first time / on milestones / big moments, so grinding stays quiet
  if (r.big || [1, 10, 25, 50, 100].includes(n)) fx(r.big ? 'milestone' : 'action');
  save(); render();
}

// ---------- top + age bar
function topbar() {
  const c = G.char, cty = country(c);
  $('#topbar').replaceChildren(
    h('div', { class: 'who' }, h('div', { class: 'mini' }, portraitFor(c, 64)),
      h('div', {}, h('div', { class: 'name display' }, fullName(c)), h('div', { class: 'sub' }, `${c.qi.realm ? realmName(c) : 'Human'} · ${c.gender === 'F' ? 'Female' : 'Male'} · Age ${c.age} · ${lifeStage(c.age)}`), c.ownSect ? h('div', { class: 'clan' }, `👑 ${c.gender === 'F' ? 'Matriarch' : 'Patriarch'} of the ${c.ownSect.clan} Clan · ${c.ownSect.name}`) : null)),
    h('div', { class: 'center' }, h('div', {}, h('b', {}, `Year ${G.world.year}`), ' · ', h('span', { class: 'era' }, G.world.era)),
      h('div', { class: 'where' }, '📍 ', `${c.city}, ${cty.name}`)),
    h('div', { class: 'right' }, h('div', {}, icon('market', 'sm'), ' ', h('span', { class: 'money' }, fmtMoney(c, c.money)), ' ', h('span', { class: 'muted' }, WEALTH.find(w => w.id === c.wealth).name)),
      h('div', { class: 'sub' }, `Fame: ${c.fame > 60 ? 'Famous' : c.fame > 25 ? 'Known' : 'Unknown'} · Life #${META.lives} · Gen ${c.generation}`),
      h('button', { class: 'version-chip', title: 'Update log', onclick: () => openChangelog(CHANGELOG) }, `v${VERSION}`)));
}
function agebar() {
  const c = G.char;
  const pips = (n, max, cls) => h('span', { class: 'pips' }, Array.from({ length: max }, (_, i) => h('i', { class: 'pip ' + cls + (i >= n ? ' used' : '') })));
  $('#agebar').replaceChildren(
    h('span', { class: 'age-title display' }, `AGE ${c.age}`), h('span', { class: 'muted' }, '· ' + lifeStage(c.age)),
    h('span', { class: 'hint' }, c.alive ? 'Use your actions, then age up when you\'re ready.' : 'This life has ended.'),
    h('span', { class: 'budget' }, 'Actions ', h('b', {}, `${c.actions}/${c.maxActions || ACTIONS_PER_YEAR}`), pips(c.actions, c.maxActions || ACTIONS_PER_YEAR, ''), '  Social ', h('b', {}, `${c.social}/${SOCIAL_PER_YEAR}`), pips(c.social, SOCIAL_PER_YEAR, 'social')),
    h('button', { id: 'ageup', disabled: !c.alive, onclick: onAgeUp }, 'AGE UP ▶ ', c.age + 1));
}
let aging = false;
async function onAgeUp() {
  const c = G.char; if (aging || !c.alive) return;
  if (META.settings.confirmAgeUp && (c.actions || c.social)) { const ok = await choice({ title: 'Age up?', text: `You still have ${c.actions} actions and ${c.social} social actions left.`, options: [{ label: 'Age up anyway', value: true }, { label: 'Wait', value: false, ghost: true }] }); if (!ok) return; }
  aging = true; try { await ageUp(); } finally { aging = false; }
  G.ui.tab = c.alive ? G.ui.tab : 'life'; render();
  if (!c.alive) import('./legacyPanel.js').then(m => m.deathScreen());
}

// ---------- left nav
function sidebar() {
  const c = G.char;
  const badge = id => id === 'coop' && net.status === 'reconnecting' ? '…' : id === 'coop' && net.status === 'online' ? net.peers.size + 1 : id === 'gates' && c.gates.length ? c.gates.length : id === 'cultivation' && c.qi.realm && c.qi.qi >= qiCap(c) ? '!' : null;
  $('#sidebar').replaceChildren(...NAV.flatMap(([g, items]) => [h('div', { class: 'nav-group' }, g),
    ...items.filter(([id]) => id !== 'cultivation' || c.qi.known || META.bestRealm > 0).map(([id, label, ic]) => h('button', { class: 'nav-btn' + (G.ui.tab === id ? ' active' : ''), title: label, onclick: () => { fx('click'); G.ui.tab = id; render(); } },
      icon(ic), h('span', { class: 'lbl' }, label), badge(id) ? h('span', { class: 'badge' }, badge(id)) : null))]));
}

// ---------- right column
function bar(label, val, color, ic, max = 100, text) {
  return h('div', { class: 'bar-row' }, h('div', { class: 'lbl' }, h('span', {}, ic ? icon(ic, 'sm') : null, ' ', label), h('span', { class: 'val' }, text ?? Math.round(val))),
    h('div', { class: 'bar' }, h('i', { style: { width: Math.max(0, Math.min(100, val / max * 100)) + '%', '--c': color } })));
}
function rightCol() {
  const c = G.char, s = c.stats;
  const out = [
    h('div', {}, bar('Health', s.health, '#ff5a6a', 'heart'), bar('Happiness', s.happiness, '#ffd84a', 'sun'), bar(`Mood ${moodFace(s.mood ?? 60)}`, s.mood ?? 60, '#7fd1ff', 'flower'), bar('Stress', s.stress, '#ff8a3a', 'brokenheart'),
      bar('Smarts', s.smarts, '#6ab0ff', 'mind'), bar('Looks', s.looks, '#ff8ad0', 'flower'),
      c.qi.known ? bar('Qi', c.qi.qi, 'var(--qi)', 'cultivation', qiCap(c), `${c.qi.qi}/${qiCap(c)}`) : null),
    h('div', { class: 'box' }, h('h3', {}, 'Your Stats'), h('div', { class: 'stats' },
      ...[['fist', 'Strength', s.strength], ['combat', 'Battle IQ', s.battle ?? 0], ['kick', 'Agility', s.agility], ['people', 'Charisma', s.charisma], ['star', 'Luck', s.luck],
        ['cultivation', 'Realm', c.qi.known ? realmName(c) : '???'], ['combat', 'Power', power(c).toFixed(1)], ['trophy', 'Fights won', c.wins], ['gates', 'Gates', c.gatesCleared],
        ['market', 'Gold', fmtMoney(c, c.money)], ['star', 'Fame', c.fame || 0]].map(([ic, k, v]) => h('div', {}, icon(ic, 'sm'), k, h('b', {}, v))))),
    (c.conditions || []).length ? h('div', { class: 'box' }, h('h3', {}, 'Conditions'), c.conditions.map(x => h('span', { class: 'chip', style: { '--tc': 'var(--bad)', cursor: 'pointer' }, onclick: () => { G.ui.tab = 'health'; render(); } }, COND_BY_ID[x.id].name))) : null,
    h('div', { class: 'box' }, h('h3', {}, 'Your Traits ', h('small', { class: 'muted', style: { fontSize: '.8rem' } }, 'hover for details')),
      c.traits.length ? c.traits.map(traitChip) : h('span', { class: 'muted' }, 'None yet.')),
  ];
  if (META.settings.showChronicle !== false) {
    const lines = c.log.slice(-6).reverse().flatMap(y => [h('div', { class: 'yr' }, `Age ${y.age}`), ...y.lines.map(l => h('div', { class: l.c }, l.t))]);
    out.push(h('div', { class: 'box' }, h('h3', {}, 'Chronicle of This Life'), h('div', { class: 'chronicle feed' }, lines)));
  }
  $('#right').replaceChildren(...out);
}
export function traitChip(id) {
  const t = TRAIT_BY_ID[id]; if (!t) return null; const tier = TIERS[t.tier];
  const el = h('span', { class: 'chip ' + t.tier, title: `${t.name} [${tier.name}]\n${t.desc}` }, t.name); el.style.setProperty('--tc', tier.color); return el;
}

// ---------- center tabs
const TABS = {
  life() {
    const c = G.char, cur = c.log[c.log.length - 1] || { lines: [] };
    const flavor = c.age === 0 ? 'A new story begins in faded ink.' : c.prison ? 'Cold walls. Counting days.' : pick(['The city hums. Somewhere, a Gate whispers.', 'Another year written into the ledger.', 'The ink of your life is still wet.']);
    const card = h('div', { class: 'year-card' }, h('h2', { class: 'display' }, `AGE ${c.age}`, h('small', {}, '· ' + lifeStage(c.age))),
      h('div', { class: 'feed' }, cur.lines.length ? cur.lines.map(l => h('p', { class: l.c }, l.t)) : h('p', { class: 'muted' }, flavor)),
      h('div', { class: 'budget-line' }, h('span', {}, '⚡ ', h('b', {}, c.actions), ' actions left'), h('span', {}, '💬 ', h('b', {}, c.social), ' social left (People tab)'), h('span', {}, 'then press ', h('b', {}, 'AGE UP'))));
    if (!c.alive) return [card, h('div', { class: 'row', style: { marginTop: '16px' } }, h('button', { class: 'btn', onclick: () => import('./legacyPanel.js').then(m => m.deathScreen()) }, 'Continue your legacy'))];
    const cats = CATEGORIES.map(cat => {
      const acts = ACTIVITIES.filter(a => a.cat === cat.id && c.age >= (a.minAge ?? 0) && c.age <= (a.maxAge ?? 999) && (!a.need || a.need(c)));
      if (cat.id === 'cultivation' && !c.qi.known) return null;
      if (!acts.length) return null;
      const d = h('details', { class: 'cat', open: G.ui.openCats[cat.id] ?? META.settings.autoOpenCats }, h('summary', {}, icon(cat.icon), cat.name, h('span', { class: 'n' }, `${acts.length} activit${acts.length === 1 ? 'y' : 'ies'}`)),
        h('div', { class: 'acts' }, acts.map(a => h('button', { class: 'act', disabled: (a.cost === 's' ? c.social : c.actions) <= 0, onclick: () => runActivity(a) },
          icon(a.icon), h('span', {}, a.name, c.counts[a.id] ? h('span', { class: 'meta' }, `done ${c.counts[a.id]}×`) : null), h('span', { class: 'cost' }, a.cost === 's' ? '💬1' : '⚡1')))));
      d.addEventListener('toggle', () => { G.ui.openCats[cat.id] = d.open; });
      return d;
    }).filter(Boolean);
    return [card, h('div', { class: 'section-title display' }, 'What do you do this year?', h('span', { class: 'count' }, `${c.actions} actions left`)), ...cats];
  },

  character() {
    const c = G.char, cty = country(c);
    return [h('div', { class: 'row', style: { gap: '24px', alignItems: 'flex-start' } },
      h('div', { class: 'pframe' }, portraitFor(c, Math.max(160, (META.settings.portraitSize || 64) * 2.5))),
      h('div', { style: { flex: 1, minWidth: '240px' } }, h('h2', { class: 'display', style: { fontSize: '2.2rem' } }, fullName(c)),
        h('table', { class: 'kv' }, [['Born', `${c.city}, ${cty.name} (year ${c.birthYear})`], ['Family wealth', WEALTH.find(w => w.id === c.wealth).name], ['Age', `${c.age} · ${lifeStage(c.age)}`],
          ['Expected lifespan', `~${lifespan(c)} years`], ['Hair', `${(c.hair?.style || c.genes.style)} · ${(c.hair?.color || c.genes.hairColor)}`], ['Base looks', c.genes.looks + ' (fixed at birth)'],
          ['Generation', c.generation], ['Heirlooms', c.heirlooms.join(', ') || '—']].map(([k, v]) => h('tr', {}, h('td', {}, k), h('td', {}, v)))),
        h('div', { class: 'row', style: { marginTop: '12px' } }, h('button', { class: 'btn', disabled: c.age < 13 || !c.alive, onclick: openSalon }, icon('salon', 'sm'), ' Visit the salon')),
        h('p', { class: 'muted' }, 'You can\'t change your face or base looks — you play the hand you were dealt. The salon can change your hairstyle and color; cultivation and major events can change the rest.'))),
      h('div', { class: 'box', style: { marginTop: '16px' } }, h('h3', {}, 'Traits'), c.traits.map(id => { const t = TRAIT_BY_ID[id]; return h('div', { style: { margin: '6px 0' } }, traitChip(id), ' ', h('span', { class: 'muted' }, t.desc)); }))];
  },

  skills() {
    const c = G.char;
    return [h('h2', { class: 'display' }, 'Skills & Traits'),
      h('p', { class: 'muted' }, `Stat cap: ${statCap(c)} in ${c.qi.realm ? REALMS[c.qi.realm].name : 'the mortal realm'} (soft cap ${softCap(c)} — gains shrink past it). Each new cultivation realm raises the cap. ` + 'Trainable skills fade if you stop training them for 3+ years — slowly at first, then faster the longer you neglect them (never below 15). School keeps Smarts in use. Looks only fade with age.'),
      h('div', { class: 'grid2', style: { marginTop: '12px' } }, Object.entries(c.stats).map(([k, v]) => { const label = k === 'battle' ? 'Battle Knowledge' : k[0].toUpperCase() + k.slice(1); const tr = TRAINABLE.includes(k); const idle = tr ? c.age - ((c.lastTrained || {})[k] ?? Math.min(c.age, 6)) : 0;
        const loss = tr && v > 15 ? decayRate(c, k) : 0;
        const capped = CAPPED.includes(k), cap = capped ? statCap(c) : 100;
        return h('div', { class: 'card' }, bar(label, v, v >= softCap(c) && capped ? 'var(--legend)' : 'var(--accent2)', null, cap, capped ? `${v} / ${cap}` : undefined), capped && v >= softCap(c) ? h('div', { class: 'small', style: { color: 'var(--legend)' } }, `Soft cap: gains ×${gainMult(c, k).toFixed(2)} — break through to raise the cap`) : null, k === 'battle' ? h('div', { class: 'muted small' }, `+${Math.round(v / 4)}% hit chance, +${Math.round(v / 2.5)}% damage, +${(v / 20).toFixed(1)}% crit in fights`) : null, tr ? h('div', { class: 'muted small' }, idle <= 0 ? 'Trained this year ✓' : `Last trained ${idle}y ago${loss ? ` · fading −${loss}/yr` : ''}`) : k === 'looks' ? h('div', { class: 'muted small' }, 'Fades with age only') : null); })),
      h('div', { class: 'box', style: { marginTop: '14px' } }, h('h3', {}, 'Records'), h('table', { class: 'kv' },
        [['Fights won', c.wins], ['Lives taken', c.kills], ['Gates cleared', c.gatesCleared], ['Combat power', power(c).toFixed(2)], ['Most repeated activity', Object.entries(c.counts).sort((a, b) => b[1] - a[1])[0]?.join(' × ') || '—']].map(([k, v]) => h('tr', {}, h('td', {}, k), h('td', {}, v))))),
      h('div', { class: 'box', style: { marginTop: '14px' } }, h('h3', {}, 'Trait Codex'), h('p', { class: 'muted' }, 'Traits come in 8 tiers. Some can only be earned by doing specific things.'),
        TIER_ORDER.map(tier => h('div', {}, h('div', { class: 'tier-h', style: { color: TIERS[tier].color } }, TIERS[tier].name),
          TRAITS.filter(t => t.tier === tier).map(t => META.unlockedTraits[t.id] || c.traits.includes(t.id) ? traitChip(t.id) : h('span', { class: 'chip', style: { opacity: .5 }, title: t.birth === 0 ? 'Earned through actions…' : 'Rolled at birth…' }, '???')))))];
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
      card('meditate', 'Meditate', [!q.manuals.length ? 'Without a manual you only calm your mind (-Stress).' : `Gathers about ${mLo}–${mHi} Qi using the ${M.name}.`, M.side ? 'Method effect: ' + M.desc : null, '-5 Stress.', q.realm === 0 && q.manuals.length ? 'Fill your Qi to enter Qi Condensation on your next birthday.' : null]),
      q.realm >= 1 ? card('meridian', 'Open a meridian', [`Costs ${mi.cost} Qi and 2–8 Health.`, `Success chance: ${pc(mi.p)}.`, 'Each open meridian: +8% Qi gain and +1.5% breakthrough chance.', 'On failure: 20% risk of Blocked Meridians (halves Qi gain until healed).']) : null,
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
        h('div', { style: { marginTop: '10px' } }, 'Meridians ', h('span', { class: 'meridians' }, Array.from({ length: 12 }, (_, i) => h('i', { class: i < q.meridians ? 'on' : '' }))))),
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
        h('div', { class: 'card' }, h('h4', {}, 'Sect / Gang'), c.sect ? h('div', {}, sectName(c), c.ownSect ? h('div', { class: 'muted small' }, `Founded by you · ${c.ownSect.disciples} disciples · +10% Qi · yearly tithes`) : null) : h('span', { class: 'muted' }, 'Unaffiliated.')),
        !c.ownSect ? h('div', { class: 'card' }, h('h4', {}, '👑 Found your own sect'), h('div', { class: 'muted small' }, 'Become the head of a new clan. Your surname becomes the clan name, passed to your children like a royal house. Disciples join every year and pay tithes.'),
          fr.missing.length ? h('div', { class: 'small bad', style: { marginTop: '6px' } }, 'Needs: ' + fr.missing.join(', ')) : null,
          h('button', { class: 'btn', style: { marginTop: '8px' }, disabled: !!fr.missing.length || c.actions <= 0, onclick: async () => {
            const v = await prompt({ title: 'Found your sect', icon: 'crown', text: `Cost: ${fmtMoney(c, fr.cost)}. Choose wisely — this name will outlive you.`, fields: [{ key: 'name', label: 'Sect name', placeholder: 'e.g. Azure Lotus Sect', max: 32 }, { key: 'clan', label: 'Clan surname (your new last name)', placeholder: 'e.g. Long', max: 16 }] });
            if (v) runActivity({ id: 'found_sect', cat: 'cultivation', run: cc => foundSect(cc, v.name, v.clan) }); } }, 'Found sect (⚡1)')) : null,
        h('div', { class: 'card' }, h('h4', {}, 'Realm ladder'), REALMS.map((r, i) => h('div', { style: { color: i <= q.realm ? r.color : 'var(--muted)' } }, `${i <= q.realm ? '◆' : '◇'} ${r.name}${r.req?.pill ? ' (needs Foundation Pill)' : ''}${r.trib ? ' ⚡' : ''}`)))),
    ];
  },

  gates() {
    const c = G.char;
    const inv = Object.entries(c.inv);
    return [h('h2', { class: 'display' }, 'Dungeons & Gates'),
      h('p', { class: 'muted' }, 'Gates tear open around the world. Inside: corrupt souls, demonic cultivators and hungry spirits — and the pills and manuals that make cultivators. Entering costs 1 action.'),
      c.gates.length ? h('div', { class: 'grid2' }, c.gates.map((g, i) => { const R = GATE_RANKS.find(r => r.rank === g.rank);
        return h('div', { class: 'card' }, h('h4', { style: { color: R.color } }, `${g.rank}-Rank Gate`), h('div', { class: 'muted' }, `${R.fights} fights · closes in ${g.years}y · recommended: ${REALMS[R.realm].name}`),
          h('button', { class: 'btn', style: { marginTop: '8px' }, disabled: !c.alive || c.actions <= 0 || c.age < 14, onclick: () => enterGate(i) }, icon('gates', 'sm'), ' Enter')); }))
        : h('div', { class: 'card muted' }, 'No open Gates near you. Hike the mountains or wait for news.'),
      h('div', { class: 'row', style: { marginTop: '14px' } }, h('button', { class: 'btn ghost', onclick: () => { G.ui.tab = 'inventory'; render(); } }, icon('bag', 'sm'), ` Open inventory (${inv.reduce((s, [, n]) => s + n, 0)} items)`))];
  },

  people() {
    const c = G.char;
    const groups = [['Family', p => isFamily(p) && p.role !== 'Spouse'], ['Love', p => ['Spouse', 'Partner', 'Crush', 'Ex'].includes(p.role)], ['Friends & Players', p => p.role === 'Friend' || p.role === 'Co-op Friend'], ['School & Work', p => ['Classmate', 'Coworker', 'Acquaintance'].includes(p.role)], ['Enemies', p => p.role === 'Enemy']];
    const bl = bondList(c), best = bonds(c).best;
    return [h('h2', { class: 'display' }, 'People'), h('p', { class: 'muted' }, `Social actions left: ${c.social}/${SOCIAL_PER_YEAR}. Click someone to interact. Socialising trains Charisma; people at 75%+ may gift you things or teach you skills, recipes and cultivation methods.`),
      h('div', { class: 'box' }, h('h3', {}, 'Bonds'), bl.length ? bl.map(b => h('div', { style: { margin: '4px 0' } }, h('b', {}, `${b.label}: ${b.who.first}`), h('span', { class: 'muted' }, ' — ' + b.perks.join(' · ')))) : h('div', { class: 'muted' }, 'Get a friend to 80% closeness to make them your Best Friend, or a partner to 50%+, to unlock training, study, Qi and salary bonuses.')),
      ...groups.map(([g, f]) => { const ps = c.people.filter(f); if (!ps.length) return null;
        return [h('h3', { class: 'display', style: { margin: '16px 0 8px' } }, g), h('div', { class: 'grid2' }, ps.map(p => h('div', { class: 'card person' + (p.alive ? '' : ' dead'), onclick: () => personModal(p) },
          h('div', { class: 'pframe' }, portraitFor(p, 52)), h('div', { style: { flex: 1 } }, h('b', {}, best === p ? '★ ' : '', `${p.first} ${p.last}`, p.coop ? h('span', { class: 'online' + (p.online ? ' on' : ''), title: p.online ? 'Player online' : 'Player offline' }, p.online ? ' ● player' : ' ○ player') : null), h('div', { class: 'rel' }, `${p.role} · ${p.age}${p.alive ? '' : ' · deceased'} · ${relLabel(p)}`),
            h('div', { class: 'bar' }, h('i', { style: { width: p.close + '%', '--c': p.role === 'Enemy' ? 'var(--bad)' : 'var(--good)' } }))))))]; })];
  },

  career() {
    const c = G.char; const cur = c.job && CAREERS.find(j => j.id === c.job.id);
    const eligible = j => c.age >= j.minAge && c.age <= (j.maxAge || 99) && c.edu.level >= j.edu && Object.entries(j.stat || {}).every(([k, v]) => c.stats[k] >= v) && (!j.realm || c.qi.realm >= j.realm) && (!j.sect || c.sect === j.sect || true);
    return [h('h2', { class: 'display' }, 'Career'),
      cur ? h('div', { class: 'year-card', style: { marginTop: '10px' } }, h('h3', {}, `${cur.name}`), h('div', {}, `Years: ${c.job.years} · Performance ${c.job.perf}%`), bar('Performance', c.job.perf, 'var(--good)'),
        h('div', { class: 'row' }, h('button', { class: 'btn ghost', onclick: () => { logLine(`I quit my job as a ${cur.name}.`); c.job = null; render(); } }, 'Quit job')))
        : h('p', { class: 'muted' }, c.prison ? 'You are in prison.' : 'Unemployed.'),
      h('h3', { class: 'display', style: { margin: '16px 0 8px' } }, 'Job listings'),
      h('div', { class: 'grid2' }, CAREERS.map(j => h('div', { class: 'card' }, h('h4', {}, j.name, j.part ? h('span', { class: 'muted' }, ' (part-time)') : ''),
        h('div', { class: 'muted' }, `${fmtMoney(c, j.pay * country(c).econ * (j.part ? 0.5 : 1))}/yr · age ${j.minAge}+ · ${EDUCATION[j.edu]}${j.stat ? ' · ' + Object.entries(j.stat).map(([k, v]) => `${k} ${v}+`).join(', ') : ''}${j.realm ? ' · ' + REALMS[j.realm].name : ''}`),
        h('button', { class: 'btn', style: { marginTop: '8px' }, disabled: !c.alive || c.prison || c.actions <= 0 || !eligible(j) || c.job?.id === j.id,
          onclick: () => runActivity({ id: 'apply_' + j.id, cat: 'work', run: cc => { if (chance(0.45 + cc.stats.charisma / 250 + cc.stats.smarts / 400)) { cc.job = { id: j.id, years: 0, perf: 50 }; return { text: `I was hired as a ${j.name}!`, cls: 'good', big: true }; } return { text: `My application to be a ${j.name} was rejected.`, cls: 'bad' }; } }) }, 'Apply (⚡1)'))))];
  },

  education() {
    const c = G.char, e = c.edu;
    const acts = ACTIVITIES.filter(a => a.cat === 'school' && c.age >= (a.minAge || 0) && (!a.need || a.need(c)));
    return [h('h2', { class: 'display' }, 'Education'), h('table', { class: 'kv', style: { marginTop: '10px' } },
      [['Currently', e.school || 'Not enrolled'], ['Highest', EDUCATION[e.level]], ['Grades', e.school ? e.grades + '%' : '—'], ['Major', e.major || '—'], ['University year', e.school === 'University' ? e.uniYears + 1 + ' / 4' : '—']].map(([k, v]) => h('tr', {}, h('td', {}, k), h('td', {}, v)))),
      h('div', { class: 'row', style: { marginTop: '12px' } }, acts.map(a => h('button', { class: 'btn', disabled: c.actions <= 0 || !c.alive, onclick: () => runActivity(a) }, icon(a.icon, 'sm'), ' ', a.name)))];
  },

  assets() {
    const c = G.char, k = country(c).econ;
    const SHOP = [['Studio apartment', 'house', 'house', 60000], ['Family house', 'house', 'house', 250000], ['Mountain villa', 'house', 'house', 900000], ['Used car', 'car', 'car', 4000], ['Sedan', 'car', 'car', 25000], ['Sports car', 'car', 'car', 120000]];
    return [h('h2', { class: 'display' }, 'Assets & Market'), h('table', { class: 'kv', style: { marginTop: '10px' } }, [['Cash', fmtMoney(c, c.money)], ['Investments', fmtMoney(c, c.stocks)], ['Net worth', fmtMoney(c, c.money + c.stocks + c.assets.reduce((s, a) => s + a.value, 0))]].map(([a, b]) => h('tr', {}, h('td', {}, a), h('td', {}, b)))),
      h('h3', { class: 'display', style: { margin: '16px 0 8px' } }, 'Owned'),
      c.assets.length ? h('div', { class: 'grid2' }, c.assets.map((a, i) => h('div', { class: 'card row' }, icon(a.type === 'pet' ? 'pet' : a.type), h('div', { style: { flex: 1 } }, h('b', {}, a.name), h('div', { class: 'muted' }, a.type === 'pet' ? 'Pet' : `${fmtMoney(c, a.value)}${a.tenant ? ` · rented ${fmtMoney(c, a.rent)}/yr` : ''}`)),
        a.type === 'house' ? h('button', { class: 'btn ghost', onclick: () => { a.tenant = !a.tenant; a.rent = Math.round(a.value * 0.05); logLine(a.tenant ? `I rented out my ${a.name}.` : `I evicted my tenant.`); render(); } }, a.tenant ? 'Evict' : 'Rent out') : null,
        a.type !== 'pet' ? h('button', { class: 'btn ghost', onclick: () => { money(c, a.value); c.assets.splice(i, 1); fx('coin'); logLine(`I sold my ${a.name} for ${fmtMoney(c, a.value)}.`); render(); } }, 'Sell') : null))) : h('div', { class: 'muted' }, 'Nothing yet.'),
      h('h3', { class: 'display', style: { margin: '16px 0 8px' } }, 'Market'),
      h('p', { class: 'muted small' }, discount(c) ? `Your charisma gets you ${Math.round(discount(c) * 100)}% off everything here.` : 'Raise your Charisma to get better deals from merchants.'),
      h('div', { class: 'grid2' }, SHOP.map(([name, type, ic, price]) => { const p = priceFor(c, price * k); return h('div', { class: 'card row' }, icon(ic), h('div', { style: { flex: 1 } }, h('b', {}, name), h('div', { class: 'muted' }, fmtMoney(c, p))),
        h('button', { class: 'btn', disabled: c.age < 18 || c.money < p || !c.alive, onclick: async () => { const ok = await choice({ title: 'Buy ' + name + '?', text: `Price: ${fmtMoney(c, p)}`, icon: ic, options: [{ label: 'Buy', value: true }, { label: 'Cancel', value: false, ghost: true }] }); if (!ok) return; money(c, -p); c.assets.push({ type, name, value: p }); fx('coin'); stat(c, 'happiness', 10); logLine(`I bought a ${name.toLowerCase()} for ${fmtMoney(c, p)}.`, 'good'); render(); } }, 'Buy')); })),
      h('div', { class: 'row', style: { marginTop: '14px' } }, h('button', { class: 'btn', disabled: c.age < 18 || c.actions <= 0, onclick: () => runActivity(ACTIVITIES.find(a => a.id === 'invest')) }, icon('stocks', 'sm'), ' Invest / cash out (⚡1)'))];
  },

  world() {
    const c = G.char, cty = country(c);
    const news = c.log.flatMap(y => y.lines.filter(l => l.c === 'world').map(l => `Age ${y.age} — ${l.t}`)).slice(-12).reverse();
    return [h('h2', { class: 'display' }, 'World'), h('table', { class: 'kv', style: { marginTop: '10px' } },
      [['Year', G.world.year], ['Era', G.world.era], ['Country', cty.name], ['City', c.city], ['Economy', cty.econ >= 1.2 ? 'Strong' : cty.econ >= 0.8 ? 'Average' : 'Developing'], ['Spiritual density (Qi)', cty.qi >= 1.3 ? 'Very high' : cty.qi >= 1 ? 'High' : 'Thin'], ['Danger', cty.danger > 0.45 ? 'High' : cty.danger > 0.25 ? 'Moderate' : 'Low']].map(([a, b]) => h('tr', {}, h('td', {}, a), h('td', {}, b)))),
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
      h('div', { class: 'grid2' }, h('div', { class: 'card person' }, h('div', { class: 'pframe' }, portraitFor(c, 52)), h('div', {}, h('b', {}, fullName(c) + ' (you)'), h('div', { class: 'rel' }, `Age ${c.age} · ${c.qi.realm ? realmName(c) : 'Mortal'}`))),
        players.map(([pid, pr]) => { const person = c.people.find(x => x.coop === pr.charId);
          return h('div', { class: 'card person', onclick: () => person && personModal(person) }, h('div', { class: 'pframe' }, portraitFor({ ...pr, qi: null, realm: pr.realm }, 52)),
            h('div', {}, h('b', {}, `${pr.first} ${pr.last}`), h('div', { class: 'rel' }, `Age ${pr.age}${pr.alive ? '' : ' · deceased'} · ${person?.role || ''}`))); })),
      h('h3', { class: 'display', style: { margin: '16px 0 8px' } }, 'Chat'), log, h('div', { class: 'row', style: { marginTop: '8px' } }, msg, h('button', { class: 'btn', onclick: send }, 'Send'))];
  },
  inventory: () => inventoryTab(),
  crafting: () => craftingTab(),
  health: () => healthTab(),
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
  const opts = SOCIAL.filter(s => p.alive && c.alive && c.age >= (s.age || 0) && (!s.need || s.need(c, p)));
  const v = await choice({ title: `${p.first} ${p.last}`, portrait: h('div', { class: 'pframe' }, portraitFor(p, 96)),
    text: `${p.role}${bonds(c).best === p ? ' · ★ Best Friend' : ''} · Age ${p.age}${p.job ? ' · ' + p.job : ''}${p.realm ? ' · senses of Qi about them' : ''}\nRelationship: ${relLabel(p)} (${p.close}%)${p.close >= 75 ? '\nThey might gift you something or teach you what they know.' : ''}${p.alive ? '' : '\nDeceased.'}\nSocial actions left: ${c.social}`,
    options: [...opts.map(s => ({ label: `${s.emoji || '•'}  ${s.name}   · 1 social`, value: s.id, disabled: c.social <= 0 })), { label: 'Close', value: null, ghost: true }] });
  if (!v) return;
  const s = SOCIAL.find(x => x.id === v);
  await runActivity({ id: 'soc_' + s.id, cost: 's', person: p, run: cc => s.run(cc, p) });
}

const traitVal0 = c => c.traits.reduce((m, id) => m * (TRAIT_BY_ID[id]?.loot || 1), 1);

async function coopPersonModal(p) {
  const c = G.char;
  const acts = COOP_ACTIONS.filter(a => p.alive && c.alive && c.age >= (a.age || 0) && (!a.need || a.need(c, p)));
  const v = await choice({ title: `${p.first} ${p.last}`, portrait: h('div', { class: 'pframe' }, portraitFor(p, 96)),
    text: `Player · ${p.role} · Age ${p.age}\n${p.online ? 'Online now' : 'Offline — they need to be in your co-op room'}\nRelationship: ${relLabel(p)} (${p.close}%)\nSocial actions left: ${c.social}`,
    options: [...acts.map(a => ({ label: `${a.emoji || '•'}  ${a.name}   · 1 social`, value: a.id, disabled: c.social <= 0 || !p.online })), { label: 'Open chat', value: '_chat', ghost: true }, { label: 'Close', value: null, ghost: true }] });
  if (!v) return; if (v === '_chat') { G.ui.tab = 'coop'; return render(); }
  await runActivity({ id: 'coop_' + v, cost: 's', run: () => doCoopAction(p, v) });
}

async function enterGate(i) {
  const c = G.char, g = c.gates[i], R = GATE_RANKS.find(r => r.rank === g.rank);
  await runActivity({ id: 'gate', cat: 'adventure', run: async cc => {
    for (let f = 0; f < R.fights; f++) {
      const e = ENEMIES.find(x => x.id === pick(R.pool));
      const r = await import('./combat.js').then(m => m.fight({ ...e, name: `${e.name} (${f + 1}/${R.fights})` }));
      if (r === 'win' && e.id === 'ghost_king') cc.flags.ghostKing = true;
      if (r !== 'win') return { text: r === 'flee' ? `I fled the ${g.rank}-rank Gate.` : `I was beaten inside the ${g.rank}-rank Gate and dragged myself out.`, cls: 'bad' };
      cc.wins++;
    }
    cc.gates.splice(i, 1); cc.gatesCleared++; if (cc.gatesCleared >= 10) earnTrait(cc, 'gatebreaker');
    const n = Math.round((ri(1, 3) + Math.floor('EDCBAS'.indexOf(g.rank) / 2)) * traitVal0(cc));
    const got = [];
    for (let k = 0; k < n; k++) {
      const L = weighted(LOOT, x => x.w * (x.id === 'foundation_pill' ? 1 + 'EDCBAS'.indexOf(g.rank) : 1));
      if (L.use === 'money') { const m = Math.round(ri(200, 2000) * (1 + 'EDCBAS'.indexOf(g.rank)) * country(cc).econ); money(cc, m); got.push(fmtMoney(cc, m)); }
      else if (L.use === 'manual') { const mm = METHODS.filter(x => !(cc.qi.methods || ['basic']).includes(x.id)); const m = pick(MANUALS.filter(x => x.id !== 'breathing' && !cc.qi.manuals.includes(x.id)));
        if (mm.length && (chance(0.5) || !m)) { const x = pick(mm); learnMethod(cc, x.id); got.push(x.name); } else if (m) { learnManual(cc, m.id); got.push(m.name); } }
      else { addItem(cc, L.id); got.push(ITEMS[L.id]?.name || L.name); }
    }
    return { text: `I cleared the ${g.rank}-rank Gate! Loot: ${got.join(', ')}.`, cls: 'good', big: true };
  } });
}

export function openSalon() {
  const c = G.char; const preview = h('div', { class: 'pframe' }); let sel = { style: c.hair?.style || c.genes.style, color: c.hair?.color || c.genes.hairColor };
  const cost = priceFor(c, 60 * country(c).econ);
  const redraw = () => preview.replaceChildren(portraitFor({ ...c, hair: sel }, 128));
  const body = h('div', {}, h('div', { class: 'row' }, preview, h('div', { class: 'muted' }, `Haircut & dye: ${fmtMoney(c, cost)}.\nYour face and base looks stay the same.`)),
    h('h3', { style: { margin: '10px 0 4px' } }, 'Style'), h('div', { class: 'row' }, [...HAIR_STYLES.F, ...HAIR_STYLES.M].map(st => h('button', { class: 'btn ghost', onclick: () => { sel.style = st; redraw(); } }, st))),
    h('h3', { style: { margin: '10px 0 4px' } }, 'Color'), h('div', { class: 'row' }, Object.entries(HAIR_COLORS).map(([k, v]) => h('button', { class: 'btn ghost', title: k, style: { background: v, width: '34px', height: '34px', padding: 0 }, onclick: () => { sel.color = k; redraw(); } }))),
    h('div', { class: 'row', style: { marginTop: '14px' } }, h('button', { class: 'btn', disabled: c.money < cost && c.age >= 18, onclick: () => { if (c.age >= 18) money(c, -cost); c.hair = { ...sel }; stat(c, 'happiness', 4); logLine(`I got a new look at the salon: ${sel.style}, ${sel.color}.`); fx('action'); m.close(); render(); } }, 'Confirm')));
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
  for (const st of kept) { const el = center.querySelector(`[data-keep="${st.k}"]`); if (!el) continue; el.value = st.v; if (st.focus) { el.focus(); try { el.setSelectionRange(st.s, st.e); } catch (e) {} } }
}
