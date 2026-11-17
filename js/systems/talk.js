// v0.9.28 Talking back. When someone tells you something, you can react — and how they take it depends on who
// they are (their personality), how close you are, and a little bit of chaos. People also ask YOU things:
// your parents wonder if you like basketball or want to go to a private school, your partner asks about children…
import { G } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp } from '../core/rng.js';
import { stat, money, fmtMoney, wage } from './life.js';
import { gainClose } from './people.js';
import { ensurePersona, PERSONAS } from '../data/personas.js';

// ---------- reactions to what people tell you
// [label, style, base closeness change]. style matches personality likes/dislikes (praise, tease, deep, gentle, advice, joke, small, story, bold, listen)
export const REACT = {
  good:      [['🎉 Congratulate them', 'praise', 6], ['😏 Tease them a little', 'tease', 2], ['❓ Ask them all about it', 'deep', 5], ['🤷 "Cool."', 'small', -2]],
  bad:       [['🤗 Comfort them', 'gentle', 7], ['🛠️ Offer to help', 'advice', 5], ['😅 Joke to lighten the mood', 'joke', 0], ['📱 Change the subject', 'small', -5]],
  chat:      [['😄 Laugh along', 'joke', 3], ['💬 Keep the conversation going', 'story', 4], ['🙄 Roll your eyes', 'tease', -2], ['… Leave them on read', 'ignore', -3]],
  news:      [['💛 Wish them luck', 'gentle', 5], ['😢 Say you\'ll miss them', 'deep', 6], ['😤 "So you\'re just leaving?"', 'bold', -4], ['👍 "Have fun."', 'small', -1]],
  brag:      [['👏 Be happy for them', 'praise', 4], ['🏆 One-up them', 'bold', -1], ['😏 Tease them', 'tease', 1], ['🙄 Roll your eyes', 'small', -4]],
  complaint: [['🙏 Apologise', 'gentle', 6], ['📅 Promise to visit soon', 'advice', 4], ['🛡️ Defend yourself', 'bold', -3], ['🔇 Ignore it', 'ignore', -6]],
  love:      [['❤️ Say it back', 'praise', 6], ['😘 Flirt', 'tease', 4], ['🫂 Just hold them', 'gentle', 5], ['📱 "Mm-hm."', 'small', -4]],
  kid:       [['🤗 Hug them', 'gentle', 6], ['🎈 Play along', 'story', 5], ['📚 Turn it into a lesson', 'advice', 1], ['🙅 "Not now."', 'small', -5]],
};
const YOU = { praise: ['That\'s amazing, I\'m so proud of you!', 'You deserve it!', 'I knew you could do it.'], tease: ['Took you long enough.', 'Who did you bribe?', 'Don\'t let it go to your head.'],
  deep: ['Tell me everything. How do you feel about it?', 'What does this mean for you?'], small: ['Cool.', 'Nice.', 'Huh.'], gentle: ['I\'m here. Whatever you need.', 'Come here.', 'That sounds really hard.'],
  advice: ['Let me help — here\'s what we do.', 'I\'ll sort it out with you.'], joke: ['Well, look on the bright side…', 'At least it\'s not raining. Oh wait.'], story: ['And then what happened?', 'That reminds me of the time…'],
  bold: ['Seriously?', 'Typical.', 'You think that\'s impressive?'], ignore: ['…'] };
const GOOD = ['That means a lot.', 'Ha! I knew you\'d say that.', 'You always get me.', 'Thanks. Really.', 'This is why I tell you things.'];
const BAD = ['Wow. Okay.', 'Forget I said anything.', 'Why are you like this?', 'I thought you\'d care more.', 'Noted.'];
// the unexpected: people don't always take things the way you meant them
const SURPRISE_BAD = { praise: ['Why are you being so nice? What do you want?', 'Don\'t patronise me.'], gentle: ['I don\'t need your pity.', 'Stop treating me like I\'m made of glass.'], deep: ['That\'s none of your business.', 'Why are you interrogating me?'],
  story: ['This isn\'t about you, you know.'], advice: ['I didn\'t ask you to fix it.', 'I just wanted you to listen.'], joke: ['This isn\'t funny.'], tease: ['That actually hurt.'], small: ['Do you even care?'], bold: ['Fine. Forget it.'], ignore: ['Fine.'] };
