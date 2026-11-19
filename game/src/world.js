// World state + simulation: player on foot / in car, traffic, pedestrians, police,
// wanted level, combat, pickups, missions. Rendering and input live elsewhere.
import { WORLD, PLAYER, CAR, POLICE, WANTED, STEP, PALETTE } from './config.js';
import { createRandom, clamp, dist2, angleTo, angleDiff } from './random.js';
import { createCity, isRoad, nearestRoadPoint, resolveCircle, BLOCK, ROAD_W } from './city.js';
import { MISSIONS, CAR_TYPES } from './missions.js';

const TRAFFIC_N = 14, PED_N = 20, PARKED_N = 10;
const PICKUP_N = 8;

function randCar(rnd, x, y, type) {
  const t = type || rnd.pick(CAR_TYPES);
  return { x, y, angle: rnd.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]), speed: 0, type: t.type, name: t.name, color: t.color, speedMul: t.speed, health: CAR.health, isPlayer: false, isPolice: false, turnAt: 0, hitCooldown: 0 };
}
function randPed(rnd, x, y) {
  return { x, y, angle: rnd.range(0, Math.PI * 2), speed: rnd.range(40, 75), color: rnd.pick(['#e07a5f', '#7fa8c9', '#e6cc7a', '#8e7cc3', '#6a994e', '#f4f1e6']), flee: 0, bob: rnd.range(0, 6) };
}

