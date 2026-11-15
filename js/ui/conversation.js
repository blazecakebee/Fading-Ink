// A/B/C/D conversations. Every NPC has hidden personality traits that like or dislike certain kinds of answers.
// Strangers are hard to win over; it gets easier as you grow closer. Good talks reveal who they are,
// which fills in their index card.
import { h } from './dom.js';
import { openModal } from './modal.js';
import { portraitFor } from './portrait.js';
import { fx } from './fx.js';
import { ri, pick, chance, clamp } from '../core/rng.js';
import { gainClose, relLabel } from '../systems/people.js';
import { stat } from '../systems/life.js';

export const PERSONAS = {
  funny:     { name: 'Funny', likes: ['joke', 'tease'], dislikes: ['advice'] },
  serious:   { name: 'Serious', likes: ['deep', 'advice'], dislikes: ['joke', 'tease'] },
  proud:     { name: 'Proud', likes: ['praise', 'bold'], dislikes: ['tease', 'advice'] },
  shy:       { name: 'Shy', likes: ['gentle', 'listen'], dislikes: ['bold', 'tease'] },
  curious:   { name: 'Curious', likes: ['deep', 'story'], dislikes: ['small'] },
  kind:      { name: 'Kind-hearted', likes: ['gentle', 'listen', 'praise'], dislikes: ['bold'] },
  ambitious: { name: 'Ambitious', likes: ['advice', 'bold'], dislikes: ['small', 'joke'] },
  playful:   { name: 'Playful', likes: ['tease', 'joke', 'story'], dislikes: ['deep'] },
  practical: { name: 'Practical', likes: ['advice', 'small'], dislikes: ['story', 'deep'] },
  dreamer:   { name: 'Dreamer', likes: ['story', 'deep', 'gentle'], dislikes: ['small', 'advice'] },
  guarded:   { name: 'Guarded', likes: ['listen', 'small'], dislikes: ['deep', 'bold'] },
  romantic:  { name: 'Romantic', likes: ['praise', 'gentle', 'story'], dislikes: ['small'] },
};
const LIKES = ['tea', 'old books', 'street food', 'rainy days', 'martial films', 'cats', 'night markets', 'karaoke', 'chess', 'gardening', 'motorbikes', 'stargazing', 'spicy food', 'video games', 'calligraphy', 'fishing'];

// Each scene: a prompt and four answers tagged with a style. Answers are shuffled into A–D.
const SCENES = [
  { text: p => `${p.first} is staring out of the window, lost in thought.`, a: [['"Penny for your thoughts?"', 'deep'], ['"You look like a sad poet. Should I fetch a quill?"', 'tease'], ['Sit beside them quietly.', 'listen'], ['"Weather\'s nice today, huh?"', 'small']] },
  { text: p => `${p.first} mentions they've had a rough week.`, a: [['"Want to talk about it? I\'m listening."', 'listen'], ['"Here\'s what I\'d do in your place…"', 'advice'], ['"At least it\'s not raining frogs. Yet."', 'joke'], ['"You\'re tougher than anyone I know."', 'praise']] },
  { text: p => `You run into ${p.first} at the night market.`, a: [['"Fancy seeing you here — race you to the dumpling stall!"', 'bold'], ['"Did you know this market is built over an old Gate site?"', 'story'], ['"Busy tonight, isn\'t it?"', 'small'], ['"Your outfit is really nice tonight."', 'praise']] },
  { text: p => `${p.first} asks what you want out of life.`, a: [['"To be remembered after the ink fades."', 'deep'], ['"Honestly? A nap. A long one."', 'joke'], ['"I\'m going to the very top. Watch me."', 'bold'], ['"What about you? I\'d rather hear yours."', 'listen']] },
  { text: p => `${p.first} shows you something they made.`, a: [['"This is genuinely impressive."', 'praise'], ['"Have you thought about doing it this way instead?"', 'advice'], ['"Is it supposed to look like a potato?"', 'tease'], ['"How did you learn to make this?"', 'gentle']] },
  { text: p => `There's an awkward silence between you and ${p.first}.`, a: [['Tell a ridiculous story about your childhood.', 'story'], ['"So… how about that rice price?"', 'small'], ['Smile and wait — silence is fine.', 'gentle'], ['Pull a face until they laugh.', 'joke']] },
  { text: p => `${p.first} is nervous about a big decision.`, a: [['"Make a list. Pros, cons, then sleep on it."', 'advice'], ['"Whatever you choose, I\'m on your side."', 'gentle'], ['"Just go for it! Fortune favours the bold."', 'bold'], ['"What\'s the scariest part of it?"', 'deep']] },
  { text: p => `${p.first} brings up a rumour about cultivators.`, a: [['"I\'ve heard stranger. Want to hear about the glowing mountain?"', 'story'], ['"Rumours are just rumours."', 'small'], ['"If it were true, would you want to cultivate?"', 'deep'], ['"Sure, and I\'m secretly an immortal."', 'tease']] },
];

