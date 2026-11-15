// Small RNG helpers. Math.random is fine for gameplay; seeded RNG used for portraits.
export const rand = () => Math.random();
export const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const chance = p => Math.random() < p;
export const pick = arr => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
export const uid = () => Math.random().toString(36).slice(2, 10);
export function weighted(items, w = x => x.weight) {
  const total = items.reduce((s, x) => s + w(x), 0);
  let r = Math.random() * total;
  for (const x of items) { r -= w(x); if (r <= 0) return x; }
  return items[items.length - 1];
}
// Deterministic RNG (mulberry32) for anything that must look the same every render
export function seeded(seed) {
  let a = typeof seed === 'string' ? [...seed].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7) : seed | 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
