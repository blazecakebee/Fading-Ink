// Status tab: full character sheet — full-body sprite, stats with caps, combat numbers, every bonus, conditions, traits.
import { G, META } from '../core/state.js';
import { h, icon } from './dom.js';
import { drawFullBody } from './portrait.js';
import { traitChip, render } from './render.js';
import { REALMS, ELEMENTS } from '../data/realms.js';
import { ITEMS, SLOTS } from '../data/items.js';
import { COND_BY_ID } from '../data/conditions.js';
import { WEALTH } from '../data/countries.js';
import { traitMult, traitVal } from '../systems/traits.js';
import { bondBonus, bondList } from '../systems/people.js';
import { gearStats } from '../systems/crafting.js';
import { condQiMult, moodMult, moodFace, bleedMult } from '../systems/health.js';
import { realmName, power, method, qiCap, sectName } from '../systems/cultivation.js';
import { heightNow, fmtHeight, muscleLabel, ensureBody, allCaps } from '../systems/body.js';
import { CAPACITIES } from '../data/body.js';
import { bodySection } from './itemsPanel.js';
import { country, fullName, lifeStage, lifespan, fmtMoney, netWorth, wealthLabel, statCap, softCap, discount, CAPPED } from '../systems/life.js';

const pct = m => `${m >= 1 ? '+' : ''}${Math.round((m - 1) * 100)}%`;
const add = v => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}%`;
const row = (k, v, cls) => h('tr', {}, h('td', {}, k), h('td', { class: cls || '' }, v));

export function statusTab() {
  const c = G.char, cty = country(c), gs = gearStats(c), M = method(c); ensureBody(c);
  const cv = document.createElement('canvas'); cv.className = 'portrait fullbody';
  drawFullBody(cv, c.genes, { age: c.age, gender: c.gender, realm: c.qi.realm, hair: c.hair, gear: c.gear || {}, body: c.body, heightCm: heightNow(c), elemColor: c.qi.realm >= 3 ? ELEMENTS.find(e => e.id === c.qi.elem)?.color : null });
  const pPow = power(c);
  const maxHp = Math.round((40 + c.stats.health * 0.5 + c.stats.strength * 0.3) * (1 + (pPow - 1) * 0.5) + gs.hp);
  const bk = c.stats.battle || 0;
  const qiTotal = traitMult(c, 'qi') * bondBonus(c, 'qi') * condQiMult(c) * (1 + gs.qi) * (c.ownSect ? 1.1 : 1) * M.qi;
  const bonuses = [
    ['Qi gain', pct(qiTotal), `traits ${pct(traitMult(c, 'qi'))} · bonds ${pct(bondBonus(c, 'qi'))} · method ${pct(M.qi)} · gear ${add(gs.qi)}${c.ownSect ? ' · own sect +10%' : ''}${condQiMult(c) !== 1 ? ` · conditions ${pct(condQiMult(c))}` : ''}`],
    ['Training gains', pct(traitMult(c, 'train') * bondBonus(c, 'train') * moodMult(c)), `traits ${pct(traitMult(c, 'train'))} · bonds ${pct(bondBonus(c, 'train'))} · happiness ${pct(moodMult(c))}`],
    ['Study gains', pct(traitMult(c, 'study') * bondBonus(c, 'study') * moodMult(c)), `traits ${pct(traitMult(c, 'study'))} · bonds ${pct(bondBonus(c, 'study'))} · happiness ${pct(moodMult(c))}`],
    ['Salary', pct(traitMult(c, 'pay') * bondBonus(c, 'work')), `traits ${pct(traitMult(c, 'pay'))} · bonds ${pct(bondBonus(c, 'work'))}`],
    ['Relationship growth', pct(1.3 * traitMult(c, 'social')), 'base +30% · traits ' + pct(traitMult(c, 'social'))],
    ['Merchant discount', `${Math.round(discount(c) * 100)}%`, 'from Charisma'],
    ['Crafting success', add(traitVal(c, 'craft') + (c.stats.smarts - 50) / 200 + bondBonus(c, 'craft') - 1), 'Smarts, traits & best friend'],
    ['Pill potency', pct(traitMult(c, 'pill')), 'traits'],
    ['Gate loot', pct(traitMult(c, 'loot')), 'traits'],
    ['Breakthrough bonus', add(traitVal(c, 'breakthrough') + (M.bt || 0) + bondBonus(c, 'breakthrough') - 1), 'traits, method & partner'],
    ['Stress build-up', pct(traitMult(c, 'stressMult')), 'traits'],
    ['Combat power', `×${pPow.toFixed(2)}`, `realm ×${REALMS[c.qi.realm].power} · traits ${pct(traitMult(c, 'power'))}`],
  ];
  return [h('h2', { class: 'display' }, 'Status'),
    h('div', { class: 'status-top' },
      h('div', { class: 'status-figure' }, h('div', { class: 'figure-frame' }, cv), h('div', { class: 'muted small', style: { textAlign: 'center' } }, `${realmName(c)}`)),
      h('div', { style: { flex: 1, minWidth: '260px' } },
        h('h2', { class: 'display', style: { fontSize: '2rem' } }, fullName(c)),
        c.ownSect ? h('div', { class: 'clan' }, `👑 ${c.gender === 'F' ? 'Matriarch' : 'Patriarch'} of the ${c.ownSect.clan} Clan`) : null,
        h('table', { class: 'kv' },
          row('Age', `${c.age} · ${lifeStage(c.age)} · ~${lifespan(c)}y lifespan`), row('Gender', c.gender === 'F' ? 'Female' : 'Male'),
          row('Height', fmtHeight(heightNow(c))), row('Build', `${muscleLabel(c.body.muscle)} (muscle ${c.body.muscle})`),
          row('Home', `${c.city}, ${cty.name}`), row('Born into', WEALTH.find(w => w.id === c.wealth).name), row('Wealth', `${wealthLabel(c)} · net worth ${fmtMoney(c, netWorth(c))}`),
          row('Generation', `${c.generation} · Life #${META.lives}`), row('Sect', sectName(c) || '—'), row('Job', c.job ? c.job.id.replace(/_/g, ' ') : '—'),
          row('Cultivation', c.qi.known ? `${realmName(c)} · ${ELEMENTS.find(e => e.id === c.qi.elem)?.name} affinity ${c.qi.affinity} · ${c.qi.meridians}/12 meridians · ${M.name}` : 'Unknown'),
          row('Qi', c.qi.known ? `${c.qi.qi}/${qiCap(c)}` : '—')))),
    h('div', { class: 'grid3', style: { marginTop: '14px' } },
      h('div', { class: 'box' }, h('h3', {}, 'Core'), h('table', { class: 'kv' },
        row('Health', c.stats.health), row(`Happiness ${moodFace(c.stats.happiness)}`, c.stats.happiness), row('Stress', c.stats.stress))),
      h('div', { class: 'box' }, h('h3', {}, `Stats (cap ${statCap(c)}, soft ${softCap(c)})`), h('table', { class: 'kv' },
        CAPPED.map(k => row(k === 'battle' ? 'Battle Knowledge' : k[0].toUpperCase() + k.slice(1), `${c.stats[k] ?? 0}`, (c.stats[k] ?? 0) >= softCap(c) ? 'legend' : '')))),
      h('div', { class: 'box' }, h('h3', {}, 'Combat'), h('table', { class: 'kv' },
        row('Max HP', maxHp), row('Damage', pct((1 + gs.dmg) * (1 + bk / 250))), row('Hit chance', add((c.stats.agility + gs.agi - 50) / 400 + bk / 400)),
        row('Crit chance', `${(8 + (c.stats.luck + gs.luck) / 10 + bk / 20).toFixed(1)}%`), row('Power', `×${pPow.toFixed(2)}`),
        row('Injuries taken', pct(bleedMult(c))), row('Record', `${c.wins} wins · ${c.gatesCleared} Gates`)))),
    h('div', { class: 'box', style: { marginTop: '14px' } }, h('h3', {}, 'All bonuses'), h('table', { class: 'kv' }, bonuses.map(([k, v, why]) => h('tr', {}, h('td', {}, k), h('td', { class: v.startsWith('-') ? 'bad' : v === '+0%' || v === '0%' ? '' : 'good' }, v), h('td', { class: 'muted small' }, why))))),
    h('div', { class: 'grid3', style: { marginTop: '14px' } },
      h('div', { class: 'box' }, h('h3', {}, 'Equipment'), Object.entries(SLOTS).map(([s, label]) => h('div', { class: 'row small', style: { margin: '4px 0' } }, h('span', { class: 'muted', style: { width: '64px' } }, label), c.gear?.[s] ? [icon(ITEMS[c.gear[s]].icon, 'sm'), ITEMS[c.gear[s]].name] : '—'))),
      h('div', { class: 'box' }, h('h3', {}, 'Bonds'), bondList(c).length ? bondList(c).map(b => h('div', { class: 'small', style: { margin: '4px 0' } }, h('b', {}, `${b.label}: ${b.who.first}`), h('div', { class: 'muted' }, b.perks.join(' · ')))) : h('span', { class: 'muted' }, 'No best friend or partner yet.')),
      h('div', { class: 'box' }, h('h3', {}, 'Conditions'), (c.conditions || []).length ? c.conditions.map(x => h('div', { class: 'small bad', style: { margin: '3px 0' } }, `${COND_BY_ID[x.id].name}${x.sev > 1 ? ` (severity ${x.sev})` : ''}`)) : h('span', { class: 'good' }, 'Healthy'))),
    h('div', { class: 'box', style: { marginTop: '14px' } }, h('h3', {}, 'Traits'), c.traits.map(id => traitChip(id))),
    bodySection(c),
  ];
}
