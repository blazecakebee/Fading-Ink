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
  if (c.flags?.nonCompete?.field === j.id && G.world.year <= c.flags.nonCompete.until) return false; // v0.9.52 non-compete
  return c.age >= j.minAge && c.age <= (j.maxAge || 99) && c.edu.level >= j.edu && (!j.major || j.major.includes(c.edu.major) || j.major.includes(c.edu.gradMajor)) && (!/Univers|Master|Doctoral/.test(c.edu.school || '') || j.part) && (!j.trade || (c.edu.trades || []).includes(j.trade)) && (!j.stat?.looks || c.stats.looks >= j.stat.looks)
    && Object.entries(j.stat || {}).every(([k, v]) => k === 'looks' || eff(c, k) >= v) && (!j.realm || c.qi.realm >= j.realm) && (!j.license || hasLicense(c));
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

// v0.9.52 agents work on fixed contracts, paid up front: 1 year, or 3 years at 15% off. They leave when it ends.
export const CONTRACT_TERMS = [[1, 1], [3, 0.85]];
export const contractCost = (c, tier, years) => Math.round(agentFee(c, tier) * years * (CONTRACT_TERMS.find(t => t[0] === years)?.[1] || 1));
export function hireAgent(c, tier, years = 1) {
  const fee = contractCost(c, tier, years); if (c.money < fee) return null;
  const old = agentOf(c); if (old) { old.agent = null; old.role = 'Acquaintance'; }
  money(c, -fee);
  const p = makePerson(c, { role: AGENTS[tier].name.replace(/^\w/, m => m.toUpperCase()), age: ri(26, 60), close: 30, extra: { agent: { tier, since: G.world.year, until: G.world.year + years - 1, paid: G.world.year } } });
  c.people.push(p);
  // they get to work right away: a lead or two on this year's board
  const got = findLeads(c, AGENTS[tier].leads);
  return `I signed ${p.first} ${p.last}, ${AGENTS[tier].name.toLowerCase()}, on a ${years}-year contract for ${fmtMoney(c, fee)}.${got.length ? ` They already found: ${got.join(', ')}.` : ''}`;
}
export function fireAgent(c) { const p = agentOf(c); if (!p) return null; const left = (p.agent.until ?? G.world.year) - G.world.year; p.agent = null; p.role = 'Acquaintance'; p.close = clamp(p.close - 15); return `I let my job agent ${p.first} go.${left > 0 ? ` The ${left} year${left > 1 ? 's' : ''} left on the contract stay paid; that money is gone.` : ''}`; }
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
  contractYear(c);
  const p = agentOf(c); if (!p) return;
  if (p.agent.until == null) p.agent.until = G.world.year; // older saves: their retainer runs out now
  if (G.world.year >= p.agent.until) { p.agent = null; p.role = 'Acquaintance'; ui.log(`My contract with job agent ${p.first} ran out. They shook my hand and moved on to their next client.`); }
}

