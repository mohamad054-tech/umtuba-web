/**
 * DESKTOP_A3_SHARED_RUNTIME_PERFORMANCE_ACCESSIBILITY_QA_V1
 * Production evidence collector. Writes JSON only. No secrets.
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://umtuba.com";
const VIEWPORTS = [
  { w: 360, h: 800 },
  { w: 390, h: 844 },
  { w: 430, h: 932 },
  { w: 768, h: 1024 },
  { w: 1024, h: 768 },
  { w: 1440, h: 900 },
];
const PAGES = [
  { id: "home", path: "/" },
  { id: "login", path: "/login" },
  { id: "signup", path: "/signup" },
  { id: "support", path: "/support" },
  { id: "account_deletion", path: "/account-deletion" },
  { id: "search", path: "/search" },
  { id: "welcome", path: "/welcome" },
];

const outDir = dirname(fileURLToPath(import.meta.url));
mkdirSync(outDir, { recursive: true });

function classifyConsole(type, text) {
  const t = String(text || "");
  if (/favicon|Download the React DevTools/i.test(t)) return "ignore";
  return type;
}

async function collectPageMetrics(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const overflowX = Math.max(doc.scrollWidth, body?.scrollWidth || 0) - window.innerWidth;
    const header = document.querySelector("header");
    const headerBox = header ? header.getBoundingClientRect() : null;
    const headerOverflow = header
      ? header.scrollWidth - header.clientWidth
      : 0;
    const skip = document.querySelector(
      'a[href="#main"], a[href="#main-content"], a[href="#content"], .skip-link, [data-skip-link]'
    );
    const mains = [...document.querySelectorAll("main")].map((el) => ({
      id: el.id || null,
      role: el.getAttribute("role"),
    }));
    const images = [...document.querySelectorAll("img")].map((img) => ({
      alt: img.getAttribute("alt"),
      missingAlt: img.getAttribute("alt") === null,
      emptyAlt: img.getAttribute("alt") === "",
      w: img.naturalWidth,
      h: img.naturalHeight,
      src: (img.currentSrc || img.src || "").slice(0, 160),
    }));
    const unlabeled = [...document.querySelectorAll("button, a, [role='button']")]
      .filter((el) => {
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") return false;
        const text = (el.textContent || "").replace(/\s+/g, " ").trim();
        const aria = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby");
        const title = el.getAttribute("title");
        const alt = el.querySelector("img")?.getAttribute("alt");
        return !text && !aria && !title && !alt;
      })
      .slice(0, 12)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || "").toString().slice(0, 80),
        href: el.getAttribute("href"),
      }));
    const inputs = [...document.querySelectorAll("input, select, textarea")].map((el) => {
      const id = el.id;
      const label = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
      const wrapped = el.closest("label");
      return {
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute("type"),
        id: id || null,
        name: el.getAttribute("name"),
        aria: el.getAttribute("aria-label"),
        labelled: Boolean(label || wrapped || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")),
      };
    });
    const navs = [...document.querySelectorAll("nav")].map((nav) => ({
      label: nav.getAttribute("aria-label"),
      visible: window.getComputedStyle(nav).display !== "none",
      itemCount: nav.querySelectorAll("a, button").length,
      box: (() => {
        const r = nav.getBoundingClientRect();
        return { x: r.x, y: r.y, w: r.width, h: r.height };
      })(),
    }));
    const headings = [...document.querySelectorAll("h1,h2,h3")].slice(0, 8).map((h) => ({
      tag: h.tagName.toLowerCase(),
      text: (h.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
    }));
    const videos = [...document.querySelectorAll("video")].map((v) => ({
      controls: v.hasAttribute("controls"),
      muted: v.muted,
      autoplay: v.autoplay,
    }));
    const focusEl = document.activeElement;
    const focusStyle = focusEl
      ? window.getComputedStyle(focusEl)
      : null;
    return {
      title: document.title,
      url: location.href,
      lang: doc.lang,
      dir: doc.dir || getComputedStyle(doc).direction,
      overflowX,
      headerOverflow,
      headerHeight: headerBox ? Math.round(headerBox.height) : null,
      skipLink: Boolean(skip),
      skipText: skip ? (skip.textContent || "").trim().slice(0, 80) : null,
      mains,
      images,
      unlabeled,
      inputs,
      navs,
      headings,
      videos,
      bodyMobileNav: body?.getAttribute("data-mobile-bottom-nav"),
      focus: focusEl
        ? {
            tag: focusEl.tagName.toLowerCase(),
            outline: focusStyle?.outline,
            outlineWidth: focusStyle?.outlineWidth,
            boxShadow: focusStyle?.boxShadow,
          }
        : null,
    };
  });
}

async function measurePerf(page) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const paints = performance.getEntriesByType("paint");
    const resources = performance.getEntriesByType("resource");
    const transfer = resources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    return {
      ttfb: nav ? Math.round(nav.responseStart) : null,
      dcl: nav ? Math.round(nav.domContentLoadedEventEnd) : null,
      load: nav ? Math.round(nav.loadEventEnd) : null,
      fp: Math.round(paints.find((p) => p.name === "first-paint")?.startTime || 0),
      fcp: Math.round(
        paints.find((p) => p.name === "first-contentful-paint")?.startTime || 0
      ),
      resourceCount: resources.length,
      transferKB: Math.round(transfer / 1024),
    };
  });
}

async function run() {
  const report = {
    startedAt: new Date().toISOString(),
    base: BASE,
    viewports: VIEWPORTS,
    pages: {},
    responsive: [],
    rtl: {},
    keyboard: {},
    performance: {},
    runtime: { console: [], pageErrors: [], failed: [] },
    browserMcp: "UNAVAILABLE_TAB_VANISH",
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "en-US",
    colorScheme: "dark",
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    const type = classifyConsole(msg.type(), msg.text());
    if (type === "ignore") return;
    if (type === "error" || type === "warning") {
      report.runtime.console.push({
        type,
        text: msg.text().slice(0, 300),
        url: page.url(),
      });
    }
  });
  page.on("pageerror", (err) => {
    report.runtime.pageErrors.push({
      message: String(err.message || err).slice(0, 400),
      url: page.url(),
    });
  });
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (/favicon|hot-update|ingest\./i.test(url)) return;
    report.runtime.failed.push({
      url: url.slice(0, 220),
      failure: req.failure()?.errorText || "failed",
    });
  });

  // Baseline pages at 1440
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const p of PAGES) {
    const started = Date.now();
    const resp = await page.goto(BASE + p.path, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.waitForTimeout(1200);
    const metrics = await collectPageMetrics(page);
    const perf = await measurePerf(page);
    report.pages[p.id] = {
      status: resp?.status() ?? null,
      elapsedMs: Date.now() - started,
      finalUrl: page.url(),
      ...metrics,
      perf,
    };
    report.performance[p.id] = perf;
  }

  // Responsive matrix: home + login + support
  const responsiveTargets = ["/", "/login", "/support"];
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    for (const path of responsiveTargets) {
      await page.goto(BASE + path, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
      await page.waitForTimeout(700);
      const metrics = await collectPageMetrics(page);
      report.responsive.push({
        path,
        w: vp.w,
        h: vp.h,
        overflowX: metrics.overflowX,
        headerOverflow: metrics.headerOverflow,
        headerHeight: metrics.headerHeight,
        lang: metrics.lang,
        dir: metrics.dir,
        skipLink: metrics.skipLink,
        navs: metrics.navs,
        unlabeledCount: metrics.unlabeled.length,
        missingAlt: metrics.images.filter((i) => i.missingAlt).length,
        bodyMobileNav: metrics.bodyMobileNav,
        title: metrics.title,
      });
    }
  }

  // Keyboard / focus on login @ 390
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(800);
  const tabStops = [];
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(80);
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const style = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        name: el.getAttribute("name"),
        aria: el.getAttribute("aria-label"),
        text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
        outline: style.outline,
        outlineWidth: style.outlineWidth,
        boxShadow: style.boxShadow,
        visible: r.width > 0 && r.height > 0,
      };
    });
    tabStops.push(info);
  }
  report.keyboard.login390 = tabStops;

  // Keyboard / focus on home @ 1440
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(800);
  const homeTabs = [];
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(80);
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      const style = getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        aria: el.getAttribute("aria-label"),
        text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
        outline: style.outline,
        outlineWidth: style.outlineWidth,
      };
    });
    homeTabs.push(info);
  }
  report.keyboard.home1440 = homeTabs;

  // RTL via locale cookie
  await context.addCookies([
    {
      name: "umtuba_locale",
      value: "ar",
      domain: "umtuba.com",
      path: "/",
      secure: true,
      sameSite: "Lax",
    },
  ]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(1000);
  report.rtl.home390 = await collectPageMetrics(page);
  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(1000);
  report.rtl.login390 = await collectPageMetrics(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(800);
  report.rtl.home1440 = await collectPageMetrics(page);

  // Error / loading: bogus route
  const notFound = await page.goto(BASE + "/this-route-does-not-exist-a3-qa", {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await page.waitForTimeout(600);
  report.pages.not_found = {
    status: notFound?.status() ?? null,
    ...(await collectPageMetrics(page)),
  };

  report.finishedAt = new Date().toISOString();
  const outPath = join(outDir, "prod-qa-evidence.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log("WROTE", outPath);
  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
