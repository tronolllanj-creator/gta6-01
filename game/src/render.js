// Solmar Bay — canvas drawing, rewritten for round 3.
// Drawing only: the city, every entity, particles, the HUD with its minimap,
// and the title / pause / jobs / over screens. No simulation here.
import { VIEW, WORLD, PALETTE, FONT } from './config.js';
import { ROAD_W, BLOCK } from './city.js';
import { MISSIONS, STORY } from './missions.js';

export const SCREEN_TITLE = 'title', SCREEN_PLAY = 'play', SCREEN_PAUSED = 'paused', SCREEN_OVER = 'over', SCREEN_JOBS = 'jobs';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0, w: 1280, h: 720 };
  const fontCache = new Map();

  function fontFor(size) {
    if (!fontCache.has(size)) fontCache.set(size, `${size}px ${FONT}`);
    return fontCache.get(size);
  }

  function label(str, x, y, size, color, align, weight) {
    ctx.font = (weight ? weight + ' ' : '') + fontFor(size);
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(str, x, y);
  }

  function fitCanvas() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
    view.w = canvas.width / view.scale;
    view.h = canvas.height / view.scale;
    view.x = (canvas.width - VIEW.width * view.scale) / 2;
    view.y = (canvas.height - VIEW.height * view.scale) / 2;
  }
  fitCanvas();
  window.addEventListener('resize', fitCanvas);

  function paintCar(x, y, angle, color, isPolice, isPlayer, health) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, -24, -7, 58, 28, 8);
    ctx.fill();
    ctx.fillStyle = color;
    roundRect(ctx, -29, -14, 58, 28, 9);
    ctx.fill();
    ctx.fillStyle = '#1c2733';
    roundRect(ctx, -8, -11, 20, 22, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(160,220,245,0.85)';
    roundRect(ctx, -4, -10, 12, 20, 3);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(26, -12, 3, 5);
    ctx.fillRect(26, 7, 3, 5);
    ctx.fillStyle = '#e5534b';
    ctx.fillRect(-30, -12, 3, 5);
    ctx.fillRect(-30, 7, 3, 5);
    if (isPolice) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(-2, -14, 10, 28);
      label('PD', 3, 4, 10, '#111', 'center', 'bold');
    }
    if (isPlayer) {
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      roundRect(ctx, -31, -16, 62, 32, 10);
      ctx.stroke();
    }
    ctx.restore();
    if (health !== undefined && health < 100) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x - 20, y - 28, 40, 5);
      ctx.fillStyle = health > 40 ? '#58d68d' : '#e5534b';
      ctx.fillRect(x - 20, y - 28, 40 * health / 100, 5);
    }
  }

  function paintPed(p, t) {
    const bob = Math.sin(t * 8 + p.bob) * 2;
    ctx.save();
    ctx.translate(p.x, p.y + bob * 0.3);
    ctx.rotate(p.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 9, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c9a0';
    ctx.beginPath();
    ctx.arc(5, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function activeWaypoint(state) {
    if (state.missionActive) {
      const job = MISSIONS[state.missionIndex];
      const leg = job && job.steps[state.missionStep];
      if (leg && leg.x !== undefined) return { x: leg.x, y: leg.y };
    }
    if (!state.missionActive && !state.completedAll) return { x: 264, y: 564 };
    return null;
  }

  function paintCity(state, cam, t) {
    const city = state.city;
    const x0 = Math.max(0, cam.x - 40);
    const y0 = Math.max(0, cam.y - 40);
    const x1 = Math.min(WORLD.width, cam.x + view.w + 40);
    const y1 = Math.min(WORLD.height, cam.y + view.h + 40);
    // Ground: lawn, then the western beach and water.
    ctx.fillStyle = PALETTE.grassDark;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.fillStyle = PALETTE.waterDeep;
    ctx.fillRect(x0, y0, Math.min(140, x1) - x0, y1 - y0);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(Math.max(x0, 60), y0, Math.min(140, x1) - Math.max(x0, 60), y1 - y0);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    for (let wy = y0; wy < y1; wy += 90) {
      ctx.beginPath();
      ctx.moveTo(70 + Math.sin(t * 1.2 + wy * 0.05) * 8, wy);
      ctx.lineTo(130, wy + 30);
      ctx.stroke();
    }
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(Math.max(x0, 140), y0, Math.min(200, x1) - Math.max(x0, 140), y1 - y0);
    // The pier sticks out into the water.
    ctx.fillStyle = '#8a6a4d';
    ctx.fillRect(0, city.pier.y, city.pier.w, city.pier.h);
    ctx.fillStyle = '#a8845f';
    for (let px = 10; px < 250; px += 30) ctx.fillRect(px, city.pier.y + 2, 18, 22);
    // Parks with a round canopy tree in the middle.
    for (const pk of city.parks) {
      if (pk.x > x1 || pk.x + pk.w < x0 || pk.y > y1 || pk.y + pk.h < y0) continue;
      ctx.fillStyle = PALETTE.park;
      ctx.fillRect(pk.x, pk.y, pk.w, pk.h);
      ctx.fillStyle = '#6fc98a';
      ctx.beginPath();
      ctx.arc(pk.x + pk.w / 2, pk.y + pk.h / 2, 34, 0, Math.PI * 2);
      ctx.fill();
    }
    // Sidewalks first, then the road surface.
    ctx.fillStyle = PALETTE.sidewalk;
    for (const rx of city.roadsV) ctx.fillRect(rx - 8, Math.max(y0, 192), ROAD_W + 16, Math.min(y1, WORLD.height) - Math.max(y0, 192));
    for (const ry of city.roadsH) ctx.fillRect(Math.max(x0, 192), ry - 8, Math.min(x1, WORLD.width) - Math.max(x0, 192), ROAD_W + 16);
    ctx.fillStyle = PALETTE.road;
    for (const rx of city.roadsV) ctx.fillRect(rx, Math.max(y0, 192), ROAD_W, Math.min(y1, WORLD.height) - Math.max(y0, 192));
    for (const ry of city.roadsH) ctx.fillRect(Math.max(x0, 192), ry, Math.min(x1, WORLD.width) - Math.max(x0, 192), ROAD_W);
    // Alternate blocks get a faint tint so the grid reads as streets.
    for (let bi = 0; bi < city.roadsV.length - 1; bi++) {
      for (let bj = 0; bj < city.roadsH.length - 1; bj++) {
        if ((bi + bj) % 2 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.045)';
          ctx.fillRect(city.roadsV[bi] + ROAD_W, city.roadsH[bj] + ROAD_W, BLOCK - ROAD_W, BLOCK - ROAD_W);
        }
      }
    }
    // Crosswalks at every crossing.
    ctx.fillStyle = PALETTE.lineWhite;
    for (const rx of city.roadsV) {
      for (const ry of city.roadsH) {
        if (rx < x0 - 80 || rx > x1 + 80 || ry < y0 - 80 || ry > y1 + 80) continue;
        for (let k = 0; k < 4; k++) {
          ctx.fillRect(rx + 8 + k * 14, ry - 10, 8, 6);
          ctx.fillRect(rx + 8 + k * 14, ry + ROAD_W + 4, 8, 6);
        }
      }
    }
    // Centre dashes along every road.
    ctx.fillStyle = PALETTE.line;
    for (const rx of city.roadsV) {
      for (let y = 200; y < WORLD.height; y += 56) {
        if (y < y0 || y > y1) continue;
        ctx.fillRect(rx + ROAD_W / 2 - 2, y, 4, 26);
      }
    }
    for (const ry of city.roadsH) {
      for (let x = 200; x < WORLD.width; x += 56) {
        if (x < x0 || x > x1) continue;
        ctx.fillRect(x, ry + ROAD_W / 2 - 2, 26, 4);
      }
    }
    // Buildings: drop shadow, body, roof, lit windows, tall ones get a cap.
    for (const b of city.buildings) {
      if (b.x > x1 || b.x + b.w < x0 || b.y > y1 || b.y + b.h < y0) continue;
      const lift = b.tall ? 14 : 7;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 5, b.y + 5, b.w - 10, b.h - 10);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      for (let wx = b.x + 12; wx < b.x + b.w - 10; wx += 20) {
        for (let wy = b.y + 12; wy < b.y + b.h - 10; wy += 20) ctx.fillRect(wx, wy, 8, 6);
      }
      if (b.tall) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(b.x, b.y, b.w, lift);
      }
      if (b.name) label(b.name, b.x + b.w / 2, b.y + b.h / 2, 13, 'rgba(255,255,255,0.9)', 'center', 'bold');
    }
    // Street trees.
    for (const tr of city.trees) {
      if (tr.x < x0 || tr.x > x1 || tr.y < y0 || tr.y > y1) continue;
      ctx.fillStyle = '#2d7a3e';
      ctx.beginPath();
      ctx.arc(tr.x, tr.y, tr.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4caf6d';
      ctx.beginPath();
      ctx.arc(tr.x - 2, tr.y - 2, tr.r * 0.65, 0, Math.PI * 2);
      ctx.fill();
    }
    // Landmark name tags.
    for (const lm of city.landmarks) {
      if (lm.x < x0 - 60 || lm.x > x1 + 60 || lm.y < y0 - 60 || lm.y > y1 + 60) continue;
      ctx.fillStyle = 'rgba(10,14,24,0.75)';
      roundRect(ctx, lm.x - 52, lm.y - 34, 104, 22, 6);
      ctx.fill();
      label(lm.label, lm.x, lm.y - 18, 12, '#ffd166', 'center', 'bold');
    }
  }

  function paintMinimap(state) {
    const mw = 196, mh = 142;
    const mx = VIEW.width - mw - 16, my = VIEW.height - mh - 16;
    const sx = mw / WORLD.width, sy = mh / WORLD.height;
    ctx.fillStyle = 'rgba(10,14,24,0.85)';
    roundRect(ctx, mx - 6, my - 6, mw + 12, mh + 12, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.strokeRect(mx, my, mw, mh);
    ctx.fillStyle = '#1d7fa8';
    ctx.fillRect(mx, my, 200 * sx, mh);
    ctx.fillStyle = '#33373f';
    for (const rx of state.city.roadsV) ctx.fillRect(mx + rx * sx - 1, my, 2, mh);
    for (const ry of state.city.roadsH) ctx.fillRect(mx, my + ry * sy, mw, 2);
    const p = state.player;
    const px = p.inCar ? p.inCar.x : p.x;
    const py = p.inCar ? p.inCar.y : p.y;
    const wp = activeWaypoint(state);
    if (wp) {
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(mx + wp.x * sx, my + wp.y * sy, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(mx + wp.x * sx, my + wp.y * sy, 9 + Math.sin(state.time * 4) * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const pc of state.police) {
      ctx.fillStyle = '#4fc3f7';
      ctx.beginPath();
      ctx.arc(mx + pc.x * sx, my + pc.y * sy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(mx + px * sx, my + py * sy, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(mx + px * sx, my + py * sy, 4.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  function paintHud(state, audio) {
    const p = state.player;
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, 12, 12, 250, 92, 10);
    ctx.fill();
    label(`$${state.cash.toLocaleString()}`, 26, 42, 26, PALETTE.gold, 'left', 'bold');
    label(`Ammo ${state.ammo}   •   Kills ${state.kills}`, 26, 66, 14, PALETTE.text, 'left');
    label(`Jobs done ${state.stats.missionsDone}/8`, 26, 88, 14, PALETTE.muted, 'left');
    // Health bar under the cash panel.
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(26, 96, 150, 8);
    ctx.fillStyle = p.health > 40 ? '#58d68d' : '#e5534b';
    ctx.fillRect(26, 96, 150 * p.health / 100, 8);
    label('HEALTH', 184, 104, 10, PALETTE.muted, 'left', 'bold');
    // Wanted stars, top right.
    for (let i = 0; i < 5; i++) {
      label('★', VIEW.width - 30 - i * 30, 44, 28, i < state.wanted ? '#ffd166' : 'rgba(255,255,255,0.18)', 'right', 'bold');
    }
    if (state.wanted > 0) {
      label(state.wanted >= 3 ? 'POLICE HUNTING YOU' : 'WANTED — break line of sight', VIEW.width - 24, 70, 13, '#ffb3ad', 'right', 'bold');
    }
    // Job tracker under the cash panel.
    if (state.missionActive) {
      const job = MISSIONS[state.missionIndex];
      const leg = job.steps[state.missionStep];
      ctx.fillStyle = PALETTE.panel;
      roundRect(ctx, 12, 118, 330, 66, 10);
      ctx.fill();
      label(`JOB ${job.id}: ${job.title}  •  $${job.pay}`, 26, 142, 15, '#ffd166', 'left', 'bold');
      label(leg.label, 26, 164, 14, PALETTE.text, 'left');
      if (leg.time) label(`${Math.ceil(state.missionTimer)}s left`, 26, 182, 13, state.missionTimer < 15 ? '#e5534b' : PALETTE.muted, 'left', 'bold');
    } else if (!state.completedAll) {
      ctx.fillStyle = PALETTE.panel;
      roundRect(ctx, 12, 118, 330, 44, 10);
      ctx.fill();
      label('Next job at Rosa\'s Garage — press E there', 26, 146, 14, PALETTE.text, 'left');
    } else {
      ctx.fillStyle = PALETTE.panel;
      roundRect(ctx, 12, 118, 330, 44, 10);
      ctx.fill();
      label('★ KING OF SOLMAR — free roam. Enjoy the Bay.', 26, 146, 14, PALETTE.gold, 'left', 'bold');
    }
    // Speedometer, or the controls hint on foot.
    if (p.inCar) {
      const kmh = Math.round(Math.abs(p.inCar.speed) * 0.32);
      label(`${kmh} km/h`, 26, VIEW.height - 52, 30, PALETTE.text, 'left', 'bold');
      label(`${p.inCar.name}  •  E exit  •  Space handbrake`, 26, VIEW.height - 28, 13, PALETTE.muted, 'left');
    } else {
      label('WASD move  •  Shift sprint  •  E enter car / start job  •  Click shoot  •  P pause', 26, VIEW.height - 28, 13, PALETTE.muted, 'left');
    }
    if (audio) label(`♪ ${audio.stationName()}  •  M mute`, VIEW.width - 24, VIEW.height - 28, 12, PALETTE.muted, 'right');
    if (state.messageTimer > 0 && state.message) {
      ctx.fillStyle = PALETTE.panel;
      const w = Math.min(720, 20 + state.message.length * 7.5);
      roundRect(ctx, (VIEW.width - w) / 2, VIEW.height - 108, w, 36, 10);
      ctx.fill();
      label(state.message, VIEW.width / 2, VIEW.height - 84, 15, PALETTE.text, 'center');
    }
    paintMinimap(state);
  }

  function paintPanel(title, lines, prompt, accent) {
    const w = 680, h = 150 + lines.length * 30;
    const x = (VIEW.width - w) / 2, y = (VIEW.height - h) / 2;
    ctx.fillStyle = 'rgba(6,8,16,0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = accent || '#ffd166';
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 14);
    ctx.stroke();
    label(title, VIEW.width / 2, y + 62, 44, PALETTE.text, 'center', 'bold');
    lines.forEach((ln, i) => label(ln, VIEW.width / 2, y + 108 + i * 30, 17, PALETTE.muted, 'center'));
    label(prompt, VIEW.width / 2, y + h - 28, 18, '#ffd166', 'center', 'bold');
  }

  function draw(state, screen, best, audio, cam) {
    const t = state.time;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    const p = state.player;
    const px = p.inCar ? p.inCar.x : p.x;
    const py = p.inCar ? p.inCar.y : p.y;
    const camera = cam || { x: px - VIEW.width / 2, y: py - VIEW.height / 2 };
    camera.x = Math.max(0, Math.min(WORLD.width - VIEW.width, camera.x));
    camera.y = Math.max(0, Math.min(WORLD.height - VIEW.height, camera.y));
    ctx.save();
    ctx.translate(-camera.x, -camera.y);
    paintCity(state, camera, t);
    // Pulsing waypoint beacon over the current objective.
    const wp = activeWaypoint(state);
    if (wp && screen === SCREEN_PLAY) {
      const pulse = 26 + Math.sin(t * 4) * 6;
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(wp.x, wp.y, pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.moveTo(wp.x, wp.y - 34);
      ctx.lineTo(wp.x - 9, wp.y - 16);
      ctx.lineTo(wp.x + 9, wp.y - 16);
      ctx.closePath();
      ctx.fill();
    }
    for (const pk of state.pickups) {
      const bob = Math.sin(pk.bob * 3) * 3;
      ctx.fillStyle = pk.kind === 'cash' ? '#f2c94c' : pk.kind === 'health' ? '#58d68d' : '#4fc3f7';
      ctx.beginPath();
      ctx.arc(pk.x, pk.y + bob, 10, 0, Math.PI * 2);
      ctx.fill();
      label(pk.kind === 'cash' ? '$' : pk.kind === 'health' ? '+' : 'A', pk.x, pk.y + bob + 4, 12, '#111', 'center', 'bold');
    }
    for (const c of state.cars) if (!c.isPlayer) paintCar(c.x, c.y, c.angle, c.color, false, false);
    for (const pc of state.police) paintCar(pc.x, pc.y, pc.angle, pc.color, true, false, pc.health);
    for (const e of state.enemies) {
      paintPed({ ...e, color: '#c0392b' }, t);
      ctx.fillStyle = '#e5534b';
      ctx.fillRect(e.x - 14, e.y - 22, 28, 4);
      ctx.fillStyle = '#58d68d';
      ctx.fillRect(e.x - 14, e.y - 22, 28 * e.health / 60, 4);
    }
    for (const pd of state.peds) paintPed(pd, t);
    // The player, in a car or on foot.
    if (p.inCar) {
      paintCar(p.inCar.x, p.inCar.y, p.inCar.angle, p.inCar.color, false, true, p.inCar.health);
    } else {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(0, 5, 11, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.player;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b2b2b';
      ctx.beginPath();
      ctx.arc(6, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      if (p.arrest > 0) {
        ctx.fillStyle = '#e5534b';
        ctx.fillRect(p.x - 20, p.y - 30, 40 * p.arrest / 1.6, 5);
      }
    }
    for (const b of state.bullets) {
      ctx.fillStyle = '#ffe27a';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const b of state.enemyBullets) {
      ctx.fillStyle = '#ff8a7a';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // Warm vignette over the whole frame, so the HUD reads against the city.
    const grad = ctx.createRadialGradient(VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.45, VIEW.width / 2, VIEW.height / 2, VIEW.height * 0.95);
    grad.addColorStop(0, 'rgba(255,180,90,0)');
    grad.addColorStop(1, 'rgba(255,140,60,0.10)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    if (screen === SCREEN_PLAY || screen === SCREEN_JOBS) paintHud(state, audio);
    if (screen === SCREEN_TITLE) {
      ctx.fillStyle = 'rgba(6,8,16,0.55)';
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      label('SOLMAR BAY', VIEW.width / 2, 190, 84, '#ffd166', 'center', 'bold');
      label(STORY.subtitle, VIEW.width / 2, 232, 20, PALETTE.text, 'center');
      label(STORY.intro, VIEW.width / 2, 292, 16, PALETTE.muted, 'center');
      label('Drive. Steal. Run jobs. Lose the heat. Own the Bay.', VIEW.width / 2, 322, 16, PALETTE.muted, 'center');
      label('WASD drive / walk  •  E enter car & start jobs  •  Click shoot  •  Space handbrake  •  P pause', VIEW.width / 2, 372, 15, PALETTE.text, 'center');
      label(`Best: $${(best || 0).toLocaleString()}   •   Jobs done ${state.stats.missionsDone}/8   •   Save: local, auto`, VIEW.width / 2, 412, 14, PALETTE.muted, 'center');
      label('PRESS ENTER OR CLICK TO START', VIEW.width / 2, 480, 22, '#ffd166', 'center', 'bold');
      label('An original game. Solmar Bay, Mara Voss and every street are invented — no Rockstar content.', VIEW.width / 2, 540, 12, PALETTE.muted, 'center');
    }
    if (screen === SCREEN_PAUSED) {
      paintPanel('Paused', ['The Bay waits for no one — except right now.', `Cash $${state.cash.toLocaleString()}  •  Jobs ${state.stats.missionsDone}/8`], 'Press P to resume');
    }
    if (screen === SCREEN_JOBS) {
      const lines = MISSIONS.map((job, i) => `${i < state.missionIndex || state.completedAll ? '✓' : i === state.missionIndex ? '►' : '·'}  JOB ${job.id}: ${job.title} — $${job.pay}`);
      paintPanel('Job Board — Rosa\'s Garage', lines, 'Press Tab to close');
    }
    if (screen === SCREEN_OVER) {
      paintPanel('Busted / Wasted', ['The PD dropped you at St. Mara Hospital.', `Cash $${state.cash.toLocaleString()}  •  Jobs ${state.stats.missionsDone}/8`], 'Press Enter to get back out there');
    }
  }
  return { draw, view };
}
