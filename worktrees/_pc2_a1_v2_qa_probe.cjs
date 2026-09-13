const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "_pc2_a1_v2_qa");
fs.mkdirSync(OUT, { recursive: true });

const TARGETS = [
  { name: "production", base: "https://umtuba.com" },
  { name: "local_source", base: process.env.LOCAL_STORE_BASE || "http://127.0.0.1:3011" },
];

const ROUTES = [
  "/store",
  "/store/search",
  "/store/search?availability=in_stock",
  "/store/umtuba-e2e-20260721",
  "/store/umtuba-e2e-20260721/product/e2e-simple-mug",
  "/store/cart",
  "/store/checkout",
  "/store/orders",
  "/store/wishlist",
];

const VIEWPORTS = [
  { name: "360", width: 360, height: 800 },
  { name: "1024", width: 1024, height: 768 },
  { name: "1440", width: 1440, height: 900 },
];

const SANDBOX_RE =
  /e2e-simple-mug|e2e-variant-tee|e2e-low-stock|umtuba-e2e-20260721|UMTUBA_E2E_20260721/i;

async function probePage(page, url) {
  const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(700);
  const bodyText = await page.locator("body").innerText().catch(() => "");
  const overflowX = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  const dir = await page.evaluate(() => document.documentElement.getAttribute("dir"));
  const lang = await page.evaluate(() => document.documentElement.getAttribute("lang"));
  const svgHearts = await page.locator("svg").evaluateAll((nodes) =>
    nodes.filter((n) => {
      const d = n.querySelector("path")?.getAttribute("d") || "";
      return d.includes("M") && (n.getAttribute("aria-hidden") === "true" || true);
    }).length
  );
  const wishlistButtons = await page.locator("button[aria-label*='wishlist' i], button[aria-label*='favorite' i], button[aria-label*='Save' i]").count();
  const inStock = await page.locator("text=In stock").count();
  const loginHints = /log in|sign in|login/i.test(bodyText);
  return {
    status: res?.status() ?? null,
    finalUrl: page.url(),
    title: await page.title(),
    overflowX,
    dir,
    lang,
    sandboxVisibleText: SANDBOX_RE.test(bodyText),
    sandboxTitle: SANDBOX_RE.test(await page.title()),
    inStockControl: inStock,
    wishlistButtons,
    svgCount: svgHearts,
    loginHints,
    h1: ((await page.locator("h1").first().textContent().catch(() => "")) || "").trim().slice(0, 80),
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const report = [];
  for (const target of TARGETS) {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      for (const route of ROUTES) {
        const url = target.base + route;
        try {
          const row = await probePage(page, url);
          const shot = `${target.name}_${vp.name}${route.split("?")[0].replaceAll("/", "_") || "_home"}.png`;
          await page.screenshot({ path: path.join(OUT, shot), fullPage: false });
          report.push({ target: target.name, viewport: vp.name, route, shot, ...row });
          console.log(
            `${target.name} ${vp.name} ${route} status=${row.status} sandboxText=${row.sandboxVisibleText} overflowX=${row.overflowX} url=${row.finalUrl}`
          );
        } catch (err) {
          report.push({
            target: target.name,
            viewport: vp.name,
            route,
            error: String(err),
          });
          console.log(`${target.name} ${vp.name} ${route} ERROR ${err}`);
        }
      }

      // RTL smoke on store home
      try {
        await page.goto(target.base + "/store", { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.waitForTimeout(400);
        await page.evaluate(() => {
          document.documentElement.setAttribute("dir", "rtl");
          document.documentElement.setAttribute("lang", "ar");
        });
        await page.waitForTimeout(200);
        const rtl = await page.evaluate(() => ({
          dir: document.documentElement.getAttribute("dir"),
          overflowX:
            document.documentElement.scrollWidth - document.documentElement.clientWidth,
          skipInset: (() => {
            const el = document.querySelector("a.sf-skip-link, a[href='#store-main']");
            return el ? getComputedStyle(el).insetInlineStart : null;
          })(),
        }));
        const shot = `${target.name}_${vp.name}_store_rtl.png`;
        await page.screenshot({ path: path.join(OUT, shot), fullPage: false });
        report.push({
          target: target.name,
          viewport: vp.name,
          route: "/store?rtl=forced",
          shot,
          ...rtl,
        });
        console.log(
          `${target.name} ${vp.name} RTL dir=${rtl.dir} overflowX=${rtl.overflowX}`
        );
      } catch (err) {
        report.push({
          target: target.name,
          viewport: vp.name,
          route: "/store?rtl=forced",
          error: String(err),
        });
      }
      await context.close();
    }
  }
  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  await browser.close();
  console.log("WROTE", path.join(OUT, "report.json"));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
