/**
 * Local Product Owner walk of /sandbox/business-preview.
 * Reads token from gitignored .sandbox-review-token.local. Does not print the token.
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..");
const shots = join(here, "screenshots");
const token = readFileSync(join(root, ".sandbox-review-token.local"), "utf8").trim();
const BASE = "http://127.0.0.1:3057";
const SANDBOX = "/sandbox/business-preview";

mkdirSync(shots, { recursive: true });

const sections = [
  ["00-denied-anonymous", `${SANDBOX}`, { skipAuth: true }],
  ["01-hub", `${SANDBOX}`],
  ["02-store-home", `${SANDBOX}/store`],
  ["03-pdp-earbuds", `${SANDBOX}/store/products/umtuba-demo-studio-earbuds`],
  ["04-pdp-overshirt", `${SANDBOX}/store/products/umtuba-demo-canvas-overshirt`],
  ["05-pdp-print-pack", `${SANDBOX}/store/products/umtuba-demo-print-pack`],
  ["06-cart", `${SANDBOX}/store/cart`],
  ["07-checkout", `${SANDBOX}/store/checkout`],
  ["08-orders", `${SANDBOX}/store/orders`],
  ["09-seller", `${SANDBOX}/store/seller`],
  ["10-partners", `${SANDBOX}/store/partners`],
  ["11-commercial", `${SANDBOX}/commercial`],
  ["12-rights", `${SANDBOX}/rights`],
  ["13-public-store", `/store`],
  ["14-public-nav-home", `/`],
];

const viewports = [
  { name: "360", width: 360, height: 800 },
  { name: "390", width: 390, height: 844 },
  { name: "430", width: 430, height: 932 },
  { name: "768", width: 768, height: 1024 },
  { name: "1024", width: 1024, height: 768 },
  { name: "1440", width: 1440, height: 900 },
];

function strip(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const notes = {
  sha: "8f39277bbe902dd202023379bff2fc25161d3168",
  openedVia: `${SANDBOX}/enter?sandbox_token=<local-gitignored-token>`,
  pages: [],
  checks: {},
};

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();

async function shot(name) {
  const file = join(shots, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

// Anonymous deny
await page.goto(`${BASE}${SANDBOX}`, { waitUntil: "networkidle" });
const deniedText = strip(await page.content());
notes.checks.anonymousDenied = /This sandbox is private|هذا الصندوق خاص/i.test(deniedText);
notes.checks.anonymousHasCatalog = /26 DEMO|UMTUBA Demo Studio Earbuds/i.test(deniedText);
await shot("00-denied-anonymous-1440");

// Enter (token never written into notes)
await page.goto(`${BASE}${SANDBOX}/enter?sandbox_token=${encodeURIComponent(token)}`, {
  waitUntil: "networkidle",
});
notes.checks.enterFinalPath = new URL(page.url()).pathname;
notes.checks.tokenStrippedFromUrl = !page.url().includes("sandbox_token");

for (const [name, path, opts] of sections) {
  if (opts?.skipAuth) continue;
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  const text = strip(await page.content());
  const rec = {
    name,
    path,
    finalPath: new URL(page.url()).pathname,
    title: await page.title(),
    dir: await page.locator("main, html").first().getAttribute("dir"),
    lang: await page.locator("main, html").first().getAttribute("lang"),
    hasCardInput: (await page.locator('input[type="password"], input[autocomplete*="cc-"], input[name*="card"]').count()) > 0,
    buttonLabels: await page.locator("button, a").evaluateAll((els) =>
      els.slice(0, 40).map((el) => (el.textContent || "").trim()).filter(Boolean)
    ),
    textSample: text.slice(0, 1800),
    flags: {
      DEMO: /DEMO/.test(text),
      SANDBOX: /SANDBOX|صندوق/.test(text),
      NOT_AN_UMTUBA_PARTNER: /NOT AN UMTUBA PARTNER|ليس شريكا/.test(text),
      PROSPECTIVE: /PROSPECTIVE|شريك محتمل/.test(text),
      REAL_PAYMENT_OFF: /REAL_PAYMENT=OFF|NO REAL PAYMENT|لا دفعة/.test(text),
      logoImg: /shein|temu|aliexpress|alibaba|trendyol|amazon|ebay|dhgate/i.test(
        (await page.locator("img").evaluateAll((imgs) => imgs.map((i) => i.src + " " + i.alt).join(" ")))
      ),
      productCountGuess: (text.match(/UMTUBA (Demo|Concept)/g) || []).length,
    },
  };
  await shot(`${name}-1440`);
  notes.pages.push(rec);
}

// Checkout simulate clicks
await page.goto(`${BASE}${SANDBOX}/store/checkout`, { waitUntil: "networkidle" });
const buttons = page.locator("button");
const count = await buttons.count();
const clickResults = [];
for (let i = 0; i < count; i++) {
  const label = (await buttons.nth(i).innerText()).trim();
  if (!/simulate|محاكاة/i.test(label)) continue;
  await buttons.nth(i).click();
  const status = await page.locator("[role='status']").last().innerText().catch(() => "");
  clickResults.push({ label, status });
}
notes.checks.checkoutSimulations = clickResults;
await shot("07b-checkout-after-simulations-1440");

// Arabic / RTL
await context.addCookies([
  { name: "umtuba_locale", value: "ar", url: BASE },
]);
await page.goto(`${BASE}${SANDBOX}/store`, { waitUntil: "networkidle" });
const arStore = strip(await page.content());
notes.checks.arabic = {
  dir: await page.locator("main").first().getAttribute("dir"),
  lang: await page.locator("main").first().getAttribute("lang"),
  hasArabicTitle: /المتجر|صندوق/.test(arStore),
  leftoverEnglishNav: /Overview|Checkout|Commerce partners|Commercial model/.test(arStore),
  englishProductNamesKept: /UMTUBA Demo/.test(arStore),
  textSample: arStore.slice(0, 900),
};
await shot("15-store-arabic-rtl-1440");

await page.goto(`${BASE}${SANDBOX}/store/checkout`, { waitUntil: "networkidle" });
notes.checks.arabicCheckout = {
  dir: await page.locator("main").first().getAttribute("dir"),
  sample: strip(await page.content()).slice(0, 700),
};
await shot("16-checkout-arabic-rtl-1440");

await page.goto(`${BASE}${SANDBOX}/store/partners`, { waitUntil: "networkidle" });
notes.checks.arabicPartners = {
  dir: await page.locator("main").first().getAttribute("dir"),
  sample: strip(await page.content()).slice(0, 700),
};
await shot("17-partners-arabic-rtl-1440");

// Spot-check other locales
for (const loc of ["fr", "es", "de", "pt"]) {
  await context.addCookies([{ name: "umtuba_locale", value: loc, url: BASE }]);
  await page.goto(`${BASE}${SANDBOX}`, { waitUntil: "networkidle" });
  const t = strip(await page.content());
  notes.checks[`locale_${loc}`] = {
    dir: await page.locator("main").first().getAttribute("dir"),
    titleHit: t.slice(0, 400),
  };
  await shot(`18-hub-${loc}-1440`);
}

// Reset EN and capture store at each viewport
await context.addCookies([{ name: "umtuba_locale", value: "en", url: BASE }]);
const overflow = [];
for (const vp of viewports) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  for (const path of [`${SANDBOX}/store`, `${SANDBOX}/store/checkout`, `${SANDBOX}/store/seller`]) {
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
    const metrics = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyOverflow: getComputedStyle(document.body).overflowX,
    }));
    const clipped = metrics.scrollWidth > metrics.clientWidth + 2;
    overflow.push({ vp: vp.name, path, ...metrics, clipped });
    const slug = path.replace("/sandbox/business-preview/", "").replaceAll("/", "-") || "hub";
    await page.screenshot({
      path: join(shots, `vp-${vp.name}-${slug}.png`),
      fullPage: false,
    });
  }
}
notes.checks.overflow = overflow;

// Containment: public store + home should not advertise sandbox
await page.setViewportSize({ width: 1440, height: 900 });
await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
const homeText = strip(await page.content());
notes.checks.publicHomeHasSandboxLink = /sandbox\/business-preview/.test(await page.content());
notes.checks.publicHomeSample = homeText.slice(0, 400);
await shot("19-public-home-1440");

await page.goto(`${BASE}/store`, { waitUntil: "networkidle" });
notes.checks.publicStoreHasSandboxImport = /lib\/sandbox|SANDBOX_STORE_LISTINGS/.test(await page.content());
notes.checks.publicStoreSample = strip(await page.content()).slice(0, 500);
await shot("20-public-store-1440");

writeFileSync(join(here, "walk-evidence.json"), JSON.stringify(notes, null, 2), "utf8");
await browser.close();
console.log("WALK_OK pages=" + notes.pages.length + " shots_dir=docs/ops/store-sandbox-product-review-v1/screenshots");
