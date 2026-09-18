import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const outDir = process.env.SHOT_DIR || join(process.cwd(), "tmp", "games-shots");
const locales = ["en", "ar"];
const viewports = [
  { name: "390", width: 390, height: 844 },
  { name: "1280", width: 1280, height: 800 },
];
const boards = ["solitaire", "sudoku", "snake", "memory", "uno", "wheel"];

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function open(path, locale, viewport) {
  const page = await browser.newPage({
    viewport,
    hasTouch: viewport.width <= 430,
  });
  await page.context().addCookies([
    { name: "umtuba_locale", value: locale, url: base },
    { name: "umtuba_locale_source", value: "explicit", url: base },
  ]);
  await page.addInitScript(() => {
    try {
      window.sessionStorage.setItem("umtuba.klondike.deal", "legal-open");
    } catch {
      /* ignore */
    }
  });
  await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  return page;
}

async function startIfNeeded(page) {
  const start = page.locator('[data-howto-dismiss="true"]');
  if (await start.count()) {
    await start.first().click();
    await page.waitForTimeout(200);
  }
}

const files = [];
for (const locale of locales) {
  for (const vp of viewports) {
    const catalog = await open("/games", locale, vp);
    await catalog.waitForSelector(".um-play-catalog", { timeout: 20000 });
    const catalogName = `games-${locale}-${vp.name}.png`;
    await catalog.screenshot({ path: join(outDir, catalogName), fullPage: true });
    files.push(catalogName);
    await catalog.close();

    for (const slug of boards) {
      const page = await open(`/games/${slug}`, locale, vp);
      await page.waitForSelector('[data-game-mounted="true"]', { timeout: 20000 });
      await startIfNeeded(page);
      const name = `${slug}-${locale}-${vp.name}.png`;
      await page.screenshot({ path: join(outDir, name), fullPage: true });
      files.push(name);
      await page.close();
    }
  }
}

await browser.close();
console.log(JSON.stringify({ outDir, files }, null, 2));
