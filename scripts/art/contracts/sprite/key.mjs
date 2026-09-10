// Step 1 of the sprite treatment: cut a FLAT generated backdrop off a sprite.
//
// Usage: node key.mjs <in.png> <out.png> [--tol N] [--soft N] [--floor N] [--band N]
//                                        [--pockets N] [--flat F]
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
//   2. Learn the backdrop as a small PALETTE clustered from the 2px border ring, then
//      REFUSE (exit 3) unless it explains >= `flat` of that ring — the test that stops this
//      being a general background remover. A palette rather than one colour because the
//      generator's other habit is painting an opaque grey-and-white CHECKERBOARD, a picture
//      of transparency. Lower `--flat` only when the refusal's own diagnosis says the
//      unexplained pixels are the subject touching the frame edge.
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
//      NOT done for a patterned backdrop unless `--pockets` is passed explicitly: a
//      checkerboard's colours ARE the chrome's colours, so opening its pockets punches holes
//      through the roof rack and trim. Measured 2026-09-09; see the note at the pocket loop.
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
const FLAT = flag("flat", 0.98); // fraction of the border ring the backdrop palette must explain
const EDGE = flag("edge", 3); // px from the alpha edge where leftover backdrop spill is suppressed
const POCKETS_FORCED = args.includes("--pockets"); // opening pockets on a patterned backdrop must be deliberate

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

// 2. Learn the backdrop PALETTE from the border ring, and refuse unless it explains the ring.
//
// One flat colour is the easy case. The other case that actually happens is a CHECKERBOARD:
// asked for transparency, the generator paints an opaque grey-and-white chequer — a picture
// of transparency (2026-09-09 plate run, tries 1 and 2). That is two colours, not one, so a
// single-colour test refuses it and there is nothing to do but regenerate and hope.
//
// So the backdrop is a small palette: cluster the border ring greedily, and require the
// clusters to explain >= 98% of it. A photographic background still fails — it has hundreds
// of colours, and no handful of centres covers it — so the guard that matters is intact.
const ring = [];
for (let x = 0; x < W; x++)
  for (const y of [0, 1, H - 2, H - 1]) ring.push((y * W + x) * 4);
for (let y = 0; y < H; y++)
  for (const x of [0, 1, W - 2, W - 1]) ring.push((y * W + x) * 4);

