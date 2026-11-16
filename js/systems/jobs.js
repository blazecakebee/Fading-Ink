// v0.8.1 Job market: only some jobs are hiring each year. A job agent (a real person) can dig up more,
// tailor leads to you and talk you up — for a fee.
import { G } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp } from '../core/rng.js';
import { CAREERS } from '../data/careers.js';
import { money, fmtMoney, wage, country, priceFor } from './life.js';
import { makePerson, gainClose } from './people.js';
import { eff } from './body.js';
import { hasLicense } from './license.js';
import { perk } from '../data/legacyTree.js';

export const AGENTS = {
  rookie: { name: 'Rookie job agent', fee: 600, leads: 1, hire: 0.08, open: 0.08, desc: 'Eager, cheap, knows a few people.' },
  seasoned: { name: 'Seasoned recruiter', fee: 2500, leads: 2, hire: 0.14, open: 0.15, desc: 'A thick contact book and a good phone voice.' },
  elite: { name: 'Elite headhunter', fee: 9000, leads: 3, hire: 0.22, open: 0.25, desc: 'Gets you into rooms you didn\'t know existed.' },
};
export const agentOf = c => c.people.find(p => p.alive && p.agent);
export const agentFee = (c, tier) => priceFor(c, Math.round(AGENTS[tier].fee * wage(c) / 0.32 * (perk('f8') ? 0.8 : 1)));

export function eligible(c, j) {
  return c.age >= j.minAge && c.age <= (j.maxAge || 99) && c.edu.level >= j.edu && (!j.major || j.major.includes(c.edu.major)) && (c.edu.school !== 'University' || j.part)
    && Object.entries(j.stat || {}).every(([k, v]) => eff(c, k) >= v) && (!j.realm || c.qi.realm >= j.realm) && (!j.license || hasLicense(c));
}
// this year's openings: each job is hiring with some chance (rarer the better it pays), more with an agent
export function jobBoard(c) {
  const y = G.world.year;
  if (c.jobBoard?.year === y) return c.jobBoard;
  const A = agentOf(c), bonus = A ? AGENTS[A.agent.tier].open : 0, econ = clamp(country(c).econ, 0.3, 1.5);
  const ids = CAREERS.filter(j => { const p = j.part ? 0.55 : j.pay >= 150000 ? 0.08 : j.pay >= 90000 ? 0.18 : j.pay >= 50000 ? 0.3 : 0.45; return chance(clamp((p + bonus) * (0.7 + econ * 0.3), 0.03, 0.95)); }).map(j => j.id);
  c.jobBoard = { year: y, ids, leads: [] };
  return c.jobBoard;
}
export const listed = c => { const b = jobBoard(c); return CAREERS.filter(j => b.ids.includes(j.id) || b.leads.includes(j.id)); };
export const hireChance = (c, j) => clamp(0.2 + c.stats.charisma / 300 + c.stats.smarts / 500 + (agentOf(c) ? AGENTS[agentOf(c).agent.tier].hire : 0) + (perk('f8') ? 0.06 : 0) - (j.pay >= 150000 ? 0.15 : j.pay >= 90000 ? 0.08 : 0), 0.05, 0.8);

