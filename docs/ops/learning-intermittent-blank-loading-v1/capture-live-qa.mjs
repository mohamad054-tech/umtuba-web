import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const outDir = path.resolve(
  "docs/ops/learning-intermittent-blank-loading-v1/screenshots"
);

const pages = [
  ["01-learning-home-desktop", "https://umtuba.com/learning?hl=en", 1440, 900, "en-US"],
  ["02-learning-home-mobile", "https://umtuba.com/learning?hl=en", 390, 844, "en-US"],
  ["03-course-ja-18-desktop", "https://umtuba.com/learning/catalog/ja-18?hl=en", 1440, 900, "en-US"],
  ["04-course-ja-18-mobile", "https://umtuba.com/learning/catalog/ja-18?hl=en", 390, 844, "en-US"],
  ["05-arabic-rtl-desktop", "https://umtuba.com/learning?hl=ar", 1440, 900, "ar"],
  ["06-arabic-rtl-mobile", "https://umtuba.com/learning?hl=ar", 390, 844, "ar"],
  ["07-arabic-ja-18", "https://umtuba.com/learning/catalog/ja-18?hl=ar", 1440, 900, "ar"],
];

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  timeout: 20000,
  args: ["--disable-dev-shm-usage", "--no-first-run"],
});

await mkdir(outDir, { recursive: true });

try {
  for (const [name, url, width, height, locale] of pages) {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      locale,
      extraHTTPHeaders: {
        "Accept-Language": locale === "ar" ? "ar" : "en-US,en;q=0.9",
      },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
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
    await page.waitForTimeout(900);
    const htmlLang = await page.locator("html").getAttribute("lang");
    const htmlDir = await page.locator("html").getAttribute("dir");
    const textLen = await page.evaluate(() =>
      (document.querySelector(".learning-visual-root")?.textContent ?? "")
        .replace(/\s+/g, " ")
        .trim().length
    );
    await page.screenshot({
      path: path.join(outDir, `${name}.png`),
      fullPage: false,
    });
    console.log(
      [
        `WROTE ${name}`,
        `status=${response?.status() ?? "n/a"}`,
        `dcl_ms=${dcl}`,
        `visual_ms=${visualAt ?? "MISSING"}`,
        `text_len=${textLen}`,
        `lang=${htmlLang}`,
        `dir=${htmlDir}`,
        `url=${page.url()}`,
      ].join(" ")
    );
    await context.close();
  }
} finally {
  await browser.close();
}
