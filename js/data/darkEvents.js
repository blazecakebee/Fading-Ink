// v0.8.7 Grittier life: crime, betrayal, addiction, tragedy and the occasional dark laugh. Each event is a
// small story with a choice where it makes sense. Weights are low: they season a life, they don't run it.
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp } from '../core/rng.js';
import { stat, money, fmtMoney, wage, addItem, die } from '../systems/life.js';
import { eff } from '../systems/body.js';
import { ENEMIES } from './combat.js';
import { effRealm } from '../systems/path.js';
import { suspendLicense } from '../systems/license.js';

const adult = c => c.age >= 18, teen = c => c.age >= 13 && c.age < 20;
const friendOf = c => pick(c.people.filter(p => p.alive && !p.coop && ['Friend', 'Coworker', 'Classmate', 'Acquaintance'].includes(p.role))) || null;
const E = (id, w, cond, run) => ({ id, w, cond, run });

export const DARK_EVENTS = [
  E('mugged', 1.2, c => c.age >= 14 && c.money > 100, async c => {
    const v = await ui.choice({ title: 'Mugged', icon: 'crime', text: 'A man steps out of an alley with a knife. "Wallet. Now."', options: [{ label: 'Hand it over', value: 'give' }, { label: 'Fight him', value: 'fight' }, { label: 'Run', value: 'run' }] });
    if (v === 'give') { const m = Math.min(c.money, Math.round(ri(20, 200) * wage(c))); money(c, -m); stat(c, 'stress', 6); return ui.log(`I handed my wallet to a man with a knife. ${fmtMoney(c, m)} gone. I couldn't stop shaking.`, 'bad'); }
    if (v === 'run') { if (chance(0.4 + eff(c, 'agility') / 250)) return ui.log('I ran and didn\'t look back until I reached home.'); stat(c, 'health', -ri(6, 14)); return ui.log('I ran. He was faster. I got cut across the arm.', 'bad'); }
    const r = await ui.fight({ ...ENEMIES.find(e => e.id === 'thug'), name: 'Mugger', realm: 0 });
    ui.log(r === 'win' ? 'I put the mugger on the ground and walked away with my wallet — and his knife.' : 'The mugger beat me and took everything.', r === 'win' ? 'good' : 'bad'); }),
  E('offered_drugs', 0.9, c => (teen(c) || adult(c)) && !c.addiction && !c.flags.saidNo, async c => {
    const v = await ui.choice({ title: 'At the party', icon: 'pill', text: `Someone presses a little bag into your hand. "${pick(['First one\'s free.', 'Trust me, you\'ll love it.', 'Everyone\'s doing it.'])}"`, options: [{ label: 'Try it', value: true }, { label: 'Say no', value: false, ghost: true }] });
    if (!v) { c.flags.saidNo = true; return ui.log('I said no. They called me boring. I felt fine with that.'); }
    stat(c, 'happiness', 10); if (chance(0.25)) { c.addiction = { years: 0 }; ui.log('I tried it. And then I wanted it again. And again.', 'bad'); } else ui.log('I tried it once. It scared me enough to never do it again.'); }),
  E('blackmail', 0.4, c => adult(c) && (c.flags.crimeWin || c.kills > 0 || c.sacrifices), async c => {
    const m = Math.round(ri(500, 3000) * wage(c));
    const v = await ui.choice({ title: 'An envelope', icon: 'letter', text: `Photos. Of you. Of what you did. A note: "${fmtMoney(c, m)} or the police get copies."`, options: [{ label: 'Pay', value: 'pay', disabled: c.money < m }, { label: 'Find them first', value: 'hunt' }, { label: 'Ignore it', value: 'ignore', ghost: true }] });
    if (v === 'pay') { money(c, -m); stat(c, 'stress', 10); return ui.log('I paid the blackmailer. I know they\'ll be back.', 'bad'); }
    if (v === 'hunt') { if (chance(0.45 + effRealm(c) * 0.1)) { c.kills += chance(0.4) ? 1 : 0; return ui.log('I found the blackmailer. They will not be sending any more envelopes.', 'bad'); } c.heat = Math.min(100, (c.heat || 0) + 30); return ui.log('I couldn\'t find them. The police got the photos.', 'bad'); }
    if (chance(0.5)) { c.heat = Math.min(100, (c.heat || 0) + 35); return ui.log('I ignored the blackmail. The police got an anonymous tip.', 'bad'); } ui.log('I ignored the blackmail. Nothing happened. Yet.'); }),
  E('friend_steals', 0.6, c => adult(c) && c.money > 1000 && !!friendOf(c), c => {
    const p = friendOf(c), m = Math.round(c.money * ri(5, 15) / 100); money(c, -m); p.close = Math.max(0, p.close - 40); stat(c, 'happiness', -8);
    ui.log(`${p.first} — my ${p.role.toLowerCase()} — had been stealing from me. ${fmtMoney(c, m)} gone. I don't know who to trust anymore.`, 'bad'); }),
  E('house_fire', 0.35, c => c.age >= 5, c => {
    const home = c.assets.find(a => a.type === 'house'); stat(c, 'health', -ri(5, 20)); stat(c, 'stress', 10);
    if (home && chance(0.5)) { home.value = Math.round(home.value * 0.5); return ui.log(`A fire tore through my ${home.name}. Insurance covered half.`, 'bad'); }
    ui.log('Our building caught fire in the night. We got out with smoke in our lungs and nothing else.', 'bad'); }),
  E('car_crash', 0.45, c => c.age >= 16 && c.assets.some(a => a.type === 'car'), c => {
    const hurt = ri(10, 35); stat(c, 'health', -hurt); stat(c, 'stress', 8);
    if (chance(0.04) && effRealm(c) < 2) return die(c, 'a head-on collision on a wet road');
    const drunk = chance(0.3); ui.log(`I crashed my car${drunk ? ' — I wasn\'t sober' : ''}. -${hurt} Health.`, 'bad'); if (drunk) suspendLicense(c, 3, 'drunk driving'); }),
  E('stalker', 0.3, c => adult(c) && (c.stats.looks >= 70 || (c.fame || 0) >= 5000), async c => {
    const v = await ui.choice({ title: 'Someone is watching', icon: 'eye', text: 'The same face in the crowd, three days running. Letters under the door that know where you\'ve been.', options: [{ label: 'Go to the police', value: 'police' }, { label: 'Confront them', value: 'confront' }, { label: 'Move house', value: 'move' }] });
    stat(c, 'stress', 12);
    if (v === 'confront' && chance(0.3)) { stat(c, 'health', -ri(5, 15)); return ui.log('I confronted my stalker. They had a knife.', 'bad'); }
    ui.log(v === 'move' ? 'I moved across the city. The letters stopped.' : 'The stalker was arrested a month later.', 'good'); }),
  E('witness', 0.5, c => c.age >= 14, async c => {
    const v = await ui.choice({ title: 'You saw it', icon: 'crime', text: 'You watched a man get shot in a car park. The shooter saw you, too.', options: [{ label: 'Testify', value: 'testify' }, { label: 'Keep quiet', value: 'quiet' }] });
    if (v === 'testify') { if (chance(0.25)) { stat(c, 'health', -ri(10, 25)); return ui.log('I testified. His friends found me afterwards.', 'bad'); } stat(c, 'happiness', 6); return ui.log('I testified. He got life. I sleep fine.', 'good'); }
    stat(c, 'stress', 8); ui.log('I kept quiet. His face still shows up in my dreams.', 'bad'); }),
  E('cult', 0.3, c => c.age >= 16 && c.stats.happiness < 45, async c => {
    const v = await ui.choice({ title: 'The Bright Path', icon: 'star', text: 'Kind people in white robes. Free meals, a place to belong, and a leader who says he can see Qi in you.', options: [{ label: 'Join them', value: true }, { label: 'Walk away', value: false, ghost: true }] });
    if (!v) return ui.log('I walked away from the people in white robes.');
    const m = Math.round(c.money * 0.6); money(c, -m); stat(c, 'happiness', 10); stat(c, 'smarts', -3);
    ui.log(`I joined the Bright Path. It took ${fmtMoney(c, m)} and two years before I saw what it really was.`, 'bad'); }),
  E('debt_collectors', 0.5, c => adult(c) && c.money < 0, c => { stat(c, 'health', -ri(6, 15)); stat(c, 'stress', 15); ui.log('Two men came about my debts. They broke two of my fingers, politely.', 'bad'); }),
  E('cheating_partner', 0.45, c => !!c.partnerId, async c => {
    const p = c.people.find(x => x.id === c.partnerId); if (!p) return;
    const v = await ui.choice({ title: 'Messages', icon: 'phone', text: `${p.first}'s phone lights up. "Last night was amazing. When can I see you again?" It isn't from you.`, options: [{ label: 'Confront them', value: 'confront' }, { label: 'Leave them', value: 'leave' }, { label: 'Say nothing', value: 'quiet', ghost: true }] });
    stat(c, 'happiness', -15); p.close = Math.max(0, p.close - 30);
    if (v === 'leave') { c.partnerId = null; p.role = 'Ex'; return ui.log(`I left ${p.first}. I didn't cry until I got home.`, 'bad'); }
    ui.log(v === 'confront' ? `${p.first} swore it meant nothing. I don't know if I believe it.` : `I said nothing about ${p.first}'s messages. It eats at me.`, 'bad'); }),
  E('food_poisoning', 0.7, c => c.age >= 4, c => { stat(c, 'health', -ri(4, 12)); ui.log(pick(['Street skewers. Never again.', 'The sushi was a mistake.', 'Bad oysters. Two days on the bathroom floor.']), 'bad'); }),
  E('dog_bite', 0.4, c => c.age >= 3, c => { stat(c, 'health', -ri(3, 10)); ui.log('A stray dog bit me. I needed stitches and shots.', 'bad'); }),
  E('inheritance_feud', 0.35, c => adult(c) && c.people.some(p => !p.alive && ['Father', 'Mother'].includes(p.role)) && c.people.some(p => p.alive && ['Brother', 'Sister'].includes(p.role)), c => {
    const s = pick(c.people.filter(p => p.alive && ['Brother', 'Sister'].includes(p.role))); s.close = Math.max(0, s.close - 35); stat(c, 'stress', 10);
    ui.log(`${s.first} and I fought over our parents' things. We said things that can't be unsaid.`, 'bad'); }),
  E('massacre', 0.2, c => c.age >= 10, c => {
    const R = effRealm(c); stat(c, 'stress', 15);
    if (R < 3 && chance(0.06)) return die(c, 'a demonic cultivator\'s massacre in the market district');
    ui.log(R >= 4 ? 'A demonic cultivator slaughtered a market street. I arrived too late to do anything but bury them.' : 'A demonic cultivator came through my district. I hid under a counter while people screamed. I lived. Many didn\'t.', 'bad'); }),
  E('lucky_find', 0.5, c => c.age >= 8, c => { const m = Math.round(ri(50, 600) * wage(c)); money(c, m); ui.log(pick([`I found ${fmtMoney(c, m)} stuffed in an old jacket from the thrift store.`, `A drunk tourist paid me ${fmtMoney(c, m)} to take a photo of him with a pigeon.`, `I won ${fmtMoney(c, m)} betting on a cockroach race. Don't ask.`]), 'good'); }),
  E('embarrassing', 0.8, c => c.age >= 10, c => { stat(c, 'happiness', -3); ui.log(pick(['I waved back at someone who was waving at the person behind me.', 'I called my teacher "Mum". In front of everyone.', 'My trousers split during a presentation.', 'I tripped up the stairs at a funeral.']), ''); }),
];