export function hireAgent(c, tier) {
  const fee = agentFee(c, tier); if (c.money < fee) return null;
  const old = agentOf(c); if (old) { old.agent = null; old.role = 'Acquaintance'; }
  money(c, -fee);
  const p = makePerson(c, { role: AGENTS[tier].name.replace(/^\w/, m => m.toUpperCase()), age: ri(26, 60), close: 30, extra: { agent: { tier, since: G.world.year, paid: G.world.year } } });
  c.people.push(p);
  // they get to work right away: a lead or two on this year's board
  const got = findLeads(c, AGENTS[tier].leads);
  return `I hired ${p.first} ${p.last}, ${AGENTS[tier].name.toLowerCase()}, for ${fmtMoney(c, fee)} a year.${got.length ? ` They already found: ${got.join(', ')}.` : ''}`;
}
export function fireAgent(c) { const p = agentOf(c); if (!p) return null; p.agent = null; p.role = 'Acquaintance'; p.close = clamp(p.close - 15); return `I let my job agent ${p.first} go.`; }
// leads: jobs you qualify for that aren't on the board, best-paying first (with some luck)
export function findLeads(c, n) {
  const b = jobBoard(c); const pool = CAREERS.filter(j => !b.ids.includes(j.id) && !b.leads.includes(j.id) && eligible(c, j)).sort((a, z) => z.pay - a.pay);
  const got = []; for (const j of pool) { if (got.length >= n) break; if (chance(0.6)) { b.leads.push(j.id); got.push(j.name); } }
  return got;
}
export const AGENT_SOCIAL = [
  { id: 'agent_leads', emoji: '📇', name: 'Ask for job leads', icon: 'career', age: 15, need: (c, p) => !!p.agent, run: (c, p) => {
    if (p.agent.asked === G.world.year) return { text: `${p.first}: "I already gave you everything I had this year."`, cls: '' };
    p.agent.asked = G.world.year; gainClose(c, p, 4);
    const got = findLeads(c, AGENTS[p.agent.tier].leads + (p.close >= 70 ? 1 : 0));
    return got.length ? { text: `${p.first} made some calls. New openings I qualify for: ${got.join(', ')}. (Career tab)`, cls: 'good' } : { text: `${p.first} came back empty-handed. "Nobody's hiring someone like you right now. Get qualified."`, cls: '' }; } },
  { id: 'agent_fire', emoji: '✂️', name: 'Let them go', icon: 'brokenheart', age: 15, need: (c, p) => !!p.agent, run: c => fireAgent(c) },
];
// yearly retainer; if you can't pay, they walk
export function jobsYear(c) {
  const p = agentOf(c); if (!p) return;
  if (p.agent.paid === G.world.year) return; p.agent.paid = G.world.year;
  const fee = agentFee(c, p.agent.tier);
  if (c.money < fee) { p.agent = null; p.role = 'Acquaintance'; ui.log(`I couldn't pay ${p.first}'s retainer, so my job agent dropped me.`, 'bad'); return; }
  money(c, -fee);
}

