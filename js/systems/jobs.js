// v0.8.1 Job market: only some jobs are hiring each year. A job agent (a real person) can dig up more,
// tailor leads to you and talk you up — for a fee.
import { G } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp } from '../core/rng.js';
import { CAREERS } from '../data/careers.js';
import { money, fmtMoney, wage, country, priceFor } from './life.js';
import { makePerson, gainClose } from './people.js';
import { eff } from './body.js';

export const AGENTS = {
  rookie: { name: 'Rookie job agent', fee: 600, leads: 1, hire: 0.08, open: 0.08, desc: 'Eager, cheap, knows a few people.' },
  seasoned: { name: 'Seasoned recruiter', fee: 2500, leads: 2, hire: 0.14, open: 0.15, desc: 'A thick contact book and a good phone voice.' },
  elite: { name: 'Elite headhunter', fee: 9000, leads: 3, hire: 0.22, open: 0.25, desc: 'Gets you into rooms you didn\'t know existed.' },
};
export const agentOf = c => c.people.find(p => p.alive && p.agent);
export const agentFee = (c, tier) => priceFor(c, Math.round(AGENTS[tier].fee * wage(c) / 0.32));

export function eligible(c, j) {
  return c.age >= j.minAge && c.age <= (j.maxAge || 99) && c.edu.level >= j.edu && (!j.major || j.major.includes(c.edu.major)) && (c.edu.school !== 'University' || j.part)
    && Object.entries(j.stat || {}).every(([k, v]) => eff(c, k) >= v) && (!j.realm || c.qi.realm >= j.realm);
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
export const hireChance = (c, j) => clamp(0.2 + c.stats.charisma / 300 + c.stats.smarts / 500 + (agentOf(c) ? AGENTS[agentOf(c).agent.tier].hire : 0) - (j.pay >= 150000 ? 0.15 : j.pay >= 90000 ? 0.08 : 0), 0.05, 0.8);

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
