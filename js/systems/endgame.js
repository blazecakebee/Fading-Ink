// End-game: multi-year Hunts against legendary monsters, and (very rarely) the gods themselves.
import { G, META } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp } from '../core/rng.js';
import { stat, money, addItem, fmtMoney, wage, die, rollQuality } from './life.js';
import { ENEMIES } from '../data/combat.js';
import { REALMS } from '../data/realms.js';
import { effRealm } from './path.js';
import { gainHeirloom } from './heirlooms.js';
import { ensureDna } from './genetics.js';
import { power } from './cultivation.js';
import { perk } from '../data/legacyTree.js';
import { addFame, dropRelic } from './renown.js';

// ---------------- Hunts: one stage per year, each a brutal fight. Finish them all for a huge payout.
export const HUNTS = [
  { id: 'flood_dragon', name: 'The Thousand-Year Flood Dragon', boss: 'Thousand-Year Flood Dragon', enemy: 'young_dragon', style: 'beast', color: '#4fb3ff', minEq: 5, realm: 6,
    stages: ['Tracking the storm', 'The drowned valley', 'Heart of the flood'], pay: 120000, items: { dragon_scale: 6, dragon_vest: 1, soul_pill: 1 }, heir: 'rare', desc: 'A dragon has slept under a river delta for a thousand years. It is waking up hungry.' },
  { id: 'nine_tails', name: 'The Nine-Tailed Calamity', boss: 'Nine-Tailed Calamity', enemy: 'fox_spirit', style: 'spirit', color: '#ff8fd0', minEq: 6, realm: 7,
    stages: ['Foxfire in the hills', 'The illusion forest', 'The mirror palace', 'Nine tails unbound'], pay: 220000, items: { phoenix_feather: 1, heart_pill: 3, sever_pill: 1, bloodline_essence: 1 }, heir: 'legendary', desc: 'A fox spirit that has eaten nine cities. Every tail is a different lie.' },
  { id: 'demon_sovereign', name: 'The Heavenly Demon Sovereign', boss: 'Heavenly Demon Sovereign', enemy: 'heavenly_demon', style: 'demon', color: '#ff3a4a', minEq: 8, realm: 9,
    stages: ['The blood-red sect', 'Ten thousand cultists', 'The throne of bones', 'The Sovereign awakens'], pay: 400000, items: { void_edge: 1, void_pill: 2, bloodline_essence: 2 }, heir: 'legendary', desc: 'A demon who ate his own sect to ascend. He wants yours next.' },
  { id: 'leviathan', name: 'The Abyssal Leviathan', boss: 'Abyssal Leviathan', enemy: 'ancient_qilin', style: 'beast', color: '#2ab0e0', minEq: 9, realm: 10,
    stages: ['The black tide', 'Wreck of the fleet', 'Into the trench', 'The eye in the deep'], pay: 650000, items: { unity_pill: 2, celestial_armor: 1, bloodline_essence: 2 }, heir: 'legendary', desc: 'Ships vanish where the sea turns black. Something the size of an island moves below.' },
  { id: 'sky_devourer', name: 'The Sky-Devourer', boss: 'Sky-Devourer', enemy: 'fallen_immortal', style: 'heaven', color: '#fff4b0', minEq: 10, realm: 11,
    stages: ['The sun goes out', 'Stairway of corpses', 'Above the clouds', 'The mouth of heaven', 'Devourer of skies'], pay: 1200000, items: { celestial_sword: 1, dao_pill: 2, ascend_pill: 1, bloodline_essence: 3 }, heir: 'mythicChance', desc: 'A fallen immortal that eats the sky itself. Each year it swallows more of the stars.' },
  // v0.8.7 more hunts, from early to beyond the heavens; 'elite' ones need the Guild's invitation (100k Fame)
  { id: 'tiger_king', name: 'The White Tiger King', boss: 'White Tiger King', enemy: 'tiger_beast', style: 'beast', color: '#e9e6df', minEq: 3, realm: 4,
    stages: ['Claw marks on the shrine', 'The bamboo sea', 'Den of the King'], pay: 40000, items: { beast_core: 6, beast_hide: 2, marrow_pill: 2 }, heir: 'rare', desc: 'A tiger the size of a house has taken three villages.' },
  { id: 'ghost_bride', name: 'The Ghost Bride of Lantern Street', boss: 'Ghost Bride', enemy: 'hungry_ghost', style: 'spirit', color: '#ff9ac0', minEq: 4, realm: 5,
    stages: ['The wedding procession', 'The empty house', 'Her wedding night'], pay: 60000, items: { trib_talisman: 2, calm_incense: 3, heart_pill: 1 }, heir: 'rare', desc: 'Every full moon a groom vanishes. She is still looking for the right one.' },
  { id: 'jiangshi_lord', name: 'The Jiangshi Lord', boss: 'Jiangshi Lord', enemy: 'jiangshi', style: 'spirit', color: '#7fe3ff', minEq: 5, realm: 6,
    stages: ['The hopping dead', 'The flooded crypt', 'The coffin of jade'], pay: 100000, items: { purity_pill: 2, spirit_stone: 8, soul_pill: 1 }, heir: 'rare', desc: 'An emperor who refused to die, and his court that followed him.' },
  { id: 'sword_tomb', name: 'The Tomb of Ten Thousand Swords', boss: 'Sword Saint\'s Remnant', enemy: 'sword_saint', style: 'blade', color: '#e0e6ff', minEq: 7, realm: 8, elite: true,
    stages: ['The rusted gate', 'Hall of broken blades', 'The saint\'s last stance', 'The sword that remembers'], pay: 330000, items: { void_edge: 1, sever_pill: 2, bloodline_essence: 1 }, heir: 'legendary', desc: 'A Guild secret: a tomb where a Sword Saint\'s intent still kills.' },
  { id: 'heaven_hound', name: 'The Heaven-Devouring Hound', boss: 'Heaven-Devouring Hound', enemy: 'ancient_qilin', style: 'beast', color: '#ffd36f', minEq: 12, realm: 13, elite: true,
    stages: ['A moon goes missing', 'The hound\'s trail', 'Across the starfields', 'The jaws of heaven', 'The last bite'], pay: 2500000, items: { ascend_pill: 2, dao_pill: 3, bloodline_essence: 4, celestial_armor: 1 }, heir: 'mythicChance', desc: 'A Guild secret: something is eating the moons of the upper realms.' },
  { id: 'primordial', name: 'The Primordial Beast', boss: 'Primordial Beast', enemy: 'fallen_immortal', style: 'heaven', color: '#ff2a6d', minEq: 14, realm: 15,
    stages: ['Before the first dawn', 'The world\'s skeleton', 'The womb of chaos', 'The beast wakes', 'Origin'], pay: 5000000, items: { ascend_pill: 3, dao_pill: 4, bloodline_essence: 5, celestial_sword: 1 }, heir: 'mythicChance', desc: 'It was here before the heavens. It would like them back.' },
];
export const HUNT = Object.fromEntries(HUNTS.map(x => [x.id, x]));
export const huntOpen = (c, H) => effRealm(c) >= H.minEq && (!H.elite || !!c.guild?.elite);
export function startHunt(c, id) { if (c.hunt) return null; const H = HUNT[id]; c.hunt = { id, stage: 0, began: G.world.year, last: null };
  ui.cinematic?.({ motif: 'mountain', color: H.color, lines: [H.desc, 'You will not be home for a long time.'], title: H.name, sub: 'The hunt begins', sound: 'heavy' });
  return { text: `I took up the hunt: ${H.name}. ${H.stages.length} stages — one a year, if I survive.`, cls: 'big', big: true }; }
