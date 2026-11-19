// Solmar Bay — seeded random, rewritten for round 3.
// One job: a deterministic stream from a seed, so the city, the traffic and
// every screenshot seed build the same world every time.
export function createRandom(seed) {
  // A tiny LCG. The constants are the classic Numerical Recipes pair, kept
  // so a seed still builds the exact same city as before the rewrite.
  let s = seed >>> 0 || 1;
  function next() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  }
  function range(a, b) { return a + next() * (b - a); }
  return {
    next,
    range,
    int(a, b) { return Math.floor(range(a, b + 1)); },
    pick(arr) { return arr[Math.floor(next() * arr.length)]; },
    chance(p) { return next() < p; },
  };
}

export function clamp(v, a, b) {
  if (v < a) return a;
  if (v > b) return b;
  return v;
}

export function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

export function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}
