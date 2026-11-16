// v0.9.15 Living relationships: the people around you notice what you do and react, in their own voice.
// Each year: (1) friends and family comment on what changed in your life, coloured by their personality and how
// close you are; (2) someone may come to you with a request — a night out, a loan, help, advice, a visit;
// (3) people you ignore drift away and say so; (4) old loans get paid back (or don't).
import { G } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp } from '../core/rng.js';
import { stat, money, fmtMoney, wage } from './life.js';
import { gainClose } from './people.js';
import { ensurePersona } from '../data/personas.js';

const FAMILY = ['Father', 'Mother', 'Brother', 'Sister', 'Son', 'Daughter', 'Spouse', 'Partner'];
const CLOSE_ROLES = [...FAMILY, 'Friend', 'Best Friend', 'Crush', 'Classmate', 'Coworker', 'Acquaintance', 'Disciple'];
const people = c => (c.people || []).filter(p => p.alive && !p.coop && !p.hostile && p.role !== 'Enemy' && p.role !== 'Ex' && CLOSE_ROLES.includes(p.role) && !p.trainer);
const isParent = p => p.role === 'Father' || p.role === 'Mother';
const isLove = (c, p) => p.id === c.partnerId || p.role === 'Spouse' || p.role === 'Partner';
const has = (p, ...t) => { ensurePersona(p); return p.persona.some(x => t.includes(x)); };
const say = (p, text, cls = 'say') => ui.log(`${p.first} (${p.role.toLowerCase()}): “${text}”`, cls);

