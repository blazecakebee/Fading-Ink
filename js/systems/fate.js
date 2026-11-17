// v0.9.23 Fate: karma, infamy, the demonic path, the black market, hurting people you know,
// reincarnation, regression and becoming a cursed object.
import { G, META, save } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp, uid } from '../core/rng.js';
import { stat, money, fmtMoney, wage, addItem, country } from './life.js';
import { ITEMS } from '../data/items.js';
import { TRAITS } from '../data/traits.js';
import { METHODS } from '../data/realms.js';
import { effRealm } from './path.js';
import { eff } from './body.js';
import { applyTraitMods } from './traits.js';

// ---------- karma & fame
export const addKarma = (c, n) => { c.karma = clamp((c.karma || 0) + n, -200, 200); };
export const karmaLabel = k => k <= -100 ? 'Damned' : k <= -60 ? 'Evil' : k <= -20 ? 'Tainted' : k < 20 ? 'Balanced' : k < 60 ? 'Good' : 'Virtuous';
export const addInfamy = (c, n) => { c.fame = (c.fame || 0) - Math.round(n); };

// ---------- demonic path
export const DEMONIC_SECTS = [
  { id: 'blood_moon', name: 'Blood Moon Cult', kind: 'sect', align: 'demonic', needDemonic: true, req: {}, desc: 'They worship the red moon and drink from the losers of their duels.' },
  { id: 'nether', name: 'Nether Abyss Sect', kind: 'sect', align: 'demonic', needDemonic: true, req: { smarts: 40 }, desc: 'Scholars of forbidden scripture. Every page costs a little of your soul.' },
  { id: 'hundred_ghosts', name: 'Hundred Ghosts Valley', kind: 'sect', align: 'demonic', needDemonic: true, req: { strength: 40 }, desc: 'A valley where the dead serve the living — for a price.' },
];
export const DEMON_GEAR = {
  blood_cleaver: { name: 'Blood Cleaver', icon: 'saber', type: 'gear', slot: 'weapon', demonic: true, stats: { dmg: 0.95, agi: -2, qi: 0.1 }, desc: 'Demonic gear. +95% damage, -2 Agility, +10% Qi gain.' },
  bone_mail: { name: 'Ossuary Mail', icon: 'chainmail', type: 'gear', slot: 'armor', demonic: true, stats: { hp: 160, agi: 4 }, desc: 'Demonic gear. +160 HP, +4 Agility.' },
  soul_banner: { name: 'Soul Banner', icon: 'lantern', type: 'gear', slot: 'charm', demonic: true, stats: { qi: 0.16, luck: -4 }, desc: 'Demonic gear. +16% Qi gain, -4 Luck.' },
  abyss_ring: { name: 'Abyss Ring', icon: 'ring', type: 'gear', slot: 'ring', demonic: true, stats: { dmg: 0.18, qi: 0.08 }, color: '#7a0a1a', desc: 'Demonic gear. +18% damage, +8% Qi gain.' },
  demon_heart: { name: 'Demon-Heart Pendant', icon: 'amulet', type: 'gear', slot: 'necklace', demonic: true, stats: { hp: 60, dmg: 0.08 }, color: '#b0142c', desc: 'Demonic gear. +60 HP, +8% damage.' },
};
const DEMON_ITEMS = ['demon_saber', 'demon_eye', 'demon_harness', ...Object.keys(DEMON_GEAR)];
export const isDemonic = c => !!c?.demonic;
export function enterDemonic(c, why) {
  if (c.demonic) return; c.demonic = { since: G.world.year, why }; addKarma(c, -30);
  if (c.qi.known) { c.qi.tainted = true; ui.log(`My Qi darkened into ${taintName(c)} — stronger, hungrier, and slow to heal what it breaks.`, 'qi'); }
  c.fame = Math.min(c.fame || 0, 0) - 5000;
  if (c.guild) { c.guild = null; ui.log('The Hunter Guild struck my name from its rolls.', 'bad'); }
  ui.cinematic?.({ motif: 'crack', color: '#b0142c', lines: [why || 'Something in you finally gave way.', 'The world looks redder now. And so much clearer.'], title: 'The Demonic Path', sub: 'There is no going back', sound: 'heavy', hold: 2.4 });
  ui.log(`I have walked onto the demonic path. ${why || ''} The Guild's hunters will come for me — but the shadows have their own markets, sects and power.`, 'big');
}
function demonicYear(c) {
  if (c.demonic) {
    // hunters come for you like a wanted cultivator
    if (c.age >= 16 && !c.prison && chance(0.22)) return { hunt: true };
    if (c.qi.known) c.qi.tainted = true;
    return {};
  }
  let pts = c.demonPts || 0;
  const M = !!METHODS.find(x => x.id === c.qi.method)?.demonic; if (M && c.qi.realm >= 1) pts += 10;
  if (c.fugitive) pts += 20;
  if ((c.qi.manuals || []).includes('blood_art')) pts += 4;
  c.demonPts = pts;
  // demonic gear worn while Qi corruption has gone untreated for 10+ years
  const corr = (c.conditions || []).find(x => x.id === 'corruption'), worn = Object.values(c.gear || {}).some(id => DEMON_ITEMS.includes(id));
  if (corr && corr.years >= 10 && worn) { enterDemonic(c, 'A decade of untreated corruption, fed by demonic steel.'); return {}; }
  if (pts >= 100) enterDemonic(c, M ? 'The forbidden method has rewritten my meridians.' : c.fugitive ? 'Years on the run have made me what they said I was.' : 'Blood on my hands, again and again.');
  return {};
}
export const demonMods = c => c.demonic ? [{ power: 1.08, qi: 1.1, stressMult: 1.05, social: 0.92 }] : [];
export const TAINTED = { fire: 'Hellfire', water: 'Black Tide', wood: 'Thorn-Rot', metal: 'Blood Iron', earth: 'Grave Earth', lightning: 'Crimson Thunder', wind: 'Ghost Wind', ice: 'Corpse Frost', light: 'Fallen Light', dark: 'Abyssal Dark' };
export const taintName = c => TAINTED[c.qi?.elem] || 'Abyssal';
export const taintMods = c => c.qi?.tainted ? [{ qi: 1.15, power: 1.05, healRate: 0.85 }] : [];

