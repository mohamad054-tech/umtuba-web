import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const base = process.env.BASE_URL || "http://127.0.0.1:3000";
const outDir = process.env.SHOT_DIR || join(process.cwd(), "tmp", "games-shots");
mkdirSync(outDir, { recursive: true });

function boxesOverlap(a, b) {
  return a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
}

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
      window.sessionStorage.setItem("umtuba.klondike.deal", "legal-open");
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
  await page.waitForSelector(".um-kcard", { timeout: 20000 });
  return page;
}

async function assertLayout(page, locale, viewport) {
  const RANK = /^(A|[2-9]|10|J|Q|K)$/;
  const board = await page.locator("[data-klondike-board]").boundingBox();
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
        text: (el.textContent ?? "").replace(/\s+/g, ""),
        ranks: [...el.querySelectorAll("[data-k-rank]")].map((node) => node.textContent ?? ""),
        attrs: `${el.getAttribute("data-rank") ?? ""}${el.getAttribute("data-suit") ?? ""}${el.getAttribute("data-rank-label") ?? ""}`,
      };
    })
  );
  const visible = cards.filter((card) => card.width >= 16 && card.height >= 16);
  const facedownHidden = cards
    .filter((card) => !card.up)
    .every((card) => card.text.length === 0 && card.ranks.length === 0 && card.attrs.length === 0);
  const overflow = !board
    ? true
    : visible.some(
        (card) =>
          card.left < board.x - 1 ||
          card.right > board.x + board.width + 1 ||
          card.top < board.y - 1 ||
          card.bottom > board.y + board.height + 1
      );
  const pileOffsets = await page.locator("[data-tableau]").evaluateAll((piles) =>
    piles.map((pile) => {
      const stack = [...pile.querySelectorAll(".um-kcard")].map((el) => ({
        top: el.getBoundingClientRect().top,
        up: el.getAttribute("data-up") === "true",
      }));
      return stack.slice(1).map((card, i) => {
        const expected = stack[i].up ? 38 : 12;
        const got = card.top - stack[i].top;
        return Math.abs(got - expected) <= 2;
      });
    })
  );
  const offsetOk = pileOffsets.every((deltas) => deltas.every(Boolean));
  const actions = (
    await Promise.all([
      page.locator("[data-klondike-undo='true']").boundingBox(),
      page.locator("[data-klondike-foundation='true']").boundingBox(),
    ])
  ).filter(Boolean);
  const buttonsClear =
    actions.length === 2 &&
    actions.every((action) =>
      visible.every(
        (card) =>
          !boxesOverlap(card, {
            left: action.x,
            right: action.x + action.width,
            top: action.y,
            bottom: action.y + action.height,
          })
      )
    );
  const headerOk =
    (await page.locator(".app-top-nav-subtitle").count()) === 0 &&
    (await page.locator("[data-games-subtitle='true']").count()) === 1;
  const rankOk = visible.some((card) => card.up) && visible.filter((card) => card.up).every((card) => card.ranks.every((rank) => RANK.test(rank)));
  const pass = facedownHidden && !overflow && offsetOk && buttonsClear && headerOk && rankOk;
  return {
    locale,
    viewport: String(viewport.width),
    facedownHidden,
    offsetOk,
    buttonsClear,
    headerOk,
    inBoard: !overflow,
    rankOk,
    pass,
  };
}

const rows = [];
for (const locale of locales) {
  for (const viewport of viewports) {
    const page = await openGame(locale, viewport);
    const row = await assertLayout(page, locale, viewport);
    rows.push(row);
    if (viewport.width === 390 || viewport.width === 1600) {
      await page.screenshot({
        path: join(outDir, `solitaire-${locale}-${viewport.width}.png`),
        fullPage: true,
      });
    }
    await page.close();
  }
}

await browser.close();
console.log(
  [
    "locale\tviewport\tfacedown\toffsets\tbuttons\theader\tinBoard\tranks\tpass",
    ...rows.map(
      (row) =>
        `${row.locale}\t${row.viewport}\t${row.facedownHidden}\t${row.offsetOk}\t${row.buttonsClear}\t${row.headerOk}\t${row.inBoard}\t${row.rankOk}\t${row.pass ? "ok" : "FAIL"}`
    ),
  ].join("\n")
);
if (rows.some((row) => !row.pass)) process.exit(1);