export function createWorld(seed) {
  const rnd = createRandom(seed);
  const city = createCity(seed);
  const state = {
    seed, city, time: 0, cash: 0, ammo: 24, kills: 0, carsStolen: 0,
    player: { x: city.spawn.x, y: city.spawn.y, angle: 0, health: PLAYER.health, inCar: null, punchCd: 0, hurtCd: 0, arrest: 0 },
    cars: [], peds: [], police: [], bullets: [], enemyBullets: [], particles: [], pickups: [], enemies: [],
    wanted: 0, wantedTimer: 0, hiddenTimer: 0, lastCrime: -99,
    missionIndex: 0, missionActive: false, missionStep: 0, missionTimer: 0, missionMsg: '', missionMsgTimer: 0,
    message: '', messageTimer: 0, busted: false, wasted: false, completedAll: false,
    stats: { missionsDone: 0, distance: 0 },
  };
  function roadSpot() {
    const vx = state.city.roadsV[Math.floor(rnd.next() * state.city.roadsV.length)] + 32;
    const vy = state.city.roadsH[Math.floor(rnd.next() * state.city.roadsH.length)] + 32;
    return rnd.chance(0.5) ? { x: vx, y: state.player.y + rnd.range(-500, 500) } : { x: state.player.x + rnd.range(-500, 500), y: vy };
  }
  function spawnTraffic(n) {
    for (let i = 0; i < n; i++) {
      const p = roadSpot(); const c = randCar(rnd, clamp(p.x, 230, WORLD.width - 40), clamp(p.y, 230, WORLD.height - 40));
      c.speed = rnd.range(80, 130); state.cars.push(c);
    }
  }
  function spawnPeds(n) {
    for (let i = 0; i < n; i++) {
      const p = roadSpot();
      state.peds.push(randPed(rnd, clamp(p.x + rnd.range(-40, 40), 220, WORLD.width - 30), clamp(p.y + rnd.range(-40, 40), 220, WORLD.height - 30)));
    }
  }
  function spawnParked() {
    for (let i = 0; i < PARKED_N; i++) {
      const p = roadSpot(); const c = randCar(rnd, clamp(p.x, 230, WORLD.width - 40), clamp(p.y, 230, WORLD.height - 40));
      c.speed = 0; c.parked = true; state.cars.push(c);
    }
    // One guaranteed sports car near the Marina for the steal jobs.
    const sport = CAR_TYPES[1];
    state.cars.push({ x: 3200, y: 2000, angle: 0, speed: 0, type: 'sport', name: sport.name, color: sport.color, speedMul: 1.25, health: 100, isPlayer: false, isPolice: false, parked: true, turnAt: 0, hitCooldown: 0 });
  }
  function spawnPickups() {
    const kinds = ['cash', 'health', 'ammo'];
    for (let i = 0; i < PICKUP_N; i++) {
      const p = roadSpot();
      state.pickups.push({ x: clamp(p.x, 230, WORLD.width - 40), y: clamp(p.y, 230, WORLD.height - 40), kind: kinds[i % 3], value: kinds[i % 3] === 'cash' ? rnd.int(25, 100) : kinds[i % 3] === 'health' ? 30 : 12, bob: rnd.range(0, 6) });
    }
  }
  function reset() {
    state.time = 0; state.cash = 0; state.ammo = 24; state.kills = 0; state.carsStolen = 0;
    state.player = { x: city.spawn.x, y: city.spawn.y, angle: 0, health: PLAYER.health, inCar: null, punchCd: 0, hurtCd: 0, arrest: 0 };
    state.cars = []; state.peds = []; state.police = []; state.bullets = []; state.enemyBullets = []; state.particles = []; state.pickups = []; state.enemies = [];
    state.wanted = 0; state.wantedTimer = 0; state.hiddenTimer = 0;
    state.missionIndex = 0; state.missionActive = false; state.missionStep = 0; state.missionTimer = 0;
    state.message = ''; state.busted = false; state.wasted = false; state.completedAll = false;
    spawnTraffic(TRAFFIC_N); spawnPeds(PED_N); spawnParked(); spawnPickups();
  }
  reset();

  function say(msg, dur) { state.message = msg; state.messageTimer = dur || 3.5; }
  function addWanted(n) {
    if (state.time - state.lastCrime < 3 && n > 0) return;
    state.lastCrime = state.time; state.wanted = clamp(state.wanted + n, 0, WANTED.max); state.hiddenTimer = 0;
  }
  function burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) { const a = rnd.range(0, Math.PI * 2), s = rnd.range(speed * 0.3, speed); state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd.range(0.3, 0.8), max: 0.8, color, size: rnd.range(2, 5) }); }
  }
  function nearestCar(x, y, maxD) {
    let best = null, bd = maxD * maxD;
    for (const c of state.cars) { const d = dist2(x, y, c.x, c.y); if (d < bd) { bd = d; best = c; } }
    for (const c of state.police) { const d = dist2(x, y, c.x, c.y); if (d < bd) { bd = d; best = c; } }
    return best;
  }
  function enterCar(car) {
    if (!car) return false;
    state.player.inCar = car; car.isPlayer = true; car.parked = false;
    if (!car.wasStolen && !car.isPolice) {
      const wasParked = car.parkedBefore !== false;
      // Stealing a moving (occupied) car is a crime; a parked car is a quieter take.
      if (car.occupied) { addWanted(1); say('Car stolen! The cops were called.', 3); state.carsStolen++; }
    }
    car.occupied = false;
    return true;
  }
  function exitCar() {
    const car = state.player.inCar; if (!car) return;
    car.isPlayer = false; car.speed = 0;
    const px = state.player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 40;
    const py = state.player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 40;
    const fixed = resolveCircle(px, py, PLAYER.radius, city.colliders);
    state.player.x = fixed.x; state.player.y = fixed.y; state.player.inCar = null;
  }
  function startMission() {
    if (state.missionActive || state.completedAll) return false;
    const m = MISSIONS[state.missionIndex]; if (!m) return false;
    state.missionActive = true; state.missionStep = 0;
    beginStep(m.steps[0]); say(`JOB ${m.id}: ${m.title} — ${m.brief}`, 5); return true;
  }
  function beginStep(step) {
    state.missionTimer = step.time || 0;
    if (step.type === 'fight') {
      state.enemies = [];
      for (let i = 0; i < step.count; i++) state.enemies.push({ x: step.x + rnd.range(-120, 120), y: step.y + rnd.range(-80, 80), angle: 0, health: 60, speed: 110, shootCd: rnd.range(0.5, 1.5), color: '#c0392b' });
      say('Jackals incoming — clear them out!', 3);
    }
    if (step.type === 'escape') { state.wanted = Math.max(state.wanted, step.wanted || 2); state.hiddenTimer = 0; }
    if (step.type === 'steal') say('Find a sports car — press E beside one.', 3);
  }
  function completeStep() {
    const m = MISSIONS[state.missionIndex];
    state.missionStep++;
    if (state.missionStep >= m.steps.length) {
      state.cash += m.pay; state.stats.missionsDone++;
      say(`JOB DONE: ${m.title} — +$${m.pay}`, 4);
      state.missionActive = false; state.missionIndex++;
      if (state.missionIndex >= MISSIONS.length) { state.completedAll = true; say('KING OF SOLMAR — you own the Bay. Free roam unlocked!', 6); }
      return 'done';
    }
    beginStep(m.steps[state.missionStep]); return 'next';
  }
  function failMission(reason) {
    state.missionActive = false; state.missionStep = 0; state.enemies = [];
    say(`JOB FAILED: ${reason} — go back to Rosa's Garage to retry.`, 4);
  }
  function stepPlayer(dt, ctl) {
    const p = state.player;
    p.punchCd = Math.max(0, p.punchCd - dt); p.hurtCd = Math.max(0, p.hurtCd - dt);
    if (p.inCar) { stepCar(p.inCar, dt, ctl, true); return; }
    const mv = ctl.move; const len = Math.hypot(mv.x, mv.y) || 1;
    const sp = ctl.sprint ? PLAYER.sprint : PLAYER.walk;
    let nx = p.x + (mv.x / len) * sp * dt * (mv.x || mv.y ? 1 : 0);
    let ny = p.y + (mv.y / len) * sp * dt * (mv.x || mv.y ? 1 : 0);
    if (mv.x || mv.y) { p.angle = Math.atan2(mv.y, mv.x); state.stats.distance += sp * dt; }
    const fixed = resolveCircle(nx, ny, PLAYER.radius, city.colliders);
    p.x = clamp(fixed.x, 20, WORLD.width - 20); p.y = clamp(fixed.y, 20, WORLD.height - 20);
    // Aim at mouse for shooting.
    if (ctl.aimX !== undefined) p.angle = Math.atan2(ctl.aimY - p.y, ctl.aimX - p.x);
    if (ctl.shoot && p.punchCd <= 0) {
      p.punchCd = PLAYER.punchCooldown;
      if (state.ammo > 0) {
        state.ammo--; const a = p.angle;
        state.bullets.push({ x: p.x + Math.cos(a) * 22, y: p.y + Math.sin(a) * 22, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, life: 0.6, friendly: true });
        addWanted(0); // shooting in public draws heat via hit checks below
        if (state.wanted < 1 && state.time - state.lastCrime > 5) addWanted(1);
      } else {
        // Punch: damage nearest enemy / ped in range.
        for (const e of state.enemies) if (dist2(p.x, p.y, e.x, e.y) < PLAYER.punchRange * PLAYER.punchRange) { e.health -= PLAYER.punchDamage; burst(e.x, e.y, '#fff', 6, 120); }
      }
    }
    if (ctl.enter) {
      const car = nearestCar(p.x, p.y, 78);
      if (car && !car.isPolice) {
        car.occupied = !car.parked; car.parkedBefore = car.parked;
        enterCar(car);
        if (state.missionActive) {
          const step = MISSIONS[state.missionIndex].steps[state.missionStep];
          if (step && step.type === 'steal' && car.type === step.carType) completeStep();
        }
      } else if (dist2(p.x, p.y, 264, 564) < 90 * 90) {
        startMission();
      }
    }
  }
  function stepCar(car, dt, ctl, isPlayerCar) {
    const forward = ctl ? ctl.move.y * -1 : 0; // W = up = -y in move vector, so forward is -move.y
    const steer = ctl ? ctl.move.x : 0;
    if (isPlayerCar) {
      const accel = forward > 0 ? CAR.accel * car.speedMul : forward < 0 ? -CAR.brake : 0;
      car.speed += accel * dt;
      if (forward === 0) car.speed -= car.speed * CAR.drag * dt * 2;
      if (ctl.handbrake) car.speed -= car.speed * 3 * dt;
      car.speed = clamp(car.speed, -CAR.maxReverse * car.speedMul, CAR.maxSpeed * car.speedMul);
      const steerAmt = steer * CAR.grip * dt * clamp(Math.abs(car.speed) / 120, 0, 1) * (car.speed < 0 ? -1 : 1);
      car.angle += steerAmt;
      state.stats.distance += Math.abs(car.speed) * dt;
    } else if (car.isPolice) {
      // Police chase: steer toward the player, ram.
      const target = angleTo(car.x, car.y, state.player.inCar ? state.player.inCar.x : state.player.x, state.player.inCar ? state.player.inCar.y : state.player.y);
      car.angle += clamp(angleDiff(car.angle, target), -2.6 * dt, 2.6 * dt);
      car.speed = Math.min(car.speed + 500 * dt, POLICE.chaseSpeed);
    } else {
      // Traffic: follow the road grid, turn at intersections.
      car.speed = Math.min(car.speed + 60 * dt, 130);
      const onV = Math.abs(((car.x - 200) % BLOCK) - 32) < 6;
      const atX = ((car.x - 200) % BLOCK) < 40 || ((car.x - 200) % BLOCK) > BLOCK - 40;
      const atY = ((car.y - 200) % BLOCK) < 40 || ((car.y - 200) % BLOCK) > BLOCK - 40;
      if ((atX || atY) && state.time > car.turnAt) {
        car.turnAt = state.time + rnd.range(2, 6);
        if (rnd.chance(0.4)) car.angle += rnd.pick([-Math.PI / 2, Math.PI / 2]);
      }
      // Stay in lane: nudge toward road centre.
      const rp = nearestRoadPoint(car.x, car.y);
      car.x += (rp.x - car.x) * 0.4 * dt; car.y += (rp.y - car.y) * 0.4 * dt;
    }
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const fixed = resolveCircle(nx, ny, 20, city.colliders);
    if (fixed.x !== nx || fixed.y !== ny) { car.speed *= 0.4; if (isPlayerCar && Math.abs(car.speed) > 150) burst(car.x, car.y, '#ffb347', 8, 160); }
    car.x = clamp(fixed.x, 30, WORLD.width - 30); car.y = clamp(fixed.y, 30, WORLD.height - 30);
    car.hitCooldown = Math.max(0, car.hitCooldown - dt);
    // Player car vs traffic / police collisions.
    if (isPlayerCar) {
      for (const o of [...state.cars, ...state.police]) {
        if (o === car || o.isPlayer) continue;
        if (dist2(car.x, car.y, o.x, o.y) < 52 * 52 && car.hitCooldown <= 0) {
          car.hitCooldown = 0.5; car.health -= 4; o.speed *= 0.3; car.speed *= 0.6;
          burst((car.x + o.x) / 2, (car.y + o.y) / 2, '#ffd166', 8, 200);
          if (Math.abs(car.speed) > 200) addWanted(0);
        }
      }
      for (const pd of state.peds) if (dist2(car.x, car.y, pd.x, pd.y) < 40 * 40) { pd.flee = 3; }
    }
    if (car.health <= 0 && isPlayerCar) { burst(car.x, car.y, '#e5534b', 30, 320); exitCar(); car.health = 40; car.speed = 0; say('Your car is wrecked!', 3); }
  }
  function stepTraffic(dt) {
    for (const c of state.cars) {
      if (c.isPlayer || c.parked) continue;
      stepCar(c, dt, null, false);
      // Recycle far-away traffic near the player.
      const px = state.player.inCar ? state.player.inCar.x : state.player.x, py = state.player.inCar ? state.player.inCar.y : state.player.y;
      if (dist2(c.x, c.y, px, py) > 1100 * 1100) { const p = roadSpot(); c.x = clamp(p.x, 230, WORLD.width - 40); c.y = clamp(p.y, 230, WORLD.height - 40); c.speed = 100; }
    }
    for (const pd of state.peds) {
      if (pd.flee > 0) { pd.flee -= dt; pd.angle += 2.4 * dt; }
      else if (rnd.chance(0.004)) pd.angle += rnd.pick([-Math.PI / 2, Math.PI / 2, Math.PI]);
      let nx = pd.x + Math.cos(pd.angle) * pd.speed * (pd.flee > 0 ? 2 : 1) * dt;
      let ny = pd.y + Math.sin(pd.angle) * pd.speed * (pd.flee > 0 ? 2 : 1) * dt;
      if (isRoad(nx, ny) && rnd.chance(0.02)) pd.angle += Math.PI / 2;
      const f = resolveCircle(nx, ny, 8, city.colliders);
      pd.x = clamp(f.x, 210, WORLD.width - 20); pd.y = clamp(f.y, 210, WORLD.height - 20);
      // A speeding player car scares pedestrians.
      const px = state.player.inCar ? state.player.inCar.x : state.player.x, py = state.player.inCar ? state.player.inCar.y : state.player.y;
      if (state.player.inCar && dist2(pd.x, pd.y, px, py) < 90 * 90) pd.flee = 2;
    }
  }
  function stepPolice(dt) {
    const want = Math.min(state.wanted, 4);
    while (state.police.length < want) {
      const a = rnd.range(0, Math.PI * 2);
      const px = state.player.inCar ? state.player.inCar.x : state.player.x, py = state.player.inCar ? state.player.inCar.y : state.player.y;
      const p = nearestRoadPoint(clamp(px + Math.cos(a) * 520, 230, WORLD.width - 40), clamp(py + Math.sin(a) * 520, 230, WORLD.height - 40));
      const car = { x: p.x, y: p.y, angle: 0, speed: 200, type: 'police', name: 'Solmar PD Interceptor', color: PALETTE.police, speedMul: 1.1, health: 100, isPlayer: false, isPolice: true, turnAt: 0, hitCooldown: 0 };
      state.police.push(car);
    }
    while (state.police.length > want) state.police.pop();
    for (const pc of state.police) {
      stepCar(pc, dt, null, false);
      const px = state.player.inCar ? state.player.inCar.x : state.player.x, py = state.player.inCar ? state.player.inCar.y : state.player.y;
      const d = Math.sqrt(dist2(pc.x, pc.y, px, py));
      if (d < 46) {
        if (state.player.inCar) {
          state.player.inCar.health -= POLICE.ramDamage * dt * 1.5; pc.speed *= 0.7;
          if (rnd.chance(0.02)) burst(pc.x, pc.y, '#4fc3f7', 6, 140);
        } else {
          state.player.arrest += dt;
          if (state.player.arrest >= POLICE.arrestTime) { doBusted(); return; }
        }
      } else state.player.arrest = Math.max(0, state.player.arrest - dt * 2);
    }
    // Wanted decay: hidden (no police within 420) for a while.
    const nearPolice = state.police.some((pc) => dist2(pc.x, pc.y, state.player.x, state.player.y) < 420 * 420);
    if (state.wanted > 0 && !nearPolice) { state.hiddenTimer += dt; if (state.hiddenTimer > WANTED.decaySeconds) { state.wanted--; state.hiddenTimer = 0; say(state.wanted === 0 ? 'Heat is off. You are clean.' : `Wanted level dropped to ${state.wanted}.`, 2.5); } }
    else state.hiddenTimer = 0;
  }
  function doBusted() {
    state.busted = true; const fine = Math.min(state.cash, 200);
    state.cash -= fine; state.wanted = 0; state.police = []; state.player.arrest = 0;
    if (state.player.inCar) { state.player.inCar.isPlayer = false; state.player.inCar = null; }
    state.player.x = 2064; state.player.y = 564; state.player.health = PLAYER.health;
    say(`BUSTED! The PD took $${fine} and dropped you at the hospital.`, 4);
    if (state.missionActive) failMission('you got busted');
  }
  function doWasted() {
    state.wasted = true; state.player.health = PLAYER.health; state.wanted = 0; state.police = [];
    state.player.x = 2064; state.player.y = 564;
    say('WASTED! You woke up at St. Mara Hospital, $150 lighter.', 4);
    state.cash = Math.max(0, state.cash - 150);
    if (state.missionActive) failMission('you got wasted');
  }
  function stepCombat(dt) {
    for (const b of state.bullets) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; }
    state.bullets = state.bullets.filter((b) => b.life > 0);
    for (const b of state.enemyBullets) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; }
    state.enemyBullets = state.enemyBullets.filter((b) => b.life > 0);
    // Player bullets vs enemies / peds / police cars.
    for (const b of state.bullets) {
      for (const e of state.enemies) {
        if (e.health > 0 && dist2(b.x, b.y, e.x, e.y) < 20 * 20) { e.health -= 34; b.life = 0; burst(e.x, e.y, '#e5534b', 8, 160); if (e.health <= 0) { state.kills++; state.cash += 50; burst(e.x, e.y, '#f2c94c', 14, 200); } }
      }
      for (const pc of state.police) if (dist2(b.x, b.y, pc.x, pc.y) < 26 * 26) { pc.health -= 20; b.life = 0; addWanted(1); }
    }
    state.enemies = state.enemies.filter((e) => e.health > 0);
    for (const e of state.enemies) {
      const p = state.player;
      const tx = p.inCar ? p.inCar.x : p.x, ty = p.inCar ? p.inCar.y : p.y;
      e.angle = angleTo(e.x, e.y, tx, ty);
      e.x += Math.cos(e.angle) * e.speed * dt; e.y += Math.sin(e.angle) * e.speed * dt;
      e.shootCd -= dt;
      if (e.shootCd <= 0 && Math.sqrt(dist2(e.x, e.y, tx, ty)) < 420) {
        e.shootCd = rnd.range(0.9, 1.6);
        state.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(e.angle) * 520, vy: Math.sin(e.angle) * 520, life: 1.2, friendly: false });
      }
      if (dist2(e.x, e.y, tx, ty) < 34 * 34 && p.hurtCd <= 0) { p.hurtCd = 0.6; p.health -= 8; burst(p.x, p.y, '#e5534b', 6, 120); }
    }
    for (const b of state.enemyBullets) {
      const p = state.player; const tx = p.inCar ? p.inCar.x : p.x, ty = p.inCar ? p.inCar.y : p.y;
      if (dist2(b.x, b.y, tx, ty) < 22 * 22) { b.life = 0; if (p.inCar) p.inCar.health -= 6; else if (p.hurtCd <= 0) { p.hurtCd = 0.6; p.health -= 10; } }
    }
    if (state.player.health <= 0) doWasted();
    if (state.player.inCar && state.player.inCar.health <= 0) { /* handled in stepCar */ }
  }
  function stepPickups(dt) {
    const p = state.player; const px = p.inCar ? p.inCar.x : p.x, py = p.inCar ? p.inCar.y : p.y;
    for (const pk of state.pickups) {
      pk.bob += dt;
      if (dist2(pk.x, pk.y, px, py) < 30 * 30) {
        if (pk.kind === 'cash') { state.cash += pk.value; say(`+$${pk.value} found on the street.`, 2); }
        if (pk.kind === 'health') { p.health = Math.min(PLAYER.health, p.health + pk.value); say('Health +30.', 2); }
        if (pk.kind === 'ammo') { state.ammo += pk.value; say(`Ammo +${pk.value}.`, 2); }
        const np = roadSpot(); pk.x = clamp(np.x, 230, WORLD.width - 40); pk.y = clamp(np.y, 230, WORLD.height - 40);
        pk.kind = rnd.pick(['cash', 'health', 'ammo']); pk.value = pk.kind === 'cash' ? rnd.int(25, 100) : pk.kind === 'health' ? 30 : 12;
      }
    }
  }
  function stepMission(dt) {
    if (!state.missionActive) return;
    const m = MISSIONS[state.missionIndex]; if (!m) return;
    const step = m.steps[state.missionStep]; if (!step) return;
    const p = state.player; const px = p.inCar ? p.inCar.x : p.x, py = p.inCar ? p.inCar.y : p.y;
    if (step.time) {
      state.missionTimer -= dt;
      if (state.missionTimer <= 0) { failMission('time ran out'); return; }
    }
    if (step.type === 'goto' || step.type === 'timed') {
      if ((!step.inCar || p.inCar) && dist2(px, py, step.x, step.y) < step.radius * step.radius) completeStep();
    } else if (step.type === 'escape') {
      state.wanted = Math.max(state.wanted, step.wanted || 2);
      if (state.missionTimer <= 0) completeStep();
    } else if (step.type === 'fight') {
      if (state.enemies.length === 0) completeStep();
    }
  }
  function step(dt, ctl) {
    state.time += dt;
    state.busted = false; state.wasted = false;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    if (ctl.exitCar && state.player.inCar) exitCar();
    stepPlayer(dt, ctl);
    stepTraffic(dt);
    stepPolice(dt);
    stepCombat(dt);
    stepPickups(dt);
    stepMission(dt);
    for (const pt of state.particles) { pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt; }
    state.particles = state.particles.filter((pt) => pt.life > 0);
    // Keep traffic + peds topped up near the player.
    if (state.cars.filter((c) => !c.isPlayer && !c.parked).length < TRAFFIC_N) spawnTraffic(2);
    if (state.peds.length < PED_N) spawnPeds(2);
  }
  return { state, reset, step, say, startMission, enterCar, exitCar, addWanted,
    serialize() { return { cash: state.cash, ammo: state.ammo, missionIndex: state.missionIndex, missionsDone: state.stats.missionsDone, kills: state.kills, carsStolen: state.carsStolen, completedAll: state.completedAll }; },
    load(save) { if (!save) return; state.cash = save.cash || 0; state.ammo = save.ammo || 24; state.missionIndex = Math.min(save.missionIndex || 0, MISSIONS.length - 1); state.stats.missionsDone = save.missionsDone || 0; state.kills = save.kills || 0; state.carsStolen = save.carsStolen || 0; state.completedAll = !!save.completedAll; },
  };
}
export { MISSIONS };
