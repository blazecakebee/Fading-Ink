// v0.9.2 Story variety: quiet yearly vignettes and a much bigger cinematic pool. Every pool is drawn like a
// shuffled deck (never the same line twice until the deck runs out), and scenes are composed from an opening,
// the event's own line, and a sensory detail tied to your world (season, weather, city, your Qi's colour).
import { META, G } from '../core/state.js';

const rnd = a => a[Math.floor(Math.random() * a.length)];
// shuffle-bag draw, remembered across sessions
export function draw(key, pool) {
  META.bags ||= {}; let bag = META.bags[key];
  if (!bag || !bag.length || bag.some(i => i >= pool.length)) { bag = pool.map((_, i) => i); for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; } }
  const i = bag.pop(); META.bags[key] = bag; return pool[i];
}

// ---------------- quiet years
const AMBIENT = {
  child: ['It rained for a week. You counted the drops racing down the window and named the winners.', 'A kite got stuck in the tree outside. It stayed there all year, fading.', 'You found a coin in the gutter and kept it in a matchbox like a treasure.',
    'The neighbour\'s cat had kittens. You were allowed to hold one for exactly ten seconds.', 'You were afraid of the dark this year. Then, quietly, you weren\'t.', 'A street magician made your sweet disappear. He never gave it back.',
    'You learned to whistle. The whole family suffered for it.', 'Someone at school said there are monsters inside the Gates. You checked under the bed twice.', 'The first snow came. You ate some. It tasted like nothing and you loved it.',
    'You built a fort out of chairs and declared yourself its emperor.', 'A siren wailed somewhere far away. Not this way, today.', 'You scraped your knee and decided you were a war hero.'],
  teen: ['A song stuck to that whole summer like gum to a shoe.', 'You stayed up too late on a rooftop, talking about nothing that mattered and everything that did.', 'You grew two inches. Your trousers did not.',
    'A rumour went around that someone\'s brother vanished into a Gate. Nobody knew whose brother.', 'You wrote something in a notebook and then burned the page.', 'The bus was late every single day this year. You started to like the waiting.',
    'You found an old photograph of your parents, younger than you, laughing at something off-camera.', 'Someone you barely knew said something kind. You thought about it for weeks.', 'The city lights looked different this year. Or you did.',
    'A fight broke out at the night market. You watched from a safe distance and felt your heart hammer.'],
  adult: ['A year passed without incident. In this city, that alone is news.', 'You turned at the sound of someone calling your name. There was no one in the alley.', 'The rent went up. The tea got worse. Life went on.',
    'A neighbour\'s radio played a song you knew by heart but never learned the title of.', 'You caught your reflection in a shop window and, for a second, didn\'t recognise yourself.', 'Before dawn, every light on the street went out at once. In this city, being awake at that hour is not a good idea.',
    'You fixed something that had been broken for years. It felt bigger than it was.', 'An old friend\'s name came up in conversation. You realised you didn\'t know if they were alive.', 'You spent a whole evening watching the rain through a café window, and it was enough.',
    'A stranger asked you for directions to a street that doesn\'t exist.', 'The Gate warning sirens were tested on the first of the month. Everyone flinched anyway.', 'You started a habit this year. You\'re not sure yet if it\'s a good one.',
    'A pigeon followed you home three days in a row. On the fourth, it didn\'t.', 'The noodle stall on the corner closed. Something small and important went with it.'],
  elder: ['Your knees forecast the rain better than the news does.', 'You told a story at dinner. The children had heard it before. They let you finish anyway.', 'You noticed you\'d started saying "back in my day". You said it anyway.',
    'An old song came on and, for three minutes, you were twenty again.', 'You outlived another tree you planted. That felt strange.', 'You wrote letters to people who aren\'t here anymore. You didn\'t send them.',
    'The young ones move so fast. You\'ve stopped trying to catch up and started enjoying the view.', 'You sat in the sun for an hour and called it a good day. It was.'],
  cultivator: ['You sat so still in meditation that a sparrow landed on your shoulder.', 'For a breath, you felt the Qi of the whole city — every heartbeat, every engine, every fear.', 'Mortals stared at you in the street this year. You\'ve stopped noticing.',
    'You dreamt of a mountain with no summit, and woke with your Qi a little deeper.', 'Your teacup stopped steaming the moment you looked at it. You\'re still learning control.', 'A Gate opened across the river. You felt it before the sirens did.',
    'Time moves differently for you now. A whole season slipped by in what felt like an afternoon.', 'A child pointed at you and said "your eyes are glowing". Their mother hurried them away.'],
};
export function ambientLine(c) {
  const key = (c.qi?.realm || 0) >= 3 && c.age >= 16 ? 'cultivator' : c.age < 13 ? 'child' : c.age < 20 ? 'teen' : c.age >= 60 ? 'elder' : 'adult';
  return draw('amb_' + key, AMBIENT[key]);
}

