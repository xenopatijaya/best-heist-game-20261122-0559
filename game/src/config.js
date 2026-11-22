// config.js — constants, palette and the seeded RNG for THE GILDED VAULT.
// No Math.random anywhere in the game: every random-looking value comes from
// mulberry32, so a screenshot state renders byte-identical every run.

export const VIEW_W = 1280;
export const VIEW_H = 800;
export const HUD_H = 64;
export const WALL = 24;

export const PALETTE = {
  floor: '#0d1440',
  floorAlt: '#111a4d',
  wall: '#1c2450',
  wallTrim: '#c9a227',
  carpet: '#8a6d1f',
  carpetEdge: '#c9a227',
  shadow: '#0f5f5c',
  shadowEdge: '#2dd4bf',
  vent: '#123f3d',
  marble: '#d8d2c4',
  marbleVein: '#9a9484',
  gold: '#ffd94d',
  goldDeep: '#c9a227',
  vault: '#3a2f10',
  exit: '#16a34a',
  exitGlow: '#4ade80',
  guard: '#334155',
  guardCone: 'rgba(250, 204, 21, 0.28)',
  guardConeHot: 'rgba(239, 68, 68, 0.38)',
  cameraCone: 'rgba(253, 224, 71, 0.20)',
  thief: '#0f172a',
  thiefTrim: '#ffd94d',
  hud: '#070b1a',
  hudText: '#f1f5f9',
  alarmLow: '#22c55e',
  alarmMid: '#f59e0b',
  alarmHigh: '#ef4444',
};

export const PRICES = { coin: 25, emp: 50, smokeFree: 2 };
export const LOOT_VALUES = { vault: 5000, caseA: 1200, caseB: 1200 };
export const CHANNEL = { vault: 3.0, case: 1.0 };
export const START_WALLET = 100;
export const START_CHANCES = 3;
export const ALARM_MAX = 100;
export const ALARM_WARN = 70;

/** Deterministic RNG (mulberry32). Seed once per state; never use Math.random. */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Clamp a number into [lo, hi]. */
export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

/** Distance between two points. */
export function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }

/** Angle from (ax,ay) to (bx,by). */
export function angleTo(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }

/** Smallest absolute difference between two angles. */
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

/** Format seconds as M:SS. */
export function fmtTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Format dollars with commas. */
export function fmtMoney(n) { return '$' + Math.floor(n).toLocaleString('en-US'); }
