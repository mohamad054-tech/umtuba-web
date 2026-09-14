/**
 * Capture CURRENT live umtuba.com Store (not a claimed candidate deploy).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const shotDir = join(here, "shots");
mkdirSync(shotDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const evidence = { origin: "https://umtuba.com", pages: [] };

async function capture(name, url, viewport) {
  const context = await browser.newContext({
    viewport,
    locale: url.includes("hl=ar") ? "ar" : "en-US",
  });
  const page = await context.newPage();
  const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(1500);
  const html = await page.content();
  const file = join(shotDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  evidence.pages.push({
    name,
    url,
    status: res?.status() ?? null,
    finalUrl: page.url(),
    dir: await page.locator("html").getAttribute("dir"),
    lang: await page.locator("html").getAttribute("lang"),
    hasNightMarketToken: /#06101f|#6a4cff|#d7c08a/.test(html),
    hasShopUmtuba: /Shop UMTUBA|تسوق/.test(html),
    hasEmptyCatalog: /Products are coming|Nothing is for sale|لا يوجد/.test(html),
    hasLogin: /\/login/.test(page.url()) || /Sign in|تسجيل/.test(html),
    screenshot: file,
  });
  await context.close();
}

try {
  await capture("01_store_desktop_1440", "https://umtuba.com/store", {
    width: 1440,
    height: 900,
  });
  await capture("02_store_mobile_390", "https://umtuba.com/store", {
    width: 390,
    height: 844,
  });
  await capture("03_store_ar_rtl_1440", "https://umtuba.com/store?hl=ar", {
    width: 1440,
    height: 900,
  });
  await capture("04_store_en_ltr_1440", "https://umtuba.com/store?hl=en", {
    width: 1440,
    height: 900,
  });
  await capture("05_store_cart_auth", "https://umtuba.com/store/cart", {
    width: 1440,
    height: 900,
  });
  await capture("06_store_checkout_auth", "https://umtuba.com/store/checkout", {
    width: 1440,
    height: 900,
  });
  writeFileSync(join(here, "current-live-evidence.json"), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ ok: true, pages: evidence.pages.length, shotDir }, null, 2));
} finally {
  await browser.close();
}
