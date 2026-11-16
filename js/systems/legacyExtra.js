// v0.8.6 Effects of the newer Legacy tree nodes and the one-time next-life blessings.
import { META, save } from '../core/state.js';
import { ui } from '../core/bus.js';
import { pick, clamp, chance } from '../core/rng.js';
import { perk, OMENS, OMEN_CHANCE, refundBlessings } from '../data/legacyTree.js';
import { addItem, money, country, fmtMoney } from './life.js';
import { gainHeirloom } from './heirlooms.js';
import { TEMPERS, gainTemper } from '../data/temper.js';

export function legacyBirth(c) {
  const econ = country(c).econ || 1;
  if (perk('f6')) c.assets.push({ type: 'car', name: 'Old family car', value: Math.round(2500 * econ) });
  if (perk('c7')) c.qi.meridians = Math.max(c.qi.meridians || 0, 1);
  if (perk('b7')) c.flags.severedLore ||= 'heritage';
  if (perk('m6')) c.craftsman = 10 * perk('m6');
  if (perk('d5')) c.stats.luck = clamp((c.stats.luck || 50) + 5);
  if (perk('m7') && !(c.temper || []).some(id => TEMPERS.find(t => t.id === id)?.good)) for (let i = 0; i < 20; i++) if (gainTemper(c, pick(TEMPERS.filter(t => t.good)).id)) break;
  // v0.9.11 birth omens: 5% blessing, 5% curse (independent), never bought
  const back = refundBlessings(); if (back) ui.log(`(The old next-life blessings are gone: ${back} Legacy points refunded.)`, 'muted');
  c.omens = [];
  const roll = kind => { const ids = Object.keys(OMENS).filter(id => OMENS[id].kind === kind); return pick(ids); };
  if (chance(OMEN_CHANCE)) c.omens.push(roll('blessing'));
  if (chance(OMEN_CHANCE)) c.omens.push(roll('curse'));
  for (const id of c.omens) { const O = OMENS[id]; (META.omensFound ||= {})[id] = true; // discovered for the codex
    for (const [k, v] of Object.entries(O.stat || {})) c.stats[k] = clamp((c.stats[k] || 0) + v);
    if (id === 'nl_storm') c.flags.stormBorn = true;
    if (id === 'nl_spoon') { if (['destitute', 'poor'].includes(c.wealth)) c.wealth = 'middle'; c.money += Math.round(3000 * econ); }
    if (id === 'nl_heirloom') gainHeirloom(c, 'an ancestor', 'rare');
    if (id === 'nl_awaken') { c.qi.known = true; c.qi.affinity = clamp(c.qi.affinity + 20); }
    if (id === 'nl_virtue') for (let i = 0; i < 20; i++) if (gainTemper(c, pick(TEMPERS.filter(t => t.good)).id)) break;
    if (id === 'nl_kit') { addItem(c, 'heal_pill', 3, 'hi'); addItem(c, 'qi_pill', 2, 'hi'); }
    if (id === 'cu_fallen') { const W = ['destitute', 'poor', 'working', 'middle', 'wealthy', 'rich', 'royal'], i = W.indexOf(c.wealth); if (i > 0) c.wealth = W[i - 1]; c.money = Math.round(c.money / 2); }
    ui.log(O.kind === 'blessing' ? `A blessing at my birth: ${O.name}. ${O.desc}` : `A curse at my birth: ${O.name}. ${O.desc}`, O.kind === 'blessing' ? 'big' : 'bad');
  }
  if (c.omens.length) save();
}
export function legacyYear(c) {
  if (perk('f7') && c.age === 18 && !c.flags.trustFund) { c.flags.trustFund = true; const m = Math.round(8000 * perk('f7') * (country(c).econ || 1)); money(c, m); ui.log(`My trust fund matured: ${fmtMoney(c, m)}.`, 'good'); }
}
