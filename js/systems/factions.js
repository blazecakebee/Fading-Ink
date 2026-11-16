import { eff } from './body.js';
// Sects (ranks, contribution, mission board, stipends, ousting, wars, inter-sect exchange),
// personal disciples, and the Hunter Guild (harsh entry, contracts, ranks E → SSS).
import { effRealm, onBodyPath } from './path.js';
import { G } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp } from '../core/rng.js';
import { stat, money, addItem, country, fmtMoney, priceFor, wage } from './life.js';
import { power } from './cultivation.js';
import { ENEMIES, GATE_RANKS } from '../data/combat.js';
import { SECTS, REALMS } from '../data/realms.js';
import { ITEMS } from '../data/items.js';
import { makePerson } from './people.js';
import { rollBirthTraits } from './traits.js';
import { npcDna } from './genetics.js';

const econ = c => country(c).econ;
const realmN = r => REALMS[clamp(r, 0, REALMS.length - 1)].name;

// ---------------- Sect ranks & contribution
export const SECT_RANKS = [
  { name: 'Outer Disciple', contrib: 0, realm: 0, stipend: 0 },
  { name: 'Inner Disciple', contrib: 120, realm: 2, stipend: 600 },
  { name: 'Core Disciple', contrib: 450, realm: 4, stipend: 2500 },
  { name: 'Elder', contrib: 1500, realm: 6, stipend: 9000 },
  { name: 'Sect Master', contrib: Infinity, realm: 0, stipend: 0 },
];
export const inSect = c => !!c.sect;
export const isOwn = c => c.sect === 'own';
export const rankName = c => SECT_RANKS[c.sectRank || 0].name;
export function nextRank(c) {
  const r = (c.sectRank || 0) + 1; if (isOwn(c) || r > 3) return null;
  const R = SECT_RANKS[r]; const why = [];
  if ((c.contrib || 0) < R.contrib) why.push(`${R.contrib} contribution (you have ${c.contrib || 0})`);
  if (c.qi.realm < R.realm) why.push(`reach ${realmN(R.realm)}`);
  return { rank: r, R, why, ok: !why.length };
}
export function promote(c) {
  const n = nextRank(c); if (!n?.ok) return null;
  c.sectRank = n.rank;
  ui.cinematic?.({ motif: 'seal', color: '#ffd36f', lines: [`The elders of the ${sectLabel(c)} gather in the hall.`, 'Your name is written into the inner register.'], title: n.R.name, sub: sectLabel(c) });
  return { text: `I was promoted to ${n.R.name} of the ${sectLabel(c)}.`, cls: 'big', big: true };
}
export const sectLabel = c => c.sect === 'own' ? c.ownSect?.name : c.sect === 'guest' ? c.guestSect : SECTS.find(s => s.id === c.sect)?.name || 'sect';

// ---------------- Relations between sects (from your sect's point of view)
export const RELS = ['allied', 'neutral', 'hostile', 'war'];
export const REL_INFO = { allied: { name: 'Allied', color: '#6fd36f', price: 0.8 }, neutral: { name: 'Neutral', color: '#b9b9b9', price: 1 }, hostile: { name: 'Hostile', color: '#ffb02e', price: 1.35 }, war: { name: 'At War', color: '#ff4f4f', price: null } };
export function others(c) { return SECTS.filter(s => s.id !== c.sect); }
export function ensureRels(c) {
  c.sectRel ||= {};
  for (const s of others(c)) c.sectRel[s.id] ||= pick(['allied', 'neutral', 'neutral', 'neutral', 'hostile']);
  return c.sectRel;
}
function shiftRel(c, id, d) { const r = RELS.indexOf(c.sectRel[id] || 'neutral'); c.sectRel[id] = RELS[clamp(r + d, 0, 3)]; return c.sectRel[id]; }

