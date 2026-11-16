import { heirloomsOf } from '../systems/heirlooms.js';
import { HEIRLOOMS, HEIRLOOM_TIERS } from '../data/heirlooms.js';
import { gearSprite } from './gearSprites.js';
import * as RN from '../systems/renown.js';
// Inventory, Crafting & Gear, and Health tabs.
import { G } from '../core/state.js';
import { h, icon } from './dom.js';
import { fx } from './fx.js';
import { choice, toast } from './modal.js';
import { render, runActivity, logLine } from './render.js';
import { ITEMS, RECIPES, SLOTS } from '../data/items.js';
import { MANUALS } from '../data/realms.js';
import { COND_BY_ID } from '../data/conditions.js';
import { known, hasInputs, craftChance, craft, experiment, gearStats, equip, unequip, useItem, itemName, craftLvl, craftRank, craftQuality, CRAFT_MAX, qStats, gearQ } from '../systems/crafting.js';
import { treatOptions, treat, moodFace } from '../systems/health.js';
import { country, fmtMoney, money, addItem, priceFor, discount, QUALITY, tiered, qCounts } from '../systems/life.js';
import { PARTS, INJURIES, CAPACITIES, PROSTHETICS } from '../data/body.js';
import { bodyDiagram } from './bodyDiagram.js';
import { META } from '../core/state.js';
import { ensureBody, partEff, maxHp, isMissing, allCaps, qiHealInfo, qiHeal, prostheticOptions, fitProsthetic } from '../systems/body.js';

const pct = p => Math.round(p * 100) + '%';
const statLine = st => Object.entries(st || {}).map(([k, v]) => k === 'dmg' || k === 'qi' ? `${v > 0 ? '+' : ''}${Math.round(v * 100)}% ${k === 'dmg' ? 'damage' : 'Qi'}` : `${v > 0 ? '+' : ''}${v} ${k === 'hp' ? 'HP' : k[0].toUpperCase() + k.slice(1)}`).join(', ');
const TYPE_ORDER = [['relic', 'Rare Relics'], ['gear', 'Gear'], ['consumable', 'Consumables & medicine'], ['material', 'Materials']];

