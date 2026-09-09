// Step 1 of the sprite treatment: cut a FLAT generated backdrop off a sprite.
//
// Usage: node key.mjs <in.png> <out.png> [--tol N] [--soft N] [--floor N] [--band N]
//
// Image generators keep returning sprites painted onto a solid studio backdrop instead
// of transparency. `fit.mjs` refuses those by design (exit 3) so nobody can quietly key
// out a *photographic* background. This script is the deliberate, narrow exception: it
// only handles a backdrop that is provably flat, and it refuses anything else.
//
// Method — flood fill from the border, NOT a global colour key. A global key deletes
// every pixel of that colour anywhere in the frame, including inside the subject (glass
// tint, a shadow under a bumper). A fill can only reach what is actually connected to
// the outside, so enclosed subject detail is structurally safe.
//
//   1. Idempotent: a source that already has real alpha at all four corners is copied
//      through untouched, so re-running the pipeline is free.
//   2. Estimate the backdrop as the per-channel median of the 2px border ring, then
//      REFUSE (exit 3) unless >= 98% of that ring sits within `tol` of it — that is the
//      "provably flat" test, and it is what stops this being a general background remover.
//   3. Flood fill from the border. Distance <= tol -> fully transparent. Distance between
//      tol and soft -> partial alpha, so the illustration's antialiased outline feathers
//      instead of turning into stairsteps. Band pixels propagate at most `band` px from
//      solid backdrop, so a soft edge can never tunnel into the subject.
//   4. Despill every partial pixel: observed = a*F + (1-a)*B, so recover F and write it
//      back. Without this the sprite carries a rim of the old backdrop colour and reads
//      as a halo over the theater's night palette.
//   5. Open enclosed POCKETS the border fill cannot reach — backdrop the subject fully
//      surrounds, like the slot between a roof rack and the roof. Left opaque, a pocket
//      is a slab of the old backdrop floating inside the silhouette, which is exactly the
//      seam this whole script exists to remove. But a global colour key would also eat
//      subject pixels that merely land near the backdrop colour, so pockets are taken as
//      CONNECTED COMPONENTS and only those at least `pockets` px are opened. On the DT14
//      wagon that cleanly splits the three real holes (6094/300/294 px) from the chrome
//      shading on the bumper (357 slivers, none over 79 px), which must stay.
//   6. Floor near-zero alpha to 0 (and near-full to 255) so the bbox `fit.mjs` measures
//      is the bbox that survives PNG quantisation. (DT14 open flag: a faint sub-1% alpha
//      fringe under the car survived the fit and was then dropped by palette
//      quantisation, leaving the subject floating 31px above the canvas bottom.)
//
// Whatever is left closed is reported with its size, because the threshold is a judgement
// call: look at the result before believing it.
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";

const args = process.argv.slice(2);
const flag = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? dflt : Number(args[i + 1]);
};
const positional = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const [inp, out] = positional;
if (!inp || !out) {
  console.error("usage: node key.mjs <in.png> <out.png> [--tol N] [--soft N] [--floor N] [--band N]");
  process.exit(2);
}
const TOL = flag("tol", 26); // <= this distance from the backdrop is backdrop
const SOFT = flag("soft", 60); // >= this distance is subject; between the two is the AA band
const FLOOR = flag("floor", 8); // alpha below this is snapped to 0, above 255-this to 255
const BAND = flag("band", 4); // how many px a partial-alpha edge may travel from solid backdrop
const POCKETS = flag("pockets", 200); // open enclosed backdrop components >= this many px; 0 = report only