// ---------- what changed this year
function snapshot(c) {
  return { money: c.money, realm: c.qi.realm, job: c.job?.id || null, heat: c.heat || 0, wins: c.wins || 0, kills: c.kills || 0, gates: c.gatesCleared || 0, fame: c.fame || 0,
    prison: !!c.prison, partner: c.partnerId || null, spouse: c.people.some(p => p.role === 'Spouse' && p.alive), kids: c.people.filter(p => (p.role === 'Son' || p.role === 'Daughter') && p.alive).length,
    conds: (c.conditions || []).length, health: c.stats.health, edu: c.edu?.level || 0, sect: !!c.ownSect, addict: !!c.addiction, looks: c.stats.looks, used: c.usedThisYear || 0 };
}
function changes(c, a) {
  const b = snapshot(c), out = [], add = (id, w = 1, x) => out.push({ id, w, x });
  if (b.realm > a.realm) add('breakthrough', 3);
  if (b.job && b.job !== a.job) add('job', 2); else if (!b.job && a.job) add('lostjob', 2);
  if (b.prison && !a.prison) add('prison', 4); else if (b.heat - a.heat >= 12) add('crime', 2);
  if (b.kills > a.kills) add('killer', 3);
  if (b.wins - a.wins >= 3) add('brawler', 1);
  if (b.health < a.health - 18 || b.conds > a.conds) add('hurt', 2);
  if (b.spouse && !a.spouse) add('married', 4); else if (b.partner && !a.partner) add('dating', 2); else if (!b.partner && a.partner) add('breakup', 2);
  if (b.kids > a.kids) add('baby', 4);
  if (b.fame >= Math.max(1000, a.fame * 2) && b.fame - a.fame >= 1000) add('famous', 2);
  if (b.gates - a.gates >= 2) add('hunter', 1);
  if (b.edu > a.edu) add('graduate', 3);
  if (b.sect && !a.sect) add('sect', 3);
  if (b.addict && !a.addict) add('addict', 3);
  const rich = Math.max(5000, Math.abs(a.money)) * 0.6; if (b.money - a.money > rich && b.money > 20000) add('rich', 1); if (b.money < 0 && a.money >= 0) add('broke', 2);
  if (b.looks - a.looks >= 6) add('glowup', 1);
  return out.sort((x, y) => y.w - x.w);
}
// lines: pos = proud/happy, neg = worried/disapproving, jeal = envious. {n} = your first name.
const LINES = {
  breakthrough: { pos: ['You\'re glowing, {n}. Whatever you\'re doing on that mountain, it\'s working.', 'I felt it from across the room. You\'ve changed.', 'F:My child, a real cultivator. I told the whole street.', 'You broke through? Tell me everything.'],
    neg: ['Don\'t forget the rest of us while you\'re climbing to heaven.', 'All this cultivating… are you even eating properly?'], jeal: ['Must be nice, having talent fall out of the sky.', 'Another breakthrough. Of course.'] },
  job: { pos: ['A new job! I knew someone would see what you\'re worth.', 'Dinner\'s on you now, right?', 'Proud of you, {n}. Really.'], neg: ['That job? Well… it\'s a start, I suppose.', 'Just don\'t let them work you to death.'], jeal: ['Huh. They hired you? Lucky.'] },
  lostjob: { pos: ['Their loss, {n}. Something better is coming.', 'Come over. I\'ll cook. We\'ll figure it out.'], neg: ['Fired? What did you do this time?', 'You need to take life more seriously.'], jeal: [] },
  prison: { pos: ['I\'ll visit every week. I don\'t care what they say you did.', 'We\'ll get through this, {n}.'], neg: ['F:I can\'t even look at the neighbours.', 'F:Prison. My own blood. I didn\'t raise you for this.', 'I knew this would happen.'], jeal: [] },
  crime: { pos: ['Whatever you\'re mixed up in, be careful.'], neg: ['People are talking, {n}. About things you\'ve done.', 'The police came asking about you.', 'I don\'t want to know where that money came from.'], jeal: [] },
  killer: { pos: ['You did what you had to do. I hope.'], neg: ['There\'s blood on you, {n}. I can see it in your eyes.', 'Someone died. Tell me it wasn\'t you.', 'I\'m scared of you sometimes.'], jeal: [] },
  brawler: { pos: ['Heard you\'ve been winning fights. Don\'t let it go to your head.'], neg: ['Another black eye? Stop picking fights.', 'You come home bruised every week.'], jeal: ['You think you\'re so tough.'] },
  hurt: { pos: ['Rest, {n}. Please. I\'ll bring soup.', 'You scared me half to death. How are you feeling?', 'Let me take care of you for once.'], neg: ['You never listen when I tell you to be careful.', 'Look at you. Was it worth it?'], jeal: [] },
  married: { pos: ['You\'re married! I cried the whole ceremony.', 'F:Welcome to the family — both of you.', 'Finally! I was starting to worry.'], neg: ['Married? Already? Well… I hope you know what you\'re doing.'], jeal: ['Hm. Congratulations, I guess.'] },
  dating: { pos: ['So… who is this person you\'re always smiling at your phone about?', 'You seem happy. Bring them to dinner!'], neg: ['Be careful, {n}. Don\'t lose your head.'], jeal: ['Must be nice.'] },
  breakup: { pos: ['Their loss. Come here.', 'Want to get very drunk and complain about them?'], neg: ['I never liked them anyway.', 'Maybe this time you\'ll learn something.'], jeal: [] },
  baby: { pos: ['A baby! Let me hold them. Please.', 'I\'m going to spoil that child rotten.', 'You\'re a parent now. Everything changes.'], neg: ['A child… are you ready for this?'], jeal: [] },
  famous: { pos: ['I saw you on the news! I showed everyone at work.', 'You\'re famous now. Don\'t forget us little people.'], neg: ['Fame changes people, {n}. Don\'t let it change you.'], jeal: ['Everyone keeps asking me about you. It\'s exhausting.', 'Famous. Great. Wonderful.'] },
  hunter: { pos: ['You keep walking into Gates and walking back out. How?', 'Bring me back something shiny next time.'], neg: ['Every time a Gate opens I wonder if you\'re in it.', 'One of these days you won\'t come back out.'], jeal: [] },
  graduate: { pos: ['F:A diploma! Our family\'s first scholar.', 'F:I framed the photo already.', 'All those late nights paid off.'], neg: [], jeal: ['A piece of paper. Good for you.'] },
  sect: { pos: ['You have your own sect now? I\'m telling everyone.', 'F:Clan head at your age. Our ancestors are proud.'], neg: ['Running a whole sect… don\'t forget who you were.'], jeal: ['A sect master. Should I bow now?'] },
  addict: { pos: ['I\'m here when you\'re ready, {n}. No judgement.'], neg: ['You\'re not yourself any more. I see what you\'re taking.', 'Please. Get help. Before it\'s too late.', 'Where did all your money go?'], jeal: [] },
  rich: { pos: ['Look at you, doing well for yourself!', 'Money suits you.'], neg: ['Don\'t let money make you forget your family.'], jeal: ['Rich now, are we?', 'Must be nice to never check prices.'] },
  broke: { pos: ['If you need anything, just ask. I mean it.', 'Come eat with us. No arguments.'], neg: ['You need to manage your money, {n}.', 'In debt again?'], jeal: [] },
  glowup: { pos: ['Have you done something different? You look amazing.', 'Who are you dressing up for, hm?'], neg: [], jeal: ['Pretty pleased with yourself lately.'] },
};
// which way does this person react to this news
function tone(c, p, id) {
  ensurePersona(p);
  const bad = ['prison', 'crime', 'killer', 'addict', 'brawler'].includes(id), worry = ['hurt', 'hunter', 'broke', 'lostjob', 'breakup'].includes(id);
  if (bad) return p.close >= 75 && !isParent(p) && has(p, 'kind', 'playful', 'funny') ? 'pos' : (p.close >= 85 && has(p, 'kind') ? 'pos' : 'neg');
  if (worry) return p.close >= 50 || has(p, 'kind') ? 'pos' : 'neg';
  if (has(p, 'competitive', 'proud') && !isParent(p) && !isLove(c, p) && p.close < 70 && chance(0.6)) return 'jeal';
  if (has(p, 'grumpy', 'serious', 'guarded') && p.close < 55 && chance(0.5)) return 'neg';
  return 'pos';
}
const CLOSE_D = { pos: [2, 4], neg: [-3, -1], jeal: [-2, 0] };

