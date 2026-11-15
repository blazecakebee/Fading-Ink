// Procedural 32x32 anime-style pixel portraits. Original art generated from "genes".
// Portraits change with age stage, salon hair changes, and cultivation realm (eye glow, aura, forehead mark).
import { seeded, ri, chance, pick, clamp } from '../core/rng.js';
import { REALMS } from '../data/realms.js';
const GENETIC_IDS = ['congenital_heart', 'cystic_fibrosis', 'hemophilia', 'sickle_cell', 'muscular_dystrophy', 'huntingtons', 'alzheimers', 'bipolar'];

export const SKINS = ['#ffe6d8', '#fcd7bd', '#f3c79a', '#e0ac74', '#c68a52', '#94603a', '#6a4129'];
export const HAIR_COLORS = {
  black: '#22202c', darkbrown: '#3e2b22', brown: '#6e4730', auburn: '#8c3a26', blonde: '#e8c36c', platinum: '#efe4c8',
  // salon / fantasy colors
  pink: '#ff92bd', blue: '#5b86ff', silver: '#c9cfdc', red: '#d83a3f', purple: '#8e5fd8', green: '#4db37d', white: '#f4f2ee', teal: '#3fc1c1', orange: '#ff9b42',
};
export const NATURAL_HAIR = ['black', 'darkbrown', 'brown', 'auburn', 'blonde', 'platinum'];
export const EYE_COLORS = ['#6b3a1e', '#3a2418', '#8d6a2c', '#3f9a5a', '#3f7fd6', '#7f92a8', '#d69a2a', '#9a5ad6', '#d63a3a'];
export const HAIR_STYLES = {
  F: ['long', 'twintails', 'bob', 'ponytail', 'hime', 'buns', 'wavy'],
  M: ['short', 'spiky', 'messy', 'sidepart', 'longtied', 'buzz', 'swept'],
};
const CLOTHES = ['#3b4a7a', '#7a2f3b', '#2f6b55', '#5a3b7a', '#d9d4c7', '#2b2b33', '#b8743a', '#4a7aa8', '#c85a8a', '#6a6a72'];