// ---------- INVENTORY: everything you own in one place
export function inventoryTab() {
  const c = G.char; c.gear ||= {};
  const items = Object.entries(c.inv).filter(([, n]) => n > 0);
  const gradeTag = q => h('span', { class: 'grade', style: { background: QUALITY[q].color } }, QUALITY[q].short);
  const card = (id, n, q) => { const it = ITEMS[id] || { name: id, icon: 'chest', desc: '' }; const m = q ? QUALITY[q].mult : 1;
    return h('div', { class: 'card item' + (q ? ' q-' + q : '') }, h('div', { class: 'row' }, it.type === 'gear' ? gearSprite(id, 40) : icon(it.icon, 'lg'), h('div', { style: { flex: 1 } }, q ? gradeTag(q) : null, h('b', {}, it.name), h('span', { class: 'qty' }, `×${n}`), h('div', { class: 'muted small' }, it.type === 'gear' ? statLine(qStats(it.stats, q)) : it.desc || statLine(it.stats)), q && it.type !== 'gear' && q !== 'mid' ? h('div', { class: 'small', style: { color: QUALITY[q].color } }, `${q === 'hi' ? '+20%' : '-20%'} effect`) : null)),
      h('div', { class: 'row', style: { marginTop: '6px' } },
        it.type === 'gear' ? h('button', { class: 'btn', onclick: () => { equip(c, id, q); fx('action'); render(); } }, `Equip (${SLOTS[it.slot]})`) : null,
        ['heal', 'marrow', 'incense', 'ink', 'recipe'].includes(it.use) ? h('button', { class: 'btn', onclick: () => { const t = useItem(c, id); if (t) { logLine(t, 'good'); fx('action'); } render(); } }, 'Use') : null,
        it.type === 'relic' ? [h('button', { class: 'btn', disabled: (c.relics || []).length >= 3, onclick: () => { const t = RN.enshrine(c, id); if (t) { logLine(t, 'qi'); fx('milestone'); } render(); } }, `Enshrine (${(c.relics || []).length}/3)`), h('button', { class: 'btn ghost', onclick: () => { const t = RN.sellRelic(c, id); if (t) { logLine(t, 'good'); fx('coin'); } render(); } }, 'Sell to a collector')] : null,
        it.use === 'qi' ? h('span', { class: 'muted small' }, 'Use from the Cultivation tab') : null,
        it.use === 'med' ? h('span', { class: 'muted small' }, 'Use from the Health tab') : null,
        it.use === 'devour' ? h('span', { class: 'muted small' }, 'Devour from Cultivation, or craft with it') : null,
        it.sell ? h('button', { class: 'btn ghost', onclick: () => { addItem(c, id, -1, q); const g = Math.round(it.sell * m * country(c).econ); money(c, g); fx('coin'); logLine(`Sold a ${it.name} for ${fmtMoney(c, g)}.`); render(); } }, `Sell ${fmtMoney(c, it.sell * m * country(c).econ)}`) : null)); };
  const gs = gearStats(c);
  return [h('h2', { class: 'display' }, 'Inventory'),
    h('div', { class: 'grid3', style: { marginTop: '10px' } },
      h('div', { class: 'box' }, h('h3', {}, 'Wallet'), h('table', { class: 'kv' }, [['Cash', fmtMoney(c, c.money)], ['Investments', fmtMoney(c, c.stocks)], ['Net worth', fmtMoney(c, c.money + c.stocks + c.assets.reduce((s, a) => s + a.value, 0))]].map(([a, b]) => h('tr', {}, h('td', {}, a), h('td', {}, b))))),
      h('div', { class: 'box' }, h('h3', {}, 'Equipped'), Object.entries(SLOTS).map(([slot, label]) => { const id = c.gear[slot];
        return h('div', { class: 'row', style: { margin: '4px 0' } }, h('span', { class: 'muted', style: { width: '70px' } }, label), id ? [gearSprite(id, 22), gradeTag(gearQ(c, slot)), h('b', {}, ITEMS[id].name), h('button', { class: 'btn ghost mini', onclick: () => { unequip(c, slot); render(); } }, 'Remove')] : h('span', { class: 'muted' }, '—')); }),
        h('div', { class: 'muted small', style: { marginTop: '6px' } }, statLine(gs) ? 'In combat: ' + statLine(Object.fromEntries(Object.entries(gs).filter(([, v]) => v))) : 'No gear bonuses.'))),
    ...TYPE_ORDER.map(([type, label]) => { const list = items.filter(([id]) => (ITEMS[id]?.type || 'material') === type); if (!list.length) return null;
      return [h('h3', { class: 'display', style: { margin: '18px 0 8px' } }, label), h('div', { class: 'grid2' }, list.flatMap(([id, n]) => tiered(id) ? Object.entries(qCounts(c, id)).filter(([, k]) => k > 0).reverse().map(([q, k]) => card(id, k, q)) : [card(id, n)]))]; }),
    (c.relics || []).length ? h('div', { class: 'box', style: { marginTop: '12px' } }, h('h3', {}, 'Enshrined relics'), h('div', { class: 'small' }, c.relics.map(id => RN.RELICS[id]?.name).join(' · ')), h('div', { class: 'muted small' }, `Meditation Qi ×${RN.relicQi(c).toFixed(2)}`)) : null,
    !items.length ? h('p', { class: 'muted' }, 'Your bag is empty. Gather materials, clear Gates, or buy from the Market.') : null,
    h('h3', { class: 'display', style: { margin: '18px 0 8px' } }, 'Property, vehicles & pets'),
    c.assets.length ? h('div', { class: 'grid2' }, c.assets.map(a => h('div', { class: 'card row' }, icon(a.type === 'pet' ? 'pet' : a.type), h('div', {}, h('b', {}, a.name), h('div', { class: 'muted small' }, a.type === 'pet' ? 'Pet' : fmtMoney(c, a.value) + (a.tenant ? ' · rented out' : '')))))) : h('p', { class: 'muted' }, 'Nothing yet — see Assets & Market.'),
    h('h3', { class: 'display', style: { margin: '18px 0 8px' } }, 'Manuals, recipes & heirlooms'),
    h('div', { class: 'grid2' },
      h('div', { class: 'card' }, h('h4', {}, 'Manuals'), c.qi.manuals.length ? c.qi.manuals.map(m => h('div', {}, icon('manual', 'sm'), ' ', MANUALS.find(x => x.id === m)?.name)) : h('span', { class: 'muted' }, 'None')),
      h('div', { class: 'card' }, h('h4', {}, `Recipes (${known(c).length}/${RECIPES.length})`), known(c).map(r => h('div', { class: 'small' }, '📜 ', itemName(RECIPES.find(x => x.id === r).out)))),
      h('div', { class: 'card' }, h('h4', {}, 'Heirlooms'), heirloomsOf(c).length ? heirloomsOf(c).map(x => h('div', { title: HEIRLOOMS[x.id].desc }, '🏺 ', h('b', { style: { color: HEIRLOOM_TIERS[HEIRLOOMS[x.id].tier].color } }, HEIRLOOMS[x.id].name), h('span', { class: 'muted small' }, ' · ' + HEIRLOOMS[x.id].desc))) : h('span', { class: 'muted' }, 'None'))),
  ];
}