const SURPRISE_GOOD = { tease: ['HA! Okay, fair. That\'s why I like you.'], small: ['You know what, I like that you don\'t make a fuss.'], bold: ['You\'re right. I needed someone to say it.'], ignore: ['…Honestly, thanks for not making it a thing.'],
  joke: ['Okay, that got me. I needed that.'], praise: ['Stop it, you\'ll make me cry.'], gentle: ['I didn\'t know how much I needed that.'], deep: ['Nobody ever asks. Thank you.'], advice: ['That\'s actually a brilliant idea.'], story: ['You\'re ridiculous. I love it.'] };

const MAX_TALKS = 30;
// called by social.js (and anywhere else) when someone says something you could react to
export function sayR(c, p, text, mood = 'chat', cls = 'say') {
  ui.log(`${p.first} (${p.role.toLowerCase()}): “${text}”`, cls);
  if (!REACT[mood] || !c.log?.length) return;
  const id = 't' + Math.random().toString(36).slice(2, 8), Y = c.log[c.log.length - 1]; const line = Y.lines[Y.lines.length - 1]; if (!line) return;
  line.tk = id; (c.talks ||= []).push({ id, pid: p.id, mood, year: G.world.year }); if (c.talks.length > MAX_TALKS) c.talks.shift();
}
export const talkOpen = (c, id) => { const t = (c.talks || []).find(x => x.id === id); return t && !t.done && t.year === G.world.year && c.alive ? t : null; };
export function respond(c, id, idx) {
  const t = talkOpen(c, id); if (!t) return null; const p = c.people.find(x => x.id === t.pid); t.done = true; if (!p || !p.alive) return null;
  const [label, style, base] = REACT[t.mood][idx]; ensurePersona(p);
  const likes = p.persona.some(x => PERSONAS[x]?.likes.includes(style)), hates = p.persona.some(x => PERSONAS[x]?.dislikes.includes(style));
  let d = base + (likes ? 4 : 0) - (hates ? 5 : 0) + ri(-1, 1);
  let reply, surprise = false;
  if (chance(0.16)) { // the unexpected
    surprise = true;
    if (d > 0) { d = -ri(3, 6); reply = pick(SURPRISE_BAD[style] || BAD); } else { d = ri(4, 8); reply = pick(SURPRISE_GOOD[style] || GOOD); }
  } else reply = d > 0 ? pick(GOOD) : d < 0 ? pick(BAD) : pick(['Hm.', 'Okay then.', 'If you say so.']);
  if (d < 0 && p.close >= 80) d = Math.ceil(d / 2); // old bonds bend instead of breaking
  if (d > 0) gainClose(c, p, d); else p.close = clamp(p.close + d);
  p.lastTalk = G.world.year; t.res = { d, surprise };
  ui.log(`Me: “${pick(YOU[style] || ['…'])}”`, 'say me');
  ui.log(`${p.first}: “${reply}” (${d >= 0 ? '+' : ''}${d} closeness${surprise ? ', not the reaction I expected' : ''})`, 'say ' + (d > 0 ? 'good' : d < 0 ? 'bad' : ''));
  return d;
}
// things left unanswered: bad news and complaints you ignored sting a little
export function expireTalks(c) {
  for (const t of c.talks || []) if (!t.done && t.year < G.world.year) { t.done = true; const p = c.people.find(x => x.id === t.pid);
    if (p?.alive && ['bad', 'complaint', 'love'].includes(t.mood)) p.close = clamp(p.close - 2); }
}

