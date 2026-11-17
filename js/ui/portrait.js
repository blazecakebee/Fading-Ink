// Procedural 32x32 anime-style pixel portraits. Original art generated from "genes".
// Portraits change with age stage, salon hair changes, and cultivation realm (eye glow, aura, forehead mark).
import { seeded, ri, chance, pick, clamp } from '../core/rng.js';
import { REALMS } from '../data/realms.js';
const GENETIC_IDS = ['congenital_heart', 'cystic_fibrosis', 'hemophilia', 'sickle_cell', 'muscular_dystrophy', 'huntingtons', 'alzheimers', 'bipolar', 'schizophrenia'];

export const SKINS = ['#ffe6d8', '#fcd7bd', '#f3c79a', '#e0ac74', '#c68a52', '#94603a', '#6a4129'];
export const HAIR_COLORS = {
  black: '#22202c', darkbrown: '#3e2b22', brown: '#6e4730', auburn: '#8c3a26', blonde: '#e8c36c', platinum: '#efe4c8',
  // salon / fantasy colors
  pink: '#ff92bd', blue: '#5b86ff', silver: '#c9cfdc', red: '#d83a3f', purple: '#8e5fd8', green: '#4db37d', white: '#f4f2ee', teal: '#3fc1c1', orange: '#ff9b42',
};
export const NATURAL_HAIR = ['black', 'darkbrown', 'brown', 'auburn', 'blonde', 'platinum'];
export const EYE_COLORS = ['#6b3a1e', '#3a2418', '#8d6a2c', '#3f9a5a', '#3f7fd6', '#7f92a8', '#d69a2a', '#9a5ad6', '#d63a3a'];
export const HAIR_STYLES = {
  F: ['long', 'twintails', 'bob', 'ponytail', 'hime', 'buns', 'wavy', 'pixie', 'sidebraid', 'curly', 'lowbun', 'hairband', 'shag', 'odango', 'longbangs', 'sidetail', 'afro', 'drills', 'braids', 'halfup', 'highpony', 'fringebob',
    'longlayers', 'crownbraid', 'lowpigtails', 'messybun', 'straightcut', 'sweptlong', 'ringlets', 'ribbonpony', 'pixiecurl', 'shoulderwaves'], // v0.9.26
  M: ['short', 'spiky', 'messy', 'sidepart', 'longtied', 'buzz', 'swept', 'mohawk', 'undercut', 'manbun', 'curtains', 'wolfcut', 'topknot', 'ahoge', 'slickback', 'dreads', 'quiff', 'pompadour', 'fauxhawk', 'bowl', 'crewcut', 'longsweep',
    'chonmage', 'shaggy', 'shortafro', 'cornrows', 'tallspikes', 'emo', 'warriortail', 'fade', 'flattop', 'mullet'], // v0.9.26
};
// v0.6.3 styles reuse an older style's shape (back hair, side locks) plus their own fringe and details
const HAIR_BASE = { pixie: 'short', sidebraid: 'long', curly: 'wavy', lowbun: 'bob', hairband: 'long', shag: 'bob', odango: 'buns', longbangs: 'hime', sidetail: 'ponytail', afro: 'short',
  mohawk: 'buzz', undercut: 'sidepart', manbun: 'short', curtains: 'short', wolfcut: 'bob', topknot: 'buzz', ahoge: 'messy', slickback: 'short', dreads: 'long', quiff: 'short',
  drills: 'twintails', braids: 'twintails', halfup: 'long', highpony: 'ponytail', fringebob: 'bob', pompadour: 'short', fauxhawk: 'spiky', bowl: 'bob', crewcut: 'buzz', longsweep: 'long',
  longlayers: 'long', crownbraid: 'bob', lowpigtails: 'bob', messybun: 'bob', straightcut: 'hime', sweptlong: 'long', ringlets: 'wavy', ribbonpony: 'ponytail', pixiecurl: 'short', shoulderwaves: 'bob',
  chonmage: 'buzz', shaggy: 'bob', shortafro: 'short', cornrows: 'buzz', tallspikes: 'spiky', emo: 'short', warriortail: 'ponytail', fade: 'buzz', flattop: 'buzz', mullet: 'short' };
const BANGS2 = { pixie: [-1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, 0, -1, -1], curtains: [1, 1, 0, -1, -2, -3, -3, -3, -3, -2, -1, 0, 1, 1], slickback: Array(14).fill(-4),
  quiff: [-1, -2, -3, -3, -2, -2, -1, -1, -1, -1, -1, -1, -1, -1], shag: [1, 0, 1, -1, 1, 0, 1, 0, -1, 1, 0, 1, 0, 1], longbangs: Array(14).fill(2), wolfcut: [1, 0, -1, 1, 0, -1, 0, 1, -1, 0, 1, -1, 0, 1], fringebob: Array(14).fill(1), bowl: Array(14).fill(1), pompadour: Array(14).fill(-3), longsweep: [2, 2, 1, 1, 0, 0, -1, -1, -2, -2, -2, -2, -1, 0],
  longlayers: [1, 0, 1, 2, 1, 0, -1, -1, 0, 1, 2, 1, 0, 1], straightcut: Array(14).fill(0), sweptlong: [-1, -1, 0, 0, 1, 1, 2, 2, 2, 2, 1, 1, 2, 2], pixiecurl: [-1, -2, -1, -2, -1, -2, -1, -2, -1, -2, -1, -2, -1, -1],
  shoulderwaves: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1], messybun: [0, 1, -1, 0, 1, -1, 0, 0, 1, -1, 0, 1, -1, 0], lowpigtails: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  shaggy: [2, 1, 2, 0, 1, 2, 1, 0, 2, 1, 0, 2, 1, 2], emo: [3, 3, 3, 3, 2, 2, 1, 0, -1, -1, -1, -2, -1, -1], mullet: [-1, -1, -1, -2, -2, -1, -1, -1, -2, -2, -1, -1, -1, -1], shortafro: Array(14).fill(-2) };
export const FACE_BROWS = ['none', 'soft', 'arched', 'fierce', 'worried', 'thick', 'high', 'short'];
export const FACE_MOUTHS = ['default', 'smile', 'smirk', 'open', 'flat', 'pout', 'grin', 'fang'];
export const FACE_EYES = ['default', 'sleepy', 'sharp', 'wide', 'happy', 'starry'];
export const FACE_MARKS = ['none', 'beauty mark', 'scar', 'freckles', 'cheek scar', 'forehead dot', 'blush', 'tear mark'];
// v0.9.26 body types
export const BUILDS = ['lean', 'average', 'chubby'];
export const BUILD_NAME = { lean: 'Lean', average: 'Average', chubby: 'Chubby' };
export const rollBuild = () => { const r = Math.random(); return r < 0.3 ? 'lean' : r < 0.75 ? 'average' : 'chubby'; };
const CLOTHES = ['#3b4a7a', '#7a2f3b', '#2f6b55', '#5a3b7a', '#d9d4c7', '#2b2b33', '#b8743a', '#4a7aa8', '#c85a8a', '#6a6a72'];

