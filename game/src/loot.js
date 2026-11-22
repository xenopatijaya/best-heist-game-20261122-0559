// loot.js — the loot: the Gilded Vault ($5,000, 3s channel) and the two
// display cases ($1,200 each, 1s crack). Tracks what is taken and the total.

import { LOOT_VALUES } from './config.js';

export function createLoot() {
  return {
    vaultOpen: false,
    cases: { A: false, B: false },
    total: 0,
    vaultFlash: 0,
  };
}

/** Bank a finished channel: vault or a case. Returns the dollars gained. */
export function bankLoot(loot, done) {
  if (!done) return 0;
  if (done.target === 'vault' && !loot.vaultOpen) {
    loot.vaultOpen = true;
    loot.total += LOOT_VALUES.vault;
    loot.vaultFlash = 1.5;
    return LOOT_VALUES.vault;
  }
  const id = done.caseId;
  if (id && !loot.cases[id]) {
    loot.cases[id] = true;
    loot.total += LOOT_VALUES.caseA;
    return LOOT_VALUES.caseA;
  }
  return 0;
}

/** True when every loot target is taken. */
export function allLootTaken(loot) {
  return loot.vaultOpen && loot.cases.A && loot.cases.B;
}

/** Objective line for the HUD, from the current loot state. */
export function objectiveText(loot) {
  if (loot.vaultOpen) return 'VAULT OPEN — GET TO THE EXIT!';
  return 'CRACK THE VAULT — $5,000';
}