// ---- v0.9.7 job interviews: two questions. A wrong answer ends the interview on the spot.
// Good answers are then judged against your Smarts (tech), Charisma (charm) or honesty.
const QUESTIONS = [
  { q: 'Why should we hire you over everyone else in that waiting room?', a: [['Lay out exactly what you know about the field.', 'tech'], ['Smile, hold their eye, and sell yourself.', 'charm'], ['"Honestly? I need this job, and I will work harder than anyone."', 'honest'],
    ['"Because I\'m cheaper than the others, probably."', 'bad', 'You talked yourself down to nothing.'], ['"No idea. My mum told me to apply."', 'bad', 'They stopped writing halfway through your answer.']] },
  { q: 'Tell us about a time you failed.', a: [['Walk through a real mistake and what you changed after it.', 'honest'], ['Turn it into a funny story that ends well.', 'charm'], ['Explain the technical root cause in detail.', 'tech'],
    ['"I\'ve never really failed at anything."', 'bad', 'Nobody believes that, and now they don\'t believe anything else you said.'], ['Blame your last boss for all of it.', 'bad', 'They wondered what you\'d say about them one day.']] },
  { q: 'Where do you see yourself in five years?', a: [['"Still here, but trusted with a lot more."', 'honest'], ['"In your chair. Kidding. Mostly."', 'charm'], ['Describe the skills you plan to master, one by one.', 'tech'],
    ['"Somewhere that pays better than this."', 'bad', 'Why would they train someone who\'s already leaving?'], ['"Retired, rich, on a beach."', 'bad', 'The panel did not laugh.']] },
  { q: 'What is your biggest weakness?', a: [['"I take on too much. I\'m learning to say no."', 'honest'], ['"I double-check everything — it slows me down a little."', 'tech'], ['Make a self-deprecating joke, then answer properly.', 'charm'],
    ['"I get bored and stop showing up."', 'bad', 'Too honest.'], ['"I don\'t have any."', 'bad', 'Arrogance is a weakness. They noted it.']] },
  { q: 'A coworker takes credit for your work. What do you do?', a: [['Talk to them privately first.', 'honest'], ['Bring it up lightly in the next team meeting.', 'charm'], ['Keep records of everything from now on.', 'tech'],
    ['"Wait for them in the car park."', 'bad', 'Security walked you out.'], ['Quietly sabotage their next project.', 'bad', 'They don\'t hire saboteurs, even honest ones.']] },
  { q: 'A customer is shouting at you. What do you do?', a: [['Stay calm, listen, and fix what you can.', 'honest'], ['Lower your voice and win them round.', 'charm'], ['Follow the complaints process, step by step.', 'tech'],
    ['Shout back louder.', 'bad', 'They pictured you doing exactly that to their customers.'], ['Walk away and let someone else deal with it.', 'bad', 'That\'s not a job they can give you.']] },
  { q: 'Do you have any questions for us?', a: [['"What does success look like in the first year?"', 'tech'], ['"What do you enjoy most about working here?"', 'charm'], ['"What would you need from me to make this easier for you?"', 'honest'],
    ['"How soon can I take holidays?"', 'bad', 'Not the question they wanted first.'], ['"No."', 'bad', 'You looked like you didn\'t care.']] },
  { q: 'We looked you up online. Want to explain that photo?', a: [['Own it calmly: it\'s not who you are at work.', 'honest'], ['Laugh it off, then turn the talk back to the job.', 'charm'], ['Explain the context, clearly and briefly.', 'tech'],
    ['"That\'s fake. Someone is framing me."', 'bad', 'It wasn\'t fake, and they knew it.'], ['Get defensive and ask why they were stalking you.', 'bad', 'The temperature in the room dropped.']] },
];
const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);
export async function interview(c, j) {
  const qs = shuffle(QUESTIONS).slice(0, 2), base = hireChance(c, j), sm = eff(c, 'smarts'), ch = eff(c, 'charisma'), knows = !j.major || j.major.includes(c.edu.major);
  let fit = 0;
  for (const [i, Q] of qs.entries()) {
    const goods = Q.a.filter(x => x[1] !== 'bad'), bads = shuffle(Q.a.filter(x => x[1] === 'bad')).slice(0, ri(1, 2));
    const opts = shuffle([...goods, ...bads]);
    const k = await ui.choice({ title: `Interview: ${j.name} (${i + 1}/2)`, icon: 'career', dismiss: false, text: `${i ? 'They lean back.' : 'The panel looks up from your file.'}\n"${Q.q}"`, options: opts.map((x, n) => ({ label: x[0], value: n })) });
    const A = opts[k ?? 0];
    if (A[1] === 'bad') return { text: `Interview for ${j.name}: rejected. ${A[2]} ${pick(['"Thank you for coming in."', 'They thanked you and showed you the door.', 'You knew it the moment you said it.'])}`, cls: 'bad' };
    fit += A[1] === 'tech' ? (sm - 55) / 120 + (knows && j.edu >= 2 ? 0.08 : -0.04) : A[1] === 'charm' ? (ch - 55) / 120 : 0.04;
  }
  const p = clamp(base + fit / 2 + 0.05, 0.05, 0.9); // two good answers earn a little goodwill
  if (chance(p)) return { text: `${pick(['They shook my hand on the spot.', 'They called back the same evening.', 'The panel exchanged a look — a good one.'])} I was hired as a ${j.name}! (${Math.round(p * 100)}%)`, cls: 'good', big: true, hired: true };
  return { text: `${pick(['I answered well, but they went with someone else.', '"We\'ll be in touch." They were not.', 'Good interview — just not good enough this time.'])} (${Math.round(p * 100)}%)`, cls: 'bad' };
}