export function randomGenes(gender) {
  return {
    seed: ri(1, 1e9), skin: ri(0, SKINS.length - 1), hairColor: pick(NATURAL_HAIR),
    eye: chance(0.03) ? ri(7, 8) : ri(0, 6), style: pick(HAIR_STYLES[gender]), looks: clamp(Math.round(30 + Math.random() * 45 + (chance(0.1) ? 25 : 0))), brow: chance(0.5) ? ri(1, 7) : 0, mouth: chance(0.4) ? ri(1, 7) : 0, eyes: chance(0.3) ? ri(1, 5) : 0, mark: chance(0.15) ? (gender === 'M' ? pick([1, 2, 3, 4, 5, 7]) : ri(1, 7)) : 0,
    freckles: chance(0.15), glasses: chance(0.1), mole: chance(0.12), build: rollBuild(),
    carriers: GENETIC_IDS.filter(() => chance(0.03)), // hidden genetic conditions
  };
}
// Child genes: each feature from one parent, skin blends, small mutation chance, looks averaged with RNG.
export function mixGenes(a, b, gender) {
  const from = () => (chance(0.5) ? a : b);
  const g = {
    seed: ri(1, 1e9), skin: clamp(Math.round((a.skin + b.skin) / 2 + (chance(0.5) ? 0.4 : -0.4)), 0, SKINS.length - 1),
    hairColor: chance(0.05) ? pick(NATURAL_HAIR) : from().hairColor, eye: chance(0.04) ? ri(0, 8) : from().eye,
    style: pick(HAIR_STYLES[gender]), looks: clamp(Math.round((a.looks + b.looks) / 2 + ri(-18, 18))), brow: pick([a.brow, b.brow]) || 0, mouth: pick([a.mouth, b.mouth]) || 0, eyes: pick([a.eyes, b.eyes]) || 0, mark: chance(0.1) ? (gender === 'M' ? pick([1, 2, 3, 4, 5, 7]) : ri(1, 7)) : 0, build: chance(0.2) ? rollBuild() : (from().build || rollBuild()),
    freckles: from().freckles, glasses: chance(0.1), mole: chance(0.1),
    // each carried gene passes to a child half the time; rare fresh mutations
    carriers: [...new Set([...(a.carriers || []), ...(b.carriers || [])])].filter(() => chance(0.5)).concat(GENETIC_IDS.filter(() => chance(0.01))),
  };
  if (!NATURAL_HAIR.includes(g.hairColor)) g.hairColor = pick(NATURAL_HAIR);
  return g;
}

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
  return '#' + [r, g, b].map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
}
function ageStage(age) { return age < 3 ? 'infant' : age < 13 ? 'child' : age < 18 ? 'teen' : age < 35 ? 'adult' : age < 58 ? 'middle' : 'elder'; }

