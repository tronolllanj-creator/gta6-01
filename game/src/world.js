// Solmar Bay — simulation core, rewritten for round 3.
// One job: the world tick. The player on foot or behind the wheel, street
// traffic, pedestrians, police heat, combat, street loot and the eight jobs.
// Drawing, input and sound each live in their own file.
// Round 3 fix: an escape leg completes when its survive-timer runs out —
// the old code failed the job at that exact moment instead.
import { WORLD, PLAYER, CAR, POLICE, WANTED, PALETTE } from './config.js';
import { createRandom, clamp, dist2, angleTo, angleDiff } from './random.js';
import { createCity, isRoad, nearestRoadPoint, resolveCircle, BLOCK, ROAD_W } from './city.js';
import { MISSIONS, CAR_TYPES } from './missions.js';

const MOVING_CARS = 14;
const WALKERS = 20;
const PARKED_CARS = 10;
const STREET_LOOT = 8;
const GARAGE_X = 264;
const GARAGE_Y = 564;
const HOSPITAL_X = 2064;
const HOSPITAL_Y = 564;
const MARINA_SPORT_X = 3200;
const MARINA_SPORT_Y = 2000;

const PED_SHIRTS = ['#e07a5f', '#7fa8c9', '#e6cc7a', '#8e7cc3', '#6a994e', '#f4f1e6'];

function buildCar(rng, x, y, forced) {
  const spec = forced || rng.pick(CAR_TYPES);
  const headings = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  return {
    x, y, angle: rng.pick(headings), speed: 0,
    type: spec.type, name: spec.name, color: spec.color, speedMul: spec.speed,
    health: CAR.health, isPlayer: false, isPolice: false, turnAt: 0, hitCooldown: 0,
  };
}

function buildPed(rng, x, y) {
  return {
    x, y, angle: rng.range(0, Math.PI * 2), speed: rng.range(40, 75),
    color: rng.pick(PED_SHIRTS), flee: 0, bob: rng.range(0, 6),
  };
}

