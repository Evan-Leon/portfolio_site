#!/usr/bin/env node
// Real-photo portrait run. NOT the theater sprite pipeline — this reports only.
// The subject here is a real photograph, so shoulder asymmetry is REAL and is not a
// defect: the shoulderPairs numbers are informational, never an acceptance gate.
// The gate this run cares about is greyFrac: leftover unpainted canvas margin.
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

// Flat mid-grey left unpainted in the side margins. Near-neutral AND near 128.
let grey = 0;
let total = 0;
for (let y = 0; y < h; y += 2) {
  for (let x = 0; x < w; x += 2) {
    const i = (y * w + x) * c;
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    total++;
    const maxc = Math.max(r, g, b),
      minc = Math.min(r, g, b);
    if (maxc - minc <= 6 && r >= 118 && r <= 138) grey++;
  }
}

const dark = (x, y) => {
  const i = (y * w + x) * c;
  return data[i] < 70 && data[i + 1] < 70 && data[i + 2] < 70;
};
const pairs = [];
for (const frac of [0.1, 0.2, 0.3]) {
  const xl = Math.round(w * frac);
  const top = (x) => {
    for (let y = Math.round(h * 0.55); y < h; y++) if (dark(x, y)) return y / h;
    return null;
  };
  const l = top(xl);
  const r = top(w - 1 - xl);
  pairs.push({ inset: frac, left: l && +l.toFixed(3), right: r && +r.toFixed(3) });
}
console.log(
  JSON.stringify({
    file: src,
    w: m.width,
    h: m.height,
    square: m.width === m.height,
    hasAlpha: !!m.hasAlpha,
    greyFrac: +(grey / total).toFixed(4),
    shoulderPairs_informational: pairs,
  }),
);
