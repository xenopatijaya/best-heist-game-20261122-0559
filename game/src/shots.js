// shots.js — deterministic screenshot states for ?shot=cover|distract|vault|getaway.
// Each shot pins every moving piece to fixed coordinates and a fixed clock, so
// the same URL renders byte-identical every run. No Math.random is used here.

import { makeRng } from './config.js';

export const SHOT_NAMES = ['cover', 'distract', 'vault', 'getaway'];

/** Apply a shot setup to a fresh state S. Returns the shot label for the HUD. */
export function applyShot(S, name) {
  const { level, thief, guards, cameras, loot, alarm, tools } = S;
  const rng = makeRng(20261122);
  S.rng = rng;
  S.time = 42; // fixed clock: twinkle and sweeps are identical every run
  S.phase = 'play';
  S.toast = '';
  S.toastUntil = 0;
  if (name === 'cover') {
    thief.x = 640; thief.y = 520; thief.dir = -Math.PI / 2;
    guards[0].x = 640; guards[0].y = 330; guards[0].dir = Math.PI / 2; guards[0].state = 'PATROL'; guards[0].suspicion = 10;
    guards[1].x = 980; guards[1].y = 480; guards[1].dir = Math.PI; guards[1].state = 'PATROL'; guards[1].suspicion = 5;
    guards[2].x = 1000; guards[2].y = 260; guards[2].dir = Math.PI / 2; guards[2].state = 'SUSPICIOUS'; guards[2].suspicion = 62;
    guards[2].investigate = { x: 900, y: 300 };
    cameras[0].phase = 0.35; cameras[0].dir = Math.PI / 2 + Math.sin(0.35) * 0.9;
    cameras[1].phase = 1.7; cameras[1].dir = Math.PI + Math.sin(1.7) * 0.8;
    alarm.value = 34; alarm.peak = 34;
    loot.total = 0;
    tools.wallet = 100; tools.smokeLeft = 2; tools.selected = 'coin';
    S.toast = 'Three routes to the vault — pick one, watch the cones.';
    S.toastUntil = 9999;
    return 'cover';
  }
  if (name === 'distract') {
    thief.x = 430; thief.y = 690; thief.dir = -Math.PI / 2;
    guards[0].x = 640; guards[0].y = 430; guards[0].dir = angleToGuard(640, 430, 700, 300);
    guards[0].state = 'SUSPICIOUS'; guards[0].suspicion = 68;
    guards[0].investigate = { x: 700, y: 300 };
    guards[1].x = 900; guards[1].y = 560; guards[1].dir = -Math.PI / 2; guards[1].state = 'PATROL'; guards[1].suspicion = 8;
    guards[2].x = 1080; guards[2].y = 240; guards[2].dir = Math.PI; guards[2].state = 'PATROL'; guards[2].suspicion = 0;
    cameras[0].phase = 0.9; cameras[0].dir = Math.PI / 2 + Math.sin(0.9) * 0.9;
    cameras[1].phase = 0.2; cameras[1].dir = Math.PI + Math.sin(0.2) * 0.8;
    tools.coin = { x0: 430, y0: 690, x1: 700, y1: 300, t: 0.3, dur: 0.6 };
    tools.wallet = 75; tools.smokeLeft = 2; tools.selected = 'coin';
    alarm.value = 22; alarm.peak = 31;
    loot.total = 0;
    S.toast = 'Coin tossed — MARCO turns to check the clink!';
    S.toastUntil = 9999;
    return 'distract';
  }
  if (name === 'vault') {
    thief.x = 1020; thief.y = 156; thief.dir = 0;
    thief.channel = { target: 'vault', progress: 1.98, need: 3.0, x: 1040, y: 156, caseId: null };
    guards[0].x = 560; guards[0].y = 420; guards[0].dir = Math.PI; guards[0].state = 'PATROL'; guards[0].suspicion = 15;
    guards[1].x = 860; guards[1].y = 620; guards[1].dir = -Math.PI / 2; guards[1].state = 'PATROL'; guards[1].suspicion = 12;
    guards[2].x = 980; guards[2].y = 340; guards[2].dir = -Math.PI / 2; guards[2].state = 'SUSPICIOUS'; guards[2].suspicion = 71;
    guards[2].investigate = { x: 1040, y: 200 };
    cameras[0].phase = -0.4; cameras[0].dir = Math.PI / 2 + Math.sin(-0.4) * 0.9;
    cameras[1].phase = 2.4; cameras[1].dir = Math.PI + Math.sin(2.4) * 0.8;
    cameras[1].disabledUntil = 9999; // EMP just fired — CAM 2 dark
    tools.empUntil = 9999;
    tools.wallet = 50; tools.smokeLeft = 1; tools.selected = 'emp';
    tools.smokes = [{ x: 900, y: 500, r: 90, t: 4 }];
    loot.cases.A = true; loot.total = 1200;
    alarm.value = 58; alarm.peak = 58;
    S.toast = 'Lockpicking the vault — hold steady, 3 seconds…';
    S.toastUntil = 9999;
    return 'vault';
  }
  // getaway
  thief.x = 96; thief.y = 716; thief.dir = Math.PI;
  guards[0].x = 380; guards[0].y = 580; guards[0].dir = 0; guards[0].state = 'PATROL'; guards[0].suspicion = 5;
  guards[1].x = 980; guards[1].y = 480; guards[1].dir = Math.PI; guards[1].state = 'PATROL'; guards[1].suspicion = 0;
  guards[2].x = 1160; guards[2].y = 260; guards[2].dir = Math.PI / 2; guards[2].state = 'PATROL'; guards[2].suspicion = 0;
  cameras[0].phase = 0.1; cameras[0].dir = Math.PI / 2 + Math.sin(0.1) * 0.9;
  cameras[1].phase = 1.1; cameras[1].dir = Math.PI + Math.sin(1.1) * 0.8;
  loot.vaultOpen = true; loot.cases.A = true; loot.cases.B = true; loot.total = 7400;
  alarm.value = 18; alarm.peak = 46;
  tools.wallet = 25; tools.smokeLeft = 0; tools.selected = 'smoke';
  S.time = 96;
  S.toast = 'Vault cracked — $7,400 in the bag. OUT THE EXIT!';
  S.toastUntil = 9999;
  return 'getaway';
}

function angleToGuard(ax, ay, bx, by) { return Math.atan2(by - ay, bx - ax); }

export { makeRng };
