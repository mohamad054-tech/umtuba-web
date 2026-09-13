/**
 * Local SHA 8f39277 sandbox browser QA. Synthetic/demo only.
 * Token is read from SANDBOX_QA_TOKEN (never written to evidence).
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.SANDBOX_QA_BASE || "http://127.0.0.1:3456";
const TOKEN = process.env.SANDBOX_QA_TOKEN;
const OUT = process.env.SANDBOX_QA_OUT || join(process.cwd(), "docs/ai/pc2-learning-sandbox-qa");

if (!TOKEN || TOKEN.length < 16) {
  console.error("SANDBOX_QA_TOKEN missing or too short");
  process.exit(2);
}

mkdirSync(OUT, { recursive: true });
mkdirSync(join(OUT, "shots"), { recursive: true });

const evidence = {
  startedAt: new Date().toISOString(),
  base: BASE,
  shaExpected: "8f39277bbe902dd202023379bff2fc25161d3168",
  pages: [],
  clicks: [],
  overflows: [],
  loc: [],
  containment: {},
  errors: [],
};

function redact(url) {
  return String(url).replace(/sandbox_token=[^&#]+/gi, "sandbox_token=REDACTED");
}

async function shot(page, name) {
  const file = join(OUT, "shots", `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return `docs/ai/pc2-learning-sandbox-qa/shots/${name}.png`;
}

async function inspect(page, extra = {}) {
  return page.evaluate((extraIn) => {
    const main = document.querySelector("main") || document.body;
    const h1 = document.querySelector("h1")?.textContent?.trim() || "";
    const h2 = [...document.querySelectorAll("h2")].map((n) => n.textContent.trim());
    const h3 = [...document.querySelectorAll("h3")].map((n) => n.textContent.trim()).slice(0, 24);
    const buttons = [...document.querySelectorAll("button")].map((n) => ({
      text: n.textContent.trim(),
      disabled: n.disabled,
    }));
    const links = [...document.querySelectorAll("a")].map((n) => ({
      text: n.textContent.trim().slice(0, 80),
      href: n.getAttribute("href") || "",
    }));
    const search = document.querySelector("input[type=search], input[name=q], [role=search]");
    const robots = document.querySelector('meta[name="robots"]')?.getAttribute("content") || null;
    const overflowX = document.documentElement.scrollWidth - window.innerWidth;
    const bodyText = (main.innerText || "").replace(/\s+/g, " ").slice(0, 4000);
    return {
      url: location.href,
      title: document.title,
      lang: document.documentElement.lang,
      dir: document.documentElement.dir || main.getAttribute("dir") || "",
      h1,
      h2,
      h3,
      buttons,
      linkCount: links.length,
      hrefs: links.map((l) => l.href),
      hasSearch: Boolean(search),
      robots,
      overflowX,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      bodyText,
      ...extraIn,
    };
  }, extra);
}

async function recordPage(page, id, notes = "") {
  const info = await inspect(page);
  const shotPath = await shot(page, id);
  const row = {
    id,
    notes,
    url: redact(info.url),
    title: info.title,
    lang: info.lang,
    dir: info.dir,
    h1: info.h1,
    h2: info.h2,
    h3: info.h3,
    buttons: info.buttons,
    hasSearch: info.hasSearch,
    robots: info.robots,
    overflowX: info.overflowX,
    viewport: info.viewport,
    shot: shotPath,
    bodyPreview: info.bodyText.slice(0, 900),
    hrefSample: info.hrefs.slice(0, 30),
  };
  evidence.pages.push(row);
  evidence.overflows.push({ id, overflowX: info.overflowX, viewport: info.viewport });
  writeFileSync(join(OUT, "evidence.json"), JSON.stringify(evidence, null, 2), "utf8");
  return { info, row };
}

async function setLocale(context, locale) {
  const host = new URL(BASE).hostname;
  await context.addCookies([
    {
      name: "umtuba_locale",
      value: locale,
      domain: host,
      path: "/",
    },
  ]);
  await context.setExtraHTTPHeaders({
    "x-umtuba-hl": locale,
    "Accept-Language": locale === "ar" ? "ar,en;q=0.3" : `${locale},en;q=0.3`,
  });
}

async function goto(page, path) {
  let target = path;
  if (path.startsWith("/sandbox/business-preview") && !path.includes("/enter")) {
    const joiner = path.includes("?") ? "&" : "?";
    target = `${path}${joiner}sandbox_token=${encodeURIComponent(TOKEN)}`;
  }
  const res = await page.goto(BASE + target, { waitUntil: "domcontentloaded", timeout: 60000 });
  return { status: res?.status() ?? 0, url: redact(page.url()) };
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: "chrome" });
  } catch (err) {
    console.error("chrome channel failed, trying msedge", String(err).slice(0, 200));
    browser = await chromium.launch({ headless: true, channel: "msedge" });
  }
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
  });
  const page = await context.newPage();
  page.on("pageerror", (err) => evidence.errors.push({ type: "pageerror", message: String(err) }));

  // 1) Denied without token (fresh context, no cookie)
  const denied = await goto(page, "/sandbox/business-preview");
  await recordPage(page, "00_denied_no_token", `status=${denied.status}`);

  // 2) Enter with token (cookie set by server; token stripped from URL)
  const entered = await goto(page, `/sandbox/business-preview/enter?sandbox_token=${encodeURIComponent(TOKEN)}`);
  evidence.containment.enterRedirect = {
    status: entered.status,
    landed: redact(page.url()),
    tokenRemainsInUrl: page.url().includes("sandbox_token="),
  };
  await recordPage(page, "01_hub_en_1440", "after enter");

  // Public containment
  const home = await goto(page, "/");
  const homeInfo = await inspect(page);
  evidence.containment.home = {
    status: home.status,
    title: homeInfo.title,
    sandboxHrefs: homeInfo.hrefs.filter((h) => h.includes("/sandbox")),
    navHasSandbox: homeInfo.hrefs.some((h) => h.includes("/sandbox")),
  };
  await shot(page, "02_public_home_nav");

  const robotsRes = await page.goto(BASE + "/robots.txt", { waitUntil: "domcontentloaded" });
  const robotsText = await page.locator("body").innerText().catch(() => "");
  evidence.containment.robots = {
    status: robotsRes?.status() ?? 0,
    disallowsSandbox: /disallow:\s*\/sandbox/i.test(robotsText),
    preview: robotsText.slice(0, 800),
  };

  // Re-enter sandbox (cookie should still be valid)
  await goto(page, "/sandbox/business-preview");

  const learningSections = [
    ["learning", "10_learning_home"],
    ["learning/student", "11_student"],
    ["learning/instructor", "12_instructor"],
    ["learning/admin", "13_admin"],
    ["learning/partners", "14_partners"],
    ["commercial", "15_commercial"],
    ["rights", "16_rights"],
    ["store/checkout", "17_store_checkout"],
  ];

  for (const [section, id] of learningSections) {
    await goto(page, `/sandbox/business-preview/${section}`);
    await recordPage(page, `${id}_en_1440`);
  }

  // Click Learning tile from hub
  await goto(page, "/sandbox/business-preview");
  const learningNav = page.locator("nav a", { hasText: /^Learning$/i }).first();
  if (await learningNav.count()) {
    await learningNav.click();
    await page.waitForTimeout(400);
    evidence.clicks.push({
      control: "nav Learning",
      landed: redact(page.url()),
      ok: page.url().includes("/learning"),
    });
    await recordPage(page, "20_click_nav_learning");
  }

  // Open first Original via card click
  const originalCard = page.locator("a", { hasText: "UMTUBA Platform Essentials" }).first();
  if (await originalCard.count()) {
    await originalCard.click();
    await page.waitForTimeout(400);
    evidence.clicks.push({
      control: "card UMTUBA Platform Essentials",
      landed: redact(page.url()),
      ok: page.url().includes("umtuba-platform-essentials"),
    });
    await recordPage(page, "21_original_platform_essentials");
  }

  for (const [slug, id, title] of [
    ["digital-safety-privacy-fundamentals", "22_original_digital_safety", "Digital Safety"],
    ["ai-fundamentals-for-everyone", "23_original_ai_fundamentals", "AI Fundamentals"],
    ["demo-partner-structured-thinking", "24_partner_structured_thinking", "Partner structured thinking"],
    ["demo-external-cloud-primer", "25_external_cloud_primer", "External cloud primer"],
  ]) {
    await goto(page, `/sandbox/business-preview/learning/courses/${slug}`);
    await recordPage(page, id, title);
  }

  // Student / instructor dead-end clicks
  await goto(page, "/sandbox/business-preview/learning/student");
  const studentCards = page.locator("article, a").filter({ hasText: "UMTUBA Platform Essentials" });
  evidence.clicks.push({
    control: "student progress card",
    isLink: (await page.locator("a").filter({ hasText: "UMTUBA Platform Essentials" }).count()) > 0,
    count: await studentCards.count(),
  });

  await goto(page, "/sandbox/business-preview/learning/instructor");
  const instructorLinks = await page.locator("a").filter({ hasText: "Demo Instructor" }).count();
  evidence.clicks.push({
    control: "instructor cards",
    isLink: instructorLinks > 0,
    instructorLinkCount: instructorLinks,
  });

  // Mock payment buttons
  await goto(page, "/sandbox/business-preview/store/checkout");
  for (const label of ["Simulate success", "Simulate failure", "Simulate refund"]) {
    const btn = page.locator("button", { hasText: label });
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(200);
      const status = await page.locator("[role=status]").last().textContent().catch(() => "");
      evidence.clicks.push({
        control: label,
        result: (status || "").trim(),
        url: redact(page.url()),
      });
    }
  }
  await recordPage(page, "26_checkout_after_mock_clicks");

  // Locale pass
  for (const locale of ["ar", "en", "fr", "es", "de", "pt"]) {
    await setLocale(context, locale);
    await goto(page, "/sandbox/business-preview/learning");
    const rec = await recordPage(page, `30_learning_${locale}_1440`, `locale cookie=${locale}`);
    evidence.loc.push({
      locale,
      surface: "learning",
      lang: rec.info.lang,
      dir: rec.info.dir,
      h1: rec.info.h1,
      hasSearch: rec.info.hasSearch,
      overflowX: rec.info.overflowX,
    });
    await goto(page, "/sandbox/business-preview/learning/student");
    await recordPage(page, `31_student_${locale}_1440`);
    await goto(page, "/sandbox/business-preview/learning/partners");
    await recordPage(page, `32_partners_${locale}_1440`);
    await goto(page, "/sandbox/business-preview/learning/courses/umtuba-platform-essentials");
    await recordPage(page, `33_essentials_${locale}_1440`);
  }

  // Viewport sweep
  await setLocale(context, "en");
  const widths = [360, 390, 430, 768, 1024, 1440];
  const sweepPaths = [
    ["/sandbox/business-preview", "hub"],
    ["/sandbox/business-preview/learning", "learning"],
    ["/sandbox/business-preview/learning/student", "student"],
    ["/sandbox/business-preview/learning/instructor", "instructor"],
    ["/sandbox/business-preview/learning/admin", "admin"],
    ["/sandbox/business-preview/learning/partners", "partners"],
    ["/sandbox/business-preview/learning/courses/umtuba-platform-essentials", "essentials"],
    ["/sandbox/business-preview/store/checkout", "checkout"],
    ["/sandbox/business-preview/commercial", "commercial"],
    ["/sandbox/business-preview/rights", "rights"],
  ];
  for (const w of widths) {
    await page.setViewportSize({ width: w, height: w <= 430 ? 844 : 900 });
    for (const [path, name] of sweepPaths) {
      await goto(page, path);
      await recordPage(page, `40_${name}_en_${w}`);
    }
  }

  // AR at phone + desktop
  await setLocale(context, "ar");
  for (const w of [390, 1440]) {
    await page.setViewportSize({ width: w, height: 844 });
    for (const [path, name] of sweepPaths) {
      await goto(page, path);
      await recordPage(page, `50_${name}_ar_${w}`);
    }
  }

  // Missing executable slices: try routes that should 404 in sandbox
  await page.setViewportSize({ width: 1440, height: 900 });
  await setLocale(context, "en");
  for (const path of [
    "/sandbox/business-preview/learning/enroll",
    "/sandbox/business-preview/learning/lesson",
    "/sandbox/business-preview/learning/quiz",
    "/sandbox/business-preview/learning/ai-tutor",
    "/sandbox/business-preview/learning/certificate",
    "/learning",
  ]) {
    const r = await goto(page, path);
    const info = await inspect(page);
    evidence.pages.push({
      id: `60_probe_${path.replace(/[^\w]+/g, "_")}`,
      notes: "probe missing/existing product",
      url: redact(r.url),
      status: r.status,
      title: info.title,
      h1: info.h1,
      bodyPreview: info.bodyText.slice(0, 400),
    });
  }

  evidence.finishedAt = new Date().toISOString();
  writeFileSync(join(OUT, "evidence.json"), JSON.stringify(evidence, null, 2), "utf8");
  await browser.close();
  console.log(`OK pages=${evidence.pages.length} clicks=${evidence.clicks.length} out=${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
