// Copies MediaPipe wasm runtime from node_modules and downloads the face model into public/mediapipe/,
// so the app loads everything from its own origin (no CDN at runtime).
import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'mediapipe');
const wasmSrc = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const wasmOut = join(outDir, 'wasm');
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const modelOut = join(outDir, 'face_landmarker.task');

const exists = (p) => stat(p).then(() => true, () => false);

await mkdir(wasmOut, { recursive: true });
for (const f of [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
]) {
  await copyFile(join(wasmSrc, f), join(wasmOut, f));
}

if (!(await exists(modelOut))) {
  console.log('[mediapipe] downloading face_landmarker.task …');
  try {
    const res = await fetch(MODEL_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(modelOut, Buffer.from(await res.arrayBuffer()));
  } catch (err) {
    // The app still runs without the model and shows "분석 불가".
    console.warn(`[mediapipe] model download failed (${err.message}); face analysis will be unavailable.`);
  }
}
console.log('[mediapipe] ready in public/mediapipe/');
