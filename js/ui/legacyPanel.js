// Legacy meta-progression, family tree, and the death / pass-the-torch screen.
import { h, icon } from './dom.js';
import { G, META, save } from '../core/state.js';
import { portraitFor } from './portrait.js';
import { openModal } from './modal.js';
import { fx } from './fx.js';
import { fullName, continueAs, newLife, willInfo, fmtMoney } from '../systems/life.js';
import { realmName } from '../systems/cultivation.js';
import { REALMS } from '../data/realms.js';
import { render, traitChip } from './render.js';
import { TREE, BRANCHES, NODE, perk, nodeCost, canBuy, refundBlessings, OMENS, OMEN_CHANCE } from '../data/legacyTree.js';
import { icon as ic } from './dom.js';

export const PERKS = [
  { id: 'wealth', name: 'Family Savings', desc: '+500 starting money per level.', cost: 15, max: 5 },
  { id: 'qiborn', name: 'Qi-Touched Bloodline', desc: '+15 Qi affinity at birth per level.', cost: 25, max: 3 },
  { id: 'stars', name: 'Lucky Stars', desc: 'Rarer traits are more likely at birth.', cost: 40, max: 3 },
  { id: 'royal', name: 'Noble Blood', desc: 'Higher chance to be born into royalty.', cost: 60, max: 2 },
];

export function renderLegacy() {
  const c = G.char;
  const fam = c.people.filter(p => ['Father', 'Mother'].includes(p.role));
  const spouse = c.people.find(p => p.id === c.partnerId);
  const kids = c.people.filter(p => ['Son', 'Daughter'].includes(p.role));
  const node = (p, label) => h('div', { class: 'card', style: { textAlign: 'center', minWidth: '120px' } }, h('div', { class: 'pframe', style: { display: 'inline-block' } }, portraitFor(p, 56)), h('div', {}, h('b', {}, p.first)), h('div', { class: 'muted' }, `${label} · ${p.age}${p.alive === false ? ' †' : ''}`));
  return [h('h2', { class: 'display' }, 'Legacy & Family'),
    !c.alive ? h('div', { class: 'year-card', style: { marginTop: '10px', textAlign: 'center' } }, h('b', {}, 'This life has ended.'), ' ', h('button', { class: 'btn', onclick: () => deathScreen() }, 'Continue your legacy →')) : null,
    h('div', { class: 'year-card', style: { marginTop: '10px' } }, h('h3', {}, `Legacy Points: ${META.legacy}`), h('div', { class: 'muted' }, `Lives lived: ${META.lives} · Highest realm ever: ${REALMS[META.bestRealm || 0]?.name}`),
      h('p', { class: 'muted' }, 'Earn points by living long, reaching realms, clearing Gates, winning fights, graduating, getting rich and unlocking achievements. Spend them in the skill tree below — upgrades apply to every future life.')),
    legacyTree(),
    blessingShop(),
    h('h3', { class: 'display', style: { margin: '18px 0 8px' } }, 'Family Tree'),
    h('div', { class: 'row', style: { justifyContent: 'center' } }, fam.map(p => node(p, p.role))),
    h('div', { class: 'row', style: { justifyContent: 'center', margin: '8px 0' } }, node(c, 'You'), spouse ? node(spouse, spouse.role) : null),
    h('div', { class: 'row', style: { justifyContent: 'center' } }, kids.length ? kids.map(p => node(p, p.role)) : h('span', { class: 'muted' }, 'No children yet.')),
  ];
}

export function deathScreen() {
  const c = G.char; if (c.alive) return;
  const kids = c.people.filter(p => ['Son', 'Daughter'].includes(p.role) && p.alive);
  const m = openModal([
    h('h2', {}, icon('grave', 'lg'), `${fullName(c)}`),
    h('div', { class: 'row' }, h('div', { class: 'pframe', style: { filter: 'grayscale(.7)' } }, portraitFor(c, 96)),
      h('div', { class: 'text' }, `Died at ${c.age}: ${c.cause}.\n${realmName(c)} · ${c.gatesCleared} Gates · ${c.wins} fights won\n+${c.legacyEarned} Legacy Points (total ${META.legacy})\n${(w => w.heir === 'spouse' ? `Estate (${fmtMoney(c, w.value)}) → ${w.spouse.first}, your spouse (no prenup).` : w.heir === 'children' ? `Estate (${fmtMoney(c, w.value)}) → your ${w.kids.length > 1 ? w.kids.length + ' children' : 'child'}.` : `Estate (${fmtMoney(c, w.value)}) → the state.`)(willInfo(c))}`)),
    h('div', { style: { margin: '8px 0' } }, c.traits.map(traitChip)),
    h('div', { class: 'opts' },
      ...kids.map(k => h('button', { class: 'btn', onclick: () => { m.close(); continueAs(k.id); G.ui.tab = 'life'; render(); } }, 'Continue as ', h('b', {}, k.first), ` (${k.role.toLowerCase()}, age ${k.age})`)),
      h('button', { class: 'btn ghost', onclick: () => { m.close(); G.world.year += 1; newLife(); G.ui.tab = 'life'; render(); } }, 'Start a brand-new life'),
      h('button', { class: 'btn ghost', onclick: () => { m.close(); G.ui.tab = 'legacy'; render(); } }, 'Spend legacy points first')),
  ], { dismiss: false });
}