const { data, info } = await sharp(inp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const N = W * H;
const alphaAt = (x, y) => data[(y * W + x) * 4 + 3];

// 1. Already keyed? Copy through, so the pipeline is idempotent.
const corners = [alphaAt(0, 0), alphaAt(W - 1, 0), alphaAt(0, H - 1), alphaAt(W - 1, H - 1)];
if (corners.every((a) => a === 0)) {
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.copyFileSync(inp, out);
  console.log(`already keyed (corners ${corners.join(",")}) — copied ${inp} -> ${out} unchanged`);
  process.exit(0);
}

// 2. Estimate the backdrop from the border ring, and refuse unless it is flat.
const ring = [];
for (let x = 0; x < W; x++)
  for (const y of [0, 1, H - 2, H - 1]) ring.push((y * W + x) * 4);
for (let y = 0; y < H; y++)
  for (const x of [0, 1, W - 2, W - 1]) ring.push((y * W + x) * 4);
const median = (vals) => vals.sort((a, b) => a - b)[vals.length >> 1];
const BG = [0, 1, 2].map((c) => median(ring.map((i) => data[i + c])));
const dist = (i) => Math.hypot(data[i] - BG[0], data[i + 1] - BG[1], data[i + 2] - BG[2]);
const flat = ring.filter((i) => dist(i) <= TOL).length / ring.length;
if (flat < 0.98) {
  console.error(
    `REFUSED: backdrop is not flat — only ${(flat * 100).toFixed(1)}% of the border ring is within ` +
      `${TOL} of rgb(${BG.join(",")}). This tool only cuts a solid studio backdrop; regenerate the ` +
      `source with a transparent background instead of keying a real scene out of it.`,
  );
  process.exit(3);
}

// 3. Flood fill from the border.
const OPAQUE = 255;
const alpha = new Uint8Array(N).fill(OPAQUE);
const seen = new Uint8Array(N);
const depth = new Uint8Array(N);
const stack = [];
const push = (x, y, d) => {
  const p = y * W + x;
  if (seen[p]) return;
  const dd = dist(p * 4);
  if (dd > SOFT) return; // subject — the fill stops here
  const hard = dd <= TOL;
  const nextDepth = hard ? 0 : d + 1;
  if (!hard && nextDepth > BAND) return; // a soft edge may not tunnel into the subject
  seen[p] = 1;
  depth[p] = nextDepth;
  alpha[p] = hard ? 0 : Math.round(((dd - TOL) / (SOFT - TOL)) * 255);
  stack.push(p);
};
const drain = () => {
  while (stack.length) {
    const p = stack.pop();
    const x = p % W;
    const y = (p / W) | 0;
    const d = depth[p];
    if (x > 0) push(x - 1, y, d);
    if (x < W - 1) push(x + 1, y, d);
    if (y > 0) push(x, y - 1, d);
    if (y < H - 1) push(x, y + 1, d);
  }
};
for (let x = 0; x < W; x++) {
  push(x, 0, 0);
  push(x, H - 1, 0);
}
for (let y = 0; y < H; y++) {
  push(0, y, 0);
  push(W - 1, y, 0);
}
drain();

// 4. Enclosed pockets: gather backdrop-coloured components the border fill never reached,
// open the ones at or over POCKETS px (feathered by the same rules), report the rest.
const claimed = new Uint8Array(N);
const opened = [];
const kept = [];
for (let p0 = 0; p0 < N; p0++) {
  if (claimed[p0] || seen[p0] || dist(p0 * 4) > TOL) continue;
  const comp = [];
  const walk = [p0];
  claimed[p0] = 1;
  while (walk.length) {
    const p = walk.pop();
    comp.push(p);
    const x = p % W;
    const y = (p / W) | 0;
    for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1]) {
      if (q >= 0 && !claimed[q] && !seen[q] && dist(q * 4) <= TOL) {
        claimed[q] = 1;
        walk.push(q);
      }
    }
  }
  if (POCKETS > 0 && comp.length >= POCKETS) {
    opened.push(comp.length);
    for (const p of comp) push(p % W, (p / W) | 0, 0);
    drain();
  } else {
    kept.push(comp.length);
  }
}

// 5/6. Despill the partial pixels, then floor the alpha.
let transparent = 0;
let partial = 0;
for (let p = 0; p < N; p++) {
  let a = alpha[p];
  if (a >= 255 - FLOOR) a = 255;
  if (a <= FLOOR) a = 0;
  const i = p * 4;
  if (a > 0 && a < 255) {
    partial++;
    const f = a / 255;
    for (let c = 0; c < 3; c++) {
      data[i + c] = Math.max(0, Math.min(255, Math.round((data[i + c] - (1 - f) * BG[c]) / f)));
    }
  }
  if (a === 0) {
    transparent++;
    data[i] = data[i + 1] = data[i + 2] = 0; // zero the RGB under full transparency
  }
  data[i + 3] = a;
}

fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
await sharp(data, { raw: { width: W, height: H, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(out);

console.log(
  `keyed ${W}x${H} backdrop rgb(${BG.join(",")}) (border ${(flat * 100).toFixed(1)}% flat, tol ${TOL}/${SOFT}) -> ` +
    `${((transparent / N) * 100).toFixed(1)}% transparent, ${partial} feathered px; wrote ${out}`,
);
const sum = (a) => a.reduce((s, v) => s + v, 0);
if (opened.length) {
  console.log(
    `opened ${opened.length} enclosed pocket(s), ${sum(opened)} px (largest ${Math.max(...opened)}) — ` +
      `backdrop the subject surrounds, now see-through`,
  );
}
if (kept.length) {
  console.log(
    `left ${kept.length} backdrop-coloured region(s) opaque, ${sum(kept)} px (largest ${Math.max(...kept)}, ` +
      `under the ${POCKETS}px pocket threshold) — treated as subject shading, not backdrop. ` +
      `If a real hole is still filled, lower --pockets and LOOK at the result.`,
  );
}
