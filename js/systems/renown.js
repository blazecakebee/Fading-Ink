// v0.8.7 Fame you can actually earn, the Wanted board of demonic cultivators, invitations at 100k Fame,
// unrest in low-fame sects, Rare Relics, and the rare Transmigration expedition.
import { G } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp } from '../core/rng.js';
import { stat, money, addItem, fmtMoney, wage, die, country } from './life.js';
import { ENEMIES } from '../data/combat.js';
import { REALMS, SECTS } from '../data/realms.js';
import { effRealm, onBodyPath } from './path.js';
import { gainHeirloom } from './heirlooms.js';

// ---------------- Fame
export const fameLabel = f => f >= 1e6 ? 'Mythic' : f >= 1e5 ? 'Legendary' : f >= 1e4 ? 'Famous' : f >= 1e3 ? 'Known' : 'Unknown';
export function addFame(c, n, quiet) { n = Math.round(n); if (!n) return 0; c.fame = Math.max(0, (c.fame || 0) + n); if (!quiet && n >= 1000) ui.log(`Fame +${n.toLocaleString()} (${fameLabel(c.fame)}).`, 'good'); return n; }
// old saves kept Fame on a 0–100 scale
export function migrateFame(c) { if (!c.flags.fame2 ) { c.flags.fame2 = true; if ((c.fame || 0) <= 100) c.fame = (c.fame || 0) * 100; } }
export const gateFame = tier => (tier + 1) * (tier + 1) * 150;

// ---------------- Wanted board
const ALIAS = ['the Butcher of', 'the Flayer of', 'the Smiling Ghost of', 'the Blood Lotus of', 'the Child-Eater of', 'the Hollow Saint of', 'the Red Tide of', 'the Silent Knife of'];
const PLACES = ['Ashen Valley', 'the Ninth Ward', 'Mount Qing', 'the Salt Marshes', 'the Old Capital', 'Lantern Street', 'the Northern Pass', 'Black Pine'];
export function bountyBoard(c) {
  c.bounties ||= [];
  if (c.bountyYear !== G.world.year) { c.bountyYear = G.world.year; c.bounties = c.bounties.filter(b => --b.years > 0);
    const R = effRealm(c); while (c.bounties.length < 3) { const r = clamp(R + ri(-1, 1), 1, REALMS.length - 1), e = pick(['demonic', 'blood_cultist', 'corrupt_soul', 'heavenly_demon'].filter(id => (ENEMIES.find(x => x.id === id).realm <= r + 3)));
      c.bounties.push({ id: Math.random().toString(36).slice(2, 8), name: `${pick(['Mo', 'Xue', 'Gu', 'Yan', 'Hei', 'Shen', 'Lu', 'Qiao'])} ${pick(['Wuji', 'Hanyu', 'Tian', 'Lie', 'Mei', 'Zhen', 'Kui', 'Rou'])}, ${pick(ALIAS)} ${pick(PLACES)}`, enemy: e, realm: r, reward: Math.round((r + 1) * (r + 1) * 400), fame: (r + 1) * (r + 1) * 120, years: ri(2, 4) }); } }
  return c.bounties;
}
export async function huntBounty(c, id) {
  const b = (c.bounties || []).find(x => x.id === id); if (!b) return null; const e = ENEMIES.find(x => x.id === b.enemy);
  ui.log(`I tracked ${b.name} for weeks.`, 'qi');
  const r = await ui.fight({ ...e, realm: b.realm, hp: Math.round(e.hp * 1.25), str: Math.round(e.str * 1.1), name: b.name });
  if (r !== 'win') { stat(c, 'health', -ri(8, 18)); if (r !== 'flee' && chance(0.1)) { b.reward = Math.round(b.reward * 1.3); return { text: `${b.name} beat me and escaped. Their bounty went up.`, cls: 'bad' }; } return { text: `${b.name} slipped away from me.`, cls: 'bad' }; }
  c.bounties = c.bounties.filter(x => x !== b); c.wins++; c.kills++; c.bountiesDone = (c.bountiesDone || 0) + 1;
  const m = Math.round(b.reward * wage(c)); money(c, m); addFame(c, b.fame, true); if (chance(0.3)) addItem(c, pick(['demonic_core', 'qi_pill', 'spirit_stone']));
  return { text: `I brought down ${b.name}. Bounty: ${fmtMoney(c, m)}, Fame +${b.fame.toLocaleString()}.`, cls: 'good', big: true };
}

// ---------------- Relics: sell for a fortune, or enshrine (max 3) for permanent meditation Qi
export const RELICS = {
  relic_lotus: { name: 'Jade Lotus Relic', qi: 0.1, price: 60000 }, relic_bone: { name: 'Saint\'s Finger-Bone', qi: 0.12, price: 80000 },
  relic_mirror: { name: 'Mirror of the Ninth Sky', qi: 0.15, price: 120000 }, relic_bell: { name: 'Bell of the First Sect', qi: 0.08, price: 45000 },
  relic_seed: { name: 'World-Tree Seed', qi: 0.18, price: 160000 },
};
export const relicQi = c => (c.relics || []).reduce((m, id) => m * (1 + (RELICS[id]?.qi || 0)), 1);
export function enshrine(c, id) { if (!c.inv[id] || (c.relics || []).length >= 3) return null; addItem(c, id, -1); (c.relics ||= []).push(id); return `I enshrined the ${RELICS[id].name}. My meditation feels deeper (+${Math.round(RELICS[id].qi * 100)}% Qi).`; }
export function sellRelic(c, id) { if (!c.inv[id]) return null; addItem(c, id, -1); const m = Math.round(RELICS[id].price * wage(c)); money(c, m); return `A collector paid ${fmtMoney(c, m)} for the ${RELICS[id].name}.`; }
export const dropRelic = c => { const id = pick(Object.keys(RELICS)); addItem(c, id); return RELICS[id].name; };

