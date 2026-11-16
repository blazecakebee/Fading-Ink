import { eff } from '../systems/body.js';
// Activities the player can spend Actions on. cost: 'a' = Action, 's' = Social Action.
// run(c) returns a string (chronicle text) or {text, cls, big}. Returning null means "cancelled, refund".
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp } from '../core/rng.js';
import { stat, money, fmtMoney, country, addItem, die, priceFor, wage, QUALITY } from '../systems/life.js';
import { meditate, openMeridian, breakthrough, learnManual, qiCap, learnMethod } from '../systems/cultivation.js';
import { METHODS } from './realms.js';
import { traitMult, has, earnTrait } from '../systems/traits.js';
import { makePerson, gainClose, bondBonus } from '../systems/people.js';
import { moodMult, addCondition } from '../systems/health.js';
import { addMuscle, studyMult } from '../systems/body.js';
import { known as knownRecipes } from '../systems/crafting.js';
import { RECIPES, ITEMS } from './items.js';
import { ENEMIES, GATE_RANKS, makeGate, GATE_TYPES } from './combat.js';
import { MAJORS } from './careers.js';
import { SECTS } from './realms.js';
import { G } from '../core/state.js';
import { canTryForBaby, conceive, fertileUntil, uniqueFirst } from '../systems/family.js';

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
const study = c => traitMult(c, 'study') * bondBonus(c, 'study') * moodMult(c) * studyMult(c);
const train = c => traitMult(c, 'train') * bondBonus(c, 'train') * moodMult(c);
const g = (c, a, b) => Math.max(1, Math.round(ri(a, b) * train(c)));

