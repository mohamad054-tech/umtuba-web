const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  const routes = [
    "/store",
    "/store/search",
    "/store/cart",
    "/store/wishlist",
    "/store/orders",
    "/store/checkout",
    "/store/umtuba-e2e-20260721/product/e2e-simple-mug",
  ];
  const viewports = [
    { name: "360", width: 360, height: 800 },
    { name: "390", width: 390, height: 844 },
    { name: "430", width: 430, height: 932 },
    { name: "768", width: 768, height: 1024 },
    { name: "1280", width: 1280, height: 800 },
    { name: "1440", width: 1440, height: 900 },
  ];
  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, reducedMotion: "reduce" });
    const page = await context.newPage();
    for (const route of routes) {
      const entry = { viewport: vp.name, route, ok: false };
      try {
        const resp = await page.goto("http://127.0.0.1:3017" + route, { waitUntil: "networkidle", timeout: 45000 });
        entry.status = resp ? resp.status() : null;
        entry.finalUrl = page.url();
        await page.waitForTimeout(500);
        entry.overflowX = await page.evaluate(() => {
          const doc = document.documentElement;
          return Math.max(doc.scrollWidth - doc.clientWidth, document.body.scrollWidth - document.body.clientWidth);
        });
        entry.headerBg = await page.evaluate(() => {
          const el = document.querySelector("header") || document.querySelector("[data-store-shell]") || document.querySelector("nav");
          if (!el) return null;
          return getComputedStyle(el).backgroundColor;
        });
        entry.goldSignal = await page.evaluate(() => {
          const text = document.body.innerText.slice(0, 500);
          const styles = Array.from(document.querySelectorAll("header, [class*=store], nav")).slice(0, 20).map(el => getComputedStyle(el).color + "|" + getComputedStyle(el).backgroundColor);
          return { textSample: text.replace(/\s+/g, " ").slice(0, 180), styles };
        });
        entry.title = await page.title();
        entry.hasLoginCue = /sign in|log in|login|auth/i.test(await page.content());
        entry.ok = true;
      } catch (e) {
        entry.error = String(e).slice(0, 240);
      }
      results.push(entry);
    }
    await context.close();
  }
  await browser.close();
  console.log(JSON.stringify(results, null, 2));
})().catch((e) => { console.error(e); process.exit(1); });
