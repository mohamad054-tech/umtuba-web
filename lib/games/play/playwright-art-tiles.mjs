import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const GAME_ARTWORK_SLUGS = [
  "sudoku",
  "snake",
  "g2048",
  "memory",
  "xo",
  "hanoi",
  "solitaire",
  "uno",
  "wheel",
  "shapes",
  "typerace",
  "hangword",
  "guess-city",
];

const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const outDir = process.env.SHOT_DIR || join(process.cwd(), "tmp", "games-art-shots");
const locales = ["en", "ar"];
const viewports = [
  { name: "390", width: 390, height: 844 },
  { name: "1280", width: 1280, height: 800 },
];

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const failures = [];
const weights = [];

async function open(locale, viewport) {
  const page = await browser.newPage({
    viewport,
    hasTouch: viewport.width <= 430,
  });
  await page.context().addCookies([
    { name: "umtuba_locale", value: locale, url: base },
    { name: "umtuba_locale_source", value: "explicit", url: base },
  ]);
  await page.goto(`${base}/games`, { waitUntil: "domcontentloaded", timeout: 60000 });
  return page;
}

for (const locale of locales) {
  for (const vp of viewports) {
    const page = await open(locale, vp);
    await page.waitForSelector(".um-play-catalog", { timeout: 20000 });
    await page.evaluate(async () => {
      const step = window.innerHeight;
      for (let y = 0; y <= document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 80));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForFunction(() => {
      const imgs = [...document.querySelectorAll("[data-game-art-photo='true']")];
      return (
        imgs.length === 13 &&
        imgs.every((img) => img.complete && img.naturalWidth > 0)
      );
    }, { timeout: 30000 });

    const topsBefore = await page.$$eval("[data-game-card]", (els) =>
      els.map((el) => Math.round(el.getBoundingClientRect().top))
    );

    const photoState = await page.$$eval("[data-game-art-photo='true']", (imgs) =>
      imgs.map((node) => {
        const img = node;
        return {
          slug: img.getAttribute("data-game-art"),
          alt: img.getAttribute("alt") || "",
          complete: img.complete,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          currentSrc: img.currentSrc,
          broken: img.complete && img.naturalWidth === 0,
        };
      })
    );

    if (photoState.length !== GAME_ARTWORK_SLUGS.length) {
      failures.push(
        `${locale}-${vp.name} expected ${GAME_ARTWORK_SLUGS.length} photos, got ${photoState.length}`
      );
    }
    for (const slug of GAME_ARTWORK_SLUGS) {
      const hit = photoState.find((row) => row.slug === slug);
      if (!hit) failures.push(`${locale}-${vp.name} missing photo ${slug}`);
      else if (hit.broken || hit.naturalWidth <= 0) {
        failures.push(`${locale}-${vp.name} broken ${slug} w=${hit.naturalWidth}`);
      }
    }

    await page.waitForTimeout(250);
    const topsAfter = await page.$$eval("[data-game-card]", (els) =>
      els.map((el) => Math.round(el.getBoundingClientRect().top))
    );
    const shifted = topsBefore.filter((top, i) => Math.abs(top - (topsAfter[i] ?? top)) > 2);
    if (shifted.length) {
      failures.push(`${locale}-${vp.name} layout shift on ${shifted.length} cards`);
    }

    const transfer = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      const resources = performance.getEntriesByType("resource");
      const sum = (list) =>
        list.reduce((total, entry) => total + (entry.transferSize || 0), 0);
      const art = resources.filter((entry) =>
        /\/games\/art\/|\.webp(\?|$)|\/_next\/image/.test(entry.name)
      );
      return {
        document: nav?.transferSize || 0,
        resources: sum(resources),
        art: sum(art),
        total: (nav?.transferSize || 0) + sum(resources),
      };
    });
    weights.push({ locale, viewport: vp.name, ...transfer });

    const name = `games-art-${locale}-${vp.name}.png`;
    await page.screenshot({ path: join(outDir, name), fullPage: true });
    await page.close();
  }
}

await browser.close();

const report = { outDir, failures, weights };
writeFileSync(join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exit(1);