export function randomGenes(gender) {
  return {
    seed: ri(1, 1e9), skin: ri(0, SKINS.length - 1), hairColor: pick(NATURAL_HAIR),
    eye: chance(0.03) ? ri(7, 8) : ri(0, 6), style: pick(HAIR_STYLES[gender]), looks: clamp(Math.round(30 + Math.random() * 45 + (chance(0.1) ? 25 : 0))),
    freckles: chance(0.15), glasses: chance(0.1), mole: chance(0.12),
    carriers: GENETIC_IDS.filter(() => chance(0.03)), // hidden genetic conditions
  };
}
// Child genes: each feature from one parent, skin blends, small mutation chance, looks averaged with RNG.
export function mixGenes(a, b, gender) {
  const from = () => (chance(0.5) ? a : b);
  const g = {
    seed: ri(1, 1e9), skin: clamp(Math.round((a.skin + b.skin) / 2 + (chance(0.5) ? 0.4 : -0.4)), 0, SKINS.length - 1),
    hairColor: chance(0.05) ? pick(NATURAL_HAIR) : from().hairColor, eye: chance(0.04) ? ri(0, 8) : from().eye,
    style: pick(HAIR_STYLES[gender]), looks: clamp(Math.round((a.looks + b.looks) / 2 + ri(-18, 18))),
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
export function buildPortrait(genes, { age = 20, gender = 'F', realm = 0, hair = null, elemColor = null, headOnly = false, raw = false }) {
  const R = seeded(genes.seed); const W = 32, H = 32;
  const g = Array.from({ length: H }, () => Array(W).fill(null));
  const set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H && c) g[y][x] = c; };
  // cultivators age slowly
  const visAge = realm >= 2 ? Math.min(age, 28 + age * 0.08) : realm === 1 ? Math.min(age, 18 + (age - 18) * 0.7) : age;
  const st = ageStage(age < 18 ? age : visAge);
  const P = { infant: { cy: 17, rx: 8, ry: 7.6, chin: 0.15 }, child: { cy: 15, rx: 7.8, ry: 8, chin: 0.35 }, teen: { cy: 14.5, rx: 7.5, ry: 8.4, chin: 0.62 },
    adult: { cy: 14.5, rx: 7.4, ry: 8.6, chin: gender === 'F' ? 0.68 : 0.5 }, middle: { cy: 14.5, rx: 7.5, ry: 8.6, chin: 0.45 }, elder: { cy: 14.8, rx: 7.5, ry: 8.4, chin: 0.4 } }[st];
  const cx = 16, { cy, rx, ry, chin } = P;
  const skin = SKINS[genes.skin], skinS = shade(skin, -0.14), skinD = shade(skin, -0.3);
  let hc = HAIR_COLORS[hair?.color || genes.hairColor] || HAIR_COLORS.black;
  if (st === 'elder') hc = genes.hairColor === 'platinum' ? '#f4f2ee' : '#cfcfd6';
  const hcD = shade(hc, -0.28), hcL = shade(hc, 0.32);
  const style = hair?.style || genes.style;
  const eyeC = EYE_COLORS[genes.eye] || EYE_COLORS[0];
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
    const half = Math.min(st === 'infant' ? 7 : st === 'child' ? 9 : gender === 'M' ? 13 : 11, 4 + (y - bodyTop) * 2.2);
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
  // cheek / jaw shading on right side
  for (let y = eyeY; y <= bottomHead; y++) for (let x = cx; x < W; x++) if (inHead(x, y) && !inHead(x + 1, y)) set(x, y, skinS);
  // ears
  if (!long || style === 'longtied') { set(Math.round(cx - rx) - 1, eyeY + 1, skinS); set(Math.round(cx + rx), eyeY + 1, skinS); }

  // 4. face — big anime eyes (4px wide). Girls/children: 4 rows tall with flicked lashes; boys: 3 rows, sharper.
  const big = st === 'infant' || st === 'child' || gender === 'F';
  const eyeL = cx - 6, eyeR = cx + 2; // left x of each 4px eye
  const lash = '#1d1424', glow = realm >= 1 ? (elemColor || REALMS[realm].color) : null;
  for (const [ex, side] of [[eyeL, -1], [eyeR, 1]]) {
    const iris = glow && realm >= 2 ? shade(glow, -0.2) : eyeC, irisL = glow ? shade(glow, 0.2) : shade(eyeC, 0.4), irisD = shade(iris, -0.45);
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
  const ny = eyeY + (big ? 4 : 3); set(cx, ny, skinS);
  const my = Math.min(bottomHead - 2, eyeY + (st === 'infant' ? 5 : 6));
  if (gender === 'F' || st === 'infant' || st === 'child') { set(cx - 1, my, '#c25a68'); set(cx, my, '#d97a86'); }
  else { set(cx - 1, my, shade(skin, -0.42)); set(cx, my, shade(skin, -0.42)); }
  if (gender === 'F' || st === 'infant' || st === 'child') for (const bx of [eyeL - 1, eyeL, eyeR + 3, eyeR + 4]) set(bx, eyeY + 4, shade('#ff8fa3', genes.skin > 3 ? -0.2 : 0.1));
  if (genes.freckles && st !== 'infant') for (const [fx, fy] of [[eyeL + 1, eyeY + 4], [eyeL + 3, eyeY + 5], [eyeR, eyeY + 5], [eyeR + 2, eyeY + 4]]) set(fx, fy, skinD);
  if (genes.mole) set(eyeR + 3, my, skinD);
  if (genes.looks < 20 && st !== 'infant') set(eyeL + 1, eyeY + 4, skinD);
  if (st === 'middle' || st === 'elder') { set(eyeL - 1, eyeY + 2, skinS); set(eyeR + 4, eyeY + 2, skinS); }
  if (st === 'elder') { set(cx - 3, my - 1, skinS); set(cx + 2, my - 1, skinS); }

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
    for (let y = 0; y <= fringeBottom + 2; y++) for (let x = 0; x < W; x++) {
      const col = x - Math.round(cx - rx);
      const crown = inEllipse(x, y, cx, cy - 0.6, crownRx, crownRy) && y < cy - 1;
      const limit = fringeBottom + (bangs[clamp(col, 0, 13)] || 0);
      if ((crown && y <= limit) || (inHead(x, y) && y <= limit)) set(x, y, hc);
    }
    if (style === 'spiky') for (let i = 0; i < 6; i++) { const sx = cx - 5 + i * 2; set(sx, top - 2, hc); set(sx, top - 1, hc); set(sx + 1, top - 3 + (i % 2), hc); }
    if (style === 'messy') { set(cx - 2, top - 2, hc); set(cx + 3, top - 2, hc); set(cx + 4, top - 1, hc); }
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
  if (realm >= 3) { const mc = elemColor || REALMS[realm].color; set(cx, top + 4, mc); set(cx - 1, top + 5, mc); set(cx, top + 5, '#ffffff'); set(cx, top + 6, mc); }

  if (raw) return { g, st, skin, skinS, skinD, cloth, clothD, accent, hc, bodyTop, bottomHead };
  return finish(g, realm, elemColor, R);
}

// Outline + cultivation aura, shared by portraits and full-body sprites
function finish(g, realm, elemColor, R) {
  const H = g.length, W = g[0].length;
  const out = g.map(r => r.slice());
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g[y][x]) continue;
    const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy]?.[x + dx]);
    if (n) out[y][x] = '#1b1222';
  }
  if (realm >= 2) {
    const ac = elemColor || REALMS[realm].color;
    const ring = (d, alpha) => { const snap = out.map(r => r.slice());
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!snap[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => snap[y + dy]?.[x + dx] && !String(snap[y + dy][x + dx]).startsWith(ac + '1'))) out[y][x] = ac + alpha; };
    ring(1, '66'); if (realm >= 4) ring(2, '33');
    for (let i = 0; i < 4 + realm * 2; i++) { const x = Math.floor(R() * W), y = Math.floor(R() * 22); if (!out[y][x]) out[y][x] = '#ffffffaa'; }
  }
  return out;
}