// Build a 32x32 grid of colors
export function buildPortrait(genes, { age = 20, gender = 'F', realm = 0, hair = null, elemColor = null, headOnly = false, raw = false, build = null, muscle = 0, blink = false }) {
  const R = seeded(genes.seed); const W = 32, H = 32;
  const g = Array.from({ length: H }, () => Array(W).fill(null));
  const set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H && c) g[y][x] = c; };
  // cultivators age slowly
  const visAge = realm >= 3 ? Math.min(age, 28 + age * 0.08) : realm >= 1 ? Math.min(age, 18 + (age - 18) * 0.7) : age;
  const st = ageStage(age < 18 ? age : visAge);
  // rounder, softer faces: smaller chin taper, slightly wider heads
  const P = { infant: { cy: 17, rx: 8, ry: 7.6, chin: 0.1 }, child: { cy: 15, rx: 7.8, ry: 8, chin: 0.22 }, teen: { cy: 14.5, rx: 7.6, ry: 8.3, chin: 0.34 },
    adult: { cy: 14.5, rx: 7.6, ry: 8.5, chin: gender === 'F' ? 0.36 : 0.3 }, middle: { cy: 14.5, rx: 7.7, ry: 8.5, chin: 0.28 }, elder: { cy: 14.8, rx: 7.7, ry: 8.3, chin: 0.26 } }[st];
  // v0.9.26 body type: chubby faces are rounder, lean ones narrower; children keep their baby faces
  const bt = build || genes.build || 'average', grown = st !== 'infant' && st !== 'child';
  const cx = 16, { cy, ry } = P, rx = P.rx + (grown ? (bt === 'chubby' ? 0.5 : bt === 'lean' ? -0.3 : 0) : 0), chin = P.chin * (grown && bt === 'chubby' ? 0.55 : 1) + (grown && bt === 'lean' ? 0.06 : 0);
  const skin = SKINS[genes.skin], skinS = shade(skin, -0.14), skinD = shade(skin, -0.3);
  let hc = HAIR_COLORS[hair?.color || genes.hairColor] || HAIR_COLORS.black;
  if (st === 'elder') hc = genes.hairColor === 'platinum' ? '#f4f2ee' : '#cfcfd6';
  const hcD = shade(hc, -0.28), hcL = shade(hc, 0.32);
  const style0 = hair?.style || genes.style; const style = HAIR_BASE[style0] || style0;
  const brow = hair?.brow ?? genes.brow ?? 0, mouth = hair?.mouth ?? genes.mouth ?? 0, eyes = hair?.eyes ?? genes.eyes ?? 0, mark0 = hair?.mark ?? genes.mark ?? 0;
  // v0.9.40 males only show blush if they picked it themselves in the mirror, never from birth genes
  const mark = mark0 === 6 && gender === 'M' && hair?.mark !== 6 ? 0 : mark0;
  const eyeC = hair?.redEyes ? '#ff2a3a' : hair?.goldEyes ? '#ffd36f' : EYE_COLORS[genes.eye] || EYE_COLORS[0]; // v0.8.7 life can change your eyes
  const cloth = CLOTHES[Math.floor(R() * CLOTHES.length)], clothD = shade(cloth, -0.3);
  const accent = ['#ff6b8a', '#ffd166', '#6be0ff', '#ffffff', '#c7a6ff'][Math.floor(R() * 5)];
  const top = Math.round(cy - ry), eyeY = Math.round(cy + ry * 0.08), bottomHead = Math.round(cy + ry);

  const inHead = (x, y) => {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
    if (dy <= 0.15) return dx * dx + dy * dy <= 1;
    const w = Math.sqrt(Math.max(0, 1 - dy * dy)) * (1 - chin * Math.max(0, dy - 0.15) * 1.1);
    return Math.abs(dx) <= w && dy <= 1;
  };
  const inEllipse = (x, y, ex, ey, erx, ery) => ((x + 0.5 - ex) / erx) ** 2 + ((y + 0.5 - ey) / ery) ** 2 <= 1;
  const long = ['long', 'hime', 'wavy', 'longtied'].includes(style);

  // 1. back hair (behind everything)
  if (st !== 'infant') {
    if (long && style !== 'longtied') {
      const len = style === 'hime' ? 30 : st === 'child' ? 25 : 29;
      for (let y = cy - 2; y <= len; y++) for (let x = cx - rx - 2; x <= cx + rx + 1; x++) {
        const wav = style === 'wavy' ? Math.round(Math.sin(y * 0.9) * 0.8) : 0;
        if (x + wav >= Math.round(cx - rx - 1.5) && x + wav <= Math.round(cx + rx + 0.5)) set(x, y, (x % 4 === 1 && y > cy + 3) ? hcD : hc);
      }
    }
    if (style === 'twintails') for (const s of [-1, 1]) for (let y = cy - 4; y <= cy + 12; y++) for (let x = 0; x < W; x++)
      if (inEllipse(x, y, cx + s * (rx + 3), cy + 3, 2.6, 8.5 - Math.abs(y - cy - 3) * 0.05)) set(x, y, x % 3 === 0 ? hcD : hc);
    if (style === 'ponytail') for (let y = cy - 6; y <= cy + 9; y++) for (let x = 0; x < W; x++) if (inEllipse(x, y, cx + rx + 1.5, cy + 1, 2.4, 8)) set(x, y, hc);
    if (style === 'buns') for (const s of [-1, 1]) for (let y = 0; y < 12; y++) for (let x = 0; x < W; x++) if (inEllipse(x, y, cx + s * 5.5, top + 0.5, 2.8, 2.8)) set(x, y, hc);
    if (style === 'longtied') for (let y = cy; y <= 28; y++) for (let x = cx - 2; x <= cx + 1; x++) set(x, y, hc);
  }

  // 2. body + neck
  const bodyTop = st === 'infant' ? 26 : st === 'child' ? 26 : 25;
  for (let y = bottomHead - 1; y < bodyTop + 1; y++) for (let x = cx - 2; x <= cx + 1; x++) set(x, y, y <= bottomHead ? skinD : skinS);
  if (!headOnly) for (let y = bodyTop; y < H; y++) {
    const wide = grown ? (bt === 'chubby' ? 1 : bt === 'lean' ? -1 : 0) + (muscle >= 80 ? 2 : muscle >= 55 ? 1 : 0) : 0; // big muscles = broad shoulders
    const half = Math.min((st === 'infant' ? 7 : st === 'child' ? 9 : gender === 'M' ? 13 : 11) + wide, 15, 4 + (y - bodyTop) * (2.2 + Math.max(0, wide) * 0.3));
    for (let x = Math.round(cx - half); x < Math.round(cx + half); x++) set(x, y, (x === Math.round(cx - half) || x === Math.round(cx + half) - 1) ? clothD : cloth);
  }
  // collar / ribbon
  if (st !== 'infant' && !headOnly) {
    set(cx - 1, bodyTop, skinS); set(cx, bodyTop, skinS); set(cx - 1, bodyTop + 1, skinS); set(cx, bodyTop + 1, skin);
    if (gender === 'F') { set(cx - 2, bodyTop + 2, accent); set(cx - 1, bodyTop + 2, shade(accent, -0.2)); set(cx, bodyTop + 2, shade(accent, -0.2)); set(cx + 1, bodyTop + 2, accent); set(cx - 1, bodyTop + 3, accent); set(cx, bodyTop + 3, accent); }
    else { set(cx - 3, bodyTop, '#f2f2f2'); set(cx + 2, bodyTop, '#f2f2f2'); set(cx - 2, bodyTop + 1, '#f2f2f2'); set(cx + 1, bodyTop + 1, '#f2f2f2'); }
  }

  // 3. head
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inHead(x, y)) set(x, y, skin);
  // soft jaw shading, mirrored on both sides so the face stays symmetrical
  const jaw = shade(skin, -0.07);
  for (let y = eyeY + 3; y <= bottomHead; y++) for (let x = 0; x < W; x++) if (inHead(x, y) && (!inHead(x + 1, y) || !inHead(x - 1, y))) set(x, y, jaw);
  // ears
  if (!long || style === 'longtied') { set(Math.round(cx - rx) - 1, eyeY + 1, skinS); set(Math.round(cx + rx), eyeY + 1, skinS); }

  // 4. face — big anime eyes (4px wide). Girls/children: 4 rows tall with flicked lashes; boys: 3 rows, sharper.
  const big = st === 'infant' || st === 'child' || gender === 'F';
  const eyeL = cx - 6, eyeR = cx + 2; // left x of each 4px eye
  const lash = '#1d1424', glow = realm >= 1 ? (elemColor || REALMS[realm].color) : null;
  for (const [ex, side] of [[eyeL, -1], [eyeR, 1]]) {
    const iris = glow && realm >= 3 ? shade(glow, -0.2) : eyeC, irisL = glow ? shade(glow, 0.2) : shade(eyeC, 0.4), irisD = shade(iris, -0.45);
    const outer = side < 0 ? ex - 1 : ex + 4, inner = side < 0 ? ex + 3 : ex;
    // brows (hidden under fringe for most styles, visible on short hair)
    if (st !== 'infant') { const by = eyeY - 3; for (let i = 0; i < 3; i++) set(side < 0 ? ex + i : ex + 1 + i, by, hcD); }
    // lash line
    for (let i = 0; i < 4; i++) set(ex + i, eyeY - 1, lash);
    if (big) { set(outer, eyeY - 1, lash); set(outer, eyeY - 2, lash); } else { set(outer, eyeY, lash); set(inner, eyeY - 2, shade(hc, -0.3)); }
    if (st === 'elder') { for (let i = 0; i < 4; i++) set(ex + i, eyeY, i === 1 || i === 2 ? irisD : lash); set(outer, eyeY + 1, skinD); continue; }
    // iris rows
    set(ex, eyeY, irisD); set(ex + 1, eyeY, irisD); set(ex + 2, eyeY, irisD); set(ex + 3, eyeY, irisD);
    set(ex, eyeY + 1, iris); set(ex + 1, eyeY + 1, '#ffffff'); set(ex + 2, eyeY + 1, lash); set(ex + 3, eyeY + 1, iris);
    if (big) {
      set(ex, eyeY + 2, iris); set(ex + 1, eyeY + 2, irisL); set(ex + 2, eyeY + 2, irisL); set(ex + 3, eyeY + 2, iris);
      set(ex + 1, eyeY + 3, irisL); set(ex + 2, eyeY + 3, shade(irisL, 0.3)); set(side < 0 ? ex : ex + 3, eyeY + 3, skinS);
      if (genes.looks > 55) set(ex + 2, eyeY + 2, '#ffffff');
    } else {
      set(ex, eyeY + 2, skinS); set(ex + 1, eyeY + 2, irisL); set(ex + 2, eyeY + 2, irisL); set(ex + 3, eyeY + 2, skinS);
    }
  }
  // nose, mouth, blush
  const ny = eyeY + (big ? 4 : 3); set(cx - 1, ny, shade(skin, -0.08)); set(cx, ny, shade(skin, -0.08)); // centred 2px nose
  const my = Math.min(bottomHead - 2, eyeY + (st === 'infant' ? 5 : 6));
  if (gender === 'F' || st === 'infant' || st === 'child') { set(cx - 1, my, '#c25a68'); set(cx, my, '#d97a86'); }
  else { set(cx - 1, my, shade(skin, -0.42)); set(cx, my, shade(skin, -0.42)); }
  if (gender === 'F' || st === 'infant' || st === 'child') for (const bx of [eyeL - 1, eyeL, eyeR + 3, eyeR + 4]) set(bx, eyeY + 4, shade('#ff8fa3', genes.skin > 3 ? -0.2 : 0.1));
  if (st !== 'infant') {
    const by = eyeY - 2, browC = shade(hc, -0.15);
    const browPx = { 1: [[0, 0], [1, 0], [2, 0]], 2: [[0, 1], [1, 0], [2, 0], [3, 1]], 3: [[0, -1], [1, 0], [2, 0], [3, 1]], 4: [[0, 1], [1, 0], [2, 0], [3, -1]], 5: [[0, 0], [1, 0], [2, 0], [3, 0], [1, -1], [2, -1]], 6: [[1, -1], [2, -1]], 7: [[1, 0], [2, 0]] }[brow];
    if (browPx) for (const [ex, side] of [[eyeL, -1], [eyeR, 1]]) for (const [dx, dy] of browPx) set(side < 0 ? ex + dx : ex + 3 - dx, by + dy, browC);
    const lip = gender === 'F' || st === 'child' ? '#c25a68' : shade(skin, -0.42);
    if (mouth === 1) { set(cx - 2, my - 1, lip); set(cx + 1, my - 1, lip); }
    if (mouth === 2) { set(cx + 1, my - 1, lip); set(cx - 1, my, shade(skin, -0.1)); }
    if (mouth === 3) { set(cx - 1, my + 1, '#7a2a3a'); set(cx, my + 1, '#7a2a3a'); }
    if (mouth === 4) { set(cx - 2, my, lip); set(cx + 1, my, lip); }
    if (mouth === 5) { set(cx - 1, my + 1, shade(lip, 0.15)); set(cx, my + 1, shade(lip, 0.15)); }
    if (mouth === 6) { set(cx - 2, my - 1, lip); set(cx + 1, my - 1, lip); set(cx - 1, my, '#ffffff'); set(cx, my, '#ffffff'); }
    if (mouth === 7) { set(cx + 1, my + 1, '#ffffff'); }
    // eye shapes
    for (const ex of [eyeL, eyeR]) {
      if (eyes === 1) for (let x = ex; x < ex + 4; x++) set(x, eyeY - 1, skinS);
      if (eyes === 2) { set(ex, eyeY + (big ? 2 : 1), skin); set(ex + 3, eyeY + (big ? 2 : 1), skin); }
      if (eyes === 3) set(ex + 1, eyeY, '#ffffff');
      if (eyes === 4) { for (let y = eyeY - 1; y <= eyeY + 2; y++) for (let x = ex; x < ex + 4; x++) set(x, y, skin); set(ex, eyeY + 1, lash); set(ex + 1, eyeY, lash); set(ex + 2, eyeY, lash); set(ex + 3, eyeY + 1, lash); }
      if (eyes === 5) { set(ex + 1, eyeY, '#ffffff'); set(ex + 2, eyeY + 1, '#fff6a0'); }
    }
    // face marks
    if (mark === 1) set(eyeR + 3, eyeY + 4, skinD);
    if (mark === 2) for (let i = 0; i < 4; i++) set(eyeL + i, eyeY - 2 + i, '#b06a6a');
    if (mark === 3) for (const [fx, fy] of [[eyeL, eyeY + 4], [eyeL + 2, eyeY + 5], [eyeR + 1, eyeY + 4], [eyeR + 3, eyeY + 5], [cx - 1, eyeY + 4]]) set(fx, fy, skinD);
    if (mark === 4) { set(eyeR + 1, eyeY + 4, '#b06a6a'); set(eyeR + 2, eyeY + 5, '#b06a6a'); set(eyeR + 3, eyeY + 4, '#b06a6a'); }
    if (mark === 5) set(cx, top + 4, '#d83a3f');
    if (mark === 6) for (const bx of [eyeL - 1, eyeL, eyeR + 3, eyeR + 4]) set(bx, eyeY + 4, '#ff8fa3');
    if (mark === 7) set(eyeL + 1, eyeY + 4, '#7fb0ff');
  }
  if (genes.freckles && st !== 'infant') for (const [fx, fy] of [[eyeL + 1, eyeY + 4], [eyeL + 3, eyeY + 5], [eyeR, eyeY + 5], [eyeR + 2, eyeY + 4]]) set(fx, fy, skinD);
  if (genes.mole) set(eyeR + 3, my, skinD);
  if (genes.looks < 20 && st !== 'infant') set(eyeL + 1, eyeY + 4, skinD);
  if (st === 'middle' || st === 'elder') { set(eyeL - 1, eyeY + 2, skinS); set(eyeR + 4, eyeY + 2, skinS); }
  if (st === 'elder') { set(cx - 3, my - 1, skinS); set(cx + 2, my - 1, skinS); }

  // v0.9.29 blink frame: lids closed, a soft lash curve
  if (blink) for (const [ex, side] of [[eyeL, -1], [eyeR, 1]]) {
    for (let y = eyeY - 1; y <= eyeY + 3; y++) for (let x = ex; x < ex + 4; x++) if (inHead(x, y)) set(x, y, y === eyeY - 1 ? skinS : skin);
    for (let i = 0; i < 4; i++) set(ex + i, eyeY + (i === 0 || i === 3 ? 1 : 2), '#1d1424');
    if (big) set(side < 0 ? ex - 1 : ex + 4, eyeY + 1, '#1d1424');
  }
  // 5. front hair: crown, fringe, side locks
  if (st === 'infant') {
    for (let x = cx - 2; x <= cx + 1; x++) set(x, top, hc); set(cx, top - 1, hc); set(cx + 1, top - 2, hc);
  } else {
    const crownRy = style === 'buzz' ? ry : ry + 1.2, crownRx = style === 'buzz' ? rx + 0.3 : rx + 1;
    const fringeBottom = style === 'buzz' ? top + 2 : eyeY - 3;
    // bang length per column (relative to fringeBottom)
    const bangs = {
      long: [0, 1, 0, -1, 0, 1, 1, 0, -1, 0, 1, 0, 0, 1], hime: [2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2], bob: [1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 1],
      twintails: [0, 0, -1, 0, 1, 0, -1, -1, 0, 1, 0, -1, 0, 0], ponytail: [-1, 0, 1, 0, -1, -2, -2, -1, 0, 1, 0, -1, 0, 0], buns: [0, -1, 0, 1, 0, -1, -1, 0, 1, 0, -1, 0, 0, 0],
      wavy: [1, 0, 1, 0, -1, 0, 1, 1, 0, -1, 0, 1, 0, 1], short: [-1, -1, 0, -1, -2, -1, 0, -1, -2, -1, -1, 0, -1, -1], spiky: [0, -2, 1, -1, 0, -2, 1, -2, 0, 1, -1, 0, -2, 0],
      messy: [0, 1, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 0, 0], sidepart: [1, 1, 1, 0, 0, -1, -2, -2, -2, -2, -2, -2, -1, -1], longtied: [0, 0, -1, -1, 0, -1, -2, -2, -1, 0, -1, -1, 0, 0],
      buzz: Array(14).fill(0), swept: [1, 1, 1, 1, 0, 0, -1, -1, -2, -2, -2, -3, -2, -1],
    }[style] || Array(14).fill(0);
    if (BANGS2[style0]) bangs.splice(0, 14, ...BANGS2[style0]);
    for (let y = 0; y <= fringeBottom + 2; y++) for (let x = 0; x < W; x++) {
      const col = x - Math.round(cx - rx);
      const crown = inEllipse(x, y, cx, cy - 0.6, crownRx, crownRy) && y < cy - 1;
      const limit = fringeBottom + (bangs[clamp(col, 0, 13)] || 0);
      if ((crown && y <= limit) || (inHead(x, y) && y <= limit)) set(x, y, hc);
    }
    if (style === 'spiky') for (let i = 0; i < 6; i++) { const sx = cx - 5 + i * 2; set(sx, top - 2, hc); set(sx, top - 1, hc); set(sx + 1, top - 3 + (i % 2), hc); }
    if (style === 'messy') { set(cx - 2, top - 2, hc); set(cx + 3, top - 2, hc); set(cx + 4, top - 1, hc); }
    // details for the newer styles
    switch (style0) {
      case 'afro': for (let y = 0; y < eyeY; y++) for (let x = 0; x < W; x++) if (inEllipse(x, y, cx, top + 3, rx + 3, 6) && !g[y][x]) set(x, y, hc); break;
      case 'mohawk': for (let y = top - 4; y < top + 3; y++) { set(cx - 1, y, hc); set(cx, y, hc); } break;
      case 'manbun': case 'topknot': for (let y = 0; y < 8; y++) for (let x = 0; x < W; x++) if (inEllipse(x, y, cx, top - 1.5, 2.6, 2.2)) set(x, y, hcD); break;
      case 'ahoge': set(cx, top - 1, hc); set(cx + 1, top - 2, hc); set(cx + 2, top - 3, hc); set(cx + 1, top - 4, hc); break;
      case 'hairband': for (let x = cx - Math.round(rx); x <= cx + Math.round(rx); x++) if (g[top + 2]?.[x] === hc || g[top + 2]?.[x] === hcL) set(x, top + 2, accent); break;
      case 'sidebraid': for (let y = eyeY + 2; y <= Math.min(30, eyeY + 14); y++) { set(Math.round(cx - rx) - 1, y, y % 2 ? hc : hcD); set(Math.round(cx - rx), y, y % 2 ? hcD : hc); } break;
      case 'sidetail': for (let y = cy - 4; y <= cy + 8; y++) for (let x = 0; x < W; x++) if (inEllipse(x, y, cx - rx - 1.5, cy + 2, 2.2, 7)) set(x, y, hc); break;
      case 'lowbun': for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inEllipse(x, y, cx + rx, eyeY + 3, 2.4, 2.4) && !g[y][x]) set(x, y, hcD); break;
      case 'undercut': for (let y = eyeY - 2; y < eyeY + 2; y++) { set(Math.round(cx - rx), y, shade(hc, -0.5)); set(Math.round(cx + rx) - 1, y, shade(hc, -0.5)); } break;
      case 'quiff': for (let x = cx - 4; x <= cx + 2; x++) set(x, top - 2, hc); set(cx - 3, top - 3, hc); set(cx - 2, top - 3, hcL); break;
      case 'dreads': for (const dx of [-6, -3, 2, 5]) for (let y = eyeY; y < Math.min(30, eyeY + 12); y++) if (!g[y][cx + dx] || g[y][cx + dx] === hcD) set(cx + dx, y, y % 3 ? hc : hcD); break;
      case 'curly': for (let i = 0; i < 10; i++) set(cx - 6 + (i * 7) % 13, top - 1 + (i % 2), hc); break;
      case 'drills': for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { set(cx + sx * 9, cy + 6 + k * 3, hcL); set(cx + sx * 9, cy + 7 + k * 3, hcD); } break;
      case 'braids': for (const sx of [-1, 1]) for (let y = cy - 2; y <= cy + 12; y += 2) set(cx + sx * 9, y, hcD); break;
      case 'halfup': for (let y = 0; y < 8; y++) for (let x = 0; x < W; x++) if (inEllipse(x, y, cx + 4, top, 2.2, 2) && !g[y][x]) set(x, y, hcD); break;
      case 'highpony': for (let y = top - 3; y < top + 2; y++) { set(cx + rx, y, hc); set(cx + rx + 1, y + 1, hc); } break;
      case 'pompadour': for (let x = cx - 5; x <= cx + 4; x++) { set(x, top - 2, hc); set(x, top - 3, x % 2 ? hcL : hc); } break;
      case 'fauxhawk': for (let y = top - 3; y < top + 1; y++) { set(cx - 1, y, hc); set(cx, y - 1, hcL); set(cx + 1, y, hc); } break;
      case 'longsweep': for (let y = eyeY - 3; y < eyeY + 1; y++) set(cx + 3, y, hc); break;
      // v0.9.26 twenty more
      case 'longlayers': for (const sx of [-1, 1]) for (let y = eyeY + 4; y < Math.min(30, eyeY + 12); y += 3) set(cx + sx * (rx + 1), y, hcL); break;
      case 'crownbraid': for (let x = cx - Math.round(rx) + 1; x < cx + Math.round(rx); x++) set(x, top + 1, (x % 2) ? hcD : hcL); break;
      case 'lowpigtails': for (const sx of [-1, 1]) for (let y = eyeY + 3; y < Math.min(31, eyeY + 12); y++) for (let x = 0; x < W; x++) if (inEllipse(x, y, cx + sx * (rx + 0.5), eyeY + 8, 1.8, 4.5) && !g[y][x]) set(x, y, (y % 3) ? hc : hcD); for (const sx of [-1, 1]) set(cx + sx * (rx + 0.5), eyeY + 3, accent); break;
      case 'messybun': for (let y = 0; y < 8; y++) for (let x = 0; x < W; x++) if (inEllipse(x, y, cx + 1, top - 1, 3.2, 2.4)) set(x, y, (x + y) % 3 ? hc : hcD); set(cx - 3, top - 2, hc); set(cx + 5, top - 1, hc); set(cx + 4, top - 3, hc); break;
      case 'straightcut': for (let x = cx - Math.round(rx); x <= cx + Math.round(rx); x++) if (g[eyeY - 3]?.[x] === hc) set(x, eyeY - 3, hcD); break;
      case 'sweptlong': for (let y = eyeY - 2; y < eyeY + 3; y++) set(cx - 4 + (y - eyeY), y, hc); break;
      case 'ringlets': for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) { set(cx + sx * (rx + 1), eyeY + 6 + k * 3, hcL); set(cx + sx * (rx + 2), eyeY + 7 + k * 3, hcD); } break;
      case 'ribbonpony': set(cx + rx + 1, cy - 5, accent); set(cx + rx + 2, cy - 6, accent); set(cx + rx + 2, cy - 4, accent); set(cx + rx, cy - 6, accent); set(cx + rx, cy - 4, accent); break;
      case 'pixiecurl': for (let i = 0; i < 7; i++) { set(cx - 6 + i * 2, top - 1, hc); set(cx - 5 + i * 2, top - 2 + (i % 2), hcL); } break;
      case 'shoulderwaves': for (const sx of [-1, 1]) for (let y = eyeY + 3; y < eyeY + 9; y++) set(cx + sx * (rx + 1) + (y % 2 ? 0 : sx), y, y % 2 ? hc : hcD); break;
      case 'chonmage': for (let x = cx - 1; x <= cx + 1; x++) for (let y = top - 3; y < top; y++) set(x, y, hcD); for (let x = cx - 3; x <= cx + 3; x++) set(x, top - 3, hc); break;
      case 'shaggy': for (const sx of [-1, 1]) for (let y = eyeY; y < eyeY + 6; y++) set(cx + sx * (rx + 1), y, (y % 2) ? hc : hcD); set(cx - 2, top - 1, hc); set(cx + 3, top - 1, hc); break;
      case 'shortafro': for (let y = 0; y < eyeY - 1; y++) for (let x = 0; x < W; x++) if (inEllipse(x, y, cx, top + 2, rx + 1.6, 4.6) && !g[y][x]) set(x, y, (x + y) % 4 ? hc : hcD); break;
      case 'cornrows': for (let x = cx - 5; x <= cx + 5; x += 2) for (let y = top - 1; y < top + 4; y++) set(x, y, hcD); break;
      case 'tallspikes': for (let i = 0; i < 5; i++) { const sx = cx - 5 + i * 2.5; for (let k = 0; k < 4; k++) set(sx + (k > 1 ? (i % 2 ? 1 : -1) : 0), top - 2 - k, k === 3 ? hcL : hc); } break;
      case 'emo': for (let y = eyeY - 1; y < eyeY + 3; y++) for (let x = cx - Math.round(rx) + 1; x < cx - 1; x++) if (y < eyeY + 2 - (x - (cx - rx)) / 3) set(x, y, (x + y) % 3 ? hc : hcD); break;
      case 'warriortail': for (let y = cy - 7; y < cy - 4; y++) set(cx + rx + 1, y, hcD); for (let x = cx - 3; x <= cx + 3; x++) set(x, top + 1, shade(accent, -0.3)); break;
      case 'fade': for (const sx of [-1, 1]) for (let y = top + 3; y < eyeY + 1; y++) set(sx < 0 ? Math.round(cx - rx) : Math.round(cx + rx) - 1, y, shade(skin, -0.25)); break;
      case 'flattop': for (let x = cx - 5; x <= cx + 5; x++) for (let y = top - 3; y < top + 1; y++) if (!g[y]?.[x] || y < top) set(x, y, y === top - 3 ? hcL : hc); break;
      case 'mullet': for (const sx of [-1, 1]) for (let y = eyeY + 1; y < Math.min(30, eyeY + 9); y++) { set(cx + sx * (rx + 0.5), y, hc); set(cx + sx * (rx + 1.5), y, y % 2 ? hcD : hc); } break;
    }
    // angel-ring highlight
    const hy = top + 1; for (let x = cx - 4; x <= cx + 4; x++) if (g[hy][x] === hc && (x + hy) % 3 !== 0) set(x, hy, hcL);
    // side locks framing the face
    const sideLen = long || style === 'twintails' ? (style === 'hime' ? eyeY + 6 : eyeY + 8) : style === 'bob' ? eyeY + 5 : (style === 'buzz' ? eyeY - 2 : eyeY + 1);
    for (let y = fringeBottom - 2; y <= Math.min(sideLen, 30); y++) {
      const lx = Math.round(cx - rx) - (y > eyeY + 2 && long ? 1 : 0), rx2 = Math.round(cx + rx) - 1 + (y > eyeY + 2 && long ? 1 : 0);
      set(lx, y, hc); set(lx + 1, y, y < eyeY + 1 ? hc : g[y][lx + 1] === skin || g[y][lx + 1] === skinS ? hcD : g[y][lx + 1]);
      set(rx2, y, hc); set(rx2 - 1, y, y < eyeY + 1 ? hc : g[y][rx2 - 1] === skin || g[y][rx2 - 1] === skinS ? hcD : g[y][rx2 - 1]);
    }
    if (st === 'middle' && genes.seed % 2) for (const [x, y] of [[cx - 3, top + 2], [cx + 2, top + 3], [cx + 4, top + 1]]) set(x, y, '#c9c9cf');
  }
  // glasses
  if (genes.glasses && st !== 'infant' && st !== 'child') for (const ex of [eyeL, eyeR]) { for (let i = -1; i <= 4; i++) { set(ex + i, eyeY - 2, '#2b2b2b'); set(ex + i, eyeY + 3, '#2b2b2b'); } for (let j = -1; j <= 2; j++) { set(ex - 1, eyeY + j, '#2b2b2b'); set(ex + 4, eyeY + j, '#2b2b2b'); } }
  // cultivation forehead mark
  if (realm >= 4) { const mc = elemColor || REALMS[realm].color; set(cx, top + 4, mc); set(cx - 1, top + 5, mc); set(cx, top + 5, '#ffffff'); set(cx, top + 6, mc); }

  if (hair?.scar && st !== 'infant') for (let i = 0; i < 3; i++) set(cx + 3 + i, eyeY + 1 + i, skinD); // a scar across the cheek
  if (raw) return { g, st, skin, skinS, skinD, cloth, clothD, accent, hc, bodyTop, bottomHead, top0: top, bt, grown, eyeY };
  return finish(g, realm, elemColor, R);
}