function reactions(c, prev) {
  const news = changes(c, prev); if (!news.length) return;
  const pool = people(c).filter(p => p.close >= 25 && (p.age >= 6));
  const used = new Set(); let said = 0;
  for (const ev of news) {
    if (said >= 3) break;
    const who = pool.filter(p => !used.has(p.id)).sort((a, b) => (FAMILY.includes(b.role) ? 30 : 0) + b.close - (FAMILY.includes(a.role) ? 30 : 0) - a.close + ri(-25, 25));
    const p = who[0]; if (!p) break;
    let t = tone(c, p, ev.id), lines = LINES[ev.id]?.[t]; if (!lines?.length) { t = 'pos'; lines = LINES[ev.id]?.pos; } if (!lines?.length) continue;
    used.add(p.id); said++;
    const fam = FAMILY.includes(p.role) && !isLove(c, p) || isParent(p); const ok = lines.filter(l => !l.startsWith('F:') || fam); if (!ok.length) { used.delete(p.id); said--; continue; }
    say(p, pick(ok).replace(/^F:/, '').replace('{n}', c.first), t === 'pos' ? 'say good' : 'say bad');
    gainClose(c, p, ri(...CLOSE_D[t])); if (t === 'neg' && p.close >= 60) stat(c, 'happiness', -2); if (t === 'pos' && p.close >= 60) stat(c, 'happiness', 1);
  }
}

// ---------- small talk: a random line from someone in your life (not every year)
const CHAT = {
  parent: ['Did you eat today?', 'When are you coming home for dinner?', 'Wear a coat, it\'s cold out.', 'Your cousin just got promoted, you know.', 'We\'re proud of you. We don\'t say it enough.'],
  kid: ['Can we get a dog?', 'I drew you a picture!', 'Why is the sky blue?', 'I don\'t want to go to school.', 'When I grow up I want to be just like you.'],
  love: ['I was thinking about you all day.', 'Come home early tonight?', 'You work too hard.', 'Remember when we met?', 'I made your favourite.'],
  friend: ['Long time! Drinks soon?', 'You will not believe what happened at work.', 'I need your opinion on something stupid.', 'Saw a cat that looked exactly like you.', 'We should do something reckless this summer.', 'Miss hanging out with you.'],
  sibling: ['Mum keeps asking about you. Call her.', 'Remember when we broke the neighbour\'s window?', 'Can I borrow your jacket? Forever?', 'You\'re still the annoying one, by the way.'],
};
const kindOf = (c, p) => isParent(p) ? 'parent' : (p.role === 'Son' || p.role === 'Daughter') && p.age < 16 ? 'kid' : isLove(c, p) ? 'love' : (p.role === 'Brother' || p.role === 'Sister') ? 'sibling' : 'friend';
function smallTalk(c) {
  const pool = people(c).filter(p => p.close >= 45 && p.age >= 5); if (!pool.length || !chance(0.45)) return;
  const p = pick(pool); say(p, pick(CHAT[kindOf(c, p)]));
}

