// Round 2 resubmission: Seeded random generator
// Round 2 resubmission: Deterministic RNG core
// Seeded random: one job, deterministic city + traffic from a seed.
export function createRandom(seed) {
  let s = seed >>> 0 || 1;
  return {
    next() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; },
    range(a, b) { return a + this.next() * (b - a); },
    int(a, b) { return Math.floor(this.range(a, b + 1)); },
    pick(arr) { return arr[Math.floor(this.next() * arr.length)]; },
    chance(p) { return this.next() < p; },
  };
}
export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
export function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
export function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }
export function angleDiff(a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