// ---------------- Mission boards (sect missions + guild contracts), regenerated every year
const SECT_KINDS = [
  { kind: 'herbs', name: 'Gather spirit herbs in the back mountains', icon: 'herb', check: ['luck', 'smarts'], fight: 0.15 },
  { kind: 'beasts', name: 'Suppress rampaging spirit beasts', icon: 'claw', fight: 1, pool: ['spirit_wolf', 'tiger_beast', 'yaoguai'] },
  { kind: 'escort', name: 'Escort a pill caravan', icon: 'travel', check: ['battle', 'charisma'], fight: 0.5, pool: ['thug', 'gangster', 'demonic'] },
  { kind: 'spy', name: 'Spy on a rival sect', icon: 'eye', check: ['agility', 'charisma'], fight: 0.35, pool: ['gangster', 'demonic', 'blood_cultist'], rival: true },
  { kind: 'defend', name: 'Defend the sect border', icon: 'shield', fight: 1, pool: ['demonic', 'blood_cultist', 'gangster'], rival: true },
];
const GUILD_KINDS = [
  { kind: 'breach', name: 'Clean up a Gate breach', icon: 'gates', fight: 1, pool: ['hungry_ghost', 'spirit_wolf', 'corrupt_soul', 'yaoguai', 'void_wraith'] },
  { kind: 'bounty', name: 'Bounty: rogue cultivator', icon: 'skull', fight: 1, pool: ['thug', 'gangster', 'demonic', 'blood_cultist', 'sword_saint'] },
  { kind: 'survey', name: 'Survey an unstable Gate', icon: 'lantern', check: ['smarts', 'luck'], fight: 0.25, pool: ['hungry_ghost', 'drowned_ghost', 'jiangshi'] },
  { kind: 'recover', name: 'Recover a lost hunter team', icon: 'people', check: ['agility', 'battle'], fight: 0.5, pool: ['spirit_wolf', 'tiger_beast', 'stone_golem'] },
];
export function boards(c) {
  if (c.board?.year === G.world.year) return c.board;
  const mk = (kinds, org, n) => Array.from({ length: n }, () => {
    const k = pick(kinds); const diff = pick([-1, 0, 0, 1]);
    const base = org === 'guild' ? Math.max(effRealm(c), GATE_RANKS[Math.min(7, c.guild?.rank || 0)].realm) : effRealm(c);
    const er = clamp(base + diff, 0, REALMS.length - 2);
    return { ...k, org, diff, er, id: Math.random().toString(36).slice(2, 8), done: false };
  });
  c.board = { year: G.world.year, sect: c.sect ? mk(SECT_KINDS, 'sect', 3) : [], guild: c.guild ? mk(GUILD_KINDS, 'guild', 3) : [] };
  return c.board;
}
const diffLabel = d => d < 0 ? 'Easy' : d > 0 ? 'Hard' : 'Fair';
export function missionInfo(c, m) {
  const mult = (m.er + 1) * (m.diff > 0 ? 1.6 : m.diff < 0 ? 0.6 : 1);
  return { diff: diffLabel(m.diff), enemy: realmN(m.er), contrib: Math.round(12 * mult), money: Math.round(250 * mult * (m.org === 'guild' ? 2 : 1) * wage(c)), merit: Math.round(10 * mult) };
}
function enemyFor(m) {
  const id = pick(m.pool); const e = ENEMIES.find(x => x.id === id) || ENEMIES[1];
  return { ...e, realm: m.er, name: `${e.name}` };
}
// Run a mission. Returns chronicle {text, cls}.
export async function runMission(c, m) {
  const I = missionInfo(c, m); let ok = true; let line = '';
  if (m.check && !(m.fight >= 1)) {
    const [a, b] = m.check; const score = (c.stats[a] + c.stats[b]) / 2 + power(c) * 4 - (m.er - effRealm(c)) * 18;
    ok = chance(clamp(0.35 + score / 160, 0.1, 0.92));
  }
  if (m.fight >= 1 || chance(m.fight)) {
    const r = await ui.fight(enemyFor(m)); ok = r === 'win'; if (ok) c.wins++;
    line = ok ? ' I fought my way through.' : r === 'flee' ? ' I had to run.' : ' I was beaten.';
  }
  m.done = true;
  if (m.org === 'sect') {
    if (ok) {
      c.contrib = (c.contrib || 0) + I.contrib; money(c, Math.round(I.money * 0.4)); c.flags.sectActive = G.world.year;
      if (m.kind === 'herbs') addItem(c, 'spirit_herb', ri(1, 3));
      if (m.rival) { const t = pick(others(c)); if (t && chance(0.4)) { ensureRels(c); shiftRel(c, t.id, 1); line += ` The ${t.name} will not forget this.`; } }
      return { text: `Sect mission — ${m.name}: success.${line} +${I.contrib} contribution, ${fmtMoney(c, Math.round(I.money * 0.4))}.`, cls: 'good' };
    }
    const loss = Math.round(I.contrib * (m.diff > 0 ? 0.5 : 1));
    c.contrib = (c.contrib || 0) - loss;
    return { text: `Sect mission — ${m.name}: failed.${line} -${loss} contribution.${c.contrib < 0 ? ' The disciplinary hall has my name.' : ''}`, cls: 'bad' };
  }
  // guild
  if (ok) {
    c.guild.merit += I.merit; money(c, I.money);
    return { text: `Guild contract — ${m.name}: complete.${line} +${I.merit} merit, ${fmtMoney(c, I.money)}.`, cls: 'good' };
  }
  c.guild.merit = Math.max(0, c.guild.merit - Math.round(I.merit / 2));
  return { text: `Guild contract — ${m.name}: failed.${line} Merit lost.`, cls: 'bad' };
}