// ---------- black market (demonic only): a rotating stock of high-end goods, at a premium
const BM_POOL = ['dragon_scale', 'demonic_core', 'ginseng', 'bloodline_essence', 'ascend_pill', 'dao_pill', 'marrow_pill', 'void_pill', 'unity_pill', 'sever_pill', 'soul_pill', 'core_pill', 'purity_pill', 'trib_talisman', ...Object.keys(DEMON_GEAR), 'void_edge', 'void_mantle', 'storage_ring', 'phoenix_feather'];
const BM_PRICE = { dragon_scale: 6000, demonic_core: 2500, ginseng: 5000, bloodline_essence: 12000, ascend_pill: 90000, dao_pill: 45000, marrow_pill: 9000, void_pill: 30000, unity_pill: 38000, sever_pill: 24000, soul_pill: 18000, core_pill: 9000, purity_pill: 4000, trib_talisman: 15000, blood_cleaver: 70000, bone_mail: 60000, soul_banner: 48000, abyss_ring: 40000, demon_heart: 36000, void_edge: 80000, void_mantle: 70000, storage_ring: 30000, phoenix_feather: 26000 };
export function blackMarket(c) {
  if (c.bm?.year !== G.world.year) { const pool = BM_POOL.filter(id => ITEMS[id]).sort(() => Math.random() - 0.5).slice(0, 7); c.bm = { year: G.world.year, stock: pool.map(id => ({ id, left: ITEMS[id].type === 'gear' ? 1 : ri(1, 3), q: ITEMS[id].type === 'gear' || /_pill$/.test(id) ? (chance(0.35) ? 'hi' : 'mid') : 'mid' })) }; }
  return c.bm.stock;
}
export const bmPrice = (c, it) => Math.round((BM_PRICE[it.id] || 5000) * (it.q === 'hi' ? 1.5 : 1) * (country(c).econ || 1));
export function bmBuy(c, it) { const p = bmPrice(c, it); if (it.left <= 0 || c.money < p) return null; money(c, -p); it.left--; addItem(c, it.id, 1, it.q); addInfamy(c, 50); return `A masked broker slid the ${ITEMS[it.id].name} across the table. (${fmtMoney(c, p)})`; }

