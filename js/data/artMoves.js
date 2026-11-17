// v0.9.46 Every martial art has its own base moves. You unlock them as you climb the belts:
// Yellow, Green, Brown, then Black. Belts are kept per art, so a moves list follows every art you've trained.
// All of these are physical (they fade against high-realm foes, like any punch).
import { MOVES } from './combat.js';

export const UNLOCK_BELTS = [1, 3, 5, 6]; // indexes into BELTS: Yellow, Green, Brown, Black

export const ART_MOVES = {
  boxing: {
    box_uppercut: { icon: 'fist', name: 'Uppercut', cost: 12, dmg: [8, 14], acc: 0.78, stat: 'strength', stun: 0.15, info: 'Boxing: straight up the middle. May stun.' },
    box_weave:    { icon: 'feather', name: 'Weave', cost: 4, dmg: [2, 4], acc: 0.95, stat: 'agility', evade: true, mom: 2, info: 'Boxing: duck under, pop a jab. Hard to hit next turn, double momentum.' },
    box_liver:    { icon: 'hammer', name: 'Liver Shot', cost: 12, dmg: [6, 10], acc: 0.84, stat: 'strength', sap: 30, info: 'Boxing: a hook to the body. Drains 30 of their stamina.' },
    box_dempsey:  { icon: 'combat', name: 'Dempsey Roll', cost: 22, dmg: [5, 8], hits: 3, acc: 0.8, stat: 'strength', info: 'Boxing: the figure-eight weave, hooks from both sides. Three hits.' },
  },
  karate: {
    kar_maegeri:  { icon: 'kick', name: 'Mae Geri', cost: 10, dmg: [5, 10], acc: 0.86, stat: 'strength', sap: 10, info: 'Karate: a snapping front kick to the gut.' },
    kar_ageuke:   { icon: 'shield', name: 'Age Uke', cost: 6, dmg: [0, 0], acc: 1, reflect: 0.3, info: 'Karate: a rising block. The next blow that lands is partly turned back on them.' },
    kar_gyaku:    { icon: 'fist', name: 'Gyaku Zuki', cost: 13, dmg: [9, 15], acc: 0.84, stat: 'strength', info: 'Karate: the reverse punch, hips first. Reliable and heavy.' },
    kar_mawashi:  { icon: 'kick', name: 'Mawashi Geri', cost: 17, dmg: [11, 18], acc: 0.74, stat: 'strength', stun: 0.15, info: 'Karate: a roundhouse to the head. May stun.' },
  },
  taekwondo: {
    tkd_push:     { icon: 'kick', name: 'Push Kick', cost: 8, dmg: [4, 8], acc: 0.9, stat: 'agility', sap: 15, info: 'Taekwondo: shove them back with the heel. Drains a little stamina.' },
    tkd_back:     { icon: 'kick', name: 'Back Kick', cost: 14, dmg: [10, 16], acc: 0.72, stat: 'agility', info: 'Taekwondo: turn and drive the heel through. Hard to land, hurts.' },
    tkd_hook:     { icon: 'feather', name: 'Spinning Hook Kick', cost: 16, dmg: [10, 16], acc: 0.74, stat: 'agility', evade: true, info: 'Taekwondo: whip the heel round and keep spinning out of reach.' },
    tkd_double:   { icon: 'star', name: 'Double Roundhouse', cost: 18, dmg: [6, 10], hits: 2, acc: 0.82, stat: 'agility', mom: 2, info: 'Taekwondo: two kicks before the first one lands. Double momentum.' },
  },
  kungfu: {
    kf_tiger:     { icon: 'claw', name: 'Tiger Claw', cost: 10, dmg: [5, 9], acc: 0.86, stat: 'strength', weaken: 2, info: 'Kung Fu: rake and grip. Their blows are weaker for 2 turns.' },
    kf_snake:     { icon: 'feather', name: 'Snake Strike', cost: 7, dmg: [4, 8], acc: 0.96, stat: 'agility', sap: 20, info: 'Kung Fu: fingertips to the throat. Almost never misses, drains stamina.' },
    kf_mantis:    { icon: 'knife', name: 'Mantis Hook', cost: 11, dmg: [6, 10], acc: 0.88, stat: 'agility', evade: true, mom: 2, info: 'Kung Fu: hook the arm, slip past it. Double momentum.' },
    kf_dragon:    { icon: 'water', name: 'Dragon Tail Sweep', cost: 16, dmg: [9, 14], acc: 0.8, stat: 'agility', stun: 0.3, info: 'Kung Fu: a low sweeping kick. Often knocks them off their feet.' },
  },
  judo: {
    jd_ukemi:     { icon: 'shield', name: 'Ukemi', cost: 4, dmg: [0, 0], acc: 1, armor: 2, info: 'Judo: the art of falling. Take less damage for 2 hits.' },
    jd_ogoshi:    { icon: 'gym', name: 'O Goshi', cost: 13, dmg: [8, 13], acc: 0.82, stat: 'strength', stun: 0.2, info: 'Judo: hip throw. May stun.' },
    jd_juji:      { icon: 'metal', name: 'Juji Gatame', cost: 12, dmg: [6, 10], acc: 0.8, stat: 'strength', weaken: 3, sap: 20, info: 'Judo: the arm bar. Weakens them for 3 turns and drains stamina.' },
    jd_seoi:      { icon: 'earth', name: 'Seoi Nage', cost: 18, dmg: [12, 18], acc: 0.78, stat: 'strength', stun: 0.3, info: 'Judo: over the shoulder and into the floor. Often stuns.' },
  },
  muaythai: {
    mt_teep:      { icon: 'kick', name: 'Teep', cost: 7, dmg: [4, 8], acc: 0.9, stat: 'strength', sap: 20, info: 'Muay Thai: the push kick. Drains their stamina.' },
    mt_low:       { icon: 'kick', name: 'Low Kick', cost: 10, dmg: [6, 11], acc: 0.86, stat: 'strength', weaken: 2, info: 'Muay Thai: shin into the thigh. Their blows are weaker for 2 turns.' },
    mt_knee:      { icon: 'gym', name: 'Clinch Knee', cost: 14, dmg: [10, 16], acc: 0.82, stat: 'strength', info: 'Muay Thai: pull their head down, drive the knee up.' },
    mt_spin:      { icon: 'hammer', name: 'Spinning Elbow', cost: 18, dmg: [12, 19], acc: 0.72, stat: 'strength', stun: 0.2, info: 'Muay Thai: a full turn and an elbow. May stun.' },
  },
  wingchun: {
    wc_chain:     { icon: 'fist', name: 'Chain Punch', cost: 12, dmg: [2, 4], hits: 3, acc: 0.95, stat: 'agility', info: 'Wing Chun: a straight-line flurry. Three quick hits.' },
    wc_paksao:    { icon: 'shield', name: 'Pak Sao', cost: 7, dmg: [3, 6], acc: 0.95, stat: 'agility', shatter: true, info: 'Wing Chun: slap their guard aside and hit. Breaks Guard and Iron Skin.' },
    wc_stop:      { icon: 'fist', name: 'Stop Hit', cost: 9, dmg: [6, 10], acc: 0.95, stat: 'strength', mom: 2, info: 'Wing Chun: hit them as they come in. Double momentum.' },
    wc_dummy:     { icon: 'wood', name: 'Wooden Dummy Combo', cost: 20, dmg: [3, 5], hits: 4, acc: 0.88, stat: 'agility', info: 'Wing Chun: a thousand hours on the dummy. Four hits.' },
  },
};
for (const set of Object.values(ART_MOVES)) Object.assign(MOVES, set);

// moves unlocked by your belts, across every art you've trained
export function artMoves(c, NEED) {
  const out = [];
  for (const [art, set] of Object.entries(ART_MOVES)) {
    const xp = c.martial?.[art] || 0; const ids = Object.keys(set);
    UNLOCK_BELTS.forEach((b, i) => { if (xp >= NEED[b]) out.push(ids[i]); });
  }
  return out;
}
export function movesAtBelt(art, beltIdx) { const ids = Object.keys(ART_MOVES[art] || {}); const i = UNLOCK_BELTS.indexOf(beltIdx); return i >= 0 && ids[i] ? [ids[i]] : []; }