// ---------- people ask YOU things (these pop up as a question)
const isParent = p => p.role === 'Father' || p.role === 'Mother';
const isLove = (c, p) => p.id === c.partnerId || p.role === 'Spouse' || p.role === 'Partner';
const has = (p, ...t) => { ensurePersona(p); return p.persona.some(x => t.includes(x)); };
const inSchool = c => ['Primary School', 'Secondary School'].includes(c.edu?.school);
const flag = (c, k) => (c.flags.asked ||= {})[k];
const mark = (c, k) => { (c.flags.asked ||= {})[k] = G.world.year; };
const reply = (p, text, cls = 'say') => ui.log(`${p.first}: “${text}”`, cls);

export const QUESTIONS = [
  { id: 'q_sport', w: 4, who: (c, p) => isParent(p) && c.age >= 6 && c.age <= 13 && inSchool(c) && !flag(c, 'sport') && !(c.edu.clubs || []).some(x => ['basketball', 'football'].includes(x)), run: async (c, p, ask) => {
      mark(c, 'sport'); const sport = pick(['basketball', 'football']), S = await import('./school.js');
      const v = await ask(c, p, `${p.first} looks up from the newspaper. "Do you like ${sport}? The school has a team. I could sign you up."`, [[`Yes! Sign me up`, 'yes'], [sport === 'basketball' ? 'I\'d rather play football' : 'I\'d rather play basketball', 'other'], ['Can I do chess club instead?', 'chess'], ['Not really', 'no']]);
      if (v === 'yes' || v === 'other') { const id = v === 'yes' ? sport : sport === 'basketball' ? 'football' : 'basketball'; const r = S.joinClub(c, id); gainClose(c, p, ri(4, 7)); if (r) ui.log(r.text, 'good');
        if (chance(0.15)) return reply(p, pick(['I\'ll be at every game. EVERY game. With a sign.', 'I was the star of my school team, you know. Let me show you a few moves.']), 'say good'); return reply(p, 'That\'s my kid!', 'say good'); }
      if (v === 'chess') { const r = S.joinClub(c, 'chess'); if (r) ui.log(r.text, 'good'); if (has(p, 'competitive', 'proud') && chance(0.5)) { p.close = clamp(p.close - 3); return reply(p, 'Chess. Right. Well… it\'s a sport, technically.', 'say'); } gainClose(c, p, 4); return reply(p, 'A thinker! Good.', 'say good'); }
      if (chance(0.2) && has(p, 'competitive', 'ambitious')) { p.close = clamp(p.close - 4); return reply(p, 'You can\'t just sit at home all day, you know.', 'say bad'); }
      reply(p, 'That\'s okay. Find what you love.'); } },
  { id: 'q_private', w: 3, who: (c, p) => isParent(p) && c.age >= 7 && c.age <= 15 && inSchool(c) && !c.edu.private && ['middle', 'wealthy', 'rich', 'royal'].includes(c.wealth) && !flag(c, 'private'), run: async (c, p, ask) => {
      mark(c, 'private');
      const v = await ask(c, p, `${p.first} sits you down. "We've been thinking. Would you like to go to a private school? Smaller classes, better teachers. We'd pay for it."`, [['Yes, I\'d love that', 'yes'], ['I\'d miss my friends', 'friends'], ['Whatever you think is best', 'shrug']]);
      if (v === 'yes' || (v === 'shrug' && chance(0.6))) {
        if (chance(0.15) && (c.stats.smarts || 50) < 50) { stat(c, 'stress', 8); gainClose(c, p, 2); return ui.log('I sat the private school entrance exam… and failed it. My parents said it didn\'t matter. Their faces said otherwise.', 'bad'); }
        c.edu.private = true; c.edu.parentsPay = true; gainClose(c, p, ri(3, 6)); stat(c, 'stress', 4); return ui.log(`🎓 I moved to a private school. My parents are paying the fees.${v === 'shrug' ? ' Apparently "whatever you think" meant yes.' : ''}`, 'good'); }
      if (v === 'friends') { if (has(p, 'kind', 'romantic', 'dreamer') || chance(0.5)) { gainClose(c, p, 5); return reply(p, 'Friends matter more than any school. You stay.', 'say good'); } p.close = clamp(p.close - 3); return reply(p, 'Friends come and go. A good education doesn\'t.', 'say bad'); }
      reply(p, 'Let\'s leave it for now, then.'); } },
  { id: 'q_music', w: 3, who: (c, p) => isParent(p) && c.age >= 5 && c.age <= 12 && !flag(c, 'music'), run: async (c, p, ask) => {
      mark(c, 'music'); const inst = pick(['piano', 'violin', 'guzheng', 'guitar', 'drums']);
      const v = await ask(c, p, `${p.first}: "How about ${inst} lessons? Every Saturday morning."`, [['Yes!', 'yes'], ['Saturday MORNING?', 'no'], ['Can it be drums instead?', 'drums']]);
      if (v === 'yes' || v === 'drums') { c.flags.instrument = v === 'drums' ? 'drums' : inst; stat(c, 'smarts', 2); stat(c, 'charisma', 2); stat(c, 'stress', 2); gainClose(c, p, 4);
        if (v === 'drums' && chance(0.5)) { p.close = clamp(p.close - 2); return reply(p, 'The neighbours are going to hate us. Fine.', 'say'); } return ui.log(`🎵 I started ${c.flags.instrument} lessons.`, 'good'); }
      if (has(p, 'ambitious', 'serious') && chance(0.6)) { stat(c, 'stress', 3); return reply(p, 'You\'re going anyway. You\'ll thank me later.', 'say bad'); }
      reply(p, 'Ha. Fair enough.'); } },
  { id: 'q_dream', w: 3, who: (c, p) => isParent(p) && c.age >= 9 && c.age <= 16 && !flag(c, 'dream'), run: async (c, p, ask) => {
      mark(c, 'dream');
      const v = await ask(c, p, `At dinner, ${p.first} asks: "So what do you want to be when you grow up?"`, [['A doctor', 'doctor'], ['An artist', 'artist'], ['A great cultivator', 'cultivator'], ['Rich. Just rich.', 'rich'], ['I don\'t know yet', 'unsure']]);
      c.flags.dream = v; const liked = { doctor: ['ambitious', 'serious', 'practical', 'kind'], artist: ['dreamer', 'romantic', 'playful', 'curious'], cultivator: ['curious', 'dreamer', 'competitive'], rich: ['ambitious', 'practical', 'competitive'], unsure: ['kind', 'guarded'] }[v];
      if (has(p, ...liked)) { gainClose(c, p, ri(4, 7)); return reply(p, pick(['I think you\'d be wonderful at that.', 'That\'s my kid.', 'Then go and get it.']), 'say good'); }
      if (chance(0.35)) { p.close = clamp(p.close - 3); return reply(p, v === 'artist' ? 'An artist? And how will you pay rent?' : v === 'cultivator' ? 'You read too many stories.' : v === 'rich' ? 'Money isn\'t everything, you know.' : 'You should start thinking about it.', 'say bad'); }
      gainClose(c, p, 2); reply(p, 'Whatever it is, we\'re behind you.'); } },
  { id: 'q_crush', w: 2, who: (c, p) => isParent(p) && c.age >= 13 && c.age <= 17 && !flag(c, 'crush'), run: async (c, p, ask) => {
      mark(c, 'crush');
      const v = await ask(c, p, `${p.first}, far too casually: "So… is there anyone special at school?"`, [['Actually… yes', 'yes'], ['MUM. DAD. Stop.', 'stop'], ['No (lie)', 'lie']]);
      if (v === 'yes') { if (has(p, 'romantic', 'kind', 'playful') || chance(0.6)) { gainClose(c, p, 6); return reply(p, 'Tell me EVERYTHING. Wait, I\'ll make tea.', 'say good'); } stat(c, 'stress', 3); return reply(p, 'You\'re too young for that. Focus on school.', 'say bad'); }
      if (v === 'stop') { if (has(p, 'playful', 'funny')) { gainClose(c, p, 3); return reply(p, 'That\'s a yes, then! Ha!', 'say good'); } return reply(p, 'Alright, alright.'); }
      if (chance(0.4)) { p.close = clamp(p.close - 3); return reply(p, 'Then who keeps texting you at midnight?', 'say bad'); } reply(p, 'Okay. Just know you can tell me.'); } },
  { id: 'q_uni', w: 3, who: (c, p) => isParent(p) && c.age >= 15 && c.age <= 18 && !flag(c, 'uni'), run: async (c, p, ask) => {
      mark(c, 'uni');
      const v = await ask(c, p, `${p.first}: "Have you thought about university?"`, [['Yes — I\'m going to study hard for it', 'yes'], ['I want to learn a trade', 'trade'], ['I want to start working right away', 'work'], ['I\'m going to cultivate instead', 'cult']]);
      c.flags.uniPlan = v;
      if (v === 'yes') { stat(c, 'smarts', 1); gainClose(c, p, has(p, 'ambitious', 'serious', 'practical') ? 7 : 4); return reply(p, 'We\'ll help however we can.', 'say good'); }
      const ok = v === 'trade' ? has(p, 'practical', 'kind') : v === 'work' ? has(p, 'practical', 'grumpy') : has(p, 'dreamer', 'curious');
      if (ok || chance(0.4)) { gainClose(c, p, 3); return reply(p, v === 'cult' ? 'Then don\'t do it halfway.' : 'Honest work is good work.', 'say good'); }
      p.close = clamp(p.close - 4); reply(p, v === 'cult' ? 'Cultivation doesn\'t pay rent.' : 'You\'re throwing away your future.', 'say bad'); } },
  { id: 'q_grandkids', w: 2, who: (c, p) => isParent(p) && c.age >= 27 && c.age <= 45 && !c.people.some(x => ['Son', 'Daughter'].includes(x.role)) && (!flag(c, 'grandkids') || G.world.year - flag(c, 'grandkids') >= 5), run: async (c, p, ask) => {
      mark(c, 'grandkids');
      const v = await ask(c, p, `${p.first} sighs. "Everyone my age has grandchildren already. When are you going to give me one?"`, [['Soon, I promise', 'soon'], ['When I\'m ready', 'ready'], ['Maybe never', 'never'], ['Get a cat, then', 'cat']]);
      if (v === 'soon') { gainClose(c, p, 4); return reply(p, 'I\'ll hold you to that!', 'say good'); }
      if (v === 'ready') { if (has(p, 'kind', 'guarded') || chance(0.5)) { gainClose(c, p, 2); return reply(p, 'Of course. Your life, your time.'); } p.close = clamp(p.close - 2); return reply(p, 'I\'m not getting any younger…', 'say'); }
      if (v === 'cat') { if (has(p, 'funny', 'playful')) { gainClose(c, p, 4); return reply(p, 'Ha! Fine. But it had better be a fat one.', 'say good'); } p.close = clamp(p.close - 4); return reply(p, 'That\'s not funny.', 'say bad'); }
      if (chance(0.25)) { gainClose(c, p, 5); return reply(p, '…Honestly? I just want you to be happy. Forget I asked.', 'say good'); } p.close = clamp(p.close - 6); reply(p, 'I see.', 'say bad'); } },
  { id: 'q_cover', w: 3, who: (c, p) => (p.role === 'Brother' || p.role === 'Sister') && p.age >= 13 && p.age <= 25 && c.age >= 10 && c.people.some(isParent), run: async (c, p, ask) => {
      const v = await ask(c, p, `${p.first} whispers: "Cover for me tonight? If anyone asks, I'm at your place studying."`, [['Sure, I\'ve got you', 'yes'], ['What\'s in it for me?', 'deal'], ['No way — I\'m not lying for you', 'no']]);
      const par = c.people.filter(x => isParent(x) && x.alive);
      if (v === 'no') { if (chance(0.3)) { gainClose(c, p, 2); return reply(p, 'Fine, goody-goody. …Actually, you\'re right. I\'ll ask properly.', 'say'); } p.close = clamp(p.close - 5); return reply(p, 'Thanks for nothing.', 'say bad'); }
      if (v === 'deal') { if (c.money >= 0) money(c, Math.round(ri(5, 20) * (wage(c) || 1))); gainClose(c, p, 2); }
      gainClose(c, p, ri(5, 8));
      if (par.length && chance(0.3)) { for (const q of par) q.close = clamp(q.close - 4); stat(c, 'stress', 4); return ui.log(`Our parents found out I covered for ${p.first}. We were both grounded. ${p.first} thinks it was worth it.`, 'bad'); }
      reply(p, pick(['You\'re the best. I owe you one.', 'Legend.', 'I won\'t forget this.']), 'say good'); } },
  { id: 'q_kids', w: 2, who: (c, p) => isLove(c, p) && c.age >= 22 && c.age <= 42 && !c.people.some(x => ['Son', 'Daughter'].includes(x.role)) && !flag(c, 'kids'), run: async (c, p, ask) => {
      mark(c, 'kids'); p.wantsKids ??= chance(0.65);
      const v = await ask(c, p, `${p.first}, late at night: "Do you want children someday?"`, [['Yes, I do', 'yes'], ['I\'m not sure', 'unsure'], ['No, I don\'t', 'no']]);
      c.flags.wantsKids = v;
      if ((v === 'yes') === p.wantsKids && v !== 'unsure') { gainClose(c, p, ri(8, 12)); return reply(p, p.wantsKids ? 'Me too. I\'ve always wanted that with you.' : 'Thank goodness. I was scared to ask.', 'say good'); }
      if (v === 'unsure') { gainClose(c, p, 1); return reply(p, 'That\'s okay. We have time.'); }
      p.close = clamp(p.close - ri(6, 10)); reply(p, p.wantsKids ? 'Oh. I… thought you did.' : 'I don\'t think I can give you that.', 'say bad'); } },
  { id: 'q_pet', w: 2, who: (c, p) => isLove(c, p) && c.age >= 20 && !c.assets.some(a => a.type === 'pet') && !flag(c, 'pet'), run: async (c, p, ask) => {
      mark(c, 'pet'); const kind = pick(['cat', 'dog', 'rabbit', 'parrot']);
      const v = await ask(c, p, `${p.first} shows you a photo from the shelter. "Can we get a ${kind}? Look at its little face."`, [['Yes!', 'yes'], ['Who\'s going to walk it?', 'who'], ['Absolutely not', 'no']]);
      if (v === 'yes') { c.assets.push({ type: 'pet', name: `${pick(['Dumpling', 'Biscuit', 'Shadow', 'Noodle', 'Sesame'])} the ${kind}`, value: 0 }); stat(c, 'happiness', 8); gainClose(c, p, 6); return ui.log(`🐾 We adopted a ${kind}. ${p.first} cried a little.`, 'good'); }
      if (v === 'who') { if (chance(0.5)) { c.assets.push({ type: 'pet', name: `${pick(['Dumpling', 'Biscuit', 'Shadow'])} the ${kind}`, value: 0 }); gainClose(c, p, 3); return reply(p, 'Me! Every day! (It was not every day.)', 'say good'); } return reply(p, '…Fair point.'); }
      p.close = clamp(p.close - 4); reply(p, 'You have no heart.', 'say bad'); } },
  { id: 'q_venture', w: 2, who: (c, p) => !isParent(p) && p.age >= 22 && ['Friend', 'Best Friend', 'Brother', 'Sister', 'Coworker'].includes(p.role) && c.money > 5000 * (wage(c) || 1), run: async (c, p, ask) => {
      const amt = Math.round(Math.min(c.money * 0.1, ri(3000, 15000) * (wage(c) || 1)) / 10) * 10, idea = pick(['a bubble-tea shop', 'a phone-repair stall', 'a cultivation-gear brand', 'a food truck', 'an app that tells you which spirit beast you are']);
      const v = await ask(c, p, `${p.first} is buzzing. "I'm starting ${idea}. Want in? ${fmtMoney(c, amt)} and you're a partner."`, [[`Invest ${fmtMoney(c, amt)}`, 'yes'], ['Wish them luck, but no', 'no'], ['"That\'s a terrible idea."', 'mock']]);
      if (v === 'yes') { money(c, -amt); gainClose(c, p, ri(5, 9)); const win = chance(0.45); (c.loans ||= []).push({ who: p.id, amt: Math.round(amt * (win ? ri(15, 30) / 10 : 0.3)), due: G.world.year + ri(2, 4), honest: 0.95 }); return ui.log(`I invested ${fmtMoney(c, amt)} in ${p.first}'s ${idea.replace(/^an? /, '')}. We'll see.`); }
      if (v === 'mock') { if (has(p, 'funny', 'grumpy') && chance(0.4)) { gainClose(c, p, 3); return reply(p, 'Ha! It is, isn\'t it. I\'m doing it anyway.', 'say'); } p.close = clamp(p.close - 7); return reply(p, 'Wow. Thanks for the support.', 'say bad'); }
      gainClose(c, p, 1); reply(p, 'Your loss! (Thanks, though.)'); } },
  { id: 'q_quit', w: 2, who: (c, p) => !isParent(p) && p.age >= 20 && p.age < 60 && ['Friend', 'Best Friend', 'Brother', 'Sister', 'Spouse', 'Partner'].includes(p.role), run: async (c, p, ask) => {
      const v = await ask(c, p, `${p.first}: "Be honest with me. Should I quit my job and travel the world?"`, [['Do it! Life is short', 'go'], ['Be sensible. Keep the job.', 'stay'], ['Only if you take me', 'me'], ['That\'s your call', 'shrug']]);
      ensurePersona(p); const dreamy = has(p, 'dreamer', 'playful', 'romantic', 'curious');
      if (v === 'go') { if (dreamy || chance(0.4)) { gainClose(c, p, 7); p.travel = G.world.year; return reply(p, 'I\'m doing it. I\'ll send you a postcard from everywhere!', 'say good'); } if (chance(0.5)) { p.close = clamp(p.close - 3); return ui.log(`${p.first} quit, travelled for three months, ran out of money and blamed me. A little.`, 'bad'); } }
      if (v === 'stay') { if (has(p, 'practical', 'serious', 'guarded')) { gainClose(c, p, 5); return reply(p, 'You\'re right. I needed someone to say it.', 'say good'); } p.close = clamp(p.close - 3); return reply(p, 'You sound like my mother.', 'say bad'); }
      if (v === 'me') { if (has(p, 'playful', 'funny', 'romantic') || chance(0.5)) { gainClose(c, p, 6); return reply(p, 'Deal. Pack light.', 'say good'); } return reply(p, 'Ha. Sure.'); }
      if (chance(0.3)) { p.close = clamp(p.close - 2); return reply(p, 'I asked because I wanted YOUR opinion.', 'say'); } gainClose(c, p, 1); reply(p, 'Yeah. I guess it is.'); } },
  { id: 'q_kidteam', w: 3, who: (c, p) => (p.role === 'Son' || p.role === 'Daughter') && p.age >= 7 && p.age <= 15 && !p.askedTeam, run: async (c, p, ask) => {
      p.askedTeam = true; const t = pick(['football team', 'basketball team', 'dance class', 'martial arts class', 'robotics club']);
      const v = await ask(c, p, `${p.first}: "Can I join the ${t}? Please? Everyone's in it."`, [['Of course!', 'yes'], ['Only if your grades stay up', 'deal'], ['No, focus on school', 'no']]);
      if (v === 'yes' || v === 'deal') { gainClose(c, p, v === 'yes' ? ri(6, 9) : ri(3, 5)); p.stats ||= {}; const k = /robotics/.test(t) ? 'smarts' : /dance/.test(t) ? 'charisma' : 'agility'; p.stats[k] = clamp((p.stats[k] || 40) + 4);
        if (chance(0.15)) return reply(p, `I made the first team!!`, 'say good'); return reply(p, 'Thank you thank you thank you!', 'say good'); }
      if (chance(0.25)) { gainClose(c, p, 2); return reply(p, '…Okay. You\'re probably right.'); } p.close = clamp(p.close - ri(5, 8)); reply(p, 'You never let me do ANYTHING.', 'say bad'); } },
];
