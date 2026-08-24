import { chromium } from "playwright";

const base = process.env.LEARNING_BASE_URL ?? "http://127.0.0.1:3022";
const out = [];

function log(row) {
  out.push(row);
  console.log(row);
}

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  timeout: 20000,
  args: ["--disable-dev-shm-usage", "--no-first-run"],
});

try {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  const visits = [
    `${base}/learning`,
    `${base}/learning/catalog/ja-18`,
    `${base}/learning`,
    `${base}/learning/catalog/ja-18`,
    `${base}/learning/catalog/ja-18`,
  ];

  for (const [i, url] of visits.entries()) {
    const started = Date.now();
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    const dcl = Date.now() - started;
    const visualAt = await page
      .waitForSelector(".learning-visual-root", { timeout: 8000 })
      .then(() => Date.now() - started)
      .catch(() => null);
    const blank = await page.evaluate(() => {
      const root = document.querySelector(".learning-visual-root");
      const text = (root?.textContent ?? "").replace(/\s+/g, " ").trim();
      return {
        hasRoot: Boolean(root),
        textLen: text.length,
        bodyBg: getComputedStyle(document.body).backgroundColor,
      };
    });
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    log(
      [
        `visit=${i + 1}`,
        `status=${response?.status() ?? "n/a"}`,
        `dcl_ms=${dcl}`,
        `visual_ms=${visualAt ?? "MISSING"}`,
        `root=${blank.hasRoot}`,
        `text_len=${blank.textLen}`,
        `url=${page.url()}`,
      ].join(" ")
    );
    if (errors.length) {
      log(`console_errors=${errors.join(" | ")}`);
    }
  }

  const ar = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "ar",
    extraHTTPHeaders: { "Accept-Language": "ar" },
  });
  const arPage = await ar.newPage();
  const arStarted = Date.now();
  await arPage.goto(`${base}/learning?hl=ar`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await arPage.waitForSelector(".learning-visual-root", { timeout: 8000 });
  const htmlLang = await arPage.locator("html").getAttribute("lang");
  const htmlDir = await arPage.locator("html").getAttribute("dir");
  log(
    `arabic visual_ms=${Date.now() - arStarted} lang=${htmlLang} dir=${htmlDir}`
  );
  await ar.close();
} finally {
  await browser.close();
}