// addiction: drains money and health every year until you quit (rehab activity)
export function addictionYear(c) {
  const a = c.addiction; if (!a) return; a.years++;
  const m = Math.min(Math.max(0, c.money), Math.round(ri(300, 1500) * wage(c))); money(c, -m); stat(c, 'health', -ri(2, 5)); stat(c, 'happiness', chance(0.5) ? 4 : -6);
  if (a.years >= 2 && chance(0.008 + a.years * 0.004)) { if (effRealm(c) < 2) return die(c, 'an overdose, alone, on a bathroom floor'); stat(c, 'health', -30); ui.log('I overdosed. My cultivation was the only reason I woke up.', 'bad'); return; }
  ui.log(`My habit cost me ${fmtMoney(c, m)} this year.`, 'bad');
}
export const REHAB = { id: 'rehab', cat: 'mind', name: 'Go to rehab', icon: 'doctor', minAge: 13, need: c => !!c.addiction, run: c => {
  const fee = Math.round(2000 * wage(c)); money(c, -fee); stat(c, 'stress', 6);
  if (chance(0.45 + (c.temper || []).includes('disciplined') * 0.2)) { c.addiction = null; return { text: `Rehab (${fmtMoney(c, fee)}). The worst months of my life. I came out clean.`, cls: 'good', big: true }; }
  return { text: `Rehab (${fmtMoney(c, fee)}). I relapsed within a week.`, cls: 'bad' }; } };