// ---------- CRAFTING & EXPERIMENTATION
let pickedMats = [];
export function craftingTab() {
  const c = G.char; const kn = known(c);
  const recipeCard = r => { const ok = hasInputs(c, r); const out = ITEMS[r.out];
    return h('div', { class: 'card' }, h('div', { class: 'row' }, icon(out.icon, 'lg'), h('div', { style: { flex: 1 } }, h('b', {}, out.name, r.n > 1 ? ` ×${r.n}` : ''), h('div', { class: 'muted small' }, out.desc))),
      h('div', { class: 'small', style: { margin: '6px 0' } }, Object.entries(r.inputs).map(([id, n]) => h('span', { class: 'ing ' + ((c.inv[id] || 0) >= n ? 'have' : 'need') }, `${n}× ${itemName(id)} (${c.inv[id] || 0})`))),
      h('div', { class: 'row' }, h('span', { class: 'muted small' }, `Success ${pct(craftChance(c, r))}`),
        h('button', { class: 'btn', style: { marginLeft: 'auto' }, disabled: !ok || c.actions <= 0 || !c.alive, onclick: () => runActivity({ id: 'craft', cat: 'craft', run: cc => craft(cc, r) }) }, 'Craft (⚡1)'))); };
  const owned = Object.entries(c.inv).filter(([, n]) => n > 0);
  const counts = {}; pickedMats.forEach(id => counts[id] = (counts[id] || 0) + 1);
  pickedMats = pickedMats.filter(id => (c.inv[id] || 0) >= counts[id]);
  return [h('h2', { class: 'display' }, 'Crafting & Gear'),
    h('p', { class: 'muted' }, 'Craft pills, Qi medicine, weapons, armour and charms. Each craft costs 1 Action. Success depends on Craftsmanship, Smarts, crafting traits and your best friend — and nothing is ever certain. Experiment by throwing ingredients together to discover hidden recipes.'),
    h('div', { class: 'box', style: { marginTop: '10px' } }, h('h3', {}, icon('hammer', 'sm'), ` Craftsmanship ${craftLvl(c)} / 100 · ${craftRank(c)}`),
      h('div', { class: 'bar' }, h('i', { style: { width: (c.craftsman || 0) + '%', '--c': '#ffb02e' } })),
      h('div', { class: 'muted small', style: { marginTop: '6px' } }, `Grows every time you craft (a little even when you fail). Raises success chances (max ${Math.round(CRAFT_MAX * 100)}%) and the grade of what you make.`),
      h('div', { class: 'small', style: { marginTop: '4px' } }, 'Gear and pills you craft come out: ', ...['hi', 'mid', 'lo'].map(q => h('span', { class: 'grade', style: { background: QUALITY[q].color } }, `${QUALITY[q].short} ${Math.round(craftQuality(c)[q] * 100)}%`)))),
    h('div', { class: 'box', style: { marginTop: '10px' } }, h('h3', {}, '⚗️ Experiment'),
      h('div', { class: 'muted small' }, 'Pick 2–4 ingredients. A match teaches you the recipe; a miss costs one ingredient but may give a hint.'),
      h('div', { class: 'row', style: { margin: '8px 0' } }, owned.length ? owned.map(([id, n]) => h('button', { class: 'btn ghost mini', disabled: pickedMats.length >= 4 || (counts[id] || 0) >= n, onclick: () => { pickedMats.push(id); render(); } }, icon(ITEMS[id]?.icon || 'chest', 'sm'), ` ${itemName(id)} (${n - (counts[id] || 0)})`)) : h('span', { class: 'muted' }, 'You have no ingredients.')),
      h('div', { class: 'row' }, h('b', {}, 'Cauldron: '), pickedMats.length ? pickedMats.map((id, i) => h('span', { class: 'chip', style: { cursor: 'pointer' }, title: 'Remove', onclick: () => { pickedMats.splice(i, 1); render(); } }, itemName(id), ' ✕')) : h('span', { class: 'muted' }, 'empty'),
        h('button', { class: 'btn', style: { marginLeft: 'auto' }, disabled: pickedMats.length < 2 || c.actions <= 0 || !c.alive, onclick: () => { const picks = [...pickedMats]; pickedMats = []; runActivity({ id: 'experiment', cat: 'craft', run: cc => experiment(cc, picks) }); } }, 'Combine (⚡1)'))),
    h('h3', { class: 'display', style: { margin: '18px 0 8px' } }, `Known recipes (${kn.length}/${RECIPES.length})`),
    h('div', { class: 'grid2' }, RECIPES.filter(r => kn.includes(r.id)).map(recipeCard)),
    h('p', { class: 'muted small' }, `${RECIPES.length - kn.length} recipes still hidden. Experiment, or "Study alchemy texts" in Mind & Body.`),
    h('h3', { class: 'display', style: { margin: '18px 0 8px' } }, 'Buy materials', discount(c) ? h('span', { class: 'muted small' }, `  ${Math.round(discount(c) * 100)}% charisma discount`) : null),
    h('div', { class: 'grid2' }, ['cloth', 'iron_ore', 'spirit_herb', 'spirit_stone', 'ginseng'].map(id => { const it = ITEMS[id], p = priceFor(c, it.price * country(c).econ);
      return h('div', { class: 'card row' }, icon(it.icon), h('div', { style: { flex: 1 } }, h('b', {}, it.name), h('div', { class: 'muted small' }, fmtMoney(c, p))),
        h('button', { class: 'btn', disabled: c.money < p || !c.alive, onclick: () => { money(c, -p); addItem(c, id); fx('coin'); render(); } }, 'Buy')); })),
  ];
}

