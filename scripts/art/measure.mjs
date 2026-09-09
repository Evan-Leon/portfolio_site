// Pure-node port of docs/spikes/art-check.html's structural half (judge()), for use where
// a browser cannot launch. Usage: node measure.mjs <png>...  -> one JSON line per file,
// exit 1 unless every file is PASS. Contract by basename: car* / tree*.
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";
const MAX_BYTES = 400 * 1024, TMIN = 0.15, TMAX = 0.85, CHECKER_WARN = 0.3;
const CONTRACTS = {
  car:  { key: "car",  width: 1600, height: 900,  minBboxWidth: 960,  minH: 0.55, bottomTol: 0.05, centreTol: 0.05 },
  tree: { key: "tree", width: 800,  height: 1200, minBboxWidth: null, minH: 0.55, bottomTol: 0.05, centreTol: 0.08 },
};
let allPass = true;
for (const f of process.argv.slice(2)) {
  const base = path.basename(f).toLowerCase();
  const c = base.startsWith("car") ? CONTRACTS.car : base.startsWith("tree") ? CONTRACTS.tree : null;
  if (!c) { console.log(JSON.stringify({ name: base, verdict: "FAIL", failed: ["unknownContract"] })); allPass = false; continue; }
  const bytes = fs.statSync(f).size;
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const A = (x, y) => data[(y * W + x) * 4 + 3];
  let minX = W, minY = H, maxX = -1, maxY = -1, transparent = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (A(x, y) === 0) transparent++;
    else { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  const has = maxX >= minX;
  const bbox = has ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, bottom: maxY + 1, centreX: minX + (maxX - minX + 1) / 2 }
                   : { x: 0, y: 0, w: 0, h: 0, bottom: 0, centreX: 0 };
  let opaque = 0, grey = 0;
  if (has) for (let y = bbox.y; y < bbox.y + bbox.h; y++) for (let x = bbox.x; x < bbox.x + bbox.w; x++) {
    const i = (y * W + x) * 4; if (data[i + 3] < 250) continue; opaque++;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (Math.abs(r - g) < 12 && Math.abs(g - b) < 12 && r > 180) grey++;
  }
  const m = { width: W, height: H, transparentFraction: transparent / (W * H), bbox,
              corners: [A(0, 0), A(W - 1, 0), A(0, H - 1), A(W - 1, H - 1)], checkerRatio: opaque ? grey / opaque : 0 };
  const checks = {};
  checks.dimensions = W === c.width && H === c.height;
  let verdict, failed = [];
  if (!checks.dimensions) { verdict = "FAIL"; failed = ["dimensions"]; }
  else {
    checks.corners = m.corners.every((a) => a === 0);
    checks.transparentFraction = m.transparentFraction >= TMIN && m.transparentFraction <= TMAX;
    checks.bboxWidth = c.minBboxWidth === null || bbox.w >= c.minBboxWidth;
    checks.bboxHeight = bbox.h >= c.minH * c.height;
    checks.bboxBottom = c.height - bbox.bottom <= c.bottomTol * c.height;
    checks.bboxCentre = Math.abs(bbox.centreX - c.width / 2) <= c.centreTol * c.width;
    checks.fileSize = bytes <= MAX_BYTES;
    failed = Object.entries(checks).filter(([, ok]) => !ok).map(([k]) => k);
    verdict = failed.length ? "FAIL" : m.checkerRatio >= CHECKER_WARN ? "WARN" : "PASS";
  }
  if (verdict !== "PASS") allPass = false;
  console.log(JSON.stringify({ name: base, verdict, failed, contract: c.key, decoded: `${W}x${H}`, kb: +(bytes / 1024).toFixed(1),
    corners: m.corners, transparentPct: +(m.transparentFraction * 100).toFixed(1),
    bbox: { x: bbox.x, y: bbox.y, w: bbox.w, h: bbox.h }, bottomGapPx: c.height - bbox.bottom,
    offCentrePx: +(bbox.centreX - c.width / 2).toFixed(1), checkerPct: +(m.checkerRatio * 100).toFixed(1) }));
}
process.exit(allPass ? 0 : 1);