// ---------------- Inter-sect exchange: buy from sects you aren't at war with; prices follow relations
const GOODS = { qi_pill: 600, heal_pill: 300, calm_incense: 500, marrow_pill: 4000, purity_pill: 2500, recipe_scroll: 1500, trib_talisman: 3000, foundation_pill: 7000, core_pill: 20000, soul_pill: 60000, sever_pill: 150000, void_pill: 300000, unity_pill: 600000, dao_pill: 1200000, ginseng: 2500, spirit_stone: 450, bloodline_essence: 250000 };
const GOOD_REALM = { foundation_pill: 2, core_pill: 3, soul_pill: 5, sever_pill: 7, void_pill: 8, unity_pill: 9, dao_pill: 10, bloodline_essence: 4 };
export function exchange(c) {
  ensureRels(c);
  if (c.exch?.year !== G.world.year) {
    c.exch = { year: G.world.year, offers: others(c).filter(s => c.sectRel[s.id] !== 'war').flatMap(s => {
      const goods = Object.keys(GOODS).filter(id => ITEMS[id] && (GOOD_REALM[id] ?? 0) <= c.qi.realm + 1);
      return Array.from({ length: 2 }, () => pick(goods)).filter((v, i, a) => a.indexOf(v) === i).map(id => ({ sect: s.id, id, left: ri(1, 3) }));
    }) };
  }
  return c.exch.offers.map(o => ({ ...o, price: priceFor(c, Math.round(GOODS[o.id] * econ(c) * REL_INFO[c.sectRel[o.sect]].price * (G.world.news?.mods?.price || 1))) }));
}
export function buyOffer(c, i) {
  const o = exchange(c)[i]; if (!o || o.left <= 0 || c.money < o.price) return null;
  money(c, -o.price); addItem(c, o.id); c.exch.offers[i].left--;
  return `Bought ${ITEMS[o.id].name} from the ${SECTS.find(s => s.id === o.sect).name} for ${fmtMoney(c, o.price)}.`;
}

