// Screenshot scenes behind ?shot=start|play|chase|mission. Each stages a real game state
// (real city, real traffic, real police) then drives it forward with a simple autopilot,
// so every screenshot is a frame a player could actually be in.
import { SCREEN_TITLE, SCREEN_PLAY } from './render.js';

function autopilotDrive(world, dt) {
  const s = world.state, p = s.player;
  const wp = s.missionActive ? null : { x: 1732, y: 832 };
  const car = p.inCar;
  if (!car) return { move: { x: 0, y: 0 }, sprint: false, handbrake: false, enter: false, shoot: false, exitCar: false };
  // Steer toward the waypoint, mostly along roads.
  const target = wp || { x: car.x + Math.cos(car.angle) * 400, y: car.y + Math.sin(car.angle) * 400 };
  const want = Math.atan2(target.y - car.y, target.x - car.x);
  let diff = want - car.angle; while (diff > Math.PI) diff -= Math.PI * 2; while (diff < -Math.PI) diff += Math.PI * 2;
  return { move: { x: diff > 0.12 ? 1 : diff < -0.12 ? -1 : 0, y: -1 }, sprint: false, handbrake: false, enter: false, shoot: false, exitCar: false };
}
function enterNearestCar(world) {
  const s = world.state, p = s.player;
  let best = null, bd = 1e12;
  for (const c of s.cars) { const d = (c.x - p.x) ** 2 + (c.y - p.y) ** 2; if (d < bd) { bd = d; best = c; } }
  if (best) { p.x = best.x; p.y = best.y; world.enterCar(best); }
}
export function stageShot(name, world) {
  const s = world.state;
  world.reset();
  // Put the player downtown in a sports car for every driving scene.
  const placeCar = (x, y, angle) => {
    const c = s.cars.find((cc) => cc.type === 'sport') || s.cars[0];
    c.x = x; c.y = y; c.angle = angle; c.speed = 220; c.parked = false;
    s.player.x = x; s.player.y = y; world.enterCar(c);
  };
  if (name === 'start') {
    placeCar(1432, 832, 0);
    for (let i = 0; i < 3 * 60; i++) world.step(1 / 60, autopilotDrive(world, 1 / 60));
    if (!s.player.inCar) enterNearestCar(world);
    if (s.player.inCar) s.player.inCar.health = 100;
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'chase') {
    placeCar(1732, 1732, -Math.PI / 2);
    s.wanted = 3; s.cash = 1250; s.stats.missionsDone = 6; s.missionActive = true; s.missionIndex = 6; s.missionStep = 1; s.missionTimer = 55;
    for (let i = 0; i < 90; i++) world.step(1 / 60, autopilotDrive(world, 1 / 60));
    if (!s.player.inCar) enterNearestCar(world);
    if (s.player.inCar) s.player.inCar.health = 100;
    s.wanted = 3;
    return { screen: SCREEN_PLAY, best: 1250 };
  }
  if (name === 'mission') {
    // On foot at Pier 9, rivals closing in — the Dockside Deal fight.
    s.player.x = 3300; s.player.y = 564; s.player.inCar = null;
    s.missionActive = true; s.missionIndex = 4; s.missionStep = 0;
    s.enemies = [];
    for (let i = 0; i < 4; i++) s.enemies.push({ x: 3300 + (i - 2) * 45, y: 564 + (i % 2 ? 55 : -45), angle: 0, health: 60, speed: 90, shootCd: 1, color: '#c0392b' });
    s.ammo = 24; s.cash = 800; s.stats.missionsDone = 4;
    for (let i = 0; i < 1 * 60; i++) world.step(1 / 60, { move: { x: 0, y: 0 }, sprint: false, handbrake: false, enter: false, shoot: false, exitCar: false });
    return { screen: SCREEN_PLAY, best: 800 };
  }
  // play (default): mid-city drive, mission 3 courier run, traffic + peds around.
  placeCar(232, 832, 0);
  s.missionActive = true; s.missionIndex = 2; s.missionStep = 0; s.missionTimer = 70; s.cash = 650; s.stats.missionsDone = 2;
  for (let i = 0; i < 3 * 60; i++) world.step(1 / 60, autopilotDrive(world, 1 / 60));
  if (!s.player.inCar) enterNearestCar(world);
  if (s.player.inCar) s.player.inCar.health = 100;
  return { screen: SCREEN_PLAY, best: 650 };
}
