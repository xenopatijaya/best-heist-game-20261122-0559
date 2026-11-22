// thief.js — the thief: movement, the lockpick channel and the getaway.
// The thief moves with WASD/arrows, channels E beside the vault or a case,
// and wins by reaching the EXIT after the vault is open.

import { clamp, dist } from './config.js';
import { resolveCollisions, pointInShadow } from './level.js';

export function createThief(level) {
  return {
    x: level.start.x, y: level.start.y,
    radius: 15, speed: 205,
    dir: -Math.PI / 2, moving: false,
    channel: null, // { target: 'vault'|'caseA'|'caseB', progress, need }
    inShadow: false, inVent: false,
  };
}

/** Move the thief, resolve collisions, track shadow/vent cover. */
export function updateThief(thief, level, vec, dt) {
  const slow = pointInShadow(level, thief.x, thief.y) && thief.x < 200 ? 0.62 : 1;
  const sp = thief.speed * slow * (thief.channel ? 0 : 1);
  thief.moving = vec.x !== 0 || vec.y !== 0;
  if (thief.moving) {
    thief.dir = Math.atan2(vec.y, vec.x);
    const nx = thief.x + vec.x * sp * dt;
    const ny = thief.y + vec.y * sp * dt;
    const fixed = resolveCollisions(level, nx, ny, thief.radius);
    thief.x = fixed.x; thief.y = fixed.y;
  }
  thief.inShadow = pointInShadow(level, thief.x, thief.y);
  thief.inVent = thief.x >= level.vent.x && thief.x <= level.vent.x + level.vent.w &&
    thief.y >= level.vent.y && thief.y <= level.vent.y + level.vent.h;
  return thief;
}

/** Nearest crackable target within reach, or null. */
export function nearestTarget(thief, level, loot) {
  const dVault = dist(thief.x, thief.y, level.vault.doorX, level.vault.doorY);
  if (!loot.vaultOpen && dVault < 78) return { target: 'vault', need: 3.0, x: level.vault.doorX, y: level.vault.doorY };
  for (const c of level.cases) {
    const taken = loot.cases[c.id];
    if (taken) continue;
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    if (dist(thief.x, thief.y, cx, cy) < 78) return { target: 'case' + c.id, need: 1.0, x: cx, y: cy, caseId: c.id };
  }
  return null;
}

/** Advance (or cancel) the lockpick channel. Returns the finished target or null. */
export function updateChannel(thief, level, loot, holdingE, dt) {
  const near = nearestTarget(thief, level, loot);
  if (!holdingE || !near || thief.moving) {
    if (thief.channel) thief.channel.progress = Math.max(0, thief.channel.progress - dt * 0.5);
    if (thief.channel && thief.channel.progress <= 0) thief.channel = null;
    return null;
  }
  if (!thief.channel || thief.channel.target !== near.target) {
    thief.channel = { target: near.target, progress: 0, need: near.need, x: near.x, y: near.y, caseId: near.caseId || null };
  }
  thief.channel.progress += dt;
  if (thief.channel.progress >= thief.channel.need) {
    const done = thief.channel;
    thief.channel = null;
    return done;
  }
  return null;
}

/** True when the thief stands inside the EXIT door. */
export function thiefAtExit(thief, level) {
  return thief.x > level.exit.x && thief.x < level.exit.x + level.exit.w &&
    thief.y > level.exit.y && thief.y < level.exit.y + level.exit.h;
}

export { clamp };