const MAX_CLUSTERS = 4;
const MIN_SHARE = 0.03; // a cluster under this share of the ring is noise, not a backdrop colour
const rgbAt = (i) => [data[i], data[i + 1], data[i + 2]];
const gap = (c, d) => Math.hypot(c[0] - d[0], c[1] - d[1], c[2] - d[2]);
const PALETTE = [];
{
  let pool = ring.slice();
  while (pool.length && PALETTE.length < MAX_CLUSTERS) {
    // modal colour of what is left, on a coarse grid so antialiasing noise groups together
    const bins = new Map();
    for (const i of pool) {
      const k = `${data[i] >> 3},${data[i + 1] >> 3},${data[i + 2] >> 3}`;
      bins.set(k, (bins.get(k) ?? []).concat(i));
    }
    const biggest = [...bins.values()].sort((a, b) => b.length - a.length)[0];
    const centre = [0, 1, 2].map((c) => Math.round(biggest.reduce((s, i) => s + data[i + c], 0) / biggest.length));
    const members = pool.filter((i) => gap(rgbAt(i), centre) <= TOL);
    if (members.length / ring.length < MIN_SHARE) break;
    PALETTE.push({ centre, share: members.length / ring.length });
    pool = pool.filter((i) => gap(rgbAt(i), centre) > TOL);
  }
}
// Distance to the backdrop — measured to the palette's points AND to the segments between
// them, because a blend of two backdrop colours is still backdrop. A checkerboard's cells
// are antialiased into each other, and its white and grey centres are 73 apart, so the seam
// pixels sit ~36 from both and a points-only test rejects 14% of the border as "not
// backdrop". The whole pipeline below is unchanged by this; it just measures against a
// palette instead of a point, and degenerates to exactly the old behaviour for one colour.
const toSegment = (c, a, b) => {
  const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const len2 = ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2];
  if (len2 === 0) return gap(c, a);
  let t = ((c[0] - a[0]) * ab[0] + (c[1] - a[1]) * ab[1] + (c[2] - a[2]) * ab[2]) / len2;
  t = Math.max(0, Math.min(1, t));
  return gap(c, [a[0] + t * ab[0], a[1] + t * ab[1], a[2] + t * ab[2]]);
};
const dist = (i) => {
  const c = rgbAt(i);
  let best = Infinity;
  for (let k = 0; k < PALETTE.length; k++) {
    best = Math.min(best, gap(c, PALETTE[k].centre));
    for (let j = k + 1; j < PALETTE.length; j++) best = Math.min(best, toSegment(c, PALETTE[k].centre, PALETTE[j].centre));
  }
  return best;
};
const nearest = (i) => {
  const c = rgbAt(i);
  let best = PALETTE[0]?.centre ?? [0, 0, 0];
  let bd = Infinity;
  for (const p of PALETTE) {
    const d = gap(c, p.centre);
    if (d < bd) {
      bd = d;
      best = p.centre;
    }
  }
  return best;
};
const paletteOf = (i) => {
  const c = rgbAt(i);
  let bi = -1;
  let bd = Infinity;
  for (let k = 0; k < PALETTE.length; k++) {
    const d = gap(c, PALETTE[k].centre);
    if (d < bd) {
      bd = d;
      bi = k;
    }
  }
  return bi;
};
const flat = PALETTE.length ? ring.filter((i) => dist(i) <= TOL).length / ring.length : 0;
if (flat < FLAT) {
  // Say what the UNEXPLAINED pixels are, because the honest answer is often "the subject".
  // A car whose roof rack and tyres run to the top and bottom edges puts real subject in the
  // border ring, and no backdrop palette will ever explain it. That is a different situation
  // from a photographic background, and the operator can only tell them apart if told which
  // colours failed and which edges they sit on — so print it instead of just a percentage.
  const bad = ring.filter((i) => dist(i) > TOL);
  const tally = new Map();
  for (const i of bad) {
    const k = `${data[i] >> 5},${data[i + 1] >> 5},${data[i + 2] >> 5}`;
    tally.set(k, (tally.get(k) ?? 0) + 1);
  }
  const worst = [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k, n]) => `~rgb(${k.split(",").map((v) => +v * 32 + 16).join(",")}) x${n}`)
    .join(", ");
  const edges = { top: 0, bottom: 0, left: 0, right: 0 };
  for (const i of bad) {
    const p = i / 4;
    const x = p % W;
    const y = (p / W) | 0;
    if (y <= 1) edges.top++;
    else if (y >= H - 2) edges.bottom++;
    else if (x <= 1) edges.left++;
    else edges.right++;
  }
  const shown = PALETTE.map((p) => `rgb(${p.centre.join(",")}) ${(p.share * 100).toFixed(0)}%`).join(" + ") || "none";
  console.error(
    `REFUSED: backdrop palette explains only ${(flat * 100).toFixed(1)}% of the border ring ` +
      `(need ${(FLAT * 100).toFixed(0)}%).\n` +
      `  palette:     ${PALETTE.length} colour(s) — ${shown}\n` +
      `  unexplained: ${bad.length}/${ring.length} px — ${worst}\n` +
      `  on edges:    top ${edges.top}, bottom ${edges.bottom}, left ${edges.left}, right ${edges.right}\n` +
      `If those unexplained pixels are a real BACKGROUND (a scene, a gradient, a photo), regenerate ` +
      `the source with a transparent background — do not force this through.\n` +
      `If they are the SUBJECT touching the frame edge (a roof rack at the top, tyres at the bottom), ` +
      `the backdrop is fine and the ring simply is not all backdrop: re-run with --flat <lower>, and ` +
      `LOOK at the result before believing it.`,
  );
  process.exit(3);
}
const PATTERNED = PALETTE.length > 1;

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
  // MEASURED, 2026-09-09: on a PATTERNED backdrop, opening pockets destroys the subject.
  // A grey-and-white checkerboard's two palette entries are the same colours as the wagon's
  // chrome — roof rack, window trim, the cream border on the wood panel, the plate surround.
  // Every one of those is an enclosed region matching the backdrop palette, so pocket-opening
  // punched holes clean through them (verified over magenta: the rack all but vanished).
  // Requiring a pocket to contain BOTH palette entries does NOT save it, because chrome is
  // shaded and contains both. The colours genuinely overlap, so no test on colour alone can
  // separate them. Pockets are therefore OFF for a patterned backdrop unless explicitly asked
  // for; the border fill on its own is safe and leaves the chrome intact.
  if (POCKETS > 0 && comp.length >= POCKETS && (!PATTERNED || POCKETS_FORCED)) {
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
    const B = nearest(i);
    for (let c = 0; c < 3; c++) {
      data[i + c] = Math.max(0, Math.min(255, Math.round((data[i + c] - (1 - f) * B[c]) / f)));
    }
  }
  if (a === 0) {
    transparent++;
    data[i] = data[i + 1] = data[i + 2] = 0; // zero the RGB under full transparency
  }
  data[i + 3] = a;
}

