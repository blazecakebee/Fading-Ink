// v0.8.6 Effects of the newer Legacy tree nodes and the one-time next-life blessings.
import { META, save } from '../core/state.js';
import { ui } from '../core/bus.js';
import { pick, clamp } from '../core/rng.js';
import { perk, BLESSING } from '../data/legacyTree.js';
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
  // one-time blessings
  const used = [];
  for (const id of META.nextLife || []) { const B = BLESSING[id]; if (!B) continue; used.push(B.name);
    if (id === 'nl_storm') c.flags.stormBorn = true;
    if (id === 'nl_prodigy') { c.stats.smarts = clamp(c.stats.smarts + 12); c.stats.charisma = clamp(c.stats.charisma + 5); }
    if (id === 'nl_spoon') { if (['destitute', 'poor'].includes(c.wealth)) c.wealth = 'middle'; c.money += Math.round(3000 * econ); }
    if (id === 'nl_heirloom') gainHeirloom(c, 'an ancestor', 'rare');
    if (id === 'nl_awaken') { c.qi.known = true; c.qi.affinity = clamp(c.qi.affinity + 20); }
    if (id === 'nl_virtue') for (let i = 0; i < 20; i++) if (gainTemper(c, pick(TEMPERS.filter(t => t.good)).id)) break;
    if (id === 'nl_kit') { addItem(c, 'heal_pill', 3, 'hi'); addItem(c, 'qi_pill', 2, 'hi'); }
    if (id === 'nl_body') { c.stats.strength += 8; c.stats.agility += 8; c.stats.health = clamp(c.stats.health + 10); }
  }
  if (used.length) { ui.log(`Blessed before birth: ${used.join(', ')}.`, 'good'); META.nextLife = []; save(); }
}
export function legacyYear(c) {
  if (perk('f7') && c.age === 18 && !c.flags.trustFund) { c.flags.trustFund = true; const m = Math.round(8000 * perk('f7') * (country(c).econ || 1)); money(c, m); ui.log(`My trust fund matured: ${fmtMoney(c, m)}.`, 'good'); }
}