// ---------- HEALTH: happiness, conditions, treatment
export function healthTab() {
  const c = G.char; const conds = c.conditions || [];
  const kindLabel = { body: '🩺 Body', mind: '🧠 Mind', qi: '🌀 Qi' };
  return [h('h2', { class: 'display' }, 'Health'),
    h('div', { class: 'grid3', style: { marginTop: '10px' } },
      h('div', { class: 'box' }, h('h3', {}, `Happiness ${moodFace(c.stats.happiness)}`), h('div', { class: 'muted small' }, `${c.stats.happiness}/100. Happiness rises with fun, friends and a partner, and falls with stress, pain and loss. It changes how well your actions go (×${(0.85 + c.stats.happiness / 500).toFixed(2)}). Very low happiness for a long time can lead to depression.`)),
      h('div', { class: 'box' }, h('h3', {}, 'Body'), h('div', { class: 'muted small' }, `Health ${c.stats.health}/100 · Stress ${c.stats.stress}/100`)),
      h('div', { class: 'box' }, h('h3', {}, 'Qi medicine'), h('div', { class: 'muted small' }, c.qi.realm >= 1 ? 'You can try to heal yourself with Qi. It costs half your Qi capacity and can backfire into Qi Deviation.' : 'Start cultivating (Qi Refining) to heal with Qi. Qi medicines (Mending Salve, Heart-Calming Pill, Purification Pill) can be crafted by anyone.'))),
    bodySection(c),
    h('h3', { class: 'display', style: { margin: '18px 0 8px' } }, 'Conditions'),
    conds.length ? h('div', { class: 'grid2' }, conds.map(x => { const C = COND_BY_ID[x.id];
      return h('div', { class: 'card' }, h('h4', {}, C.name, ' ', h('span', { class: 'muted small' }, kindLabel[C.kind])), h('div', { class: 'muted small' }, `${C.desc} ${C.dur ? `(${C.dur - x.years} year(s) left)` : '(chronic)'}${x.sev > 1 ? ` · severity ${x.sev}` : ''}`),
        h('div', { class: 'opts', style: { marginTop: '8px' } }, treatOptions(c, x).map(o => h('button', { class: 'btn ghost', disabled: c.actions <= 0 || (o.cost && c.age >= 18 && c.money < o.cost) || (o.qi && c.qi.qi < o.qi),
          onclick: () => runActivity({ id: 'treat_' + o.id.split(':')[0], cat: 'mind', run: cc => treat(cc, x.id, o.id) }) },
          `${o.label} · ${pct(o.chance)} · ${o.qi ? o.qi + ' Qi' : o.cost && c.age >= 18 ? fmtMoney(c, o.cost) : 'free'} (⚡1)`)))); }))
      : h('p', { class: 'good' }, 'No conditions. You are healthy.'),
    h('h3', { class: 'display', style: { margin: '18px 0 8px' } }, 'Genetics'),
    h('div', { class: 'box' }, c.flags.dnaTested ? h('div', {}, (c.genes.carriers || []).length ? ['Your genetic test found: ', (c.genes.carriers || []).map(id => h('span', { class: 'chip', style: { '--tc': 'var(--bad)' } }, COND_BY_ID[id]?.name)), h('div', { class: 'muted small' }, 'Carried conditions may appear later in life and can be passed to your children.')] : 'Your genetic test came back clean.')
      : h('div', { class: 'row' }, h('span', { class: 'muted' }, 'Some conditions hide in your genes and only show up years later.'), h('button', { class: 'btn', disabled: c.age >= 18 && c.money < Math.round(800 * country(c).econ), onclick: () => { if (c.age >= 18) money(c, -Math.round(800 * country(c).econ)); c.flags.dnaTested = true; logLine('I took a genetic test.'); render(); } }, `Genetic test (${fmtMoney(c, 800 * country(c).econ)})`))),
    h('p', { class: 'muted small', style: { marginTop: '14px' } }, 'If you are struggling in real life, talking to someone you trust or a professional can help too.'),
  ];
}

