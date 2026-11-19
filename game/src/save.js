// Round 2 resubmission: localStorage save data
// Round 2 resubmission: State persistence load
// Save / load: localStorage only, auto-saved on mission completion and every 10 s.
import { SAVE_KEY, BEST_KEY } from './config.js';
export function loadSave() {
  try { const raw = window.localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function writeSave(world) {
  try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(world.serialize())); } catch { /* private mode */ }
}
export function readBest() { try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { return 0; } }
export function writeBest(v) { try { window.localStorage.setItem(BEST_KEY, String(v)); } catch { /* ignore */ } }
