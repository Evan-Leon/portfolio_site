// Headless driver for docs/spikes/art-check.html (DT11). Usage: node check.mjs <file>...
// Drops the files into the page's <input id="files">, reads each card, screenshots it
// to ./cards/<name>.card.png, prints one JSON line per file, exits 1 unless all PASS.
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
const REPO = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const require = createRequire(path.join(REPO, "theater/package.json"));
const { chromium } = require("@playwright/test");
const PAGE = "file://" + path.join(REPO, "docs/spikes/art-check.html");
const files = process.argv.slice(2).map((f) => path.resolve(f));
if (!files.length) { console.error("usage: node check.mjs <file>..."); process.exit(2); }
const outDir = process.env.ART_CARDS_DIR ?? path.join(process.cwd(), "cards");
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(PAGE);
await page.locator("#files").setInputFiles(files);
await page.waitForFunction((n) => document.querySelectorAll("#cards .card").length >= n, files.length);
await page.waitForTimeout(300);
const cards = await page.evaluate(() =>
  [...document.querySelectorAll("#cards .card")].map((card) => {
    const h2 = card.querySelector("h2");
    const name = h2 ? h2.firstChild.textContent.trim() : card.textContent.slice(0, 80);
    const verdict = card.querySelector(".verdict")?.textContent ?? "ERROR";
    const rows = {};
    for (const tr of card.querySelectorAll("table.metrics tr")) {
      const [k, v] = tr.querySelectorAll("td");
      rows[k.textContent.trim()] = { value: v.textContent.trim().replace(/\s+/g, " "), state: v.className || "" };
    }
    const note = [...card.querySelectorAll("p")].map((p) => p.textContent.trim()).join(" | ");
    return { name, verdict, rows, note };
  }),
);
let allPass = true;
const els = page.locator("#cards .card");
for (let i = 0; i < cards.length; i++) {
  const shot = path.join(outDir, `${cards[i].name}.card.png`);
  await els.nth(i).screenshot({ path: shot });
  cards[i].screenshot = shot;
  if (cards[i].verdict !== "PASS") allPass = false;
  console.log(JSON.stringify(cards[i]));
}
await browser.close();
process.exit(allPass ? 0 : 1);
