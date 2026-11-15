// Activities the player can spend Actions on. cost: 'a' = Action, 's' = Social Action.
// run(c) returns a string (chronicle text) or {text, cls, big}. Returning null means "cancelled, refund".
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp } from '../core/rng.js';
import { stat, money, fmtMoney, country, addItem, die } from '../systems/life.js';
import { meditate, openMeridian, breakthrough, learnManual, qiCap } from '../systems/cultivation.js';
import { traitMult, has, earnTrait } from '../systems/traits.js';
import { makePerson } from '../systems/people.js';
import { ENEMIES, GATE_RANKS } from './combat.js';
import { MAJORS } from './careers.js';
import { SECTS } from './realms.js';
import { G } from '../core/state.js';

export const CATEGORIES = [
  { id: 'childhood', name: 'Childhood', icon: 'teddy' },
  { id: 'training', name: 'Training', icon: 'gym' },
  { id: 'cultivation', name: 'Cultivation', icon: 'cultivation' },
  { id: 'mind', name: 'Mind & Body', icon: 'mind' },
  { id: 'school', name: 'School', icon: 'education' },
  { id: 'love', name: 'Friends & Love', icon: 'heart' },
  { id: 'work', name: 'Work & Money', icon: 'career' },
  { id: 'leisure', name: 'Leisure & Vices', icon: 'dice' },
  { id: 'crime', name: 'Crime', icon: 'crime' },
  { id: 'adventure', name: 'Outdoors & Gates', icon: 'gates' },
];

const fight = async (c, id, mods = {}) => {
  const e = ENEMIES.find(x => x.id === id);
  const r = await ui.fight({ ...e, ...mods });
  if (r === 'win') { c.wins++; if (c.wins >= 5) earnTrait(c, 'brawler'); }
  return r;
};
const study = c => traitMult(c, 'study');