// ---------------- cinematics
const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const WEATHER = { spring: ['plum blossom drifts past', 'a warm rain is falling', 'the air smells of wet earth'], summer: ['cicadas scream in the heat', 'the asphalt shimmers', 'thunder mutters far away'],
  autumn: ['red leaves skitter down the street', 'a cold wind rattles the shutters', 'smoke rises from the chestnut stalls'], winter: ['snow muffles every sound', 'your breath hangs in the air', 'ice creaks on the gutters'] };
function sensory(c) {
  const s = rnd(SEASONS), w = rnd(WEATHER[s]), qc = c?.qiType?.primary ? ' ' + rnd(['Your Qi glows faintly', 'Your Qi hums under your skin', 'Your Qi coils like smoke']) + '.' : '';
  return rnd([`It is ${s}; ${w}.`, `In ${c?.city || 'the city'}, ${w}.`, `Outside, ${w}.${qc}`, `Somewhere in ${c?.city || 'the city'}, a dog barks and falls silent.`, `The hour is late; ${w}.`, `It is ${s}. ${w[0].toUpperCase() + w.slice(1)}.`]);
}
const POOLS = {
  ascend: { motifs: ['enso', 'lotus', 'mountain', 'glyph', 'helix', 'tree'], open: ['Your dantian cracks open like an egg of light.', 'Every meridian sings the same note at once.', 'The walls of your body fall away; for a moment you are the size of the sky.',
    'Heaven and earth pour into you through the crown of your head.', 'Your heartbeat stops. Then it starts again — slower, deeper, older.', 'The world sharpens until you can hear dust settling.', 'A door you never knew was there swings open inside you.',
    'Your Qi turns over like a sleeping dragon and wakes.', 'Pain, then silence, then a vastness you have no words for.', 'The breath you take now is not the breath of a mortal.', 'Light leaks from your skin and the room goes quiet.', 'Old impurities burn away in black smoke.'] },
  tribulation: { motifs: ['bolt', 'crack', 'seal'], open: ['The clouds turn the colour of a bruise.', 'Birds fall silent for a hundred li around you.', 'The sky draws a breath it will not let out gently.', 'Lightning gathers like a held grudge.', 'Heaven looks down, and it is not pleased.',
    'The air tastes of iron and ozone.', 'Every hair on your body stands up.', 'Thunder rolls without lightning — a warning, or a promise.', 'A spiral of black cloud opens directly above you.', 'The ground beneath your feet begins to hum.'] },
  boss: { motifs: ['crack', 'seal', 'sword', 'triangle', 'mountain'], open: ['The deepest chamber smells of old blood and older stone.', 'Something enormous shifts in the dark.', 'The walls here are covered in claw marks — some of them fresh.', 'Torches gutter out one by one as you step inside.',
    'A low growl comes from everywhere at once.', 'Bones crunch under your feet. Not all of them are animal.', 'The air thickens until breathing is a fight on its own.', 'Two eyes open in the darkness, each the size of your head.', 'Your shadow flinches before you do.', 'The silence here has weight.'] },
  victory: { motifs: ['triangle', 'enso', 'sword', 'lotus'], open: ['The last echo of the fight fades into the stone.', 'Your hands are still shaking. They have earned it.', 'Dust settles slowly over what\'s left.', 'You breathe, and the breath does not hurt.',
    'The light of the Gate softens, almost like gratitude.', 'For a moment no one moves, not even you.', 'Somewhere far away, a bell rings.', 'You are bleeding. You are alive. Both feel loud.'] },
  birth: { motifs: ['enso', 'lotus', 'tree', 'helix'], open: ['The first cry cuts through the night like a bell.', 'Tiny fingers curl around yours and do not let go.', 'The room fills with a new kind of quiet.', 'Somewhere, a new page turns in the ledger of the world.',
    'Rain stops the moment the child breathes.', 'Everyone in the room forgets how to speak.', 'The midwife smiles the way only midwives smile.', 'The night is ordinary. Then it isn\'t.'] },
  death: { motifs: ['enso', 'tree', 'mountain', 'lotus'], open: ['The ink of a life dries on the page.', 'A candle gutters, steadies, and goes out.', 'The breath goes out and simply does not come back.', 'Somewhere a clock keeps ticking, not knowing.',
    'The room goes very still.', 'The world continues, impolitely, outside the window.', 'Last light slides off the windowsill.', 'Old hands finally rest.'] },
  love: { motifs: ['lotus', 'enso', 'helix'], open: ['Red lanterns sway over the courtyard.', 'Two cups of wine, one vow.', 'Friends you haven\'t seen in years show up just for this.', 'The music is too loud and perfect.',
    'Somebody\'s grandmother is crying the loudest.', 'For one day, nobody talks about Gates.', 'Petals stick to everyone\'s shoes.', 'You hold hands under the table like teenagers.'] },
  sect: { motifs: ['seal', 'mountain', 'glyph', 'sword'], open: ['Incense smoke curls up past a thousand stone steps.', 'The great bell of the sect rings once.', 'Elders line the hall, faces unreadable.', 'Banners snap in the mountain wind.',
    'Disciples bow as you pass — some sincere, some not.', 'The founder\'s portrait seems to watch you.', 'Your name is written into the sect\'s register in fresh ink.', 'Three hundred disciples fall silent at once.'] },
  hunt: { motifs: ['mountain', 'crack', 'triangle', 'sword'], open: ['The trail is cold, and getting colder.', 'Villagers bar their doors when you ask about the beast.', 'You find its tracks — each one the size of a cart.', 'Crows follow you for three days, waiting.',
    'The map ends. The forest doesn\'t.', 'You sharpen your weapon by firelight and do not sleep.', 'Something has been eating the stars here.', 'The locals speak of it only in whispers.'] },
  divine: { motifs: ['lotus', 'enso', 'seal', 'glyph'], open: ['Time stops. A falling leaf hangs in the air.', 'Every bell in the city rings at once, untouched.', 'The light changes colour, and does not change back for a long time.', 'You feel very, very small.',
    'A voice speaks without sound.', 'The ground forgets, for a moment, how gravity works.', 'Gold light spills across the street like water.', 'Mortals around you freeze mid-step, unaware.'] },
  qi: { motifs: ['helix', 'enso', 'glyph', 'lotus'], open: ['Two rivers of light coil around each other.', 'Your Qi changes colour as you watch.', 'The air around you crackles, then goes still.', 'Something in your meridians rearranges itself, piece by piece.',
    'Your dantian glows like a lantern seen through fog.', 'A new note joins the song of your Qi.', 'Old Qi sheds like a snake\'s skin.', 'Your shadow flickers a different colour.'] },
  dark: { motifs: ['crack', 'seal', 'triangle'], open: ['The streetlight above you flickers and dies.', 'Something in you goes quiet that should never have gone quiet.', 'The air tastes of copper.', 'Somewhere, someone is screaming. Then they aren\'t.',
    'Your hands do not look like your hands.', 'The rain does not wash this away.', 'The city does not notice. The city never notices.'] },
  life: { motifs: ['enso', 'tree', 'mountain', 'lotus', 'glyph'], open: ['A new chapter starts, the way they always do: quietly.', 'Years of small days add up to this one.', 'You stand a little taller today.', 'The photographs from today will hang on a wall for decades.',
    'Your family pretends not to cry.', 'The road behind you is longer than you remember.', 'Something you worked for is finally real.', 'Today you are someone new.'] },
};
const CLASSIFY = [
  [/tribulation|bolt/i, 'tribulation'], [/ascended|awakening|realm|severed|body/i, 'ascend'], [/boss|awakened/i, 'boss'], [/victory|slain|cleared|godslayer/i, 'victory'],
  [/child is born|house of|generation/i, 'birth'], [/married|♥/i, 'love'], [/sect|elder|founded|joined|guild|hunter|black belt/i, 'sect'], [/hunt|stage/i, 'hunt'],
  [/god|divine|blessing/i, 'divine'], [/qi|fusion|permutation/i, 'qi'], [/sacrifice|penitentiary|blood/i, 'dark'], [/–|aged/i, 'death'],
];
// augment a cinematic: a fresh opening line + the event's own most specific line + a sensory detail; vary the motif too
export function varyCinematic(o) {
  try {
    const key = `${o.title || ''} ${o.sub || ''}`, cls = (CLASSIFY.find(([re]) => re.test(key)) || [, 'life'])[1], P = POOLS[cls];
    const own = (o.lines || []).filter(Boolean), c = G.char;
    const lines = [draw('cin_' + cls, P.open), own[own.length - 1] || own[0], Math.random() < 0.6 ? sensory(c) : null].filter(Boolean);
    const motif = Math.random() < 0.55 ? draw('mot_' + cls, P.motifs) : o.motif;
    return { ...o, lines, motif };
  } catch (e) { return o; }
}