// v0.9.11 the blessing shop is gone; omens are rolled at birth (read-only list here)
function blessingShop() {
  const back = refundBlessings(); if (back) save();
  const found = id => !!META.omensFound?.[id] || (G.char?.omens || []).includes(id);
  const list = kind => Object.entries(OMENS).filter(([, o]) => o.kind === kind).map(([id, o]) => ({ id, ...o }));
  return h('details', { class: 'box', style: { marginTop: '14px' } }, h('summary', {}, h('h3', { style: { display: 'inline' } }, ic('gift', 'sm'), ' Birth omens')),
    h('div', { class: 'muted small' }, `Can't be bought. Every new life or heir has a ${Math.round(OMEN_CHANCE * 100)}% chance to be born with a blessing, and a separate ${Math.round(OMEN_CHANCE * 100)}% chance of a curse.`),
    h('div', { class: 'muted small', style: { marginTop: '4px' } }, `Discovered: ${Object.keys(OMENS).filter(id => found(id)).length} / ${Object.keys(OMENS).length}. An omen's name and effect stay hidden until one of your lives is born with it.`),
    h('div', { class: 'grid2', style: { marginTop: '8px' } }, [...list('blessing'), ...list('curse')].map(o => found(o.id) ? h('div', { class: 'card omen ' + o.kind }, h('b', {}, (o.kind === 'blessing' ? '✦ ' : '✖ ') + o.name), h('div', { class: 'small muted' }, o.desc))
      : h('div', { class: 'card omen locked' }, h('b', {}, '??? ' + '▮'.repeat(Math.min(8, Math.ceil(o.name.length / 2)))), h('div', { class: 'small' }, h('i', { class: 'muted' }, `Undiscovered ${o.kind} — its name and effect are hidden.`))))));
}

// Skill tree: one column per branch, nodes indented under their parent with connecting lines
function legacyTree() {
  META.tree ||= {};
  const depth = n => n.req ? depth(NODE[n.req]) + 1 : 0;
  const order = br => { const out = []; const walk = (parent, d) => TREE.filter(n => n.branch === br && (n.req || null) === parent).forEach(n => { out.push(n); walk(n.id, d + 1); }); walk(null, 0); return out; };
  return h('div', { class: 'tree' }, Object.entries(BRANCHES).map(([br, B]) => {
    const col = h('div', { class: 'tree-col' }); col.style.setProperty('--bc', B.color);
    col.append(h('div', { class: 'tree-head' }, ic(B.icon, 'sm'), ' ', h('b', {}, B.name), h('div', { class: 'muted small' }, B.desc)));
    for (const n of order(br)) {
      const lvl = perk(n.id), locked = n.req && !perk(n.req), maxed = lvl >= n.max;
      const node = h('div', { class: 'tree-node' + (lvl ? ' owned' : '') + (locked ? ' locked' : '') + (maxed ? ' maxed' : ''), style: { marginLeft: depth(n) * 18 + 'px' } },
        h('div', { class: 'row' }, h('b', {}, n.name), h('span', { class: 'pips-l' }, '◆'.repeat(lvl) + '◇'.repeat(n.max - lvl))),
        h('div', { class: 'small muted' }, n.desc),
        locked ? h('div', { class: 'small' }, `🔒 Needs ${NODE[n.req].name}`) :
        h('button', { class: 'btn mini', disabled: maxed || !canBuy(n), onclick: () => { META.legacy -= nodeCost(n); META.tree[n.id] = lvl + 1; fx('milestone'); save(); render(); } }, maxed ? 'Maxed' : `Unlock · ${nodeCost(n)} pts`));
      col.append(node);
    }
    return col;
  }));
}
