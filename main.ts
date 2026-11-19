// Solmar Bay — packaging entrypoint, round 2.
// Mirrors the static game in game/ and the screenshots in screenshots/
// into the output folder, then writes dossier.json there with the
// make.fun dossier builder. Node 22, standard library only.

import { copyFile, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath as urlToPath } from 'node:url';
import { buildDossier as makeDossier } from './vendor/makefun-game.ts';

const MAX_TEXT_BYTES = 163840;
const MAX_SHOTS = 4;
const MAX_SHOT_BYTES = 262144;
const MAX_GAME_FILES = 993;
const MAX_GAME_BYTES = 50331648;
const MAX_GAME_PATH_BYTES = 1000;

const repoRoot = dirname(urlToPath(import.meta.url));
const outDir = pickOutDir();

function pickOutDir(): string {
  const fromEnv = (process.env.MAKEFUN_OUTPUT_DIR ?? '').trim();
  return fromEnv.length > 0 ? fromEnv : '/output';
}

async function collect(root: string, dir: string, acc: string[]): Promise<void> {
  const kids = await readdir(dir, { withFileTypes: true });
  for (const kid of kids) {
    const full = join(dir, kid.name);
    const rel = relative(root, full).split(sep).join('/');
    acc.push(rel);
    if (kid.isDirectory()) await collect(root, full, acc);
  }
}

async function mirror(root: string, target: string): Promise<number> {
  const entries: string[] = [];
  await collect(root, root, entries);
  let files = 0;
  for (const rel of entries) {
    const src = join(root, rel);
    const dst = join(target, rel);
    const info = await stat(src);
    if (info.isDirectory()) {
      await mkdir(dst, { recursive: true });
      continue;
    }
    await mkdir(dirname(dst), { recursive: true });
    await copyFile(src, dst);
    files += 1;
  }
  return files;
}

async function packEntry(): Promise<void> {
  await mkdir(outDir, { recursive: true });
  const gameDir = join(repoRoot, 'game');
  const indexPage = join(gameDir, 'index.html');
  try {
    await stat(indexPage);
  } catch {
    throw new Error('game/index.html is missing; nothing to package');
  }
  const gameFiles = await mirror(gameDir, join(outDir, 'game'));
  let shotFiles = 0;
  const shotsDir = join(repoRoot, 'screenshots');
  try {
    await stat(shotsDir);
    shotFiles = await mirror(shotsDir, join(outDir, 'screenshots'));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
  const limits = {
    text_max_bytes: MAX_TEXT_BYTES,
    screenshots: { max: MAX_SHOTS, max_bytes: MAX_SHOT_BYTES },
    game_max_files: MAX_GAME_FILES,
    game_max_bytes: MAX_GAME_BYTES,
    game_path_max_bytes: MAX_GAME_PATH_BYTES,
  };
  const dossierText = await makeDossier(outDir, limits);
  const dossierPath = join(outDir, 'dossier.json');
  await writeFile(dossierPath, dossierText);
  const dossierSize = Buffer.byteLength(dossierText, 'utf8');
  console.log(`packaged ${gameFiles + shotFiles} files into ${outDir}; dossier.json is ${dossierSize} bytes`);
}

try {
  await packEntry();
} catch (err) {
  console.error('packaging failed:', err);
  process.exit(1);
}
// Round 2: entrypoint authored fresh in the recorded session.