// ---- v0.9.52 employment contracts: after a successful interview you get a contract to read, then sign, negotiate or walk away
const CLAUSES = [
  { id: 'overtime', name: 'Mandatory overtime', text: 'You will work evenings when needed. +12% salary, but it wears on you.', pay: 0.12, stress: 4 },
  { id: 'remote', name: 'Flexible hours', text: 'You may set your own hours. -5% salary, less stress.', pay: -0.05, stress: -3 },
  { id: 'bonus', name: 'Performance bonus', text: 'A bonus of up to 20% of salary if your performance is above 70%.', bonus: 0.2 },
  { id: 'noncompete', name: 'Non-compete', text: 'If you quit early, you repay your signing bonus and wait a year before working in this field.', strict: true },
  { id: 'probation', name: 'Probation', text: 'The first year is probation: poor performance (under 35%) gets you dismissed at year end.', probation: true },
  { id: 'equity', name: 'Profit share', text: 'A small cut of the company: +3% salary every year you stay.', equity: 0.03 },
];
export function offerContract(c, j, interviewP) {
  const lean = j.pay >= 90000, term = pick(lean ? [3, 5] : [1, 2, 3]), base = 0.92 + Math.random() * 0.12 + (interviewP - 0.5) * 0.15;
  const pool = shuffle(CLAUSES).slice(0, ri(1, 3)).map(x => x.id);
  const bonus = chance(lean ? 0.7 : 0.35) ? Math.round(j.pay * wage(c) * (0.05 + Math.random() * 0.1)) : 0;
  return { job: j.id, salary: Math.round(base * 100) / 100, term, clauses: pool, signBonus: bonus, negotiated: false };
}
export function contractText(c, j, K) {
  const pay = j.pay * wage(c) * (j.part ? 0.5 : 1) * K.salary * (1 + K.clauses.reduce((s, id) => s + (CLAUSES.find(x => x.id === id)?.pay || 0), 0));
  return `EMPLOYMENT CONTRACT · ${j.name}\n\n` +
    `Salary: ${fmtMoney(c, Math.round(pay))} a year (${K.salary >= 1 ? '+' : ''}${Math.round((K.salary - 1) * 100)}% vs the usual offer)\n` +
    `Term: ${K.term} year${K.term > 1 ? 's' : ''}, then reviewed against your performance\n` +
    (K.signBonus ? `Signing bonus: ${fmtMoney(c, K.signBonus)}, paid on signing\n` : '') +
    K.clauses.map(id => { const x = CLAUSES.find(y => y.id === id); return `• ${x.name}: ${x.text}`; }).join('\n');
}
export async function signContract(c, j, interviewP) {
  let K = offerContract(c, j, interviewP);
  for (;;) {
    const v = await ui.choice({ title: 'Your contract', icon: 'letter', dismiss: false, text: contractText(c, j, K),
      options: [{ label: '✍️ Sign it', value: 'sign' }, ...(K.negotiated ? [] : [{ label: `Negotiate (Charisma ${eff(c, 'charisma')})`, value: 'neg' }]), { label: 'Walk away', value: 'no', ghost: true }] });
    if (v === 'no' || v == null) return { text: `I read the contract for ${j.name} twice, then walked away.`, cls: '' };
    if (v === 'neg') { K.negotiated = true; const pc = clamp(0.25 + (eff(c, 'charisma') - 40) / 120, 0.1, 0.8);
      if (chance(pc)) { K.salary = Math.round((K.salary + 0.05 + Math.random() * 0.07) * 100) / 100; if (K.clauses.includes('noncompete') && chance(0.5)) K.clauses = K.clauses.filter(x => x !== 'noncompete'); ui.toast?.('They agreed to better terms.'); }
      else if (chance(0.25)) return { text: `I pushed too hard negotiating for ${j.name}. They withdrew the offer.`, cls: 'bad' };
      else ui.toast?.('They would not budge.');
      continue; }
    // sign
    const stress = K.clauses.reduce((s, id) => s + (CLAUSES.find(x => x.id === id)?.stress || 0), 0), payAdj = K.clauses.reduce((s, id) => s + (CLAUSES.find(x => x.id === id)?.pay || 0), 0);
    c.job = { id: j.id, years: 0, perf: 50, raise: Math.round(K.salary * (1 + payAdj) * 100) / 100, contract: { ...K, start: G.world.year, stress } };
    if (K.signBonus) money(c, K.signBonus);
    return { text: `I signed my contract as a ${j.name}: ${K.term} year${K.term > 1 ? 's' : ''}${K.signBonus ? `, with a ${fmtMoney(c, K.signBonus)} signing bonus` : ''}.`, cls: 'good', big: true };
  }
}
// yearly: clauses take effect, and contracts come up for review at the end of their term
function contractYear(c) {
  const K = c.job?.contract; if (!K) return; const J = CAREERS.find(x => x.id === c.job.id);
  if (K.stress) c.stats.stress = clamp(c.stats.stress + K.stress, 0, 100);
  if (K.clauses.includes('bonus') && c.job.perf > 70 && J) { const b = Math.round(J.pay * wage(c) * 0.2 * (c.job.perf - 70) / 30); if (b > 0) { money(c, b); ui.log(`Performance bonus: ${fmtMoney(c, b)}.`, 'good'); } }
  if (K.clauses.includes('equity')) c.job.raise = Math.round((c.job.raise || 1) * 1.03 * 100) / 100;
  const yrs = G.world.year - K.start + 1;
  if (K.clauses.includes('probation') && yrs === 1 && c.job.perf < 35) { ui.log(`My probation ended badly. ${J?.name || 'The job'} let me go.`, 'bad'); c.job = null; return; }
  if (yrs >= K.term) {
    if (c.job.perf < 40) { ui.log(`My ${K.term}-year contract as a ${J?.name || 'worker'} was not renewed.`, 'bad'); c.job = null; return; }
    const r = c.job.perf >= 75 ? 0.08 : c.job.perf >= 55 ? 0.04 : 0;
    c.job.raise = Math.round((c.job.raise || 1) * (1 + r) * 100) / 100; K.start = G.world.year + 1; K.term = pick([2, 3, 3, 5]); K.signBonus = 0;
    ui.log(`My contract was renewed for ${K.term} more years${r ? ` with a ${Math.round(r * 100)}% raise` : ''}.`, r ? 'good' : '');
  }
}
// quitting early under a non-compete costs you
export function quitJob(c) {
  const K = c.job?.contract, J = CAREERS.find(x => x.id === c.job?.id); let extra = '';
  if (K && K.clauses.includes('noncompete') && G.world.year - K.start + 1 < K.term) { const back = K.signBonus || Math.round((J?.pay || 20000) * wage(c) * 0.1); money(c, -back); c.flags.nonCompete = { field: J?.id, until: G.world.year + 1 }; extra = ` Breaking the non-compete cost me ${fmtMoney(c, back)}.`; }
  c.job = null; return `I quit my job as a ${J?.name || 'worker'}.${extra}`;
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
  if (chance(p)) return { text: `${pick(['They shook my hand on the spot.', 'They called back the same evening.', 'The panel exchanged a look — a good one.'])} They offered me the job of ${j.name}! (${Math.round(p * 100)}%)`, cls: 'good', big: true, hired: true, p };
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