import { ITEMS as _ITEMS } from '../data/items.js';
const ITEMS_COL = new Proxy({}, { get: (_, k) => _ITEMS[k]?.color });
// Outline + cultivation aura, shared by portraits and full-body sprites
function finish(g, realm, elemColor, R) {
  const H = g.length, W = g[0].length;
  const out = g.map(r => r.slice());
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g[y][x]) continue;
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx]);
    if (n) out[y][x] = '#1b1222';
  }
  if (realm >= 3) {
    const ac = elemColor || REALMS[realm].color;
    const ring = (d, alpha) => { const snap = out.map(r => r.slice());
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!snap[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => snap[y + dy]?.[x + dx] && !String(snap[y + dy][x + dx]).startsWith(ac + '1'))) out[y][x] = ac + alpha; };
    ring(1, '66'); if (realm >= 6) ring(2, '33');
    for (let i = 0; i < 4 + realm * 2; i++) { const x = Math.floor(R() * W), y = Math.floor(R() * 22); if (!out[y][x]) out[y][x] = '#ffffffaa'; }
  }
  return out;
}

// ---- Full-body sprite (32x64) for the Status sheet: same head, plus outfit, gear and aura.
const GEAR_COLORS = { iron_sword: ['#cfd6de', '#7a5a3a'], spirit_blade: ['#8fe0ff', '#3a4a7a'], demon_saber: ['#ff5a6a', '#2a0a10'], bronze_dagger: ['#c98a3a', '#5a3a1a'], wooden_staff: ['#9a6a3a', '#5a3a1a'], steel_saber: ['#e2e8ee', '#2a2a2a'], twin_daggers: ['#d0d6de', '#3a2a2a'], war_hammer: ['#8a8a92', '#5a3a1a'], long_spear: ['#cfd6de', '#8a5a2a'], jade_sword: ['#5fd38a', '#2a5a3a'], flame_glaive: ['#ff8a3a', '#5a1a0a'], thunder_blade: ['#b18cff', '#2a1a5a'], void_edge: ['#6a5aff', '#0a0a1a'], celestial_sword: ['#fff4b0', '#c9a23a'] };
export function buildFullBody(genes, opts = {}) {
  const { age = 20, gender = 'F', realm = 0, elemColor = null, gear = {}, robeColor = null, body = null, heightCm = 170, outfit = {} } = opts;
  const gone = id => body?.parts?.[id]?.missing || (id.startsWith('hand') && body?.parts?.['arm' + id.slice(4)]?.missing) || (id.startsWith('foot') && body?.parts?.['leg' + id.slice(4)]?.missing);
  const prost = id => body?.parts?.[id]?.prosthetic || (id.startsWith('hand') && body?.parts?.['arm' + id.slice(4)]?.prosthetic) || (id.startsWith('foot') && body?.parts?.['leg' + id.slice(4)]?.prosthetic);
  const muscle = body?.muscle || 0; const METAL = '#5fa8e8'; // prosthetics: artificial blue
  const R = seeded(genes.seed + 7);
  const head = buildPortrait(genes, { ...opts, headOnly: true, raw: true, build: opts.build || body?.build, muscle });
  const W = 32, H = 64; const g = Array.from({ length: H }, (_, y) => y < 32 ? head.g[y].slice() : Array(W).fill(null));
  const set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H && c) g[y][x] = c; };
  const { st, skin, skinS, cloth, clothD, accent } = head; const cx = 16;
  const scale = { infant: 0.45, child: 0.7, teen: 0.9, adult: 1, middle: 1, elder: 0.95 }[st];
  const tall = age >= 16 ? Math.max(0.85, Math.min(1.15, heightCm / (gender === 'M' ? 175 : 162))) : 1;
  const top = head.bodyTop - 1, torsoH = Math.round(14 * scale), legH = Math.min(30, Math.round(20 * scale * tall));
  const { bt, grown } = head, chub = grown && bt === 'chubby', lean = grown && bt === 'lean';
  // half shoulder width: body type, and real muscle makes you visibly wider (v0.9.26)
  const sw = (st === 'infant' ? 5 : gender === 'M' ? 7 : 6) + (st !== 'infant' ? (muscle >= 85 ? 3 : muscle >= 65 ? 2 : muscle >= 45 ? 1 : 0) : 0) + (chub ? 1 : lean ? -1 : 0);
  const O = outfit || {}, dressed = O.top || O.dress || O.outer;
  const robe = realm >= 1 && st !== 'infant' && !dressed;
  const main = O.outer?.color || O.dress?.color || O.top?.color || (robe ? (robeColor || shade(REALMS[realm].color, -0.45)) : cloth), mainD = shade(main, -0.3);
  const rs = R(); const skirt = !robe && (O.dress || O.bottom?.kind === 'skirt' || (!O.bottom && gender === 'F' && (st === 'teen' || st === 'adult' || st === 'child') && rs < 0.6));
  const pants = O.bottom?.color || shade(CLOTHES[Math.floor(R() * CLOTHES.length)], -0.35), shoes = O.shoes?.color || '#2a2230', socks = O.socks?.color;
  // torso
  const taper = muscle >= 65 && grown ? 1 : 0; // a V-shape: broad shoulders, narrower waist
  for (let y = top; y < top + torsoH; y++) { const low = y > top + torsoH * 0.55, belly = chub && y > top + torsoH * 0.4 && y < top + torsoH * 0.95 ? 1 : 0;
    const w = sw - (low && gender === 'F' ? 1 : 0) - (low ? taper : 0) + belly;
    for (let x = cx - w; x < cx + w; x++) set(x, y, x === cx - w || x === cx + w - 1 ? mainD : main); }
  // v0.8.7 feminine silhouette for teen/adult women: a fuller chest line (cloth shading only; the waist already narrows below)
  if (gender === 'F' && (st === 'adult' || st === 'middle' || st === 'elder' || st === 'teen')) {
    const cy0 = top + Math.round(torsoH * 0.25), bw = st === 'teen' ? 2 : 3;
    for (const side of [-1, 1]) { const bx = side < 0 ? cx - 1 - bw : cx + 1; for (let i = 0; i < bw; i++) { set(bx + i, cy0 + 1, mainD); set(bx + i, cy0 - 1, shade(main, 0.12)); } }
    set(cx - 1, cy0, mainD); set(cx, cy0, mainD); // centre fold
  }
  // collar
  set(cx - 1, top, skinS); set(cx, top, skinS); set(cx - 1, top + 1, skin); set(cx, top + 1, skin);
  // arms (3px) + hands
  const armLen = torsoH + Math.round(3 * scale);
  const aw = muscle >= 75 && grown ? 5 : muscle >= 40 || chub ? 4 : 3;
  for (const [ax, side] of [[cx - sw - aw, 'l'], [cx + sw, 'r']]) for (let y = top + 1; y < top + armLen; y++) for (let i = 0; i < aw; i++) {
    const isHand = y >= top + armLen - 2; const id = (isHand ? 'hand_' : 'arm_') + side;
    if (gone(id)) { if (prost(id)) set(ax + i, y, (x => x)(METAL)); continue; }
    set(ax + i, y, isHand ? skin : (i === 0 ? mainD : main)); }
  // belt / sash
  const beltY = top + Math.round(torsoH * 0.6);
  for (let x = cx - sw + 1; x < cx + sw - 1; x++) set(x, beltY, robe ? (elemColor || accent) : shade(main, -0.5));
  // lower body
  const hip = top + torsoH;
  if (robe) { for (let y = hip; y < hip + Math.round(legH * 0.75); y++) { const w = sw + Math.floor((y - hip) / 4); for (let x = cx - w; x < cx + w; x++) set(x, y, x === cx - w || x === cx + w - 1 || x === cx ? mainD : main); } }
  else if (skirt) { for (let y = hip; y < hip + Math.round(legH * 0.45); y++) { const w = sw + Math.floor((y - hip) / 2); for (let x = cx - w; x < cx + w; x++) set(x, y, (x + y) % 5 === 0 ? shade(O.dress?.color || O.bottom?.color || clothD, -0.2) : O.dress?.color || O.bottom?.color || shade(accent, -0.25)); } }
  // legs + shoes
  const lw = (chub || (muscle >= 70 && grown)) ? 4 : 3, lgap = lw === 4 ? 5 : 4;
  for (let y = hip; y < hip + legH; y++) for (const [lx, side] of [[cx - lgap, 'l'], [cx + 1, 'r']]) for (let i = 0; i < lw; i++) {
    if (g[y]?.[lx + i]) continue; const shoe = y >= hip + legH - 2; const id = (shoe ? 'foot_' : 'leg_') + side;
    if (gone(id)) { if (prost(id)) set(lx + i, y, i === 1 ? METAL : null); continue; }
    set(lx + i, y, shoe ? shoes : socks && y >= hip + legH - 4 ? socks : O.bottom?.kind === 'shorts' && y > hip + legH * 0.4 ? skinS : skirt || st === 'infant' ? skinS : pants);
  }
  // armour overlays
  if (gear.armor === 'iron_mail') for (let y = top + 2; y < hip; y++) for (let x = cx - sw + 1; x < cx + sw - 1; x++) if ((x + y) % 2 === 0) set(x, y, '#9aa3ad');
  if (gear.armor === 'dragon_vest') for (let y = top + 2; y < hip; y++) for (let x = cx - sw + 1; x < cx + sw - 1; x++) set(x, y, (x + y * 2) % 3 === 0 ? '#ffb347' : '#d9622b');
  if (gear.armor === 'padded_robe') for (let y = top + 2; y < hip; y += 3) for (let x = cx - sw + 1; x < cx + sw - 1; x++) set(x, y, shade(main, 0.2));
  // hat
  if (O.mask) drawMask(g, set, head, O.mask, cx);
  if (O.hat) drawHat(set, head, O.hat, cx);
  // charm pendant
  if (gear.charm) { set(cx - 1, top + 3, gear.charm === 'jade_charm' ? '#5fd38a' : '#f2efe6'); set(cx, top + 3, gear.charm === 'jade_charm' ? '#3fa36a' : '#d8d2c2'); }
  // v0.8.7 necklace on the chest, ring on the left hand
  if (gear.necklace) { const nc = ITEMS_COL[gear.necklace] || '#e8e2d0'; set(cx - 2, top + 2, nc); set(cx + 1, top + 2, nc); set(cx - 1, top + 4, nc); set(cx, top + 4, '#ffffff'); }
  if (gear.ring && !gone('hand_l')) set(cx - sw - Math.ceil(aw / 2), top + armLen - 1, ITEMS_COL[gear.ring] || '#ffd36f');
  // weapon in right hand
  if (gear.weapon && !gone('hand_r')) { const [blade, hilt] = GEAR_COLORS[gear.weapon] || (_ITEMS[gear.weapon]?.color ? [_ITEMS[gear.weapon].color, '#5a3a1a'] : GEAR_COLORS.iron_sword); const hx = cx + sw + 1, hy = top + armLen - 2;
    for (let y = hy - 12; y < hy - 1; y++) set(hx + 3, y, blade); set(hx + 3, hy - 13, shade(blade, 0.4));
    set(hx + 2, hy - 1, hilt); set(hx + 3, hy - 1, hilt); set(hx + 4, hy - 1, hilt); set(hx + 3, hy, hilt); set(hx + 3, hy + 1, hilt); }
  return finish(g, realm, elemColor, R);
}
// v0.9.33 hats come in shapes now, and masks cover the face
function drawHat(set, head, H, cx) {
  const t = head.top0 ?? 4, col = H.color, d = shade(col, -0.3), l = shade(col, 0.3), ey = head.eyeY ?? t + 9, row = (y, a, b, c2 = col) => { for (let x = a; x <= b; x++) set(x, y, c2); };
  switch (H.hk) {
    case 'cap': row(t - 1, cx - 5, cx + 4); row(t, cx - 6, cx + 5); row(t + 1, cx - 6, cx + 5, d); row(t + 2, cx - 1, cx + 9, d); break;
    case 'beanie': row(t - 2, cx - 4, cx + 3); row(t - 1, cx - 6, cx + 5); row(t, cx - 7, cx + 6); row(t + 1, cx - 7, cx + 6, d); set(cx - 1, t - 3, l); set(cx, t - 3, l); break;
    case 'wide': row(t + 1, cx - 11, cx + 10, d); row(t, cx - 8, cx + 7); row(t - 1, cx - 5, cx + 4); row(t - 2, cx - 3, cx + 2); row(t - 3, cx - 1, cx, l); break;
    case 'crown': row(t, cx - 5, cx + 4); for (let x = cx - 5; x <= cx + 4; x += 3) { set(x, t - 1, col); set(x, t - 2, l); } set(cx - 1, t, '#ff4f6a'); set(cx, t, '#7fe3ff'); break;
    case 'top': row(t, cx - 8, cx + 7); for (let y = t - 7; y < t; y++) row(y, cx - 5, cx + 4); row(t - 1, cx - 5, cx + 4, '#a8323e'); row(t - 7, cx - 5, cx + 4, l); break;
    case 'brim': row(t, cx - 9, cx + 8, d); row(t - 1, cx - 5, cx + 4); row(t - 2, cx - 5, cx + 4); row(t - 3, cx - 4, cx + 3); set(cx - 1, t - 3, d); row(t - 1, cx - 5, cx + 4, shade(col, -0.45)); break;
    case 'beret': row(t - 2, cx - 4, cx + 7); row(t - 1, cx - 6, cx + 8); row(t, cx - 6, cx + 6, d); set(cx + 2, t - 3, d); break;
    case 'bucket': row(t - 2, cx - 4, cx + 3); row(t - 1, cx - 5, cx + 4); row(t, cx - 6, cx + 5); row(t + 1, cx - 8, cx + 7, d); break;
    case 'guan': row(t - 1, cx - 2, cx + 1); row(t - 2, cx - 2, cx + 1); row(t - 3, cx - 1, cx, l); row(t - 2, cx - 5, cx + 4, '#c9a23a'); break;
    case 'band': row(t + 2, cx - 7, cx + 6); set(cx + 7, t + 3, col); set(cx + 8, t + 4, d); break;
    case 'hood': row(t - 2, cx - 6, cx + 5); row(t - 1, cx - 8, cx + 7); for (let y = t; y <= ey + 4; y++) { set(cx - 8, y, d); set(cx - 9, y, col); set(cx + 7, y, d); set(cx + 8, y, col); } row(t, cx - 8, cx + 7, d); break;
    case 'turban': for (let y = t - 3; y <= t + 1; y++) row(y, cx - 7 + (y < t - 1 ? 2 : 0), cx + 6 - (y < t - 1 ? 2 : 0), (y + cx) % 2 ? col : d); set(cx, t - 1, '#c9a23a'); break;
    default: for (let x = cx - 7; x <= cx + 6; x++) { set(x, t, col); if (x > cx - 6 && x < cx + 5) set(x, t - 1, col); }
  }
}
function drawMask(g, set, head, M, cx) {
  const ey = head.eyeY ?? 14, bot = head.bottomHead ?? 22, top = head.top0 ?? 5, col = M.color, d = shade(col, -0.35), hair = [head.hc, shade(head.hc, -0.28), shade(head.hc, 0.32)];
  const face = (x, y) => g[y]?.[x] && !hair.includes(g[y][x]) && g[y][x] !== '#1b1222';
  const fill = (y0, y1, c2) => { for (let y = y0; y <= y1; y++) for (let x = cx - 8; x <= cx + 7; x++) if (face(x, y)) set(x, y, c2); };
  const eyes = c2 => { for (const ex of [cx - 6, cx + 2]) for (let i = 0; i < 4; i++) { set(ex + i, ey + 1, c2); if (i === 1 || i === 2) set(ex + i, ey + 2, c2); } };
  switch (M.mk) {
    case 'mouth': fill(ey + 3, bot - 1, col); for (let x = cx - 6; x <= cx + 5; x++) if (face(x, ey + 3)) set(x, ey + 3, d); break;
    case 'full': fill(top + 3, bot, col); eyes('#14101c'); set(cx - 1, ey + 5, d); set(cx, ey + 5, d); set(cx - 6, ey + 3, '#d8323e'); set(cx + 5, ey + 3, '#d8323e'); set(cx - 1, top + 4, '#d8323e'); break;
    case 'eyes': fill(ey - 1, ey + 2, col); eyes('#14101c'); set(cx - 8, ey - 2, d); set(cx + 7, ey - 2, d); break;
    case 'shades': for (const ex of [cx - 6, cx + 2]) for (let i = -1; i < 5; i++) for (let y = ey; y <= ey + 2; y++) set(ex + i, y, y === ey && i === 0 ? '#ffffff88' : col === '#c9a23a' ? '#2a1a08' : '#0e0e14'); for (let x = cx - 1; x <= cx; x++) set(x, ey, col); break;
    case 'veil': for (let y = ey + 3; y <= bot + 2; y++) for (let x = cx - 8; x <= cx + 7; x++) if (face(x, y) || (y > bot && x > cx - 7 && x < cx + 6)) set(x, y, (x + y) % 2 ? col : shade(col, -0.12)); break;
  }
}
export function drawFullBody(canvas, genes, opts) {
  const grid = buildFullBody(genes, opts); canvas.width = 32; canvas.height = 64;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, 32, 64);
  grid.forEach((row, y) => row.forEach((c, x) => { if (c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); } }));
  return canvas;
}

