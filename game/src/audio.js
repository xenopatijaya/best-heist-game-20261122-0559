// audio.js — all sound is WebAudio oscillators, no audio files, no network.
// Short blips for picking, coins, alarms and the getaway fanfare.

let ctx = null;

function ensureCtx() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch (_) { ctx = null; }
  return ctx;
}

/** Unlock audio on the first user gesture. */
export function unlockAudio() { ensureCtx(); }

/** One oscillator blip. */
export function blip(freq, dur, type, gain) {
  const ac = ensureCtx();
  if (!ac) return;
  try {
    if (ac.state === 'suspended') ac.resume();
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain || 0.08, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.connect(g); g.connect(ac.destination);
    o.start(); o.stop(ac.currentTime + dur);
  } catch (_) { /* audio is cosmetic; never break the game */ }
}

export function soundPick() { blip(660, 0.12, 'triangle', 0.07); }
export function soundCoin() { blip(1320, 0.1, 'sine', 0.07); setTimeout(() => blip(1760, 0.12, 'sine', 0.06), 70); }
export function soundSmoke() { blip(220, 0.25, 'sawtooth', 0.04); }
export function soundEmp() { blip(110, 0.3, 'square', 0.05); }
export function soundAlarm() { blip(880, 0.15, 'square', 0.05); setTimeout(() => blip(660, 0.15, 'square', 0.05), 160); }
export function soundVault() { [523, 659, 784].forEach((f, i) => setTimeout(() => blip(f, 0.18, 'triangle', 0.08), i * 110)); }
export function soundCaught() { [392, 311, 233].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'sawtooth', 0.06), i * 130)); }
export function soundWin() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'triangle', 0.08), i * 120)); }
