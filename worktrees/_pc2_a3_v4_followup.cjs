const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "_pc2_a3_v4_qa");
const BASE = "https://umtuba.com";

(async () => {
  const browser = await chromium.launch({ headless: true, channel: "chrome" });
  const report = {};

  const en = await browser.newContext({
    viewport: { width: 1024, height: 768 },
    locale: "en-US",
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
    reducedMotion: "reduce",
  });
  const p = await en.newPage();
  await p.goto(BASE + "/store", { waitUntil: "domcontentloaded", timeout: 45000 });
  await p.waitForTimeout(800);
  report.enStore = {
    url: p.url(),
    dir: await p.evaluate(() => document.documentElement.getAttribute("dir")),
    lang: await p.evaluate(() => document.documentElement.getAttribute("lang")),
    overflowX: await p.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    ),
    cartBadge: await p.locator("a[href*='cart'], button").evaluateAll((nodes) =>
      nodes
        .map((n) => ({ href: n.getAttribute("href"), text: (n.textContent || "").trim().slice(0, 40) }))
        .filter((x) => /cart|سلة|2/.test(`${x.href || ""} ${x.text}`))
        .slice(0, 8)
    ),
    bodyPreview: (await p.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 320),
  };
  await p.screenshot({ path: path.join(OUT, "prod_1024_store_en_acceptlang.png"), fullPage: false });

  const langBtn = p.getByRole("button", { name: /english|en|اللغة|language/i }).first();
  if (await langBtn.count()) {
    await langBtn.click().catch(() => {});
    await p.waitForTimeout(400);
    const enOpt = p.getByRole("option", { name: /^English$/i }).or(p.getByText(/^English$/)).first();
    if (await enOpt.count()) {
      await enOpt.click().catch(() => {});
      await p.waitForTimeout(1200);
    }
  }
  report.afterLangClick = {
    url: p.url(),
    dir: await p.evaluate(() => document.documentElement.getAttribute("dir")),
    lang: await p.evaluate(() => document.documentElement.getAttribute("lang")),
    overflowX: await p.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    ),
    h1: ((await p.locator("h1").first().textContent()) || "").trim(),
  };
  await p.screenshot({ path: path.join(OUT, "prod_1024_store_after_lang.png"), fullPage: false });

  await p.goto(BASE + "/store/search?category=digital-products", {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await p.waitForTimeout(800);
  const body = await p.locator("body").innerText();
  report.digital = {
    url: p.url(),
    sandboxVisible: /UMTUBA_E2E/i.test(body),
    empty: /no matches|0 result/i.test(body),
    productHrefs: await p.locator('a[href*="/product/"]').evaluateAll((nodes) =>
      [...new Set(nodes.map((n) => n.getAttribute("href")).filter(Boolean))]
    ),
    preview: body.replace(/\s+/g, " ").slice(0, 280),
  };
  await p.screenshot({ path: path.join(OUT, "prod_1024_search_digital.png"), fullPage: false });

  await p.goto(BASE + "/store/search?category=umtuba-e2e-20260721", {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await p.waitForTimeout(800);
  const e2eBody = await p.locator("body").innerText();
  report.e2eCategoryFilter = {
    url: p.url(),
    sandboxVisible: /UMTUBA_E2E|e2e-simple-mug/i.test(e2eBody),
    productHrefs: await p.locator('a[href*="/product/"]').evaluateAll((nodes) =>
      [...new Set(nodes.map((n) => n.getAttribute("href")).filter(Boolean))]
    ),
    preview: e2eBody.replace(/\s+/g, " ").slice(0, 280),
  };
  await p.screenshot({ path: path.join(OUT, "prod_1024_search_e2e_category.png"), fullPage: false });

  await p.goto(BASE + "/store/cart", { waitUntil: "domcontentloaded", timeout: 45000 });
  await p.waitForTimeout(500);
  report.guestCart = { url: p.url(), title: await p.title() };

  fs.writeFileSync(path.join(OUT, "followup.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
