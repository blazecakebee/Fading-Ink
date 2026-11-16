// Starter guide: a short illustrated walkthrough shown the first time you play (and any time from Settings).
import { h, icon } from './dom.js';
import { openModal } from './modal.js';
import { META, save } from '../core/state.js';

const PAGES = [
  { icon: 'life', title: 'Welcome to Fading Ink', body: ['A life simulator written in ink: you are born, grow up, make choices and die — one year at a time.', 'But this world hides Qi, sects, Gates full of monsters and centuries-old cultivators. How far you climb is up to you.', 'When one life ends, your children carry your blood, heirlooms and legacy forward.'] },
  { icon: 'clock', title: 'Years & actions', body: ['Each year you get ⚡ Actions (activities on the Life tab) and 💬 Social actions (talking to people in the People tab).', 'Spend them, then press AGE UP. Events happen, people age, and the story of your year is written in the chronicle.', 'Unused actions are simply lost — so use them!'] },
  { icon: 'skills', title: 'Stats & traits', body: ['Health, Happiness and Stress keep you alive and sane. Smarts, Strength, Agility, Charisma, Luck, Looks and Battle Knowledge grow with training — and slowly fade if you neglect them.', 'You\'re born with traits (Common to God-tier) and can earn more. Hover any trait to read it.', 'Genes (Bloodline tab) and family heirlooms add small, permanent edges.'] },
  { icon: 'cultivation', title: 'Cultivation', body: ['Qi is secret. Discover it through odd encounters, cloud-watching, friends or sects.', 'Meditate to gather Qi, open meridians, then attempt breakthroughs. Major realms bring Heavenly Tribulations — and much longer lives.', 'Or reject Qi entirely and walk the Severed Path, tempering your body until it rivals cultivators.'] },
  { icon: 'gates', title: 'Gates & combat', body: ['Gates open around the world. Clear them for pills, gear, manuals and rare heirlooms.', 'Fights are turn-based: pick moves, target body parts, use your one special. Fleeing is allowed — death is real.', 'Cultivators far above you crush you with their presence alone. Choose your fights.'] },
  { icon: 'people', title: 'People, family & legacy', body: ['Friends, partners and family give real bonuses. Bonds grow slowly — talk, help and spend time.', 'Move in, marry, have children and train them. When you die, continue as one of your children.', 'Legacy points earned each life unlock permanent upgrades for every future life.'] },
  { icon: 'crown', title: 'Money, sects & the world', body: ['Work a career, invest in the Stock Market, buy homes, clothes and gear. Everything is priced in your local currency.', 'Join or found a sect, rise through its ranks, take disciples — or brave the Hunter Guild\'s entrance trial.', 'World news is real: crashes, Spirit Tides and Gate surges change the world that year.'] },
  { icon: 'heart', title: 'Play together', body: ['Co-op lets friends share a world: hang out, spar, marry, raise children together and age up together.', 'Settings has themes, music (songs rotate), cinematics and cloud saves.', 'That\'s it. Your ink is still wet — go write something.'] },
];
export function openGuide(onDone) {
  let i = 0; const box = h('div', { class: 'guide' });
  const draw = () => {
    const P = PAGES[i];
    box.replaceChildren(
      h('div', { class: 'guide-head' }, icon(P.icon, 'lg'), h('div', {}, h('small', { class: 'muted' }, `Starter guide · ${i + 1} / ${PAGES.length}`), h('h2', {}, P.title))),
      h('div', { class: 'guide-body' }, P.body.map(t => h('p', {}, t))),
      h('div', { class: 'guide-dots' }, PAGES.map((_, k) => h('i', { class: k === i ? 'on' : '', onclick: () => { i = k; draw(); } }))),
      h('div', { class: 'row', style: { justifyContent: 'space-between', marginTop: '10px' } },
        h('button', { class: 'btn ghost', onclick: finish }, 'Skip guide'),
        h('span', { class: 'row', style: { gap: '6px' } }, i ? h('button', { class: 'btn ghost', onclick: () => { i--; draw(); } }, '← Back') : null,
          h('button', { class: 'btn', onclick: () => { if (i < PAGES.length - 1) { i++; draw(); } else finish(); } }, i < PAGES.length - 1 ? 'Next →' : 'Begin my life'))));
  };
  const m = openModal(box, { dismiss: false });
  function finish() { META.guideSeen = true; save(); m.close(); onDone?.(); }
  draw();
}
export function maybeGuide() { if (!META.guideSeen) setTimeout(() => openGuide(), 400); }
