// v0.9.4 Fable Quests: legendary stories opened at 1,000,000 Fame.
// Time stands still inside a Fable (no aging, no decay, no actions). Dying inside one is final.
// Each Fable can be finished once per life. Rewards: a permanent Title (all stack), fable-only gear,
// a fable heirloom, and whatever the story did to your body and mind follows you home.
import { G, save } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, clamp, chance } from '../core/rng.js';
import { stat, addItem, die } from './life.js';
import { ENEMIES } from '../data/combat.js';
import { REALMS } from '../data/realms.js';
import { HEIRLOOMS, HEIRLOOM_TIERS } from '../data/heirlooms.js';
import { effRealm } from './path.js';
import { eff, ensureBody, hitBody } from './body.js';
import { ITEMS } from '../data/items.js';
import { addFame } from './renown.js';

export const FABLE_FAME = 1e6;
export const STAT_NAME = { strength: 'Strength', agility: 'Agility', smarts: 'Smarts', charisma: 'Charisma', luck: 'Luck', battle: 'Battle' };

export const TITLES = {
  lantern: { name: 'Lantern-Walker', color: '#ff9d5c', desc: '+6% Qi, +5% closeness, stress builds 8% slower.', mods: { qi: 1.06, social: 1.05, stressMult: 0.92 } },
  library: { name: 'Keeper of Drowned Pages', color: '#5fc8ff', desc: '+12% study, +3% breakthrough.', mods: { study: 1.12, breakthrough: 0.03 } },
  pilgrim: { name: 'Iron Pilgrim', color: '#c0c8d8', desc: '+5% combat power, +8% training, heal 10% faster.', mods: { power: 1.05, train: 1.08, healRate: 1.1 } },
  moon:    { name: "Moon's Creditor", color: '#d8d0ff', desc: '+15% loot, +8% salary, +2 years of life.', mods: { loot: 1.15, pay: 1.08, life: 2 } },
  fabled:  { name: 'The Fabled', color: '#ffd36f', desc: 'Finished every Fable. +5% Qi, +3% combat power, +3 years of life.', mods: { qi: 1.05, power: 1.03, life: 3 } },
};

