// guards.js — the three patrol guards: dotted routes, vision cones, and the
// PATROL -> SUSPICIOUS -> ALERT state machine. A guard that sees the thief
// investigates the last seen spot; a guard that touches the thief catches him.

import { angleDiff, angleTo, clamp, dist } from './config.js';
import { visionBlocked, pointInShadow } from './level.js';

export const GUARD_RANGE = 250;
export const GUARD_HALF_ANGLE = 0.58; // ~33 degrees each side
export const GUARD_SPEEDS = { patrol: 70, suspicious: 115, alert: 150 };

export function createGuards(level) {
  const mk = (name, waypoints, color) => ({
    name, waypoints, color, wp: 0,
    x: waypoints[0][0], y: waypoints[0][1],
    dir: 0, state: 'PATROL', suspicion: 0,
    lastSeen: null, investigate: null, lookTimer: 0, loseTimer: 0,
    speed: GUARD_SPEEDS.patrol,
  });
  return [
    mk('MARCO', [[640, 330], [640, 580], [380, 580], [380, 330]], '#f97316'),
    mk('IRIS', [[980, 330], [980, 640], [760, 640], [760, 330]], '#a855f7'),
    mk('VANE', [[980, 180], [980, 340], [1160, 340], [1160, 180]], '#ef4444'),
  ];
}

/** Can this guard see the thief right now? (range, cone, line of sight, smoke) */
export function guardSeesThief(guard, thief, level, smokes) {
  if (thief.inShadow) return false;
  const d = dist(guard.x, guard.y, thief.x, thief.y);
  if (d > GUARD_RANGE) return false;
  if (angleDiff(angleTo(guard.x, guard.y, thief.x, thief.y), guard.dir) > GUARD_HALF_ANGLE) return false;
  if (visionBlocked(level, guard.x, guard.y, thief.x, thief.y)) return false;
  for (const s of smokes) {
    if (dist(thief.x, thief.y, s.x, s.y) < s.r) return false;
    if (segmentThroughSmoke(guard.x, guard.y, thief.x, thief.y, s)) return false;
  }
  return true;
}

function segmentThroughSmoke(ax, ay, bx, by, s) {
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    if (dist(ax + (bx - ax) * t, ay + (by - ay) * t, s.x, s.y) < s.r) return true;
  }
  return false;
}

/** Step one guard: patrol waypoints, investigate, chase. Returns 'caught' on touch. */
export function updateGuard(guard, thief, level, smokes, dt) {
  const sees = guardSeesThief(guard, thief, level, smokes);
  if (sees) {
    guard.suspicion = clamp(guard.suspicion + 70 * dt, 0, 100);
    guard.lastSeen = { x: thief.x, y: thief.y };
    guard.loseTimer = 0;
  } else {
    guard.suspicion = clamp(guard.suspicion - 22 * dt, 0, 100);
    if (guard.state === 'ALERT') guard.loseTimer += dt;
  }
  if (guard.suspicion >= 100 && guard.state !== 'ALERT') {
    guard.state = 'ALERT';
    guard.investigate = guard.lastSeen;
  } else if (guard.suspicion >= 55 && guard.state === 'PATROL') {
    guard.state = 'SUSPICIOUS';
    guard.investigate = guard.lastSeen;
  }
  if (guard.state === 'ALERT' && guard.loseTimer > 3) {
    guard.state = 'SUSPICIOUS';
    guard.investigate = guard.lastSeen;
    guard.loseTimer = 0;
  }
  if (guard.state === 'SUSPICIOUS' && guard.investigate && guard.lookTimer <= 0 &&
      dist(guard.x, guard.y, guard.investigate.x, guard.investigate.y) < 12) {
    guard.lookTimer = 2.0;
  }
  let tx = null, ty = null, speed = GUARD_SPEEDS.patrol;
  if (guard.state === 'ALERT' && guard.lastSeen) {
    tx = guard.lastSeen.x; ty = guard.lastSeen.y; speed = GUARD_SPEEDS.alert;
  } else if (guard.state === 'SUSPICIOUS' && guard.investigate) {
    tx = guard.investigate.x; ty = guard.investigate.y; speed = GUARD_SPEEDS.suspicious;
  } else {
    const wp = guard.waypoints[guard.wp];
    tx = wp[0]; ty = wp[1]; speed = GUARD_SPEEDS.patrol;
  }
  if (guard.lookTimer > 0) {
    guard.lookTimer -= dt;
    guard.dir += dt * 1.6; // scan around while looking
    if (guard.lookTimer <= 0 && guard.state === 'SUSPICIOUS') {
      guard.state = 'PATROL';
      guard.investigate = null;
      guard.suspicion = 20;
    }
  } else if (tx !== null) {
    const d = dist(guard.x, guard.y, tx, ty);
    if (d < 8) {
      if (guard.state === 'PATROL') guard.wp = (guard.wp + 1) % guard.waypoints.length;
    } else {
      const step = Math.min(d, speed * dt);
      guard.dir = angleTo(guard.x, guard.y, tx, ty);
      guard.x += Math.cos(guard.dir) * step;
      guard.y += Math.sin(guard.dir) * step;
    }
  }
  guard.speed = speed;
  if (dist(guard.x, guard.y, thief.x, thief.y) < 26) return 'caught';
  return sees ? 'seen' : 'hidden';
}

/** Update all guards; returns 'caught' if any guard touches the thief. */
export function updateGuards(guards, thief, level, smokes, dt) {
  let anySeen = false;
  for (const g of guards) {
    const r = updateGuard(g, thief, level, smokes, dt);
    if (r === 'caught') return 'caught';
    if (r === 'seen') anySeen = true;
  }
  return anySeen ? 'seen' : 'hidden';
}
