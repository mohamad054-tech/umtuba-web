import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const outDir = path.resolve(
  "docs/ops/learning-final-engineering-gates-v1/screenshots"
);

const pages = [
  ["11-live-home-desktop", "http://localhost:3018/learning?hl=en", 1440, 900, "en-US"],
  ["12-live-home-mobile", "http://localhost:3018/learning?hl=en", 390, 844, "en-US"],
  ["13-live-catalog", "http://localhost:3018/learning/catalog?hl=en", 1440, 900, "en-US"],
  ["14-live-course-ja-01", "http://localhost:3018/learning/catalog/ja-01?hl=en", 1440, 900, "en-US"],
  ["15-live-arabic-rtl", "http://localhost:3018/learning?hl=ar", 1440, 900, "ar"],
  ["16-live-arabic-rtl-mobile", "http://localhost:3018/learning?hl=ar", 390, 844, "ar"],
];

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  timeout: 15000,
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
    page.setDefaultTimeout(25000);
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 25000,
    });
    await page.waitForSelector(".learning-visual-root", { timeout: 25000 });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(outDir, `${name}.png`),
      fullPage: false,
    });
    console.log("WROTE", name, "status", response?.status() ?? "n/a");
    await context.close();
  }
} finally {
  await browser.close();
}