// ---------- the stories ----------
// node: { text: [..] | c => [..], opts: [opt], puzzle?, end? }
// opt: { t, go, check: { s, d }, fail, pen, on, need, not, set, fight: { foe, name, mult, boss }, deadly, leave }
// pen/on: { health, stress, hit: { amount, type, group }, sever: partId, scar: { name, desc, mods } }
export const FABLES = [
  { id: 'lantern', name: 'The Lantern Bride', icon: 'lantern', color: '#ff9d5c', gear: 'fable_locket', heir: 'red_lantern',
    blurb: 'A ghost town of red lanterns, and a wedding procession with no groom.',
    nodes: {
      start: { text: ['You step through a paper door into a town where every lantern burns red and every face is painted white.', 'A wedding procession turns the corner: drums, paper money, a sealed red sedan. There is no groom.', 'The matchmaker turns her painted face toward you. "You\'re late."'],
        opts: [{ t: 'Fall in with the procession', go: 'procession' }, { t: 'Slip into a side alley', check: { s: 'agility', d: 0 }, go: 'alley', fail: 'caught' }, { t: 'Step back through the paper door', leave: true }] },
      alley: { text: ['An old man sells unlit lanterns in the alley. He doesn\'t look up.', '"She died the night before her wedding. Her groom ran. Now she takes whoever drinks her wine."', '"She doesn\'t want a husband. She wants someone to say it out loud."'],
        opts: [{ t: 'Thank him and follow the drums', go: 'procession', set: 'truth' }] },
      caught: { text: ['Paper hands close on your collar. The servants of the procession are made of folded joss paper — and they are very strong.'],
        opts: [{ t: 'Fight your way free', fight: { foe: 'hungry_ghost', name: 'Paper Servants', mult: 0.85 }, go: 'procession' }] },
      procession: { text: ['The sedan is sealed with talismans written backwards. The matchmaker presses a cup into your hand.', '"Drink to the bride." The wine smells of wet earth.'],
        opts: [{ t: 'Drink it', go: 'hall', set: 'drank', on: { stress: 8 } }, { t: 'Pour it into your sleeve', check: { s: 'agility', d: 0.05 }, go: 'hall', fail: 'matchmaker' },
          { t: 'Study the backwards talismans', check: { s: 'smarts', d: 0.1 }, go: 'hall', set: 'talisman', fail: 'hall', pen: { health: 10, hit: { amount: 18, type: 'burn', group: 'arms' } } }] },
      matchmaker: { text: ['The matchmaker sees the wet sleeve. Her smile splits past her ears.'],
        opts: [{ t: 'Fight the Painted Matchmaker', fight: { foe: 'fox_spirit', name: 'The Painted Matchmaker', mult: 0.95 }, go: 'hall' }] },
      hall: { text: ['The procession ends in an ancestral hall. One tablet on the altar has no name.', 'The bride sits behind a red veil. "Lift my veil, if you are my groom."'],
        opts: [{ t: 'Lift the veil', go: 'face', not: 'drank' }, { t: 'Lift the veil', go: 'married', need: 'drank' },
          { t: 'Burn the backwards talisman to free her', need: 'talisman', go: 'freed' },
          { t: 'Tell her the truth: he ran, and she deserved better', need: 'truth', check: { s: 'charisma', d: 0 }, go: 'freed', fail: 'rage' },
          { t: 'Draw your weapon', go: 'rage' }] },
      face: { text: ['Under the veil is your own face, painted white. Its lips move with your voice:', '"Everyone carried me to her door, and no one carried me home. I was lit for her, and burned out waiting. What am I?"'],
        opts: [{ t: 'The lantern', go: 'freed' }, { t: 'The groom', go: 'rage', on: { health: 10 } }, { t: 'Her coffin', go: 'rage', on: { health: 10 } }, { t: 'The wine', go: 'rage', on: { health: 10 } }] },
      married: { text: ['The veil lifts itself. A red thread is already tied around your finger, and the other end disappears into her sleeve.', 'The guests applaud. You are married.'],
        opts: [{ t: 'Accept the ghost marriage', go: 'end_dark', on: { scar: { name: 'Ghost-wed', desc: 'A dead bride walks beside you. +8% Qi, but people feel the cold around you (-10% closeness).', mods: { qi: 1.08, social: 0.9 } } } },
          { t: 'Cut the red thread', check: { s: 'strength', d: 0.1 }, go: 'face', fail: 'rage', pen: { health: 16, hit: { amount: 20, type: 'cut', group: 'arms' } } }] },
      rage: { text: ['The lanterns flare white. Her grief becomes a storm of paper and fire.'],
        opts: [{ t: 'Face the Lantern Bride', fight: { foe: 'ghost_king', name: 'The Lantern Bride', boss: true }, go: 'end_good' }] },
      freed: { text: ['She lifts the veil herself. Her face is young, and finally tired.', 'One by one the lanterns go out, and the town folds itself up like a letter nobody needs to send.'], end: 'best' },
      end_good: { text: ['The last paper flame dies. A single red lantern is left on the street, still warm.'], end: 'good' },
      end_dark: { text: ['You walk back through the paper door. The thread on your finger stays. So does she.'], end: 'dark' },
    } },
  { id: 'library', name: 'The Drowned Library', icon: 'study', color: '#5fc8ff', gear: 'fable_robe', heir: 'unfinished_book',
    blurb: 'A library under black water. Three stolen books, and a rising tide.',
    nodes: {
      start: { text: ['Cold water to your knees. Shelves vanish up into the dark and down into the deeper dark.', 'A librarian with no eyes floats toward you. "Return what you borrowed."', 'You have borrowed nothing. Yet there is a book in your hand: your own life, half written.'],
        opts: [{ t: 'Ask what you borrowed', go: 'task' }, { t: 'Open the book', go: 'book', set: 'read', on: { stress: 10 } }, { t: 'Wade back the way you came', leave: true }] },
      book: { text: ['You read your childhood, your first fight, last year\'s mistakes. The ink is still wet on today.', 'The last sentence stops halfway. The librarian closes the book gently. "Not yet."'], opts: [{ t: 'Listen to her', go: 'task' }] },
      task: { text: ['"Three books were stolen from the Drowned Stacks: Fire, Salt and Silence. Return them before the tide reaches the top shelf, or become a page yourself."'], opts: [{ t: 'Go to the Fire wing', go: 'fire' }] },
      fire: { text: ['The Fire wing is sealed by a lock of five glyphs. Carved above it:', '"The moon rises before the sun. The stars come after both. The small star waits for the great one, and the diamond is last of all."'],
        puzzle: { glyphs: ['◆', '✦', '☾', '✧', '☀'], answer: ['☾', '☀', '✦', '✧', '◆'], tries: 3, pen: { health: 8 } }, ok: 'fire_ok', fail: 'fire_fail' },
      fire_ok: { text: ['The lock sighs open. The Book of Fire is warm in your hands.'], opts: [{ t: 'Go on to the Salt wing', go: 'salt', set: 'b_fire' }] },
      fire_fail: { text: ['The glyphs boil the water around you. You stagger out of the Fire wing burned and empty-handed.'], opts: [{ t: 'Go on to the Salt wing', go: 'salt', on: { health: 12, hit: { amount: 20, type: 'burn' } } }] },
      salt: { text: ['A drowned scholar sits at a desk, the Book of Salt under his elbow. "Win it from me," he says, "or pay for it."'],
        opts: [{ t: 'Debate him for it', check: { s: 'smarts', d: 0.15 }, go: 'salt_ok', fail: 'salt_fight' },
          { t: 'Trade him a memory', go: 'salt_ok', on: { scar: { name: 'Forgotten childhood', desc: 'You gave your childhood to a drowned scholar. -6% closeness, but +4% study.', mods: { social: 0.94, study: 1.04 } } } },
          { t: 'Take it by force', go: 'salt_fight' }] },
      salt_fight: { text: ['The scholar\'s skin sloughs into black water. What stands up is not a scholar.'], opts: [{ t: 'Fight', fight: { foe: 'drowned_ghost', name: 'The Drowned Scholar', mult: 1 }, go: 'salt_ok' }] },
      salt_ok: { text: ['The Book of Salt crusts your fingers white.'], opts: [{ t: 'Go on to the Silence wing', go: 'silence', set: 'b_salt' }] },
      silence: { text: ['No sound in here, not even your heartbeat. Words glow on the wall:', '"The more of me you take, the more you leave behind."'],
        opts: [{ t: 'Footsteps', go: 'silence_ok' }, { t: 'Time', go: 'silence_bad' }, { t: 'Breath', go: 'silence_bad' }, { t: 'Memories', go: 'silence_bad' }] },
      silence_bad: { text: ['Your answer comes out as a scream. Something in the stacks hears it.'],
        opts: [{ t: 'Fight the Silent Archivist', fight: { foe: 'void_wraith', name: 'The Silent Archivist', mult: 0.95 }, go: 'silence_ok' }, { t: 'Run, without the book', go: 'tide', on: { health: 8 } }] },
      silence_ok: { text: ['The Book of Silence weighs nothing at all.'], opts: [{ t: 'Return to the librarian', go: 'tide', set: 'b_sil' }] },
      tide: { text: s => [`The tide is at the second-highest shelf. You carry ${['b_fire', 'b_salt', 'b_sil'].filter(f => s.flags[f]).length} of the three books.`],
        opts: [{ t: 'Hand them over', need3: true, go: 'end_best' }, { t: 'Hand over what you have', not3: true, go: 'tidelord' }] },
      tidelord: { text: ['"Not enough." The librarian\'s face opens like a book, and the tide stands up behind her.'],
        opts: [{ t: 'Face the Tide-Librarian', fight: { foe: 'fallen_immortal', name: 'The Tide-Librarian', boss: true }, go: 'end_good' }] },
      end_best: { text: s => ['The librarian shelves all three books. The water drains like a held breath let go.', ...(s.flags.read ? ['She hands back your own book. The last sentence is still unfinished. "You get to write that one."'] : [])], end: 'best' },
      end_good: { text: ['The library collapses into a puddle at your feet. A single soaked book floats in it.'], end: 'good' },
    } },
  { id: 'pilgrim', name: 'The Iron Pilgrim', icon: 'shield', color: '#c0c8d8', gear: 'fable_sword', heir: 'general_seal',
    blurb: 'Carry a dead general\'s sword to the Mountain of Oaths before dawn.',
    nodes: {
      start: { text: ['A general in rusted armour sits by a dead fire. "Carry my sword to the Mountain of Oaths before dawn," he says. "I cannot lift it any more."'],
        opts: [{ t: 'Take the sword', go: 'pass' }, { t: 'Ask why he can\'t', go: 'lore' }, { t: 'Walk away', leave: true }] },
      lore: { text: ['"Because I died thirty years ago," he says simply. "My oath is the only thing still standing. The thing at the gate is the part of me that broke it."'], opts: [{ t: 'Take the sword', go: 'pass', set: 'lore' }] },
      pass: { text: ['Bandits of bone block the pass. They still wear the colours of the general\'s army.'],
        opts: [{ t: 'Cut through them', fight: { foe: 'jiangshi', name: 'Bone Bandits', mult: 0.9 }, go: 'bridge' },
          { t: 'Stare them down', check: { s: 'strength', d: 0.05 }, go: 'bridge', fail: 'pass_fight' },
          { t: 'Creep past along the cliff', check: { s: 'agility', d: 0.1 }, go: 'bridge', fail: 'pass_fight', pen: { health: 8 } }] },
      pass_fight: { text: ['A bone hand grabs your ankle. The whole pass turns toward you.'], opts: [{ t: 'Fight', fight: { foe: 'jiangshi', name: 'Bone Bandits', mult: 1.05 }, go: 'bridge' }] },
      bridge: { text: ['A bridge made of chains crosses nothing at all. A Toll-Keeper of black stone waits at the near end.', '"An arm," it grinds. "That is the toll. Or cross without paying, if you can."'],
        opts: [{ t: 'Pay the toll: give up your left arm', go: 'gate', set: 'toll', on: { sever: 'arm_l', health: 12 } },
          { t: 'Run across the chains', check: { s: 'agility', d: 0.15 }, go: 'gate', fail: 'fall' },
          { t: 'Fight the Toll-Keeper', fight: { foe: 'stone_golem', name: 'The Toll-Keeper', mult: 1.1 }, go: 'gate' }] },
      fall: { text: ['A chain snaps. You catch another with your left arm, and the bridge takes its toll anyway.'], opts: [{ t: 'Haul yourself up', go: 'gate', set: 'toll', on: { sever: 'arm_l', health: 18 } }] },
      gate: { text: ['At the mountain gate stands the general — younger, laughing, eyes like coals. The oathbreaker.'],
        opts: [{ t: 'Remind him of the oath', need: 'lore', check: { s: 'charisma', d: 0.1 }, go: 'gate_weak', fail: 'oathbreaker' }, { t: 'Draw the general\'s sword', go: 'oathbreaker' }] },
      gate_weak: { text: ['He flinches as if struck. For a moment he looks thirty years older. Then he raises his blade anyway — but slower.'], opts: [{ t: 'Fight', fight: { foe: 'heavenly_demon', name: 'The Oathbreaker (shaken)', boss: true, mult: 0.75 }, go: 'summit' }] },
      oathbreaker: { text: ['He grins. "Let\'s see whose oath is stronger."'], opts: [{ t: 'Fight', fight: { foe: 'heavenly_demon', name: 'The Oathbreaker', boss: true }, go: 'summit' }] },
      summit: { text: s => ['You plant the sword at the summit as dawn breaks. Far below, the old general kneels and finally fades.', ...(s.flags.toll ? ['The Toll-Keeper is waiting on the way down. "The mountain pays its debts." It holds out an arm of grey Fablesteel.'] : [])], end: s => s.flags.toll ? 'best' : 'good' },
    } },
  { id: 'moon', name: 'The Moon That Owed a Debt', icon: 'moon', color: '#d8d0ff', gear: 'fable_ring', heir: 'moon_coin',
    blurb: 'The moon is paying her debts with counterfeit coin, and the night market is going blind.',
    nodes: {
      start: { text: ['A night market under a sky with no moon. Every seller has milky eyes.', 'At the end of the row, a pale merchant counts silver that doesn\'t clink.'],
        opts: [{ t: 'Approach the pale merchant', go: 'merchant' }, { t: 'Ask the blind sellers what happened', go: 'sellers' }, { t: 'Leave the market', leave: true }] },
      sellers: { text: ['"She owes the world one night of light," whispers an old fruit seller. "She pays in false coin. Every coin she spends takes someone\'s sight."'], opts: [{ t: 'Go to the merchant', go: 'merchant', set: 'witness' }] },
      merchant: { text: ['The merchant smiles with a face like a lamp behind paper. "A game? Three cups. Under one is what I owe. Find it, and I\'ll pay."'],
        opts: [{ t: 'Trust your luck', check: { s: 'luck', d: 0.1 }, go: 'paid', fail: 'lost' }, { t: 'Watch her hands', check: { s: 'smarts', d: 0.2 }, go: 'paid', fail: 'lost' },
          { t: 'Refuse to play, and name her debt', need: 'witness', check: { s: 'charisma', d: 0 }, go: 'honest', fail: 'lost' }] },
      lost: { text: ['"Wrong cup." Her laugh is cold light. "Now you owe me."', 'Pale hounds pour out from under the stalls.'],
        opts: [{ t: 'Fight the Moon Hounds', fight: { foe: 'tiger_beast', name: 'Moon Hounds', mult: 1.1 }, go: 'second' }] },
      second: { text: ['The hounds dissolve into moonlight. The merchant tilts her head. "You still owe me. A year of your life would settle it."'],
        opts: [{ t: 'Pay a year of your life', go: 'paid', on: { scar: { name: 'Moon-debt', desc: 'You paid the moon with your own years. -3 years of life.', mods: { life: -3 } } } },
          { t: 'Try the cups again', check: { s: 'luck', d: 0.2 }, go: 'paid', fail: 'end_cold', pen: { health: 14 } }] },
      honest: { text: ['The merchant\'s smile slips. "My coins are false," she admits, "because the sun stole my light, and I have nothing real left to pay with."', 'Somewhere above, something too bright is laughing.'],
        opts: [{ t: 'Go and take her light back', fight: { foe: 'sword_saint', name: 'The Sun-Thief', boss: true }, go: 'end_best' }] },
      paid: { text: ['She lifts the middle cup. Under it is a single real coin, and when it touches the table the whole market lights up silver. The sellers blink. They can see.'],
        opts: [{ t: 'Ask for a share of the light', go: 'end_good', on: { scar: { name: 'Moon-touched', desc: 'Moonlight clings to you. +10% loot, but stress builds 5% faster.', mods: { loot: 1.1, stressMult: 1.05 } } } }, { t: 'Ask for nothing', go: 'end_best' }] },
      end_cold: { text: ['You lose again. The merchant takes her payment from your bones and lets you go, shivering. The market stays dark — but you are free.'], end: 'good', endPen: { health: 10, scar: { name: 'Moon-chilled', desc: 'Your bones remember the cold. Heal 8% slower.', mods: { healRate: 0.92 } } } },
      end_good: { text: ['The moon rises over the market, a little brighter than before.'], end: 'good' },
      end_best: { text: ['The moon rises whole and bright. As she goes, the merchant presses a coin into your palm. This one is real.'], end: 'best' },
    } },
];
export const FABLE = Object.fromEntries(FABLES.map(f => [f.id, f]));

