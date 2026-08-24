import { chromium } from "playwright";

const base = process.env.LEARNING_BASE_URL ?? "http://127.0.0.1:3022";
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--disable-dev-shm-usage", "--no-first-run"],
});
const page = await browser.newPage();
await page.goto(`${base}/learning`, { waitUntil: "domcontentloaded" });
await page.waitForSelector(".learning-visual-root");
const hrefs = await page.$$eval("a[href*='catalog']", (as) =>
  as.map((a) => a.getAttribute("href"))
);
console.log([...new Set(hrefs)].join("\n"));
await browser.close();
