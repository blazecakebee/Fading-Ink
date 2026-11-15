// Main screen rendering: top bar, age bar, left nav, center tab content, right stats column.
import { G, META, save } from '../core/state.js';
import { h, icon, $ } from './dom.js';
import { portraitFor, HAIR_COLORS, HAIR_STYLES, NATURAL_HAIR } from './portrait.js';
import { fx } from './fx.js';
import { choice, openModal, toast } from './modal.js';
import { country, lifeStage, fullName, fmtMoney, realm as realmOf, lifespan, ageUp, money, stat, addItem, ACTIONS_PER_YEAR, SOCIAL_PER_YEAR } from '../systems/life.js';
import { realmName, qiCap, power, learnManual } from '../systems/cultivation.js';
import { relLabel, isFamily } from '../systems/people.js';
import { traitVal, earnTrait } from '../systems/traits.js';
import { ACTIVITIES, CATEGORIES, SOCIAL } from '../data/activities.js';
import { TRAITS, TIERS, TIER_ORDER, TRAIT_BY_ID } from '../data/traits.js';
import { REALMS, ELEMENTS, MANUALS, SECTS } from '../data/realms.js';
import { CAREERS, EDUCATION } from '../data/careers.js';
import { GATE_RANKS, ENEMIES, LOOT } from '../data/combat.js';
import { WEALTH } from '../data/countries.js';
import { ri, pick, chance, weighted } from '../core/rng.js';
import { renderSettings } from './settingsPanel.js';
import { renderLegacy } from './legacyPanel.js';

export const NAV = [
  ['Your Life', [['life', 'Life', 'life'], ['character', 'Character', 'character'], ['skills', 'Skills & Traits', 'skills'], ['cultivation', 'Cultivation', 'cultivation'], ['gates', 'Dungeons & Gates', 'gates']]],
  ['People & Places', [['people', 'People', 'people'], ['career', 'Career', 'career'], ['education', 'Education', 'education'], ['assets', 'Assets & Market', 'assets'], ['world', 'World', 'world']]],
  ['Your Story', [['chronicle', 'Chronicle', 'study'], ['legacy', 'Legacy & Family', 'legacy'], ['coop', 'Co-op', 'people'], ['settings', 'Settings', 'settings']]],
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
  // subtle feedback only the first time / on milestones / big moments, so grinding stays quiet
  if (r.big || [1, 10, 25, 50, 100].includes(n)) fx(r.big ? 'milestone' : 'action');
  save(); render();
}

