// v0.8.3 Personalities: every person has two traits. They decide which conversation answers land and
// which things they actually enjoy doing with you. Everyone is different.
import { pick, ri } from '../core/rng.js';

export const PERSONAS = {
  funny:     { name: 'Funny', likes: ['joke', 'tease'], dislikes: ['advice', 'deep'], enjoys: ['spar_p', 'train_together'], hates: ['compliment'] },
  serious:   { name: 'Serious', likes: ['deep', 'advice'], dislikes: ['joke', 'tease'], enjoys: ['talk', 'train_together'], hates: ['time'] },
  proud:     { name: 'Proud', likes: ['praise', 'bold'], dislikes: ['tease', 'advice', 'listen'], enjoys: ['compliment', 'spar_p'], hates: ['gift'] },
  shy:       { name: 'Shy', likes: ['gentle', 'listen'], dislikes: ['bold', 'tease', 'joke'], enjoys: ['gift'], hates: ['spar_p', 'compliment'] },
  curious:   { name: 'Curious', likes: ['deep', 'story'], dislikes: ['small', 'gentle'], enjoys: ['talk', 'gift'], hates: ['train_together'] },
  kind:      { name: 'Kind-hearted', likes: ['gentle', 'listen'], dislikes: ['bold', 'tease'], enjoys: ['time', 'gift'], hates: ['spar_p'] },
  ambitious: { name: 'Ambitious', likes: ['advice', 'bold'], dislikes: ['small', 'joke', 'gentle'], enjoys: ['train_together', 'spar_p'], hates: ['time'] },
  playful:   { name: 'Playful', likes: ['tease', 'joke', 'story'], dislikes: ['deep', 'advice'], enjoys: ['time', 'spar_p'], hates: ['talk'] },
  practical: { name: 'Practical', likes: ['advice', 'small'], dislikes: ['story', 'deep', 'praise'], enjoys: ['gift', 'train_together'], hates: ['compliment', 'time'] },
  dreamer:   { name: 'Dreamer', likes: ['story', 'deep'], dislikes: ['small', 'advice'], enjoys: ['time', 'talk'], hates: ['train_together'] },
  guarded:   { name: 'Guarded', likes: ['listen', 'small'], dislikes: ['deep', 'bold', 'praise'], enjoys: ['gift'], hates: ['time', 'compliment'] },
  romantic:  { name: 'Romantic', likes: ['praise', 'gentle', 'story'], dislikes: ['small', 'advice'], enjoys: ['compliment', 'gift', 'time'], hates: ['spar_p'] },
  grumpy:    { name: 'Grumpy', likes: ['small', 'joke'], dislikes: ['praise', 'gentle', 'deep'], enjoys: ['train_together'], hates: ['compliment', 'time'] },
  competitive: { name: 'Competitive', likes: ['bold', 'tease'], dislikes: ['gentle', 'listen'], enjoys: ['spar_p', 'train_together'], hates: ['gift'] },
};
export const LIKES = ['tea', 'old books', 'street food', 'rainy days', 'martial films', 'cats', 'night markets', 'karaoke', 'chess', 'gardening', 'motorbikes', 'stargazing', 'spicy food', 'video games', 'calligraphy', 'fishing'];
export const ACT_NAMES = { talk: 'long talks', time: 'spending time together', compliment: 'compliments', gift: 'gifts', train_together: 'training together', spar_p: 'sparring' };

export function ensurePersona(p) {
  if (!p.persona || p.persona.some(t => !PERSONAS[t])) { const keys = Object.keys(PERSONAS); const a = pick(keys); let b = pick(keys); while (b === a) b = pick(keys); p.persona = [a, b]; p.likes ||= pick(LIKES); }
  p.known ||= []; return p;
}
// how much someone enjoys an activity with you: positive = loves it, negative = hates it
export const tasteOf = (p, id) => { ensurePersona(p); return p.persona.reduce((s, t) => s + (PERSONAS[t].enjoys.includes(id) ? 1 : 0) - (PERSONAS[t].hates.includes(id) ? 1 : 0), 0); };
export const enjoysList = p => Object.keys(ACT_NAMES).filter(id => p.known?.includes('act:' + id) && tasteOf(p, id) > 0).map(id => ACT_NAMES[id]);
export const hatesList = p => Object.keys(ACT_NAMES).filter(id => p.known?.includes('act:' + id) && tasteOf(p, id) < 0).map(id => ACT_NAMES[id]);

// wrap a social action so the person's taste changes how it lands (and you learn their taste by trying)
export function withTaste(id, run, gainClose) {
  if (!ACT_NAMES[id] || id === 'talk') return run; // conversations are judged answer by answer
  return async (c, p) => {
    const r = await run(c, p); if (r == null || !p || p.coop) return r;
    const t = tasteOf(p, id); if (!t) return r;
    if (!p.known.includes('act:' + id)) p.known.push('act:' + id);
    const d = t > 0 ? ri(3, 6) * t : -ri(8, 13) * -t; gainClose(c, p, d);
    const line = t > 0 ? pick([`${p.first} clearly loved it.`, `${p.first} hasn't smiled like that in a while.`, `"We should do this more," ${p.first} said.`]) : pick([`${p.first} did not enjoy that at all.`, `${p.first} kept checking the time.`, `${p.first} made an excuse and left early.`, `I could tell ${p.first} hated every minute.`]);
    const tail = ` ${line} (${d > 0 ? '+' : ''}${d})`;
    if (typeof r === 'string') return r + tail;
    if (typeof r === 'object' && r.text) return { ...r, text: r.text + tail, cls: t < 0 ? 'bad' : r.cls };
    return r;
  };
}