// ---------------- Personal disciples
export function discipleSlots(c) { if (isOwn(c)) return 4; const r = c.sectRank || 0; return r >= 3 ? 3 : r >= 2 ? 1 : 0; }
export function scout(c) {
  return Array.from({ length: 3 }, () => {
    const p = makePerson(c, { age: ri(9, 19), role: 'Disciple', realm: chance(0.2) ? 1 : 0 });
    return { id: p.id, first: p.first, last: p.last, gender: p.gender, age: p.age, genes: p.genes, talent: ri(10, 90), loyalty: ri(45, 70), battle: ri(0, 20),
      realm: p.realm, prog: 0, traits: rollBirthTraits({ traits: [] }).slice(0, 1), dna: npcDna(p.realm), taught: null, assigned: false, since: G.world.year };
  });
}
export function recruit(c, d) { (c.disciples ||= []).push(d); return `${d.first} ${d.last} knelt and offered tea. I accepted them as my personal disciple.`; }
export function teach(c, d) {
  if (d.realm >= c.qi.realm - 1 && c.qi.realm > 0 && d.realm > 0) return { text: `${d.first} has caught up to what I can teach — I must climb higher first.`, cls: 'muted' };
  const g = Math.round(ri(18, 32) * (0.5 + d.talent / 100) * (c.qi.realm ? 1 : 0.4) / (1 + d.realm * 0.6)); // higher realms take longer
  d.prog += g; d.taught = G.world.year; d.loyalty = clamp(d.loyalty + 3); d.battle = clamp(d.battle + 1, 0, 100);
  let t = `I instructed ${d.first} in cultivation (+${g}% progress).`;
  if (d.prog >= 100) { d.prog -= 100; d.realm++; t += ` ${d.first} broke through to ${realmN(d.realm)}!`; }
  return { text: t, cls: 'qi' };
}
export function sparDisciple(c, d) { d.battle = clamp(d.battle + ri(2, 4), 0, 100); d.taught = G.world.year; stat(c, 'battle', 1); d.loyalty = clamp(d.loyalty + 2); return `I sparred with ${d.first}. We both learned something.`; }
export function giftDisciple(c, d) { if (!c.inv.qi_pill) return null; addItem(c, 'qi_pill', -1); d.prog += 25; d.loyalty = clamp(d.loyalty + 10); d.taught = G.world.year; return `I gave ${d.first} a Qi Gathering Pill. Their eyes shone.`; }
// Yearly: disciples age, neglected ones resent you, loyal assigned ones earn contribution.
export function disciplesYear(c) {
  if (!c.disciples?.length) return;
  for (const d of [...c.disciples]) {
    d.age++;
    if (d.taught !== G.world.year - 1 && d.taught !== G.world.year) d.loyalty = clamp(d.loyalty - ri(4, 8));
    if (d.assigned && c.sect) { const g = Math.round(3 * (d.realm + 1) * (1 + (d.rank || 0) * 0.5)); c.contrib = (c.contrib || 0) + g; if (chance(0.05)) { addItem(c, 'spirit_herb'); } }
    if (d.loyalty < 15 && chance(0.4)) {
      c.disciples.splice(c.disciples.indexOf(d), 1);
      const stolen = Math.max(0, Math.round(c.money * ri(5, 15) / 100)); if (stolen) money(c, -stolen);
      c.people.push(makePerson(c, { first: d.first, last: d.last, gender: d.gender, age: d.age, role: 'Enemy', close: 0, hostile: true, realm: d.realm, genes: d.genes }));
      ui.log(`${d.first} betrayed me and fled${stolen ? ` with ${fmtMoney(c, stolen)}` : ''}. Neglect breeds resentment.`, 'bad');
    } else if (d.loyalty >= 90 && chance(0.08)) { addItem(c, pick(['spirit_herb', 'spirit_stone', 'calm_incense'])); ui.log(`${d.first} brought me a gift out of gratitude.`, 'good'); }
  }
  if (c.disciples.length > discipleSlots(c)) ui.log(`I have more disciples than my rank allows; the sect expects me to let some go.`, 'muted');
}

