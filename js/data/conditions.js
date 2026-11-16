// Illnesses and mental health conditions. kind: body | mind | qi.
// eff = yearly stat changes while active. dur = years until it passes on its own (null = chronic until treated).
// onset(c) = yearly chance to develop it. cure = chance per treatment by method. Mental health is treated with
// care: therapy and support help, and it's never framed as a character flaw.
const age = (c, a, b) => c.age >= a && c.age <= (b ?? 999);
export const CONDITIONS = [
  // body
  { id: 'flu', name: 'Influenza', kind: 'body', dur: 1, eff: { health: -6, happiness: -5 }, onset: c => 0.05, cure: { doctor: 0.95, qi: 0.9 }, desc: 'Fever and aches. Passes in a year.' },
  { id: 'pneumonia', name: 'Pneumonia', kind: 'body', dur: 2, eff: { health: -14, happiness: -6 }, onset: c => age(c, 60) ? 0.03 : 0.006, cure: { doctor: 0.75, qi: 0.6 }, desc: 'Serious lung infection. Can be deadly for the old.' },
  { id: 'asthma', name: 'Asthma', kind: 'body', dur: null, eff: { health: -2, agility: -1 }, onset: c => age(c, 2, 12) ? 0.008 : 0.001, cure: { doctor: 0.25, qi: 0.4 }, desc: 'Breathing trouble. Manageable.' },
  { id: 'diabetes', name: 'Diabetes', kind: 'body', dur: null, eff: { health: -2 }, onset: c => age(c, 35) ? 0.005 + (c.traits.includes('glutton') ? 0.01 : 0) : 0, cure: { doctor: 0.15, qi: 0.3 }, desc: 'Chronic. Treatment keeps it in check.' },
  { id: 'heart', name: 'Heart Disease', kind: 'body', dur: null, eff: { health: -4 }, onset: c => age(c, 45) ? 0.005 + c.stats.stress / 4000 : 0, cure: { doctor: 0.4, qi: 0.45 }, desc: 'Stress and age weigh on the heart.' },
  { id: 'cancer', name: 'Cancer', kind: 'body', dur: null, eff: { health: -8 }, grows: true, onset: c => age(c, 40) ? 0.004 : 0.0005, cure: { doctor: 0.45, qi: 0.35 }, cost: 40, desc: 'Gets worse every year untreated. Surgery is expensive.' },
  { id: 'migraine', name: 'Chronic Migraines', kind: 'body', dur: null, eff: { happiness: -5, smarts: -1 }, onset: c => age(c, 12) ? 0.006 : 0, cure: { doctor: 0.35, qi: 0.5 }, desc: 'Blinding headaches.' },
  // mind
  { id: 'depression', name: 'Depression', kind: 'mind', dur: null, eff: { happiness: -14 }, onset: c => age(c, 10) ? (c.stats.happiness < 20 ? 0.12 : 0.006) : 0, cure: { therapy: 0.4, qi: 0.25, rest: 0.1 }, desc: 'A heavy fog. Therapy and support help; it is not your fault.' },
  { id: 'anxiety', name: 'Anxiety Disorder', kind: 'mind', dur: null, eff: { stress: 8, happiness: -5 }, onset: c => age(c, 8) ? (c.stats.stress > 70 ? 0.12 : 0.006) : 0, cure: { therapy: 0.45, qi: 0.35, rest: 0.15 }, desc: 'Constant worry. Therapy and meditation help.' },
  { id: 'insomnia', name: 'Insomnia', kind: 'mind', dur: 3, eff: { health: -3, happiness: -6 }, onset: c => c.stats.stress > 55 ? 0.08 : 0.01, cure: { therapy: 0.5, doctor: 0.4, qi: 0.6, rest: 0.25 }, desc: 'Sleepless nights.' },
  { id: 'ptsd', name: 'PTSD', kind: 'mind', dur: null, eff: { happiness: -10, stress: 6 }, onset: () => 0, cure: { therapy: 0.35, qi: 0.2 }, desc: 'Triggered by trauma: near-death, losing family, brutal fights.' },
  { id: 'burnout', name: 'Burnout', kind: 'mind', dur: 2, eff: { happiness: -10 }, onset: c => c.job && c.stats.stress > 70 ? 0.2 : 0, cure: { therapy: 0.5, rest: 0.4, qi: 0.4 }, desc: 'Running on empty. Rest, a vacation or therapy help.' },
  { id: 'blindness', name: 'Blindness', kind: 'body', dur: null, eff: { happiness: -3 }, qiMult: 1.3, attune: true, onset: () => 0, cure: { qi: 0.1 }, desc: 'You cannot see — but you feel Qi more keenly than ever (+30% Qi). Bionic eyes can restore some sight.' },
  // qi
  { id: 'qi_deviation', name: 'Qi Deviation Sickness', kind: 'qi', dur: 3, eff: { health: -8 }, qiMult: 0.7, onset: () => 0, cure: { qi: 0.55, doctor: 0 }, desc: 'Qi running backwards through your meridians. Mortal doctors are useless.' },
  { id: 'corruption', name: 'Demonic Qi Corruption', kind: 'qi', dur: null, eff: { happiness: -8, health: -4 }, qiMult: 1.1, onset: c => c.qi.manuals.includes('blood_art') ? 0.08 : 0, cure: { qi: 0.3, doctor: 0 }, desc: 'Demonic Qi gnaws at your mind. Purification is needed.' },
  { id: 'meridian_block', name: 'Blocked Meridians', kind: 'qi', dur: null, eff: {}, qiMult: 0.5, onset: () => 0, cure: { qi: 0.5, doctor: 0 }, desc: 'Qi gain halved until cleared.' },
  // genetic — carried in your genes (and passed to children). They can show at birth or appear later in life.
  { id: 'congenital_heart', name: 'Congenital Heart Defect', kind: 'body', genetic: [0, 0], dur: null, eff: { health: -4 }, sudden: 0.02, onset: () => 0, cure: { doctor: 0.5, qi: 0.4 }, cost: 30, desc: 'Born with it. Raises the risk of sudden death until surgery fixes it.' },
  { id: 'cystic_fibrosis', name: 'Cystic Fibrosis', kind: 'body', genetic: [0, 4], dur: null, eff: { health: -5, agility: -1 }, onset: () => 0, cure: { doctor: 0.1, qi: 0.3 }, desc: 'Genetic lung condition. Treatment manages it; Qi medicine may do more.' },
  { id: 'hemophilia', name: 'Hemophilia', kind: 'body', genetic: [0, 2], dur: null, eff: { health: -2 }, bleed: 1.4, onset: () => 0, cure: { doctor: 0.15, qi: 0.35 }, desc: 'Your blood does not clot. Fights hurt you 40% more.' },
  { id: 'sickle_cell', name: 'Sickle Cell Disease', kind: 'body', genetic: [0, 10], dur: null, eff: { health: -4, happiness: -2 }, onset: () => 0, cure: { doctor: 0.15, qi: 0.3 }, desc: 'Genetic blood disorder with painful crises.' },
  { id: 'muscular_dystrophy', name: 'Muscular Dystrophy', kind: 'body', genetic: [3, 14], dur: null, eff: { strength: -3, agility: -3 }, grows: true, onset: () => 0, cure: { qi: 0.2 }, desc: 'Muscles weaken over time. Mortal medicine cannot stop it.' },
  { id: 'huntingtons', name: "Huntington's Disease", kind: 'body', genetic: [30, 50], dur: null, eff: { health: -5, smarts: -3 }, grows: true, onset: () => 0, cure: { qi: 0.15 }, desc: 'A hidden inheritance that wakes in middle age.' },
  { id: 'alzheimers', name: "Early-Onset Alzheimer's", kind: 'mind', genetic: [45, 65], dur: null, eff: { smarts: -5, happiness: -4 }, grows: true, onset: () => 0, cure: { qi: 0.2 }, desc: 'Memories fading like old ink.' },
  { id: 'schizophrenia', name: 'Schizophrenia', kind: 'mind', genetic: [17, 30], dur: null, eff: { happiness: -6, stress: 6 }, qiMult: 1.35, attune: true, onset: () => 0, cure: { therapy: 0.25, doctor: 0.3, qi: 0.15 }, desc: 'Hearing and seeing what others cannot. Treatment and support help a lot. Cultivators say such minds sense Qi others miss (+35% Qi).' },
  { id: 'bipolar', name: 'Bipolar Disorder', kind: 'mind', genetic: [15, 30], dur: null, eff: { happiness: -6, stress: 4 }, onset: () => 0, cure: { therapy: 0.35, doctor: 0.3, qi: 0.25 }, desc: 'Mood swings between highs and lows. Treatment and support make a real difference.' },
];
export const GENETIC = CONDITIONS.filter(x => x.genetic);
export const COND_BY_ID = Object.fromEntries(CONDITIONS.map(x => [x.id, x]));
// Qi medicines (crafted or bought): cure chance per kind.
export const QI_MEDS = { mending_salve: { body: 0.7, qi: 0.5 }, heart_pill: { mind: 0.7 }, purity_pill: { qi: 0.85, mind: 0.3 } };

