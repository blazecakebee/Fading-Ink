// v0.9.30 Situations: every couple of years life puts you in a spot with no perfect answer.
// Each option has a cost and a chance of something going right (or wrong). The people involved remember.
import { G, save } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp } from '../core/rng.js';
import { stat, money, fmtMoney, wage } from './life.js';
import { gainClose } from './people.js';
import { eff } from './body.js';

const FAM = ['Father', 'Mother'];
const alive = (c, f) => (c.people || []).filter(p => p.alive && !p.coop && f(p));
const parent = c => pick(alive(c, p => FAM.includes(p.role)));
const friend = c => pick(alive(c, p => ['Friend', 'Best Friend', 'Classmate'].includes(p.role)));
const partner = c => alive(c, p => p.id === c.partnerId || ['Spouse', 'Partner'].includes(p.role))[0];
const sibling = c => pick(alive(c, p => ['Brother', 'Sister'].includes(p.role)));
const kid = c => pick(alive(c, p => ['Son', 'Daughter'].includes(p.role) && p.age >= 4 && p.age < 18));
const boss = c => !!c.job && !c.prison;
const W = c => wage(c) || 1;
const mum = p => p.role === 'Mother' ? 'mum' : p.role === 'Father' ? 'dad' : p.first;

// apply an outcome: { s: {stat: n}, close: n (for the situation's person), money: n (× wage), ill: id, text, cls, perf: n }
async function apply(c, o, p) {
  for (const [k, v] of Object.entries(o.s || {})) stat(c, k, v);
  if (o.close && p) { if (o.close > 0) gainClose(c, p, o.close); else p.close = clamp(p.close + o.close); }
  if (o.money) money(c, Math.round(o.money * W(c)));
  if (o.ill) (await import('./health.js')).addCondition(c, o.ill);
  if (o.perf && c.job) c.job.perf = clamp((c.job.perf ?? 50) + o.perf);
  if (o.text) ui.log(o.text, o.cls || (o.close < 0 || (o.s && Object.values(o.s).some(v => v < -4)) ? 'bad' : 'good'));
}
// an option either always does one thing (ok), or rolls its chance p: ok on success, bad otherwise