// ---------- body parts & organs
export function bodySection(c) {
  ensureBody(c); const caps = allCaps(c); const qh = qiHealInfo(c);
  const groups = [['Head', 'head'], ['Torso & organs', 'torso'], ['Arms', 'arms'], ['Legs', 'legs']];
  const partRow = p => { const s = c.body.parts[p.id], miss = isMissing(c, p.id), e = partEff(c, p.id), mx = maxHp(c, p.id);
    const prOpts = miss && s.missing ? prostheticOptions(c, p.id) : [];
    return h('div', { class: 'part-row' + (miss ? ' missing' : '') },
      h('div', { class: 'row' }, h('b', { class: p.qiCore ? 'qi' : '' }, p.name), p.vital ? h('span', { class: 'muted small' }, ' vital') : null,
        h('span', { class: 'small', style: { marginLeft: 'auto' } }, miss ? (s.prosthetic ? `🦾 ${PROSTHETICS[s.prosthetic].name}` : s.missing ? (s.permanent ? 'Lost (permanent)' : `Lost — regrowable for ${Math.max(0, 2 - (c.age - s.lostAt))}y`) : 'Lost') : `${s.hp}/${mx}`)),
      miss ? null : h('div', { class: 'bar' }, h('i', { style: { width: e * 100 + '%', '--c': e > 0.66 ? 'var(--good)' : e > 0.33 ? '#ffb02e' : 'var(--bad)' } })),
      s.inj.length ? h('div', { class: 'small bad' }, s.inj.map(i => INJURIES[i.type].name + (i.sev > 1 ? ' (severe)' : '')).join(', ')) : null,
      prOpts.length && !s.prosthetic ? h('div', { class: 'row', style: { marginTop: '4px' } }, prOpts.map(o => { const price = priceFor(c, o.price * country(c).econ);
        return h('button', { class: 'btn ghost mini', disabled: c.money < price || c.actions <= 0, onclick: () => runActivity({ id: 'prosthetic', cat: 'mind', run: cc => fitProsthetic(cc, p.id, o.id, price) }) }, `${o.name} ${fmtMoney(c, price)}`); })) : null); };
  return h('div', {},
    h('div', { class: 'row', style: { margin: '18px 0 8px' } }, h('h3', { class: 'display' }, 'Body'),
      h('div', { class: 'seg mini-seg', style: { marginLeft: 'auto', width: '220px' } }, [['diagram', '🧍 Diagram'], ['list', '☰ List']].map(([v, l]) => h('button', { class: (META.settings.bodyView || 'diagram') === v ? 'on' : '', onclick: () => { META.settings.bodyView = v; render(); } }, l)))),
    h('div', { class: 'box' }, h('div', { class: 'caps' }, Object.entries(CAPACITIES).map(([k, name]) => h('div', { class: 'cap' }, h('span', {}, name), h('b', { class: caps[k] < 0.5 ? 'bad' : caps[k] < 0.9 ? '' : 'good' }, Math.round(caps[k] * 100) + '%')))),
      c.qi.realm >= 1 ? h('div', { class: 'row', style: { marginTop: '10px' } },
        h('button', { class: 'btn', disabled: c.actions <= 0 || c.qi.qi < qh.cost, onclick: () => runActivity({ id: 'qi_body_heal', cat: 'cultivation', run: cc => qiHeal(cc) }) }, `🌀 Qi-heal my body (${qh.cost} Qi, ⚡1)`),
        h('span', { class: 'muted small' }, `${qh.weak ? '⚠ Your Qi is weak — ' + Math.round(qh.scarChance * 100) + '% chance each wound scars.' : 'Strong Qi: wounds close cleanly.'}${qh.regrow.length ? ` Can try to regrow: ${qh.regrow.map(p => p.name.toLowerCase()).join(', ')}${c.qi.realm < 3 ? ' (needs Foundation Establishment)' : ''}.` : ''}`))
        : h('div', { class: 'muted small', style: { marginTop: '8px' } }, 'Cultivators can mend wounds and even regrow lost limbs (within 2 years) with Qi. Without it, deep wounds may scar.')),
    (META.settings.bodyView || 'diagram') === 'diagram' ? h('div', { style: { marginTop: '10px' } }, bodyDiagram(c, render), h('div', { class: 'muted small', style: { marginTop: '6px' } }, 'Tip: click a body part or organ dot to focus it. Prosthetics and regrowth are in List view.'))
      : h('div', { class: 'grid2', style: { marginTop: '10px' } }, groups.map(([label, g]) => h('div', { class: 'card' }, h('h4', {}, label), PARTS.filter(p => p.group === g).map(partRow)))));
}
