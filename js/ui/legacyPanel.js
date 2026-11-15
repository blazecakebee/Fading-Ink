// Legacy meta-progression, family tree, and the death / pass-the-torch screen.
import { h, icon } from './dom.js';
import { G, META, save } from '../core/state.js';
import { portraitFor } from './portrait.js';
import { openModal } from './modal.js';
import { fx } from './fx.js';
import { fullName, continueAs, newLife } from '../systems/life.js';
import { realmName } from '../systems/cultivation.js';
import { render, traitChip } from './render.js';

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
    h('div', { class: 'year-card', style: { marginTop: '10px' } }, h('h3', {}, `Legacy Points: ${META.legacy}`), h('div', { class: 'muted' }, `Lives lived: ${META.lives} · Highest realm ever: ${['Mortal', 'Qi Condensation', 'Foundation', 'Core', 'Nascent Soul', 'Spirit Severing', 'Dao Seeking', 'Immortal'][META.bestRealm]}`),
      h('p', { class: 'muted' }, 'Earn points by living long, reaching realms, clearing Gates, winning fights, graduating and getting rich. Spend them on permanent perks for future lives.')),
    h('div', { class: 'grid2', style: { marginTop: '12px' } }, PERKS.map(p => { const lvl = META.perks[p.id] || 0; const cost = p.cost * (lvl + 1);
      return h('div', { class: 'card' }, h('h4', {}, `${p.name} ${'◆'.repeat(lvl)}${'◇'.repeat(p.max - lvl)}`), h('div', { class: 'muted' }, p.desc),
        h('button', { class: 'btn', style: { marginTop: '8px' }, disabled: lvl >= p.max || META.legacy < cost, onclick: () => { META.legacy -= cost; META.perks[p.id] = lvl + 1; fx('milestone'); save(); render(); } }, lvl >= p.max ? 'Maxed' : `Unlock (${cost} pts)`)); })),
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
      h('div', { class: 'text' }, `Died at ${c.age}: ${c.cause}.\n${realmName(c)} · ${c.gatesCleared} Gates · ${c.wins} fights won\n+${c.legacyEarned} Legacy Points (total ${META.legacy})`)),
    h('div', { style: { margin: '8px 0' } }, c.traits.map(traitChip)),
    h('div', { class: 'opts' },
      ...kids.map(k => h('button', { class: 'btn', onclick: () => { m.close(); continueAs(k.id); G.ui.tab = 'life'; render(); } }, 'Continue as ', h('b', {}, k.first), ` (${k.role.toLowerCase()}, age ${k.age})`)),
      h('button', { class: 'btn ghost', onclick: () => { m.close(); G.world.year += 1; newLife(); G.ui.tab = 'life'; render(); } }, 'Start a brand-new life'),
      h('button', { class: 'btn ghost', onclick: () => { m.close(); G.ui.tab = 'legacy'; render(); } }, 'Spend legacy points first')),
  ], { dismiss: false });
}
