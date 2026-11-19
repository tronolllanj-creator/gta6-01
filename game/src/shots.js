// Solmar Bay — screenshot scenes, rewritten for round 3.
// The scenes behind ?shot=start|play|chase|mission. Each stages a real game
// state (the real city, real traffic, real police) and drives it forward
// with a simple autopilot, so every screenshot is a frame a player could
// actually be in — never a mock-up.
import { SCREEN_TITLE, SCREEN_PLAY } from './render.js';

function autoDrive(world) {
  const s = world.state;
  const p = s.player;
  const car = p.inCar;
  if (!car) {
    return { move: { x: 0, y: 0 }, sprint: false, handbrake: false, enter: false, shoot: false, exitCar: false };
  }
  // Cruise toward the Bank when free, otherwise hold the current heading.
  const wp = s.missionActive ? null : { x: 1732, y: 832 };
  const target = wp || { x: car.x + Math.cos(car.angle) * 400, y: car.y + Math.sin(car.angle) * 400 };
  const want = Math.atan2(target.y - car.y, target.x - car.x);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = diff > 0.12 ? 1 : diff < -0.12 ? -1 : 0;
  return { move: { x: steer, y: -1 }, sprint: false, handbrake: false, enter: false, shoot: false, exitCar: false };
}

function hopInClosest(world) {
  const s = world.state;
  const p = s.player;
  let best = null;
  let bd = 1e12;
  for (const c of s.cars) {
    const d = (c.x - p.x) ** 2 + (c.y - p.y) ** 2;
    if (d < bd) { bd = d; best = c; }
  }
  if (best) {
    p.x = best.x;
    p.y = best.y;
    world.enterCar(best);
  }
}

export function stageShot(name, world) {
  const s = world.state;
  world.reset();
  // Every driving scene starts the player downtown in a sports car.
  const seatDriver = (x, y, angle) => {
    const c = s.cars.find((cc) => cc.type === 'sport') || s.cars[0];
    c.x = x;
    c.y = y;
    c.angle = angle;
    c.speed = 220;
    c.parked = false;
    s.player.x = x;
    s.player.y = y;
    world.enterCar(c);
  };
  const driveFor = (seconds) => {
    // Roll the autopilot forward; if the driver lost the car, climb back in.
    for (let i = 0; i < seconds * 60; i++) world.step(1 / 60, autoDrive(world));
    if (!s.player.inCar) hopInClosest(world);
    if (s.player.inCar) s.player.inCar.health = 100;
  };
  if (name === 'start') {
    seatDriver(1432, 832, 0);
    driveFor(3);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'chase') {
    seatDriver(1732, 1732, -Math.PI / 2);
    s.wanted = 3;
    s.cash = 1250;
    s.stats.missionsDone = 6;
    s.missionActive = true;
    s.missionIndex = 6;
    s.missionStep = 1;
    s.missionTimer = 55;
    for (let i = 0; i < 90; i++) world.step(1 / 60, autoDrive(world));
    if (!s.player.inCar) hopInClosest(world);
    if (s.player.inCar) s.player.inCar.health = 100;
    s.wanted = 3;
    return { screen: SCREEN_PLAY, best: 1250 };
  }
  if (name === 'mission') {
    // On foot at Pier 9, rivals closing in — the Dockside Deal fight.
    s.player.x = 3300;
    s.player.y = 564;
    s.player.inCar = null;
    s.missionActive = true;
    s.missionIndex = 4;
    s.missionStep = 0;
    s.enemies = [];
    for (let i = 0; i < 4; i++) {
      s.enemies.push({
        x: 3300 + (i - 2) * 45, y: 564 + (i % 2 ? 55 : -45),
        angle: 0, health: 60, speed: 90, shootCd: 1, color: '#c0392b',
      });
    }
    s.ammo = 24;
    s.cash = 800;
    s.stats.missionsDone = 4;
    for (let i = 0; i < 1 * 60; i++) {
      world.step(1 / 60, { move: { x: 0, y: 0 }, sprint: false, handbrake: false, enter: false, shoot: false, exitCar: false });
    }
    return { screen: SCREEN_PLAY, best: 800 };
  }
  // play (default): a mid-city drive on the courier run, traffic and peds around.
  seatDriver(232, 832, 0);
  s.missionActive = true;
  s.missionIndex = 2;
  s.missionStep = 0;
  s.missionTimer = 70;
  s.cash = 650;
  s.stats.missionsDone = 2;
  driveFor(3);
  return { screen: SCREEN_PLAY, best: 650 };
}
