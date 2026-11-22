// level.js — the Marlow Museum floor plan: one room, no scrolling.
// Walls, marble columns (cover), shadow zones, the service vent, the gold
// carpet, the vault, the display cases and the EXIT door. Also the geometry
// helpers guards and cameras use for line of sight.

import { VIEW_W, VIEW_H, HUD_H, WALL } from './config.js';

export function buildLevel() {
  const playTop = HUD_H + WALL; // 88
  const playBottom = VIEW_H - WALL; // 776
  const playLeft = WALL;
  const playRight = VIEW_W - WALL;
  return {
    playTop, playBottom, playLeft, playRight,
    walls: [
      { x: 0, y: HUD_H, w: VIEW_W, h: WALL },            // top wall (under HUD)
      { x: 0, y: playBottom, w: VIEW_W, h: WALL },       // bottom wall
      { x: 0, y: HUD_H, w: WALL, h: playBottom - HUD_H },// left wall
      { x: playRight, y: HUD_H, w: WALL, h: playBottom - HUD_H }, // right wall
    ],
    // Marble columns: solid cover that blocks movement and vision.
    columns: [
      { x: 280, y: 150, w: 44, h: 120, name: 'C1' },
      { x: 560, y: 130, w: 44, h: 120, name: 'C2' },
      { x: 840, y: 130, w: 44, h: 120, name: 'C3' },
      { x: 280, y: 500, w: 44, h: 120, name: 'C4' },
      { x: 560, y: 500, w: 44, h: 120, name: 'C5' },
      { x: 880, y: 520, w: 44, h: 120, name: 'C6' },
      { x: 170, y: 330, w: 44, h: 110, name: 'C7' },
      { x: 1060, y: 400, w: 44, h: 120, name: 'C8' },
    ],
    // Shadow zones: alarm drains here, guards cannot spot you.
    shadows: [
      { x: 48, y: 250, w: 200, h: 130, label: 'SHADOW' },
      { x: 660, y: 650, w: 260, h: 110, label: 'SHADOW' },
      { x: 980, y: 300, w: 150, h: 100, label: 'SHADOW' },
    ],
    // Service vent: the slow, safe lane down the left wall.
    vent: { x: 48, y: 96, w: 110, h: 560, label: 'SERVICE VENT — SLOW · SAFE' },
    carpetV: { x: 600, y: playTop, w: 80, h: playBottom - playTop },
    carpetH: { x: playLeft, y: 400, w: playRight - playLeft, h: 60 },
    vault: { x: 1064, y: 96, w: 168, h: 120, doorX: 1040, doorY: 156, label: 'THE GILDED VAULT' },
    cases: [
      { id: 'A', x: 400, y: 560, w: 90, h: 60, label: 'JADE IDOL', value: 1200 },
      { id: 'B', x: 860, y: 300, w: 90, h: 60, label: 'STAR SAPPHIRE', value: 1200 },
    ],
    exit: { x: 36, y: 668, w: 120, h: 96, cx: 96, cy: 716, label: 'EXIT' },
    start: { x: 640, y: 740 },
    // Three routes to the vault, drawn as dotted guides on the floor.
    routes: [
      { name: 'MAIN HALL', points: [[640, 740], [640, 560], [640, 420], [700, 300], [900, 200], [1040, 156]], color: '#f59e0b' },
      { name: 'SIDE GALLERY', points: [[640, 740], [900, 700], [1120, 640], [1180, 420], [1180, 260], [1040, 156]], color: '#38bdf8' },
      { name: 'SERVICE VENT', points: [[640, 740], [300, 700], [103, 640], [103, 200], [300, 156], [700, 156], [1040, 156]], color: '#2dd4bf' },
    ],
  };
}

/** True when point (x,y) is inside rect r. */
export function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

/** True when circle (x,y,radius) overlaps rect r. */
export function circleHitsRect(x, y, radius, r) {
  const cx = Math.max(r.x, Math.min(x, r.x + r.w));
  const cy = Math.max(r.y, Math.min(y, r.y + r.h));
  const dx = x - cx, dy = y - cy;
  return dx * dx + dy * dy < radius * radius;
}

/** True when segment (ax,ay)-(bx,by) crosses rect r (sampled). */
export function segmentHitsRect(ax, ay, bx, by, r) {
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
    if (pointInRect(x, y, r)) return true;
  }
  return false;
}

/** True when the point is inside any shadow zone or the vent. */
export function pointInShadow(level, x, y) {
  if (pointInRect(x, y, level.vent)) return true;
  return level.shadows.some((s) => pointInRect(x, y, s));
}

/** True when segment is blocked by any column (vision blocker). */
export function visionBlocked(level, ax, ay, bx, by) {
  return level.columns.some((c) => segmentHitsRect(ax, ay, bx, by, c));
}

/** Push a moving circle out of solid rects; returns corrected {x, y}. */
export function resolveCollisions(level, x, y, radius) {
  const solids = [...level.walls, ...level.columns, level.vault, ...level.cases];
  for (const r of solids) {
    if (!circleHitsRect(x, y, radius, r)) continue;
    const cx = Math.max(r.x, Math.min(x, r.x + r.w));
    const cy = Math.max(r.y, Math.min(y, r.y + r.h));
    let dx = x - cx, dy = y - cy;
    let d = Math.hypot(dx, dy);
    if (d < 0.001) { dx = 0; dy = -1; d = 1; }
    const push = radius - d;
    x += (dx / d) * push;
    y += (dy / d) * push;
  }
  x = Math.max(level.playLeft + radius, Math.min(level.playRight - radius, x));
  y = Math.max(level.playTop + radius, Math.min(level.playBottom - radius, y));
  return { x, y };
}
