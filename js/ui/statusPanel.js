// Status tab: full character sheet — full-body sprite, stats with caps, combat numbers, every bonus, conditions, traits.
import { G, META } from '../core/state.js';
import { h, icon } from './dom.js';
import { drawFullBody } from './portrait.js';
import { traitChip, temperChip, render } from './render.js';
import { TEMPER } from '../data/temper.js';
import { SEXUALITIES as SEX } from '../systems/selfhood.js';
import { qiOf, formName } from '../systems/qitype.js';
import { qiBadge } from './qiBadge.js';
import { REALMS, ELEMENTS } from '../data/realms.js';
import { ITEMS, SLOTS } from '../data/items.js';
import { COND_BY_ID, condTip } from '../data/conditions.js';
import { WEALTH } from '../data/countries.js';
import { traitMult, traitVal } from '../systems/traits.js';
import { bondBonus, bondList } from '../systems/people.js';
import { gearStats } from '../systems/crafting.js';
import { condQiMult, moodMult, moodFace, bleedMult } from '../systems/health.js';
import { realmName, power, powerBonus, method, qiCap, sectName } from '../systems/cultivation.js';
import { onBodyPath, bodyTier } from '../systems/path.js';
import { PLAYER_HP, GEAR_DMG } from '../systems/combatcore.js';
import { heightNow, fmtHeight, muscleLabel, ensureBody, allCaps } from '../systems/body.js';
import { CAPACITIES } from '../data/body.js';
import { bodySection } from './itemsPanel.js';
import { outfitFor } from '../data/clothing.js';
import { eff } from '../systems/body.js';
import { QUALITY } from '../systems/life.js';
import { country, fullName, lifeStage, lifespan, fmtMoney, netWorth, wealthLabel, statCap, softCap, discount, CAPPED } from '../systems/life.js';

