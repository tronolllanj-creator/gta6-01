// Round 2 resubmission: Application boot sequence
// Round 2 resubmission: Main game loop
// Boot + loop: fixed 1/60 s steps, screens title / play / paused / jobs / over,
// camera follows the player, save auto-writes, ?shot= stages a screenshot scene.
import { STEP, VIEW } from './config.js';
import { createWorld } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_ENTER, ACTION_MISSION, ACTION_MUTE, createInput } from './input.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER, SCREEN_JOBS } from './render.js';
import { createAudio } from './audio.js';
import { loadSave, writeSave, readBest, writeBest } from './save.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261119;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(seed);
const renderer = createRenderer(canvas);
const audio = createAudio();
const saved = loadSave();
if (saved) world.load(saved);
let best = Math.max(readBest(), saved ? saved.cash || 0 : 0);

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    const p = world.state.player; const px = p.inCar ? p.inCar.x : p.x, py = p.inCar ? p.inCar.y : p.y;
    renderer.draw(world.state, scene.screen, scene.best, audio, { x: px - VIEW.width / 2, y: py - VIEW.height / 2 });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0, last = performance.now(), saveTimer = 0, sirenTimer = 0;
  const camera = { x: 0, y: 0 };
  function announce(m) { status.textContent = m; }
  function updateCamera(dt) {
    const p = world.state.player; const px = p.inCar ? p.inCar.x : p.x, py = p.inCar ? p.inCar.y : p.y;
    const tx = px - VIEW.width / 2, ty = py - VIEW.height / 2;
    camera.x += (tx - camera.x) * Math.min(1, dt * 5); camera.y += (ty - camera.y) * Math.min(1, dt * 5);
  }
  function stepGame(dt, acts, clicked) {
    if (screen === SCREEN_JOBS) { if (acts.flags & ACTION_MISSION) screen = SCREEN_PLAY; return; }
    if (acts.flags & ACTION_MUTE) { const m = audio.toggleMute(); world.say(m ? 'Sound off.' : 'Sound on.', 2); }
    if (acts.flags & ACTION_MISSION) { screen = SCREEN_JOBS; return; }
    if (acts.flags & ACTION_PAUSE) { screen = SCREEN_PAUSED; return; }
    const p = world.state.player;
    const rect = canvas.getBoundingClientRect();
    const aimX = camera.x + input.mouse.x * (VIEW.width / rect.width);
    const aimY = camera.y + input.mouse.y * (VIEW.height / rect.height);
    const inCar = !!p.inCar;
    const ctl = { move: input.move(), sprint: input.sprint(), handbrake: input.handbrake(),
      enter: !!(acts.flags & ACTION_ENTER) && !inCar, exitCar: !!(acts.flags & ACTION_ENTER) && inCar,
      shoot: (clicked || input.mouse.down) && !inCar, aimX, aimY };
    world.step(dt, ctl);
    if (world.state.busted || world.state.wasted) screen = SCREEN_OVER;
    if (world.state.cash > best) { best = world.state.cash; writeBest(best); }
    saveTimer += dt; if (saveTimer > 10) { saveTimer = 0; writeSave(world); }
    sirenTimer += dt; if (world.state.wanted > 0 && sirenTimer > 0.9) { sirenTimer = 0; audio.sirenBurst(world.state.time); }
    audio.update(dt, p.inCar ? Math.abs(p.inCar.speed) / 560 : 0, !!p.inCar, world.state.wanted);
    updateCamera(dt);
  }
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME); last = now;
    const acts = input.takeActions();
    const clicked = acts.clicked;
    if (screen === SCREEN_TITLE) {
      if (acts.flags & ACTION_CONFIRM || clicked) { audio.unlock(); screen = SCREEN_PLAY; announce('Playing Solmar Bay. Get to Rosa\'s Garage — press E there to start a job.'); }
      updateCamera(1 / 60);
    } else if (screen === SCREEN_OVER) {
      if (acts.flags & ACTION_CONFIRM || clicked) { world.state.player.health = 100; screen = SCREEN_PLAY; }
    } else if (screen === SCREEN_PAUSED) {
      if (acts.flags & ACTION_PAUSE || acts.flags & ACTION_CONFIRM) screen = SCREEN_PLAY;
    } else {
      let first = true;
      while (accumulator >= STEP) { stepGame(STEP, first ? acts : { flags: 0, clicked: false }, first ? clicked : false); first = false; accumulator -= STEP; if (screen !== SCREEN_PLAY && screen !== SCREEN_JOBS) { accumulator = 0; break; } }
    }
    renderer.draw(world.state, screen, best, audio, camera);
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && screen === SCREEN_PLAY) screen = SCREEN_PAUSED; });
  announce('Solmar Bay. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
