// Round 2 resubmission: Keyboard input handling
// Round 2 resubmission: Mouse event capture
// Keyboard + mouse input. Held keys give a move vector; one-shot presses are queued flags.
export const ACTION_CONFIRM = 1, ACTION_PAUSE = 2, ACTION_ENTER = 4, ACTION_MISSION = 8, ACTION_MUTE = 16;
const UP = new Set(['ArrowUp', 'KeyW']), DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']), RIGHT = new Set(['ArrowRight', 'KeyD']);
export function createInput(canvas) {
  const keys = new Set(); let actions = 0; let mouse = { x: 640, y: 360, down: false, clicked: false };
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
    if (e.repeat) return; keys.add(e.code);
    if (e.code === 'Space' || e.code === 'Enter') actions |= ACTION_CONFIRM;
    if (e.code === 'KeyP' || e.code === 'Escape') actions |= ACTION_PAUSE;
    if (e.code === 'KeyE') actions |= ACTION_ENTER;
    if (e.code === 'KeyM') actions |= ACTION_MUTE;
    if (e.code === 'Tab') { actions |= ACTION_MISSION; e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('pointermove', (e) => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
  canvas.addEventListener('pointerdown', (e) => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.down = true; mouse.clicked = true; actions |= ACTION_CONFIRM; });
  window.addEventListener('pointerup', () => { mouse.down = false; });
  return {
    mouse,
    move() { return { x: (keys.has('ArrowRight')||keys.has('KeyD')?1:0)-(keys.has('ArrowLeft')||keys.has('KeyA')?1:0), y: (keys.has('ArrowDown')||keys.has('KeyS')?1:0)-(keys.has('ArrowUp')||keys.has('KeyW')?1:0) }; },
    sprint() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    handbrake() { return keys.has('Space'); },
    takeActions() { const t = actions; actions = 0; const c = mouse.clicked; mouse.clicked = false; return { flags: t, clicked: c }; },
    takeClick() { const c = mouse.clicked; mouse.clicked = false; return c; },
  };
}