// ---------- top + age bar
function topbar() {
  const c = G.char, cty = country(c);
  $('#topbar').replaceChildren(
    h('div', { class: 'who' }, h('div', { class: 'mini' }, portraitFor(c, 64)),
      h('div', {}, h('div', { class: 'name display' }, fullName(c)), h('div', { class: 'sub' }, `${c.qi.realm ? realmName(c) : 'Human'} · ${c.gender === 'F' ? 'Female' : 'Male'} · Age ${c.age} · ${lifeStage(c.age)}`))),
    h('div', { class: 'center' }, h('div', {}, h('b', {}, `Year ${G.world.year}`), ' · ', h('span', { class: 'era' }, G.world.era)),
      h('div', { class: 'where' }, '📍 ', `${c.city}, ${cty.name}`)),
    h('div', { class: 'right' }, h('div', {}, icon('market', 'sm'), ' ', h('span', { class: 'money' }, fmtMoney(c, c.money)), ' ', h('span', { class: 'muted' }, WEALTH.find(w => w.id === c.wealth).name)),
      h('div', { class: 'sub' }, `Fame: ${c.fame > 60 ? 'Famous' : c.fame > 25 ? 'Known' : 'Unknown'} · Life #${META.lives} · Gen ${c.generation}`)));
}
function agebar() {
  const c = G.char;
  const pips = (n, max, cls) => h('span', { class: 'pips' }, Array.from({ length: max }, (_, i) => h('i', { class: 'pip ' + cls + (i >= n ? ' used' : '') })));
  $('#agebar').replaceChildren(
    h('span', { class: 'age-title display' }, `AGE ${c.age}`), h('span', { class: 'muted' }, '· ' + lifeStage(c.age)),
    h('span', { class: 'hint' }, c.alive ? 'Use your actions, then age up when you\'re ready.' : 'This life has ended.'),
    h('span', { class: 'budget' }, 'Actions ', h('b', {}, `${c.actions}/${ACTIONS_PER_YEAR}`), pips(c.actions, ACTIONS_PER_YEAR, ''), '  Social ', h('b', {}, `${c.social}/${SOCIAL_PER_YEAR}`), pips(c.social, SOCIAL_PER_YEAR, 'social')),
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
  const badge = id => id === 'gates' && c.gates.length ? c.gates.length : id === 'cultivation' && c.qi.realm && c.qi.qi >= qiCap(c) ? '!' : null;
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
    h('div', {}, bar('Health', s.health, '#ff5a6a', 'heart'), bar('Happiness', s.happiness, '#ffd84a', 'sun'), bar('Stress', s.stress, '#ff8a3a', 'brokenheart'),
      bar('Smarts', s.smarts, '#6ab0ff', 'mind'), bar('Looks', s.looks, '#ff8ad0', 'flower'),
      c.qi.known ? bar('Qi', c.qi.qi, 'var(--qi)', 'cultivation', qiCap(c), `${c.qi.qi}/${qiCap(c)}`) : null),
    h('div', { class: 'box' }, h('h3', {}, 'Your Stats'), h('div', { class: 'stats' },
      ...[['fist', 'Strength', s.strength], ['kick', 'Agility', s.agility], ['people', 'Charisma', s.charisma], ['star', 'Luck', s.luck],
        ['cultivation', 'Realm', c.qi.known ? realmName(c) : '???'], ['combat', 'Power', power(c).toFixed(1)], ['trophy', 'Fights won', c.wins], ['gates', 'Gates', c.gatesCleared],
        ['market', 'Gold', fmtMoney(c, c.money)], ['star', 'Fame', c.fame || 0]].map(([ic, k, v]) => h('div', {}, icon(ic, 'sm'), k, h('b', {}, v))))),
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
      h('div', { class: 'grid2', style: { marginTop: '12px' } }, Object.entries(c.stats).map(([k, v]) => h('div', { class: 'card' }, bar(k[0].toUpperCase() + k.slice(1), v, 'var(--accent2)')))),
      h('div', { class: 'box', style: { marginTop: '14px' } }, h('h3', {}, 'Records'), h('table', { class: 'kv' },
        [['Fights won', c.wins], ['Lives taken', c.kills], ['Gates cleared', c.gatesCleared], ['Combat power', power(c).toFixed(2)], ['Most repeated activity', Object.entries(c.counts).sort((a, b) => b[1] - a[1])[0]?.join(' × ') || '—']].map(([k, v]) => h('tr', {}, h('td', {}, k), h('td', {}, v))))),
      h('div', { class: 'box', style: { marginTop: '14px' } }, h('h3', {}, 'Trait Codex'), h('p', { class: 'muted' }, 'Traits come in 8 tiers. Some can only be earned by doing specific things.'),
        TIER_ORDER.map(tier => h('div', {}, h('div', { class: 'tier-h', style: { color: TIERS[tier].color } }, TIERS[tier].name),
          TRAITS.filter(t => t.tier === tier).map(t => META.unlockedTraits[t.id] || c.traits.includes(t.id) ? traitChip(t.id) : h('span', { class: 'chip', style: { opacity: .5 }, title: t.birth === 0 ? 'Earned through actions…' : 'Rolled at birth…' }, '???')))))];
  },

  cultivation() {
    const c = G.char, q = c.qi, R = REALMS[q.realm], el = ELEMENTS.find(e => e.id === q.elem);
    if (!q.known) return [h('h2', { class: 'display' }, 'Cultivation'), h('p', { class: 'feed' }, 'There are rumors. Old men who never age. Gangs whose members punch through brick. You don\'t know anything for sure yet.')];
    const act = id => ACTIVITIES.find(a => a.id === id);
    const btn = (id, label) => { const a = act(id); const ok = c.alive && c.actions > 0 && (!a.need || a.need(c)) && c.age >= (a.minAge || 0); return h('button', { class: 'btn', disabled: !ok, onclick: () => runActivity(a) }, icon(a.icon, 'sm'), ' ', label || a.name); };
    return [h('h2', { class: 'display' }, 'Cultivation'),
      h('div', { class: 'year-card', style: { marginTop: '10px' } }, h('h2', { class: 'display', style: { color: R.color } }, realmName(c)),
        bar('Qi', q.qi, 'var(--qi)', 'cultivation', qiCap(c), `${q.qi}/${qiCap(c)}`),
        h('div', { class: 'row' }, h('span', {}, icon(el.icon, 'sm'), ` ${el.name} affinity ${q.affinity}`), h('span', { class: 'muted' }, `· Power ×${power(c).toFixed(2)} · Lifespan +${REALMS.slice(1, q.realm + 1).reduce((s, r) => s + r.life, 0)}y`)),
        h('div', { style: { marginTop: '10px' } }, 'Meridians ', h('span', { class: 'meridians' }, Array.from({ length: 12 }, (_, i) => h('i', { class: i < q.meridians ? 'on' : '' })))),
        h('div', { class: 'row', style: { marginTop: '14px' } }, btn('meditate'), btn('meridian'), btn('breakthrough'), btn('pill'), btn('seek_sect'))),
      h('div', { class: 'grid2', style: { marginTop: '14px' } },
        h('div', { class: 'card' }, h('h4', {}, 'Manuals'), q.manuals.length ? q.manuals.map(m => h('div', {}, icon('manual', 'sm'), ' ', MANUALS.find(x => x.id === m).name)) : h('span', { class: 'muted' }, 'You have no manual. Without one, Qi slips through your fingers.')),
        h('div', { class: 'card' }, h('h4', {}, 'Sect / Gang'), c.sect ? SECTS.find(s => s.id === c.sect).name : h('span', { class: 'muted' }, 'Unaffiliated. Cultivation knowledge is guarded by hidden sects and street gangs.')),
        h('div', { class: 'card' }, h('h4', {}, 'Realm ladder'), REALMS.map((r, i) => h('div', { style: { color: i <= q.realm ? r.color : 'var(--muted)' } }, `${i <= q.realm ? '◆' : '◇'} ${r.name}${r.req?.pill ? ' (needs Foundation Pill)' : ''}${r.trib ? ' ⚡' : ''}`))))];
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
      h('h3', { class: 'display', style: { margin: '18px 0 8px' } }, 'Inventory'),
      inv.length ? h('div', { class: 'grid2' }, inv.map(([id, n]) => { const L = LOOT.find(l => l.id === id); return h('div', { class: 'card row' }, icon(L?.icon || 'chest'), h('b', {}, `${L?.name || id} ×${n}`),
        L?.use === 'heal' ? h('button', { class: 'btn ghost', onclick: () => { addItem(c, id, -1); stat(c, 'health', 25); logLine('I swallowed a healing pill. Health +25.', 'good'); render(); } }, 'Use') : null,
        L?.use === 'sell' ? h('button', { class: 'btn ghost', onclick: () => { addItem(c, id, -1); const g = Math.round(400 * country(c).econ); money(c, g); fx('coin'); logLine(`Sold a Spirit Stone for ${fmtMoney(c, g)}.`); render(); } }, 'Sell') : null); }))
        : h('div', { class: 'muted' }, 'Empty.')];
  },

  people() {
    const c = G.char;
    const groups = [['Family', p => isFamily(p) && p.role !== 'Spouse'], ['Love', p => ['Spouse', 'Partner', 'Crush', 'Ex'].includes(p.role)], ['Friends', p => p.role === 'Friend'], ['School & Work', p => ['Classmate', 'Coworker', 'Acquaintance'].includes(p.role)], ['Enemies', p => p.role === 'Enemy']];
    return [h('h2', { class: 'display' }, 'People'), h('p', { class: 'muted' }, `Social actions left: ${c.social}/${SOCIAL_PER_YEAR}. Click someone to interact.`),
      ...groups.map(([g, f]) => { const ps = c.people.filter(f); if (!ps.length) return null;
        return [h('h3', { class: 'display', style: { margin: '16px 0 8px' } }, g), h('div', { class: 'grid2' }, ps.map(p => h('div', { class: 'card person' + (p.alive ? '' : ' dead'), onclick: () => personModal(p) },
          h('div', { class: 'pframe' }, portraitFor(p, 52)), h('div', { style: { flex: 1 } }, h('b', {}, `${p.first} ${p.last}`), h('div', { class: 'rel' }, `${p.role} · ${p.age}${p.alive ? '' : ' · deceased'} · ${relLabel(p)}`),
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
      h('div', { class: 'grid2' }, SHOP.map(([name, type, ic, price]) => { const p = Math.round(price * k); return h('div', { class: 'card row' }, icon(ic), h('div', { style: { flex: 1 } }, h('b', {}, name), h('div', { class: 'muted' }, fmtMoney(c, p))),
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
    return [h('h2', { class: 'display' }, 'Co-op (coming next)'), h('div', { class: 'feed' },
      h('p', {}, 'Planned: peer-to-peer rooms using a short room code — no server needed, so it works on GitHub Pages.'),
      h('p', {}, 'Join each other\'s sects or gangs, spar, train or hit the gym together, date, and have children who inherit both players\' looks, stats and traits.'),
      h('p', { class: 'muted' }, 'Code lives in js/net/coop.js once it lands.'))];
  },
  legacy: () => renderLegacy(),
  settings: () => renderSettings(),
};

// ---------- interactions
async function personModal(p) {
  const c = G.char;
  const opts = SOCIAL.filter(s => p.alive && c.alive && c.age >= (s.age || 0) && (!s.need || s.need(c, p)));
  const v = await choice({ title: `${p.first} ${p.last}`, portrait: h('div', { class: 'pframe' }, portraitFor(p, 96)),
    text: `${p.role} · Age ${p.age}${p.job ? ' · ' + p.job : ''}\nRelationship: ${relLabel(p)} (${p.close}%)${p.alive ? '' : '\nDeceased.'}\nSocial actions left: ${c.social}`,
    options: [...opts.map(s => ({ label: `${s.name}  (💬1)`, value: s.id, disabled: c.social <= 0 })), { label: 'Close', value: null, ghost: true }] });
  if (!v) return;
  const s = SOCIAL.find(x => x.id === v);
  await runActivity({ id: 'soc_' + s.id, cost: 's', run: cc => s.run(cc, p) });
}

async function enterGate(i) {
  const c = G.char, g = c.gates[i], R = GATE_RANKS.find(r => r.rank === g.rank);
  await runActivity({ id: 'gate', cat: 'adventure', run: async cc => {
    for (let f = 0; f < R.fights; f++) {
      const e = ENEMIES.find(x => x.id === pick(R.pool));
      const r = await import('./combat.js').then(m => m.fight({ ...e, name: `${e.name} (${f + 1}/${R.fights})` }));
      if (r !== 'win') return { text: r === 'flee' ? `I fled the ${g.rank}-rank Gate.` : `I was beaten inside the ${g.rank}-rank Gate and dragged myself out.`, cls: 'bad' };
      cc.wins++;
    }
    cc.gates.splice(i, 1); cc.gatesCleared++; if (cc.gatesCleared >= 10) earnTrait(cc, 'gatebreaker');
    const n = ri(1, 3) * (cc.traits.includes('gatebreaker') ? 2 : 1) + Math.floor('EDCBAS'.indexOf(g.rank) / 2);
    const got = [];
    for (let k = 0; k < n; k++) {
      const L = weighted(LOOT, x => x.w * (x.id === 'foundation_pill' ? 1 + 'EDCBAS'.indexOf(g.rank) : 1));
      if (L.use === 'money') { const m = Math.round(ri(200, 2000) * (1 + 'EDCBAS'.indexOf(g.rank)) * country(cc).econ); money(cc, m); got.push(fmtMoney(cc, m)); }
      else if (L.use === 'manual') { const m = pick(MANUALS.filter(x => x.id !== 'breathing' && !cc.qi.manuals.includes(x.id))); if (m) { learnManual(cc, m.id); got.push(m.name); } }
      else { addItem(cc, L.id); got.push(L.name); }
    }
    return { text: `I cleared the ${g.rank}-rank Gate! Loot: ${got.join(', ')}.`, cls: 'good', big: true };
  } });
}

export function openSalon() {
  const c = G.char; const preview = h('div', { class: 'pframe' }); let sel = { style: c.hair?.style || c.genes.style, color: c.hair?.color || c.genes.hairColor };
  const cost = Math.round(60 * country(c).econ);
  const redraw = () => preview.replaceChildren(portraitFor({ ...c, hair: sel }, 128));
  const body = h('div', {}, h('div', { class: 'row' }, preview, h('div', { class: 'muted' }, `Haircut & dye: ${fmtMoney(c, cost)}.\nYour face and base looks stay the same.`)),
    h('h3', { style: { margin: '10px 0 4px' } }, 'Style'), h('div', { class: 'row' }, [...HAIR_STYLES.F, ...HAIR_STYLES.M].map(st => h('button', { class: 'btn ghost', onclick: () => { sel.style = st; redraw(); } }, st))),
    h('h3', { style: { margin: '10px 0 4px' } }, 'Color'), h('div', { class: 'row' }, Object.entries(HAIR_COLORS).map(([k, v]) => h('button', { class: 'btn ghost', title: k, style: { background: v, width: '34px', height: '34px', padding: 0 }, onclick: () => { sel.color = k; redraw(); } }))),
    h('div', { class: 'row', style: { marginTop: '14px' } }, h('button', { class: 'btn', disabled: c.money < cost && c.age >= 18, onclick: () => { if (c.age >= 18) money(c, -cost); c.hair = { ...sel }; stat(c, 'happiness', 4); logLine(`I got a new look at the salon: ${sel.style}, ${sel.color}.`); fx('action'); m.close(); render(); } }, 'Confirm')));
  redraw(); const m = openModal([h('h2', {}, icon('salon', 'lg'), 'Salon'), body]);
}

export function render() {
  if (!G.char) return;
  topbar(); agebar(); sidebar(); rightCol();
  const center = $('#center'); const fn = TABS[G.ui.tab] || TABS.life;
  center.replaceChildren(...[fn()].flat(3).filter(Boolean));
}