export function abandonHunt(c) { const H = HUNT[c.hunt?.id]; c.hunt = null; return { text: `I abandoned the hunt for the ${H?.boss || 'beast'}. Some prey is not meant to be caught.`, cls: 'bad' }; }
export const canRunStage = c => c.hunt && c.hunt.last !== G.world.year && c.actions >= 2;
export async function huntStage(c) {
  const H = HUNT[c.hunt.id], i = c.hunt.stage, last = i === H.stages.length - 1, e = ENEMIES.find(x => x.id === H.enemy) || ENEMIES[0];
  c.hunt.last = G.world.year; c.actions -= 1; // the runActivity wrapper takes the other action
  const er = clamp(H.minEq + (last ? 1 : 0), 0, REALMS.length - 1); // the final stage is a realm above you
  let def = { ...e, realm: er, hp: Math.round(e.hp * (2.2 + i * 0.3)), str: Math.round(e.str * (1.3 + i * 0.08)), name: `${last ? 'FINAL · ' : ''}${H.boss} — ${H.stages[i]}` };
  ui.cinematic?.({ motif: last ? 'triangle' : 'crack', color: H.color, lines: [`Year ${i + 1} of the hunt.`, H.stages[i] + '.'], title: H.boss, sub: last ? 'Final stage' : `Stage ${i + 1} / ${H.stages.length}`, sound: 'heavy', hold: 1.4 });
  if (ui.bossPhase) def = await ui.bossPhase(c, def, { ...e, name: H.boss }, last);
  const r = await ui.fight(def);
  if (r === 'flee') return { text: `I pulled back from ${H.stages[i].toLowerCase()} to fight another year.`, cls: '' };
  if (r !== 'win') {
    stat(c, 'health', -ri(20, 35)); stat(c, 'stress', 20);
    if (chance(0.22 + i * 0.04 - (perk('d4') ? 0.05 : 0)) && c.alive) { die(c, `torn apart hunting the ${H.boss}`); return { text: `The ${H.boss} killed me.`, cls: 'death' }; }
    return { text: `The ${H.boss} nearly killed me at ${H.stages[i].toLowerCase()}. I crawled back to try again next year.`, cls: 'bad' };
  }
  c.wins++; c.hunt.stage++;
  const part = Math.round(H.pay * 0.08 * wage(c) * (perk('d4') ? 1.1 : 1)); money(c, part); addItem(c, pick(Object.keys(H.items)), 1, rollQuality(c, 0.1));
  addFame(c, (H.minEq + 1) * (H.minEq + 1) * 200, true);
  if (!last) return { text: `Hunt stage cleared: ${H.stages[i]}. Spoils worth ${fmtMoney(c, part)}. The ${H.boss} retreats deeper — next year I follow.`, cls: 'good', big: true };
  // final payout
  const pay = Math.round(H.pay * wage(c) * (perk('d4') ? 1.1 : 1)); money(c, pay);
  for (const [id, n] of Object.entries(H.items)) for (let k = 0; k < n; k++) addItem(c, id, 1, rollQuality(c, 0.2));
  if (H.heir === 'mythicChance') gainHeirloom(c, `the ${H.boss}`, chance(0.25) ? 'mythic' : 'legendary'); else gainHeirloom(c, `the ${H.boss}`, H.heir);
  ensureDna(c).points += 2; META.legacy += 20 + H.realm * 3; if (c.guild) c.guild.merit += 500 + H.realm * 100;
  (c.huntsDone ||= []).push(H.id); c.hunt = null; const relic = dropRelic(c); addFame(c, (H.minEq + 1) * (H.minEq + 1) * 1500);
  ui.cinematic?.({ motif: 'triangle', color: H.color, lines: [`The ${H.boss} falls, and the ground shakes for a day and a night.`, 'Your name will be told for a hundred years.'], title: `${H.boss} Slain`, sub: 'Hunt complete', sound: 'ascend', hold: 2.4 });
  return { text: `THE HUNT IS OVER. I slew the ${H.boss}! Reward: ${fmtMoney(c, pay)}, ${Object.keys(H.items).length} treasures, an heirloom, a Rare Relic (${relic}), 2 Awakening points and lasting fame.`, cls: 'big', big: true };
}

