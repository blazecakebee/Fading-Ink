import { eff } from '../systems/body.js';
// Random yearly events. Each: cond(c) -> bool, weight, run(c) async. Choice events open a popup.
import { ui } from '../core/bus.js';
import { G } from '../core/state.js';
import { ri, pick, chance, clamp, weighted } from '../core/rng.js';
import { stat, money, fmtMoney, country, addItem, discount, priceFor, wage } from '../systems/life.js';
import { ITEMS } from './items.js';
import { learnManual } from '../systems/cultivation.js';
import { has, earnTrait, traitMult } from '../systems/traits.js';
import { makePerson } from '../systems/people.js';
import { ENEMIES, GATE_RANKS, makeGate, GATE_TYPES } from './combat.js';

const E = [
  // --- childhood
  { id: 'first_words', cond: c => c.age === 1, w: 100, run: c => ui.log(`My first word was "${pick(['mama', 'dada', 'no', 'qi', 'cat', 'ink'])}".`) },
  { id: 'walk', cond: c => c.age === 2, w: 60, run: c => ui.log('I took my first steps.') },
  { id: 'bully', cond: c => c.age >= 7 && c.age <= 15 && c.edu.school, w: 8 * 1, run: async c => {
      const v = await ui.choice({ title: 'A bully corners you', text: `${pick(['Big', 'Mean', 'Tall'])} ${pick(['Jun', 'Tyler', 'Diego', 'Igor', 'Kenji'])} demands your lunch money.`, icon: 'fist',
        options: [{ label: 'Fight back', value: 'fight' }, { label: 'Hand it over', value: 'pay' }, { label: 'Tell a teacher', value: 'tell' }] });
      if (v === 'fight') { const r = await ui.fight({ ...ENEMIES[0] }); ui.log(r === 'win' ? 'I fought the bully and won. Nobody bothers me now.' : 'The bully beat me up.', r === 'win' ? 'good' : 'bad'); if (r === 'win') c.wins++; }
      else if (v === 'pay') { stat(c, 'happiness', -6); ui.log('I handed over my lunch money.', 'bad'); }
      else { ui.log('I told a teacher. The bully got detention.'); stat(c, 'happiness', 2); } } },
  { id: 'gifted', cond: c => c.age >= 6 && c.age <= 12 && eff(c, 'smarts') > 75, w: 4, run: c => { stat(c, 'smarts', 4); c.edu.grades = clamp(c.edu.grades + 10); ui.log('My teacher entered me into the gifted program.', 'good'); } },
  { id: 'sick', cond: c => c.age < 12, w: 5, run: c => { stat(c, 'health', -ri(5, 15)); ui.log(`I caught ${pick(['chickenpox', 'the flu', 'a fever', 'measles'])}.`, 'bad'); } },
  // --- cultivation discovery (secretive world)
  { id: 'old_man', cond: c => !c.qi.known && c.age >= 8 && c.age <= 40, w: 3, run: async c => {
      const v = await ui.choice({ title: 'The Beggar at the Bridge', text: 'An old beggar grabs your wrist. "Your meridians... interesting. Would you trade me a meal for a secret?"', icon: 'manual',
        options: [{ label: `Buy him a meal (${fmtMoney(c, 10 * country(c).econ)})`, value: true }, { label: 'Pull away', value: false }] });
      if (v) { money(c, -10 * country(c).econ); c.qi.known = true; learnManual(c, 'breathing'); ui.log('He taught me to breathe in a way that made the world hum. Qi. It is real.', 'qi'); }
      else ui.log('I pulled away. He laughed like he knew we\'d meet again.'); } },
  { id: 'recruiter', cond: c => c.qi.realm >= 1 && !c.sect && c.age >= 12, w: 4, run: c => ui.log('A woman in a grey coat left a card: an ink lotus and an address. Someone noticed my Qi. (Try "Seek a hidden sect")', 'qi') },
  { id: 'gate_spawn', cond: c => c.age >= 10, w: 5, run: c => { const g = GATE_RANKS[Math.min(5, weighted([0, 1, 2, 3, 4, 5].map(i => ({ i, weight: [40, 28, 16, 9, 5, 2][i] }))).i)]; const ng = makeGate(g.rank); c.gates.push(ng); ui.log(`News: A ${g.rank}-rank Gate (${GATE_TYPES.find(t => t.id === ng.type).name}) opened in ${c.city}. The Hunter Association sealed off three blocks.`, 'qi'); } },
  { id: 'gang_threat', cond: c => c.age >= 16 && c.qi.realm >= 1, w: 3 * 1, run: async c => {
      const v = await ui.choice({ title: 'Crimson Lotus collectors', text: 'Two gang cultivators smell Qi on you. "Unregistered cultivator. Pay tribute or bleed."', icon: 'demon',
        options: [{ label: 'Fight', value: 'fight' }, { label: `Pay ${fmtMoney(c, 500 * country(c).econ)}`, value: 'pay' }, { label: 'Run', value: 'run' }] });
      if (v === 'fight') { const r = await ui.fight({ ...ENEMIES.find(e => e.id === 'gangster') }); ui.log(r === 'win' ? 'I sent them crawling back to their masters.' : 'They beat me and took what I had.', r === 'win' ? 'good' : 'bad'); if (r !== 'win') money(c, -Math.max(0, c.money * 0.2)); else { c.wins++; if (chance(0.4)) addItem(c, 'qi_pill'); } }
      else if (v === 'pay') { money(c, -500 * country(c).econ); ui.log('I paid tribute. It felt like swallowing glass.', 'bad'); }
      else { if (chance(eff(c, 'agility') / 100)) ui.log('I outran them through the night market.'); else { stat(c, 'health', -8); ui.log('They caught me. I limped home.', 'bad'); } } } },
  { id: 'spirit_night', cond: c => c.age >= 14, w: 3, run: async c => {
      const sp = pick(['hungry_ghost', 'jiangshi']);
      const v = await ui.choice({ title: 'Something in the dark', text: `A ${ENEMIES.find(e => e.id === sp).name} drifts out of the alley, hungry.`, icon: 'ghost', options: [{ label: 'Fight it', value: true }, { label: 'Flee', value: false }] });
      if (!v) { ui.log('I ran until dawn.'); stat(c, 'stress', 10); return; }
      const r = await ui.fight({ ...ENEMIES.find(e => e.id === sp) });
      if (r === 'win') { c.wins++; ui.log('I banished the spirit. Its ash smelled of incense.', 'good'); if (chance(0.3)) { addItem(c, 'spirit_stone'); ui.log('It left behind a Spirit Stone.', 'qi'); } }
      else { stat(c, 'health', -8); ui.log('It fed on me. I woke up cold.', 'bad'); } } },
  { id: 'method_market', cond: c => c.qi.realm >= 1 && c.age >= 14, w: 2, run: async c => {
      const { METHODS } = await import('./realms.js'); const { learnMethod } = await import('../systems/cultivation.js');
      const opts = METHODS.filter(m => !(c.qi.methods || ['basic']).includes(m.id)); if (!opts.length) return; const m = pick(opts); const price = Math.round(1500 * country(c).econ);
      const v = await ui.choice({ title: 'Ghost Market', text: `A blind scribe offers a cultivation method — the ${m.name} — for ${fmtMoney(c, price)}.\n${m.desc}`, icon: 'manual', options: [{ label: 'Buy', value: true, disabled: c.money < price }, { label: 'Pass', value: false }] });
      if (v && c.money >= price) { money(c, -price); learnMethod(c, m.id); } } },
  { id: 'manual_market', cond: c => c.qi.known && c.age >= 14, w: 2, run: async c => {
      const m = pick(['flame_palm', 'river_step', 'thunder_fist', 'iron_skin']); if (c.qi.manuals.includes(m)) return;
      const price = Math.round(800 * country(c).econ);
      const v = await ui.choice({ title: 'Ghost Market', text: `A masked vendor offers a martial manual for ${fmtMoney(c, price)}. Genuine? Who knows.`, icon: 'manual', options: [{ label: 'Buy', value: true }, { label: 'Pass', value: false }] });
      if (v && c.money >= price) { money(c, -price); if (chance(0.7)) learnManual(c, m); else ui.log('The manual was fake. Blank pages and a smiley face.', 'bad'); } } },
  // --- merchants: charisma gets you better deals, and you can try to haggle
  { id: 'merchant', cond: c => c.age >= 12, w: 6, run: async c => {
      const pool = ['spirit_herb', 'spirit_stone', 'cloth', 'iron_ore', 'heal_pill', 'qi_pill', 'calm_incense', 'jade_charm', 'ginseng', 'mending_salve', 'iron_sword', 'padded_robe', 'recipe_scroll', 'recipe_scroll'];
      const id = pick(pool), it = ITEMS[id]; const n = ri(1, 3); const base = Math.round((it.price || 600) * n * country(c).econ * (0.7 + Math.random() * 0.5));
      let price = priceFor(c, base); const off = Math.round(discount(c) * 100);
      const v = await ui.choice({ title: pick(['A travelling merchant', 'Night-market peddler', 'A sect trader in disguise']), icon: 'shop',
        text: `"${n}× ${it.name}, friend. ${fmtMoney(c, base)}… for you, ${fmtMoney(c, price)}."${off ? `\n(Your charisma got you ${off}% off.)` : ''}\n${it.desc}`,
        options: [{ label: `Buy for ${fmtMoney(c, price)}`, value: 'buy', disabled: c.money < price }, { label: 'Haggle (Charisma)', value: 'haggle' }, { label: 'Walk away', value: 'no', ghost: true }] });
      if (v === 'haggle') {
        if (chance(0.25 + eff(c, 'charisma') / 200)) { price = Math.round(price * 0.7); c.flags.haggled = true; stat(c, 'charisma', 1); const ok = await ui.choice({ title: 'Haggled!', icon: 'shop', text: `"Fine, fine — ${fmtMoney(c, price)}, and you're robbing me."`, options: [{ label: `Buy for ${fmtMoney(c, price)}`, value: true, disabled: c.money < price }, { label: 'No thanks', value: false, ghost: true }] }); if (!ok) return ui.log('I talked a merchant down, then walked away anyway.'); }
        else return ui.log('I tried to haggle with a merchant. They packed up and left in a huff.', 'bad');
      } else if (v !== 'buy') return;
      if (c.money < price) return; money(c, -price); addItem(c, id, n); ui.log(`I bought ${n}× ${it.name} from a merchant for ${fmtMoney(c, price)}.`, 'good'); } },
  // --- exotic merchants: rare, stock pills (incl. breakthrough pills) at steep prices — Charisma helps
  { id: 'exotic_merchant', cond: c => c.age >= 14, w: 4, run: async c => {
      const pills = ['qi_pill', 'heal_pill', 'marrow_pill', 'foundation_pill', 'foundation_pill', ...(c.qi.realm >= 3 ? ['core_pill'] : []), 'purity_pill', 'heart_pill', 'mending_salve', 'calm_incense', 'trib_talisman', 'ginseng'];
      const k = country(c).econ; const stock = [];
      while (stock.length < 3) { const id = pick(pills); if (!stock.some(x => x.id === id)) stock.push({ id, price: priceFor(c, ({ core_pill: 15000, foundation_pill: 5000, trib_talisman: 4500, marrow_pill: 3500, purity_pill: 3000, ginseng: 3000 }[id] || 1200) * k * (0.8 + Math.random() * 0.6)) }); }
      const who = pick(['A veiled alchemist from the western deserts', 'A one-eyed pill sage on a talking donkey', 'A merchant from a sect that "does not exist"', 'A fox-eared trader who smells of plum blossom']);
      let open = true;
      while (open) {
        const v = await ui.choice({ title: 'Exotic Merchant', icon: 'cauldron', text: `${who} unrolls a silk cloth of pills.${discount(c) ? `\n(Your charisma gets you ${Math.round(discount(c) * 100)}% off.)` : ''}\nCash: ${fmtMoney(c, c.money)}`,
          options: [...stock.map((x, i) => ({ label: `${ITEMS[x.id].name} — ${fmtMoney(c, x.price)}`, value: i, disabled: x.sold || c.money < x.price })), { label: 'Done', value: -1, ghost: true }] });
        if (v == null || v === -1) open = false;
        else { const x = stock[v]; if (x.sold || c.money < x.price) continue; money(c, -x.price); addItem(c, x.id); x.sold = true; ui.fx('coin'); ui.log(`I bought a ${ITEMS[x.id].name} from an exotic merchant for ${fmtMoney(c, x.price)}.`, 'good'); }
      } } },
  // --- adult life
  { id: 'lottery', cond: c => c.age >= 18, w: 1, run: c => { if (chance(0.02 * (1 + c.stats.luck / 50))) { const g = Math.round(ri(10000, 200000) * country(c).econ); money(c, g); ui.log(`I won the lottery: ${fmtMoney(c, g)}!`, 'big'); ui.fx('milestone'); } } },
  { id: 'promotion', cond: c => c.job && c.job.perf > 70, w: 6, run: c => { const g = Math.round(2000 * wage(c)); money(c, g); c.job.perf = 50; ui.log(`I was promoted! Raise and bonus: ${fmtMoney(c, g)}.`, 'good'); } },
  { id: 'injury', cond: c => c.age >= 12, w: 3, run: c => { if (has(c, 'clumsy') || chance(0.5)) { stat(c, 'health', -ri(5, 15)); ui.log(`I ${pick(['broke my wrist', 'sprained an ankle', 'fell down the stairs'])}.`, 'bad'); } } },
  { id: 'crush', cond: c => c.age >= 13 && c.age <= 30 && !c.partnerId, w: 5, run: c => { const p = makePerson(c, { role: 'Crush', age: c.age + ri(-1, 2), close: ri(20, 45) }); c.people.push(p); ui.log(`I have a crush on ${p.first} ${p.last}.`); } },
  { id: 'news', cond: () => true, w: 6, run: c => ui.log(pick([
      `World: The Hunter Association reported ${ri(3, 90)} Gate breaks this year.`, 'World: A sect war spilled into the streets of a distant capital. Officials blame "gas leaks".',
      `World: The price of rice rose ${ri(2, 15)}%.`, 'World: A new social app made everyone briefly famous.', 'World: A mountain glowed for three nights. Scientists are baffled.',
      `World: ${pick(['An earthquake', 'A typhoon', 'A heatwave'])} struck ${pick(['the coast', 'the capital', 'the north'])}.`]), 'world') },
];

export async function yearlyEvents(c) {
  const fired = new Set();
  const n = c.age < 3 ? 1 : ri(1, 3);
  for (let i = 0; i < n; i++) {
    const pool = E.filter(e => !fired.has(e.id) && e.cond(c) && !(e.once && c.flags['ev_' + e.id]));
    if (!pool.length) break;
    const ev = weighted(pool, e => e.w * (e.id === 'bully' || e.id === 'gang_threat' ? traitMult(c, 'fights') : 1));
    fired.add(ev.id); if (ev.once) c.flags['ev_' + ev.id] = 1;
    if (!c.alive) break;
    await ev.run(c);
  }
}
export { E as EVENTS };
