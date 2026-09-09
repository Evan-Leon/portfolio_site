// Fit a raw generation onto the contract canvas WITHOUT painting pixels.
// Usage: node fit.mjs <in.png> <out.png>   (contract chosen by the OUTPUT basename: car* / tree*)
// Steps: refuse if the source has no real alpha (all four corners opaque) -> exit 3;
// trim fully-transparent margins; scale so the subject fills the canvas (car: width-led,
// tree: height-led, never upscaled beyond the canvas); place it horizontally centred with
// its bottom on the canvas bottom edge; write a palette PNG and shrink until <= 400 KB.
import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";
const [inp, out] = process.argv.slice(2);
if (!inp || !out) { console.error("usage: node fit.mjs <in.png> <out.png>"); process.exit(2); }
const base = path.basename(out).toLowerCase();
const C = base.startsWith("car") ? { w: 1600, h: 900, fill: 0.9, lead: "width" }
        : base.startsWith("tree") ? { w: 800, h: 1200, fill: 1.0, lead: "height" }
        : null;
if (!C) { console.error("output must be named car* or tree*"); process.exit(2); }
const src = sharp(inp).ensureAlpha();
const { data, info } = await src.raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const a = (x, y) => data[(y * W + x) * 4 + 3];
const corners = [a(0, 0), a(W - 1, 0), a(0, H - 1), a(W - 1, H - 1)];
if (corners.every((v) => v > 0)) {
  console.error(`REFUSED: no real alpha — corners ${corners.join(",")}. Regenerate with a transparent background; do not key it out.`);
  process.exit(3);
}
let minX = W, minY = H, maxX = -1, maxY = -1;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (a(x, y) > 0) {
  if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
}
if (maxX < 0) { console.error("REFUSED: fully transparent"); process.exit(3); }
const bw = maxX - minX + 1, bh = maxY - minY + 1;
const s = C.lead === "width" ? Math.min((C.w * C.fill) / bw, C.h / bh) : Math.min(C.h * C.fill / bh, C.w / bw);
const tw = Math.max(1, Math.round(bw * s)), th = Math.max(1, Math.round(bh * s));
const subject = await sharp(inp).ensureAlpha().extract({ left: minX, top: minY, width: bw, height: bh })
  .resize(tw, th, { fit: "fill", kernel: "lanczos3" }).png().toBuffer();
const left = Math.round((C.w - tw) / 2), top = C.h - th;
const canvas = sharp({ create: { width: C.w, height: C.h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: subject, left, top }]);
const MAX = 400 * 1024;
let buf = null;
for (const opts of [
  { compressionLevel: 9, adaptiveFiltering: true },
  { palette: true, quality: 100, colours: 256, compressionLevel: 9 },
  { palette: true, quality: 90, colours: 256, compressionLevel: 9 },
  { palette: true, quality: 80, colours: 192, compressionLevel: 9 },
  { palette: true, quality: 70, colours: 128, compressionLevel: 9 },
]) {
  buf = await canvas.clone().png(opts).toBuffer();
  if (buf.length <= MAX) { console.log(`png opts ${JSON.stringify(opts)} -> ${(buf.length / 1024).toFixed(1)} KB`); break; }
  console.log(`png opts ${JSON.stringify(opts)} -> ${(buf.length / 1024).toFixed(1)} KB (over 400)`);
}
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, buf);
console.log(`source ${W}x${H} bbox ${bw}x${bh} at (${minX},${minY}) scale ${s.toFixed(3)} -> ${tw}x${th} placed at (${left},${top}) on ${C.w}x${C.h}; wrote ${out} ${(buf.length / 1024).toFixed(1)} KB`);
