// Solmar Bay — save data, rewritten for round 3.
// localStorage only. Progress auto-saves during play; a private window just
// means nothing persists, never a crash.
import { SAVE_KEY, BEST_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeSave(world) {
  try {
    // serialize() is the world's own snapshot: cash, ammo, jobs, kills.
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(world.serialize()));
  } catch {
    /* private mode: the save simply does not stick */
  }
}

export function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function writeBest(v) {
  try {
    window.localStorage.setItem(BEST_KEY, String(v));
  } catch {
    /* ignore */
  }
}
