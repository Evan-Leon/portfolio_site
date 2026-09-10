// The whole sprite treatment in one command: key -> fit -> measure.
//
// Usage: node treat.mjs <raw.png> <out.png> [--keep-work] [-- <key.mjs flags>]
//   e.g. node treat.mjs raw/car.png ../../theater/public/art/car.png
//
// The contract is chosen by the OUTPUT basename (car* / tree*), same as fit.mjs and
// measure.mjs — so name the output for what it is, not for where it came from.
//
// Nothing is written to the destination unless every stage succeeds AND the result is a
// structural PASS. A half-treated sprite on disk is worse than none: it looks committable.
// Intermediates land beside the output as <name>.1-keyed.png / <name>.2-fitted.png and
// are deleted on success unless --keep-work is passed.
//
// This is the structural half only. `measure.mjs` is a port of the checker page's judge();
// it cannot see whether the sprite looks right. Finish with `node check.mjs <out>` for the
// real checker page and its card screenshot, and then LOOK at it. (DT14: a tree passed
// every structural check with holes punched through its canopy.)
import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const here = path.dirname(new URL(import.meta.url).pathname);
const argv = process.argv.slice(2);
const sep = argv.indexOf("--");
const keyFlags = sep === -1 ? [] : argv.slice(sep + 1);
const rest = (sep === -1 ? argv : argv.slice(0, sep)).filter((a) => a !== "--keep-work");
const keepWork = argv.includes("--keep-work");
const [raw, out] = rest;
if (!raw || !out) {
  console.error("usage: node treat.mjs <raw.png> <out.png> [--keep-work] [-- <key.mjs flags>]");
  process.exit(2);
}

const dest = path.resolve(out);
const stem = path.join(path.dirname(dest), path.basename(dest, ".png"));
const keyed = `${stem}.1-keyed.png`;
const fitted = `${stem}.2-fitted.png`;
const cleanup = () => {
  if (keepWork) return;
  for (const f of [keyed, fitted]) if (fs.existsSync(f)) fs.unlinkSync(f);
};

const run = (script, ...a) => {
  console.log(`\n$ node ${script} ${a.join(" ")}`);
  const r = spawnSync(process.execPath, [path.join(here, script), ...a], { stdio: "inherit" });
  if (r.status !== 0) {
    cleanup();
    console.error(`\ntreat: ${script} exited ${r.status} — nothing written to ${out}`);
    process.exit(r.status ?? 1);
  }
};

run("key.mjs", path.resolve(raw), keyed, ...keyFlags);
run("fit.mjs", keyed, fitted);
run("measure.mjs", fitted); // exits 1 unless PASS, so a FAIL never reaches the destination

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.copyFileSync(fitted, dest);
cleanup();
console.log(`\ntreat: PASS — wrote ${out} (${(fs.statSync(dest).size / 1024).toFixed(1)} KB)`);
console.log(`Now run the real checker and LOOK at the card: node check.mjs ${out}`);