// 7. Suppress backdrop SPILL on the opaque rim.
//
// Despilling partial pixels is not enough. A thin bright feature — the wagon's roof rack —
// picks up the backdrop's colour across a band wider than the alpha ramp, so pixels end up
// fully opaque and still tinted. Shipping try 3 without this put a visible magenta fringe
// along the whole rack (4629 opaque magenta-cast px, worst on rows 90-92). Widening --soft
// only halves it, and buying the rest that way starts eating real subject.
//
// So: for opaque pixels within EDGE px of the alpha edge, remove the component of their
// chroma that points along the BACKDROP's chroma. A contaminated chrome highlight loses its
// magenta and stays the same brightness; a pixel whose colour leans the other way (tan body
// against a slate backdrop) projects negative and is left alone. Interior colours that would
// project positive — red tail lights against magenta — are never in the band, which is what
// makes the narrow EDGE the safety property rather than a tuning knob.
const spill = (() => {
  const B = [...PALETTE].sort((a, b) => b.share - a.share)[0]?.centre;
  if (!B) return 0;
  const mB = (B[0] + B[1] + B[2]) / 3;
  const v = [B[0] - mB, B[1] - mB, B[2] - mB];
  const v2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
  if (v2 < 400) return 0; // a near-neutral backdrop (white, grey checkerboard) has no chroma to spill

  // distance to the alpha edge, over opaque pixels only, capped at EDGE
  const near = new Uint8Array(N);
  let front = [];
  for (let p = 0; p < N; p++) if (data[p * 4 + 3] < 255) front.push(p);
  for (let d = 1; d <= EDGE; d++) {
    const next = [];
    for (const p of front) {
      const x = p % W;
      const y = (p / W) | 0;
      for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1]) {
        if (q >= 0 && !near[q] && data[q * 4 + 3] === 255) {
          near[q] = 1;
          next.push(q);
        }
      }
    }
    front = next;
  }

  let touched = 0;
  for (let p = 0; p < N; p++) {
    if (!near[p]) continue;
    const i = p * 4;
    const m = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const c = [data[i] - m, data[i + 1] - m, data[i + 2] - m];
    const proj = (c[0] * v[0] + c[1] * v[1] + c[2] * v[2]) / v2;
    if (proj <= 0) continue; // leans away from the backdrop — real subject colour, leave it
    const k = Math.min(proj, 1);
    for (let ch = 0; ch < 3; ch++) {
      data[i + ch] = Math.max(0, Math.min(255, Math.round(data[i + ch] - k * v[ch])));
    }
    touched++;
  }
  return touched;
})();

fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
await sharp(data, { raw: { width: W, height: H, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(out);

console.log(
  `keyed ${W}x${H} backdrop ${PATTERNED ? "palette" : ""} ${PALETTE.map((p) => `rgb(${p.centre.join(",")})`).join(" + ")} ` +
    (spill ? `[despilled ${spill} opaque rim px within ${EDGE}px of the edge] ` : "") +
    `(border ${(flat * 100).toFixed(1)}% explained, tol ${TOL}/${SOFT}) -> ` +
    `${((transparent / N) * 100).toFixed(1)}% transparent, ${partial} feathered px; wrote ${out}`,
);
const sum = (a) => a.reduce((s, v) => s + v, 0);
if (opened.length) {
  console.log(
    `opened ${opened.length} enclosed pocket(s), ${sum(opened)} px (largest ${Math.max(...opened)}) — ` +
      `backdrop the subject surrounds, now see-through`,
  );
}
if (PATTERNED && kept.length && !POCKETS_FORCED) {
  console.log(
    `left ${kept.length} enclosed backdrop-coloured region(s) opaque, ${sum(kept)} px (largest ` +
      `${Math.max(...kept)}) — pockets are NOT opened on a patterned backdrop, because its colours are ` +
      `also the subject's chrome and opening them punches holes through it. If real backdrop is still ` +
      `showing inside the silhouette, that is a bad generation: get a transparent or flat-colour source.`,
  );
} else if (kept.length) {
  console.log(
    `left ${kept.length} backdrop-coloured region(s) opaque, ${sum(kept)} px (largest ${Math.max(...kept)}, ` +
      `under the ${POCKETS}px pocket threshold) — treated as subject shading, not backdrop. ` +
      `If a real hole is still filled, lower --pockets and LOOK at the result.`,
  );
}