// ---------- state helpers ----------
const st = c => (c.fables ||= { done: [], sealed: {}, titles: [], scars: [] });
export const fableTitles = c => (c.fables?.titles || []).map(id => TITLES[id]).filter(Boolean);
export const fableMods = c => [...fableTitles(c).map(t => t.mods), ...(c.fables?.scars || []).map(s => s.mods)];
export const fablesOpen = c => (c.fame || 0) >= FABLE_FAME;
export function fableStatus(c, f) {
  const s = st(c);
  if (s.done.includes(f.id)) return { ok: false, why: 'Finished this life' };
  if (c.fableRun) return { ok: c.fableRun.id === f.id, why: c.fableRun.id === f.id ? 'In progress' : 'Another Fable is open' };
  if ((s.sealed[f.id] || 0) > G.world.year) return { ok: false, why: `Sealed for ${s.sealed[f.id] - G.world.year} more year${s.sealed[f.id] - G.world.year > 1 ? 's' : ''}` };
  if (!fablesOpen(c)) return { ok: false, why: `Needs ${FABLE_FAME.toLocaleString()} Fame` };
  if (c.age < 18 || c.prison || c.otherworld) return { ok: false, why: c.prison ? 'You are in prison' : c.otherworld ? 'You are in another world' : 'Too young' };
  return { ok: true };
}
export const checkChance = (c, s, d = 0) => clamp(0.2 + eff(c, s) / 100 * 0.72 - d, 0.08, 0.95);
const textOf = (n, s) => (typeof n.text === 'function' ? n.text(s) : n.text) || [];