// ---------- neglect: people you never spend time with drift away, and tell you so
function neglect(c) {
  for (const p of people(c)) {
    if (p.close < 50 || c.age < 12 || !(FAMILY.includes(p.role) || ['Friend', 'Best Friend'].includes(p.role))) continue;
    if (p.neglectSaid && G.world.year - p.neglectSaid < 4) continue;
    const last = p.lastTalk ?? p.met ?? G.world.year; if (G.world.year - last < 3) continue;
    if (chance(0.25)) { p.neglectSaid = G.world.year; p.close = clamp(p.close - ri(2, 5)); say(p, pick(isParent(p) ? ['You never call any more.', 'Are we not good enough for you now?', 'I had to hear about your life from the neighbours.'] : isLove(c, p) ? ['Do you even see me any more?', 'I feel like I\'m living with a stranger.'] : ['Guess you\'re too busy for me these days.', 'You used to have time for me.', 'Did I do something wrong?']), 'say bad'); return; }
  }
}

// ---------- loans come back (or don't)
function loans(c) {
  c.loans = (c.loans || []).filter(L => { const p = c.people.find(x => x.id === L.who); if (!p || !p.alive) return false;
    if (G.world.year < L.due) return true;
    if (chance(L.honest)) { money(c, L.amt); gainClose(c, p, 5); say(p, pick(['Here — every coin. Thank you for trusting me.', 'I didn\'t forget. Thank you, truly.', 'Paid back, with interest in gratitude.']), 'say good'); ui.log(`${p.first} paid back ${fmtMoney(c, L.amt)}.`, 'good'); }
    else { p.close = clamp(p.close - 4); ui.log(`${p.first} never paid back the ${fmtMoney(c, L.amt)} I lent them. Neither of us mentions it.`, 'bad'); }
    return false; });
}

