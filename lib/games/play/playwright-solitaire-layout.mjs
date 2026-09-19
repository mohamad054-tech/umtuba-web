import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const outDir = process.env.SHOT_DIR || join(process.cwd(), "tmp", "games-shots");
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const locales = ["en", "ar"];
const viewports = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 1600, height: 900 },
];

async function openGame(locale, viewport) {
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
      window.sessionStorage.setItem("umtuba.klondike.deal", "long-pile");
    } catch {
      /* ignore */
    }
  });
  await page.goto(`${base}/games/solitaire`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('[data-game-mounted="true"]', { timeout: 20000 });
  const start = page.locator('[data-howto-dismiss="true"]');
  if (await start.count()) {
    await start.first().click();
    await page.waitForTimeout(200);
  }
  await page.waitForSelector("[data-klondike-board]", { timeout: 20000 });
  await page.waitForFunction(() => {
    const el = document.querySelector("[data-klondike-board]");
    return Boolean(el && el.getBoundingClientRect().height > 80);
  });
  return page;
}

async function assertLayout(page, locale, viewport) {
  const viewportBox = await page.evaluate(() => ({
    w: window.innerWidth,
    h: window.innerHeight,
    scroll: document.body.scrollHeight,
  }));
  const inViewport = (box) => {
    if (!box) return false;
    const left = box.left ?? box.x;
    const top = box.top ?? box.y;
    const right = box.right ?? left + box.width;
    const bottom = box.bottom ?? top + box.height;
    return top >= -1 && bottom <= viewportBox.h + 1 && left >= -1 && right <= viewportBox.w + 1;
  };
  const cards = await page.locator(".um-kcard").evaluateAll((els) =>
    els.map((el) => {
      const box = el.getBoundingClientRect();
      return {
        width: box.width,
        height: box.height,
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        up: el.getAttribute("data-up") === "true",
      };
    })
  );
  const peekVisible = await page.locator("[data-tableau]").evaluateAll((piles) =>
    piles.flatMap((pile) => {
      const stack = [...pile.querySelectorAll(".um-kcard")].map((el) => {
        const box = el.getBoundingClientRect();
        return { top: box.top, height: box.height, up: el.getAttribute("data-up") === "true" };
      });
      return stack
        .map((card, index) => {
          if (!card.up || card.height < 8) return null;
          const visibleH = stack[index + 1] ? stack[index + 1].top - card.top : card.height;
          return visibleH / card.height;
        })
        .filter((ratio) => ratio != null);
    })
  );
  const actions = (
    await Promise.all([
      page.locator("[data-klondike-undo='true']").boundingBox(),
      page.locator("[data-klondike-foundation='true']").boundingBox(),
    ])
  ).filter(Boolean);
  const stats = await page.locator(".um-play-bar").boundingBox();
  const formula = await page.locator("[data-klondike-board]").evaluate((el) => ({
    cardH: Number(el.getAttribute("data-k-card-h") || 0),
    peekUp: Number(el.getAttribute("data-k-peek-up") || 0),
    peekDown: Number(el.getAttribute("data-k-peek-down") || 0),
  }));
  const row = {
    locale,
    viewport: `${viewport.width}x${viewport.height}`,
    noPageScroll: viewportBox.scroll <= viewportBox.h + 1,
    cardsInView: cards.every((card) => inViewport(card)),
    buttonsInView: actions.length === 2 && actions.every((action) =>
      inViewport({
        left: action.x,
        right: action.x + action.width,
        top: action.y,
        bottom: action.y + action.height,
      })
    ),
    statsInView: inViewport(stats),
    facePeekOk: peekVisible.length > 0 && peekVisible.every((ratio) => ratio >= 0.25),
    longPile: await page.locator("[data-tableau='3'] .um-kcard").count(),
    formula,
  };
  row.pass =
    row.noPageScroll &&
    row.cardsInView &&
    row.buttonsInView &&
    row.statsInView &&
    row.facePeekOk &&
    row.longPile >= 13;
  return row;
}

const rows = [];
for (const locale of locales) {
  for (const viewport of viewports) {
    const page = await openGame(locale, viewport);
    const row = await assertLayout(page, locale, viewport);
    rows.push(row);
    if (viewport.width === 390 || viewport.width === 1280 || viewport.width === 1600) {
      await page.screenshot({
        path: join(outDir, `solitaire-${locale}-${viewport.width}.png`),
        fullPage: false,
      });
    }
    await page.close();
  }
}

await browser.close();
console.log(
  [
    "locale\tviewport\tscroll\tcards\tbuttons\tstats\tpeek\tlong\tpass",
    ...rows.map(
      (row) =>
        `${row.locale}\t${row.viewport}\t${row.noPageScroll}\t${row.cardsInView}\t${row.buttonsInView}\t${row.statsInView}\t${row.facePeekOk}\t${row.longPile}\t${row.pass ? "ok" : "FAIL"}`
    ),
  ].join("\n")
);
console.log(JSON.stringify(rows.map((row) => row.formula), null, 2));
if (rows.some((row) => !row.pass)) process.exit(1);