export const ACTIVITIES = [
  // ---- CHILDHOOD
  { id: 'play_toys', cat: 'childhood', name: 'Play with toys', icon: 'play', minAge: 1, maxAge: 9, run: c => { stat(c, 'happiness', ri(4, 9)); return pick(['I built a fortress out of blocks.', 'My toy soldiers won a great war.', 'I had a tea party with my plushies.']); } },
  { id: 'snowball', cat: 'childhood', name: 'Snowball war', icon: 'snowball', minAge: 4, maxAge: 13, run: c => { stat(c, 'happiness', 6); stat(c, 'agility', 2); return chance(0.5) ? 'Snowball war: I led the charge. Glorious victory.' : 'Snowball war: I took one to the face. Defeat.'; } },
  { id: 'tantrum', cat: 'childhood', name: 'Throw a tantrum', icon: 'brokenheart', minAge: 2, maxAge: 7, run: c => { const p = c.people.find(p => p.role === 'Mother' && p.alive) || c.people.find(p => p.role === 'Father' && p.alive); if (p) p.close = clamp(p.close - 5); stat(c, 'happiness', 2); return 'I screamed until I got my way. Mostly.'; } },
  { id: 'cloud_watch', cat: 'childhood', name: 'Watch the clouds', icon: 'sun', minAge: 3, maxAge: 12, run: c => { stat(c, 'stress', -5);
      if (!c.qi.known && chance(has(c, 'qi_sensitive') ? 0.6 : 0.04)) { c.qi.known = true; return { text: 'The air shimmered. For a moment I could SEE the wind breathing. Something called Qi is real.', cls: 'qi', big: true }; }
      stat(c, 'smarts', 1); return 'One cloud looked like a dragon.' + (c.age < 13 ? (globalThis.__cloudBonus?.(c) || '') : ''); } },
  { id: 'explore_alleys', cat: 'childhood', name: 'Explore old alleys', icon: 'lantern', minAge: 6, maxAge: 15, run: c => {
      if (!c.qi.manuals.length && chance(c.qi.known ? 0.35 : 0.08)) { learnManual(c, 'breathing'); return { text: 'Behind a collapsed tea house, a mute old woman pressed a yellowed scroll into my hands, then vanished.', cls: 'qi', big: true }; }
      if (chance(0.15)) { const g = ri(5, 40); money(c, g); return `I found ${fmtMoney(c, g)} in a gutter.`; }
      return pick(['I found a stray cat and named it Ink.', 'The old shrine smelled of incense and rain.', 'Someone was watching me from a rooftop.']); } },

  // ---- TRAINING
  { id: 'gym', cat: 'training', name: 'Hit the gym', icon: 'gym', minAge: 12, run: c => { const gg = g(c, 2, 5); stat(c, 'strength', gg); stat(c, 'health', 2); stat(c, 'stress', -3); stat(c, 'happiness', 3); const lk = addMuscle(c, ri(2, 4)); return `I lifted until my arms shook. Strength +${gg}.${lk ? ' I look noticeably fitter (+1 Looks).' : ''}`; } },
  { id: 'run', cat: 'training', name: 'Go running', icon: 'kick', minAge: 8, run: c => { const gg = g(c, 2, 4); stat(c, 'agility', gg); stat(c, 'health', 3); stat(c, 'happiness', 3); addMuscle(c, 1); return `I ran along the river at dawn. Agility +${gg}.`; } },
  { id: 'sports', cat: 'training', name: 'Play sports', icon: 'play', minAge: 6, run: c => { const gg = g(c, 1, 3); stat(c, 'agility', gg); stat(c, 'charisma', 1); stat(c, 'happiness', 5); addMuscle(c, ri(1, 2)); return `I played ${pick(['football', 'basketball', 'badminton', 'volleyball'])} with friends. Agility +${gg}.`; } },
  { id: 'combat_drills', cat: 'training', name: 'Study fight footage & drills', icon: 'combat', minAge: 10, run: c => { const gg = g(c, 2, 4); stat(c, 'battle', gg); return `I broke down fights move by move. Battle Knowledge +${gg}.`; } },
  { id: 'martial', cat: 'training', name: 'Martial arts class', icon: 'fist', minAge: 6, cost: 'a', price: 300, run: c => { if (c.money < 300 * country(c).econ && c.age >= 18) return null; if (c.age >= 18) money(c, -300 * country(c).econ); stat(c, 'strength', g(c, 1, 3)); stat(c, 'agility', g(c, 2, 4)); stat(c, 'battle', g(c, 2, 4)); addMuscle(c, ri(1, 3)); return 'Kata after kata. My stance is steadier.'; } },
  { id: 'spar', cat: 'training', name: 'Practice bout', icon: 'combat', minAge: 8, run: async c => {
      const opp = c.people.find(p => p.alive && p.role !== 'Enemy' && Math.abs(p.age - c.age) < 6) || makePerson(c);
      const r = await fight(c, c.qi.realm ? 'gangster' : 'bully', { name: `${opp.first} (sparring)`, hp: 30 + c.age, sparring: true, realm: Math.max(0, c.qi.realm - 1) });
      stat(c, 'agility', 1); return { text: `Practice Bout vs ${opp.first}: ${r === 'win' ? 'VICTORY' : r === 'flee' ? 'I yielded' : 'DEFEAT'}.`, cls: r === 'win' ? 'good' : '' }; } },

  // ---- CULTIVATION (hidden until you know Qi exists)
  { id: 'meditate', cat: 'cultivation', name: 'Meditate / Gather Qi', icon: 'meditate', minAge: 4, need: c => (c.qi.medYear || 0) < 3, run: c => ({ text: meditate(c), cls: c.qi.known ? 'qi' : '' }) },
  { id: 'meridian', cat: 'cultivation', name: 'Open a meridian', icon: 'lightning', minAge: 10, need: c => c.qi.realm >= 1, run: c => ({ text: openMeridian(c), cls: 'qi' }) },
  { id: 'breakthrough', cat: 'cultivation', name: 'Attempt breakthrough', icon: 'star', minAge: 6, need: c => c.qi.realm >= 1 && c.qi.qi >= qiCap(c), run: async c => ({ text: await breakthrough(c), cls: 'qi', big: true }) },
  { id: 'pill', cat: 'cultivation', name: 'Consume Qi Pill', icon: 'pill', minAge: 6, need: c => c.inv.qi_pill > 0 && c.qi.realm >= 1, run: c => { const g = addItem(c, 'qi_pill', -1, 'best'); const q = Math.round(qiCap(c) * 0.4 * traitMult(c, 'pill') * QUALITY[g].mult); c.qi.qi = Math.min(qiCap(c), c.qi.qi + q); return { text: `The ${QUALITY[g].name.toLowerCase()} pill dissolved into warmth. +${q} Qi.`, cls: 'qi' }; } },
  { id: 'devour', cat: 'cultivation', name: 'Devour Demonic Core', icon: 'demon', minAge: 12, need: c => c.inv.demonic_core > 0, run: c => { addItem(c, 'demonic_core', -1); c.qi.qi = qiCap(c); stat(c, 'happiness', -15); earnTrait(c, 'kinslayer'); if (chance(0.5)) addCondition(c, 'corruption'); return { text: 'I swallowed the core. Something inside me grinned.', cls: 'bad', big: true }; } },
  { id: 'seek_sect', cat: 'cultivation', name: 'Seek a hidden sect', icon: 'manual', minAge: 12, need: c => c.qi.known && !c.sect, run: async c => {
      const opts = SECTS.filter(s => (!s.req.trait || has(c, s.req.trait)) && !c.flags.exiled?.[s.id]);
      if (!opts.length) return 'Word of my expulsions has spread. No sect will open its gates to me.';
      const s = pick(opts); const ok = Object.entries(s.req).every(([k, v]) => k === 'trait' || c.stats[k] >= v);
      if (!ok) return `I found the ${s.name}... they turned me away. (${Object.entries(s.req).map(([k, v]) => `${k} ${v}+`).join(', ')})`;
      const yes = await ui.choice({ title: s.name, text: `${s.desc}\n\nThey offer you a place. Join?`, icon: s.kind === 'gang' ? 'crime' : 'manual', options: [{ label: 'Join', value: true }, { label: 'Walk away', value: false }] });
      if (!yes) return `I declined the ${s.name}.`;
      c.sect = s.id; c.sectRank = 0; c.contrib = 0; c.flags.sectJoined = G.world.year; learnManual(c, 'breathing');
      if (s.align === 'demonic') learnManual(c, 'blood_art'); else if (s.id === 'iron') learnManual(c, 'iron_skin'); else learnManual(c, pick(['flame_palm', 'river_step']));
      if (chance(0.5)) addItem(c, 'qi_pill', 2);
      learnMethod(c, s.align === 'demonic' ? 'blood_sea' : pick(['turtle', 'five_elements', 'lotus', 'sword_intent', 'heart_fire']));
      ui.cinematic?.({ motif: 'seal', color: '#9ad0ff', lines: ['The gate opens. Incense, bells, a long stair.', 'You kneel, and are given a name in the register.'], title: s.name, sub: 'You joined', sound: 'milestone' });
      return { text: `I joined the ${s.name}.`, cls: 'qi', big: true }; } },

  // ---- MIND & BODY
  { id: 'doctor', cat: 'mind', name: 'Visit the doctor', icon: 'doctor', minAge: 0, run: c => { const cost = Math.round(120 * country(c).econ); if (c.age >= 18) { if (c.money < cost) return null; money(c, -cost); } const g = ri(5, 15); stat(c, 'health', g); return `The doctor patched me up. Health +${g}.`; } },
  { id: 'library', cat: 'mind', name: 'Go to the library', icon: 'study', minAge: 5, run: c => { const gs = Math.max(1, Math.round(ri(2, 5) * study(c))); stat(c, 'smarts', gs); return `I read about ${pick(['ancient dynasties', 'black holes', 'poisonous mushrooms', 'forgotten sects', 'economics'])}. Smarts +${gs}.`; } },
  { id: 'alchemy_texts', cat: 'mind', name: 'Study alchemy texts', icon: 'cauldron', minAge: 10, run: c => { stat(c, 'smarts', 1); const unk = RECIPES.filter(r => !knownRecipes(c).includes(r.id) && r.id !== 'r_ink'); if (unk.length && chance(0.3 * study(c))) { const r = pick(unk); knownRecipes(c).push(r.id); return { text: `In a crumbling text I found the recipe for ${ITEMS[r.out].name}.`, cls: 'qi', big: true }; } return 'I pored over alchemy texts. Half of them were nonsense.'; } },
  { id: 'walk', cat: 'mind', name: 'Take a long walk', icon: 'flower', minAge: 4, run: c => { stat(c, 'stress', -10); stat(c, 'happiness', 4); stat(c, 'happiness', 8); return 'I walked until the city noise faded.'; } },
  { id: 'salon', cat: 'mind', name: 'Salon: change hair', icon: 'salon', minAge: 13, run: async c => { ui.openSalon?.(); return null; } },
  { id: 'journal', cat: 'mind', name: 'Write in my journal', icon: 'feather', minAge: 8, run: c => { stat(c, 'stress', -6); stat(c, 'smarts', 1);
      if (!has(c, 'ink_touched') && chance(0.003)) { earnTrait(c, 'ink_touched'); return { text: 'The ink kept moving after I stopped writing. It wrote back.', cls: 'qi', big: true }; }
      return 'I wrote until the ink ran faint.'; } },

  // ---- SCHOOL
  { id: 'study', cat: 'school', name: 'Study harder', icon: 'education', minAge: 6, need: c => !!c.edu.school, run: c => { c.edu.grades = clamp(c.edu.grades + Math.round(ri(4, 9) * study(c))); stat(c, 'smarts', 2); stat(c, 'stress', 4); return `I studied late into the night. Grades: ${c.edu.grades}%.`; } },
  { id: 'skip', cat: 'school', name: 'Skip class', icon: 'beer', minAge: 10, need: c => !!c.edu.school, run: c => { c.edu.grades = clamp(c.edu.grades - 6); stat(c, 'happiness', 6); return chance(0.3) ? { text: 'I skipped class and got caught. Detention.', cls: 'bad' } : 'I skipped class and spent the day at the arcade.'; } },
  { id: 'university', cat: 'school', name: 'Apply to university', icon: 'education', minAge: 18, maxAge: 60, need: c => c.edu.level === 1 && c.edu.school !== 'University', run: async c => {
      if (c.edu.grades < 55 && eff(c, 'smarts') < 60) return { text: 'My university application was rejected.', cls: 'bad' };
      if (!chance({ developing: 0.5, emerging: 0.85 }[country(c).tier] ?? 1)) return { text: 'There were far too few university places for everyone who applied. I didn\'t get one this year.', cls: 'bad' };
      const major = await ui.choice({ title: 'Accepted!', text: 'Choose your major.', icon: 'education', options: MAJORS.map(m => ({ label: m, value: m })) });
      if (!major) return null;
      const fee = Math.round(8000 * country(c).econ); c.edu.school = 'University'; c.edu.major = major; c.edu.uniYears = 0; money(c, -fee * 4);
      return { text: `I started university studying ${major}. (Tuition ${fmtMoney(c, fee * 4)}${c.money < 0 ? ' — student loans' : ''})`, cls: 'good', big: true }; } },

  // ---- WORK & MONEY
  { id: 'work_hard', cat: 'work', name: 'Work harder', icon: 'career', minAge: 12, need: c => !!c.job, run: c => { c.job.perf = clamp(c.job.perf + ri(8, 15)); stat(c, 'stress', 5);
      if (c.job.perf > 85 && chance(0.4)) { const b = Math.round(1500 * wage(c)); money(c, b); return { text: `I got a bonus of ${fmtMoney(c, b)}!`, cls: 'good' }; } return `I put in extra hours. Performance: ${c.job.perf}%.`; } },
  { id: 'odd_jobs', cat: 'work', name: 'Odd jobs board', icon: 'hammer', minAge: 8, run: async c => { // v0.8.7: clear gigs with pay and risk
    const J = await import('../systems/jobs.js'); const list = J.gigBoard(c); if (!list.length) return 'Nobody is hiring for odd jobs right now. Try again next year.';
    const v = await ui.choice({ title: 'Odd jobs board', icon: 'hammer', text: `Notes pinned to a corkboard. Each takes this action.${c.recurGig ? `\nCurrent recurring gig: ${c.recurGig.t} (taking another recurring gig replaces it).` : ''}`,
      options: [...list.map(g => ({ label: `${g.t} · ${g.kind} · ${fmtMoney(c, g.pay[0] * wage(c))}–${fmtMoney(c, g.pay[1] * wage(c))}${g.risk ? ` · ${Math.round(g.risk * 100)}% risk` : ' · safe'} — ${g.note}`, value: g.t })), { label: 'Turn them all down', value: null, ghost: true }] });
    if (!v) return null; return J.takeGig(c, list.find(g => g.t === v)); } },
  { id: 'invest', cat: 'work', name: 'Open the stock market', icon: 'stocks', minAge: 18, run: () => { ui.openTab?.('market'); return null; } },
  { id: 'casino', cat: 'leisure', name: 'Gamble at the casino', icon: 'cards', minAge: 18, run: async c => {
      const bet = await ui.choice({ title: 'Casino', text: `Cash: ${fmtMoney(c, c.money)}. Place a bet on blackjack.`, icon: 'cards', options: [50, 500, 5000].filter(b => b <= c.money).map(b => ({ label: `Bet ${fmtMoney(c, b)}`, value: b })) });
      if (!bet) return null; const win = chance(0.46 + c.stats.luck / 1000); if (win) c.flags.casinoWin = true; money(c, win ? bet : -bet); stat(c, 'happiness', win ? 8 : -6);
      return { text: win ? `Blackjack! I won ${fmtMoney(c, bet)}.` : `I lost ${fmtMoney(c, bet)}.`, cls: win ? 'good' : 'bad' }; } },

  // ---- LEISURE
  { id: 'party', cat: 'leisure', name: 'Go to a party', icon: 'beer', minAge: 15, run: c => { stat(c, 'happiness', 8); stat(c, 'stress', -6); stat(c, 'happiness', 10); if (chance(0.5)) { const p = makePerson(c, { role: 'Friend', close: ri(30, 55) }); c.people.push(p); return `I met ${p.first} at a party and we hit it off.`; } return 'I danced until the lights came on.'; } },
  { id: 'vacation', cat: 'leisure', name: 'Go on vacation', icon: 'travel', minAge: 18, run: c => { const cost = priceFor(c, 1500 * country(c).econ); if (c.money < cost) return null; money(c, -cost); stat(c, 'happiness', 15); stat(c, 'stress', -20); stat(c, 'happiness', 18); return `I took a trip to ${pick(['the mountains of Wudang', 'a beach in Bali', 'Kyoto in autumn', 'Paris', 'a desert monastery'])}. (${fmtMoney(c, cost)})`; } },
  { id: 'social_media', cat: 'leisure', name: 'Post on social media', icon: 'phone', minAge: 13, need: c => c.age >= ({ developing: 18, emerging: 14, developed: 12 }[country(c).tier] || 12) || ['wealthy', 'rich', 'royal'].includes(c.wealth), run: c => { const g = Math.max(0, Math.round(ri(-2, 6) + (c.stats.looks + eff(c, 'charisma') - 100) / 20)); c.fame = Math.max(0, (c.fame || 0) + g * 100); if (g > 3) c.flags.viral = true; return g > 3 ? { text: `My post went viral! Fame +${g * 100}.`, cls: 'good' } : 'Nobody liked my post.'; } },
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
      if (chance(0.1)) { const g = GATE_RANKS[Math.min(5, ri(0, 1) + Math.floor(c.qi.realm / 2))]; const ng = makeGate(g.rank); c.gates.push(ng); return { text: `A ${g.rank}-rank ${GATE_TYPES.find(t => t.id === ng.type).name} Gate tore open in the mountainside!`, cls: 'qi', big: true }; }
      if (c.qi.known && chance(0.12)) { addItem(c, 'qi_pill'); return { text: 'I found a spirit herb under a waterfall and refined it into a Qi pill.', cls: 'qi' }; }
      return 'Mist rolled over the peaks.'; } },
  { id: 'gather', cat: 'adventure', name: 'Gather materials', icon: 'herb', minAge: 10, run: c => {
      const found = []; const n = Math.round(ri(1, 2) * traitMult(c, 'gather'));
      if (n) { addItem(c, 'spirit_herb', n); found.push(`${n} Spirit Herb`); }
      if (chance(0.45)) { addItem(c, 'iron_ore'); found.push('an Iron Ingot (from an old mine)'); }
      if (chance(0.12)) { addItem(c, 'spirit_stone'); found.push('a Spirit Stone'); }
      if (chance(0.03 * c.stats.luck / 50)) { addItem(c, 'ginseng'); found.push('a THOUSAND-YEAR GINSENG'); }
      return { text: `I foraged the hills and found ${found.join(', ') || 'nothing useful'}.`, cls: found.length ? 'good' : '' }; } },
  { id: 'fishing', cat: 'adventure', name: 'Go fishing', icon: 'fishing', minAge: 6, run: c => { stat(c, 'stress', -8); return chance(0.3) ? `I caught a ${pick(['huge carp', 'golden koi', 'boot'])}.` : 'Nothing bit.'; } },
  { id: 'gate', cat: 'adventure', name: 'Enter a Gate', icon: 'gates', minAge: 14, need: c => c.gates.length > 0, run: async c => { ui.openTab?.('gates'); return null; } },
];

