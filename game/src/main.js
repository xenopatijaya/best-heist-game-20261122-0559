// main.js — THE GILDED VAULT: game state, the frame loop, win/lose flow and
// the deterministic ?shot= screenshot mode. Wires every module together.

import { VIEW_W, VIEW_H, makeRng, clamp } from './config.js';
import { buildLevel } from './level.js';
import { createInput, moveVector, interactHeld, takeClick, slotAt } from './input.js';
import { createThief, updateThief, updateChannel, thiefAtExit } from './thief.js';
import { createGuards, updateGuards } from './guards.js';
import { createCameras, updateCameras } from './cameras.js';
import { createLoot, bankLoot, objectiveText } from './loot.js';
import { createAlarm, updateAlarm, addAlarm } from './alarm.js';
import { createTools, useTool, updateTools } from './tools.js';
import { render } from './render.js';
import { applyShot, SHOT_NAMES } from './shots.js';
import {
  unlockAudio, soundPick, soundCoin, soundSmoke, soundEmp,
  soundAlarm, soundVault, soundCaught, soundWin,
} from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function newState() {
  const level = buildLevel();
  return {
    level,
    thief: createThief(level),
    guards: createGuards(level),
    cameras: createCameras(),
    loot: createLoot(),
    alarm: createAlarm(),
    tools: createTools(),
    rng: makeRng(20261122),
    time: 0,
    chances: 3,
    phase: 'title', // title | play | caught | win | over
    rank: '', rankText: '',
    toast: '', toastUntil: 0,
    caughtReason: '', caughtUntil: 0,
    shot: null,
    prevAlarmWarn: false,
  };
}

let S = newState();
const input = createInput(canvas);

function showToast(text, seconds) {
  S.toast = text;
  S.toastUntil = S.time + seconds;
}

/** Score rank from loot, time and peak alarm. */
export function scoreRank(lootTotal, time, peakAlarm) {
  if (lootTotal >= 7400 && time <= 150 && peakAlarm < 50) return ['S', 'Ghost run — full loot, fast, barely a whisper.'];
  if (lootTotal >= 6200 && peakAlarm < 75) return ['A', 'Clean crew work — the vault and most of the cases.'];
  if (lootTotal >= 5000) return ['B', 'Vault cracked and out alive — the crew eats tonight.'];
  return ['C', 'Out alive with something — but the museum keeps its best.'];
}

function resetRoom(keepLoot) {
  const level = S.level;
  const loot = S.loot;
  const total = loot.total;
  const vaultOpen = loot.vaultOpen;
  const cases = { ...loot.cases };
  const chances = S.chances;
  const time = S.time;
  const tools = S.tools;
  S.thief = createThief(level);
  S.guards = createGuards(level);
  S.cameras = createCameras();
  S.alarm = createAlarm();
  S.alarm.value = 20;
  S.chances = chances;
  S.time = time;
  if (keepLoot) {
    S.loot = { vaultOpen, cases, total, vaultFlash: 0 };
  } else {
    S.loot = createLoot();
  }
  S.tools.smokes = [];
  S.tools.coin = null;
  S.tools.coinRest = null;
  S.phase = 'play';
}

function onCaught(reason) {
  S.chances -= 1;
  soundCaught();
  S.caughtReason = reason;
  if (S.chances <= 0) {
    S.phase = 'over';
  } else {
    S.phase = 'caught';
    S.caughtUntil = S.time + 2.2;
    showToast(`CAUGHT — ${reason} Chances left: ${S.chances}.`, 2.2);
  }
}

function onWin() {
  const [rank, text] = scoreRank(S.loot.total, S.time, S.alarm.peak);
  S.rank = rank;
  S.rankText = text;
  S.phase = 'win';
  soundWin();
}

