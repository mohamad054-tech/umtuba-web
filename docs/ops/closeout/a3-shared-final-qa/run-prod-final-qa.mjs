/**
 * DESKTOP_A3_SHARED_RUNTIME_FINAL_QA_V1
 * Live production evidence collector against https://umtuba.com
 * Never writes secrets. Does not delete content. Does not deploy.
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://umtuba.com";
const EXPECTED_SHA = "b3fd0d0508eaa0bf0e4a2c5f0b0c08ce4eb64089";
const EXPECTED_RELEASE = "b3fd0d0-20260815122211";
const VIEWPORTS = [
  { w: 360, h: 800 },
  { w: 390, h: 844 },
  { w: 430, h: 932 },
  { w: 768, h: 1024 },
  { w: 1024, h: 768 },
  { w: 1440, h: 900 },
];

const outDir =
  process.env.OUT_DIR ||
  dirname(fileURLToPath(import.meta.url));
const shotsDir = join(outDir, "shots");
mkdirSync(shotsDir, { recursive: true });

function loadStoreQa() {
  const candidates = [
    join(process.env.USERPROFILE || "", "Desktop", "umtuba", "umtuba-web", ".env.store-qa.local"),
    "C:/Users/1/Desktop/umtuba/umtuba-web/.env.store-qa.local",
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, "utf8");
    const email = (raw.match(/^STORE_QA_EMAIL=(.*)$/m) || [])[1]?.trim();
    const password = (raw.match(/^STORE_QA_PASSWORD=(.*)$/m) || [])[1]?.trim();
    const username = (raw.match(/^STORE_QA_USERNAME=(.*)$/m) || [])[1]?.trim();
    if (email && password) return { email, password, username, source: "env.store-qa.local" };
  }
  return null;
}

function classifyConsole(type, text) {
  const t = String(text || "");
  if (/favicon|Download the React DevTools/i.test(t)) return "ignore";
  return type;
}

function redact(text) {
  return String(text || "").replace(/STORE_QA_PASSWORD=.*/g, "STORE_QA_PASSWORD=[REDACTED]");
}

async function collectPageMetrics(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const overflowX = Math.max(doc.scrollWidth, body?.scrollWidth || 0) - window.innerWidth;
    const header = document.querySelector("header");
    const headerOverflow = header ? header.scrollWidth - header.clientWidth : 0;
    const skip = document.querySelector(
      'a[href="#main"], a[href="#main-content"], a[href="#content"], .skip-link, [data-skip-link]'
    );
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
        labelled: Boolean(
          label || wrapped || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")
        ),
      };
    });
    const navs = [...document.querySelectorAll("nav")].map((nav) => ({
      label: nav.getAttribute("aria-label"),
      visible: window.getComputedStyle(nav).display !== "none",
      itemCount: nav.querySelectorAll("a, button").length,
      texts: [...nav.querySelectorAll("a, button")]
        .slice(0, 12)
        .map((el) => (el.textContent || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 40)),
    }));
    const headings = [...document.querySelectorAll("h1,h2,h3")].slice(0, 8).map((h) => ({
      tag: h.tagName.toLowerCase(),
      text: (h.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
    }));
    const images = [...document.querySelectorAll("img")].slice(0, 20).map((img) => ({
      alt: img.getAttribute("alt"),
      missingAlt: img.getAttribute("alt") === null,
      w: img.naturalWidth,
      h: img.naturalHeight,
    }));
    const bodyText = (body?.innerText || "").replace(/\s+/g, " ");
    const betaHits = [];
    for (const needle of ["النسخة التجريبية", "تجريبية", "Beta", "beta", "Alpha 0.2", "ألفا 0.2"]) {
      if (bodyText.includes(needle)) betaHits.push(needle);
    }
    const html = document.documentElement.outerHTML;
    const shaHits = [];
    for (const needle of ["b3fd0d0", "b3fd0d0508eaa0bf0e4a2c5f0b0c08ce4eb64089", "20260815122211"]) {
      if (html.includes(needle)) shaHits.push(needle);
    }
    return {
      title: document.title,
      url: location.href,
      lang: doc.lang,
      dir: doc.dir || getComputedStyle(doc).direction,
      overflowX,
      headerOverflow,
      headerHeight: header ? Math.round(header.getBoundingClientRect().height) : null,
      skipLink: Boolean(skip),
      unlabeled,
      inputs,
      navs,
      headings,
      images,
      videos: document.querySelectorAll("video").length,
      bodyMobileNav: body?.getAttribute("data-mobile-bottom-nav"),
      betaHits,
      shaHits,
      visibleTextSample: bodyText.slice(0, 400),
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
      fcp: Math.round(paints.find((p) => p.name === "first-contentful-paint")?.startTime || 0),
      resourceCount: resources.length,
      transferKB: Math.round(transfer / 1024),
    };
  });
}

