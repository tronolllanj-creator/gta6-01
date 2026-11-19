// Solmar Bay — tuning, palette and shared constants, rewritten for round 3.
// One job: numbers and colours. Nothing here simulates or draws.
export const STEP = 1 / 60;
export const WORLD = { width: 3600, height: 2600 };
export const VIEW = { width: 1280, height: 720 };
export const SAVE_KEY = 'solmar-bay.save.v1';
export const BEST_KEY = 'solmar-bay.best';

export const PLAYER = {
  radius: 14,
  walk: 230,
  sprint: 330,
  health: 100,
  punchDamage: 34,
  punchRange: 46,
  punchCooldown: 0.45,
};
export const CAR = {
  length: 58,
  width: 28,
  accel: 420,
  brake: 620,
  reverse: 220,
  maxSpeed: 560,
  maxReverse: 180,
  grip: 3.2,
  drag: 0.55,
  health: 100,
};
export const POLICE = { ramDamage: 9, arrestTime: 1.6, chaseSpeed: 500 };
export const WANTED = { decaySeconds: 22, max: 5 };
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const PALETTE = {
  backdrop: '#0b1020',
  water: '#1d7fa8',
  waterDeep: '#14607f',
  sand: '#e8d193',
  grass: '#3f9e57',
  grassDark: '#35854a',
  park: '#4caf6d',
  road: '#33373f',
  roadEdge: '#262a31',
  sidewalk: '#8d9299',
  sidewalkDark: '#7c8188',
  line: '#e8d44d',
  lineWhite: '#dfe3e6',
  building: ['#c96f4a', '#d9a05b', '#7fa8c9', '#b08968', '#e07a5f', '#8e7cc3', '#6a994e', '#e6cc7a'],
  roof: ['#a85438', '#b07f45', '#5f87a8', '#8a6a4d', '#b85c46', '#6d5a9e', '#527a3c', '#c2a95e'],
  glass: '#9fd8ef',
  text: '#f4f1e6',
  muted: '#b9c2cc',
  gold: '#f2c94c',
  red: '#e5534b',
  blue: '#4fc3f7',
  green: '#58d68d',
  panel: 'rgba(10,14,24,0.82)',
  player: '#ffd166',
  police: '#2f6fed',
  taxi: '#f7c948',
};