// ---------- requests: someone comes to you
const REQ = [
  { id: 'hangout', w: 5, who: (c, p) => !isParent(p) && p.age >= 8 && Math.abs(p.age - c.age) < 25, run: async (c, p) => {
      const place = pick(['the night market', 'a karaoke bar', 'the river at sunset', 'a hot-pot place', 'the arcade', 'a rooftop party', 'a mountain temple fair', 'a street-food crawl']);
      const v = await ask(c, p, `${p.first} messages you: "Come to ${place} with me tonight?"`, [['Go (1 social)', 'go', c.social <= 0], ['Not tonight', 'no']]);
      if (v === 'go') { c.social = Math.max(0, c.social - 1); p.lastTalk = G.world.year; gainClose(c, p, ri(6, 11)); stat(c, 'happiness', ri(4, 8)); stat(c, 'stress', -ri(3, 6));
        return ui.log(pick([`${p.first} and I went to ${place}. We laughed until our sides hurt.`, `A long night at ${place} with ${p.first}. Exactly what I needed.`, `${p.first} dragged me to ${place} and I'm glad they did.`, `${p.first} and I stayed at ${place} until closing, talking about everything.`]), 'good'); }
      gainClose(c, p, has(p, 'kind', 'shy') ? -1 : -ri(3, 5)); say(p, pick(['Fine. Maybe next time.', 'You always say that.', 'No worries!']), 'say'); } },
  { id: 'loan', w: 3, who: (c, p) => p.age >= 16 && c.money > 3000 * (wage(c) || 1), run: async (c, p) => {
      const amt = Math.max(100, Math.round(Math.min(c.money * pick([0.03, 0.05, 0.08]), ri(1500, 12000) * (wage(c) || 1)) / 10) * 10), why = pick(['rent is due and I\'m short', 'my car broke down', 'a medical bill', 'I lost my job last month', 'a business idea — it can\'t fail', 'my kid needs school fees', 'I owe the wrong people']);
      const honest = clamp(0.35 + p.close / 150 + (has(p, 'practical', 'serious', 'kind') ? 0.2 : 0) - (why.includes('wrong people') || why.includes('can\'t fail') ? 0.25 : 0), 0.1, 0.92);
      const v = await ask(c, p, `${p.first} looks embarrassed. "I hate asking… could you lend me ${fmtMoney(c, amt)}? ${why[0].toUpperCase() + why.slice(1)}."`, [[`Lend it (they'll pay back… probably)`, 'lend'], ['Give it as a gift', 'gift'], ['Refuse', 'no']]);
      if (v === 'lend') { money(c, -amt); (c.loans ||= []).push({ who: p.id, amt, due: G.world.year + ri(1, 3), honest }); gainClose(c, p, ri(5, 9)); return ui.log(`I lent ${p.first} ${fmtMoney(c, amt)}.`); }
      if (v === 'gift') { money(c, -amt); gainClose(c, p, ri(10, 16)); stat(c, 'happiness', 3); say(p, pick(['I don\'t know what to say. Thank you.', 'I\'ll never forget this.', 'You\'re the best person I know.']), 'say good'); return; }
      gainClose(c, p, -ri(5, 10)); say(p, pick(['Right. Of course. Sorry I asked.', 'I see where I stand.', 'Forget it.']), 'say bad'); } },
  { id: 'visit', w: 3, who: (c, p) => isParent(p) && c.age >= 18 && !c.people.some(x => x === p && x.livesWith), run: async (c, p) => {
      const v = await ask(c, p, `${p.first} calls: "Come home this weekend? I'm making your favourite. It's been so long."`, [['Go home (1 action)', 'go', c.actions <= 0], ['Send a gift instead', 'gift', c.money < 200 * (wage(c) || 1)], ['Too busy', 'no']]);
      if (v === 'go') { c.actions--; p.lastTalk = G.world.year; gainClose(c, p, ri(8, 14)); stat(c, 'happiness', 6); stat(c, 'stress', -8); return ui.log(pick([`A weekend at home. ${p.first} fed me until I couldn't move.`, `${p.first} showed me old photos all evening. I didn't mind.`, `Home smelled exactly the same. ${p.first} cried a little when I left.`]), 'good'); }
      if (v === 'gift') { const m = Math.round(200 * wage(c)); money(c, -m); gainClose(c, p, 3); return ui.log(`I sent ${p.first} a gift instead of visiting. (${fmtMoney(c, m)})`); }
      gainClose(c, p, -ri(4, 7)); say(p, pick(['Always too busy.', 'We won\'t be around forever, you know.', 'Alright. Next time, then.']), 'say bad'); } },
  { id: 'date', w: 3, who: (c, p) => isLove(c, p), run: async (c, p) => {
      const v = await ask(c, p, `${p.first}: "Date night? Just us. No phones."`, [['Yes (1 social)', 'go', c.social <= 0], ['Rain check', 'no']]);
      if (v === 'go') { c.social = Math.max(0, c.social - 1); p.lastTalk = G.world.year; gainClose(c, p, ri(8, 13)); stat(c, 'happiness', 8); stat(c, 'stress', -6); return ui.log(pick([`Date night with ${p.first}. I remembered why I fell for them.`, `${p.first} and I walked for hours and ended up somewhere neither of us knew.`, `Candles, terrible wine, perfect company. ${p.first} looked radiant.`]), 'good'); }
      gainClose(c, p, -ri(5, 9)); say(p, pick(['Again?', 'It\'s fine. It\'s always fine.', 'I just miss you, that\'s all.']), 'say bad'); } },
  { id: 'help', w: 2, who: (c, p) => p.age >= 18 && !isParent(p), run: async (c, p) => {
      const job = pick(['move flats', 'paint their new place', 'carry a sofa up six floors', 'fix their roof before the rain', 'set up their market stall']);
      const v = await ask(c, p, `${p.first}: "Any chance you could help me ${job}? I'll buy dinner."`, [['Help (1 action)', 'go', c.actions <= 0], ['Can\'t, sorry', 'no']]);
      if (v === 'go') { c.actions--; p.lastTalk = G.world.year; gainClose(c, p, ri(9, 14)); stat(c, 'strength', 1); if (chance(0.1)) { stat(c, 'health', -4); return ui.log(`I helped ${p.first} ${job} and pulled something in my back. They felt terrible and bought two dinners.`, 'bad'); } return ui.log(`I helped ${p.first} ${job}. They owe me one now.`, 'good'); }
      gainClose(c, p, -ri(2, 5)); } },
  { id: 'advice', w: 3, who: (c, p) => p.age >= 12, run: async (c, p) => {
      const topic = pick(['their relationship is falling apart', 'they hate their job', 'they think they\'re failing at everything', 'they want to drop everything and travel', 'they had a huge fight with their family']);
      ensurePersona(p);
      const v = await ask(c, p, `${p.first} sits down heavily. ${topic[0].toUpperCase() + topic.slice(1)}. They want to talk.`, [['Give honest, practical advice', 'advice'], ['Just listen', 'listen'], ['Tell a joke to lighten it', 'joke'], ['"You\'ll be fine." (change the subject)', 'brush']]);
      const P = (await import('../data/personas.js')).PERSONAS; const likes = p.persona.some(t => P[t].likes.includes(v)), hates = p.persona.some(t => P[t].dislikes.includes(v));
      p.lastTalk = G.world.year;
      if (v === 'brush') { gainClose(c, p, -ri(4, 7)); return say(p, 'Right. Forget I said anything.', 'say bad'); }
      if (likes && !hates) { gainClose(c, p, ri(8, 12)); return say(p, pick(['That\'s exactly what I needed to hear.', 'Thank you. I mean it.', 'You always know what to say.']), 'say good'); }
      if (hates) { gainClose(c, p, -ri(2, 4)); return say(p, pick(['That\'s… not really what I needed.', 'You don\'t get it.']), 'say bad'); }
      gainClose(c, p, ri(2, 5)); say(p, 'Thanks for being there.', 'say'); } },
  { id: 'kid', w: 3, who: (c, p) => (p.role === 'Son' || p.role === 'Daughter') && p.age >= 4 && p.age < 16, run: async (c, p) => {
      const want = pick([['a puppy', 'pet'], ['help with homework', 'hw'], ['to come to their school play', 'play'], ['new shoes like everyone else has', 'shoes'], ['to learn how to fight', 'fight']]);
      const v = await ask(c, p, `${p.first} tugs your sleeve. They want ${want[0]}.`, [['Yes', 'yes'], ['Not now, sweetheart', 'no']]);
      if (v === 'yes') { p.lastTalk = G.world.year; gainClose(c, p, ri(6, 10)); stat(c, 'happiness', 4);
        if (want[1] === 'hw') { p.stats.smarts = clamp((p.stats.smarts || 40) + 3); stat(c, 'smarts', 1); }
        if (want[1] === 'shoes' || want[1] === 'pet') money(c, -Math.round(ri(60, 300) * wage(c)));
        if (want[1] === 'fight') p.stats.strength = clamp((p.stats.strength || 30) + 3);
        return ui.log(pick([`${p.first} beamed at me like I'd hung the moon.`, `${p.first} told everyone at school about it.`, `Small things. ${p.first} will remember them forever.`]), 'good'); }
      gainClose(c, p, -ri(3, 6)); ui.log(`${p.first} went quiet and walked away.`, 'bad'); } },
];
async function ask(c, p, text, opts) {
  const { indexCard } = await import('../ui/conversation.js').catch(() => ({}));
  return ui.choice({ title: `${p.first} ${p.last || ''}`.trim(), icon: 'people', portrait: indexCard ? indexCard(p) : null, dismiss: false, text: `${p.role} · closeness ${p.close}%\n${text}`, options: opts.map(([label, value, dis]) => ({ label, value, disabled: !!dis, ghost: value === 'no' })) });
}
async function request(c) {
  if (c.age < 6 || c.prison || !ui.choice || !chance(c.age < 14 ? 0.3 : 0.55)) return;
  const pool = people(c).filter(p => p.close >= 30);
  const opts = []; for (const R of REQ) for (const p of pool) if (R.who(c, p)) opts.push({ R, p, w: R.w * (0.5 + p.close / 100) });
  if (!opts.length) return; let r = Math.random() * opts.reduce((s, o) => s + o.w, 0); const o = opts.find(x => (r -= x.w) < 0) || opts[0];
  await o.R.run(c, o.p);
}


