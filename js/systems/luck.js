// v0.9.45 Breathing room: after something bad happens, the world eases off for a couple of years.
// lull(c) scales the odds of misfortune: 0.2 in a year that already went wrong, 0.35 the year after,
// 0.65 two years after, then back to normal. Bad things still happen, just not every single year.
export function lull(c) {
  const a = c?.flags?.lastBadAge; if (a == null) return 1;
  const d = c.age - a; return d <= 0 ? 0.2 : d === 1 ? 0.35 : d === 2 ? 0.65 : 1;
}
export function noteBad(c) { if (c?.flags) c.flags.lastBadAge = c.age; }
