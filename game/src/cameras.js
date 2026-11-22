// cameras.js — the two wall cameras: sweeping cones that raise the alarm.
// An EMP shuts them down for 8 seconds; smoke blocks their view too.

import { angleDiff, angleTo, dist } from './config.js';
import { visionBlocked } from './level.js';

export const CAMERA_RANGE = 300;
export const CAMERA_HALF_ANGLE = 0.5;

export function createCameras() {
  return [
    {
      name: 'CAM 1', x: 640, y: 88, base: Math.PI / 2,
      sweep: 0.9, speed: 0.55, phase: 0, dir: Math.PI / 2,
      disabledUntil: 0, seesThief: false,
    },
    {
      name: 'CAM 2', x: 1252, y: 440, base: Math.PI,
      sweep: 0.8, speed: 0.45, phase: 1.7, dir: Math.PI,
      disabledUntil: 0, seesThief: false,
    },
  ];
}

/** Step a camera's sweep and test whether it sees the thief. */
export function updateCamera(cam, thief, level, smokes, now, dt) {
  cam.phase += dt * cam.speed;
  const off = cam.disabledUntil > now;
  cam.dir = cam.base + Math.sin(cam.phase) * cam.sweep;
  cam.seesThief = false;
  if (off || thief.inShadow) return false;
  const d = dist(cam.x, cam.y, thief.x, thief.y);
  if (d > CAMERA_RANGE) return false;
  if (angleDiff(angleTo(cam.x, cam.y, thief.x, thief.y), cam.dir) > CAMERA_HALF_ANGLE) return false;
  if (visionBlocked(level, cam.x, cam.y, thief.x, thief.y)) return false;
  for (const s of smokes) {
    if (dist(thief.x, thief.y, s.x, s.y) < s.r) return false;
  }
  cam.seesThief = true;
  return true;
}

/** Update all cameras; returns true if any camera sees the thief. */
export function updateCameras(cameras, thief, level, smokes, now, dt) {
  let any = false;
  for (const c of cameras) if (updateCamera(c, thief, level, smokes, now, dt)) any = true;
  return any;
}

/** True while the camera is EMP-disabled. */
export function cameraDisabled(cam, now) { return cam.disabledUntil > now; }