// ---- odd jobs board: clear title, one-off or recurring, pay and risk
const GIGS = [
  { t: 'Dog walker', kind: 'one-time', pay: [20, 50], risk: 0, age: 8, note: 'Safe. The dogs are huge.' },
  { t: 'Car wash', kind: 'one-time', pay: [25, 60], risk: 0, age: 8, note: 'Safe, wet, tiring.' },
  { t: 'Temple sweeper', kind: 'recurring', pay: [15, 30], risk: 0, age: 8, note: 'Safe. Small pay every year you keep it. Calm mind (-Stress).', recur: true },
  { t: 'Night-market porter', kind: 'one-time', pay: [60, 140], risk: 0.08, age: 14, note: 'Heavy loads: small chance of hurting your back.' },
  { t: 'Debt collector\'s muscle', kind: 'one-time', pay: [150, 400], risk: 0.25, age: 16, note: 'Good money. Fights happen. Raises Heat.', heat: 10 },
  { t: 'Gate-site scavenger', kind: 'one-time', pay: [120, 600], risk: 0.3, age: 15, note: 'Picking through a sealed Gate\'s edge. Might find materials — or something left inside.' },
  { t: 'Tutor for a rich kid', kind: 'recurring', pay: [80, 180], risk: 0, age: 15, note: 'Needs Smarts 60+. Pays every year you keep it.', smarts: 60, recur: true },
  { t: 'Courier, no questions asked', kind: 'one-time', pay: [200, 700], risk: 0.2, age: 16, note: 'Don\'t open the package. Might be police at the drop. Raises Heat.', heat: 15 },
];
export function gigBoard(c) { if (c.gigYear !== G.world.year) { c.gigYear = G.world.year; c.gigs = GIGS.filter(g => c.age >= g.age).sort(() => Math.random() - 0.5).slice(0, 4).map(g => g.t); } return GIGS.filter(g => (c.gigs || []).includes(g.t)); }
export async function takeGig(c, g) {
  if (g.smarts && eff(c, 'smarts') < g.smarts) return { text: `They wanted someone smarter for the ${g.t} job.`, cls: 'bad' };
  c.gigs = (c.gigs || []).filter(x => x !== g.t);
  if (g.recur) { c.recurGig = { t: g.t, pay: g.pay }; }
  if (g.heat) c.heat = Math.min(100, (c.heat || 0) + g.heat);
  if (g.risk && chance(g.risk)) { const hurt = ri(6, 18); c.stats.health = Math.max(1, c.stats.health - hurt); const m = Math.round(ri(...g.pay) * 0.3 * wage(c)); money(c, m);
    return { text: `${g.t}: it went wrong. I got hurt (-${hurt} Health) and only got ${fmtMoney(c, m)}.`, cls: 'bad' }; }
  if (g.t === 'Gate-site scavenger' && chance(0.4)) { const { addItem } = await import('./life.js'); addItem(c, pick(['spirit_herb', 'iron_ore', 'beast_core', 'spirit_stone'])); }
  const m = Math.round(ri(...g.pay) * wage(c)); money(c, m);
  return { text: `${g.t}${g.recur ? ' (I\'ll keep doing this every year)' : ''}: earned ${fmtMoney(c, m)}.`, cls: 'good' };
}
export function gigYear(c) { const r = c.recurGig; if (!r || c.prison) return; if (c.job && !CAREERS.find(j => j.id === c.job.id)?.part) { c.recurGig = null; return; } const m = Math.round(ri(...r.pay) * wage(c)); money(c, m); if (r.t === 'Temple sweeper') c.stats.stress = Math.max(0, c.stats.stress - 3); ui.log(`My ${r.t.toLowerCase()} gig paid ${fmtMoney(c, m)} this year.`); }