// ---------- their own lives: people get married, promoted, sick, move away… and tell you about it
const LIFE = [
  { id: 'wed', ok: p => p.age >= 20 && !p.married && !FAMILY.includes(p.role), run: async (c, p) => { p.married = true;
      const v = await ask(c, p, `${p.first} is getting married! "You have to come. It wouldn\'t be the same without you."`, [['Go and bring a gift', 'gift', c.money < 300 * (wage(c) || 1)], ['Go', 'go'], ['Make an excuse', 'no']]);
      if (v === 'gift') { money(c, -Math.round(300 * wage(c))); gainClose(c, p, ri(10, 15)); stat(c, 'happiness', 6); return ui.log(`I danced at ${p.first}'s wedding and gave them a generous gift. They hugged me twice.`, 'good'); }
      if (v === 'go') { gainClose(c, p, ri(5, 9)); stat(c, 'happiness', 5); return ui.log(`${p.first}'s wedding: lanterns, too much food, one very drunk uncle.`, 'good'); }
      gainClose(c, p, -ri(6, 10)); say(p, 'You missed my wedding.', 'say bad'); } },
  { id: 'baby', ok: p => p.age >= 22 && p.age <= 45 && p.married && !FAMILY.includes(p.role), run: (c, p) => { p.kids = (p.kids || 0) + 1; ui.log(`${p.first} had a baby. They sent me a photo of a very small, very angry face.`); } },
  { id: 'promo', ok: p => p.age >= 20 && p.age < 65, run: (c, p) => { say(p, pick(['I got promoted! Drinks are on me.', 'They finally made me manager.', 'I quit my job and started my own business!']), 'say good'); } },
  { id: 'sick', ok: p => p.age >= 40, run: (c, p) => { p.ill = true; say(p, pick(['The doctor found something. It\'s probably nothing.', 'I\'ve been in hospital. I didn\'t want to worry you.', 'My back is ruined. Getting old is a scam.']), 'say bad'); if (p.close >= 60) stat(c, 'stress', 4); } },
  { id: 'move', ok: p => p.age >= 18 && !isLove({ partnerId: null }, p) && !isParent(p), run: (c, p) => { say(p, pick(['I\'m moving to another city. I\'ll visit, I promise.', 'I got a job abroad! Come see me sometime.']), 'say'); p.close = clamp(p.close - 5); } },
  { id: 'qi', ok: p => p.age >= 12 && p.age < 40 && !p.realm, run: (c, p) => { p.realm = 1; say(p, pick(['I felt it. The Qi. You weren\'t lying all those years.', 'I joined a sect. Don\'t laugh!']), 'say good'); } },
  { id: 'brag', ok: p => p.age >= 14 && has(p, 'proud', 'competitive'), run: (c, p) => { say(p, pick(['I bought a new car. Just saying.', 'Did you hear I won the tournament?', 'My boss says I\'m the best they\'ve ever had.'])); } },
];
async function theirLives(c) {
  if (!chance(0.4)) return; const pool = people(c).filter(p => p.close >= 35 && !p.coop);
  const opts = []; for (const L of LIFE) for (const p of pool) if (L.ok(p) && !(L.id === 'wed' && c.age < 14)) opts.push([L, p]);
  if (!opts.length) return; const [L, p] = pick(opts); await L.run(c, p);
}

export async function socialYear(c) {
  if (!c.alive) return;
  const prev = c._ys; c._ys = snapshot(c);
  if (prev) reactions(c, prev);
  loans(c); neglect(c); smallTalk(c);
  await theirLives(c);
  if (!c._askedThisYear) await request(c);
  c._ys = snapshot(c);
}
