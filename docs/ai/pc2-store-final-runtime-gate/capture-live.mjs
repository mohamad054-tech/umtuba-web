import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const shotDir = join(here, "shots");
mkdirSync(shotDir, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const pages = [];

async function shot(name, url, viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(1200);
  const html = await page.content();
  const file = join(shotDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  pages.push({
    name,
    url,
    status: res?.status() ?? null,
    finalUrl: page.url(),
    hasNightMarket: /#06101f|#6a4cff/.test(html),
    hasEmpty: /Nothing is for sale|No featured products|لا يوجد/.test(html),
    hasProductHref: /\/store\/[^/]+\/product\//.test(html),
    screenshot: file,
  });
  await ctx.close();
}

try {
  await shot("01_store_home", "https://umtuba.com/store");
  await shot("02_seller_a_storefront", "https://umtuba.com/store/pc2-test-seller-a-20260823");
  await shot("03_store_search", "https://umtuba.com/store/search");
  writeFileSync(join(here, "live-evidence.json"), JSON.stringify({ pages }, null, 2));
  console.log(JSON.stringify({ ok: true, count: pages.length, pages }, null, 2));
} finally {
  await browser.close();
}