export const ACTIVITIES = [
  // ---- CHILDHOOD
  { id: 'play_toys', cat: 'childhood', name: 'Play with toys', icon: 'play', minAge: 1, maxAge: 9, run: c => { stat(c, 'happiness', ri(4, 9)); return pick(['I built a fortress out of blocks.', 'My toy soldiers won a great war.', 'I had a tea party with my plushies.']); } },
  { id: 'snowball', cat: 'childhood', name: 'Snowball war', icon: 'snowball', minAge: 4, maxAge: 13, run: c => { stat(c, 'happiness', 6); stat(c, 'agility', 2); return chance(0.5) ? 'Snowball war: I led the charge. Glorious victory.' : 'Snowball war: I took one to the face. Defeat.'; } },
  { id: 'tantrum', cat: 'childhood', name: 'Throw a tantrum', icon: 'brokenheart', minAge: 2, maxAge: 7, run: c => { const p = c.people.find(p => p.role === 'Mother' && p.alive) || c.people.find(p => p.role === 'Father' && p.alive); if (p) p.close = clamp(p.close - 5); stat(c, 'happiness', 2); return 'I screamed until I got my way. Mostly.'; } },
  { id: 'cloud_watch', cat: 'childhood', name: 'Watch the clouds', icon: 'sun', minAge: 3, maxAge: 12, run: c => { stat(c, 'stress', -5);
      if (!c.qi.known && chance(has(c, 'qi_sensitive') ? 0.6 : 0.04)) { c.qi.known = true; return { text: 'The air shimmered. For a moment I could SEE the wind breathing. Something called Qi is real.', cls: 'qi', big: true }; }
      return 'One cloud looked like a dragon.'; } },
  { id: 'explore_alleys', cat: 'childhood', name: 'Explore old alleys', icon: 'lantern', minAge: 6, maxAge: 15, run: c => {
      if (!c.qi.manuals.length && chance(c.qi.known ? 0.35 : 0.08)) { learnManual(c, 'breathing'); return { text: 'Behind a collapsed tea house, a mute old woman pressed a yellowed scroll into my hands, then vanished.', cls: 'qi', big: true }; }
      if (chance(0.15)) { const g = ri(5, 40); money(c, g); return `I found ${fmtMoney(c, g)} in a gutter.`; }
      return pick(['I found a stray cat and named it Ink.', 'The old shrine smelled of incense and rain.', 'Someone was watching me from a rooftop.']); } },

  // ---- TRAINING
  { id: 'gym', cat: 'training', name: 'Hit the gym', icon: 'gym', minAge: 12, run: c => { const g = ri(2, 5); stat(c, 'strength', g); stat(c, 'health', 2); stat(c, 'stress', -3); return `I lifted until my arms shook. Strength +${g}.`; } },
  { id: 'run', cat: 'training', name: 'Go running', icon: 'kick', minAge: 8, run: c => { const g = ri(2, 4); stat(c, 'agility', g); stat(c, 'health', 3); return `I ran along the river at dawn. Agility +${g}.`; } },
  { id: 'martial', cat: 'training', name: 'Martial arts class', icon: 'fist', minAge: 6, cost: 'a', price: 300, run: c => { if (c.money < 300 * country(c).econ && c.age >= 18) return null; if (c.age >= 18) money(c, -300 * country(c).econ); stat(c, 'strength', 2); stat(c, 'agility', 3); return 'Kata after kata. My stance is steadier.'; } },
  { id: 'spar', cat: 'training', name: 'Practice bout', icon: 'combat', minAge: 8, run: async c => {
      const opp = c.people.find(p => p.alive && p.role !== 'Enemy' && Math.abs(p.age - c.age) < 6) || makePerson(c);
      const r = await fight(c, c.qi.realm ? 'gangster' : 'bully', { name: `${opp.first} (sparring)`, hp: 30 + c.age, sparring: true, realm: Math.max(0, c.qi.realm - 1) });
      stat(c, 'agility', 1); return { text: `Practice Bout vs ${opp.first}: ${r === 'win' ? 'VICTORY' : r === 'flee' ? 'I yielded' : 'DEFEAT'}.`, cls: r === 'win' ? 'good' : '' }; } },

  // ---- CULTIVATION (hidden until you know Qi exists)
  { id: 'meditate', cat: 'cultivation', name: 'Meditate / Gather Qi', icon: 'meditate', minAge: 4, run: c => ({ text: meditate(c), cls: c.qi.known ? 'qi' : '' }) },
  { id: 'meridian', cat: 'cultivation', name: 'Open a meridian', icon: 'lightning', minAge: 10, need: c => c.qi.realm >= 1, run: c => ({ text: openMeridian(c), cls: 'qi' }) },
  { id: 'breakthrough', cat: 'cultivation', name: 'Attempt breakthrough', icon: 'star', minAge: 6, need: c => c.qi.realm >= 1 && c.qi.qi >= qiCap(c), run: async c => ({ text: await breakthrough(c), cls: 'qi', big: true }) },
  { id: 'pill', cat: 'cultivation', name: 'Consume Qi Pill', icon: 'pill', minAge: 6, need: c => c.inv.qi_pill > 0 && c.qi.realm >= 1, run: c => { addItem(c, 'qi_pill', -1); const g = Math.round(qiCap(c) * 0.4); c.qi.qi = Math.min(qiCap(c), c.qi.qi + g); return { text: `The pill dissolved into warmth. +${g} Qi.`, cls: 'qi' }; } },
  { id: 'devour', cat: 'cultivation', name: 'Devour Demonic Core', icon: 'demon', minAge: 12, need: c => c.inv.demonic_core > 0, run: c => { addItem(c, 'demonic_core', -1); c.qi.qi = qiCap(c); stat(c, 'happiness', -15); earnTrait(c, 'kinslayer'); return { text: 'I swallowed the core. Something inside me grinned.', cls: 'bad', big: true }; } },
  { id: 'seek_sect', cat: 'cultivation', name: 'Seek a hidden sect', icon: 'manual', minAge: 12, need: c => c.qi.known && !c.sect, run: async c => {
      const opts = SECTS.filter(s => !s.req.trait || has(c, s.req.trait));
      const s = pick(opts); const ok = Object.entries(s.req).every(([k, v]) => k === 'trait' || c.stats[k] >= v);
      if (!ok) return `I found the ${s.name}... they turned me away. (${Object.entries(s.req).map(([k, v]) => `${k} ${v}+`).join(', ')})`;
      const yes = await ui.choice({ title: s.name, text: `${s.desc}\n\nThey offer you a place. Join?`, icon: s.kind === 'gang' ? 'crime' : 'manual', options: [{ label: 'Join', value: true }, { label: 'Walk away', value: false }] });
      if (!yes) return `I declined the ${s.name}.`;
      c.sect = s.id; learnManual(c, 'breathing');
      if (s.align === 'demonic') learnManual(c, 'blood_art'); else if (s.id === 'iron') learnManual(c, 'iron_skin'); else learnManual(c, pick(['flame_palm', 'river_step']));
      if (chance(0.5)) addItem(c, 'qi_pill', 2);
      return { text: `I joined the ${s.name}.`, cls: 'qi', big: true }; } },

  // ---- MIND & BODY
  { id: 'doctor', cat: 'mind', name: 'Visit the doctor', icon: 'doctor', minAge: 0, run: c => { const cost = Math.round(120 * country(c).econ); if (c.age >= 18) { if (c.money < cost) return null; money(c, -cost); } const g = ri(5, 15); stat(c, 'health', g); return `The doctor patched me up. Health +${g}.`; } },
  { id: 'library', cat: 'mind', name: 'Go to the library', icon: 'study', minAge: 5, run: c => { const g = Math.round(ri(2, 5) * study(c)); stat(c, 'smarts', g); return `I read about ${pick(['ancient dynasties', 'black holes', 'poisonous mushrooms', 'forgotten sects', 'economics'])}. Smarts +${g}.`; } },
  { id: 'walk', cat: 'mind', name: 'Take a long walk', icon: 'flower', minAge: 4, run: c => { stat(c, 'stress', -10); stat(c, 'happiness', 4); return 'I walked until the city noise faded.'; } },
  { id: 'salon', cat: 'mind', name: 'Salon: change hair', icon: 'salon', minAge: 13, run: async c => { ui.openSalon?.(); return null; } },
  { id: 'journal', cat: 'mind', name: 'Write in my journal', icon: 'feather', minAge: 8, run: c => { stat(c, 'stress', -6); stat(c, 'smarts', 1);
      if (!has(c, 'ink_touched') && chance(0.003)) { earnTrait(c, 'ink_touched'); return { text: 'The ink kept moving after I stopped writing. It wrote back.', cls: 'qi', big: true }; }
      return 'I wrote until the ink ran faint.'; } },

  // ---- SCHOOL
  { id: 'study', cat: 'school', name: 'Study harder', icon: 'education', minAge: 6, need: c => !!c.edu.school, run: c => { c.edu.grades = clamp(c.edu.grades + Math.round(ri(4, 9) * study(c))); stat(c, 'smarts', 2); stat(c, 'stress', 4); return `I studied late into the night. Grades: ${c.edu.grades}%.`; } },
  { id: 'skip', cat: 'school', name: 'Skip class', icon: 'beer', minAge: 10, need: c => !!c.edu.school, run: c => { c.edu.grades = clamp(c.edu.grades - 6); stat(c, 'happiness', 6); return chance(0.3) ? { text: 'I skipped class and got caught. Detention.', cls: 'bad' } : 'I skipped class and spent the day at the arcade.'; } },
  { id: 'university', cat: 'school', name: 'Apply to university', icon: 'education', minAge: 18, maxAge: 60, need: c => c.edu.level === 1 && c.edu.school !== 'University', run: async c => {
      if (c.edu.grades < 55 && c.stats.smarts < 60) return { text: 'My university application was rejected.', cls: 'bad' };
      const major = await ui.choice({ title: 'Accepted!', text: 'Choose your major.', icon: 'education', options: MAJORS.map(m => ({ label: m, value: m })) });
      if (!major) return null;
      const fee = Math.round(8000 * country(c).econ); c.edu.school = 'University'; c.edu.major = major; c.edu.uniYears = 0; money(c, -fee * 4);
      return { text: `I started university studying ${major}. (Tuition ${fmtMoney(c, fee * 4)}${c.money < 0 ? ' — student loans' : ''})`, cls: 'good', big: true }; } },

  // ---- WORK & MONEY
  { id: 'work_hard', cat: 'work', name: 'Work harder', icon: 'career', minAge: 12, need: c => !!c.job, run: c => { c.job.perf = clamp(c.job.perf + ri(8, 15)); stat(c, 'stress', 5);
      if (c.job.perf > 85 && chance(0.4)) { const b = Math.round(2000 * country(c).econ); money(c, b); return { text: `I got a bonus of ${fmtMoney(c, b)}!`, cls: 'good' }; } return `I put in extra hours. Performance: ${c.job.perf}%.`; } },
  { id: 'odd_jobs', cat: 'work', name: 'Do odd jobs', icon: 'hammer', minAge: 8, run: c => { const g = Math.round(ri(20, 120) * country(c).econ); money(c, g); return `I ${pick(['washed cars', 'walked dogs', 'swept the temple', 'carried groceries'])} for ${fmtMoney(c, g)}.`; } },
  { id: 'invest', cat: 'work', name: 'Invest in the market', icon: 'stocks', minAge: 18, run: async c => {
      const amt = await ui.choice({ title: 'Invest', text: `Cash: ${fmtMoney(c, c.money)} · Invested: ${fmtMoney(c, c.stocks)}`, icon: 'stocks', options: [0.1, 0.25, 0.5].map(f => ({ label: `Invest ${f * 100}% (${fmtMoney(c, c.money * f)})`, value: Math.floor(c.money * f) })).concat([{ label: 'Cash out everything', value: -1 }]) });
      if (amt == null) return null; if (amt === -1) { money(c, c.stocks); const s = c.stocks; c.stocks = 0; return `I sold all my investments for ${fmtMoney(c, s)}.`; }
      if (amt <= 0) return null; money(c, -amt); c.stocks += amt; return `I invested ${fmtMoney(c, amt)}.`; } },
  { id: 'casino', cat: 'leisure', name: 'Gamble at the casino', icon: 'cards', minAge: 18, run: async c => {
      const bet = await ui.choice({ title: 'Casino', text: `Cash: ${fmtMoney(c, c.money)}. Place a bet on blackjack.`, icon: 'cards', options: [50, 500, 5000].filter(b => b <= c.money).map(b => ({ label: `Bet ${fmtMoney(c, b)}`, value: b })) });
      if (!bet) return null; const win = chance(0.46 + c.stats.luck / 1000); money(c, win ? bet : -bet); stat(c, 'happiness', win ? 8 : -6);
      return { text: win ? `Blackjack! I won ${fmtMoney(c, bet)}.` : `I lost ${fmtMoney(c, bet)}.`, cls: win ? 'good' : 'bad' }; } },

  // ---- LEISURE
  { id: 'party', cat: 'leisure', name: 'Go to a party', icon: 'beer', minAge: 15, run: c => { stat(c, 'happiness', 8); stat(c, 'stress', -6); if (chance(0.5)) { const p = makePerson(c, { role: 'Friend', close: ri(30, 55) }); c.people.push(p); return `I met ${p.first} at a party and we hit it off.`; } return 'I danced until the lights came on.'; } },
  { id: 'vacation', cat: 'leisure', name: 'Go on vacation', icon: 'travel', minAge: 18, run: c => { const cost = Math.round(1500 * country(c).econ); if (c.money < cost) return null; money(c, -cost); stat(c, 'happiness', 15); stat(c, 'stress', -20); return `I took a trip to ${pick(['the mountains of Wudang', 'a beach in Bali', 'Kyoto in autumn', 'Paris', 'a desert monastery'])}. (${fmtMoney(c, cost)})`; } },
  { id: 'social_media', cat: 'leisure', name: 'Post on social media', icon: 'phone', minAge: 13, run: c => { const g = Math.max(0, Math.round(ri(-2, 6) + (c.stats.looks + c.stats.charisma - 100) / 20)); c.fame = clamp((c.fame || 0) + g); return g > 3 ? { text: `My post went viral! Fame +${g}.`, cls: 'good' } : 'Nobody liked my post.'; } },
  { id: 'adopt_pet', cat: 'leisure', name: 'Adopt a pet', icon: 'pet', minAge: 10, need: c => !c.assets.some(a => a.type === 'pet'), run: c => { const kind = pick(['cat', 'dog', 'rabbit', 'crow', 'koi fish']); c.assets.push({ type: 'pet', name: `${pick(['Mochi', 'Ink', 'Bao', 'Pepper', 'Luna', 'Ghost'])} the ${kind}`, value: 0 }); stat(c, 'happiness', 10); return `I adopted a ${kind}.`; } },

  // ---- CRIME
  { id: 'shoplift', cat: 'crime', name: 'Shoplift', icon: 'crime', minAge: 8, run: c => crime(c, 0.25, [10, 80], 'I pocketed some snacks', 0) },
  { id: 'pickpocket', cat: 'crime', name: 'Pickpocket', icon: 'market', minAge: 12, run: c => crime(c, 0.3, [30, 300], 'I lifted a wallet', 1) },
  { id: 'burglary', cat: 'crime', name: 'Burglary', icon: 'key', minAge: 16, run: c => crime(c, 0.4, [500, 5000], 'I broke into a mansion', 3) },
  { id: 'street_fight', cat: 'crime', name: 'Pick a street fight', icon: 'fist', minAge: 13, run: async c => {
      const r = await fight(c, 'thug'); if (r === 'win' && chance(0.08)) { c.kills++; earnTrait(c, 'bloodstained'); return { text: 'I won... and he didn\'t get up. Ever.', cls: 'bad', big: true }; }
      return { text: r === 'win' ? 'I beat a thug in the street.' : 'I got beaten in the street.', cls: r === 'win' ? 'good' : 'bad' }; } },

  // ---- ADVENTURE / GATES
  { id: 'hike', cat: 'adventure', name: 'Hike the mountains', icon: 'tent', minAge: 10, run: c => { stat(c, 'health', 4); stat(c, 'stress', -8);
      if (chance(0.1)) { const g = GATE_RANKS[Math.min(5, ri(0, 1) + Math.floor(c.qi.realm / 2))]; c.gates.push({ rank: g.rank, years: ri(2, 5) }); return { text: `A ${g.rank}-rank Gate tore open in the mountainside! It will stay open a few years.`, cls: 'qi', big: true }; }
      if (c.qi.known && chance(0.12)) { addItem(c, 'qi_pill'); return { text: 'I found a spirit herb under a waterfall and refined it into a Qi pill.', cls: 'qi' }; }
      return 'Mist rolled over the peaks.'; } },
  { id: 'fishing', cat: 'adventure', name: 'Go fishing', icon: 'fishing', minAge: 6, run: c => { stat(c, 'stress', -8); return chance(0.3) ? `I caught a ${pick(['huge carp', 'golden koi', 'boot'])}.` : 'Nothing bit.'; } },
  { id: 'gate', cat: 'adventure', name: 'Enter a Gate', icon: 'gates', minAge: 14, need: c => c.gates.length > 0, run: async c => { ui.openTab?.('gates'); return null; } },
];

