import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const outDir = path.resolve(
  "docs/ops/learning-world-class-visual-design-v1/screenshots"
);

const pages = [
  ["03-course-page", "http://localhost:3017/learning/catalog/signals-of-thought-ai-studio?hl=en", 1440, 900, "en-US"],
  ["04-lesson-page", "http://localhost:3017/learning/lessons/a2222222-2222-4222-8222-222222222222?hl=en", 1440, 900, "en-US"],
  ["05-my-learning", "http://localhost:3017/learning?surface=library&hl=en", 1440, 900, "en-US"],
  ["06-teacher-profile", "http://localhost:3017/learning/teachers/demo-teacher-nour-qamar?hl=en", 1440, 900, "en-US"],
  ["06b-become-a-teacher", "http://localhost:3017/learning/become-a-teacher?hl=en", 1440, 900, "en-US"],
  ["07-teacher-center", "http://localhost:3017/learning/teacher?hl=en", 1440, 900, "en-US"],
  ["08-course-builder", "http://localhost:3017/learning/teacher/courses/new?hl=en", 1440, 900, "en-US"],
  ["09-arabic-rtl", "http://localhost:3017/learning?hl=ar", 1440, 900, "ar"],
  ["10-arabic-rtl-mobile", "http://localhost:3017/learning?hl=ar", 390, 844, "ar"],
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
      extraHTTPHeaders: { "Accept-Language": locale === "ar" ? "ar" : "en-US,en;q=0.9" },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(45000);
    await page.goto(url, { waitUntil: "commit", timeout: 45000 });
    await page.waitForSelector(".learning-visual-root", { timeout: 45000 });
    await page.waitForTimeout(900);
    await page.screenshot({
      path: path.join(outDir, `${name}.png`),
      fullPage: false,
    });
    console.log("WROTE", name);
    await context.close();
  }
} finally {
  await browser.close();
}
