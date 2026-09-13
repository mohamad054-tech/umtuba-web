const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "_store_visual_qa");
fs.mkdirSync(OUT, { recursive: true });

const BASE = "http://localhost:3000";
const routes = [
  "/store",
  "/store/search",
  "/store/cart",
  "/store/wishlist",
  "/store/checkout",
  "/store/orders",
];
const viewports = [
  { name: "360", width: 360, height: 800 },
  { name: "390", width: 390, height: 844 },
  { name: "430", width: 430, height: 932 },
  { name: "768", width: 768, height: 1024 },
  { name: "1280", width: 1280, height: 800 },
  { name: "1440", width: 1440, height: 900 },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = [];
  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const consoleErrors = [];
    page.on("pageerror", (err) => consoleErrors.push(String(err)));
    for (const route of routes) {
      const url = BASE + route;
      const started = Date.now();
      const res = await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
      await page.waitForTimeout(400);
      const overflowX = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      const title = await page.title();
      const h1 = await page.locator("h1").first().textContent().catch(() => "");
      const skip = await page.locator("a.sf-skip-link, a[href='#store-main']").count();
      const storeChrome = await page.locator(".sf-chrome, [aria-label='Store']").count();
      const goldEyebrow = await page.evaluate(() => {
        const el = document.querySelector("header p");
        if (!el) return null;
        return getComputedStyle(el).color;
      });
      const blueNav = await page.evaluate(() => {
        const el = document.querySelector("header p");
        if (!el) return false;
        const c = getComputedStyle(el).color;
        return c.includes("147") || c.includes("59, 130") || c.includes("96, 165");
      });
      const file = `${vp.name}${route.replaceAll("/", "_") || "_home"}.png`;
      await page.screenshot({ path: path.join(OUT, file), fullPage: false });
      report.push({
        viewport: vp.name,
        route,
        status: res?.status() ?? null,
        finalUrl: page.url(),
        title,
        h1: (h1 || "").trim().slice(0, 80),
        overflowX,
        skipLink: skip,
        storeChrome,
        headerColor: goldEyebrow,
        headerLooksBlue: blueNav,
        ms: Date.now() - started,
        consoleErrors: consoleErrors.splice(0),
      });
    }
    await context.close();
  }
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
