// v0.8.7 Your life leaves marks: scars, changed eyes, white hair, a heavier build.
import { ui } from '../core/bus.js';
import { chance } from '../core/rng.js';
import { earnTrait } from './traits.js';

export function appearanceYear(c) {
  c.face ||= {}; const f = c.face;
  const headHurt = ['head', 'jaw', 'eye_l', 'eye_r'].some(id => (c.body?.parts?.[id]?.inj || []).some(i => ['cut', 'scar', 'burn', 'fracture'].includes(i.type)) || c.body?.parts?.[id]?.missing);
  if (!f.scar && headHurt && chance(0.5)) { f.scar = true; ui.log('The wound on my face healed into a scar. I stopped hiding it after a while.', ''); }
  if (!f.redEyes && ((c.sacrifices || 0) >= 2 || (c.qiType?.primary?.type === 'demonic' && c.qiType.primary.perm >= 1))) { f.redEyes = true; ui.log('My eyes have turned blood-red. People look away when I pass.', 'bad'); }
  if (!f.goldEyes && !f.redEyes && (c.qi?.realm || 0) >= 9) { f.goldEyes = true; ui.log('My eyes have turned gold, like an old painting of an immortal.', 'qi'); }
  if (!f.whiteHair && c.grief && (c.grief.weight || 0) > 0.8 && c.age < 50 && chance(0.25)) { c.hair = { ...(c.hair || {}), color: 'platinum' }; f.whiteHair = true; ui.log('My hair went white in a single winter of grief.', 'bad'); }
  if (!f.bulk && (c.body?.muscle || 0) >= 70) { f.bulk = true; ui.log('My body has become heavy with muscle. Doorframes are a problem now.', ''); }
}