// ---------- hurting and killing people you know
const victimFight = p => ({ id: 'thug', mini: 'dodge', kind: 'human', name: `${p.first} ${p.last || ''}`.trim(), realm: p.realm || 0, hp: Math.round(40 + (p.age || 30) * 0.4), str: p.stats?.strength || 40, agi: p.stats?.agility || 40, moves: ['jab', 'punch', 'kick', 'guard', ...(p.realm ? ['qi_palm'] : [])] });
const FAM = ['Father', 'Mother', 'Brother', 'Sister', 'Son', 'Daughter', 'Spouse', 'Partner'];
async function police(c, risk, years, what) { const L = await import('./law.js'); L.addHeat(c, Math.round(risk * 80)); if (chance(L.caughtChance(c, risk))) return L.standoff(c, years, what); return null; }
export const ASSAULT = { id: 'assault', emoji: '👊', name: 'Assault them', icon: 'fist', age: 12, need: (c, p) => !p.coop && p.age >= 6, run: async (c, p) => {
  const ok = await ui.choice({ title: `Hurt ${p.first}?`, icon: 'fist', text: 'Beating someone you know is a crime. They will never forget it, and the police may come.', options: [{ label: 'Do it', value: true }, { label: 'Walk away', value: false, ghost: true }] }); if (!ok) return null;
  const r = await ui.fight(victimFight(p)); addKarma(c, -10); addInfamy(c, 300); p.close = 0; p.role = FAM.includes(p.role) ? p.role : 'Enemy'; p.hostile = !FAM.includes(p.role); p.hurtBy = (p.hurtBy || 0) + 1; stat(c, 'stress', 6);
  const caught = await police(c, 0.35, 1, `I assaulted ${p.first}`); if (caught) return caught;
  return r === 'win' ? { text: `I beat ${p.first} until they stopped getting up. Nobody looks at me the same way.`, cls: 'bad' } : { text: `I attacked ${p.first} — and lost. Humiliating, and still a crime.`, cls: 'bad' }; } };
export const MURDER = { id: 'murder', emoji: '🗡️', name: 'Kill them', icon: 'skull', age: 14, need: (c, p) => !p.coop && p.age >= 1, run: async (c, p) => {
  const how = await ui.choice({ title: `Kill ${p.first}?`, icon: 'skull', text: `This can't be undone. Murder carries the heaviest sentences there are, and it will stain your soul.\nHow?`, options: [{ label: 'Ambush them (fight to the death)', value: 'fight' }, { label: `Poison (${Math.round(clamp(0.25 + eff(c, 'smarts') / 200, 0.1, 0.8) * 100)}%, Smarts)`, value: 'poison' }, { label: 'Never mind', value: null, ghost: true }] });
  if (!how) return null;
  let dead = false;
  if (how === 'fight') { const r = await ui.fight({ ...victimFight(p), hp: Math.round(victimFight(p).hp * 1.2) }, { noFlee: true }); dead = r === 'win'; }
  else dead = chance(clamp(0.25 + eff(c, 'smarts') / 200, 0.1, 0.8));
  if (!c.alive) return { text: `${p.first} fought back. Harder than I ever imagined.`, cls: 'death' };
  addKarma(c, dead ? -40 : -15); c.demonPts = (c.demonPts || 0) + (dead ? 25 : 8); stat(c, 'stress', dead ? 15 : 8);
  if (!dead) { p.close = 0; p.role = FAM.includes(p.role) ? p.role : 'Enemy'; p.hostile = true; addInfamy(c, 800); const caught = await police(c, 0.5, 6, `I tried to kill ${p.first}`); if (caught) return caught; return { text: `I tried to kill ${p.first}. They survived — and they know.`, cls: 'bad' }; }
  p.alive = false; p.cause = 'murdered'; c.kills = (c.kills || 0) + 1; addInfamy(c, 2000); if (c.partnerId === p.id) c.partnerId = null;
  if (FAM.includes(p.role)) { stat(c, 'happiness', -20); addKarma(c, -20); }
  const caught = await police(c, 0.6, 18, `I murdered ${p.first}`); if (caught) return caught;
  return { text: `${p.first} is dead. By my hand. The police have questions, but no answers — yet.`, cls: 'death', big: true }; } };
