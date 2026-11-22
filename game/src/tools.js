// tools.js — the thief's tools, bought from a $100 starting wallet:
// Coin Toss ($25) pulls the nearest guard to investigate the coin, Smoke
// Pellet (x2 free) blocks vision for 6s, EMP ($50, +10 alarm) kills the
// cameras for 8s. Click a tool, then click a target on the floor.

import { PRICES, START_WALLET, clamp, dist } from './config.js';

export function createTools() {
  return {
    wallet: START_WALLET,
    selected: 'coin',
    smokeLeft: PRICES.smokeFree,
    coin: null, // {x0,y0,x1,y1,t} flying coin, or null
    coinRest: null, // {x, y, t} landed coin, guards investigate it
    smokes: [], // {x, y, r, t}
    empUntil: 0,
    message: '',
    messageUntil: 0,
  };
}

/** Spend from the wallet; false when broke. */
function spend(tools, amount) {
  if (tools.wallet < amount) return false;
  tools.wallet -= amount;
  return true;
}

/** Use the selected tool at floor point (x,y). Returns a note for the HUD. */
export function useTool(tools, guards, cameras, thief, x, y, now) {
  const tool = tools.selected;
  if (tool === 'coin') {
    if (!spend(tools, PRICES.coin)) return 'Not enough cash for a coin — $25.';
    tools.coin = { x0: thief.x, y0: thief.y, x1: x, y1: y, t: 0, dur: 0.6 };
    return 'Coin tossed — a guard will check the clink…';
  }
  if (tool === 'smoke') {
    if (tools.smokeLeft <= 0) return 'No smoke pellets left.';
    tools.smokeLeft -= 1;
    tools.smokes.push({ x, y, r: 90, t: 6 });
    return 'Smoke out — vision blocked for 6s.';
  }
  if (tool === 'emp') {
    if (!spend(tools, PRICES.emp)) return 'Not enough cash for the EMP — $50.';
    for (const c of cameras) c.disabledUntil = now + 8;
    tools.empUntil = now + 8;
    return 'EMP fired — cameras dead 8s (+10 alarm).';
  }
  return '';
}

/** Step coin flight, landed-coin guard lure, and smoke timers. */
export function updateTools(tools, guards, dt) {
  if (tools.coin) {
    tools.coin.t += dt;
    if (tools.coin.t >= tools.coin.dur) {
      const c = tools.coin;
      tools.coinRest = { x: c.x1, y: c.y1, t: 4 };
      tools.coin = null;
      // Nearest guard within 420px turns to investigate the coin.
      let best = null, bd = 420;
      for (const g of guards) {
        const d = dist(g.x, g.y, c.x1, c.y1);
        if (d < bd) { bd = d; best = g; }
      }
      if (best) {
        best.state = 'SUSPICIOUS';
        best.investigate = { x: c.x1, y: c.y1 };
        best.suspicion = Math.max(best.suspicion, 60);
        best.lookTimer = 0;
      }
    }
  }
  if (tools.coinRest) {
    tools.coinRest.t -= dt;
    if (tools.coinRest.t <= 0) tools.coinRest = null;
  }
  for (const s of tools.smokes) s.t -= dt;
  tools.smokes = tools.smokes.filter((s) => s.t > 0);
}

/** Current coin position while it flies (arc), or null. */
export function coinPosition(tools) {
  const c = tools.coin;
  if (!c) return null;
  const t = clamp(c.t / c.dur, 0, 1);
  return {
    x: c.x0 + (c.x1 - c.x0) * t,
    y: c.y0 + (c.y1 - c.y0) * t - Math.sin(t * Math.PI) * 70,
    t,
  };
}

export { PRICES };
