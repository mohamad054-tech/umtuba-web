import { chromium } from "playwright";

const slugs = [
  "sudoku",
  "g2048",
  "snake",
  "memory",
  "xo",
  "hanoi",
  "lesson-quiz",
  "guess-city",
  "landmark",
  "collector",
  "price",
  "wheel",
  "basket",
  "hangword",
  "flag-guess",
  "farther-pair",
  "larger-country",
  "cheaper",
  "sort-price",
  "guess-discount",
  "quick-q",
  "order-steps",
  "match-term",
  "vocab",
  "fill-blank",
  "solitaire",
  "shapes",
  "typerace",
  "uno",
];
const locales = ["en", "ar"];
const base = process.env.BASE_URL || "http://127.0.0.1:3000";

const PLAY_ITEM = { selector: "[data-play-item='true']", min: 1, label: "items" };

const EXPECT = {
  sudoku: { selector: "[data-sudoku-cell='true']", min: 81, label: "cells" },
  g2048: { selector: "[data-g2048-tile='true']", min: 16, label: "tiles" },
  snake: { selector: ".um-play-scell", min: 256, label: "cells" },
  memory: { selector: "[data-mem-card='true']", min: 12, label: "cards" },
  xo: { selector: "[data-xo-cell='true']", min: 9, label: "cells" },
  hanoi: { selector: "[data-hanoi-peg='true']", min: 3, label: "pegs" },
  "lesson-quiz": PLAY_ITEM,
  "guess-city": PLAY_ITEM,
  landmark: PLAY_ITEM,
  collector: { selector: "[data-play-item='true']", min: 4, label: "items" },
  price: PLAY_ITEM,
  wheel: PLAY_ITEM,
  basket: { selector: "[data-play-item='true']", min: 4, label: "items" },
  hangword: { selector: "[data-play-item='true']", min: 8, label: "items" },
  "flag-guess": PLAY_ITEM,
  "farther-pair": { selector: "[data-play-item='true']", min: 2, label: "items" },
  "larger-country": { selector: "[data-play-item='true']", min: 2, label: "items" },
  cheaper: { selector: "[data-play-item='true']", min: 2, label: "items" },
  "sort-price": { selector: "[data-play-item='true']", min: 4, label: "items" },
  "guess-discount": PLAY_ITEM,
  "quick-q": PLAY_ITEM,
  "order-steps": { selector: "[data-play-item='true']", min: 3, label: "items" },
  "match-term": { selector: "[data-play-item='true']", min: 4, label: "items" },
  vocab: PLAY_ITEM,
  "fill-blank": PLAY_ITEM,
  solitaire: { selector: "[data-kcard]", min: 52, label: "cards" },
  shapes: { selector: "[data-play-item='true']", min: 8, label: "items" },
  typerace: PLAY_ITEM,
  uno: { selector: "[data-play-item='true']", min: 2, label: "items" },
};

const EXTRA = {
  g2048: { selector: "[data-g2048-tile='true'][data-val]:not([data-val='0'])", min: 2, label: "valuedTiles" },
  snake: { selector: "[data-snake-board='true']", min: 1, label: "board", minSize: 80 },
  memory: { selector: "[data-mem-face='back']", min: 12, label: "faces", minSize: 24 },
  hanoi: { selector: "[data-hanoi-disc='true']", min: 4, label: "discs" },
  solitaire: { selector: "[data-tableau] [data-kcard][data-up='true']", min: 7, label: "faceUp", minSize: 24 },
};

const browser = await chromium.launch({ headless: true });
const results = [];
const directions = [];
const counts = [];
const solitaireMoves = [];