// ---- Full-body sprite (32x64) for the Status sheet: same head, plus outfit, gear and aura.
const GEAR_COLORS = { iron_sword: ['#cfd6de', '#7a5a3a'], spirit_blade: ['#8fe0ff', '#3a4a7a'], demon_saber: ['#ff5a6a', '#2a0a10'] };
export function buildFullBody(genes, opts = {}) {
  const { age = 20, gender = 'F', realm = 0, elemColor = null, gear = {}, robeColor = null } = opts;
  const R = seeded(genes.seed + 7);
  const head = buildPortrait(genes, { ...opts, headOnly: true, raw: true });
  const W = 32, H = 64; const g = Array.from({ length: H }, (_, y) => y < 32 ? head.g[y].slice() : Array(W).fill(null));
  const set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H && c) g[y][x] = c; };
  const { st, skin, skinS, cloth, clothD, accent } = head; const cx = 16;
  const scale = { infant: 0.45, child: 0.7, teen: 0.9, adult: 1, middle: 1, elder: 0.95 }[st];
  const top = head.bodyTop - 1, torsoH = Math.round(14 * scale), legH = Math.round(20 * scale);
  const sw = st === 'infant' ? 5 : gender === 'M' ? 7 : 6;              // half shoulder width
  const robe = realm >= 1 && st !== 'infant';
  const main = robe ? (robeColor || shade(REALMS[realm].color, -0.45)) : cloth, mainD = shade(main, -0.3);
  const skirt = !robe && gender === 'F' && (st === 'teen' || st === 'adult' || st === 'child') && R() < 0.6;
  const pants = shade(CLOTHES[Math.floor(R() * CLOTHES.length)], -0.35), shoes = '#2a2230';
  // torso
  for (let y = top; y < top + torsoH; y++) { const w = sw - (y > top + torsoH * 0.55 && gender === 'F' ? 1 : 0);
    for (let x = cx - w; x < cx + w; x++) set(x, y, x === cx - w || x === cx + w - 1 ? mainD : main); }
  // collar
  set(cx - 1, top, skinS); set(cx, top, skinS); set(cx - 1, top + 1, skin); set(cx, top + 1, skin);
  // arms (3px) + hands
  const armLen = torsoH + Math.round(3 * scale);
  for (let y = top + 1; y < top + armLen; y++) for (const ax of [cx - sw - 3, cx + sw]) for (let i = 0; i < 3; i++) set(ax + i, y, y >= top + armLen - 2 ? skin : (i === 0 ? mainD : main));
  // belt / sash
  const beltY = top + Math.round(torsoH * 0.6);
  for (let x = cx - sw + 1; x < cx + sw - 1; x++) set(x, beltY, robe ? (elemColor || accent) : shade(main, -0.5));
  // lower body
  const hip = top + torsoH;
  if (robe) { for (let y = hip; y < hip + Math.round(legH * 0.75); y++) { const w = sw + Math.floor((y - hip) / 4); for (let x = cx - w; x < cx + w; x++) set(x, y, x === cx - w || x === cx + w - 1 || x === cx ? mainD : main); } }
  else if (skirt) { for (let y = hip; y < hip + Math.round(legH * 0.45); y++) { const w = sw + Math.floor((y - hip) / 2); for (let x = cx - w; x < cx + w; x++) set(x, y, (x + y) % 5 === 0 ? clothD : pants === shoes ? cloth : shade(accent, -0.25)); } }
  // legs + shoes
  for (let y = hip; y < hip + legH; y++) for (const lx of [cx - 4, cx + 1]) for (let i = 0; i < 3; i++) {
    if (g[y]?.[lx + i]) continue; const shoe = y >= hip + legH - 2;
    set(lx + i, y, shoe ? shoes : skirt || st === 'infant' ? skinS : pants);
  }
  // armour overlays
  if (gear.armor === 'iron_mail') for (let y = top + 2; y < hip; y++) for (let x = cx - sw + 1; x < cx + sw - 1; x++) if ((x + y) % 2 === 0) set(x, y, '#9aa3ad');
  if (gear.armor === 'dragon_vest') for (let y = top + 2; y < hip; y++) for (let x = cx - sw + 1; x < cx + sw - 1; x++) set(x, y, (x + y * 2) % 3 === 0 ? '#ffb347' : '#d9622b');
  if (gear.armor === 'padded_robe') for (let y = top + 2; y < hip; y += 3) for (let x = cx - sw + 1; x < cx + sw - 1; x++) set(x, y, shade(main, 0.2));
  // charm pendant
  if (gear.charm) { set(cx - 1, top + 3, gear.charm === 'jade_charm' ? '#5fd38a' : '#f2efe6'); set(cx, top + 3, gear.charm === 'jade_charm' ? '#3fa36a' : '#d8d2c2'); }
  // weapon in right hand
  if (gear.weapon) { const [blade, hilt] = GEAR_COLORS[gear.weapon] || GEAR_COLORS.iron_sword; const hx = cx + sw + 1, hy = top + armLen - 2;
    for (let y = hy - 12; y < hy - 1; y++) set(hx + 3, y, blade); set(hx + 3, hy - 13, shade(blade, 0.4));
    set(hx + 2, hy - 1, hilt); set(hx + 3, hy - 1, hilt); set(hx + 4, hy - 1, hilt); set(hx + 3, hy, hilt); set(hx + 3, hy + 1, hilt); }
  return finish(g, realm, elemColor, R);
}
export function drawFullBody(canvas, genes, opts) {
  const grid = buildFullBody(genes, opts); canvas.width = 32; canvas.height = 64;
  const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, 32, 64);
  grid.forEach((row, y) => row.forEach((c, x) => { if (c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); } }));
  return canvas;
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
  drawPortrait(cv, p.genes, { age: p.age, gender: p.gender, realm: p.qi ? p.qi.realm : p.realm || 0, hair: p.hair, elemColor: extra.elemColor });
  return cv;
}
