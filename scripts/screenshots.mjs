// Captures README screenshots from a local production server using the demo
// account. Prereqs: `npm run build && npm start` running on :3000, demo seeded.
//   node scripts/screenshots.mjs
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:3000";
const OUT = new URL("../docs/screenshots/", import.meta.url).pathname;

const MOBILE_SHOTS = [
  ["/", "home.png"],
  ["/markers", "markers.png"],
  ["/markers/fasting_glucose", "detail.png"],
  ["/insights", "insights.png"],
];

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  // Sign in via the demo button
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle0" });
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      b.textContent.includes("Explore the demo"),
    );
    btn?.click();
  });
  await page.waitForFunction(() => location.pathname === "/", { timeout: 20000 });

  for (const [path, file] of MOBILE_SHOTS) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0", timeout: 60000 });
    await new Promise((r) => setTimeout(r, 1800)); // chart/animation settle
    await page.screenshot({ path: `${OUT}${file}` });
    console.log(`captured ${file}`);
  }

  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: `${OUT}desktop.png` });
  console.log("captured desktop.png");

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