// v0.9.29 every portrait blinks now and then (one shared timer for all of them)
const BLINKERS = new Set(); let blinkTimer = null;
function paint(canvas, grid) { const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, 32, 32); grid.forEach((row, y) => row.forEach((c, x) => { if (c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); } })); }
function startBlinking() {
  if (blinkTimer) return;
  blinkTimer = setInterval(() => {
    if (document.hidden) return; const now = performance.now();
    for (const cv of BLINKERS) {
      if (!cv.isConnected) { if (cv._seen) BLINKERS.delete(cv); continue; } cv._seen = true;
      if (now < cv._next) continue;
      const b = cv._blink; if (!b) continue; paint(cv, b.closed);
      setTimeout(() => paint(cv, b.open), 120 + Math.random() * 60);
      cv._next = now + (Math.random() < 0.15 ? 350 : 2200 + Math.random() * 4500); // sometimes a quick double-blink
    }
  }, 120);
}
export function drawPortrait(canvas, genes, opts) {
  const grid = buildPortrait(genes, opts); canvas.width = 32; canvas.height = 32;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, 32, 32);
  grid.forEach((row, y) => row.forEach((c, x) => { if (c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); } }));
  return canvas;
}
// Helper: returns a <canvas> portrait for the player or an NPC
export function portraitFor(p, size = 64, extra = {}) {
  const cv = document.createElement('canvas'); cv.className = 'portrait';
  cv.style.width = cv.style.height = size + 'px';
  const o = { age: p.age, gender: p.gender, realm: p.qi ? p.qi.realm : p.realm || 0, hair: p.face ? { ...(p.hair || {}), ...p.face } : p.hair, elemColor: extra.elemColor, build: p.body?.build || p.build, muscle: p.body?.muscle || 0 };
  const open = buildPortrait(p.genes, o); cv.width = 32; cv.height = 32; paint(cv, open);
  if (extra.blink !== false && !(typeof document !== 'undefined' && document.body?.classList.contains('reduce-motion'))) {
    cv._blink = { open, closed: buildPortrait(p.genes, { ...o, blink: true }) }; cv._next = performance.now() + 800 + Math.random() * 4000; BLINKERS.add(cv); startBlinking();
  }
  return cv;
}

// v0.8.0: the pixels of your current hair (for the white silhouette on the Health tab), plus where the head sits
export function hairMask(genes, opts = {}) {
  const r = buildPortrait(genes, { ...opts, raw: true });
  const cols = new Set([r.hc, shade(r.hc, -0.28), shade(r.hc, 0.32)]);
  const px = []; r.g.forEach((row, y) => row.forEach((v, x) => { if (cols.has(v)) px.push([x, y]); }));
  return { px, top: r.top0, bottom: r.bottomHead };
}
