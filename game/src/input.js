// Solmar Bay — keyboard and mouse input, rewritten for round 3.
// Held keys give a move vector; one-shot presses queue action flags that the
// main loop consumes once per frame.
export const ACTION_CONFIRM = 1, ACTION_PAUSE = 2, ACTION_ENTER = 4, ACTION_MISSION = 8, ACTION_MUTE = 16;

const KEY_UP = new Set(['ArrowUp', 'KeyW']);
const KEY_DOWN = new Set(['ArrowDown', 'KeyS']);
const KEY_LEFT = new Set(['ArrowLeft', 'KeyA']);
const KEY_RIGHT = new Set(['ArrowRight', 'KeyD']);

function held(keys, set) {
  // Any one of the set counts as held: arrows and WASD are interchangeable.
  for (const code of set) if (keys.has(code)) return true;
  return false;
}

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  const mouse = { x: 640, y: 360, down: false, clicked: false };

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    keys.add(e.code);
    if (e.code === 'Space' || e.code === 'Enter') actions |= ACTION_CONFIRM;
    if (e.code === 'KeyP' || e.code === 'Escape') actions |= ACTION_PAUSE;
    if (e.code === 'KeyE') actions |= ACTION_ENTER;
    if (e.code === 'KeyM') actions |= ACTION_MUTE;
    if (e.code === 'Tab') {
      actions |= ACTION_MISSION;
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    mouse.down = true;
    mouse.clicked = true;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', () => { mouse.down = false; });

  return {
    mouse,
    move() {
      const x = (held(keys, KEY_RIGHT) ? 1 : 0) - (held(keys, KEY_LEFT) ? 1 : 0);
      const y = (held(keys, KEY_DOWN) ? 1 : 0) - (held(keys, KEY_UP) ? 1 : 0);
      return { x, y };
    },
    sprint() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    handbrake() { return keys.has('Space'); },
    takeActions() {
      const t = actions;
      actions = 0;
      const c = mouse.clicked;
      mouse.clicked = false;
      return { flags: t, clicked: c };
    },
    takeClick() {
      const c = mouse.clicked;
      mouse.clicked = false;
      return c;
    },
  };
}