function applyPen(c, P, notes) {
  if (!P) return;
  if (P.health) { stat(c, 'health', -P.health); notes.push(`−${P.health} Health`); }
  if (P.stress) { stat(c, 'stress', P.stress); notes.push(`+${P.stress} Stress`); }
  if (P.hit) { ensureBody(c); const r = hitBody(c, { ratio: 1.2, ...P.hit }); if (r.text) notes.push(r.text); }
  if (P.sever) { ensureBody(c); const s = c.body.parts[P.sever]; if (s && !s.missing) { s.missing = true; s.lostAt = c.age; s.inj = []; c.flags.limbLost = true; ui.fx?.('limb'); notes.push(`${P.sever === 'arm_l' ? 'Left arm' : P.sever} lost — for real`); } }
  if (P.scar) { const S = st(c); if (!S.scars.some(x => x.name === P.scar.name)) { S.scars.push(P.scar); notes.push(`Marked: ${P.scar.name}`); } }
}
const optVisible = (o, s) => (!o.need || s.flags[o.need]) && (!o.not || !s.flags[o.not]) && (!o.need3 || ['b_fire', 'b_salt', 'b_sil'].every(f => s.flags[f])) && (!o.not3 || !['b_fire', 'b_salt', 'b_sil'].every(f => s.flags[f]));