async function crime(c, risk, loot, text, years) {
  const L = await import('../systems/law.js'); // v0.8.7: heat + country policing + standoffs
  if (chance(L.caughtChance(c, risk))) return L.standoff(c, years, text);
  L.addHeat(c, Math.round(risk * 40));
  const g = Math.round(ri(...loot) * wage(c)); money(c, g); c.flags.crimeWin = true; return { text: `${text}. Got away with ${fmtMoney(c, g)}.${(c.heat || 0) >= 45 ? ' (The Federal Authorities are looking into me.)' : ''}`, cls: 'good' };
}

// Social actions (cost a Social point) — used from the People tab.
export const SOCIAL = [
  { id: 'talk', emoji: '💬', name: 'Conversation (A/B/C/D)', icon: 'letter', run: async (c, p) => (await import('../ui/conversation.js')).converse(c, p) },
  { id: 'time', emoji: '🍵', name: 'Spend time', icon: 'tea', run: (c, p) => { gainClose(c, p, ri(5, 14)); stat(c, 'stress', -4); return `I spent the afternoon with ${p.first} ${pick(['at the tea house', 'at the arcade', 'by the river', 'watching a movie'])}.`; } },
  { id: 'compliment', emoji: '✨', name: 'Compliment', icon: 'star', run: (c, p) => { const ok = chance(0.75); gainClose(c, p, (ok ? 6 : -4)); return ok ? `${p.first} blushed at my compliment.` : `${p.first} thought my compliment was weird.`; } },
  { id: 'gift', emoji: '🎁', name: 'Give a gift', icon: 'gift', age: 6, run: (c, p) => { const cost = Math.round(40 * country(c).econ); if (c.money < cost) return null; money(c, -cost); gainClose(c, p, 15); return `I gave ${p.first} a gift.`; } },
  { id: 'train_together', emoji: '🏋️', name: 'Train together', icon: 'gym', age: 10, run: (c, p) => { stat(c, 'strength', g(c, 2, 3)); stat(c, 'agility', g(c, 1, 2)); gainClose(c, p, 6); return `${p.first} and I trained together.`; } },
  { id: 'spar_p', emoji: '⚔️', name: 'Spar', icon: 'combat', age: 8, run: async (c, p) => { const r = await fight(c, 'bully', { name: p.first, hp: 30 + p.age, str: p.stats.strength, agi: p.stats.agility, realm: p.realm, sparring: true }); gainClose(c, p, 3);
      // sparring with someone teaches you: more from people stronger than you, and cultivators may pass on a technique
      const better = (p.stats.strength || 40) > eff(c, 'strength') || (p.realm || 0) > c.qi.realm;
      const gs = ri(1, 3) + (better ? 1 : 0), ga = ri(1, 2); stat(c, 'strength', gs); stat(c, 'agility', ga); addMuscle(c, 1);
      let extra = ''; if ((p.realm || 0) > c.qi.realm && chance(0.15)) { const t = (await import('./realms.js')).MANUALS.filter(m => m.tech && !m.demonic && !c.qi.manuals.includes(m.id)); if (t.length) { const m = pick(t); learnManual(c, m.id); extra = ` ${p.first} showed me ${m.name}!`; } }
      if (['Father', 'Mother'].includes(p.role) && c.age < 18) { stat(c, 'happiness', 3); extra += ' They looked proud.'; }
      return `Spar vs ${p.first}: ${r === 'win' ? 'VICTORY' : 'DEFEAT'}. Strength +${gs}, Agility +${ga}.${extra}`; } },
  { id: 'argue', emoji: '😠', name: 'Argue', icon: 'brokenheart', run: (c, p) => { p.close = clamp(p.close - ri(8, 18)); stat(c, 'stress', 4); if (p.close < 5 && p.role !== 'Enemy' && !['Father', 'Mother'].includes(p.role)) { p.role = 'Enemy'; return { text: `${p.first} and I are enemies now.`, cls: 'bad' }; } return `I argued with ${p.first}.`; } },
  { id: 'date', emoji: '🌹', name: 'Ask out', icon: 'flower', age: 14, need: (c, p) => !c.partnerId && !['Father', 'Mother', 'Brother', 'Sister', 'Son', 'Daughter'].includes(p.role) && Math.abs(p.age - c.age) < 10 && p.age >= 14,
    run: (c, p) => { const ok = chance(0.25 + p.close / 200 + (c.stats.looks - 50) / 200 + (eff(c, 'charisma') - 50) / 300); if (ok) { p.role = 'Partner'; c.partnerId = p.id; gainClose(c, p, 15); return { text: `${p.first} said yes! We're dating.`, cls: 'good', big: true }; } p.close = clamp(p.close - 5); return { text: `${p.first} turned me down.`, cls: 'bad' }; } },
  { id: 'propose', emoji: '💍', name: 'Propose', icon: 'ring', age: 18, need: (c, p) => p.role === 'Partner', run: async (c, p) => {
      const ok = chance(0.35 + p.close / 150); if (!ok) { p.close = clamp(p.close - 15); return { text: `${p.first} said no...`, cls: 'bad' }; }
      const pre = c.money > 50000 ? await ui.choice({ title: 'Prenup?', text: 'You have significant assets. Ask for a prenup?', icon: 'paper', options: [{ label: 'Yes, prenup', value: true }, { label: 'No', value: false }] }) : false;
      p.role = 'Spouse'; p.livesWith = true; c.flags.prenup = !!pre; stat(c, 'happiness', 20); ui.cinematic?.({ motif: 'lotus', color: '#ff6a8a', lines: ['Red lanterns, two families, one table.', `${c.first} and ${p.first} bow to heaven, to earth, and to each other.`], title: 'Married', sub: `${c.first} ♥ ${p.first}`, sound: 'milestone' }); return { text: `${p.first} said YES! We got married.${pre ? ' (with a prenup)' : ''}`, cls: 'good', big: true }; } },
  { id: 'baby', emoji: '👶', name: 'Try for a baby', icon: 'baby', age: 18, need: (c, p) => canTryForBaby(c, p), run: (c, p) => {
      const t = (c.flags.babyTries ||= {}); t[G.world.year] = (t[G.world.year] || 0) + 1;
      const older = Math.max(...[c, p].map(x => x.age / fertileUntil(x)));
      if (!chance(older > 0.85 ? 0.25 : 0.5)) return 'No baby this time.';
      return { text: conceive(c, p), cls: 'good', big: true }; } },
  { id: 'divorce', emoji: '💔', name: 'Divorce / Break up', icon: 'brokenheart', need: (c, p) => ['Spouse', 'Partner'].includes(p.role), run: (c, p) => {
      const married = p.role === 'Spouse'; p.role = 'Ex'; c.partnerId = null; if (married) c.flags.divorces = (c.flags.divorces || 0) + 1; p.close = clamp(p.close - 40);
      if (married && !c.flags.prenup && c.money > 0) { const loss = Math.round(c.money / 2); money(c, -loss); return { text: `We divorced. ${p.first} took half: ${fmtMoney(c, loss)}.`, cls: 'bad' }; }
      return { text: `${p.first} and I split up.`, cls: 'bad' }; } },
  { id: 'ask_money', emoji: '💰', name: 'Ask for money', icon: 'market', need: (c, p) => ['Father', 'Mother'].includes(p.role), run: (c, p) => { if (chance(p.close / 130)) { const g = Math.round(ri(10, 120) * country(c).econ * (['rich', 'royal', 'wealthy'].includes(c.wealth) ? 10 : 1)); money(c, g); return `${p.first} gave me ${fmtMoney(c, g)}.`; } return `${p.first} refused to give me money.`; } },
];

import { mixGenes } from '../ui/portrait.js';
export function haveChild(c, p) {
  const gender = chance(0.5) ? 'F' : 'M';
  const kid = makePerson(c, { gender, age: 0, first: uniqueFirst(c, gender), last: c.ownSect || c.gender === 'M' ? c.last : (p.gender === 'M' ? p.last : c.last), role: gender === 'F' ? 'Daughter' : 'Son', close: 90,
    genes: mixGenes(c.genes, p.genes, gender), extra: { otherParent: p.id } });
  kid.stats = Object.fromEntries(Object.keys(kid.stats).map(k => [k, clamp(Math.round(((c.stats[k] ?? 50) + (p.stats?.[k] ?? 50)) / 2 + ri(-15, 15)))]));
  c.people.push(kid); stat(c, 'happiness', 15); ui.fx('birth');
  return `${kid.first} was born! ${gender === 'F' ? 'A baby girl' : 'A baby boy'}.`;
}
