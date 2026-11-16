// v0.8.2 Flavour text: a line describing what you talked about or did with someone, added to each social action.
import { pick } from '../core/rng.js';

const kid = p => p.age < 13, teen = p => p.age >= 13 && p.age < 20, old = p => p.age >= 60;
const TOPICS = {
  kid: ['which cartoon villain would win in a fight', 'a dream about flying fish', 'why the sky is blue (they had theories)', 'their imaginary friend\'s birthday', 'the best way to build a blanket fort', 'a bug they caught that morning'],
  teen: ['a teacher everyone hates', 'who is secretly dating whom', 'a song that won\'t leave their head', 'what they want to be when they grow up', 'a rumour about a Gate opening near school', 'a video game boss they can\'t beat'],
  adult: ['rent prices going crazy', 'a show we\'re both watching', 'their boss, at length', 'whether cultivators should pay taxes', 'an old memory we both remembered differently', 'the strange lights over the mountains', 'what we\'d do with a million', 'a trip they want to take', 'the news from the capital', 'a recipe their grandmother swore by'],
  old: ['how the city looked when they were young', 'a war nobody talks about any more', 'their aching knees and the weather', 'people they\'ve outlived', 'what really matters in the end', 'a Gate that opened sixty years ago'],
};
const topic = p => pick(TOPICS[kid(p) ? 'kid' : teen(p) ? 'teen' : old(p) ? 'old' : 'adult']);
const PLACES = ['at a noodle stall that never closes', 'on a bench by the river', 'in a tiny café with one table', 'walking around the night market', 'on the roof, watching the city', 'at the arcade, losing badly', 'at the temple gardens', 'at a karaoke booth', 'feeding pigeons in the square', 'at the cinema (we talked through the whole film)'];
const GIFTS = ['a jade bracelet', 'a book I thought they\'d love', 'a box of moon cakes', 'a hand-painted fan', 'a silly mug', 'a potted orchid', 'concert tickets', 'a warm scarf', 'a little carved fox', 'a bag of their favourite candy'];
const PRAISE = ['their laugh', 'their taste in music', 'how they handle people', 'their cooking', 'their style lately', 'how hard they work', 'their handwriting, oddly specific', 'their patience'];
const FIGHTS = ['money', 'something said years ago', 'whose turn it was to call', 'politics', 'a broken promise', 'nothing at all, really', 'the dishes', 'a mutual friend'];
const DRILLS = ['push-ups until our arms shook', 'sprints up the stadium stairs', 'a long run along the canal', 'stance work in the park at dawn', 'sparring drills with rolled-up newspapers', 'lifting sacks of rice at the market'];

export const FLAVOR = {
  talk: p => `We talked about ${topic(p)}.`,
  time: p => `${pick(['We ended up', 'Somehow we spent an hour', 'Most of the time we were'])} talking about ${topic(p)}.`,
  movein: () => `We spent the day ${pick(PLACES).replace(/^(at|on|in|walking|feeding)/, m => m)} arguing about furniture.`,
  compliment: () => `I told them I really like ${pick(PRAISE)}.`,
  gift: () => `It was ${pick(GIFTS)}.`,
  train_together: () => `We did ${pick(DRILLS)}.`,
  spar_p: () => pick(['We marked out a ring with chalk in the alley.', 'We sparred barefoot on the riverbank.', 'We borrowed the school gym after hours.', 'A small crowd gathered to watch.']),
  argue: () => `We argued about ${pick(FIGHTS)}.`,
  date: () => pick(['I asked over bubble tea.', 'I asked at the top of the Ferris wheel.', 'I asked in a voice that cracked halfway.', 'I asked by the lantern festival.']),
  propose: () => pick(['I proposed under the plum blossoms.', 'I proposed at the place we first met.', 'I proposed over a quiet dinner at home.', 'I proposed on the mountain path at sunrise.']),
  allowance: () => pick(['They counted out the notes slowly.', 'I promised to spend it wisely.', 'They made me do chores first.']),
  ask_money: () => pick(['I rehearsed what to say on the way over.', 'I didn\'t look them in the eye.', 'I explained it was "an investment".']),
  train_child: () => `We practised ${pick(['stances in the yard', 'breathing exercises', 'forms until sunset', 'catching thrown pebbles'])}.`,
  trainer_lesson: () => pick(['The drill was the same move, five hundred times.', 'We trained until the lamps were lit.', 'They corrected my footing with a bamboo cane.', 'They made me balance a cup of tea on my head.']),
  bless: () => pick(['I lit incense for them.', 'I held their hands and said the old words.']),
};
// add a flavour line to whatever an action returns (string or {text})
export function withFlavor(id, run) {
  const f = FLAVOR[id]; if (!f) return run;
  return async (c, p) => {
    const r = await run(c, p); if (r == null || !p) return r;
    const line = f(p);
    if (typeof r === 'string') return `${r} ${line}`;
    if (typeof r === 'object' && r.text) return { ...r, text: `${r.text} ${line}` };
    return r;
  };
}