export const SITUATIONS = [
  { id: 'rain_bday', who: c => c.age >= 10 && c.age <= 40 && parent(c), make: (c, p) => ({
      text: `It's pouring and you need to be home before 6 for your ${mum(p)}'s birthday dinner. The bus isn't coming.`,
      opts: [
        { t: 'Run home through the rain', p: c => clamp(0.55 + eff(c, 'health') / 400, 0.4, 0.9), ok: { close: 6, s: { happiness: 4 }, text: `I ran the whole way and burst in soaked at 5:58. ${p.first} laughed, hugged me and handed me a towel. Best birthday dinner in years.` }, bad: { close: 4, ill: 'flu', text: `I made it on time — and spent the next week in bed with the flu. ${p.first} said it was the thought that counted.` } },
        { t: 'Wait for the rain to stop', ok: { close: -7, s: { stress: 4 }, text: `The rain stopped at 7. I walked in during dessert. ${p.first} didn't say anything, which was worse.` } },
        { t: 'Call and explain', p: 0.55, ok: { close: 1, text: `${p.first} said "Stay dry, silly, we'll wait." They actually waited.` }, bad: { close: -4, text: `"It's always something with you." ${p.first} hung up.` } },
        { t: 'Splurge on a taxi', need: c => c.money >= 30 * W(c), ok: { money: -30, close: 5, text: `A taxi, an umbrella and a cake from the bakery on the corner. Expensive. Worth it.` } }] }) },
  { id: 'exam_party', who: c => c.age >= 14 && c.age <= 22 && ['Secondary School', 'University'].includes(c.edu?.school) && friend(c), make: (c, p) => ({
      text: `Your exam is tomorrow morning. ${p.first} is throwing the party of the year tonight and "everyone" will be there.`,
      opts: [
        { t: 'Stay home and study', ok: { s: { smarts: 2, happiness: -3 }, close: -3, text: `I studied until midnight. The exam went well. ${p.first} posted 200 photos I'm not in.` } },
        { t: 'Go "for one hour"', p: c => clamp(0.3 + eff(c, 'smarts') / 250, 0.2, 0.7), ok: { s: { happiness: 6 }, close: 5, text: `One hour became four — and somehow I still aced the exam. I will never understand it.` }, bad: { s: { happiness: 3, stress: 8 }, close: 5, text: `Great party. Terrible exam. I wrote my name and then mostly stared at the wall.` } },
        { t: 'Ask them to postpone the party', p: 0.15, ok: { close: 3, text: `${p.first} actually moved it to the weekend. For me. I owe them.` }, bad: { close: -4, text: `"Postpone? Are you my mum?" ${p.first} laughed at me in the group chat.` } }] }) },
  { id: 'wallet', who: c => c.age >= 10, make: c => { const amt = Math.round(ri(80, 400) * W(c)); return {
      text: `You find a wallet on the pavement with ${fmtMoney(c, amt)} inside and an ID card.`,
      opts: [
        { t: 'Return it to the owner', p: 0.4, ok: { s: { happiness: 6 }, money: Math.round(amt * 0.3 / W(c)), text: `The owner cried and insisted I take a reward. People are good sometimes.` }, bad: { s: { happiness: 4 }, text: `The owner snatched it back without a word and counted the money in front of me. Still the right thing.` } },
        { t: 'Hand it to the police', ok: { s: { happiness: 2 }, text: 'I handed it in. Never heard about it again.' } },
        { t: 'Keep the cash, bin the wallet', p: 0.8, ok: { money: Math.round(amt / W(c)), s: { stress: 3 }, text: `I kept the ${fmtMoney(c, amt)}. I keep thinking about the face on that ID card.` }, bad: { s: { stress: 10, happiness: -6 }, text: 'A camera caught me. The police were very polite about it. My face burned for days.', after: c => { c.karma = (c.karma || 0) - 3; } } }] }; } },
  { id: 'friend_secret', who: c => c.age >= 12 && friend(c), make: (c, p) => ({
      text: `You saw ${p.first}'s partner on a date with someone else. ${p.first} has no idea.`,
      opts: [
        { t: 'Tell them right away', p: 0.6, ok: { close: 8, s: { stress: 3 }, text: `${p.first} cried, then thanked me. "You're the only one who'd tell me."` }, bad: { close: -10, text: `${p.first} didn't believe me. "Why would you say that? Are you jealous?" We barely speak now.` } },
        { t: 'Confront the partner first', p: c => clamp(0.3 + eff(c, 'charisma') / 200, 0.2, 0.75), ok: { close: 5, text: 'I told them to come clean or I would. They did. Messy, but honest.' }, bad: { close: -5, text: `They got to ${p.first} first with a story about me. Now I'm the villain.` } },
        { t: 'Stay out of it', p: 0.5, ok: { s: { stress: 2 }, text: 'I kept my mouth shut. It ended on its own a month later.' }, bad: { close: -12, text: `${p.first} found out I knew all along. "You KNEW?"` } }] }) },
  { id: 'overtime', who: c => c.age >= 18 && boss(c) && (partner(c) || kid(c) || parent(c)), make: c => { const p = partner(c) || kid(c) || parent(c), ev = p.role === 'Son' || p.role === 'Daughter' ? `${p.first}'s school play` : p.role === 'Spouse' || p.role === 'Partner' ? 'your anniversary dinner' : `${p.first}'s retirement party`; return { p,
      text: `Your boss drops an urgent project on your desk at 4pm. It's ${ev} tonight.`,
      opts: [
        { t: 'Stay and finish the project', ok: { perf: 8, close: -8, s: { stress: 6 }, text: `I finished the project. I missed ${ev}. I got a nod from my boss and a cold dinner.` } },
        { t: 'Leave on time', p: 0.6, ok: { close: 7, s: { happiness: 5 }, perf: -2, text: `I went. It was the right call — nobody remembers the project.` }, bad: { close: 7, perf: -10, s: { stress: 5 }, text: `I went, and it was lovely. My boss has not forgotten.` } },
        { t: 'Bring the laptop along', p: c => clamp(0.35 + eff(c, 'smarts') / 300, 0.3, 0.7), ok: { perf: 4, close: 2, text: 'I worked in the corner and still caught the important part. Barely.' }, bad: { perf: -3, close: -6, text: 'Half-present at both and good at neither. Everyone noticed.' } }] }; } },
  { id: 'stray', who: c => c.age >= 8 && !c.assets.some(a => a.type === 'pet'), make: c => ({
      text: 'A soaked, shivering puppy follows you all the way home and sits at your door.',
      opts: [
        { t: 'Take it in', p: 0.85, ok: { s: { happiness: 10 }, money: -50, text: 'I took it in. Its name is Lucky now. It is not lucky; it eats my shoes.', after: c => c.assets.push({ type: 'pet', name: 'Lucky the dog', value: 0 }) }, bad: { s: { happiness: -4 }, money: -120, text: 'It was sicker than it looked. The vet did everything, and I held it at the end.' } },
        { t: 'Take it to a shelter', ok: { s: { happiness: 2 }, text: 'The shelter took it. I checked back: adopted within a week.' } },
        { t: 'Close the door', ok: { s: { happiness: -3, stress: 2 }, text: 'It was gone in the morning. I hope someone else opened their door.' } }] }) },
  { id: 'sick_sibling', who: c => c.age >= 8 && c.age <= 25 && sibling(c), make: (c, p) => ({
      text: `${p.first} is sick and begs you to stay home and keep them company. You promised your friends you'd come to the lake today.`,
      opts: [
        { t: 'Stay with them', ok: { close: 8, s: { happiness: -2 }, text: `We watched terrible films all day. ${p.first} fell asleep on my shoulder.` } },
        { t: 'Go to the lake', p: 0.7, ok: { close: -4, s: { happiness: 6 }, text: 'The lake was perfect. I brought back ice cream; it was half-forgiven.' }, bad: { close: -8, s: { happiness: 2 }, ill: 'flu', text: `I went anyway, and caught whatever ${p.first} had. Karma, they said.` } },
        { t: 'Bring the lake to them (a bucket of water and photos)', p: 0.6, ok: { close: 6, s: { happiness: 3 }, text: `${p.first} laughed so hard they started coughing. Worth it.` }, bad: { close: 1, text: `${p.first} did not find it as funny as I did.` } }] }) },
  { id: 'cheat', who: c => c.age >= 12 && c.age <= 22 && ['Secondary School', 'University'].includes(c.edu?.school), make: c => ({
      text: 'Someone is passing the answers to tomorrow\'s exam around. A copy lands in your messages.',
      opts: [
        { t: 'Use them', p: 0.7, ok: { s: { stress: 4 }, text: 'I got a great mark. It doesn\'t feel like mine.', after: c => { c.edu.grades = clamp((c.edu.grades || 50) + 4); } }, bad: { s: { stress: 12, happiness: -8 }, text: 'The teacher had changed the questions — and noticed who answered the old ones. Detention, a zero and a letter home.', after: c => { c.edu.grades = clamp((c.edu.grades || 50) - 8); } } },
        { t: 'Delete them and study', ok: { s: { smarts: 2 }, text: 'I deleted them. My mark was honest, if not perfect.' } },
        { t: 'Report it', p: 0.5, ok: { s: { happiness: 3 }, text: 'The exam was rewritten. Nobody knows it was me. I think.' }, bad: { s: { stress: 8 }, text: 'Everybody knows it was me.' } }] }) },
  { id: 'loan_shark', who: c => c.age >= 20 && sibling(c), make: (c, p) => { const amt = Math.round(ri(500, 3000) * W(c)); return {
      text: `${p.first} turns up at night, scared. They owe ${fmtMoney(c, amt)} to some very unfriendly people.`,
      opts: [
        { t: `Pay it off (${fmtMoney(c, amt)})`, need: c => c.money >= amt, ok: { money: -amt / W(c), close: 12, text: `I paid. ${p.first} swore it was the last time. We'll see.` } },
        { t: 'Go and talk to them yourself', p: c => clamp(0.3 + eff(c, 'strength') / 300 + eff(c, 'charisma') / 400 + (c.qi?.realm || 0) * 0.08, 0.2, 0.95), ok: { close: 10, text: 'I had a word with them. They decided the debt was forgiven. They will not be bothering anyone in my family again.' }, bad: { close: 4, s: { health: -14 }, text: 'They did not want to talk. I came home with a split lip and the debt still there.' } },
        { t: 'Tell them to sort it out themselves', p: 0.4, ok: { close: -6, text: `${p.first} sorted it out. They haven't forgiven me.` }, bad: { close: -14, s: { stress: 6 }, text: `${p.first} ended up in hospital. They won't take my calls.` } }] }; } },
  { id: 'promotion_friend', who: c => c.age >= 22 && boss(c) && alive(c, p => p.role === 'Coworker' || p.role === 'Friend').length, make: c => { const p = pick(alive(c, p => p.role === 'Coworker' || p.role === 'Friend')); return { p,
      text: `There's one promotion and two candidates: you, and ${p.first}. Your boss asks you, privately, who deserves it more.`,
      opts: [
        { t: 'Say you do', p: 0.55, ok: { perf: 6, close: -5, text: `I got it. ${p.first} congratulated me through their teeth.`, after: c => { if (c.job) c.job.raise = (c.job.raise || 1) * 1.08; } }, bad: { perf: -4, close: -6, text: `${p.first} got it anyway — and found out what I'd said.` } },
        { t: `Say ${p.first} does`, p: 0.3, ok: { close: 12, perf: 4, text: `${p.first} got the promotion — and my boss remembered my honesty. A raise came my way six months later.`, after: c => { if (c.job) c.job.raise = (c.job.raise || 1) * 1.05; } }, bad: { close: 10, text: `${p.first} got it, and bought me dinner for a month.` } },
        { t: 'Say you both do', ok: { perf: -1, close: 2, text: 'My boss sighed. "That\'s not an answer." They picked someone else entirely.' } }] }; } },
  { id: 'crash_witness', who: c => c.age >= 14, make: c => ({
      text: 'A car swerves and clips a cyclist right in front of you, then speeds off. The cyclist isn\'t moving.',
      opts: [
        { t: 'Help the cyclist and call an ambulance', p: 0.8, ok: { s: { happiness: 6, stress: 4 }, text: 'The cyclist pulled through. The doctors said the first few minutes saved them.', after: c => { c.karma = (c.karma || 0) + 4; } }, bad: { s: { stress: 12, happiness: -6 }, text: 'I did everything I could. It wasn\'t enough. I still see it at night.' } },
        { t: 'Chase the car', p: c => clamp(0.2 + eff(c, 'agility') / 200 + (c.qi?.realm || 0) * 0.1, 0.1, 0.95), ok: { s: { happiness: 5 }, text: 'I caught the car at the lights and held the driver until the police came.', after: c => { c.fame = (c.fame || 0) + 200; } }, bad: { s: { stress: 6 }, text: 'Gone. And by the time I got back, someone else had called the ambulance.' } },
        { t: 'Keep walking', ok: { s: { stress: 6, happiness: -5 }, text: 'Someone else stopped. I tell myself that.', after: c => { c.karma = (c.karma || 0) - 3; } } }] }) },
  { id: 'kid_lie', who: c => c.age >= 25 && kid(c), make: (c, p) => ({
      text: `${p.first}'s teacher calls: ${p.first} hasn't been to school all week. At dinner, ${p.first} says school was "fine".`,
      opts: [
        { t: 'Confront them at the table', p: 0.5, ok: { close: 2, text: `${p.first} broke down. Kids at school had been picking on them. We're dealing with it — together.` }, bad: { close: -8, text: `${p.first} stormed off and slammed the door. Nothing solved.` } },
        { t: 'Talk to them alone, later, gently', p: 0.75, ok: { close: 8, text: `${p.first} told me everything. Bullies. I'm proud they trusted me.` }, bad: { close: 1, text: `${p.first} just shrugged. "It's boring." At least they went back.` } },
        { t: 'Ground them for a month', ok: { close: -6, text: `${p.first} goes to school now. They don't talk to me much.` } }] }) },
  { id: 'parent_move', who: c => c.age >= 25 && alive(c, p => FAM.includes(p.role) && p.age >= 65).length, make: c => { const p = pick(alive(c, p => FAM.includes(p.role) && p.age >= 65)); return { p,
      text: `${p.first} fell at home again. They're ${p.age} and living alone.`,
      opts: [
        { t: 'Move them in with you', ok: { close: 12, s: { stress: 8, happiness: 2 }, text: `${p.first} moved in. The house is louder, and full of opinions about my cooking.`, after: c => { p.livesWith = true; } } },
        { t: 'Pay for a care home', need: c => c.money >= 600 * W(c), ok: { money: -600, close: -2, text: `The care home is nice. ${p.first} says so, anyway.` } },
        { t: 'Visit more often', p: 0.6, ok: { close: 6, s: { stress: 4 }, text: `I visit twice a week now. ${p.first} saves up stories for me.` }, bad: { close: -4, text: `${p.first} fell again before my next visit. I wasn't there.` } }] }; } },
  { id: 'storm_shift', who: c => c.age >= 16 && boss(c), make: c => ({
      text: 'A typhoon is coming. Your manager says the shop stays open and everyone has to come in.',
      opts: [
        { t: 'Go in anyway', p: 0.75, ok: { perf: 6, s: { stress: 4 }, text: 'I went. Four customers all day. My manager shook my hand.' }, bad: { perf: 6, s: { health: -12 }, text: 'A sign came off a building on the way. Eight stitches.' } },
        { t: 'Stay home', p: 0.5, ok: { perf: -2, text: 'Half the staff stayed home too. Nobody said a word.' }, bad: { perf: -10, s: { stress: 6 }, text: 'I got a written warning.' } },
        { t: 'Convince your manager to close', p: c => clamp(0.2 + eff(c, 'charisma') / 180, 0.15, 0.8), ok: { perf: 3, s: { happiness: 4 }, text: 'They closed. My coworkers bought me lunch for a week.' }, bad: { perf: -6, text: '"Then you can stay home. Permanently, if you like."' } }] }) },
  { id: 'old_friend', who: c => c.age >= 25 && friend(c), make: (c, p) => ({
      text: `${p.first} messages after a long silence: "I'm in town for one night only. Dinner?" You have work early tomorrow.`,
      opts: [
        { t: 'Go to dinner', p: 0.7, ok: { close: 10, s: { happiness: 7, stress: -4 }, text: `We talked until the restaurant threw us out. Like no time had passed.` }, bad: { close: 6, s: { happiness: 4, stress: 4 }, perf: -3, text: 'A wonderful night. A terrible morning.' } },
        { t: 'Say next time', ok: { close: -5, text: `"Sure. Next time." There won't be one for a while.` } },
        { t: 'Invite them to stay over instead', p: 0.6, ok: { close: 12, s: { happiness: 6 }, text: `${p.first} slept on my sofa and made me breakfast. Perfect.` }, bad: { close: 4, text: `${p.first} snored like a tiger. Still lovely to see them.` } }] }) },
  { id: 'cultivation_choice', who: c => c.qi?.known && c.qi.realm >= 1 && parent(c), make: (c, p) => ({
      text: `An elder from a sect offers you a year of secluded training on a sacred mountain. Your ${mum(p)} is not well, and asks you not to go.`,
      opts: [
        { t: 'Go into seclusion', p: 0.75, ok: { close: -8, s: { stress: -5 }, text: 'A year of silence on the mountain. My Qi has never been clearer. I came down to a cold welcome.', after: c => { c.qi.qi += Math.round(80 + c.qi.realm * 60); } }, bad: { close: -14, s: { stress: 10 }, text: `I came down from the mountain to find ${p.first} had been in hospital the whole time.`, after: c => { c.qi.qi += Math.round(60 + c.qi.realm * 50); } } },
        { t: 'Stay with your family', ok: { close: 10, s: { happiness: 4 }, text: `I stayed. ${p.first} recovered, slowly, with me there.` } },
        { t: 'Ask the elder to wait a year', p: c => clamp(0.25 + eff(c, 'charisma') / 250, 0.2, 0.7), ok: { close: 6, text: '"Filial piety is a virtue," the elder said. "The mountain will wait."' }, bad: { close: 6, text: 'The elder chose someone else. The chance is gone.' } }] }) },
  { id: 'bully', who: c => c.age >= 8 && c.age <= 16 && friend(c), make: (c, p) => ({
      text: `Some older kids have cornered ${p.first} behind the school and are taking their lunch money.`,
      opts: [
        { t: 'Step in and stop them', p: c => clamp(0.3 + eff(c, 'strength') / 200, 0.25, 0.9), ok: { close: 12, s: { happiness: 4 }, text: `They backed off. ${p.first} looks at me like I'm a hero now.` }, bad: { close: 10, s: { health: -8 }, text: `They beat us both. ${p.first} says it was still the bravest thing they've ever seen.` } },
        { t: 'Run and get a teacher', p: 0.6, ok: { close: 5, text: 'The teacher came running. The older kids got suspended.' }, bad: { close: -2, text: 'By the time the teacher came, they were gone — and so was the money.' } },
        { t: 'Pretend you didn\'t see', ok: { close: -10, s: { stress: 4 }, text: `${p.first} saw me see. They haven't sat with me since.` } }] }) },
  { id: 'inheritance_fight', who: c => c.age >= 30 && alive(c, p => FAM.includes(p.role)).length < 2 && sibling(c), make: (c, p) => ({
      text: `Clearing out the family home, you and ${p.first} both want your grandmother's old jade bracelet.`,
      opts: [
        { t: 'Let them have it', ok: { close: 8, s: { happiness: 2 }, text: `${p.first} cried when I gave it to them. It's where it should be.` } },
        { t: 'Insist on keeping it', p: 0.5, ok: { close: -6, s: { happiness: 4 }, text: `I kept it. ${p.first} said fine. It wasn't fine.` }, bad: { close: -14, text: `A screaming match in our dead parents' kitchen. We left without speaking.` } },
        { t: 'Suggest you take turns, a year each', p: 0.65, ok: { close: 6, text: `${p.first} laughed. "A custody arrangement for a bracelet." But they agreed.` }, bad: { close: -3, text: `"Don't be ridiculous." Nobody took it. It's still in a box.` } }] }) },
];

// ---------- once every couple of years
export async function situationYear(c) {
  if (!c.alive || c.prison || c.fableRun || c.age < 8 || !ui.choice) return;
  c.flags.nextSit ??= G.world.year + ri(1, 3);
  if (G.world.year < c.flags.nextSit) return;
  c.flags.nextSit = G.world.year + ri(1, 3); // about every two years
  const seen = (c.flags.sits ||= []);
  const opts = SITUATIONS.filter(s => !seen.includes(s.id) && s.who(c)); if (!opts.length) return;
  const S = pick(opts); seen.push(S.id); if (seen.length > 12) seen.shift();
  const p = (() => { const who = S.who(c); return who && who.first ? who : null; })();
  const sc = S.make(c, p); const avail = sc.opts.filter(o => !o.need || o.need(c));
  const i = await ui.choice({ title: 'A situation', icon: 'life', dismiss: false, text: sc.text, options: avail.map((o, k) => ({ label: o.t + (o.p != null ? ' 🎲' : ''), value: k })) });
  const o = avail[i ?? 0];
  const res = o.p == null ? o.ok : (chance(typeof o.p === 'function' ? o.p(c) : o.p) ? o.ok : o.bad);
  await apply(c, res, sc.p || p); res.after?.(c); save();
}