// The engine. UI adapter: { say(lines, cls), choose(opts) -> index, puzzle(spec) -> bool, note(text, cls), done() }
export async function playFable(c, id, UI) {
  const F = FABLE[id]; if (!F) return null;
  if (!c.fableRun) { c.fableRun = { id, node: 'start', flags: {} }; ui.log(`I stepped into a Fable: ${F.name}. Outside, time stopped.`, 'big'); }
  const run = c.fableRun; save();
  while (c.alive) {
    const n = F.nodes[run.node]; UI.say(textOf(n, run));
    if (n.end) return finish(c, F, typeof n.end === 'function' ? n.end(run) : n.end, n.endPen, UI);
    let next = null;
    if (n.puzzle) { const ok = await UI.puzzle(n.puzzle, pen => { const notes = []; applyPen(c, pen, notes); UI.note(notes.join(' · '), 'bad'); save(); return c.stats.health > 0; }); next = ok ? n.ok : n.fail; }
    else {
      const opts = n.opts.filter(o => optVisible(o, run));
      const shown = opts.map(o => ({ label: o.t, leave: o.leave, fight: !!o.fight, boss: o.fight?.boss,
        chance: o.check ? checkChance(c, o.check.s, o.check.d) : null, stat: o.check ? STAT_NAME[o.check.s] : null }));
      const o = opts[await UI.choose(shown)];
      if (o.leave) { st(c).sealed[F.id] = G.world.year + 3; c.fableRun = null; ui.log(`I turned back from ${F.name}. The way in closed behind me for three years.`, 'muted'); save(); return 'left'; }
      const notes = []; if (o.set) run.flags[o.set] = true; applyPen(c, o.on, notes);
      if (o.check) { const ok = Math.random() < checkChance(c, o.check.s, o.check.d); UI.note(`${STAT_NAME[o.check.s]} check: ${ok ? 'passed' : 'failed'}`, ok ? 'good' : 'bad'); if (!ok) { applyPen(c, o.pen, notes); if (o.deadly) { notes.length && UI.note(notes.join(' · '), 'bad'); return fableDeath(c, F, UI); } } next = ok ? o.go : o.fail; if (!ok && o.set) delete run.flags[o.set]; }
      else if (o.fight) {
        const e = ENEMIES.find(x => x.id === o.fight.foe), r = clamp(effRealm(c) + (o.fight.boss ? 1 : 0), 1, REALMS.length - 1), m = o.fight.mult ?? (o.fight.boss ? 1.05 : 0.95);
        UI.hide?.(); const res = await ui.fight({ ...e, realm: r, hp: Math.round(e.hp * m), str: Math.round(e.str * m), name: o.fight.name }, { noFlee: true }); UI.show?.();
        if (res !== 'win') return fableDeath(c, F, UI);
        c.wins++; UI.note(`${o.fight.name} defeated.`, 'good'); next = o.go;
      } else next = o.go;
      if (notes.length) UI.note(notes.join(' · '), 'bad');
    }
    if (c.stats.health <= 0) return fableDeath(c, F, UI);
    run.node = next; save();
  }
  return null;
}
function fableDeath(c, F, UI) {
  c.fableRun = null; die(c, `lost inside the Fable "${F.name}" — no one comes back from a Fable twice`);
  UI.say(['The story closes over you like water. There is no waking up from this one.'], 'death'); save(); return 'dead';
}
function finish(c, F, tier, endPen, UI) {
  const S = st(c), notes = []; applyPen(c, endPen, notes);
  S.done.push(F.id); if (!S.titles.includes(F.id)) S.titles.push(F.id); c.fableRun = null;
  const fame = tier === 'best' ? 150000 : 100000; addFame(c, fame, true);
  addItem(c, F.gear, 1, 'hi'); const gearName = ITEMS[F.gear].name;
  const H = HEIRLOOMS[F.heir]; if (!(c.heirlooms || []).some(x => x.id === F.heir)) (c.heirlooms ||= []).push({ id: F.heir, tier: H.tier, found: `${c.first} ${c.last}`, year: G.world.year, how: F.name, gens: 0 });
  const got = [`Title: ${TITLES[F.id].name}`, `${gearName} (High grade)`, `${HEIRLOOM_TIERS[H.tier].name} heirloom: ${H.name}`, `Fame +${fame.toLocaleString()}`];
  if (tier === 'best') { addItem(c, 'dao_pill', 1, 'hi'); addItem(c, 'ascend_pill', 1, 'hi'); got.push('Dao Insight Incense + Ascension Lotus Pill (best ending)'); }
  if (F.id === 'pilgrim') { c.flags.fableSmith = true; ensureBody(c); for (const id of ['arm_l', 'arm_r', 'leg_l', 'leg_r', 'hand_l', 'hand_r', 'foot_l', 'foot_r']) { const s = c.body.parts[id], par = PART_PARENT[id]; if (s?.missing && !(par && c.body.parts[par].missing)) { const k = id.split('_')[0]; s.prosthetic = k + '3'; got.push(`Fablesteel ${k} fitted`); } } got.push('Doctors can now fit you with Fablesteel limbs for free'); }
  if (S.titles.filter(t => FABLE[t]).length === FABLES.length && !S.titles.includes('fabled')) { S.titles.push('fabled'); got.push('Title: The Fabled (every Fable finished)'); }
  if (notes.length) got.push(...notes);
  ui.log(`I finished the Fable ${F.name}${tier === 'best' ? ' — the best way it could end' : tier === 'dark' ? ', but it followed me home' : ''}. ${got.join('; ')}.`, 'big');
  ui.cinematic?.({ motif: 'lotus', color: F.color, lines: [tier === 'dark' ? 'You come back. Not alone.' : 'The story lets you go.', `You are now known as ${TITLES[F.id].name}.`], title: F.name, sub: tier === 'best' ? 'Fable completed · best ending' : 'Fable completed', sound: 'ascend', hold: 2.2 });
  UI.done?.(got, tier); save(); return tier;
}
const PART_PARENT = { hand_l: 'arm_l', hand_r: 'arm_r', foot_l: 'leg_l', foot_r: 'leg_r' };

