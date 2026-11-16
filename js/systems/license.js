// v0.9.7 Driver's licenses: theory test → learner's permit → optional lessons → practical test → license.
// You need a license to buy a car or take driving jobs. Prison or a serious crash can cost you your license.
import { G } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp } from '../core/rng.js';
import { money, fmtMoney, priceFor, country, stat } from './life.js';
import { eff } from './body.js';

export const LICENSE_AGE = { theory: 15, test: 16 };
export const hasLicense = c => c?.license?.status === 'full' && !((c.license.suspended || 0) > (G.world?.year || 0));
export const licenseState = c => {
  const L = c.license;
  if (!L) return 'none';
  if (L.status === 'full') return (L.suspended || 0) > G.world.year ? 'suspended' : 'full';
  return 'permit';
};
export const fees = c => ({ theory: priceFor(c, 60 * country(c).econ), lesson: priceFor(c, 90 * country(c).econ), test: priceFor(c, 150 * country(c).econ) });
export const testChance = c => clamp(0.3 + eff(c, 'agility') / 300 + eff(c, 'smarts') / 500 + (c.license?.lessons || 0) * 0.12 + (c.license?.fails || 0) * 0.04, 0.1, 0.95);

const THEORY = [
  { q: 'The light turns amber as you approach. What do you do?', a: ['Stop if it is safe to stop', 'Speed up to beat the red', 'Sound your horn and keep going'] },
  { q: 'A ball rolls into the road ahead of you.', a: ['Slow down and expect a child to follow it', 'Swerve around it at the same speed', 'Ignore it, it is only a ball'] },
  { q: 'What does a solid white line along the middle of the road mean?', a: ['Do not cross or overtake over it', 'Overtaking is encouraged', 'Parking is allowed on it'] },
  { q: 'When should you use your indicators?', a: ['Before every turn or lane change', 'Only when police are around', 'Only on motorways'] },
  { q: 'Driving in heavy fog, you should…', a: ['Slow down and use dipped headlights', 'Use full beams to see further', 'Follow the car ahead closely so you don\'t lose it'] },
  { q: 'At a pedestrian crossing, someone is waiting to cross.', a: ['Stop and let them cross', 'Wave them back and drive on', 'Keep going, they haven\'t stepped out yet'] },
  { q: 'How much should you drink before driving?', a: ['Nothing at all', 'One drink is fine', 'It depends how you feel'] },
  { q: 'An ambulance with sirens comes up behind you.', a: ['Pull over safely and let it pass', 'Speed up to stay ahead of it', 'Stop dead in the middle of the lane'] },
  { q: 'Your phone rings while you are driving.', a: ['Let it ring, or pull over first', 'Answer it but keep your eyes up', 'Text back at the next red light'] },
  { q: 'What is the safe following distance in good weather?', a: ['At least two seconds behind the car ahead', 'Half a car length', 'Close enough to read their number plate'] },
  { q: 'Approaching a roundabout, who usually has priority?', a: ['Traffic already on the roundabout', 'Whoever is bigger', 'Whoever gets there first and honks'] },
  { q: 'Your brakes feel soft and spongy.', a: ['Stop driving and get them checked', 'Pump them harder and carry on', 'Drive faster to get home sooner'] },
];
const ROAD = [
  { q: 'The examiner points: a cyclist is wobbling just ahead of you on a narrow street.', a: [['Hang back and pass only when there is plenty of room', true], ['Pass them close and quick', false], ['Honk so they move over', false]] },
  { q: 'You reach a stop sign. The road looks completely empty.', a: [['Come to a full stop, look both ways, then go', true], ['Roll through slowly, it is empty', false], ['Speed up — nobody is coming', false]] },
  { q: '"Parallel park behind that van, please."', a: [['Signal, check mirrors, reverse in slowly', true], ['Drive in forwards and hope', false], ['Say you would rather not', false]] },
  { q: 'A car pulls out in front of you without looking.', a: [['Brake firmly and keep control', true], ['Swerve into the oncoming lane', false], ['Accelerate and lean on the horn', false]] },
];
const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);

// Theory test: three questions, two right to pass
export async function theoryTest(c) {
  const f = fees(c).theory; if (c.money < f) return null;
  money(c, -f); let right = 0;
  for (const [i, Q] of shuffle(THEORY).slice(0, 3).entries()) {
    const opts = shuffle(Q.a.map((t, n) => ({ t, ok: n === 0 })));
    const k = await ui.choice({ title: `Theory test (${i + 1}/3)`, icon: 'car', dismiss: false, text: Q.q, options: opts.map((o, n) => ({ label: o.t, value: n })) });
    if (opts[k ?? 0].ok) right++;
  }
  if (right >= 2) { c.license = { status: 'permit', year: G.world.year, lessons: 0, fails: 0 }; return { text: `I passed my driving theory test (${right}/3) and got my learner's permit. (${fmtMoney(c, f)})`, cls: 'good', big: true }; }
  return { text: `I failed my driving theory test: ${right}/3 right. I need 2. (${fmtMoney(c, f)} fee lost)`, cls: 'bad' };
}
export function lesson(c) {
  const f = fees(c).lesson; if (c.money < f || licenseState(c) !== 'permit') return null;
  if ((c.license.lessons || 0) >= 4) return { text: 'My instructor says there is nothing more to teach me — I just need to take the test.', cls: '' };
  money(c, -f); c.license.lessons = (c.license.lessons || 0) + 1; stat(c, 'agility', 1);
  return { text: `${pick(['My instructor only grabbed the wheel once.', 'Hill starts, roundabouts, a lot of stalling.', 'We drove around the industrial estate for an hour.', 'I finally got the hang of the clutch.'])} Driving lesson ${c.license.lessons}/4. (${fmtMoney(c, f)})`, cls: 'good' };
}
export async function practicalTest(c) {
  const f = fees(c).test; if (c.money < f || licenseState(c) !== 'permit') return null;
  money(c, -f);
  const Q = pick(ROAD), opts = shuffle(Q.a);
  const k = await ui.choice({ title: 'Driving test', icon: 'car', dismiss: false, text: Q.q, options: opts.map((o, n) => ({ label: o[0], value: n })) });
  if (!opts[k ?? 0][1]) { c.license.fails = (c.license.fails || 0) + 1; return { text: 'Instant fail. The examiner wrote something long on the clipboard and asked me to pull over.', cls: 'bad' }; }
  const p = testChance(c);
  if (chance(p)) { c.license = { status: 'full', year: G.world.year }; stat(c, 'happiness', 8); return { text: `I passed my driving test and got my full license! (${Math.round(p * 100)}%)`, cls: 'good', big: true }; }
  c.license.fails = (c.license.fails || 0) + 1;
  return { text: `${pick(['Too many minor faults.', 'I clipped the kerb on the reverse.', 'I forgot to check my mirror pulling out.', 'I stalled at the lights three times.'])} I failed my driving test. (${Math.round(p * 100)}%)`, cls: 'bad' };
}
// called by prison / crashes
export function suspendLicense(c, years, why) {
  if (!hasLicense(c)) return; c.license.suspended = G.world.year + years;
  ui.log(`My driver's license was suspended for ${years} year${years > 1 ? 's' : ''}${why ? ' — ' + why : ''}.`, 'bad');
}