async function crime(c, risk, loot, text, years) {
  const caught = chance(risk * traitMult(c, 'crime') * (1 - c.stats.agility / 300));
  if (caught) {
    if (years && c.age >= 18) { c.prison = years + ri(0, years); return { text: `${text}... and got caught. Sentenced to ${c.prison} years in prison.`, cls: 'bad', big: true }; }
    stat(c, 'happiness', -8); return { text: `${text}... but got caught. ${c.age < 18 ? 'My parents were called.' : 'I paid a fine.'}`, cls: 'bad' };
  }
  const g = Math.round(ri(...loot) * country(c).econ); money(c, g); return { text: `${text}. Got away with ${fmtMoney(c, g)}.`, cls: 'good' };
}

// Social actions (cost a Social point) — used from the People tab.
export const SOCIAL = [
  { id: 'talk', name: 'Conversation', icon: 'letter', run: (c, p) => { p.close = clamp(p.close + ri(3, 10)); stat(c, 'happiness', 2); return `I had a long conversation with ${p.first}.`; } },
  { id: 'time', name: 'Spend time', icon: 'tea', run: (c, p) => { p.close = clamp(p.close + ri(5, 14)); stat(c, 'stress', -4); return `I spent the afternoon with ${p.first} ${pick(['at the tea house', 'at the arcade', 'by the river', 'watching a movie'])}.`; } },
  { id: 'compliment', name: 'Compliment', icon: 'star', run: (c, p) => { const ok = chance(0.75); p.close = clamp(p.close + (ok ? 6 : -4)); return ok ? `${p.first} blushed at my compliment.` : `${p.first} thought my compliment was weird.`; } },
  { id: 'gift', name: 'Give a gift', icon: 'gift', age: 6, run: (c, p) => { const cost = Math.round(40 * country(c).econ); if (c.money < cost) return null; money(c, -cost); p.close = clamp(p.close + 15); return `I gave ${p.first} a gift.`; } },
  { id: 'train_together', name: 'Train together', icon: 'gym', age: 10, run: (c, p) => { stat(c, 'strength', 2); stat(c, 'agility', 1); p.close = clamp(p.close + 6); return `${p.first} and I trained together.`; } },
  { id: 'spar_p', name: 'Spar', icon: 'combat', age: 8, run: async (c, p) => { const r = await fight(c, 'bully', { name: p.first, hp: 30 + p.age, str: p.stats.strength, agi: p.stats.agility, realm: p.realm, sparring: true }); p.close = clamp(p.close + 3); return `Spar vs ${p.first}: ${r === 'win' ? 'VICTORY' : 'DEFEAT'}.`; } },
  { id: 'argue', name: 'Argue', icon: 'brokenheart', run: (c, p) => { p.close = clamp(p.close - ri(8, 18)); stat(c, 'stress', 4); if (p.close < 5 && p.role !== 'Enemy' && !['Father', 'Mother'].includes(p.role)) { p.role = 'Enemy'; return { text: `${p.first} and I are enemies now.`, cls: 'bad' }; } return `I argued with ${p.first}.`; } },
  { id: 'date', name: 'Ask out', icon: 'flower', age: 14, need: (c, p) => !c.partnerId && !['Father', 'Mother', 'Brother', 'Sister', 'Son', 'Daughter'].includes(p.role) && Math.abs(p.age - c.age) < 10 && p.age >= 14,
    run: (c, p) => { const ok = chance(0.25 + p.close / 200 + (c.stats.looks - 50) / 200 + (c.stats.charisma - 50) / 300); if (ok) { p.role = 'Partner'; c.partnerId = p.id; p.close = clamp(p.close + 15); return { text: `${p.first} said yes! We're dating.`, cls: 'good', big: true }; } p.close = clamp(p.close - 5); return { text: `${p.first} turned me down.`, cls: 'bad' }; } },
  { id: 'propose', name: 'Propose', icon: 'ring', age: 18, need: (c, p) => p.role === 'Partner', run: async (c, p) => {
      const ok = chance(0.35 + p.close / 150); if (!ok) { p.close = clamp(p.close - 15); return { text: `${p.first} said no...`, cls: 'bad' }; }
      const pre = c.money > 50000 ? await ui.choice({ title: 'Prenup?', text: 'You have significant assets. Ask for a prenup?', icon: 'paper', options: [{ label: 'Yes, prenup', value: true }, { label: 'No', value: false }] }) : false;
      p.role = 'Spouse'; c.flags.prenup = !!pre; stat(c, 'happiness', 20); return { text: `${p.first} said YES! We got married.${pre ? ' (with a prenup)' : ''}`, cls: 'good', big: true }; } },
  { id: 'baby', name: 'Try for a baby', icon: 'baby', age: 18, need: (c, p) => ['Spouse', 'Partner'].includes(p.role) && c.age < 50 && p.age < 50, run: (c, p) => {
      if (!chance(0.55)) return 'No baby this time.';
      import('../systems/people.js').then(() => {});
      return { text: haveChild(c, p), cls: 'good', big: true }; } },
  { id: 'divorce', name: 'Divorce / Break up', icon: 'brokenheart', need: (c, p) => ['Spouse', 'Partner'].includes(p.role), run: (c, p) => {
      const married = p.role === 'Spouse'; p.role = 'Ex'; c.partnerId = null; p.close = clamp(p.close - 40);
      if (married && !c.flags.prenup && c.money > 0) { const loss = Math.round(c.money / 2); money(c, -loss); return { text: `We divorced. ${p.first} took half: ${fmtMoney(c, loss)}.`, cls: 'bad' }; }
      return { text: `${p.first} and I split up.`, cls: 'bad' }; } },
  { id: 'ask_money', name: 'Ask for money', icon: 'market', need: (c, p) => ['Father', 'Mother'].includes(p.role), run: (c, p) => { if (chance(p.close / 130)) { const g = Math.round(ri(10, 120) * country(c).econ * (['rich', 'royal', 'wealthy'].includes(c.wealth) ? 10 : 1)); money(c, g); return `${p.first} gave me ${fmtMoney(c, g)}.`; } return `${p.first} refused to give me money.`; } },
];

import { mixGenes } from '../ui/portrait.js';
export function haveChild(c, p) {
  const gender = chance(0.5) ? 'F' : 'M';
  const kid = makePerson(c, { gender, age: 0, last: c.gender === 'M' ? c.last : (p.gender === 'M' ? p.last : c.last), role: gender === 'F' ? 'Daughter' : 'Son', close: 90,
    genes: mixGenes(c.genes, p.genes, gender), extra: { otherParent: p.id } });
  kid.stats = Object.fromEntries(Object.keys(kid.stats).map(k => [k, clamp(Math.round(((c.stats[k] ?? 50) + (p.stats?.[k] ?? 50)) / 2 + ri(-15, 15)))]));
  c.people.push(kid); stat(c, 'happiness', 15);
  return `${kid.first} was born! ${gender === 'F' ? 'A baby girl' : 'A baby boy'}.`;
}