async function openGame(locale, slug, viewport) {
  const page = await browser.newPage({
    viewport,
    hasTouch: viewport.width <= 430,
  });
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => {
    errors.push(err.message);
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
  const response = await page.goto(`${base}/games/${slug}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForSelector('[data-game-mounted="true"]', { timeout: 20000 });
  return { page, errors, status: response?.status() ?? 0 };
}

async function startIfNeeded(page) {
  const start = page.locator('[data-howto-dismiss="true"]');
  if (await start.count()) {
    await start.first().click();
    await page.waitForTimeout(120);
  }
}

function countVisible(page, selector, minSize = 8) {
  return page.locator(selector).evaluateAll(
    (els, min) =>
      els.filter((el) => {
        const box = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return (
          box.width >= min &&
          box.height >= min &&
          style.visibility !== "hidden" &&
          style.display !== "none" &&
          Number(style.opacity || "1") > 0
        );
      }).length,
    minSize
  );
}

async function measureSolitaire(page) {
  const ids = await page.locator("[data-kcard]").evaluateAll((els) =>
    els.map((el) => el.getAttribute("data-kcard")).filter(Boolean)
  );
  const piles = await page.locator("[data-tableau]").evaluateAll((els) =>
    els.map((el) => Number(el.getAttribute("data-tableau-count") || 0))
  );
  const faceUp = await page.locator("[data-tableau] [data-kcard][data-up='true']").count();
  return {
    cards: new Set(ids).size,
    faceUp,
    piles: piles.length,
    pileCounts: piles,
    dealt: piles.reduce((sum, n) => sum + n, 0),
  };
}

async function measureBoard(page, slug) {
  if (slug === "solitaire") return measureSolitaire(page);
  const spec = EXPECT[slug];
  const extra = EXTRA[slug];
  const visible = await countVisible(page, spec.selector, spec.minSize ?? 8);
  const extras = extra
    ? {
        [extra.label]: await countVisible(page, extra.selector, extra.minSize ?? 8),
      }
    : {};
  return {
    [spec.label]: visible,
    ...extras,
  };
}

function passFor(slug, measured) {
  if (slug === "solitaire") {
    return (
      measured.cards === 52 &&
      measured.piles === 7 &&
      JSON.stringify(measured.pileCounts) === "[1,2,3,4,5,6,7]" &&
      measured.dealt === 28 &&
      measured.faceUp === 7
    );
  }
  const spec = EXPECT[slug];
  const extra = EXTRA[slug];
  if ((measured[spec.label] ?? 0) < spec.min) return false;
  if (extra && (measured[extra.label] ?? 0) < extra.min) return false;
  return true;
}

async function assertSolitaireMoves(page, locale) {
  await page.locator('[data-kcard="H-6"]').click();
  await page.waitForTimeout(80);
  const selected = await page.locator('[data-kcard="H-6"].sel').count();
  await page.locator('[data-tableau="1"] [data-kcard="S-7"]').click();
  await page.waitForTimeout(80);
  const afterLegal = await page.locator('[data-tableau="1"] [data-kcard="H-6"]').count();
  const legalMove = (await page.locator("[data-klondike-board]").getAttribute("data-last-move")) === "ok";
  await page.locator('[data-kcard="H-6"]').click();
  await page.waitForTimeout(80);
  await page.locator('[data-foundation-empty="0"]').click();
  await page.waitForTimeout(80);
  const stillOnTableau = await page.locator('[data-tableau="1"] [data-kcard="H-6"]').count();
  const illegalMove = (await page.locator("[data-klondike-board]").getAttribute("data-last-move")) === "no";
  return {
    locale,
    selected: selected > 0,
    legalMove,
    sixOnSeven: afterLegal === 1,
    illegalRejected: illegalMove && stillOnTableau === 1,
    pass: selected > 0 && legalMove && afterLegal === 1 && illegalMove && stillOnTableau === 1,
  };
}

async function assertSnakeRight(page, locale) {
  await startIfNeeded(page);
  await page.waitForSelector('[data-snake-head="true"]');
  const before = await page.locator('[data-snake-head="true"]').boundingBox();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(320);
  const after = await page.locator('[data-snake-head="true"]').boundingBox();
  const movedRight = Boolean(before && after && after.x > before.x + 2);
  const dir = await page.locator("[data-board-dir]").getAttribute("data-board-dir");
  return {
    game: "snake",
    locale,
    htmlDir: await page.locator("html").getAttribute("dir"),
    boardDir: dir,
    beforeX: before?.x ?? null,
    afterX: after?.x ?? null,
    movedPhysicalRight: movedRight,
  };
}

function read2048(page) {
  return page.locator(".um-play-t2048").evaluateAll((els) =>
    els.map((el) => ({
      col: Number(el.getAttribute("data-col") || 0),
      left: el.getBoundingClientRect().left,
      val: Number(el.getAttribute("data-val") || 0),
    }))
  );
}

function mergeLineTowardStart(line) {
  const compact = line.filter((n) => n !== 0);
  const next = [];
  for (let i = 0; i < compact.length; i += 1) {
    const current = compact[i] ?? 0;
    const upcoming = compact[i + 1] ?? 0;
    if (current !== 0 && current === upcoming) {
      next.push(current * 2);
      i += 1;
    } else if (current !== 0) {
      next.push(current);
    }
  }
  while (next.length < 4) next.push(0);
  return next;
}

function move2048Right(board) {
  const next = [...board];
  let moved = false;
  for (let row = 0; row < 4; row += 1) {
    const line = [3, 2, 1, 0].map((col) => next[row * 4 + col] ?? 0);
    const merged = mergeLineTowardStart(line);
    [3, 2, 1, 0].forEach((col, i) => {
      const value = merged[i] ?? 0;
      if (next[row * 4 + col] !== value) moved = true;
      next[row * 4 + col] = value;
    });
  }
  return { next, moved };
}

async function assert2048Right(page, locale) {
  await startIfNeeded(page);
  await page.waitForSelector(".um-play-g2048 [data-val]");
  let cells = await read2048(page);
  let values = cells.map((cell) => cell.val);
  if (!move2048Right(values).moved) {
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(80);
    cells = await read2048(page);
    values = cells.map((cell) => cell.val);
  }
  const expected = move2048Right(values);
  const beforeLeft = cells.filter((cell) => cell.val).map((cell) => cell.left);
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(80);
  const afterCells = await read2048(page);
  const afterValues = afterCells.map((cell) => cell.val);
  const afterLeft = afterCells.filter((cell) => cell.val).map((cell) => cell.left);
  let extras = 0;
  for (let i = 0; i < 16; i += 1) {
    const want = expected.next[i] ?? 0;
    const got = afterValues[i] ?? 0;
    if (want === got) continue;
    if (want === 0 && (got === 2 || got === 4)) extras += 1;
    else extras += 99;
  }
  const expectedMass = expected.next.reduce(
    (sum, value, index) => sum + value * (index % 4),
    0
  );
  const beforeMass = values.reduce((sum, value, index) => sum + value * (index % 4), 0);
  const col0 = afterCells.find((cell) => cell.col === 0);
  const col3 = afterCells.find((cell) => cell.col === 3);
  const physicalCols = Boolean(col0 && col3 && col3.left > col0.left + 10);
  return {
    game: "g2048",
    locale,
    htmlDir: await page.locator("html").getAttribute("dir"),
    boardDir: await page.locator("[data-board-dir]").getAttribute("data-board-dir"),
    beforeAvgX: beforeLeft.length
      ? beforeLeft.reduce((a, b) => a + b, 0) / beforeLeft.length
      : 0,
    afterAvgX: afterLeft.length
      ? afterLeft.reduce((a, b) => a + b, 0) / afterLeft.length
      : 0,
    movedPhysicalRight:
      expected.moved && extras <= 1 && expectedMass > beforeMass && physicalCols,
  };
}

const mobile = { width: 390, height: 844 };
const desktop = { width: 1280, height: 800 };

for (const locale of locales) {
  for (const slug of slugs) {
    const { page, errors, status } = await openGame(locale, slug, mobile);
    const mounted = await page.locator('[data-game-mounted="true"]').count();
    const howto = await page.locator("[data-howto]").count();
    const beforeStart = slug === "memory" ? await measureBoard(page, slug) : null;
    if (slug === "snake") {
      directions.push(await assertSnakeRight(page, locale));
    } else if (slug === "g2048") {
      directions.push(await assert2048Right(page, locale));
    } else {
      await startIfNeeded(page);
    }
    if (slug === "memory") {
      await page.waitForSelector("[data-mem-card='true']", { timeout: 8000 });
    } else {
      await page.waitForSelector(EXPECT[slug].selector, { timeout: 8000 });
    }
    const afterStart = await measureBoard(page, slug);
    if (slug === "solitaire") {
      solitaireMoves.push(await assertSolitaireMoves(page, locale));
    }
    const gameErrors = errors.filter(
      (text) =>
        !text.includes("503") &&
        !text.includes("Failed to load resource") &&
        !text.includes("Minified React error #418")
    );
    const pass = passFor(slug, afterStart) && (slug !== "memory" || (beforeStart?.cards ?? 0) === 0);
    counts.push({
      locale,
      slug,
      viewport: "390",
      beforeStart,
      afterStart,
      pass,
    });
    results.push({
      locale,
      slug,
      viewport: "390",
      status,
      mounted,
      howto,
      beforeStart,
      afterStart,
      errors: gameErrors,
    });
    await page.close();
  }
}

for (const locale of locales) {
  const { page, errors, status } = await openGame(locale, "memory", desktop);
  const howto = await page.locator("[data-howto]").count();
  const beforeStart = await measureBoard(page, "memory");
  await startIfNeeded(page);
  await page.waitForSelector("[data-mem-card='true']", { timeout: 8000 });
  const afterStart = await measureBoard(page, "memory");
  const gameErrors = errors.filter(
    (text) =>
      !text.includes("503") &&
      !text.includes("Failed to load resource") &&
      !text.includes("Minified React error #418")
  );
  const pass = passFor("memory", afterStart) && (beforeStart.cards ?? 0) === 0;
  counts.push({
    locale,
    slug: "memory",
    viewport: "1280",
    beforeStart,
    afterStart,
    pass,
  });
  results.push({
    locale,
    slug: "memory",
    viewport: "1280",
    status,
    mounted: await page.locator('[data-game-mounted="true"]').count(),
    howto,
    beforeStart,
    afterStart,
    errors: gameErrors,
  });
  await page.close();
}

const catalog = [];

async function assertCatalog(locale, viewport, expectedCols) {
  const page = await browser.newPage({
    viewport,
    hasTouch: viewport.width <= 430,
  });
  await page.context().addCookies([
    { name: "umtuba_locale", value: locale, url: base },
    { name: "umtuba_locale_source", value: "explicit", url: base },
  ]);
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "umtuba.games.best.v1",
      JSON.stringify({ sudoku: 880 })
    );
  });
  const response = await page.goto(`${base}/games`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForSelector("[data-catalog-grid='true']", { timeout: 20000 });
  const cards = page.locator("[data-game-card]");
  const svgs = page.locator("[data-game-card] svg");
  const cardCount = await cards.count();
  const svgCount = await svgs.count();
  const first = await cards.first().boundingBox();
  const square = Boolean(
    first && Math.abs(first.width - first.height) < 4 && first.width > 80
  );
  const xs = await cards.evaluateAll((els) => [
    ...new Set(els.map((el) => Math.round(el.getBoundingClientRect().x))),
  ]);
  const heightBefore = first?.height ?? 0;
  await page.waitForTimeout(250);
  const heightAfter = (await cards.first().boundingBox())?.height ?? 0;
  const best = (await page.locator("[data-game-best='sudoku']").textContent()) ?? "";
  const row = {
    locale,
    viewport: String(viewport.width),
    status: response?.status() ?? 0,
    cards: cardCount,
    svgs: svgCount,
    cols: xs.length,
    expectedCols,
    square,
    heightStable: Math.abs(heightAfter - heightBefore) < 2,
    bestHasScore: /\d/.test(best),
    pass:
      cardCount === 29 &&
      svgCount === 29 &&
      xs.length === expectedCols &&
      square &&
      Math.abs(heightAfter - heightBefore) < 2 &&
      /\d/.test(best),
  };
  catalog.push(row);
  await page.close();
  return row;
}

await assertCatalog("en", mobile, 2);
await assertCatalog("ar", mobile, 2);
await assertCatalog("en", { width: 768, height: 1024 }, 3);
await assertCatalog("ar", { width: 768, height: 1024 }, 3);
await assertCatalog("en", desktop, 4);
await assertCatalog("ar", desktop, 4);

await browser.close();

const lines = [
  "locale\tgame\tviewport\tprimary\textra\tpass",
  ...counts.map((row) => {
    const spec = EXPECT[row.slug];
    const extra = EXTRA[row.slug];
    const primary =
      row.slug === "solitaire"
        ? `${row.afterStart.cards}/52 cards`
        : `${row.afterStart[spec.label] ?? 0}/${spec.min} ${spec.label}`;
    const extraText =
      row.slug === "solitaire"
        ? `${row.afterStart.dealt}/28 dealt ${row.afterStart.faceUp}/7 up`
        : extra
          ? `${row.afterStart[extra.label] ?? 0}/${extra.min} ${extra.label}`
          : "-";
    return `${row.locale}\t${row.slug}\t${row.viewport}\t${primary}\t${extraText}\t${row.pass ? "ok" : "FAIL"}`;
  }),
];
console.log(lines.join("\n"));
console.log(
  [
    "locale\tcatalog\tviewport\tcards\tsvgs\tcols\tsquare\tbest\tpass",
    ...catalog.map(
      (row) =>
        `${row.locale}\tcatalog\t${row.viewport}\t${row.cards}\t${row.svgs}\t${row.cols}/${row.expectedCols}\t${row.square}\t${row.bestHasScore}\t${row.pass ? "ok" : "FAIL"}`
    ),
  ].join("\n")
);
console.log(
  [
    "locale\tsolitaire\tselected\tlegal\tsixOnSeven\tillegalRejected\tpass",
    ...solitaireMoves.map(
      (row) =>
        `${row.locale}\tmoves\t${row.selected}\t${row.legalMove}\t${row.sixOnSeven}\t${row.illegalRejected}\t${row.pass ? "ok" : "FAIL"}`
    ),
  ].join("\n")
);
console.log(JSON.stringify({ base, results, directions, counts, catalog, solitaireMoves }, null, 2));

const failedMount = results.filter(
  (row) => row.status !== 200 || row.mounted < 1 || row.howto < 1 || row.errors.length > 0
);
const failedDir = directions.filter((row) => !row.movedPhysicalRight);
const failedCounts = counts.filter((row) => !row.pass);
const failedCatalog = catalog.filter((row) => !row.pass);
const failedSolitaire = solitaireMoves.filter((row) => !row.pass);
if (
  failedMount.length ||
  failedDir.length ||
  failedCounts.length ||
  failedCatalog.length ||
  failedSolitaire.length
) {
  process.exit(1);
}
