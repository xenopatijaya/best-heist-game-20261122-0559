[![Make the best heist game](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![Rank](https://make.fun/badge/best-heist-game-20261122-0559/xenopatijaya/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![Reward](https://make.fun/badge/best-heist-game-20261122-0559/xenopatijaya/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

# THE GILDED VAULT — A Night at the Marlow Museum

A complete top-down stealth heist game in one museum room. You are the thief:
crack the $5,000 Gilded Vault, grab the two display cases if you dare, and get
out the green EXIT before the alarm hits 100% — or a guard's hands find you.

## How to play

- **WASD / arrow keys** — move the thief
- **E (hold)** — lockpick the vault (3s) or crack a display case (1s)
- **1 / 2 / 3** — select a tool, then **click the floor** to use it
  - **Coin Toss — $25**: the nearest guard investigates the clink
  - **Smoke Pellet — ×2 free**: blocks guard and camera vision for 6s
  - **EMP — $50 (+10 alarm)**: kills both cameras for 8s
- **Shadow zones (teal) and the service vent (left lane)** hide you and drain
  the alarm. Three routes to the vault: Main Hall, Side Gallery, Service Vent.
- Reach the **EXIT** after the vault is open to score a rank (S / A / B / C).

## The room

Three patrol guards with vision cones (yellow → orange → red) and dotted
patrol routes, two sweeping wall cameras, a 0–100% alarm meter, a $100
starting wallet, and a 3-chance fair-catch system: the alarm warns hard at
70% and shadow always gives you a way back down.

## Play it

Serve `game/` with any static server and open `game/index.html` in desktop
Chrome. No network, no build step — all art is procedural canvas, all sound
is WebAudio oscillators.

## Screenshots

Deterministic states via `game/index.html?shot=cover|distract|vault|getaway`.