// what you can still do with someone who hates you (or you've broken things with)
export const HOSTILE_OK = ['talk', 'argue', 'assault', 'murder', 'divorce'];
export const FRACTURED_OK = [...HOSTILE_OK, 'compliment', 'gift', 'ask_money'];
export const relState = p => p.role === 'Enemy' || p.hostile ? 'hostile' : (p.role === 'Ex' || (p.close ?? 50) < 20) ? 'fractured' : 'ok';

// ---------- reincarnation
export const REINC_REALM = 12; // Immortal Ascension
const hasHeir = c => (c.people || []).some(p => (p.role === 'Son' || p.role === 'Daughter') && p.alive);
const heirloomBoost = c => Math.min(0.35, (c.heirlooms || []).reduce((s, x) => s + (x.tier === 'mythic' ? 0.12 : x.tier === 'legendary' ? 0.06 : x.tier === 'rare' ? 0.02 : 0), 0));
export function rollFate(c) { // at death
  c.fate = {};
  if (c.flags?.reincarnated || hasHeir(c)) return;
  const R = c.qi?.realm || 0;
  if (R >= REINC_REALM && chance(0.2 + heirloomBoost(c))) c.fate.reincarnate = true;
  if ((c.karma || 0) <= -60 && R >= 9 && chance(0.18 + heirloomBoost(c))) c.fate.cursed = true;
}
export const REINC_BUFF = { qi: 1.2, power: 1.2, train: 1.2, study: 1.2, social: 1.2, pay: 1.2, loot: 1.2, craft: 1.2, healRate: 1.2 };
const BUFF_CARDS = [
  { name: 'Sword-Soul Echo', desc: '+10% combat power', mods: { power: 1.1 } }, { name: 'Scholar\'s Memory', desc: '+15% study gains', mods: { study: 1.15 } },
  { name: 'Remembered Qi', desc: '+15% Qi gains', mods: { qi: 1.15 } }, { name: 'Iron Body', desc: 'Heal 20% faster, +3 years of life', mods: { healRate: 1.2, life: 3 } },
  { name: 'Old Charm', desc: '+15% closeness, +8% salary', mods: { social: 1.15, pay: 1.08 } }, { name: 'Fortune\'s Favourite', desc: '+15% Gate loot, +10 Luck', mods: { loot: 1.15 }, stat: { luck: 10 } },
  { name: 'Master Artisan', desc: '+20% crafting', mods: { craft: 1.2 } }, { name: 'Tireless', desc: 'Stress builds 15% slower, +8% training', mods: { stressMult: 0.85, train: 1.08 } },
  { name: 'Giant\'s Frame', desc: '+15 Strength, +5% combat power', mods: { power: 1.05 }, stat: { strength: 15 } }, { name: 'Wind Step', desc: '+15 Agility', stat: { agility: 15 } },
  { name: 'Brilliant Mind', desc: '+15 Smarts', stat: { smarts: 15 } }, { name: 'Breakthrough Insight', desc: '+4% breakthrough chance', mods: { breakthrough: 0.04 } },
];
export function reincCards(c) {
  const traits = TRAITS.filter(t => ['rare', 'legendary', 'mythical'].includes(t.tier) && t.birth !== 0 && !c.traits.includes(t.id)).sort(() => Math.random() - 0.5).slice(0, 6).map(t => ({ trait: t.id, name: t.name, desc: t.desc, tier: t.tier }));
  const buffs = BUFF_CARDS.slice().sort(() => Math.random() - 0.5);
  const out = []; while (out.length < 4) out.push(chance(0.45) && traits.length ? traits.shift() : buffs.shift()); return out;
}
export function applyCard(c, card) {
  if (card.trait) { c.traits.push(card.trait); applyTraitMods(c, card.trait); c.lifespan += TRAITS.find(t => t.id === card.trait)?.life || 0; return; }
  for (const [k, v] of Object.entries(card.stat || {})) c.stats[k] = clamp((c.stats[k] || 0) + v);
  if (card.mods) (c.reincCards ||= []).push(card.mods);
}
export function rememberPastLife(old) {
  META.pastLife = { name: `${old.first} ${old.last}`, heirlooms: (old.heirlooms || []).filter(x => typeof x === 'object').map(x => ({ ...x, gens: (x.gens || 0) + 1 })), money: Math.max(0, Math.round((old.money + (old.stocks || 0)) * 0.4)), recipes: old.recipes || [], temper: old.temper || [], fables: old.fables?.memory || {}, found: 0, country: old.country };
}
export function reincarnateBirth(c) {
  const P = META.pastLife; if (!P) return;
  c.flags.reincarnated = true; c.recipes = [...new Set([...(c.recipes || []), ...P.recipes])]; c.temper = [...new Set([...(P.temper || [])])].slice(0, 4);
  for (const k of ['smarts', 'strength', 'agility', 'charisma', 'luck']) c.stats[k] = clamp(c.stats[k] + 8);
  c.qi.affinity = clamp(c.qi.affinity + 15);
  ui.log(`I was ${P.name} once. The memories come in flashes: recipes, habits, a name that isn't mine any more.`, 'big');
  for (const [fname, lines] of Object.entries(P.fables || {})) ui.log(`A memory of the Fable "${fname}": I chose — ${lines.slice(-6).map(l => `"${l}"`).join(', then ')}.`, 'qi');
}
// search for what you left behind (no heir got it)
export const SEARCH_PAST = { id: 'search_past', cat: 'adventure', name: 'Search for your past life\'s belongings', icon: 'chest', minAge: 14, need: c => c.flags?.reincarnated && META.pastLife && (META.pastLife.heirlooms.length || META.pastLife.money > 0), run: c => {
  const P = META.pastLife; if (!chance(0.3 + (c.stats.luck - 50) / 300)) return pick(['I followed a half-remembered road to a ruined house. Nothing.', 'The shrine I dreamed of was real — but empty.', 'Strangers live where I used to. They watched me from the window.']);
  if (P.heirlooms.length && (chance(0.6) || P.money <= 0)) { const x = P.heirlooms.splice(Math.floor(Math.random() * P.heirlooms.length), 1)[0]; (c.heirlooms ||= []).push(x); save(); return { text: `Buried under the floor of my old house, exactly where I left it: an heirloom from my past life.`, cls: 'good', big: true }; }
  const m = Math.round(P.money * pick([0.3, 0.5, 1])); P.money -= m; money(c, m); save(); return { text: `My past self hid a stash, and I remembered where. ${fmtMoney(c, m)}.`, cls: 'good', big: true }; } };