// ---------------- yearly: invitations, unrest
export function renownYear(c) {
  migrateFame(c); bountyBoard(c);
  if ((c.fame || 0) >= 1e5 && !c.flags.elderInvite && c.sect !== 'own' && !onBodyPath(c) && c.qi.realm >= 3) {
    c.flags.elderInvite = true; const s = pick(SECTS.filter(x => x.kind !== 'gang') || SECTS);
    ui.choice?.({ title: 'An invitation', icon: 'crown', text: `Your name is known in every teahouse. ${s?.name || 'A great sect'} sends three elders to ask you to join them — not as a disciple, as an Elder.`, options: [{ label: 'Accept', value: true }, { label: 'Decline politely', value: false, ghost: true }] })
      .then(v => { if (v && s) { c.sect = s.id; c.sectRank = 3; ui.log(`I joined ${s.name} as an Elder.`, 'big'); } });
  }
  if ((c.fame || 0) >= 1e5 && !c.flags.guildInvite) { c.flags.guildInvite = true; c.guild ||= { rank: 0, merit: 0, joined: G.world.year }; c.guild.rank = Math.max(c.guild.rank, 5); c.guild.elite = true;
    ui.log('Guild Association officials came to my door: I\'m now an S-rank member with access to their secret Hunts.', 'big'); }
  if (c.ownSect && (c.fame || 0) < 1e4 && chance(0.06)) { const lost = Math.min(c.ownSect.disciples || 0, ri(2, 8)); c.ownSect.disciples = Math.max(0, (c.ownSect.disciples || 0) - lost); const m = Math.round(c.money * 0.08); money(c, -m);
    ui.log(`An elder of my sect betrayed me — nobody respects a sect master without a name. ${lost} disciples left with him, and ${fmtMoney(c, m)} from the treasury.`, 'bad'); }
}

// ---------------- Transmigration: a rare Gate that drops you into another world for 10+ years
export const inOtherworld = c => !!c.otherworld;
export function maybeTransmigrate(c) {
  if (c.otherworld || c.flags.transmigrator || c.age < 16 || !chance(0.006)) return false;
  c.otherworld = { left: ri(10, 14), deaths: 0, year: 0 };
  ui.cinematic?.({ motif: 'crack', color: '#7fffd4', lines: ['The Gate folds shut behind you.', 'The sky here has two suns, and the air is full of Qi that is not Qi.'], title: 'Transmigration', sub: 'Another world', sound: 'heavy', hold: 2 });
  ui.log('I was pulled through the Gate into another world. The laws here are different. If I fall three times, I will not get back up.', 'big');
  return true;
}
const OTHER = ['Sky-Eater Wyrm', 'Two-Sun Templar', 'Glass Revenant', 'Hollow Knight of the Other Court', 'Thousand-Eye Archon', 'Rootbound Colossus'];
export async function otherworldYear(c) {
  const o = c.otherworld; if (!o || !c.alive) return; o.year++; o.left--;
  const e = (oid => ENEMIES.find(x => x.id === oid))(pick(['ancient_qilin', 'void_wraith', 'heavenly_demon', 'fallen_immortal'])), r = clamp(effRealm(c) + 1, 1, REALMS.length - 1);
  const res = await ui.fight({ ...e, realm: r, hp: Math.round(e.hp * 1.3), str: Math.round(e.str * 1.15), name: `${pick(OTHER)} (otherworld)` }, { noFlee: true });
  if (res !== 'win') { o.deaths++; stat(c, 'health', -25);
    if (o.deaths >= 3) { c.otherworld = null; die(c, 'killed for the third time in another world — there was no coming back'); return; }
    ui.log(`I fell in the other world (${o.deaths}/3). Something there dragged me back to life. It will not do so forever.`, 'bad'); }
  else { c.wins++; addFame(c, 2000, true); ui.log(`Year ${o.year} in the other world. I survived another of its horrors.`, 'qi'); }
  if (o.left <= 0) { c.otherworld = null; c.flags.transmigrator = true;
    gainHeirloom(c, 'another world', 'legendary'); addItem(c, 'ascend_pill', 1, 'hi'); addItem(c, 'dao_pill', 2, 'hi'); dropRelic(c); addFame(c, 50000);
    ui.cinematic?.({ motif: 'triangle', color: '#7fffd4', lines: ['The Gate opens again — from the other side.', 'You step home a different person.'], title: 'Transmigrator', sub: 'Returned', sound: 'ascend', hold: 2.4 });
    ui.log('I came back from the other world. I am a Transmigrator now: stronger, quicker to learn, and carrying treasures no one here has seen.', 'big'); }
}
export const transmigratorMods = c => c.flags?.transmigrator ? { power: 1.1, qi: 1.15, train: 1.12, study: 1.12, breakthrough: 0.05, loot: 1.1 } : null;
