const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "_store_visual_qa");
fs.mkdirSync(OUT, { recursive: true });
const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = [];
  for (const vp of [
    { name: "360", width: 360, height: 800 },
    { name: "768", width: 768, height: 1024 },
    { name: "1280", width: 1280, height: 800 },
  ]) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    for (const route of ["/store", "/store/search"]) {
      const res = await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(600);
      const overflowX = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      const file = `recheck_${vp.name}${route.replaceAll("/", "_")}.png`;
      await page.screenshot({ path: path.join(OUT, file), fullPage: false });
      report.push({
        vp: vp.name,
        route,
        status: res?.status(),
        overflowX,
        headerColor: await page.evaluate(() => {
          const el = document.querySelector("header p, header a");
          return el ? getComputedStyle(el).color : null;
        }),
      });
    }
    if (vp.name === "1280") {
      await page.goto(BASE + "/store/search", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(400);
      const product = page.locator("a[href*='/store/'][href*='/product/']").first();
      if (await product.count()) {
        await product.click({ timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(800);
        const overflowX = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        await page.screenshot({
          path: path.join(OUT, "recheck_1280_pdp.png"),
          fullPage: false,
        });
        report.push({ vp: "1280", route: page.url(), overflowX, pdp: true });
      }
    }
    await context.close();
  }
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
