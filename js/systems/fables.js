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
  mirror:  { name: 'Mirror-Breaker', color: '#bfe6ff', desc: '+6% closeness, +4% combat power, stress builds 5% slower.', mods: { social: 1.06, power: 1.04, stressMult: 0.95 } },
  ferry:   { name: "Ferryman's Heir", color: '#6fd3c8', desc: '+2 years of life, heal 10% faster, spirits hurt you less.', mods: { life: 2, healRate: 1.1, spiritBane: 1.12 } },
  tiger:   { name: 'Tiger-Tamer', color: '#ffb02e', desc: '+5% combat power, +8% loot, you act first more often.', mods: { power: 1.05, loot: 1.08, initiative: 1.1 } },
  kitchen: { name: "Kitchen God's Favourite", color: '#ff7a4a', desc: 'Pills work 10% better, +5 crafting, +5% closeness.', mods: { pill: 1.1, craft: 5, social: 1.05 } },
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
  // ---------- v0.9.27 four more Fables
  { id: 'mirror', name: 'The Thousand-Mirror Palace', icon: 'eye', color: '#bfe6ff', gear: 'fable_mirror', heir: 'true_reflection',
    blurb: 'A palace of mirrors where your reflection has decided it would make a better you.',
    nodes: {
      start: { text: ['You wake on a floor of polished silver. Every wall is a mirror, and every mirror shows you — a heartbeat late.', 'One reflection does not wait. It smiles first. "Finally," it says. "You took your time getting old."'],
        opts: [{ t: 'Ask it what it wants', go: 'wants' }, { t: 'Smash the mirror', check: { s: 'strength', d: 0.05 }, go: 'shards', fail: 'cut', pen: { health: 8, hit: { amount: 16, type: 'cut', group: 'arms' } } }, { t: 'Look for a way out', leave: true }] },
      wants: { text: ['"Your life," it says, as if it were obvious. "I\'ve watched every mistake from the wrong side of the glass. I would make fewer."', '"Find the Throne Mirror before I do. Whoever sits on it walks out of here."'],
        opts: [{ t: 'Race it to the throne', go: 'halls', set: 'race' }] },
      shards: { text: ['The mirror bursts into a thousand pieces. In every shard, the reflection laughs.', 'The shards fly back together behind you. The halls rearrange themselves.'], opts: [{ t: 'Search the halls', go: 'halls' }] },
      cut: { text: ['The glass will not break. Your knuckles do. Behind it, the reflection winces in perfect sympathy — and then grins.'], opts: [{ t: 'Search the halls', go: 'halls' }] },
      halls: { text: ['The halls branch into three. In the left, the mirrors show you as a child. In the middle, as you are. In the right, as an old, old person.'],
        opts: [{ t: 'The child\'s hall', go: 'child' }, { t: 'The hall of now', go: 'now' }, { t: 'The elder\'s hall', go: 'elder' }] },
      child: { text: ['Your child-self sits on the floor, crying over a broken toy you had forgotten about.', '"You promised you\'d fix it," the child says.'],
        opts: [{ t: 'Sit down and fix it', check: { s: 'smarts', d: 0 }, go: 'gate', set: 'kind', fail: 'gate', on: { stress: -6 } }, { t: 'Walk past', go: 'gate', on: { stress: 6 } }] },
      now: { text: ['A hundred copies of you fight each other in the mirrors, each one convinced it is the real one.', 'Three step out of the glass and turn on you.'],
        opts: [{ t: 'Fight the copies', fight: { foe: 'fox_spirit', name: 'Mirror Copies', mult: 0.95 }, go: 'gate' }, { t: 'Stand perfectly still until they lose interest', check: { s: 'battle', d: 0.1 }, go: 'gate', fail: 'now_fight' }] },
      now_fight: { text: ['One of them flinches. Then all of them do. Then they are on you.'], opts: [{ t: 'Fight', fight: { foe: 'fox_spirit', name: 'Mirror Copies', mult: 1.05 }, go: 'gate' }] },
      elder: { text: ['Your old self sits in a chair that is slowly becoming a mirror. "Don\'t let it take the throne," they say. "It doesn\'t know how to lose. You do. That\'s worth more."', 'They press something into your hand: a shard that reflects nothing.'],
        opts: [{ t: 'Take the blank shard', go: 'gate', set: 'blank' }] },
      gate: { text: ['A door of six glyphs bars the throne room. Words are scratched backwards into the frame:', '"Light first, then the one that answers it. The eye opens after both. The water remembers the eye. The flame is always second to last, and the key comes home at the end."'],
        puzzle: { glyphs: ['🔑', '☀', '◐', '👁', '≈', '🜂'], answer: ['☀', '◐', '👁', '≈', '🜂', '🔑'], tries: 3, pen: { health: 8 } }, ok: 'throne', fail: 'gate_fail' },
      gate_fail: { text: ['The door turns into a mirror and spits you back out into the halls — where your reflection is waiting.'], opts: [{ t: 'Fight your way past it', fight: { foe: 'sword_saint', name: 'Your Reflection', mult: 0.85 }, go: 'throne_late' }] },
      throne: { text: s => ['You reach the Throne Mirror first. It is huge and very old, and your reflection is already climbing out of it.', ...(s.flags.kind ? ['Behind it, a small figure — the child you helped — holds onto its ankle.'] : [])],
        opts: [{ t: 'Hold up the blank shard', need: 'blank', go: 'end_best' }, { t: 'Tell it you forgive it for being you', check: { s: 'charisma', d: 0.15 }, go: 'end_best', fail: 'boss', set: 'mercy' }, { t: 'Sit on the throne', go: 'end_dark' }, { t: 'Fight it at the throne', go: 'boss' }] },
      throne_late: { text: ['Bruised, you reach the throne room. Your reflection is sitting on it already, wearing your face better than you do.'], opts: [{ t: 'Drag it off the throne', go: 'boss' }] },
      boss: { text: ['It stands. Every mirror in the palace turns to watch.', '"Let\'s settle it the honest way," it says. "With everything you are."'],
        opts: [{ t: 'Face your Reflection', fight: { foe: 'sword_saint', name: 'Your Reflection, Perfected', boss: true }, go: 'end_good' }] },
      end_best: { text: ['Your reflection looks into the blank glass — or into your eyes — and sees nothing it wants to be except what it already is.', 'It steps back into the mirror, a heartbeat late, the way it is supposed to be. The palace dims, gently, like a lamp being turned down.'], end: 'best' },
      end_good: { text: ['The perfected reflection shatters. When you look into the shards, they show you a heartbeat late again.'], end: 'good' },
      end_dark: { text: ['The throne is cold. You walk out of the palace. Behind you, something in the glass walks out too — and it is not quite in time with you any more.'], end: 'dark',
        endPen: { scar: { name: 'Out of step', desc: 'Your reflection moves a moment before you do. +6% combat power (you always know what you\'ll do next), but stress builds 8% faster.', mods: { power: 1.06, stressMult: 1.08 } } } },
    } },
  { id: 'ferry', name: "The Ferryman's Last Crossing", icon: 'water', color: '#6fd3c8', gear: 'fable_oar', heir: 'ferry_bell',
    blurb: 'The ferryman of the dead wants to retire. Someone has to row tonight.',
    nodes: {
      start: { text: ['Mist, a black river, and a flat boat at a wooden jetty. The old ferryman hands you his oar before you can say anything.', '"One last crossing, then I rest," he says. "You row. I\'ll tell you who to take."'],
        opts: [{ t: 'Take the oar', go: 'jetty' }, { t: 'Ask what happens if you refuse', go: 'refuse' }, { t: 'Walk back into the mist', leave: true }] },
      refuse: { text: ['"Then the dead pile up on this side," he says, "and the living start to hear them at night. Your choice."'], opts: [{ t: 'Take the oar', go: 'jetty', set: 'asked' }] },
      jetty: { text: ['Three souls wait on the jetty. The boat will only carry two of them and you.', 'A soldier who died saving his squad. A mother who died in childbirth, still asking about her baby. A merchant who offers you gold for a seat.'],
        opts: [{ t: 'Take the soldier and the mother', go: 'river', set: 'right' }, { t: 'Take the merchant and his gold', go: 'river', set: 'gold' },
          { t: 'Try to fit all three', check: { s: 'strength', d: 0.15 }, go: 'river', set: 'all', fail: 'capsize', pen: { health: 10 } }] },
      capsize: { text: ['The boat lists, takes on black water, and the merchant goes over the side with a scream that does not stop.'], opts: [{ t: 'Row on', go: 'river', set: 'right', on: { stress: 10 } }] },
      river: { text: ['Halfway across, hands reach up from the water. The drowned grab at the oar, the hull, your ankles.'],
        opts: [{ t: 'Beat them back', fight: { foe: 'drowned_ghost', name: 'The Drowned', mult: 0.95 }, go: 'fog' }, { t: 'Row hard and don\'t look down', check: { s: 'agility', d: 0.1 }, go: 'fog', fail: 'river_fight' },
          { t: 'Toss them the merchant\'s gold', need: 'gold', go: 'fog' }] },
      river_fight: { text: ['A cold hand closes around your wrist and pulls.'], opts: [{ t: 'Fight', fight: { foe: 'drowned_ghost', name: 'The Drowned', mult: 1.05 }, go: 'fog' }] },
      fog: { text: ['The fog thickens until you cannot see the bow. A voice from the water asks you a question:', '"I have no voice, but I answer anything. I have no body, but I live in every valley. What am I?"'],
        opts: [{ t: 'An echo', go: 'shore' }, { t: 'The wind', go: 'fog_bad' }, { t: 'A ghost', go: 'fog_bad' }, { t: 'The river', go: 'fog_bad' }] },
      fog_bad: { text: ['The fog laughs. The boat drifts in a slow circle, and you lose an hour you will never get back.'], opts: [{ t: 'Row on, older', go: 'shore', on: { scar: { name: 'Lost hour', desc: 'The river kept a little of your time. -1 year of life.', mods: { life: -1 } } } }] },
      shore: { text: s => ['The far shore glows faintly. The souls step off one by one.', ...(s.flags.right || s.flags.all ? ['The mother turns back. "Tell my child I tried," she says. You promise.'] : []), 'Then the river itself rises behind the boat — a long, scaled thing with no eyes, made of every name the dead forgot.'],
        opts: [{ t: 'Face the River That Eats Names', fight: { foe: 'young_dragon', name: 'The River That Eats Names', boss: true }, go: 'after' },
          { t: 'Say your own name loudly, so it can\'t take it', need: 'asked', check: { s: 'charisma', d: 0.05 }, go: 'after_calm', fail: 'shore_fight' }] },
      shore_fight: { text: ['Your voice cracks halfway through your name. The river hears the gap.'], opts: [{ t: 'Fight', fight: { foe: 'young_dragon', name: 'The River That Eats Names', boss: true, mult: 1.1 }, go: 'after' }] },
      after_calm: { text: ['The river shrinks back into its banks, murmuring your name to itself like something it wants to remember.'], opts: [{ t: 'Row back to the jetty', go: 'choice' }] },
      after: { text: ['The river breaks apart into a thousand whispering names, then settles, black and still.'], opts: [{ t: 'Row back to the jetty', go: 'choice' }] },
      choice: { text: ['The old ferryman is waiting. He looks lighter than before. "Well," he says, "do you want the job?"'],
        opts: [{ t: 'Refuse kindly, and wish him rest', go: 'end_best', not: 'gold' }, { t: 'Refuse, and keep the merchant\'s gold', need: 'gold', go: 'end_good' },
          { t: 'Take the job — part-time', go: 'end_dark' }] },
      end_best: { text: ['He bows, steps into his own boat, and pushes off without an oar. The mist closes behind him, and you are standing on an ordinary riverbank at dawn.'], end: 'best' },
      end_good: { text: ['The gold is cold and heavy. It is still gold. The ferryman shrugs and rows away.'], end: 'good' },
      end_dark: { text: ['He laughs for the first time in a thousand years and hands you a bell. Some nights, from now on, you will hear it ring — and you will have to go.'], end: 'dark',
        endPen: { scar: { name: 'Night Ferryman', desc: 'Some nights you row the dead. +12% damage against spirits and +2 years of life, but stress builds 6% faster.', mods: { spiritBane: 1.12, life: 2, stressMult: 1.06 } } } },
    } },
  { id: 'tiger', name: 'The Tiger Who Would Be Emperor', icon: 'claw', color: '#ffb02e', gear: 'fable_pelt', heir: 'tiger_tally',
    blurb: 'A tiger has crowned itself emperor of the mountain, and it wants a human minister.',
    nodes: {
      start: { text: ['A mountain court of beasts: foxes in silk, wolves in armour, monkeys keeping the records.', 'On a throne of bones sits a tiger in an imperial robe. "A human!" it roars, delighted. "Every real emperor needs one. You will be my minister."'],
        opts: [{ t: 'Bow and accept', go: 'minister' }, { t: 'Laugh at the robe', check: { s: 'battle', d: 0.1 }, go: 'duel', fail: 'thrown' }, { t: 'Back out of the throne room', leave: true }] },
      thrown: { text: ['The court goes silent. Two wolves throw you down the palace steps. Then they come down after you.'], opts: [{ t: 'Fight the wolf guards', fight: { foe: 'spirit_wolf', name: 'Wolf Guards', mult: 1 }, go: 'minister' }] },
      duel: { text: ['The tiger stops smiling. "Brave. Stupid, but brave. Very well — a duel. If you win, you are my minister. If you lose, you are lunch."'],
        opts: [{ t: 'Duel the Tiger Emperor\'s champion', fight: { foe: 'tiger_beast', name: 'The Tiger\'s Champion', mult: 0.95 }, go: 'minister', set: 'respected' }] },
      minister: { text: ['You are given a robe, a seal and three petitions. The monkeys watch closely. A minister who fails is eaten.'],
        opts: [{ t: 'Hear the first petition', go: 'p1' }] },
      p1: { text: ['The deer of the eastern valley say the wolves are eating too many of them. The wolves say they are hungry. Both look at you.'],
        opts: [{ t: 'Give the wolves the hunting rights to the next valley over', check: { s: 'smarts', d: 0.05 }, go: 'p2', set: 'wise1', fail: 'p2', pen: { stress: 6 } },
          { t: 'Side with the wolves — they have teeth', go: 'p2', set: 'cruel' }, { t: 'Side with the deer', go: 'p2' }] },
      p2: { text: ['The fox treasurer has been skimming the tribute. Everyone knows. The fox knows you know. It offers you a share.'],
        opts: [{ t: 'Take the share', go: 'p3', set: 'corrupt', on: { stress: 4 } }, { t: 'Expose the fox before the court', check: { s: 'charisma', d: 0.1 }, go: 'p3', set: 'wise2', fail: 'fox_fight' }, { t: 'Say nothing', go: 'p3' }] },
      fox_fight: { text: ['The fox smiles very wide and stops pretending to be a treasurer.'], opts: [{ t: 'Fight the Fox Treasurer', fight: { foe: 'fox_spirit', name: 'The Fox Treasurer', mult: 1 }, go: 'p3', set: 'wise2' }] },
      p3: { text: ['The last petition is from the tiger itself. "I want to conquer the human villages below. A real emperor needs a real empire. Draw me a plan."'],
        opts: [{ t: 'Draw a plan that cannot possibly work', check: { s: 'smarts', d: 0.15 }, go: 'reveal', set: 'trick', fail: 'reveal' }, { t: 'Refuse to the tiger\'s face', go: 'rage' },
          { t: 'Tell it a real emperor protects people instead', need: 'respected', check: { s: 'charisma', d: 0 }, go: 'reveal', set: 'taught', fail: 'rage' }, { t: 'Draw a real plan', need: 'corrupt', go: 'end_dark' }] },
      reveal: { text: s => [s.flags.taught ? 'The tiger is quiet for a long time. "Protect them," it repeats, tasting the idea. "Nobody ever told me that part."' : s.flags.trick ? 'The tiger studies your plan, nods wisely, and does not notice it ends in a river. The monkeys notice.' : 'The tiger squints at your plan. Something about it makes its tail lash.'],
        opts: [{ t: 'Let the tiger keep its crown, if it keeps its word', need: 'taught', go: 'end_best' }, { t: 'Slip out while the court argues', need: 'trick', check: { s: 'agility', d: 0 }, go: 'end_good', fail: 'rage' }, { t: 'Stand your ground', go: 'rage' }] },
      rage: { text: ['The tiger tears off its robe. Underneath, it is very much a tiger.', '"Ministers," it growls, "are delicious."'],
        opts: [{ t: 'Face the Tiger Emperor', fight: { foe: 'tiger_beast', name: 'The Tiger Emperor', boss: true, mult: 1.3 }, go: 'end_good' }] },
      end_best: { text: s => ['The tiger takes off its crown, looks at it, and puts it back on more gently. "Protector of the mountain," it says. "That is a better title anyway."', ...(s.flags.wise1 && s.flags.wise2 ? ['The deer, the wolves and even the monkeys bow to you as you leave.'] : [])], end: 'best' },
      end_good: { text: ['The court scatters into ordinary animals, and the mountain is just a mountain again. You keep the minister\'s seal.'], end: 'good' },
      end_dark: { text: ['The tiger loves your plan. You walk down the mountain ahead of an army of beasts, and some part of you enjoys it.'], end: 'dark',
        endPen: { scar: { name: 'Tiger\'s Minister', desc: 'You served a beast\'s ambition. +8% combat power and +5% loot, but -8% closeness.', mods: { power: 1.08, loot: 1.05, social: 0.92 } } } },
    } },
  { id: 'kitchen', name: 'The Hungry Kitchen God', icon: 'cauldron', color: '#ff7a4a', gear: 'fable_hearth', heir: 'hearth_pot',
    blurb: 'The Kitchen God reports to Heaven at New Year. This year he is starving, and furious.',
    nodes: {
      start: { text: ['Steam, copper pots, and a smell of burnt sugar. You are standing in an enormous kitchen with no walls, only fog.', 'On the stove sits a little god with a long beard and an empty bowl. "Nobody has fed me in thirty years," he says. "Tonight I report to Heaven. Cook for me — three dishes — or I tell the Jade Emperor everything about you."'],
        opts: [{ t: 'Roll up your sleeves', go: 'pantry' }, { t: 'Ask what he would report', go: 'report' }, { t: 'Back out of the steam', leave: true }] },
      report: { text: ['He pulls out a scroll as long as your arm. It is your life — every lie, every unpaid debt, every promise you forgot.', '"Cook well," he says, "and I will lose a few pages."'], opts: [{ t: 'Start cooking', go: 'pantry', set: 'scroll' }] },
      pantry: { text: ['The pantry is guarded by a hungry ghost who has eaten everything except the last basket of ingredients.'],
        opts: [{ t: 'Fight it for the basket', fight: { foe: 'hungry_ghost', name: 'The Pantry Ghost', mult: 0.9 }, go: 'dish1' }, { t: 'Share some food with it', check: { s: 'charisma', d: 0 }, go: 'dish1', set: 'ghost_friend', fail: 'pantry_fight' }] },
      pantry_fight: { text: ['It snatches at your hand instead of the food.'], opts: [{ t: 'Fight', fight: { foe: 'hungry_ghost', name: 'The Pantry Ghost', mult: 1 }, go: 'dish1' }] },
      dish1: { text: ['First dish: dumplings. The recipe is carved on the chopping block, out of order:', '"Flour before water. Knead after both. Fill once the dough rests. Fold, then steam — and the bell rings only when it is done."'],
        puzzle: { glyphs: ['🔔', '💧', '✋', '🌾', '♨', '⟳'], answer: ['🌾', '💧', '✋', '⟳', '♨', '🔔'], tries: 3, pen: { health: 6, hit: { amount: 10, type: 'burn', group: 'arms' } } }, ok: 'dish2', fail: 'dish1_bad' },
      dish1_bad: { text: ['The dumplings come out grey and tough. The Kitchen God eats one anyway, and writes something on his scroll.'], opts: [{ t: 'Move on to the second dish', go: 'dish2', set: 'burnt' }] },
      dish2: { text: ['Second dish: a fish from the god\'s own pond. The fish is three metres long and does not want to be dinner.'],
        opts: [{ t: 'Wrestle it out of the pond', fight: { foe: 'yaoguai', name: 'The Pond Carp', mult: 0.95 }, go: 'dish3' }, { t: 'Lure it out with the last of the bread', check: { s: 'luck', d: 0.05 }, go: 'dish3', fail: 'carp_fight' },
          { t: 'Ask the pantry ghost to scare it out', need: 'ghost_friend', go: 'dish3' }] },
      carp_fight: { text: ['The carp snaps the bread, the line and nearly your arm.'], opts: [{ t: 'Fight', fight: { foe: 'yaoguai', name: 'The Pond Carp', mult: 1.05 }, go: 'dish3' }] },
      dish3: { text: ['Third dish: sweets — so sticky that the god\'s mouth will be glued shut when he reports to Heaven. It is an old trick. He knows it. He pretends not to.', 'The sugar is boiling and smoking.'],
        opts: [{ t: 'Pull it off the heat at exactly the right moment', check: { s: 'agility', d: 0.05 }, go: 'feast', set: 'sweet', fail: 'feast', pen: { health: 8, hit: { amount: 14, type: 'burn', group: 'arms' } } },
          { t: 'Add honey and hope', check: { s: 'luck', d: 0.1 }, go: 'feast', set: 'sweet', fail: 'feast' }] },
      feast: { text: s => ['You set the dishes in front of the little god. He eats in total silence.', s.flags.burnt ? 'He leaves the dumplings for last, and sighs over them.' : 'He eats the dumplings first and closes his eyes.', s.flags.sweet ? 'When he gets to the sweets, his beard glues itself to his chin. His eyes twinkle.' : 'The sweets are bitter. His face darkens.'],
        opts: [{ t: 'Ask what he will tell Heaven', need: 'sweet', go: 'end_best' }, { t: 'Ask what he will tell Heaven', not: 'sweet', go: 'wrath' },
          { t: 'Offer to burn your page of the scroll yourself', need: 'scroll', check: { s: 'charisma', d: 0.1 }, go: 'end_good', fail: 'wrath' }] },
      wrath: { text: ['"Bitter!" the little god roars, and grows until his head brushes the fog. The stove becomes a furnace. "BITTER, like thirty years of being forgotten!"'],
        opts: [{ t: 'Face the Kitchen God\'s Wrath', fight: { foe: 'fallen_immortal', name: 'The Kitchen God\'s Wrath', boss: true, mult: 0.95 }, go: 'end_good' },
          { t: 'Apologise, and promise to feed him every New Year', go: 'end_dark' }] },
      end_best: { text: ['"Mmf," says the Kitchen God, through a mouthful of sugar. "Mmf mmf." You think it means he will tell Heaven only good things.', 'He tears a handful of pages from the scroll and feeds them to the stove. The fire burns warm and gold.'], end: 'best' },
      end_good: { text: ['The kitchen cools. The little god, back to his normal size, sits on the stove and picks at the leftovers. "Not bad," he admits.'], end: 'good' },
      end_dark: { text: ['He shrinks back down, mollified. "Every New Year," he reminds you. "I\'ll know if you forget."'], end: 'dark',
        endPen: { scar: { name: 'Kitchen God\'s debtor', desc: 'You owe the Kitchen God a feast every year. Pills work 6% better and +4 crafting, but stress builds 5% faster.', mods: { pill: 1.06, craft: 4, stressMult: 1.05 } } } },
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
  if (tier === 'best') { c.flags.fableBest = true; addItem(c, 'dao_pill', 1, 'hi'); addItem(c, 'ascend_pill', 1, 'hi'); got.push('Dao Insight Incense + Ascension Lotus Pill (best ending)'); }
  if (F.id === 'pilgrim') { c.flags.fableSmith = true; ensureBody(c); for (const id of ['arm_l', 'arm_r', 'leg_l', 'leg_r', 'hand_l', 'hand_r', 'foot_l', 'foot_r']) { const s = c.body.parts[id], par = PART_PARENT[id]; if (s?.missing && !(par && c.body.parts[par].missing)) { const k = id.split('_')[0]; s.prosthetic = k + '3'; got.push(`Fablesteel ${k} fitted`); } } got.push('Doctors can now fit you with Fablesteel limbs for free'); }
  if (S.titles.filter(t => FABLE[t]).length === FABLES.length && !S.titles.includes('fabled')) { S.titles.push('fabled'); got.push('Title: The Fabled (every Fable finished)'); }
  if (notes.length) got.push(...notes);
  ui.log(`I finished the Fable ${F.name}${tier === 'best' ? ' — the best way it could end' : tier === 'dark' ? ', but it followed me home' : ''}. ${got.join('; ')}.`, 'big');
  ui.cinematic?.({ motif: 'lotus', color: F.color, lines: [tier === 'dark' ? 'You come back. Not alone.' : 'The story lets you go.', `You are now known as ${TITLES[F.id].name}.`], title: F.name, sub: tier === 'best' ? 'Fable completed · best ending' : 'Fable completed', sound: 'ascend', hold: 2.2 });
  UI.done?.(got, tier); save(); return tier;
}
const PART_PARENT = { hand_l: 'arm_l', hand_r: 'arm_r', foot_l: 'leg_l', foot_r: 'leg_r' };

