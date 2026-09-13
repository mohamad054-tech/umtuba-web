const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const out = path.join("docs", "ops", "store-final-runtime-gate", "screenshots");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const shots = [];

  async function capture(name, url, viewport) {
    const context = await browser.newContext({
      viewport,
      locale: url.includes("hl=ar") ? "ar" : "en-US",
    });
    const page = await context.newPage();
    const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2000);
    const file = path.join(out, name);
    await page.screenshot({ path: file, fullPage: true });
    const productLinks = await page.locator('a[href*="/product/"]').count();
    const body = await page.locator("body").innerText();
    shots.push({
      name,
      url,
      status: resp ? resp.status() : null,
      title: await page.title(),
      dir: await page.locator("html").getAttribute("dir"),
      lang: await page.locator("html").getAttribute("lang"),
      productLinks,
      hasComing: /Products are coming|المنتجات قادمة/i.test(body),
      hasNothingForSale: /Nothing is for sale yet|لا يوجد شيء للبيع بعد/i.test(body),
      hasZeroResults: /0 results|٠ نتيجة|0 نتيجة/i.test(body),
      pathname: new URL(page.url()).pathname,
    });
    await context.close();
  }

  await capture("01-store-home-desktop-en.png", "https://umtuba.com/store?hl=en", { width: 1440, height: 900 });
  await capture("02-store-search-desktop-en.png", "https://umtuba.com/store/search?hl=en", { width: 1440, height: 900 });
  await capture("03-store-home-mobile-en.png", "https://umtuba.com/store?hl=en", { width: 390, height: 844 });
  await capture("04-store-home-desktop-ar.png", "https://umtuba.com/store?hl=ar", { width: 1440, height: 900 });
  await capture("05-store-search-desktop-ar.png", "https://umtuba.com/store/search?hl=ar", { width: 1440, height: 900 });
  await capture("06-store-cart-desktop-en.png", "https://umtuba.com/store/cart?hl=en", { width: 1440, height: 900 });

  await browser.close();
  fs.writeFileSync(
    path.join("docs", "ops", "store-final-runtime-gate", "screenshot-evidence.json"),
    JSON.stringify(shots, null, 2)
  );
  console.log(JSON.stringify(shots, null, 2));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
