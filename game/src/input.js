// input.js — keyboard (WASD / arrows + E + 1/2/3) and mouse (click a tool,
// then click a target). Also exposes the HUD tool-button hit rects so the
// canvas click handler can select tools.

import { HUD_H } from './config.js';

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouse: { x: 0, y: 0, clicked: null },
    toolSlots: [], // {tool, x, y, w, h} filled by render each frame
    interactHeld: false,
    anyPressed: false,
  };
  const keyName = (e) => {
    const k = e.key.toLowerCase();
    if (k === 'arrowup' || k === 'w') return 'up';
    if (k === 'arrowdown' || k === 's') return 'down';
    if (k === 'arrowleft' || k === 'a') return 'left';
    if (k === 'arrowright' || k === 'd') return 'right';
    if (k === 'e') return 'interact';
    if (k === '1') return 'tool1';
    if (k === '2') return 'tool2';
    if (k === '3') return 'tool3';
    if (k === 'r') return 'restart';
    if (k === ' ') return 'space';
    return null;
  };
  window.addEventListener('keydown', (e) => {
    const k = keyName(e);
    if (k) {
      if (['up', 'down', 'left', 'right', 'space'].includes(k)) e.preventDefault();
      input.keys.add(k);
      input.anyPressed = true;
    }
  });
  window.addEventListener('keyup', (e) => {
    const k = keyName(e);
    if (k) input.keys.delete(k);
  });
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    input.mouse.x = x; input.mouse.y = y;
    input.mouse.clicked = { x, y };
    input.anyPressed = true;
  });
  return input;
}

/** Movement vector from held keys, normalized. */
export function moveVector(input) {
  let x = 0, y = 0;
  if (input.keys.has('left')) x -= 1;
  if (input.keys.has('right')) x += 1;
  if (input.keys.has('up')) y -= 1;
  if (input.keys.has('down')) y += 1;
  if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
  return { x, y };
}

/** True while the interact key (E) is held. */
export function interactHeld(input) { return input.keys.has('interact'); }

/** Consume one pending click, or null. */
export function takeClick(input) {
  const c = input.mouse.clicked;
  input.mouse.clicked = null;
  return c;
}

/** Which HUD tool slot (if any) a click landed on. */
export function slotAt(input, x, y) {
  for (const s of input.toolSlots) {
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return s.tool;
  }
  return null;
}

export { HUD_H };