export function createWorld(seed) {
  const rng = createRandom(seed);
  const city = createCity(seed);
  const sim = {
    seed, city, time: 0, cash: 0, ammo: 24, kills: 0, carsStolen: 0,
    player: {
      x: city.spawn.x, y: city.spawn.y, angle: 0, health: PLAYER.health,
      inCar: null, punchCd: 0, hurtCd: 0, arrest: 0,
    },
    cars: [], peds: [], police: [], bullets: [], enemyBullets: [],
    particles: [], pickups: [], enemies: [],
    wanted: 0, wantedTimer: 0, hiddenTimer: 0, lastCrime: -99,
    missionIndex: 0, missionActive: false, missionStep: 0, missionTimer: 0,
    missionMsg: '', missionMsgTimer: 0, message: '', messageTimer: 0,
    busted: false, wasted: false, completedAll: false,
    stats: { missionsDone: 0, distance: 0 },
  };

  function pickRoadSpot() {
    const laneV = city.roadsV[Math.floor(rng.next() * city.roadsV.length)] + 32;
    const laneH = city.roadsH[Math.floor(rng.next() * city.roadsH.length)] + 32;
    if (rng.chance(0.5)) return { x: laneV, y: sim.player.y + rng.range(-500, 500) };
    return { x: sim.player.x + rng.range(-500, 500), y: laneH };
  }

  function fillTraffic(n) {
    for (let i = 0; i < n; i++) {
      const spot = pickRoadSpot();
      const car = buildCar(rng, clamp(spot.x, 230, WORLD.width - 40), clamp(spot.y, 230, WORLD.height - 40));
      car.speed = rng.range(80, 130);
      sim.cars.push(car);
    }
  }

  function fillPeds(n) {
    for (let i = 0; i < n; i++) {
      const spot = pickRoadSpot();
      const px = clamp(spot.x + rng.range(-40, 40), 220, WORLD.width - 30);
      const py = clamp(spot.y + rng.range(-40, 40), 220, WORLD.height - 30);
      sim.peds.push(buildPed(rng, px, py));
    }
  }

  function parkCars() {
    for (let i = 0; i < PARKED_CARS; i++) {
      const spot = pickRoadSpot();
      const car = buildCar(rng, clamp(spot.x, 230, WORLD.width - 40), clamp(spot.y, 230, WORLD.height - 40));
      car.speed = 0;
      car.parked = true;
      sim.cars.push(car);
    }
    // One guaranteed sports car by the Marina, for the steal jobs.
    const gt = CAR_TYPES[1];
    sim.cars.push({
      x: MARINA_SPORT_X, y: MARINA_SPORT_Y, angle: 0, speed: 0, type: 'sport',
      name: gt.name, color: gt.color, speedMul: 1.25, health: 100,
      isPlayer: false, isPolice: false, parked: true, turnAt: 0, hitCooldown: 0,
    });
  }

  function scatterPickups() {
    const kinds = ['cash', 'health', 'ammo'];
    for (let i = 0; i < STREET_LOOT; i++) {
      const spot = pickRoadSpot();
      const kind = kinds[i % 3];
      const worth = kind === 'cash' ? rng.int(25, 100) : kind === 'health' ? 30 : 12;
      sim.pickups.push({
        x: clamp(spot.x, 230, WORLD.width - 40), y: clamp(spot.y, 230, WORLD.height - 40),
        kind, value: worth, bob: rng.range(0, 6),
      });
    }
  }

  function resetSim() {
    sim.time = 0; sim.cash = 0; sim.ammo = 24; sim.kills = 0; sim.carsStolen = 0;
    sim.player = {
      x: city.spawn.x, y: city.spawn.y, angle: 0, health: PLAYER.health,
      inCar: null, punchCd: 0, hurtCd: 0, arrest: 0,
    };
    sim.cars = []; sim.peds = []; sim.police = []; sim.bullets = [];
    sim.enemyBullets = []; sim.particles = []; sim.pickups = []; sim.enemies = [];
    sim.wanted = 0; sim.wantedTimer = 0; sim.hiddenTimer = 0;
    sim.missionIndex = 0; sim.missionActive = false; sim.missionStep = 0; sim.missionTimer = 0;
    sim.message = ''; sim.busted = false; sim.wasted = false; sim.completedAll = false;
    fillTraffic(MOVING_CARS); fillPeds(WALKERS); parkCars(); scatterPickups();
  }
  resetSim();

  function announce(msg, dur) { sim.message = msg; sim.messageTimer = dur || 3.5; }

  function raiseHeat(n) {
    if (sim.time - sim.lastCrime < 3 && n > 0) return;
    sim.lastCrime = sim.time;
    sim.wanted = clamp(sim.wanted + n, 0, WANTED.max);
    sim.hiddenTimer = 0;
  }

  function sparks(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = rng.range(0, Math.PI * 2);
      const s = rng.range(speed * 0.3, speed);
      sim.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: rng.range(0.3, 0.8), max: 0.8, color, size: rng.range(2, 5),
      });
    }
  }

  function closestCar(x, y, maxD) {
    let best = null;
    let bd = maxD * maxD;
    for (const c of sim.cars) {
      const d = dist2(x, y, c.x, c.y);
      if (d < bd) { bd = d; best = c; }
    }
    for (const c of sim.police) {
      const d = dist2(x, y, c.x, c.y);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  function takeCar(car) {
    if (!car) return false;
    sim.player.inCar = car;
    car.isPlayer = true;
    car.parked = false;
    if (!car.wasStolen && !car.isPolice && car.occupied) {
      raiseHeat(1);
      announce('Car stolen! The cops were called.', 3);
      sim.carsStolen++;
    }
    car.occupied = false;
    return true;
  }

  function leaveCar() {
    const car = sim.player.inCar;
    if (!car) return;
    car.isPlayer = false;
    car.speed = 0;
    const outX = car.x + Math.cos(car.angle + Math.PI / 2) * 40;
    const outY = car.y + Math.sin(car.angle + Math.PI / 2) * 40;
    const fixed = resolveCircle(outX, outY, PLAYER.radius, city.colliders);
    sim.player.x = fixed.x;
    sim.player.y = fixed.y;
    sim.player.inCar = null;
  }

  function beginJob() {
    if (sim.missionActive || sim.completedAll) return false;
    const job = MISSIONS[sim.missionIndex];
    if (!job) return false;
    sim.missionActive = true;
    sim.missionStep = 0;
    openStep(job.steps[0]);
    announce(`JOB ${job.id}: ${job.title} — ${job.brief}`, 5);
    return true;
  }

  function openStep(leg) {
    sim.missionTimer = leg.time || 0;
    if (leg.type === 'fight') {
      sim.enemies = [];
      for (let i = 0; i < leg.count; i++) {
        sim.enemies.push({
          x: leg.x + rng.range(-120, 120), y: leg.y + rng.range(-80, 80),
          angle: 0, health: 60, speed: 110, shootCd: rng.range(0.5, 1.5), color: '#c0392b',
        });
      }
      announce('Jackals incoming — clear them out!', 3);
    }
    if (leg.type === 'escape') {
      sim.wanted = Math.max(sim.wanted, leg.wanted || 2);
      sim.hiddenTimer = 0;
    }
    if (leg.type === 'steal') announce('Find a sports car — press E beside one.', 3);
  }

  function finishStep() {
    const job = MISSIONS[sim.missionIndex];
    sim.missionStep++;
    if (sim.missionStep >= job.steps.length) {
      sim.cash += job.pay;
      sim.stats.missionsDone++;
      announce(`JOB DONE: ${job.title} — +$${job.pay}`, 4);
      sim.missionActive = false;
      sim.missionIndex++;
      if (sim.missionIndex >= MISSIONS.length) {
        sim.completedAll = true;
        announce('KING OF SOLMAR — you own the Bay. Free roam unlocked!', 6);
      }
      return 'done';
    }
    openStep(job.steps[sim.missionStep]);
    return 'next';
  }

  function dropJob(reason) {
    sim.missionActive = false;
    sim.missionStep = 0;
    sim.enemies = [];
    announce(`JOB FAILED: ${reason} — go back to Rosa's Garage to retry.`, 4);
  }

  function movePlayer(dt, ctl) {
    const p = sim.player;
    p.punchCd = Math.max(0, p.punchCd - dt);
    p.hurtCd = Math.max(0, p.hurtCd - dt);
    if (p.inCar) { driveCar(p.inCar, dt, ctl, true); return; }
    const mv = ctl.move;
    const len = Math.hypot(mv.x, mv.y) || 1;
    const moving = mv.x || mv.y ? 1 : 0;
    const pace = ctl.sprint ? PLAYER.sprint : PLAYER.walk;
    const nx = p.x + (mv.x / len) * pace * dt * moving;
    const ny = p.y + (mv.y / len) * pace * dt * moving;
    if (moving) {
      p.angle = Math.atan2(mv.y, mv.x);
      sim.stats.distance += pace * dt;
    }
    const fixed = resolveCircle(nx, ny, PLAYER.radius, city.colliders);
    p.x = clamp(fixed.x, 20, WORLD.width - 20);
    p.y = clamp(fixed.y, 20, WORLD.height - 20);
    // Aim at the mouse while shooting.
    if (ctl.aimX !== undefined) p.angle = Math.atan2(ctl.aimY - p.y, ctl.aimX - p.x);
    if (ctl.shoot && p.punchCd <= 0) {
      p.punchCd = PLAYER.punchCooldown;
      if (sim.ammo > 0) {
        sim.ammo--;
        const a = p.angle;
        sim.bullets.push({
          x: p.x + Math.cos(a) * 22, y: p.y + Math.sin(a) * 22,
          vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, life: 0.6, friendly: true,
        });
        if (sim.wanted < 1 && sim.time - sim.lastCrime > 5) raiseHeat(1);
      } else {
        // Dry pistol: punch whatever is in reach.
        for (const e of sim.enemies) {
          if (dist2(p.x, p.y, e.x, e.y) < PLAYER.punchRange * PLAYER.punchRange) {
            e.health -= PLAYER.punchDamage;
            sparks(e.x, e.y, '#fff', 6, 120);
          }
        }
      }
    }
    if (ctl.enter) {
      const car = closestCar(p.x, p.y, 78);
      if (car && !car.isPolice) {
        car.occupied = !car.parked;
        car.parkedBefore = car.parked;
        takeCar(car);
        if (sim.missionActive) {
          const leg = MISSIONS[sim.missionIndex].steps[sim.missionStep];
          if (leg && leg.type === 'steal' && car.type === leg.carType) finishStep();
        }
      } else if (dist2(p.x, p.y, GARAGE_X, GARAGE_Y) < 90 * 90) {
        beginJob();
      }
    }
  }

  function driveCar(car, dt, ctl, mine) {
    const forward = ctl ? ctl.move.y * -1 : 0;
    const steer = ctl ? ctl.move.x : 0;
    if (mine) {
      const gas = forward > 0 ? CAR.accel * car.speedMul : forward < 0 ? -CAR.brake : 0;
      car.speed += gas * dt;
      if (forward === 0) car.speed -= car.speed * CAR.drag * dt * 2;
      if (ctl.handbrake) car.speed -= car.speed * 3 * dt;
      car.speed = clamp(car.speed, -CAR.maxReverse * car.speedMul, CAR.maxSpeed * car.speedMul);
      const turn = steer * CAR.grip * dt * clamp(Math.abs(car.speed) / 120, 0, 1) * (car.speed < 0 ? -1 : 1);
      car.angle += turn;
      sim.stats.distance += Math.abs(car.speed) * dt;
    } else if (car.isPolice) {
      // Interceptor: point at the player and close in.
      const px = sim.player.inCar ? sim.player.inCar.x : sim.player.x;
      const py = sim.player.inCar ? sim.player.inCar.y : sim.player.y;
      const target = angleTo(car.x, car.y, px, py);
      car.angle += clamp(angleDiff(car.angle, target), -2.6 * dt, 2.6 * dt);
      car.speed = Math.min(car.speed + 500 * dt, POLICE.chaseSpeed);
    } else {
      // Street traffic: hold speed, turn at crossings, stay in lane.
      car.speed = Math.min(car.speed + 60 * dt, 130);
      const alongX = ((car.x - 200) % BLOCK) < 40 || ((car.x - 200) % BLOCK) > BLOCK - 40;
      const alongY = ((car.y - 200) % BLOCK) < 40 || ((car.y - 200) % BLOCK) > BLOCK - 40;
      if ((alongX || alongY) && sim.time > car.turnAt) {
        car.turnAt = sim.time + rng.range(2, 6);
        if (rng.chance(0.4)) car.angle += rng.pick([-Math.PI / 2, Math.PI / 2]);
      }
      const lane = nearestRoadPoint(car.x, car.y);
      car.x += (lane.x - car.x) * 0.4 * dt;
      car.y += (lane.y - car.y) * 0.4 * dt;
    }
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    const fixed = resolveCircle(nx, ny, 20, city.colliders);
    if (fixed.x !== nx || fixed.y !== ny) {
      car.speed *= 0.4;
      if (mine && Math.abs(car.speed) > 150) sparks(car.x, car.y, '#ffb347', 8, 160);
    }
    car.x = clamp(fixed.x, 30, WORLD.width - 30);
    car.y = clamp(fixed.y, 30, WORLD.height - 30);
    car.hitCooldown = Math.max(0, car.hitCooldown - dt);
    if (mine) {
      for (const o of [...sim.cars, ...sim.police]) {
        if (o === car || o.isPlayer) continue;
        if (dist2(car.x, car.y, o.x, o.y) < 52 * 52 && car.hitCooldown <= 0) {
          car.hitCooldown = 0.5;
          car.health -= 4;
          o.speed *= 0.3;
          car.speed *= 0.6;
          sparks((car.x + o.x) / 2, (car.y + o.y) / 2, '#ffd166', 8, 200);
          if (Math.abs(car.speed) > 200) raiseHeat(0);
        }
      }
      for (const pd of sim.peds) {
        if (dist2(car.x, car.y, pd.x, pd.y) < 40 * 40) pd.flee = 3;
      }
    }
    if (car.health <= 0 && mine) {
      sparks(car.x, car.y, '#e5534b', 30, 320);
      leaveCar();
      car.health = 40;
      car.speed = 0;
      announce('Your car is wrecked!', 3);
    }
  }

  function moveTraffic(dt) {
    const px = sim.player.inCar ? sim.player.inCar.x : sim.player.x;
    const py = sim.player.inCar ? sim.player.inCar.y : sim.player.y;
    for (const c of sim.cars) {
      if (c.isPlayer || c.parked) continue;
      driveCar(c, dt, null, false);
      // Recycle traffic that drifted far from the player.
      if (dist2(c.x, c.y, px, py) > 1100 * 1100) {
        const spot = pickRoadSpot();
        c.x = clamp(spot.x, 230, WORLD.width - 40);
        c.y = clamp(spot.y, 230, WORLD.height - 40);
        c.speed = 100;
      }
    }
    for (const pd of sim.peds) {
      if (pd.flee > 0) {
        pd.flee -= dt;
        pd.angle += 2.4 * dt;
      } else if (rng.chance(0.004)) {
        pd.angle += rng.pick([-Math.PI / 2, Math.PI / 2, Math.PI]);
      }
      const quick = pd.flee > 0 ? 2 : 1;
      const nx = pd.x + Math.cos(pd.angle) * pd.speed * quick * dt;
      const ny = pd.y + Math.sin(pd.angle) * pd.speed * quick * dt;
      if (isRoad(nx, ny) && rng.chance(0.02)) pd.angle += Math.PI / 2;
      const f = resolveCircle(nx, ny, 8, city.colliders);
      pd.x = clamp(f.x, 210, WORLD.width - 20);
      pd.y = clamp(f.y, 210, WORLD.height - 20);
      if (sim.player.inCar && dist2(pd.x, pd.y, px, py) < 90 * 90) pd.flee = 2;
    }
  }

  function runPolice(dt) {
    const want = Math.min(sim.wanted, 4);
    while (sim.police.length < want) {
      const a = rng.range(0, Math.PI * 2);
      const px = sim.player.inCar ? sim.player.inCar.x : sim.player.x;
      const py = sim.player.inCar ? sim.player.inCar.y : sim.player.y;
      const spot = nearestRoadPoint(
        clamp(px + Math.cos(a) * 520, 230, WORLD.width - 40),
        clamp(py + Math.sin(a) * 520, 230, WORLD.height - 40),
      );
      sim.police.push({
        x: spot.x, y: spot.y, angle: 0, speed: 200, type: 'police',
        name: 'Solmar PD Interceptor', color: PALETTE.police, speedMul: 1.1,
        health: 100, isPlayer: false, isPolice: true, turnAt: 0, hitCooldown: 0,
      });
    }
    while (sim.police.length > want) sim.police.pop();
    for (const pc of sim.police) {
      driveCar(pc, dt, null, false);
      const px = sim.player.inCar ? sim.player.inCar.x : sim.player.x;
      const py = sim.player.inCar ? sim.player.inCar.y : sim.player.y;
      const d = Math.sqrt(dist2(pc.x, pc.y, px, py));
      if (d < 46) {
        if (sim.player.inCar) {
          sim.player.inCar.health -= POLICE.ramDamage * dt * 1.5;
          pc.speed *= 0.7;
          if (rng.chance(0.02)) sparks(pc.x, pc.y, '#4fc3f7', 6, 140);
        } else {
          sim.player.arrest += dt;
          if (sim.player.arrest >= POLICE.arrestTime) { getBusted(); return; }
        }
      } else {
        sim.player.arrest = Math.max(0, sim.player.arrest - dt * 2);
      }
    }
    // Heat fades once no interceptor can see the player for a while.
    const nearPolice = sim.police.some((pc) => dist2(pc.x, pc.y, sim.player.x, sim.player.y) < 420 * 420);
    if (sim.wanted > 0 && !nearPolice) {
      sim.hiddenTimer += dt;
      if (sim.hiddenTimer > WANTED.decaySeconds) {
        sim.wanted--;
        sim.hiddenTimer = 0;
        announce(sim.wanted === 0 ? 'Heat is off. You are clean.' : `Wanted level dropped to ${sim.wanted}.`, 2.5);
      }
    } else {
      sim.hiddenTimer = 0;
    }
  }

  function getBusted() {
    sim.busted = true;
    const fine = Math.min(sim.cash, 200);
    sim.cash -= fine;
    sim.wanted = 0;
    sim.police = [];
    sim.player.arrest = 0;
    if (sim.player.inCar) {
      sim.player.inCar.isPlayer = false;
      sim.player.inCar = null;
    }
    sim.player.x = HOSPITAL_X;
    sim.player.y = HOSPITAL_Y;
    sim.player.health = PLAYER.health;
    announce(`BUSTED! The PD took $${fine} and dropped you at the hospital.`, 4);
    if (sim.missionActive) dropJob('you got busted');
  }

  function getWasted() {
    sim.wasted = true;
    sim.player.health = PLAYER.health;
    sim.wanted = 0;
    sim.police = [];
    sim.player.x = HOSPITAL_X;
    sim.player.y = HOSPITAL_Y;
    announce('WASTED! You woke up at St. Mara Hospital, $150 lighter.', 4);
    sim.cash = Math.max(0, sim.cash - 150);
    if (sim.missionActive) dropJob('you got wasted');
  }

  function runCombat(dt) {
    for (const b of sim.bullets) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; }
    sim.bullets = sim.bullets.filter((b) => b.life > 0);
    for (const b of sim.enemyBullets) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; }
    sim.enemyBullets = sim.enemyBullets.filter((b) => b.life > 0);
    // Player shots vs rivals and patrol cars.
    for (const b of sim.bullets) {
      for (const e of sim.enemies) {
        if (e.health > 0 && dist2(b.x, b.y, e.x, e.y) < 20 * 20) {
          e.health -= 34;
          b.life = 0;
          sparks(e.x, e.y, '#e5534b', 8, 160);
          if (e.health <= 0) {
            sim.kills++;
            sim.cash += 50;
            sparks(e.x, e.y, '#f2c94c', 14, 200);
          }
        }
      }
      for (const pc of sim.police) {
        if (dist2(b.x, b.y, pc.x, pc.y) < 26 * 26) {
          pc.health -= 20;
          b.life = 0;
          raiseHeat(1);
        }
      }
    }
    sim.enemies = sim.enemies.filter((e) => e.health > 0);
    for (const e of sim.enemies) {
      const p = sim.player;
      const tx = p.inCar ? p.inCar.x : p.x;
      const ty = p.inCar ? p.inCar.y : p.y;
      e.angle = angleTo(e.x, e.y, tx, ty);
      e.x += Math.cos(e.angle) * e.speed * dt;
      e.y += Math.sin(e.angle) * e.speed * dt;
      e.shootCd -= dt;
      if (e.shootCd <= 0 && Math.sqrt(dist2(e.x, e.y, tx, ty)) < 420) {
        e.shootCd = rng.range(0.9, 1.6);
        sim.enemyBullets.push({
          x: e.x, y: e.y, vx: Math.cos(e.angle) * 520, vy: Math.sin(e.angle) * 520,
          life: 1.2, friendly: false,
        });
      }
      if (dist2(e.x, e.y, tx, ty) < 34 * 34 && p.hurtCd <= 0) {
        p.hurtCd = 0.6;
        p.health -= 8;
        sparks(p.x, p.y, '#e5534b', 6, 120);
      }
    }
    for (const b of sim.enemyBullets) {
      const p = sim.player;
      const tx = p.inCar ? p.inCar.x : p.x;
      const ty = p.inCar ? p.inCar.y : p.y;
      if (dist2(b.x, b.y, tx, ty) < 22 * 22) {
        b.life = 0;
        if (p.inCar) p.inCar.health -= 6;
        else if (p.hurtCd <= 0) { p.hurtCd = 0.6; p.health -= 10; }
      }
    }
    if (sim.player.health <= 0) getWasted();
  }

  function grabPickups(dt) {
    const p = sim.player;
    const px = p.inCar ? p.inCar.x : p.x;
    const py = p.inCar ? p.inCar.y : p.y;
    for (const pk of sim.pickups) {
      pk.bob += dt;
      if (dist2(pk.x, pk.y, px, py) < 30 * 30) {
        if (pk.kind === 'cash') { sim.cash += pk.value; announce(`+$${pk.value} found on the street.`, 2); }
        if (pk.kind === 'health') { p.health = Math.min(PLAYER.health, p.health + pk.value); announce('Health +30.', 2); }
        if (pk.kind === 'ammo') { sim.ammo += pk.value; announce(`Ammo +${pk.value}.`, 2); }
        const spot = pickRoadSpot();
        pk.x = clamp(spot.x, 230, WORLD.width - 40);
        pk.y = clamp(spot.y, 230, WORLD.height - 40);
        pk.kind = rng.pick(['cash', 'health', 'ammo']);
        pk.value = pk.kind === 'cash' ? rng.int(25, 100) : pk.kind === 'health' ? 30 : 12;
      }
    }
  }

  function runMission(dt) {
    if (!sim.missionActive) return;
    const job = MISSIONS[sim.missionIndex];
    if (!job) return;
    const leg = job.steps[sim.missionStep];
    if (!leg) return;
    const p = sim.player;
    const px = p.inCar ? p.inCar.x : p.x;
    const py = p.inCar ? p.inCar.y : p.y;
    if (leg.time) {
      sim.missionTimer -= dt;
      if (sim.missionTimer <= 0) {
        // Surviving the heat is the win for escape legs; running out of
        // time fails every other timed leg.
        if (leg.type === 'escape') { finishStep(); return; }
        dropJob('time ran out');
        return;
      }
    }
    if (leg.type === 'goto' || leg.type === 'timed') {
      if ((!leg.inCar || p.inCar) && dist2(px, py, leg.x, leg.y) < leg.radius * leg.radius) finishStep();
    } else if (leg.type === 'escape') {
      sim.wanted = Math.max(sim.wanted, leg.wanted || 2);
    } else if (leg.type === 'fight') {
      if (sim.enemies.length === 0) finishStep();
    }
  }

  function tick(dt, ctl) {
    sim.time += dt;
    sim.busted = false;
    sim.wasted = false;
    if (sim.messageTimer > 0) sim.messageTimer -= dt;
    if (ctl.exitCar && sim.player.inCar) leaveCar();
    movePlayer(dt, ctl);
    moveTraffic(dt);
    runPolice(dt);
    runCombat(dt);
    grabPickups(dt);
    runMission(dt);
    for (const pt of sim.particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
    }
    sim.particles = sim.particles.filter((pt) => pt.life > 0);
    // Keep the streets busy near the player.
    if (sim.cars.filter((c) => !c.isPlayer && !c.parked).length < MOVING_CARS) fillTraffic(2);
    if (sim.peds.length < WALKERS) fillPeds(2);
  }

  return {
    state: sim, reset: resetSim, step: tick, say: announce,
    startMission: beginJob, enterCar: takeCar, exitCar: leaveCar, addWanted: raiseHeat,
    serialize() {
      return {
        cash: sim.cash, ammo: sim.ammo, missionIndex: sim.missionIndex,
        missionsDone: sim.stats.missionsDone, kills: sim.kills,
        carsStolen: sim.carsStolen, completedAll: sim.completedAll,
      };
    },
    load(save) {
      if (!save) return;
      sim.cash = save.cash || 0;
      sim.ammo = save.ammo || 24;
      sim.missionIndex = Math.min(save.missionIndex || 0, MISSIONS.length - 1);
      sim.stats.missionsDone = save.missionsDone || 0;
      sim.kills = save.kills || 0;
      sim.carsStolen = save.carsStolen || 0;
      sim.completedAll = !!save.completedAll;
    },
  };
}
export { MISSIONS };