export function ensurePersona(p) {
  if (!p.persona) { const keys = Object.keys(PERSONAS); const a = pick(keys); let b = pick(keys); while (b === a) b = pick(keys); p.persona = [a, b]; p.likes = pick(LIKES); }
  p.known ||= []; return p;
}

function scoreAnswer(p, style) {
  let s = 0; for (const t of p.persona) { if (PERSONAS[t].likes.includes(style)) s += 2; if (PERSONAS[t].dislikes.includes(style)) s -= 2; }
  return s;
}
// Ice-breaking: strangers barely warm up to good answers and punish neutral ones; close friends forgive more.
const warmth = close => close < 20 ? 0.45 : close < 40 ? 0.7 : close < 65 ? 0.9 : 1.1;

export function indexCard(p) {
  ensurePersona(p);
  const facts = [
    ['Role', `${p.role} · age ${p.age}`],
    ['Relationship', `${relLabel(p)} (${p.close}%)`],
    ['Job', p.job || (p.known.includes('job') ? '—' : '???')],
    ['Personality', p.persona.map(t => p.known.includes(t) ? PERSONAS[t].name : '???').join(' · ')],
    ['Likes', p.known.includes('likes') ? p.likes : '???'],
    ['Responds to', p.persona.filter(t => p.known.includes(t)).flatMap(t => PERSONAS[t].likes).filter((v, i, a) => a.indexOf(v) === i).join(', ') || '???'],
  ];
  return h('div', { class: 'index-card' }, h('div', { class: 'ic-head' }, h('div', { class: 'pframe' }, portraitFor(p, 64)), h('div', {}, h('b', {}, `${p.first} ${p.last}`), h('div', { class: 'muted small' }, 'Index card'))),
    h('table', { class: 'kv small' }, facts.map(([k, v]) => h('tr', {}, h('td', {}, k), h('td', {}, v)))));
}

// Runs one conversation. Resolves to chronicle text (the caller spends the Social action).
export function converse(c, p) {
  ensurePersona(p);
  const scene = pick(SCENES); const answers = scene.a.map(([t, style]) => ({ t, style })).sort(() => Math.random() - 0.5);
  return new Promise(resolve => {
    let done = false;
    const result = h('div', { class: 'conv-result' });
    const opts = h('div', { class: 'opts' }, answers.map((a, i) => h('button', { class: 'btn conv-opt', onclick: () => choose(a) }, h('b', { class: 'conv-letter' }, 'ABCD'[i]), a.t)));
    const m = openModal(h('div', { class: 'conv' }, indexCard(p),
      h('div', { class: 'conv-main' }, h('h2', {}, '💬 Conversation'), h('div', { class: 'text' }, scene.text(p)), opts, result,
        h('div', { class: 'muted small' }, p.close < 30 ? 'They barely know you — it\'s hard to break the ice.' : p.close < 60 ? 'Getting to know each other.' : 'You\'re close — they\'re easy to talk to.'))),
      { cls: 'conv-modal', dismiss: false });
    function choose(a) {
      if (done) return; done = true; fx('click');
      const s = scoreAnswer(p, a.style), w = warmth(p.close);
      let d = s > 0 ? Math.round((3 + s * 3) * w) : s < 0 ? Math.round(-4 + s * 2) : (p.close < 25 ? -1 : 1);
      d += ri(-1, 1);
      gainClose(c, p, d);
      let reveal = '';
      if (s > 0 && chance(0.7)) {
        const hidden = [...p.persona.filter(t => !p.known.includes(t)), ...(p.known.includes('likes') ? [] : ['likes'])];
        if (hidden.length) { const r = pick(hidden); p.known.push(r); reveal = r === 'likes' ? ` You learn they love ${p.likes}.` : ` You realise they're ${PERSONAS[r].name.toLowerCase()}.`; }
      }
      if (s > 0) stat(c, 'happiness', 3);
      const tone = s > 0 ? `${p.first} lights up.` : s < 0 ? `${p.first} looks put off.` : `${p.first} gives a polite nod.`;
      opts.querySelectorAll('button').forEach(b => b.disabled = true);
      result.replaceChildren(h('p', { class: s > 0 ? 'good' : s < 0 ? 'bad' : '' }, `${tone} (${d >= 0 ? '+' : ''}${d} relationship)${reveal}`),
        h('button', { class: 'btn', onclick: () => { m.close(); resolve({ text: `Talked with ${p.first}: ${tone}${reveal}`, cls: s > 0 ? 'good' : s < 0 ? 'bad' : '' }); } }, 'Continue'));
      fx(s > 0 ? 'action' : s < 0 ? 'fail' : 'click');
    }
  });
}