// ---------- regression: killed in battle at Void Refinement+, sometimes you wake decades earlier
export function tryRegress(c, cause) {
  if (c.flags?.regressed || (c.qi?.realm || 0) < 9 || c.age < 20) return false;
  if (!/battle|killed|slain|Fable|Gate|hunt|mutiny|ambush|bounty|breach|fight/i.test(cause || '') || !chance(0.12)) return false;
  const n = Math.min(ri(1, 100), c.age - 12); c.flags.regressed = true;
  c.age -= n; G.world.year -= n; c.stats.health = Math.max(c.stats.health, 70); c.fableRun = null; c.otherworld = null; c.hunt = null;
  const gone = []; c.people = (c.people || []).filter(p => { p.age = (p.age || 0) - n; if (p.age < 0) { gone.push(p.first); return false; } return true; });
  if (c.partnerId && !c.people.some(p => p.id === c.partnerId)) c.partnerId = null;
  c.qi.realm = Math.max(1, c.qi.realm - 1); c.qi.stage = 1; c.qi.qi = 0; c.unstableQi = 4;
  ui.cinematic?.({ motif: 'enso', color: '#7fe8ff', lines: ['The killing blow lands. Everything goes white.', `You open your eyes ${n} years earlier, with every memory intact.`], title: 'Regression', sub: `Back ${n} years`, sound: 'ascend', hold: 2.6 });
  ui.log(`I died — and woke up ${n} years in the past, still myself, still remembering everything. My Qi is unstable; it will take years to settle.${gone.length ? ` ${gone.slice(0, 5).join(', ')} ${gone.length > 1 ? "haven't" : "hasn't"} been born yet.` : ''}`, 'big');
  return true;
}
export const regressMods = c => (c.unstableQi || 0) > 0 ? [{ qi: 0.6, breakthrough: -0.05 }] : [];