// v0.9.5 hover text: exactly what a condition does to you right now
const STAT_LBL = { health: 'Health', happiness: 'Happiness', stress: 'Stress', smarts: 'Smarts', looks: 'Looks', strength: 'Strength', agility: 'Agility', charisma: 'Charisma', luck: 'Luck', battle: 'Battle' };
const CURE_LBL = { doctor: 'Doctor', therapy: 'Therapy', qi: 'Qi healing / medicine', rest: 'Rest' };
const KIND_LBL = { body: 'Body condition', mind: 'Mental health', qi: 'Qi affliction' };
export function condTip(x) {
  const C = COND_BY_ID[x.id]; if (!C) return {};
  const sev = x.sev || 1, L = [C.desc];
  const eff = Object.entries(C.eff || {}).map(([k, v]) => { const n = Math.round(v * sev); return `${n > 0 ? '+' : '−'}${Math.abs(n)} ${STAT_LBL[k] || k}`; });
  if (eff.length) L.push(`• Every year: ${eff.join(', ')}`);
  if (C.qiMult && C.qiMult !== 1) L.push(`• Qi gain ${C.qiMult > 1 ? '+' : '−'}${Math.round(Math.abs(C.qiMult - 1) * 100)}%`);
  if (C.bleed) L.push(`• You take ${Math.round((C.bleed - 1) * 100)}% more damage in fights`);
  if (C.sudden) L.push(`• Raises your risk of sudden death (+${Math.round(C.sudden * 100)}% a year)`);
  if (C.grows) L.push(`• Gets worse every year it goes untreated (severity ${sev.toFixed(1)} / 3) and raises your risk of death`);
  if (x.id === 'heart') L.push('• Raises your risk of sudden death');
  L.push(C.dur ? `• Passes on its own in ${Math.max(1, C.dur - (x.years || 0))} year(s)` : '• Chronic: stays until it is treated');
  const cures = Object.entries(C.cure || {}).filter(([, p]) => p > 0).map(([k, p]) => `${CURE_LBL[k] || k} ${Math.round(p * 100)}%`);
  L.push(cures.length ? `• Cure chance: ${cures.join(' · ')}` : '• No known cure');
  if (C.cure && C.cure.doctor === 0) L.push('• Mortal doctors can\'t help with this');
  return { 'data-tip-title': C.name, 'data-tip-sub': KIND_LBL[C.kind] + (sev > 1 ? ` · severity ${sev.toFixed(1)}` : ''), 'data-tip': L.join('\n'), 'data-tip-color': 'var(--bad)', tabindex: 0 };
}