function step(dt) {
  dt = Math.min(dt, 0.05);
  if (S.phase === 'caught') {
    S.time += dt; // the clock must run during the caught pause, or it never ends
    if (S.time >= S.caughtUntil) resetRoom(true);
    return;
  }
  if (S.phase !== 'play') return;
  S.time += dt;
  if (S.loot.vaultFlash > 0) S.loot.vaultFlash -= dt;

  // --- tools: clicks on HUD slots select; clicks on the floor use the tool
  const click = takeClick(input);
  if (click) {
    unlockAudio();
    const slot = slotAt(input, click.x, click.y);
    if (slot) {
      S.tools.selected = slot;
      soundPick();
    } else if (click.y > 64) {
      const prevWallet = S.tools.wallet;
      const prevSmoke = S.tools.smokeLeft;
      const note = useTool(S.tools, S.guards, S.cameras, S.thief, click.x, click.y, S.time);
      if (note) showToast(note, 2.5);
      if (S.tools.selected === 'coin' && S.tools.wallet < prevWallet) soundCoin();
      if (S.tools.selected === 'smoke' && S.tools.smokeLeft < prevSmoke) soundSmoke();
      if (S.tools.selected === 'emp' && S.tools.wallet < prevWallet) {
        soundEmp();
        addAlarm(S.alarm, 10);
      }
    }
  }
  if (input.keys.has('tool1')) S.tools.selected = 'coin';
  if (input.keys.has('tool2')) S.tools.selected = 'smoke';
  if (input.keys.has('tool3')) S.tools.selected = 'emp';

  // --- thief: move + lockpick channel
  const vec = moveVector(input);
  updateThief(S.thief, S.level, vec, dt);
  const done = updateChannel(S.thief, S.level, S.loot, interactHeld(input), dt);
  if (done) {
    const gained = bankLoot(S.loot, done);
    if (done.target === 'vault') {
      soundVault();
      showToast(`VAULT OPEN — $5,000! Now get to the EXIT!`, 3.5);
    } else {
      soundCoin();
      showToast(`Case cracked — +$${gained.toLocaleString('en-US')}!`, 2.5);
    }
  }
  if (S.thief.channel && interactHeld(input)) {
    if (Math.floor(S.time * 5) !== Math.floor((S.time - dt) * 5)) soundPick();
  }

  // --- guards + cameras + alarm
  updateTools(S.tools, S.guards, dt);
  const guardResult = updateGuards(S.guards, S.thief, S.level, S.tools.smokes, dt);
  const cameraSeen = updateCameras(S.cameras, S.thief, S.level, S.tools.smokes, S.time, dt);
  const seenByGuard = guardResult === 'seen';
  const alarmResult = updateAlarm(S.alarm, seenByGuard, cameraSeen, S.thief.inShadow, dt);
  if (S.alarm.value >= 70 && !S.prevAlarmWarn) soundAlarm();
  S.prevAlarmWarn = S.alarm.value >= 70;
  if (alarmResult === 'caught') {
    onCaught('The alarm hit 100% — the museum locks down.');
    return;
  }
  if (guardResult === 'caught') {
    onCaught('A guard grabbed you in the gallery.');
    return;
  }

  // --- win: vault open + reach the EXIT
  if (S.loot.vaultOpen && thiefAtExit(S.thief, S.level)) onWin();
}

function frame(t) {
  const dt = (t - (frame.last || t)) / 1000;
  frame.last = t;
  step(dt || 0.016);
  render(ctx, S, input);
  if (!S.shot) requestAnimationFrame(frame);
}

// --- title screen: any key or click starts the heist
function maybeStart() {
  if (S.phase === 'title' && input.anyPressed) {
    unlockAudio();
    S.phase = 'play';
    showToast('The museum is yours for one night. Stay out of the cones.', 3.5);
  }
  if ((S.phase === 'win' || S.phase === 'over') && input.keys.has('restart')) {
    S = newState();
    S.phase = 'play';
    input.keys.clear();
  }
}

// --- boot: deterministic screenshot mode or the live game
const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
if (shotName && SHOT_NAMES.includes(shotName)) {
  S.shot = applyShot(S, shotName);
  render(ctx, S, input);
  document.title = `THE GILDED VAULT — shot ${shotName}`;
} else {
  const loop = (t) => { maybeStart(); frame(t); };
  requestAnimationFrame(loop);
}

// Test / automation handle: play-test scripts drive the game through this.
window.__game = {
  get state() { return S; },
  get input() { return input; },
  start() { S.phase = 'play'; },
  reset(fresh) { S = fresh ? newState() : S; if (!fresh) S.phase = 'play'; },
  step(dt) { step(dt); render(ctx, S, input); },
  render() { render(ctx, S, input); },
  scoreRank,
  objectiveText: () => objectiveText(S.loot),
};

export { newState };