// ---------- cursed object: an evil soul that won't stay dead
export const OBJECTS = ['jade hairpin', 'rusted sword', 'black lacquer mirror', 'bone flute', 'porcelain doll', 'iron ring', 'red paper lantern'];
export function possessBirth(c, prev) {
  const A = ri(18, 34); c.age = A; c.birthYear = G.world.year - A;
  for (const p of c.people) p.age = (p.age || 0) + A;
  Object.assign(c.stats, { strength: ri(35, 60), agility: ri(35, 60), smarts: ri(35, 70) });
  c.edu.level = Math.max(c.edu.level, 2); c.qi.known = true; c.qi.realm = Math.max(1, (prev.realm || 9) - 6); c.qi.stage = 1; c.qi.tainted = true; if (!c.qi.manuals.includes('breathing')) c.qi.manuals.push('breathing'); c.flags.possessed = prev.name; c.karma = -60;
  enterDemonic(c, `I was ${prev.name}. Then I was a ${prev.object}. Now I am whoever was foolish enough to pick me up.`);
}

// ---------- yearly
export async function fateYear(c) {
  if (!c.alive) return;
  if ((c.unstableQi || 0) > 0 && --c.unstableQi === 0) ui.log('My Qi finally stabilised after the regression.', 'good');
  const r = demonicYear(c);
  if (r.hunt && ui.fight) {
    const R = Math.max(1, effRealm(c));
    ui.log(pick(['Guild hunters found my trail.', 'Three masked hunters from the Association were waiting at my door.', 'A Guild bounty squad ambushed me on the road.']), 'bad');
    const res = await ui.fight({ id: 'demonic', mini: 'qi_clash', kind: 'human', name: 'Guild Hunter Squad', realm: R, hp: 180, str: 75, agi: 65, moves: ['jab', 'punch', 'kick', 'guard', 'qi_palm'] }, { noFlee: false });
    if (res === 'win') { c.wins++; addInfamy(c, 800); ui.log('I left the hunters in the dirt. My legend grows darker.', 'qi'); }
    else if (res === 'flee') ui.log('I escaped the hunters. They will be back.', 'bad');
    else { stat(c, 'health', -ri(10, 25)); ui.log('The hunters left me half dead and took a share of what I owned.', 'bad'); money(c, -Math.round(Math.max(0, c.money) * 0.15)); }
  }
  if (c.fame < 0 && c.fame > -1000) c.fame = Math.min(0, c.fame + 50); // small infamy fades with time
}
export const fateMods = c => [...(c.flags?.reincarnated ? [REINC_BUFF] : []), ...(c.reincCards || []), ...demonMods(c), ...taintMods(c), ...regressMods(c)];