const pct = m => `${m >= 1 ? '+' : ''}${Math.round((m - 1) * 100)}%`;
const add = v => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}%`;
// every row gets an icon, picked from its label
const ROW_ICON = { age: 'clock', gender: 'character', height: 'gym', build: 'fist', home: 'world', 'born into': 'baby', wealth: 'market', generation: 'legacy', sect: 'crown', job: 'career', cultivation: 'meditate', qi: 'cultivation', 'qi type': 'star',
  health: 'health', happiness: 'heart', stress: 'brokenheart', strength: 'fist', 'battle knowledge': 'combat', agility: 'kick', smarts: 'study', charisma: 'people', luck: 'dice', looks: 'salon',
  'max hp': 'health', damage: 'broadsword', 'hit chance': 'eye', 'crit chance': 'star', power: 'lightning', 'injuries taken': 'skull', record: 'trophy',
  'qi gain': 'cultivation', 'training gains': 'gym', 'study gains': 'study', salary: 'career', 'relationship growth': 'heart', 'merchant discount': 'shop', 'crafting success': 'anvil', craftsmanship: 'hammer',
  'pill potency': 'pill', 'gate loot': 'chest', 'breakthrough bonus': 'lightning', 'stress build-up': 'brokenheart', 'combat power': 'combat' };
const iconFor = k => ROW_ICON[String(k).replace(/[^a-z \-]/gi, '').trim().toLowerCase()] || 'star';
const row = (k, v, cls) => h('tr', {}, h('td', {}, h('span', { class: 'kv-key' }, icon(iconFor(k), 'sm'), k)), h('td', { class: cls || '' }, v));

export function statusTab() {
  const c = G.char, cty = country(c), gs = gearStats(c), M = method(c); ensureBody(c);
  const cv = document.createElement('canvas'); cv.className = 'portrait fullbody';
  drawFullBody(cv, c.genes, { age: c.age, gender: c.gender, realm: c.qi.realm, hair: c.face ? { ...(c.hair || {}), ...c.face } : c.hair, outfit: outfitFor(c), gear: c.gear || {}, body: c.body, heightCm: heightNow(c), elemColor: c.qi.realm >= 3 ? ELEMENTS.find(e => e.id === c.qi.elem)?.color : null });
  const pPow = power(c);
  const maxHp = Math.round(((40 + c.stats.health * 0.5 + eff(c, 'strength') * 0.3) * (1 + (pPow - 1) * 0.5) + gs.hp) * PLAYER_HP);
  const bk = Math.min(110, eff(c, 'battle') / statCap(c) * 100), agiP = Math.min(110, eff(c, 'agility') / statCap(c) * 100); // combat reads stats as % of your cap
  const qiTotal = traitMult(c, 'qi') * bondBonus(c, 'qi') * condQiMult(c) * (1 + gs.qi) * (c.ownSect ? 1.1 : 1) * M.qi;
  const bonuses = [
    ['Qi gain', pct(qiTotal), `traits ${pct(traitMult(c, 'qi'))} · bonds ${pct(bondBonus(c, 'qi'))} · method ${pct(M.qi)} · gear ${add(gs.qi)}${c.ownSect ? ' · own sect +10%' : ''}${condQiMult(c) !== 1 ? ` · conditions ${pct(condQiMult(c))}` : ''}`],
    ['Training gains', pct(traitMult(c, 'train') * bondBonus(c, 'train') * moodMult(c)), `traits ${pct(traitMult(c, 'train'))} · bonds ${pct(bondBonus(c, 'train'))} · happiness ${pct(moodMult(c))}`],
    ['Study gains', pct(traitMult(c, 'study') * bondBonus(c, 'study') * moodMult(c)), `traits ${pct(traitMult(c, 'study'))} · bonds ${pct(bondBonus(c, 'study'))} · happiness ${pct(moodMult(c))}`],
    ['Salary', pct(traitMult(c, 'pay') * bondBonus(c, 'work')), `traits ${pct(traitMult(c, 'pay'))} · bonds ${pct(bondBonus(c, 'work'))}`],
    ['Relationship growth', pct(1.3 * traitMult(c, 'social')), 'base +30% · traits ' + pct(traitMult(c, 'social'))],
    ['Merchant discount', `${Math.round(discount(c) * 100)}%`, 'from Charisma'],
    ['Craftsmanship', `${Math.floor(c.craftsman || 0)} / 100`, 'grows with every craft'], ['Crafting success', add((c.craftsman || 0) / 100 * 0.35 + traitVal(c, 'craft') + (c.stats.smarts - 50) / 250 + bondBonus(c, 'craft') - 1), 'Craftsmanship, Smarts, traits & best friend (never above 92%)'],
    ['Pill potency', pct(traitMult(c, 'pill')), 'traits'],
    ['Gate loot', pct(traitMult(c, 'loot')), 'traits'],
    ['Breakthrough bonus', add(traitVal(c, 'breakthrough') + (M.bt || 0) + bondBonus(c, 'breakthrough') - 1), 'traits, method & partner'],
    ['Stress build-up', pct(traitMult(c, 'stressMult')), 'traits'],
    ['Combat power', `×${pPow.toFixed(2)}`, `${onBodyPath(c) ? 'body tier' : 'realm'} ×${onBodyPath(c) ? bodyTier(c).power : REALMS[c.qi.realm].power} · traits ${pct(powerBonus(c))} (max +60%)`],
  ];
  return [h('h2', { class: 'display' }, 'Status'),
    h('div', { class: 'status-top' },
      h('div', { class: 'status-figure' }, h('div', { class: 'figure-frame' }, cv), h('div', { class: 'muted small', style: { textAlign: 'center' } }, `${realmName(c)}`)),
      h('div', { style: { flex: 1, minWidth: '260px' } },
        h('h2', { class: 'display', style: { fontSize: '2rem' } }, fullName(c)),
        c.ownSect ? h('div', { class: 'clan' }, `👑 ${c.gender === 'F' ? 'Matriarch' : 'Patriarch'} of the ${c.ownSect.clan} Clan`) : null,
        h('table', { class: 'kv' },
          row('Age', `${c.age} · ${lifeStage(c.age)} · ~${lifespan(c)}y lifespan`), row('Gender', `${c.gender === 'F' ? 'Female' : 'Male'}${c.birthSex && c.birthSex !== c.gender ? ' (transitioned)' : ''} · ${SEX[c.sexuality] || 'Straight'}`),
          row('Height', fmtHeight(heightNow(c))), row('Build', `${muscleLabel(c.body.muscle)} (muscle ${c.body.muscle})`),
          row('Home', `${c.city}, ${cty.name}`), row('Born into', WEALTH.find(w => w.id === c.wealth).name), row('Wealth', `${wealthLabel(c)} · net worth ${fmtMoney(c, netWorth(c))}`),
          row('Generation', `${c.generation} · Life #${META.lives}`), row('Sect', sectName(c) || '—'), row('Job', c.job ? c.job.id.replace(/_/g, ' ') : '—'),
          row('Cultivation', c.qi.known ? `${realmName(c)} · ${ELEMENTS.find(e => e.id === c.qi.elem)?.name} affinity ${c.qi.affinity} · ${c.qi.meridians}/12 meridians · ${M.name}` : 'Unknown'),
          row('Qi', c.qi.known ? `${c.qi.qi}/${qiCap(c)}` : '—'),
          row('Qi type', (() => { const q = qiOf(c); if (!q) return '—'; return h('span', { class: 'row', style: { gap: '6px' } }, qiBadge(q.primary, 22, q.fused ? q.secondary : null), q.fused ? q.fusedName : formName(q.primary), q.secondary && !q.fused ? ` + ${formName(q.secondary)}` : ''); })())))),
    h('div', { class: 'grid3', style: { marginTop: '14px' } },
      h('div', { class: 'box' }, h('h3', {}, 'Core'), h('table', { class: 'kv' },
        row('Health', c.stats.health), row(`Happiness ${moodFace(c.stats.happiness)}`, c.stats.happiness), row('Stress', c.stats.stress))),
      h('div', { class: 'box' }, h('h3', {}, `Stats (cap ${statCap(c)}, soft ${softCap(c)})`), h('table', { class: 'kv' },
        CAPPED.map(k => row(k === 'battle' ? 'Battle Knowledge' : k[0].toUpperCase() + k.slice(1), eff(c, k) < (c.stats[k] ?? 0) ? `${eff(c, k)} (trained ${c.stats[k]}) — injured` : `${c.stats[k] ?? 0}`, (c.stats[k] ?? 0) >= softCap(c) ? 'legend' : '')))),
      h('div', { class: 'box' }, h('h3', {}, 'Combat'), h('table', { class: 'kv' },
        row('Max HP', maxHp), row('Damage', pct((1 + gs.dmg * GEAR_DMG) * (1 + bk / 250))), row('Hit chance', add((agiP + gs.agi - 50) / 400 + bk / 400)),
        row('Crit chance', `${(8 + (c.stats.luck + gs.luck) / 10 + bk / 20).toFixed(1)}%`), row('Power', `×${pPow.toFixed(2)}`),
        row('Injuries taken', pct(bleedMult(c))), row('Record', `${c.wins} wins · ${c.gatesCleared} Gates`))),
      h('div', { class: 'box' }, h('h3', {}, 'Equipment'), Object.entries(SLOTS).map(([s, label]) => h('div', { class: 'row small', style: { margin: '4px 0' } }, h('span', { class: 'muted', style: { width: '64px' } }, label), c.gear?.[s] ? [icon(ITEMS[c.gear[s]].icon, 'sm'), `${QUALITY[c.gearQ?.[s] || 'mid'].short} · `, ITEMS[c.gear[s]].name] : '—'))),
      h('div', { class: 'box' }, h('h3', {}, 'Bonds'), bondList(c).length ? bondList(c).map(b => h('div', { class: 'small', style: { margin: '4px 0' } }, h('b', {}, `${b.label}: ${b.who.first}`), h('div', { class: 'muted' }, b.perks.join(' · ')))) : h('span', { class: 'muted' }, 'No best friend or partner yet.')),
      h('div', { class: 'box' }, h('h3', {}, 'Conditions'), (c.conditions || []).length ? c.conditions.map(x => h('div', { class: 'small bad', ...condTip(x), style: { margin: '3px 0', cursor: 'help' } }, `${COND_BY_ID[x.id].name}${x.sev > 1 ? ` (severity ${x.sev})` : ''}`)) : h('span', { class: 'good' }, 'Healthy'))),
    h('div', { class: 'box', style: { marginTop: '14px' } }, h('h3', {}, 'All bonuses'), h('table', { class: 'kv' }, bonuses.map(([k, v, why]) => h('tr', {}, h('td', {}, h('span', { class: 'kv-key' }, icon(iconFor(k), 'sm'), k)), h('td', { class: v.startsWith('-') ? 'bad' : v === '+0%' || v === '0%' ? '' : 'good' }, v), h('td', { class: 'muted small' }, why))))),
    h('div', { class: 'box', style: { marginTop: '14px' } }, h('h3', {}, 'Traits'), c.traits.map(id => traitChip(id))),
    h('div', { class: 'box', style: { marginTop: '14px' } }, h('h3', {}, 'Personality'), (c.temper || []).length ? c.temper.map(id => h('div', { class: 'small', style: { margin: '4px 0' } }, temperChip(id), ' ', h('span', { class: 'muted' }, TEMPER[id]?.desc))) : h('span', { class: 'muted' }, 'Still forming.')),
    bodySection(c),
  ];
}
