// render.js — every pixel is procedural canvas art: the midnight museum floor,
// gold carpet, shadow zones, marble columns, the vault, cones, and the HUD.
// No images, no fonts from the network — system sans-serif only.

import { VIEW_W, VIEW_H, HUD_H, WALL, PALETTE, fmtMoney, fmtTime } from './config.js';
import { alarmColor } from './alarm.js';
import { coinPosition } from './tools.js';
import { objectiveText } from './loot.js';
import { GUARD_RANGE, GUARD_HALF_ANGLE } from './guards.js';
import { CAMERA_RANGE, CAMERA_HALF_ANGLE, cameraDisabled } from './cameras.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function cone(ctx, x, y, dir, half, range, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, dir - half, dir + half);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function dottedPath(ctx, points, color) {
  ctx.save();
  ctx.setLineDash([2, 10]);
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.stroke();
  ctx.restore();
}

function label(ctx, text, x, y, size, color, align) {
  ctx.font = `bold ${size}px system-ui, sans-serif`;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

export function render(ctx, S, input) {
  const { level, thief, guards, cameras, loot, alarm, tools } = S;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  // ---- floor: navy checker + gold carpet runners
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
  ctx.fillStyle = PALETTE.floorAlt;
  for (let ty = HUD_H; ty < VIEW_H; ty += 64) {
    for (let tx = 0; tx < VIEW_W; tx += 64) {
      if (((tx / 64) + (ty / 64)) % 2 === 0) ctx.fillRect(tx, ty, 64, 64);
    }
  }
  ctx.fillStyle = PALETTE.carpet;
  ctx.fillRect(level.carpetV.x, level.carpetV.y, level.carpetV.w, level.carpetV.h);
  ctx.fillRect(level.carpetH.x, level.carpetH.y, level.carpetH.w, level.carpetH.h);
  ctx.strokeStyle = PALETTE.carpetEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(level.carpetV.x, level.carpetV.y, level.carpetV.w, level.carpetV.h);
  ctx.strokeRect(level.carpetH.x, level.carpetH.y, level.carpetH.w, level.carpetH.h);

  // ---- service vent (left lane) + shadow zones
  ctx.fillStyle = PALETTE.vent;
  ctx.fillRect(level.vent.x, level.vent.y, level.vent.w, level.vent.h);
  ctx.strokeStyle = PALETTE.shadowEdge;
  ctx.setLineDash([6, 6]);
  ctx.strokeRect(level.vent.x, level.vent.y, level.vent.w, level.vent.h);
  ctx.setLineDash([]);
  ctx.save();
  ctx.translate(level.vent.x + 14, level.vent.y + level.vent.h / 2);
  ctx.rotate(-Math.PI / 2);
  label(ctx, 'SERVICE VENT — SLOW · SAFE', 0, 0, 13, PALETTE.shadowEdge, 'center');
  ctx.restore();
  for (const s of level.shadows) {
    ctx.fillStyle = PALETTE.shadow;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = PALETTE.shadowEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(s.x, s.y, s.w, s.h);
    label(ctx, s.label, s.x + s.w / 2, s.y + s.h / 2, 13, 'rgba(45,212,191,0.75)');
  }

  // ---- three routes to the vault
  for (const r of level.routes) {
    dottedPath(ctx, r.points, r.color);
    const mid = r.points[2];
    label(ctx, r.name, mid[0], mid[1] - 14, 11, r.color);
  }

  // ---- EXIT door (bottom-left, green)
  const ex = level.exit;
  const exitOpen = loot.vaultOpen;
  ctx.fillStyle = exitOpen ? PALETTE.exitGlow : PALETTE.exit;
  rr(ctx, ex.x, ex.y, ex.w, ex.h, 8);
  ctx.fill();
  ctx.strokeStyle = '#052e16';
  ctx.lineWidth = 3;
  ctx.stroke();
  label(ctx, 'EXIT', ex.cx, ex.cy - 12, 26, '#052e16');
  label(ctx, exitOpen ? 'GO! GO! GO!' : 'LOCKED', ex.cx, ex.cy + 18, 11, '#052e16');
  if (exitOpen) {
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(S.time * 4);
    ctx.strokeStyle = PALETTE.exitGlow;
    ctx.lineWidth = 4;
    ctx.strokeRect(ex.x - 6, ex.y - 6, ex.w + 12, ex.h + 12);
    ctx.restore();
  }

  // ---- display cases (glass + glowing loot)
  for (const c of level.cases) {
    const taken = loot.cases[c.id];
    ctx.fillStyle = '#1e293b';
    rr(ctx, c.x, c.y, c.w, c.h, 6);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (!taken) {
      ctx.save();
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(S.time * 3 + c.x);
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.arc(c.x + c.w / 2, c.y + c.h / 2, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      label(ctx, '◆', c.x + c.w / 2, c.y + c.h / 2, 14, '#7c2d12');
      label(ctx, `${c.label} · $1,200`, c.x + c.w / 2, c.y + c.h + 14, 11, PALETTE.gold);
    } else {
      label(ctx, 'EMPTY', c.x + c.w / 2, c.y + c.h / 2, 12, '#64748b');
    }
  }

  // ---- the Gilded Vault (top-right, gold door)
  const v = level.vault;
  ctx.fillStyle = PALETTE.vault;
  rr(ctx, v.x, v.y, v.w, v.h, 10);
  ctx.fill();
  ctx.strokeStyle = PALETTE.goldDeep;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = loot.vaultOpen ? '#fef08a' : PALETTE.gold;
  ctx.beginPath();
  ctx.arc(v.x + v.w / 2, v.y + v.h / 2, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#78350f';
  ctx.beginPath();
  ctx.arc(v.x + v.w / 2, v.y + v.h / 2, 12, 0, Math.PI * 2);
  ctx.fill();
  label(ctx, loot.vaultOpen ? 'OPEN — $5,000' : 'VAULT · $5,000', v.x + v.w / 2, v.y + v.h - 14, 13, PALETTE.gold);
  label(ctx, v.label, v.x + v.w / 2, v.y - 12, 12, PALETTE.gold);
  if (loot.vaultOpen) {
    ctx.save();
    ctx.globalAlpha = 0.4 + 0.3 * Math.sin(S.time * 4);
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 3;
    ctx.strokeRect(v.x - 5, v.y - 5, v.w + 10, v.h + 10);
    ctx.restore();
  }

  // ---- marble columns (cover)
  for (const c of level.columns) {
    ctx.fillStyle = PALETTE.marble;
    rr(ctx, c.x, c.y, c.w, c.h, 6);
    ctx.fill();
    ctx.strokeStyle = '#78716c';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.strokeStyle = PALETTE.marbleVein;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(c.x + 8, c.y + 12);
    ctx.lineTo(c.x + c.w - 10, c.y + c.h * 0.4);
    ctx.moveTo(c.x + 10, c.y + c.h - 14);
    ctx.lineTo(c.x + c.w - 8, c.y + c.h * 0.6);
    ctx.stroke();
    label(ctx, 'COVER', c.x + c.w / 2, c.y + c.h / 2, 10, '#57534e');
  }

  // ---- walls
  ctx.fillStyle = PALETTE.wall;
  for (const w of level.walls) ctx.fillRect(w.x, w.y, w.w, w.h);
  ctx.strokeStyle = PALETTE.wallTrim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, HUD_H + WALL);
  ctx.lineTo(VIEW_W, HUD_H + WALL);
  ctx.moveTo(0, VIEW_H - WALL);
  ctx.lineTo(VIEW_W, VIEW_H - WALL);
  ctx.stroke();
  label(ctx, 'THE MARLOW MUSEUM — GALLERY OF GOLD', VIEW_W / 2, VIEW_H - 12, 11, 'rgba(201,162,39,0.8)');

  // ---- camera cones + mounts
  for (const cam of cameras) {
    const off = cameraDisabled(cam, S.time);
    const fill = off ? 'rgba(100,116,139,0.15)' : cam.seesThief ? 'rgba(239,68,68,0.35)' : PALETTE.cameraCone;
    cone(ctx, cam.x, cam.y, cam.dir, CAMERA_HALF_ANGLE, CAMERA_RANGE, fill);
    ctx.fillStyle = off ? '#475569' : '#e2e8f0';
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = off ? '#94a3b8' : cam.seesThief ? '#ef4444' : '#0f172a';
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 4, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, off ? `${cam.name} — EMP OFF` : cam.name, Math.max(70, Math.min(1140, cam.x)), cam.y + 22, 10, off ? '#94a3b8' : '#fde047');
  }

  // ---- guard patrol routes (dotted) + cones + bodies
  for (const g of guards) {
    dottedPath(ctx, [...g.waypoints, g.waypoints[0]], 'rgba(148,163,184,0.55)');
    const hot = g.state === 'ALERT';
    const warm = g.state === 'SUSPICIOUS';
    const fill = hot ? PALETTE.guardConeHot : warm ? 'rgba(249,115,22,0.34)' : PALETTE.guardCone;
    cone(ctx, g.x, g.y, g.dir, GUARD_HALF_ANGLE, GUARD_RANGE, fill);
    ctx.strokeStyle = hot ? '#ef4444' : warm ? '#f97316' : 'rgba(250,204,21,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.arc(g.x, g.y, GUARD_RANGE, g.dir - GUARD_HALF_ANGLE, g.dir + GUARD_HALF_ANGLE);
    ctx.closePath();
    ctx.stroke();
    // body
    ctx.fillStyle = g.color;
    ctx.beginPath();
    ctx.arc(g.x, g.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(g.x + Math.cos(g.dir) * 8, g.y + Math.sin(g.dir) * 8, 5, 0, Math.PI * 2);
    ctx.fill();
    // state label + suspicion bar
    const stateColor = hot ? '#ef4444' : warm ? '#fb923c' : '#facc15';
    label(ctx, `${g.name} · ${g.state}`, g.x, g.y - 30, 11, stateColor);
    ctx.fillStyle = 'rgba(15,23,42,0.8)';
    ctx.fillRect(g.x - 20, g.y - 24, 40, 4);
    ctx.fillStyle = stateColor;
    ctx.fillRect(g.x - 20, g.y - 24, 40 * (g.suspicion / 100), 4);
    // investigate marker
    if (g.investigate && g.state !== 'PATROL') {
      ctx.strokeStyle = stateColor;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(g.investigate.x, g.investigate.y, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      label(ctx, '?', g.investigate.x, g.investigate.y, 14, stateColor);
    }
  }

  // ---- smoke clouds
  for (const s of tools.smokes) {
    ctx.save();
    ctx.globalAlpha = 0.55 * Math.min(1, s.t);
    ctx.fillStyle = '#94a3b8';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + s.x;
      ctx.beginPath();
      ctx.arc(s.x + Math.cos(a) * 34, s.y + Math.sin(a) * 30, 34, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    label(ctx, 'SMOKE', s.x, s.y, 11, '#334155');
  }

  // ---- thrown coin (arc) + landed coin
  const cp = coinPosition(tools);
  if (cp) {
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(cp.x, cp.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 2;
    ctx.stroke();
    label(ctx, '$', cp.x, cp.y, 11, '#92400e');
    label(ctx, 'CLINK!', cp.x, cp.y - 20, 12, PALETTE.gold);
  }
  if (tools.coinRest) {
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(tools.coinRest.x, tools.coinRest.y, 9, 0, Math.PI * 2);
    ctx.fill();
    label(ctx, 'COIN', tools.coinRest.x, tools.coinRest.y - 18, 11, PALETTE.gold);
  }

  // ---- thief (black coat, gold fedora)
  ctx.save();
  ctx.translate(thief.x, thief.y);
  if (thief.inShadow) {
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = PALETTE.shadowEdge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.thief;
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.thiefTrim;
  ctx.lineWidth = 2;
  ctx.stroke();
  // fedora brim + mask
  ctx.fillStyle = PALETTE.thiefTrim;
  ctx.beginPath();
  ctx.ellipse(0, -3, 13, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.thief;
  ctx.beginPath();
  ctx.arc(0, -5, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(-8, 2, 16, 4);
  ctx.restore();
  const atExit = thief.x > level.exit.x && thief.x < level.exit.x + level.exit.w &&
    thief.y > level.exit.y && thief.y < level.exit.y + level.exit.h;
  if (!atExit) label(ctx, 'YOU', thief.x, thief.y - 28, 11, '#f8fafc');
  if (thief.inShadow) label(ctx, 'HIDDEN', thief.x, thief.y + 28, 10, PALETTE.shadowEdge);

  // ---- lockpick channel bar (fixed bottom-centre: never overlaps the vault)
  if (thief.channel) {
    const c = thief.channel;
    const pct = c.progress / c.need;
    const bx = VIEW_W / 2 - 160, by = 700;
    ctx.fillStyle = 'rgba(7,11,26,0.92)';
    rr(ctx, bx - 10, by - 26, 340, 52, 8);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    label(ctx, c.target === 'vault' ? 'LOCKPICKING THE VAULT…' : 'CRACKING CASE…', VIEW_W / 2, by - 10, 13, PALETTE.gold);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(bx, by + 2, 320, 14);
    ctx.fillStyle = pct > 0.66 ? '#22c55e' : PALETTE.gold;
    ctx.fillRect(bx, by + 2, 320 * pct, 14);
    // ring around the thief
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(thief.x, thief.y, 22, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2);
    ctx.stroke();
  }

  // ---- HUD top bar
  ctx.fillStyle = PALETTE.hud;
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.strokeStyle = PALETTE.wallTrim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, HUD_H);
  ctx.lineTo(VIEW_W, HUD_H);
  ctx.stroke();
  // title
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText('THE GILDED VAULT', 16, 20);
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('A Night at the Marlow Museum', 16, 44);
  // alarm meter (big, centre)
  const ax = 430, aw = 340;
  label(ctx, 'ALARM', ax - 8, 20, 14, alarm.value >= 70 ? '#ef4444' : '#f8fafc', 'right');
  ctx.fillStyle = '#1e293b';
  rr(ctx, ax, 10, aw, 20, 5);
  ctx.fill();
  ctx.fillStyle = alarmColor(alarm.value);
  if (aw * (alarm.value / 100) > 4) {
    rr(ctx, ax, 10, Math.max(4, aw * (alarm.value / 100)), 20, 5);
    ctx.fill();
  }
  // percentage inside the meter so it can never collide with LOOT
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(`${Math.floor(alarm.value)}%`, ax + aw - 8, 20);
  if (alarm.value >= 70) {
    ctx.save();
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(S.time * 8);
    label(ctx, '⚠ ALARM HIGH — HIDE IN SHADOW!', 600, 50, 13, '#ef4444');
    ctx.restore();
  }
  // loot / wallet / time / chances — all on row 1 (row 2 belongs to the tools)
  ctx.textAlign = 'right';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText(`LOOT ${fmtMoney(loot.total)}`, 880, 20);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(`WALLET ${fmtMoney(tools.wallet)}`, 1005, 20);
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(`⏱ ${fmtTime(S.time)}`, 1115, 20);
  ctx.fillStyle = '#f87171';
  ctx.fillText(`${'●'.repeat(S.chances)}${'○'.repeat(Math.max(0, 3 - S.chances))}`, 1264, 20);
  // objective line + tool slots (row 2)
  ctx.textAlign = 'left';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillStyle = loot.vaultOpen ? '#4ade80' : '#f8fafc';
  ctx.fillText(`◆ ${objectiveText(loot)}`, 16, 52);
  const slots = [
    { tool: 'coin', key: '1', name: 'COIN TOSS', cost: '$25', ok: tools.wallet >= 25 },
    { tool: 'smoke', key: '2', name: `SMOKE ×${tools.smokeLeft}`, cost: 'FREE', ok: tools.smokeLeft > 0 },
    { tool: 'emp', key: '3', name: 'EMP', cost: '$50', ok: tools.wallet >= 50 },
  ];
  input.toolSlots = [];
  let sx = 640;
  for (const s of slots) {
    const w = 190;
    const selected = tools.selected === s.tool;
    ctx.fillStyle = selected ? '#713f12' : '#1e293b';
    rr(ctx, sx, 36, w, 22, 5);
    ctx.fill();
    ctx.strokeStyle = selected ? PALETTE.gold : '#475569';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.stroke();
    ctx.fillStyle = s.ok ? '#f8fafc' : '#64748b';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`[${s.key}] ${s.name} ${s.cost}`, sx + 8, 47);
    input.toolSlots.push({ tool: s.tool, x: sx, y: 36, w, h: 22 });
    sx += w + 10;
  }

  // ---- toast message
  if (S.toast && S.time < S.toastUntil) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, (S.toastUntil - S.time) * 2);
    ctx.fillStyle = 'rgba(7,11,26,0.92)';
    const tw = ctx.measureText(S.toast).width + 40;
    rr(ctx, VIEW_W / 2 - tw / 2, 84, tw, 34, 8);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    label(ctx, S.toast, VIEW_W / 2, 101, 15, PALETTE.gold);
    ctx.restore();
  }

  // ---- overlays
  if (S.phase === 'title') {
    ctx.fillStyle = 'rgba(4,7,20,0.82)';
    ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
    label(ctx, 'THE GILDED VAULT', VIEW_W / 2, 250, 54, PALETTE.gold);
    label(ctx, 'A Night at the Marlow Museum', VIEW_W / 2, 300, 22, '#f8fafc');
    label(ctx, 'Steal the $5,000 vault. Dodge cones. Spend your $100 wisely. Get out alive.', VIEW_W / 2, 350, 17, '#cbd5e1');
    label(ctx, 'WASD / ARROWS — move      E (hold) — lockpick      1 / 2 / 3 — tools      Click — use tool', VIEW_W / 2, 400, 16, '#f8fafc');
    label(ctx, 'Shadow zones hide you. Smoke blocks vision. Coins lure guards. EMP kills cameras.', VIEW_W / 2, 432, 15, '#94a3b8');
    label(ctx, 'CLICK OR PRESS ANY KEY TO START THE HEIST', VIEW_W / 2, 500, 18, PALETTE.gold);
  }
  if (S.phase === 'caught') {
    ctx.strokeStyle = 'rgba(239,68,68,0.9)';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, HUD_H + 5, VIEW_W - 10, VIEW_H - HUD_H - 10);
    label(ctx, 'CAUGHT!', VIEW_W / 2, 360, 60, '#ef4444');
    label(ctx, S.caughtReason || 'The alarm hit 100%.', VIEW_W / 2, 410, 18, '#f8fafc');
    label(ctx, `Chances left: ${S.chances} — the room resets, your loot stays.`, VIEW_W / 2, 444, 16, '#cbd5e1');
  }
  if (S.phase === 'over') {
    ctx.fillStyle = 'rgba(4,7,20,0.88)';
    ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
    label(ctx, 'THE HEIST FAILED', VIEW_W / 2, 300, 48, '#ef4444');
    label(ctx, `Loot kept: ${fmtMoney(loot.total)} — the museum keeps the rest.`, VIEW_W / 2, 360, 18, '#f8fafc');
    label(ctx, 'Press R to try again', VIEW_W / 2, 410, 17, PALETTE.gold);
  }
  if (S.phase === 'win') {
    ctx.fillStyle = 'rgba(4,7,20,0.85)';
    ctx.fillRect(0, HUD_H, VIEW_W, VIEW_H - HUD_H);
    label(ctx, 'CLEAN GETAWAY!', VIEW_W / 2, 240, 54, '#4ade80');
    label(ctx, `RANK ${S.rank}`, VIEW_W / 2, 320, 44, PALETTE.gold);
    label(ctx, `LOOT ${fmtMoney(loot.total)}   ·   TIME ${fmtTime(S.time)}   ·   PEAK ALARM ${Math.floor(alarm.peak)}%`, VIEW_W / 2, 380, 20, '#f8fafc');
    label(ctx, S.rankText || '', VIEW_W / 2, 420, 17, '#cbd5e1');
    label(ctx, 'Press R to run it again — faster, quieter, richer.', VIEW_W / 2, 470, 16, PALETTE.gold);
  }
}
