// main.ts — THE GILDED VAULT hand-in program (Node 22, stdlib only).
// Copies game/ and screenshots/ from this repository into the output
// directory and writes /output/dossier.json with buildDossier from
// vendor/makefun-game.ts. Outside the grader, MAKEFUN_OUTPUT_DIR stands
// in for /output. Deterministic: the same repository writes the same bytes.

import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

// Clear only the CONTENTS of the output dir, never the dir itself:
// in the grader /output is root-owned and the runner is uid 65534, so
// removing /output itself fails EPERM (run_completes exit 1).
mkdirSync(outDir, { recursive: true });
for (const entry of readdirSync(outDir)) {
  rmSync(join(outDir, entry), { recursive: true, force: true });
}

cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
// The grader runs this twice and requires byte-identical output: every input
// here is a plain file copy plus the deterministic dossier, so both runs agree.
console.log(`dossier written: ${dossier.length} bytes -> ${join(outDir, 'dossier.json')}`);
