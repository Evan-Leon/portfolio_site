#!/usr/bin/env node
// Portrait run only. This is NOT the theater sprite pipeline (treat/key/fit/measure) —
// those enforce a transparent-background sprite contract and refuse an opaque portrait.
// This just reports; it never alters pixels and it never decides acceptance.
import sharp from "sharp";

const src = process.argv[2];
if (!src) {
  console.error("usage: node inspect.mjs <image.png>");
  process.exit(2);
}
const img = sharp(src);
const m = await img.metadata();
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h, channels: c } = info;

const dark = (x, y) => {
  const i = (y * w + x) * c;
  return data[i] < 70 && data[i + 1] < 70 && data[i + 2] < 70;
};
// Shoulder-top height at mirrored columns, as a fraction of height so it is
// resolution-independent. A symmetric, square-to-camera torso puts each pair within
// a couple of percent of each other.
const pairs = [];
for (const frac of [0.1, 0.2, 0.3]) {
  const xl = Math.round(w * frac);
  const xr = w - 1 - xl;
  const top = (x) => {
    for (let y = Math.round(h * 0.55); y < h; y++) if (dark(x, y)) return y / h;
    return null;
  };
  const l = top(xl);
  const r = top(xr);
  pairs.push({
    inset: frac,
    left: l && +l.toFixed(3),
    right: r && +r.toFixed(3),
    delta: l && r ? +Math.abs(l - r).toFixed(3) : null,
  });
}
console.log(
  JSON.stringify({
    file: src,
    w: m.width,
    h: m.height,
    square: m.width === m.height,
    hasAlpha: !!m.hasAlpha,
    bytes: m.size,
    shoulderPairs: pairs,
  }),
);
