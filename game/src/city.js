// Solmar Bay — map generation, rewritten for round 3.
// A seeded grid city: roads, blocks, buildings, parks, the western beach and
// pier, the marina and named landmarks. The same seed always builds the
// same streets, so every visit — and every screenshot — matches.
import { WORLD, PALETTE } from './config.js';
import { createRandom } from './random.js';

export const ROAD_W = 64, BLOCK = 300;

export function isRoad(x, y) {
  if (x < 200) return false;
  const rx = (x - 200) % BLOCK;
  const ry = (y - 200) % BLOCK;
  return rx < ROAD_W || ry < ROAD_W || x > WORLD.width - 60 || y > WORLD.height - 60;
}

export function nearestRoadPoint(x, y) {
  const gx = 200 + Math.round((x - 200) / BLOCK) * BLOCK + ROAD_W / 2;
  const gy = 200 + Math.round((y - 200) / BLOCK) * BLOCK + ROAD_W / 2;
  if (Math.abs(x - gx) < Math.abs(y - gy)) return { x: gx, y };
  return { x, y: gy };
}

export function createCity(seed) {
  const rng = createRandom(seed);
  const roadsV = [];
  const roadsH = [];
  for (let x = 200; x < WORLD.width - 100; x += BLOCK) roadsV.push(x);
  for (let y = 200; y < WORLD.height - 100; y += BLOCK) roadsH.push(y);
  const buildings = [];
  const trees = [];
  const parks = [];
  const colliders = [];
  const towerNames = ['Solmar Tower', 'City Hall', 'Grand Marina Hotel', 'Bay Stadium', 'Pier 9 Market', 'The Neon Palms', 'Harbor Court', 'Sunset Plaza'];
  let named = 0;
  for (let bx = 0; bx < roadsV.length - 1; bx++) {
    for (let by = 0; by < roadsH.length - 1; by++) {
      const x0 = roadsV[bx] + ROAD_W;
      const y0 = roadsH[by] + ROAD_W;
      const w = BLOCK - ROAD_W;
      const h = BLOCK - ROAD_W;
      if (x0 < 220) continue; // the beach strip owns the west edge
      const roll = rng.next();
      if (roll < 0.16) {
        // A park block: lawn plus a scatter of trees, and no buildings at all.
        parks.push({ x: x0, y: y0, w, h });
        for (let t = 0; t < 7; t++) {
          trees.push({ x: x0 + rng.range(20, w - 20), y: y0 + rng.range(20, h - 20), r: rng.range(9, 15) });
        }
        continue;
      }
      const count = rng.int(1, 3);
      for (let i = 0; i < count; i++) {
        const bw = rng.range(70, 130);
        const bh = rng.range(60, 120);
        const bx2 = x0 + rng.range(8, Math.max(9, w - bw - 8));
        const by2 = y0 + rng.range(8, Math.max(9, h - bh - 8));
        const ci = rng.int(0, PALETTE.building.length - 1);
        const tall = rng.chance(0.22);
        const b = {
          x: bx2, y: by2, w: bw, h: bh,
          color: PALETTE.building[ci], roof: PALETTE.roof[ci], tall,
          name: tall && named < towerNames.length ? towerNames[named++] : '',
        };
        buildings.push(b);
        colliders.push(b);
        if (rng.chance(0.5)) trees.push({ x: bx2 - 14, y: by2 + bh / 2, r: 10 });
      }
    }
  }
  // Landmarks are placed by hand so every job has a real address.
  const landmarks = [
    { id: 'garage', name: "Rosa's Garage", x: 232, y: 532, label: 'GARAGE' },
    { id: 'docks', name: 'Pier 9 Docks', x: 3300, y: 232, label: 'DOCKS' },
    { id: 'bank', name: 'Solmar National Bank', x: 1732, y: 832, label: 'BANK' },
    { id: 'stadium', name: 'Bay Stadium', x: 2632, y: 1732, label: 'STADIUM' },
    { id: 'marina', name: 'Grand Marina', x: 3232, y: 2032, label: 'MARINA' },
    { id: 'airport', name: 'Solmar Airfield', x: 532, y: 2232, label: 'AIRFIELD' },
    { id: 'mall', name: 'Sunset Plaza Mall', x: 1432, y: 1432, label: 'MALL' },
    { id: 'hospital', name: 'St. Mara Hospital', x: 2032, y: 532, label: 'HOSPITAL' },
  ];
  return {
    roadsV, roadsH, buildings, trees, parks, colliders, landmarks,
    beach: { x: 0, w: 200 },
    pier: { x: 0, y: 1150, w: 260, h: 26 },
    spawn: { x: 264, y: 564, angle: 0 },
  };
}

export function collideCircleRects(x, y, r, rects) {
  for (const b of rects) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx;
    const dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) return { hit: true, b, dx, dy, d: Math.sqrt(d2) || 0.001 };
  }
  return { hit: false };
}

export function resolveCircle(x, y, r, rects) {
  let nx = x;
  let ny = y;
  for (let iter = 0; iter < 3; iter++) {
    const c = collideCircleRects(nx, ny, r, rects);
    if (!c.hit) break;
    const push = r - c.d;
    nx += (c.dx / c.d) * push;
    ny += (c.dy / c.d) * push;
  }
  return { x: nx, y: ny };
}
