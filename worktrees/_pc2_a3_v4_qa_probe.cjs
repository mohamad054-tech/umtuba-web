const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "_pc2_a3_v4_qa");
fs.mkdirSync(OUT, { recursive: true });

const BASE = "https://umtuba.com";
const SANDBOX_RE =
  /e2e-simple-mug|e2e-variant-tee|e2e-low-stock|umtuba-e2e-20260721|UMTUBA_E2E_20260721/i;

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
  { name: "390", width: 390, height: 844 },
  { name: "1024", width: 1024, height: 768 },
  { name: "1440", width: 1440, height: 900 },
];

async function probePage(page, url) {
  const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(900);
  const bodyText = await page.locator("body").innerText().catch(() => "");
  const html = await page.content();
  const overflowX = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  const chips = await page.locator("button, a, label, [role='checkbox']").evaluateAll((nodes) =>
    nodes
      .map((n) => (n.textContent || "").trim())
      .filter((t) => t && t.length < 80)
      .slice(0, 40)
  );
  const productHrefs = await page.locator('a[href*="/store/"][href*="/product/"]').evaluateAll((nodes) =>
    [...new Set(nodes.map((n) => n.getAttribute("href")).filter(Boolean))].slice(0, 12)
  );
  const emptyHints = /no matches|catalog is quiet|nothing here|no results|empty/i.test(bodyText);
  const errorHints = /something went wrong|try again|error/i.test(bodyText);
  const loadingHints = /updating|loading/i.test(bodyText);
  return {
    status: res?.status() ?? null,
    finalUrl: page.url(),
    title: await page.title(),
    overflowX,
    dir: await page.evaluate(() => document.documentElement.getAttribute("dir")),
    lang: await page.evaluate(() => document.documentElement.getAttribute("lang")),
    sandboxVisibleText: SANDBOX_RE.test(bodyText),
    sandboxHtml: SANDBOX_RE.test(html),
    sandboxTitle: SANDBOX_RE.test(await page.title()),
    inStockControl: await page.locator("text=/in stock/i").count(),
    loginHints: /log in|sign in|login/i.test(bodyText),
    emptyHints,
    errorHints,
    loadingHints,
    h1: ((await page.locator("h1").first().textContent().catch(() => "")) || "").trim().slice(0, 120),
    visible404: /this page could not be found|^404$/m.test(bodyText) || (await page.locator("h1").allTextContents()).some((t) => /^\s*404\s*$/.test(t)),
    chips: chips.filter((t) => /e2e|category|digital|education|filter/i.test(t)).slice(0, 20),
    productHrefs,
    bodyPreview: bodyText.replace(/\s+/g, " ").slice(0, 280),
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const report = [];

  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    for (const route of ROUTES) {
      const url = BASE + route;
      try {
        const row = await probePage(page, url);
        const shot = `prod_${vp.name}${route.split("?")[0].replaceAll("/", "_") || "_home"}.png`;
        await page.screenshot({ path: path.join(OUT, shot), fullPage: false });
        report.push({ viewport: vp.name, route, shot, ...row });
        console.log(
          `${vp.name} ${route} status=${row.status} sandboxText=${row.sandboxVisibleText} sandboxHtml=${row.sandboxHtml} overflowX=${row.overflowX} url=${row.finalUrl} h1=${JSON.stringify(row.h1)}`
        );
      } catch (err) {
        report.push({ viewport: vp.name, route, error: String(err) });
        console.log(`${vp.name} ${route} ERROR ${err}`);
      }
    }

    try {
      await page.goto(BASE + "/store", { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(400);
      await page.evaluate(() => {
        document.documentElement.setAttribute("dir", "rtl");
        document.documentElement.setAttribute("lang", "ar");
      });
      await page.waitForTimeout(200);
      const rtl = await page.evaluate(() => ({
        dir: document.documentElement.getAttribute("dir"),
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      const shot = `prod_${vp.name}_store_rtl.png`;
      await page.screenshot({ path: path.join(OUT, shot), fullPage: false });
      report.push({ viewport: vp.name, route: "/store?rtl=forced", shot, ...rtl });
      console.log(`${vp.name} RTL dir=${rtl.dir} overflowX=${rtl.overflowX}`);
    } catch (err) {
      report.push({ viewport: vp.name, route: "/store?rtl=forced", error: String(err) });
    }
    await context.close();
  }

  const native = await browser.newContext({
    viewport: { width: 1024, height: 768 },
    reducedMotion: "reduce",
  });
  const page = await native.newPage();
  await page.goto(BASE + "/store", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(900);
  const nativeDir = await page.evaluate(() => ({
    dir: document.documentElement.getAttribute("dir"),
    lang: document.documentElement.getAttribute("lang"),
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  await page.screenshot({ path: path.join(OUT, "prod_1024_store_native_dir.png"), fullPage: false });
  report.push({ viewport: "1024", route: "/store?native-dir", ...nativeDir });
  console.log(`native dir=${nativeDir.dir} lang=${nativeDir.lang} overflowX=${nativeDir.overflowX}`);

  const hrefs = await page.locator('a[href*="/store/"][href*="/product/"]').evaluateAll((nodes) =>
    [...new Set(nodes.map((n) => n.getAttribute("href")).filter(Boolean))]
  );
  const realPdp = hrefs.find((h) => h && !/e2e|umtuba-e2e/i.test(h));
  if (realPdp) {
    const row = await probePage(page, realPdp.startsWith("http") ? realPdp : BASE + realPdp);
    await page.screenshot({ path: path.join(OUT, "prod_1024_real_pdp.png"), fullPage: false });
    report.push({ viewport: "1024", route: realPdp, shot: "prod_1024_real_pdp.png", ...row });
    console.log(`REAL_PDP ${realPdp} status=${row.status} sandboxText=${row.sandboxVisibleText} h1=${JSON.stringify(row.h1)}`);
  } else {
    report.push({ viewport: "1024", route: "REAL_PDP", error: "no non-sandbox product href on /store" });
    console.log("REAL_PDP none");
  }

  const filterBtn = page.locator("button, a").filter({ hasText: /filter|category|categor/i }).first();
  await page.goto(BASE + "/store/search", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(700);
  const filterCount = await page.locator("fieldset, [data-filter], input[type='checkbox'], button").count();
  report.push({
    viewport: "1024",
    route: "/store/search#filter-inventory",
    filterControlCount: filterCount,
    e2eChipVisible: await page.getByText(/UMTUBA_E2E/i).count(),
    inStockVisible: await page.getByText(/in stock/i).count(),
  });

  fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));
  await browser.close();
  console.log("WROTE", path.join(OUT, "report.json"));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
