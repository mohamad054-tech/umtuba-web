import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { chromium } from "playwright";

const baseUrl = (process.env.WORLD_MAP_PROOF_BASE_URL || "http://127.0.0.1:3000").replace(
  /\/$/,
  ""
);
const outDir = process.env.WORLD_MAP_PROOF_OUT_DIR || join(process.cwd(), "tmp");
const screenshotPath = join(outDir, "world-map-proof.png");
const reportPath = join(outDir, "world-map-proof.json");
const pbfUrls = [];
const consoleErrors = [];

function isPbf(url) {
  return /tiles\.openfreemap\.org/i.test(url) && /\.pbf(?:\?|$)/i.test(url);
}

function isHydration418(text) {
  return /Minified React error #418|hydration|did not match/i.test(text);
}

async function visit(page, path) {
  const before = pbfUrls.length;
  const errorsBefore = consoleErrors.length;
  const url = new URL(path, `${baseUrl}/`);
  url.searchParams.set("hl", "en");
  const response = await page.goto(url.toString(), {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  if (!response || response.status() >= 400) {
    throw new Error(`${path} returned ${response?.status()}`);
  }
  const section = page.locator('section[aria-label="Map"], section[aria-label="الخريطة"]').first();
  await section.waitFor({ state: "attached", timeout: 20_000 });
  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(8_000);
  await page.waitForSelector(
    'section[aria-label="Map"] canvas, section[aria-label="الخريطة"] canvas, canvas.maplibregl-canvas',
    { timeout: 20_000 }
  );
  return {
    path,
    pbfCount: pbfUrls.length - before,
    hydration418: consoleErrors.slice(errorsBefore).some(isHydration418),
  };
}

async function launchBrowser() {
  const args = ["--use-gl=angle", "--ignore-gpu-blocklist"];
  const channels = ["chrome", "msedge"];
  let lastError;
  for (const channel of channels) {
    try {
      return await chromium.launch({
        headless: true,
        args,
        channel,
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

page.on("request", (request) => {
  const url = request.url();
  if (isPbf(url)) pbfUrls.push(url);
});
page.on("console", (msg) => {
  const text = msg.text();
  if (msg.type() === "error" || isHydration418(text)) {
    consoleErrors.push(text);
  }
});
page.on("pageerror", (error) => {
  consoleErrors.push(error.message);
});

mkdirSync(outDir, { recursive: true });
const city = await visit(page, "/world/city/buenos-aires");
await page
  .locator('section[aria-label="Map"], section[aria-label="الخريطة"]')
  .first()
  .screenshot({ path: screenshotPath });
const world = await visit(page, "/world");

const report = {
  baseUrl,
  screenshotPath,
  pbfCount: pbfUrls.length,
  uniquePbfCount: new Set(pbfUrls).size,
  hydration418: consoleErrors.some(isHydration418),
  consoleErrors,
  city,
  world,
};

writeFileSync(reportPath, JSON.stringify(report, null, 2));
await browser.close();

console.log(JSON.stringify(report, null, 2));
if (report.pbfCount <= 0) {
  process.exitCode = 1;
}
