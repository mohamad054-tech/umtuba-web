import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const outDir = path.resolve(
  "docs/ops/learning-staged-production-deploy-v1/screenshots"
);

const pages = [
  ["01-learning-home-desktop", "https://umtuba.com/learning?hl=en", 1440, 900, "en-US"],
  ["02-learning-home-mobile", "https://umtuba.com/learning?hl=en", 390, 844, "en-US"],
  ["03-learning-catalog", "https://umtuba.com/learning/catalog?hl=en", 1440, 900, "en-US"],
  ["04-course-ja-01", "https://umtuba.com/learning/catalog/ja-01?hl=en", 1440, 900, "en-US"],
  ["05-lesson", "https://umtuba.com/learning/lessons/603def66-6610-406d-8d3b-7eb6dd614e72?hl=en", 1440, 900, "en-US"],
  ["06-my-learning", "https://umtuba.com/learning?tab=my-learning&hl=en", 1440, 900, "en-US"],
  ["07-become-a-teacher", "https://umtuba.com/learning/become-a-teacher?hl=en", 1440, 900, "en-US"],
  ["08-teacher-center", "https://umtuba.com/learning/teacher?hl=en", 1440, 900, "en-US"],
  ["09-course-builder", "https://umtuba.com/learning/teacher/courses/new?hl=en", 1440, 900, "en-US"],
  ["10-arabic-rtl-desktop", "https://umtuba.com/learning?hl=ar", 1440, 900, "ar"],
  ["11-arabic-rtl-mobile", "https://umtuba.com/learning?hl=ar", 390, 844, "ar"],
  ["12-ltr-home", "https://umtuba.com/learning?hl=en", 1440, 900, "en-US"],
  ["13-discover-spotcheck", "https://umtuba.com/discover", 1440, 900, "en-US"],
  ["14-store-spotcheck", "https://umtuba.com/store", 1440, 900, "en-US"],
  ["15-home-spotcheck", "https://umtuba.com/", 1440, 900, "en-US"],
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
    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    const visual = await page
      .waitForSelector(".learning-visual-root", { timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    await page.waitForTimeout(900);
    const htmlLang = await page.locator("html").getAttribute("lang");
    const htmlDir = await page.locator("html").getAttribute("dir");
    await page.screenshot({
      path: path.join(outDir, `${name}.png`),
      fullPage: false,
    });
    console.log(
      "WROTE",
      name,
      "status",
      response?.status() ?? "n/a",
      "visual",
      visual,
      "lang",
      htmlLang,
      "dir",
      htmlDir,
      "url",
      page.url()
    );
    await context.close();
  }
} finally {
  await browser.close();
}