async function safeGoto(page, path, timeout = 45000) {
  const resp = await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout });
  await page.waitForTimeout(1100);
  return resp;
}

async function clickByText(page, texts) {
  for (const text of texts) {
    const loc = page.getByRole("button", { name: text, exact: false }).first();
    if (await loc.count()) {
      await loc.click({ timeout: 8000 });
      return { clicked: text, role: "button" };
    }
    const link = page.getByRole("link", { name: text, exact: false }).first();
    if (await link.count()) {
      await link.click({ timeout: 8000 });
      return { clicked: text, role: "link" };
    }
    const any = page.getByText(text, { exact: false }).first();
    if (await any.count()) {
      await any.click({ timeout: 8000 });
      return { clicked: text, role: "text" };
    }
  }
  return null;
}

async function run() {
  const qa = loadStoreQa();
  const report = {
    taskId: "DESKTOP_A3_SHARED_RUNTIME_FINAL_QA_V1",
    startedAt: new Date().toISOString(),
    base: BASE,
    expectedSha: EXPECTED_SHA,
    expectedRelease: EXPECTED_RELEASE,
    browserMcp: "UNAVAILABLE_TAB_VANISH",
    authUsed: qa ? { account: qa.email, username: qa.username, passwordPrinted: false } : null,
    pages: {},
    responsive: [],
    rtl: {},
    keyboard: {},
    performance: {},
    regressions: {},
    surfaces: {},
    runtime: { console: [], pageErrors: [], failed: [] },
    productionProof: {},
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "en-US",
    colorScheme: "dark",
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    const type = classifyConsole(msg.type(), msg.text());
    if (type === "ignore") return;
    if (type === "error" || type === "warning") {
      report.runtime.console.push({
        type,
        text: redact(msg.text()).slice(0, 300),
        url: page.url(),
      });
    }
  });
  page.on("pageerror", (err) => {
    report.runtime.pageErrors.push({
      message: redact(String(err.message || err)).slice(0, 400),
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

  // Production proof
  const homeResp = await safeGoto(page, "/");
  const homeHeaders = {};
  try {
    for (const [k, v] of Object.entries(homeResp?.headers() || {})) {
      if (/x-|etag|server|cache|um-/i.test(k)) homeHeaders[k] = v;
    }
  } catch {}
  report.productionProof = {
    homeStatus: homeResp?.status() ?? null,
    headers: homeHeaders,
    shaHits: (await collectPageMetrics(page)).shaHits,
  };

  const guestPages = [
    { id: "home", path: "/" },
    { id: "login", path: "/login" },
    { id: "signup", path: "/signup" },
    { id: "search", path: "/search" },
    { id: "welcome", path: "/welcome" },
    { id: "watch", path: "/watch" },
    { id: "discover", path: "/discover" },
    { id: "support", path: "/support" },
    { id: "create_guest", path: "/create" },
    { id: "messages_guest", path: "/messages" },
    { id: "profile_guest", path: "/profile" },
  ];

  await page.setViewportSize({ width: 1440, height: 900 });
  for (const p of guestPages) {
    const started = Date.now();
    const resp = await safeGoto(page, p.path);
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
    await page.screenshot({ path: join(shotsDir, `guest-${p.id}-1440.png`), fullPage: false });
  }

  const notFound = await safeGoto(page, "/this-route-does-not-exist-a3-final-qa");
  report.pages.not_found = {
    status: notFound?.status() ?? null,
    ...(await collectPageMetrics(page)),
  };

  const responsiveTargets = ["/", "/login", "/search", "/watch", "/welcome"];
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.w, height: vp.h });
    for (const path of responsiveTargets) {
      await safeGoto(page, path);
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
        videos: metrics.videos,
        betaHits: metrics.betaHits,
        title: metrics.title,
        finalUrl: page.url(),
      });
    }
  }

  // Keyboard / focus
  await page.setViewportSize({ width: 390, height: 844 });
  await safeGoto(page, "/login");
  const loginTabs = [];
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(70);
    loginTabs.push(
      await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        const style = getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          name: el.getAttribute("name"),
          text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
          outlineWidth: style.outlineWidth,
          boxShadow: style.boxShadow,
        };
      })
    );
  }
  report.keyboard.login390 = loginTabs;

  await page.setViewportSize({ width: 1440, height: 900 });
  await safeGoto(page, "/");
  const homeTabs = [];
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(70);
    homeTabs.push(
      await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        const style = getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(),
          aria: el.getAttribute("aria-label"),
          text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40),
          outlineWidth: style.outlineWidth,
          boxShadow: style.boxShadow,
        };
      })
    );
  }
  report.keyboard.home1440 = homeTabs;

  // RTL
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
  await safeGoto(page, "/");
  report.rtl.home390 = await collectPageMetrics(page);
  await safeGoto(page, "/login");
  report.rtl.login390 = await collectPageMetrics(page);
  await safeGoto(page, "/welcome");
  report.rtl.welcome390 = await collectPageMetrics(page);
  await page.screenshot({ path: join(shotsDir, "rtl-welcome-390.png"), fullPage: false });

  // START EXPLORING (Arabic)
  const startExploring = { attempted: true, locale: "ar", from: page.url() };
  try {
    const clicked = await clickByText(page, ["ابدأ الاستكشاف", "Start Exploring"]);
    await page.waitForTimeout(1500);
    startExploring.clicked = clicked;
    startExploring.finalUrl = page.url();
    startExploring.landedDiscover = /\/discover(\?|$)/.test(new URL(page.url()).pathname);
    startExploring.metrics = await collectPageMetrics(page);
    await page.screenshot({ path: join(shotsDir, "start-exploring-after.png"), fullPage: false });
  } catch (err) {
    startExploring.error = String(err.message || err).slice(0, 240);
    startExploring.finalUrl = page.url();
  }
  report.regressions.startExploring = startExploring;

  // Beta wording scan across key Arabic surfaces
  const betaScan = {};
  for (const path of ["/", "/welcome", "/login", "/discover", "/watch"]) {
    await safeGoto(page, path);
    const m = await collectPageMetrics(page);
    betaScan[path] = { url: page.url(), lang: m.lang, dir: m.dir, betaHits: m.betaHits };
  }
  report.regressions.betaWording = betaScan;

  // Clear AR cookie for auth (login form is bilingual but keep EN for selectors)
  await context.addCookies([
    {
      name: "umtuba_locale",
      value: "en",
      domain: "umtuba.com",
      path: "/",
      secure: true,
      sameSite: "Lax",
    },
  ]);

  // LOGIN
  const loginRepro = { attempted: Boolean(qa), expectedDestination: "/profile" };
  if (qa) {
    await page.setViewportSize({ width: 390, height: 844 });
    await safeGoto(page, "/login");
    loginRepro.beforeUrl = page.url();
    try {
      await page.locator('input[type="email"], input[name="email"]').first().fill(qa.email);
      await page.locator('input[type="password"], input[name="password"]').first().fill(qa.password);
      await page.locator('button[type="submit"]').first().click();
      try {
        await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 25000 });
      } catch {
        await page.waitForTimeout(4000);
      }
      loginRepro.afterUrl = page.url();
      loginRepro.leftLogin = !new URL(page.url()).pathname.includes("/login");
      loginRepro.landedProfile =
        new URL(page.url()).pathname === "/profile" ||
        new URL(page.url()).pathname.startsWith("/profile/");
      loginRepro.pathname = new URL(page.url()).pathname;
      loginRepro.metrics = await collectPageMetrics(page);
      await page.screenshot({ path: join(shotsDir, "after-login-390.png"), fullPage: false });
    } catch (err) {
      loginRepro.error = String(err.message || err).slice(0, 240);
      loginRepro.afterUrl = page.url();
    }
  } else {
    loginRepro.error = "STORE_QA env missing";
  }
  report.regressions.loginRedirect = loginRepro;

  const authed = Boolean(loginRepro.leftLogin);
  const authedSurfaces = [
    { id: "profile", path: "/profile" },
    { id: "watch", path: "/watch" },
    { id: "search", path: "/search" },
    { id: "create", path: "/create" },
    { id: "create_video", path: "/create/video" },
    { id: "messages", path: "/messages" },
    { id: "saved", path: "/saved" },
    { id: "discover", path: "/discover" },
  ];

  if (authed) {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const p of authedSurfaces) {
      const started = Date.now();
      const resp = await safeGoto(page, p.path);
      const metrics = await collectPageMetrics(page);
      report.surfaces[p.id] = {
        status: resp?.status() ?? null,
        elapsedMs: Date.now() - started,
        finalUrl: page.url(),
        ...metrics,
        perf: await measurePerf(page),
      };
      await page.screenshot({ path: join(shotsDir, `authed-${p.id}-1440.png`), fullPage: false });
    }

    // Authed responsive: profile + watch + create + messages at 360 and 768
    for (const vp of [
      { w: 360, h: 800 },
      { w: 390, h: 844 },
      { w: 768, h: 1024 },
    ]) {
      await page.setViewportSize({ width: vp.w, height: vp.h });
      for (const path of ["/profile", "/watch", "/create", "/messages", "/search"]) {
        await safeGoto(page, path);
        const metrics = await collectPageMetrics(page);
        report.responsive.push({
          authed: true,
          path,
          w: vp.w,
          h: vp.h,
          overflowX: metrics.overflowX,
          headerOverflow: metrics.headerOverflow,
          unlabeledCount: metrics.unlabeled.length,
          videos: metrics.videos,
          title: metrics.title,
          finalUrl: page.url(),
          headings: metrics.headings,
        });
      }
    }

    // FOLLOW
    const followRepro = { attempted: true };
    await page.setViewportSize({ width: 390, height: 844 });
    await safeGoto(page, "/watch");
    followRepro.watchUrl = page.url();
    try {
      const followBtn = page.getByRole("button", { name: /^Follow$/ }).first();
      const followingBtn = page.getByRole("button", { name: /^Following$/ }).first();
      followRepro.followVisible = await followBtn.count();
      followRepro.followingVisibleBefore = await followingBtn.count();
      if (await followBtn.count()) {
        const before = await followBtn.innerText();
        await followBtn.click();
        await page.waitForTimeout(1800);
        const afterText = await page.evaluate(() => {
          const btns = [...document.querySelectorAll("button")].map((b) =>
            (b.textContent || "").replace(/\s+/g, " ").trim()
          );
          return {
            hasFollowing: btns.includes("Following"),
            hasFollow: btns.includes("Follow"),
            sample: btns.filter((t) => /follow/i.test(t)).slice(0, 8),
          };
        });
        followRepro.before = before;
        followRepro.after = afterText;
        followRepro.becameFollowing = afterText.hasFollowing;
        await page.screenshot({ path: join(shotsDir, "follow-after-390.png"), fullPage: false });
        if (afterText.hasFollowing) {
          const un = page.getByRole("button", { name: /^Following$/ }).first();
          if (await un.count()) {
            await un.click();
            await page.waitForTimeout(1200);
            followRepro.restored = true;
          }
        }
      } else {
        await safeGoto(page, "/discover");
        const dFollow = page.getByRole("button", { name: /^Follow$/ }).first();
        followRepro.discoverFollowVisible = await dFollow.count();
        if (await dFollow.count()) {
          await dFollow.click();
          await page.waitForTimeout(1800);
          const afterText = await page.evaluate(() => {
            const btns = [...document.querySelectorAll("button")].map((b) =>
              (b.textContent || "").replace(/\s+/g, " ").trim()
            );
            return {
              hasFollowing: btns.includes("Following"),
              sample: btns.filter((t) => /follow/i.test(t)).slice(0, 8),
            };
          });
          followRepro.after = afterText;
          followRepro.becameFollowing = afterText.hasFollowing;
          await page.screenshot({ path: join(shotsDir, "follow-discover-after.png"), fullPage: false });
        } else {
          followRepro.note = "No Follow button visible on /watch or /discover for this viewer";
        }
      }
    } catch (err) {
      followRepro.error = String(err.message || err).slice(0, 240);
    }
    report.regressions.follow = followRepro;

    // SAVED VIDEO
    const savedRepro = { attempted: true };
    await page.setViewportSize({ width: 390, height: 844 });
    await safeGoto(page, "/watch");
    try {
      const saveBtn = page.getByRole("button", { name: /^Save$/ }).first();
      savedRepro.saveVisible = await saveBtn.count();
      if (await saveBtn.count()) {
        const beforeLabel = await saveBtn.getAttribute("aria-label");
        const beforePressed = await saveBtn.getAttribute("aria-pressed");
        await saveBtn.click();
        await page.waitForTimeout(1800);
        savedRepro.afterClick = await page.evaluate(() => {
          const btn = [...document.querySelectorAll("button")].find((b) =>
            /^Save$/i.test((b.textContent || "").replace(/\s+/g, " ").trim())
          );
          return {
            text: btn ? (btn.textContent || "").replace(/\s+/g, " ").trim() : null,
            ariaPressed: btn?.getAttribute("aria-pressed"),
            className: btn ? String(btn.className).slice(0, 120) : null,
            hint: [...document.querySelectorAll("[role='status']")]
              .map((el) => (el.textContent || "").trim())
              .slice(0, 4),
          };
        });
        savedRepro.before = { ariaLabel: beforeLabel, ariaPressed: beforePressed };
        await page.screenshot({ path: join(shotsDir, "save-after-watch.png"), fullPage: false });
        await safeGoto(page, "/saved");
        savedRepro.savedPage = {
          url: page.url(),
          ...(await collectPageMetrics(page)),
        };
        const cards = await page.locator("article, a[href*='/watch'], a[href*='/discover']").count();
        savedRepro.savedPageCardishCount = cards;
        await page.screenshot({ path: join(shotsDir, "saved-page.png"), fullPage: false });
      } else {
        savedRepro.note = "No Save button on /watch";
        await safeGoto(page, "/discover");
        const dSave = page.getByRole("button", { name: /^Save$/ }).first();
        savedRepro.discoverSaveVisible = await dSave.count();
        if (await dSave.count()) {
          await dSave.click();
          await page.waitForTimeout(1800);
          await safeGoto(page, "/saved");
          savedRepro.savedPage = { url: page.url(), ...(await collectPageMetrics(page)) };
          await page.screenshot({ path: join(shotsDir, "saved-page-from-discover.png"), fullPage: false });
        }
      }
    } catch (err) {
      savedRepro.error = String(err.message || err).slice(0, 240);
    }
    report.regressions.saved = savedRepro;

    // DELETE MENU CLIPPING — open More if owner control exists; do not confirm delete
    const deleteRepro = { attempted: true, deleted: false };
    await page.setViewportSize({ width: 390, height: 844 });
    await safeGoto(page, "/watch");
    try {
      const more = page.getByRole("button", { name: /More actions|More/i }).first();
      deleteRepro.moreVisible = await more.count();
      if (await more.count()) {
        await more.click();
        await page.waitForTimeout(600);
        deleteRepro.menu = await page.evaluate(() => {
          const menu = document.querySelector('[role="menu"]');
          if (!menu) return { open: false };
          const r = menu.getBoundingClientRect();
          const clipped =
            r.top < 0 ||
            r.left < 0 ||
            r.right > window.innerWidth + 1 ||
            r.bottom > window.innerHeight + 1;
          let ancestorClip = null;
          let el = menu.parentElement;
          while (el && el !== document.body) {
            const style = getComputedStyle(el);
            if (style.overflow === "hidden" || style.overflowY === "hidden" || style.overflowX === "hidden") {
              const ar = el.getBoundingClientRect();
              const hidden =
                r.top < ar.top - 1 ||
                r.bottom > ar.bottom + 1 ||
                r.left < ar.left - 1 ||
                r.right > ar.right + 1;
              if (hidden) {
                ancestorClip = {
                  tag: el.tagName.toLowerCase(),
                  cls: String(el.className).slice(0, 120),
                  overflow: style.overflow,
                };
                break;
              }
            }
            el = el.parentElement;
          }
          return {
            open: true,
            text: (menu.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
            box: { x: r.x, y: r.y, w: r.width, h: r.height },
            viewport: { w: window.innerWidth, h: window.innerHeight },
            clippedByViewport: clipped,
            ancestorClip,
          };
        });
        await page.screenshot({ path: join(shotsDir, "delete-menu-watch-390.png"), fullPage: false });
        await page.keyboard.press("Escape");
      } else {
        await page.setViewportSize({ width: 1440, height: 900 });
        await safeGoto(page, "/profile");
        const more2 = page.getByRole("button", { name: /More actions|More/i }).first();
        deleteRepro.profileMoreVisible = await more2.count();
        if (await more2.count()) {
          await more2.click();
          await page.waitForTimeout(600);
          deleteRepro.menu = await page.evaluate(() => {
            const menu = document.querySelector('[role="menu"]');
            if (!menu) return { open: false };
            const r = menu.getBoundingClientRect();
            const clipped =
              r.top < 0 ||
              r.left < 0 ||
              r.right > window.innerWidth + 1 ||
              r.bottom > window.innerHeight + 1;
            return {
              open: true,
              text: (menu.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
              box: { x: r.x, y: r.y, w: r.width, h: r.height },
              clippedByViewport: clipped,
            };
          });
          await page.screenshot({ path: join(shotsDir, "delete-menu-profile-1440.png"), fullPage: false });
          await page.keyboard.press("Escape");
        } else {
          deleteRepro.note =
            "No owner More/delete control visible for this viewer on /watch or /profile — cannot confirm clipping";
        }
      }
    } catch (err) {
      deleteRepro.error = String(err.message || err).slice(0, 240);
    }
    report.regressions.deleteMenu = deleteRepro;

    // CREATE entry extra: chooser options
    await page.setViewportSize({ width: 390, height: 844 });
    await safeGoto(page, "/create");
    report.surfaces.create390 = await collectPageMetrics(page);
    await page.screenshot({ path: join(shotsDir, "create-390.png"), fullPage: false });
  }

  report.finishedAt = new Date().toISOString();
  const outPath = join(outDir, "prod-final-qa-evidence.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log("WROTE", outPath);
  console.log(
    JSON.stringify({
      loginLeft: report.regressions.loginRedirect?.leftLogin ?? null,
      loginPath: report.regressions.loginRedirect?.pathname ?? null,
      follow: report.regressions.follow?.becameFollowing ?? null,
      savedSaveVisible: report.regressions.saved?.saveVisible ?? null,
      startExplore: report.regressions.startExploring?.finalUrl ?? null,
      deleteMenu: report.regressions.deleteMenu?.menu || report.regressions.deleteMenu?.note || null,
      pageErrors: report.runtime.pageErrors.length,
    })
  );
  await browser.close();
}

run().catch((err) => {
  console.error(String(err && err.stack ? err.stack : err));
  process.exit(1);
});
