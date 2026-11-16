// v0.8.7 Identity: sexuality for everyone (yours can change any time), gender transition (medical or cultivation),
// adoption, and late parenthood for those who stay young. Pregnancy follows birth sex: only someone born female can carry a child.
import { G } from '../core/state.js';
import { ui } from '../core/bus.js';
import { ri, pick, chance, clamp, weighted } from '../core/rng.js';
import { money, fmtMoney, wage, stat, country } from './life.js';
import { makePerson } from './people.js';
import { uniqueFirst } from './family.js';

export const SEXUALITIES = { straight: 'Straight', gay: 'Gay / Lesbian', bi: 'Bisexual', ace: 'Asexual' };
export const birthSex = x => x.birthSex || x.gender;
export function sexualityOf(x) { if (!x.sexuality) x.sexuality = weighted([['straight', 82], ['gay', 6], ['bi', 9], ['ace', 3]], e => e[1])[0]; return x.sexuality; }
export const attractedTo = (a, b) => { const s = sexualityOf(a); return s === 'bi' ? true : s === 'ace' ? chance(0.15) : s === 'gay' ? a.gender === b.gender : a.gender !== b.gender; };
// pregnancy needs one partner born female and one born male
export const canConceive = (a, b) => birthSex(a) !== birthSex(b);
export const eternalYouth = x => !!x.flags?.eternalYouth || (x.heirlooms || []).some(h => h?.id === 'stone_peach') || (x.qi?.realm || 0) >= 6;

export const IDENTITY_ACTS = [
  { id: 'reflect_sexuality', cat: 'mind', name: 'Reflect on who you love', icon: 'heart', minAge: 13, run: async c => {
    const v = await ui.choice({ title: 'Who do you love?', icon: 'heart', text: `Right now you feel: ${SEXUALITIES[sexualityOf(c)]}. Feelings can change — this is yours to define.`, options: [...Object.entries(SEXUALITIES).map(([k, n]) => ({ label: n, value: k, disabled: k === c.sexuality })), { label: 'Never mind', value: null, ghost: true }] });
    if (!v) return null; c.sexuality = v; stat(c, 'happiness', 4); return `I've come to understand myself better: ${SEXUALITIES[v].toLowerCase()}.`; } },
  { id: 'transition', cat: 'mind', name: 'Gender transition', icon: 'character', minAge: 18, run: async c => {
    const to = c.gender === 'F' ? 'M' : 'F', fee = Math.round(30000 * wage(c) / 0.32 * 0.4), art = (c.qi?.realm || 0) >= 5;
    const v = await ui.choice({ title: 'Transition', icon: 'character', text: `Live as ${to === 'F' ? 'a woman' : 'a man'}.${art ? '\nAt your realm, the Yin-Yang Body Reforging art can reshape you directly.' : ''}\n(Pregnancy always follows birth sex.)`,
      options: [{ label: `Medical transition — ${fmtMoney(c, fee)}`, value: 'med', disabled: c.money < fee }, ...(art ? [{ label: 'Yin-Yang Body Reforging (cultivation)', value: 'art' }] : []), { label: 'Not now', value: null, ghost: true }] });
    if (!v) return null; c.birthSex ||= c.gender;
    if (v === 'med') money(c, -fee); else stat(c, 'health', -ri(5, 15));
    c.gender = to; stat(c, 'happiness', 12);
    return { text: v === 'art' ? 'I reforged my body with Yin and Yang. The person in the mirror is finally me.' : `My transition is complete (${fmtMoney(c, fee)}). The person in the mirror is finally me.`, cls: 'good', big: true }; } },
  { id: 'adopt', cat: 'love', name: 'Adopt a child', icon: 'baby', minAge: 21, run: async c => {
    const fee = Math.round(4000 * wage(c) / 0.32 * 0.4);
    const v = await ui.choice({ title: 'Adoption', icon: 'baby', text: `An orphanage, a sect that lost its parents in a war, or a child found after a Gate break. Fee: ${fmtMoney(c, fee)}.`, options: [{ label: 'From the city orphanage', value: 'orphanage', disabled: c.money < fee }, { label: 'A sect-war orphan', value: 'sect', disabled: c.money < fee }, { label: 'Not now', value: null, ghost: true }] });
    if (!v) return null; money(c, -fee);
    const gender = chance(0.5) ? 'F' : 'M', kid = makePerson(c, { role: gender === 'F' ? 'Daughter' : 'Son', gender, age: ri(0, 9), close: 55, last: c.last, first: uniqueFirst(c, gender), realm: v === 'sect' && chance(0.3) ? 1 : 0, extra: { adopted: true } });
    c.people.push(kid); stat(c, 'happiness', 12);
    return { text: `I adopted ${kid.first}, ${kid.age === 0 ? 'a baby' : `age ${kid.age}`}. ${v === 'sect' ? 'Their parents died in a sect war.' : 'They were waiting a long time for someone.'}`, cls: 'good', big: true }; } },
];