// ---------------- Hunter Guild
export const GUILD_RANKS = ['E', 'D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
export const MERIT = [0, 60, 180, 400, 800, 1500, 3000, 6000];
export function guildJoinReq(c) {
  const why = [];
  if (c.age < 16) why.push('be 16 or older');
  if (eff(c, 'battle') < 30) why.push(`Battle Knowledge 30 (you have ${eff(c, 'battle') || 0})`);
  if (eff(c, 'strength') < 40) why.push(`Strength 40 (you have ${eff(c, 'strength')})`);
  if (c.wins < 3) why.push(`win 3 real fights (you have ${c.wins})`);
  if (c.flags.guildTry === G.world.year) why.push('the examiners will see you again next year');
  return why;
}
export async function guildTrial(c) {
  c.flags.guildTry = G.world.year;
  const r = await ui.fight({ id: 'examiner', mini: 'dodge', name: 'Guild Examiner', kind: 'human', realm: Math.max(1, effRealm(c) || c.qi.realm), hp: 110, str: 62, agi: 58, moves: ['jab', 'punch', 'kick', 'guard', ...(c.qi.realm >= 1 ? ['qi_palm'] : [])] }, { noFlee: true });
  if (r !== 'win') return { text: 'I failed the Hunter Guild trial. The examiner told me to come back stronger.', cls: 'bad' };
  c.wins++; c.guild = { rank: 0, merit: 0, joined: G.world.year };
  ui.cinematic?.({ motif: 'sword', color: '#ffb02e', lines: ['The examiner lowers their guard and nods.', 'A bronze plate with your name is pressed into your hand.'], title: 'Hunter Guild', sub: 'E-Rank Hunter' });
  return { text: 'I passed the trial and joined the Hunter Guild as an E-rank hunter!', cls: 'big', big: true };
}
export function guildNext(c) {
  const r = c.guild.rank + 1; if (r >= GUILD_RANKS.length) return null;
  const why = [], needR = Math.max(0, GATE_RANKS[r].realm - 1);
  if (c.guild.merit < MERIT[r]) why.push(`${MERIT[r]} merit (you have ${c.guild.merit})`);
  const ranker = !onBodyPath(c) && c.qi.realm === 0 && r <= 3 && eff(c, 'battle') >= 40 + r * 12;
  if (effRealm(c) < needR && !ranker) why.push(c.qi.realm === 0 && !onBodyPath(c) && r <= 3 ? `Battle Knowledge ${40 + r * 12} (mortal Rankers) or reach ${realmN(needR)}` : `reach ${realmN(needR)}`);
  return { r, name: GUILD_RANKS[r], why, ok: !why.length };
}
export function guildPromote(c) { const n = guildNext(c); if (!n?.ok) return null; c.guild.rank = n.r; ui.fx('milestone'); return { text: `The Hunter Guild promoted me to ${n.name}-rank.`, cls: 'big', big: true }; }
export const guildSalary = c => Math.round([1, 2, 4, 8, 15, 30, 60, 120][c.guild.rank] * 500 * wage(c));

// ---------------- Yearly upkeep: stipends, ousting, framing, wars, relations drift
export async function factionsYear(c) {
  if (c.guild) { const s = guildSalary(c); money(c, s); ui.log(`Hunter Guild retainer (${GUILD_RANKS[c.guild.rank]}-rank): ${fmtMoney(c, s)}.`); }
  disciplesYear(c);
  if (!c.sect) return;
  ensureRels(c);
  c.contrib ??= 0; c.sectRank ??= isOwn(c) ? 4 : 0;
  // relations drift a little each year
  for (const s of others(c)) if (chance(0.12)) shiftRel(c, s.id, pick([-1, 1]));
  const R = SECT_RANKS[c.sectRank];
  if (R.stipend) { const m = Math.round(R.stipend * wage(c)); money(c, m); if (c.sectRank >= 2) addItem(c, 'qi_pill'); ui.log(`${R.name} stipend from the ${sectLabel(c)}: ${fmtMoney(c, m)}${c.sectRank >= 2 ? ' and a Qi Gathering Pill' : ''}.`, 'qi'); }
  if (isOwn(c) || c.sect === 'guest') return;
  // ousting: deep in debt to the sect, or years of doing nothing as an outer disciple
  const idle = G.world.year - (c.flags.sectActive || c.flags.sectJoined || G.world.year);
  if (c.contrib < -30 || (c.sectRank === 0 && idle >= 5 && chance(0.35))) return oust(c, c.contrib < -30 ? 'my failures piled up past forgiveness' : 'I never lifted a finger for the sect');
  // framing by a rival faction
  if (chance(0.03 + (c.sectRank >= 2 ? 0.02 : 0))) {
    const v = await ui.choice({ title: 'Framed!', icon: 'skull', text: `Stolen pills were found in your quarters. Someone in the ${sectLabel(c)} wants you gone.`,
      options: [{ label: `Argue your innocence (Charisma ${eff(c, 'charisma')}, Smarts ${eff(c, 'smarts')})`, value: 'argue' }, { label: 'Accept the punishment quietly (-60 contribution)', value: 'accept' }, { label: 'Leave the sect', value: 'leave' }] });
    if (v === 'argue') { if (chance(clamp((eff(c, 'charisma') + eff(c, 'smarts')) / 220, 0.15, 0.85))) { c.contrib += 20; ui.log('I exposed the real thief before the elders. My standing rose.', 'good'); } else oust(c, 'the elders believed the lie'); }
    else if (v === 'leave') oust(c, 'I walked away from the politics', true);
    else { c.contrib -= 60; ui.log('I swallowed the insult and the punishment.', 'bad'); }
  }
  // sect war
  const enemy = others(c).find(s => c.sectRel[s.id] === 'war');
  if (enemy && chance(0.7) && c.age >= 14) await sectWar(c, enemy);
}
export function oust(c, why, voluntary) {
  const name = sectLabel(c); (c.flags.exiled ||= {})[c.sect] = true;
  c.sect = null; c.sectRank = 0; c.contrib = 0; c.board = null;
  ui.log(voluntary ? `I left the ${name}: ${why}.` : `I was expelled from the ${name}: ${why}. Its gates are closed to me forever.`, 'bad');
  stat(c, 'happiness', -10);
}
async function sectWar(c, enemy) {
  const dis = (c.disciples || []).filter(d => d.realm >= 1);
  const help = Math.min(0.35, dis.reduce((s, d) => s + 0.04 * d.realm * (1 + (d.rank || 0) * 0.25), 0));
  const v = await ui.choice({ title: 'Sect War', icon: 'combat', text: `The ${sectLabel(c)} is at war with the ${enemy.name}. Every disciple is called to the front.${dis.length ? `\nYour disciples stand with you (enemies weakened by ${Math.round(help * 100)}%).` : ''}`,
    options: [{ label: 'Hold the line', value: 'fight' }, { label: 'Lead a raid on their territory (harder, bigger reward)', value: 'raid' }, { label: 'Stay behind (-40 contribution)', value: 'stay' }] });
  if (v === 'stay' || !v) { c.contrib -= 40; ui.log('I stayed out of the war. People noticed.', 'bad'); if (c.sectRank >= 1 && chance(0.2)) oust(c, 'cowardice in wartime'); return; }
  const er = clamp(effRealm(c) + (v === 'raid' ? 1 : 0), 0, REALMS.length - 2);
  const eid = pick(['demonic', 'blood_cultist', 'gangster']), e = ENEMIES.find(x => x.id === eid) || ENEMIES[2];
  const r = await ui.fight({ ...e, realm: er, hp: Math.round(e.hp * (1 - help)), str: Math.round(e.str * (1 - help)), name: `${enemy.name} ${er >= 6 ? 'Elder' : 'Disciple'}` });
  if (r === 'win') {
    c.wins++; const g = v === 'raid' ? ri(90, 160) : ri(50, 90); c.contrib += g; c.flags.sectActive = G.world.year;
    if (chance(v === 'raid' ? 0.35 : 0.2)) { c.sectRel[enemy.id] = 'hostile'; ui.log(`The ${enemy.name} sued for peace. The war is over — for now.`, 'world'); }
    ui.log(`I ${v === 'raid' ? 'led a raid that burned their outer halls' : 'held the line against the ' + enemy.name}. +${g} contribution.`, 'good');
  } else {
    ui.log(`The ${enemy.name} pushed us back.`, 'bad');
    if (dis.length && chance(0.15)) { const d = pick(dis); c.disciples.splice(c.disciples.indexOf(d), 1); ui.log(`My disciple ${d.first} fell in the fighting.`, 'death'); stat(c, 'happiness', -15); }
  }
}

// ---------------- v0.6.3: promoting your disciples, and running your own sect
export const D_RANKS = [{ name: 'Outer', realm: 0, loyal: 0 }, { name: 'Inner', realm: 1, loyal: 40 }, { name: 'Core', realm: 3, loyal: 55 }, { name: 'Elder', realm: 5, loyal: 70 }];
export function canPromoteDisciple(c, d) {
  const r = (d.rank || 0) + 1; if (r >= D_RANKS.length) return { ok: false, why: ['highest rank'] };
  const R = D_RANKS[r], why = [];
  if (d.realm < R.realm) why.push(`reach ${realmN(R.realm)}`);
  if (d.loyalty < R.loyal) why.push(`loyalty ${R.loyal}+`);
  if (!isOwn(c) && (c.sectRank || 0) < r + 1) why.push(`you must outrank them (${SECT_RANKS[Math.min(4, r + 1)].name})`);
  return { ok: !why.length, why, R };
}
export function promoteDisciple(c, d) {
  const p = canPromoteDisciple(c, d); if (!p.ok) return null;
  d.rank = (d.rank || 0) + 1; d.loyalty = clamp(d.loyalty + 10);
  return { text: `I promoted ${d.first} to ${p.R.name} disciple. They bowed so low their forehead touched the floor.`, cls: 'good' };
}
export const discRank = d => D_RANKS[d.rank || 0].name;
// own sect halls
export const HALLS = {
  library: { name: 'Scripture Library', icon: 'manual', desc: '+4% Qi gains per level.' },
  alchemy: { name: 'Alchemy Room', icon: 'cauldron', desc: 'A Qi Gathering Pill per level each year.' },
  grounds: { name: 'Training Grounds', icon: 'gym', desc: '+1 Strength and Battle Knowledge per level each year.' },
  gate: { name: 'Mountain Gate', icon: 'shield', desc: 'More disciples join each year (+2 per level).' },
};
export const hallCost = (c, lvl) => Math.round(15000 * (lvl + 1) ** 2 * econ(c));
export function buildHall(c, id) {
  const o = c.ownSect; o.halls ||= {}; const lvl = o.halls[id] || 0; if (lvl >= 3) return null;
  const cost = hallCost(c, lvl); if (c.money < cost) return null; money(c, -cost); o.halls[id] = lvl + 1;
  return { text: `The ${o.name} built a level ${lvl + 1} ${HALLS[id].name}.`, cls: 'good', big: true };
}
export function recruitDrive(c) {
  const o = c.ownSect; const cost = Math.round(3000 * econ(c)); if (c.money < cost) return null; money(c, -cost);
  const n = Math.max(1, Math.round(ri(2, 6) * (1 + eff(c, 'charisma') / 100) + c.qi.realm));
  o.disciples += n; return { text: `A recruitment drive brought ${n} new disciples to the ${o.name}.`, cls: 'good' };
}
export function ownSectYear(c) {
  const o = c.ownSect; if (!o?.halls) return;
  if (o.halls.alchemy) addItem(c, 'qi_pill', o.halls.alchemy);
  if (o.halls.grounds) { stat(c, 'strength', o.halls.grounds); stat(c, 'battle', o.halls.grounds); }
  if (o.halls.gate) o.disciples += o.halls.gate * 2;
}