// ---------------- Gods (super rare). They may bless you, or you may fight them for a sliver of their power.
export const GODS = [
  { id: 'pyre', name: 'The Ashen Sovereign', title: 'God of the Western Pyre', color: '#ff6a3d', motif: 'crack', bless: { power: 1.15, heal: 2, life: 12 }, shard: { power: 1.06, train: 1.1 }, blessTxt: '+15% power, +2 Health a year, +12 years', shardTxt: '+6% power, +10% training' },
  { id: 'tide', name: 'Mother of Ten Thousand Tides', title: 'Goddess of the Deep', color: '#4fb3ff', motif: 'lotus', bless: { qi: 1.25, stressMult: 0.7, life: 20 }, shard: { qi: 1.12, breakthrough: 0.03 }, blessTxt: '+25% Qi, stress 30% slower, +20 years', shardTxt: '+12% Qi, +3% breakthrough' },
  { id: 'loom', name: 'The Weaver of Fates', title: 'Goddess of the Loom', color: '#c39bff', motif: 'helix', bless: { loot: 1.5, refund: 0.06, breakthrough: 0.08 }, shard: { loot: 1.2, breakthrough: 0.03 }, blessTxt: '+50% loot, 6% refunded actions, +8% breakthrough', shardTxt: '+20% loot, +3% breakthrough' },
  { id: 'iron', name: 'The Iron Patriarch', title: 'God of War and Forges', color: '#cfd8e3', motif: 'sword', bless: { power: 1.25, train: 1.2 }, shard: { power: 1.1 }, blessTxt: '+25% power, +20% training', shardTxt: '+10% power' },
  { id: 'jade', name: 'The Jade Emperor of the Ninth Sky', title: 'Ruler of Heaven', color: '#7fffb0', motif: 'seal', bless: { breakthrough: 0.12, qi: 1.15, pay: 1.3, life: 25 }, shard: { breakthrough: 0.05, pay: 1.1 }, blessTxt: '+12% breakthrough, +15% Qi, +30% income, +25 years', shardTxt: '+5% breakthrough, +10% income' },
  { id: 'moon', name: 'She Who Eats the Moon', title: 'Goddess of Night', color: '#e0d0f0', motif: 'enso', bless: { social: 1.4, study: 1.3, stressMult: 0.75 }, shard: { study: 1.15, social: 1.1 }, blessTxt: '+40% closeness, +30% study, stress 25% slower', shardTxt: '+15% study, +10% closeness' },
];
export const GOD = Object.fromEntries(GODS.map(g => [g.id, g]));
export const divineMods = c => (c.divine || []).map(d => GOD[d.god]?.[d.kind === 'blessing' ? 'bless' : 'shard']).filter(Boolean);
function bless(c, g) {
  (c.divine ||= []).push({ god: g.id, kind: 'blessing', year: G.world.year, mods: { ...g.bless } });
  ui.cinematic?.({ motif: g.motif, color: g.color, lines: [`${g.name} looks at you — truly looks — and smiles.`, 'Something of heaven settles into your bones.'], title: 'Divine Blessing', sub: g.title, sound: 'ascend', hold: 2.4 });
  ui.log(`${g.name}, ${g.title}, blessed me. (${g.blessTxt})`, 'big');
}
export const GOD_EVENT = { id: 'god', cond: c => c.age >= 16 && !c.flags.metGod, get w() { return 0.04 * (perk('d3') ? 2 : 1); }, run: async c => {
  c.flags.metGod = true; const g = pick(GODS);
  await ui.cinematic?.({ motif: g.motif, color: g.color, threads: 9, lines: ['The world goes silent. Birds stop mid-flight.', `${g.name} — ${g.title} — walks the mortal world today.`], title: g.name, sub: 'A god appears', sound: 'heavy', hold: 1.8 });
  if (chance(0.08 + Math.max(0, c.stats.luck - 50) / 1000)) return bless(c, g); // really rare: an unasked-for blessing
  const v = await ui.choice({ title: g.name, icon: 'crown', text: `${g.title} stands before you, vast and indifferent.\n\nPray and they might bless you (${g.blessTxt}) — but gods rarely listen.\nChallenge them and, if you somehow win, you take a sliver of their power (${g.shardTxt}). Lose, and you will most likely die.`,
    options: [{ label: 'Kneel and pray', value: 'pray' }, { label: 'Challenge the god', value: 'fight' }, { label: 'Look away until it passes', value: 'leave', ghost: true }] });
  if (v === 'pray') { if (chance(0.03 + Math.max(0, c.stats.charisma - 50) / 2000)) return bless(c, g); stat(c, 'happiness', 5); return ui.log(`I prayed. ${g.name} did not answer, but the air felt warm for a while.`); }
  if (v !== 'fight') return ui.log(`I looked away. When I looked back, ${g.name} was gone.`);
  const e = ENEMIES.find(x => x.id === 'fallen_immortal');
  let def = { ...e, kind: 'human', realm: Math.min(REALMS.length - 1, Math.max(12, effRealm(c) + 1)), hp: 7000, str: 340, agi: 130, name: g.name, moves: ['star_fall', 'void_rend', 'qilin_flame', 'thunder_fist'] };
  if (ui.bossPhase) def = await ui.bossPhase(c, def, { ...e, name: g.name }, true);
  const r = await ui.fight(def, { noFlee: true });
  if (r === 'win') {
    (c.divine ||= []).push({ god: g.id, kind: 'shard', year: G.world.year, mods: { ...g.shard } }); c.flags.godSlayer = true; c.wins++; addFame(c, 100000);
    await ui.cinematic?.({ motif: 'triangle', color: g.color, lines: [`${g.name} kneels — not in defeat, but in curiosity.`, '"Take it, then." A sliver of godhood burns into you.'], title: 'Godslayer', sub: g.title, sound: 'ascend', hold: 2.4 });
    return ui.log(`I fought ${g.name} and won a sliver of divine power. (${g.shardTxt})`, 'big');
  }
  if (chance(0.55)) return die(c, `struck down by ${g.name}`);
  stat(c, 'health', -50); stat(c, 'happiness', -20); ui.log(`${g.name} swatted me aside like an insect. I survived — barely.`, 'bad');
} };
export const GOD_ACHIEVEMENTS = [
  { id: 'god_seen', name: 'Witness', desc: 'Meet a god.', pts: 10, check: c => !!c.flags.metGod },
  { id: 'god_blessed', name: 'Chosen of Heaven', desc: 'Receive a divine blessing.', pts: 30, check: c => (c.divine || []).some(d => d.kind === 'blessing') },
  { id: 'god_slayer', name: 'Godslayer', desc: 'Defeat a god.', pts: 50, check: c => !!c.flags.godSlayer },
  { id: 'hunter_legend', name: 'Legend of the Hunt', desc: 'Complete an end-game hunt.', pts: 25, check: c => (c.huntsDone || []).length >= 1 },
  { id: 'hunt_all', name: 'Nothing Left to Hunt', desc: 'Complete every end-game hunt in one life.', pts: 60, check: c => (c.huntsDone || []).length >= HUNTS.length },
];
