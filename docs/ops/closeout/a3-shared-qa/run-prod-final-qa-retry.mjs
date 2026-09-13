/**
 * Focused retry: login, start-exploring, then authed regressions.
 * Secrets never written to evidence.
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE = "https://umtuba.com";
const outDir =
  process.env.OUT_DIR ||
  "C:/Users/1/Desktop/umtuba/worktrees/DESKTOP-A3-SHARED-FINAL-QA/docs/ops/closeout/a3-shared-final-qa";
const shotsDir = join(outDir, "shots");
mkdirSync(shotsDir, { recursive: true });

function loadStoreQa() {
  const p = "C:/Users/1/Desktop/umtuba/umtuba-web/.env.store-qa.local";
  if (!existsSync(p)) return null;
  const raw = readFileSync(p, "utf8");
  return {
    email: (raw.match(/^STORE_QA_EMAIL=(.*)$/m) || [])[1]?.trim(),
    password: (raw.match(/^STORE_QA_PASSWORD=(.*)$/m) || [])[1]?.trim(),
    username: (raw.match(/^STORE_QA_USERNAME=(.*)$/m) || [])[1]?.trim(),
  };
}

async function collect(page) {
  return page.evaluate(() => {
    const body = (document.body?.innerText || "").replace(/\s+/g, " ").slice(0, 600);
    const alerts = [...document.querySelectorAll("[role='alert'], .text-red-200, [data-auth-alert]")]
      .map((el) => (el.textContent || "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, 8);
    return {
      url: location.href,
      title: document.title,
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      alerts,
      body,
    };
  });
}

async function run() {
  const qa = loadStoreQa();
  const report = {
    startedAt: new Date().toISOString(),
    authUsed: qa ? { email: qa.email, username: qa.username, passwordPrinted: false } : null,
    startExploring: {},
    login: {},
    authed: {},
    runtime: { pageErrors: [], consoleErrors: [] },
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "en-US",
    colorScheme: "dark",
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  page.on("pageerror", (err) => {
    report.runtime.pageErrors.push({ message: String(err.message || err).slice(0, 240), url: page.url() });
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      report.runtime.consoleErrors.push({ text: msg.text().slice(0, 240), url: page.url() });
    }
  });

  const navs = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) navs.push(frame.url());
  });

  // START EXPLORING — AR welcome, click exact CTA, record hops
  await context.addCookies([
    { name: "umtuba_locale", value: "ar", domain: "umtuba.com", path: "/", secure: true, sameSite: "Lax" },
  ]);
  await page.goto(BASE + "/welcome", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(1500);
  const cta = page.getByRole("button", { name: "ابدأ الاستكشاف", exact: true });
  const ctaCount = await cta.count();
  report.startExploring.before = await collect(page);
  report.startExploring.ctaCount = ctaCount;
  if (ctaCount) {
    await Promise.all([
      page.waitForURL((u) => !u.pathname.includes("/welcome"), { timeout: 15000 }).catch(() => null),
      cta.click(),
    ]);
    await page.waitForTimeout(2000);
  }
  report.startExploring.after = await collect(page);
  report.startExploring.navHops = navs.slice();
  await page.screenshot({ path: join(shotsDir, "retry-start-exploring.png") });

  // LOGIN — fresh EN context (no leftover AR)
  const loginNavs = [];
  const loginPage = await context.newPage();
  loginPage.on("framenavigated", (frame) => {
    if (frame === loginPage.mainFrame()) loginNavs.push(frame.url());
  });
  loginPage.on("pageerror", (err) => {
    report.runtime.pageErrors.push({ message: String(err.message || err).slice(0, 240), url: loginPage.url() });
  });
  loginPage.on("console", (msg) => {
    if (msg.type() === "error") {
      report.runtime.consoleErrors.push({ text: msg.text().slice(0, 240), url: loginPage.url() });
    }
  });

  const authCalls = [];
  loginPage.on("response", async (res) => {
    const url = res.url();
    if (/auth\/v1|token|signin|login/i.test(url) && /supabase/i.test(url)) {
      authCalls.push({ status: res.status(), url: url.split("?")[0].slice(0, 160) });
    }
  });

  await context.addCookies([
    { name: "umtuba_locale", value: "en", domain: "umtuba.com", path: "/", secure: true, sameSite: "Lax" },
  ]);
  await loginPage.goto(BASE + "/login", { waitUntil: "networkidle", timeout: 45000 });
  await loginPage.waitForTimeout(800);
  report.login.before = await collect(loginPage);

  if (!qa?.email || !qa?.password) {
    report.login.error = "missing store-qa env";
  } else {
    await loginPage.locator("#email").click();
    await loginPage.locator("#email").fill("");
    await loginPage.locator("#email").type(qa.email, { delay: 15 });
    await loginPage.locator("#password").click();
    await loginPage.locator("#password").fill("");
    await loginPage.locator("#password").type(qa.password, { delay: 15 });
    const filled = await loginPage.evaluate(() => ({
      emailLen: document.querySelector("#email")?.value?.length || 0,
      passwordLen: document.querySelector("#password")?.value?.length || 0,
      emailLooksLike: (document.querySelector("#email")?.value || "").includes("@"),
    }));
    report.login.filled = filled;
    await loginPage.screenshot({ path: join(shotsDir, "retry-login-filled.png") });
    const submit = loginPage.locator('form button[type="submit"]');
    report.login.submitCount = await submit.count();
    report.login.submitTextBefore = (await submit.first().innerText().catch(() => "")).trim();
    await loginPage.locator("#password").press("Enter");
    await loginPage.waitForTimeout(3000);
    report.login.submitTextAfterEnter = (await submit.first().innerText().catch(() => "")).trim();
    if (new URL(loginPage.url()).pathname.includes("/login")) {
      await submit.first().click();
      await loginPage.waitForTimeout(4000);
    }
    try {
      await loginPage.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 12000 });
    } catch {
      /* stay and capture */
    }
    report.login.submitTextFinal = (await submit.first().innerText().catch(() => "")).trim();
    report.login.after = await collect(loginPage);
    report.login.navHops = loginNavs;
    report.login.authCalls = authCalls;
    report.login.leftLogin = !new URL(loginPage.url()).pathname.includes("/login");
    report.login.pathname = new URL(loginPage.url()).pathname;
    report.login.landedProfile =
      new URL(loginPage.url()).pathname === "/profile" ||
      new URL(loginPage.url()).pathname.startsWith("/profile/");
    await loginPage.screenshot({ path: join(shotsDir, "retry-login-after.png") });
  }

  if (report.login.leftLogin) {
    const p = loginPage;
    const surfaces = {};
    for (const path of ["/profile", "/watch", "/search", "/create", "/messages", "/saved"]) {
      await p.setViewportSize({ width: 1440, height: 900 });
      await p.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 45000 });
      await p.waitForTimeout(1200);
      surfaces[path] = await collect(p);
      await p.screenshot({ path: join(shotsDir, `retry-authed-${path.replace(/\W/g, "")}-1440.png`) });
    }

    // Follow on watch @390
    await p.setViewportSize({ width: 390, height: 844 });
    await p.goto(BASE + "/watch", { waitUntil: "domcontentloaded", timeout: 45000 });
    await p.waitForTimeout(1500);
    const follow = p.getByRole("button", { name: /^Follow$/ }).first();
    const followInfo = { visible: await follow.count() };
    if (await follow.count()) {
      await follow.click();
      await p.waitForTimeout(2000);
      followInfo.after = await p.evaluate(() =>
        [...document.querySelectorAll("button")]
          .map((b) => (b.textContent || "").replace(/\s+/g, " ").trim())
          .filter((t) => /follow/i.test(t))
          .slice(0, 10)
      );
      followInfo.becameFollowing = followInfo.after.includes("Following");
      await p.screenshot({ path: join(shotsDir, "retry-follow.png") });
      if (followInfo.becameFollowing) {
        const un = p.getByRole("button", { name: /^Following$/ }).first();
        if (await un.count()) {
          await un.click();
          await p.waitForTimeout(1000);
          followInfo.restored = true;
        }
      }
    }
    surfaces.follow = followInfo;

    // Save
    const save = p.getByRole("button", { name: /^Save$/ }).first();
    const saveInfo = { visible: await save.count() };
    if (await save.count()) {
      await save.click();
      await p.waitForTimeout(2000);
      saveInfo.afterHint = await p.evaluate(() =>
        [...document.querySelectorAll("[role='status'], button")]
          .map((el) => (el.textContent || "").replace(/\s+/g, " ").trim())
          .filter((t) => /save|saved|bookmark/i.test(t))
          .slice(0, 12)
      );
      await p.screenshot({ path: join(shotsDir, "retry-save.png") });
      await p.goto(BASE + "/saved", { waitUntil: "domcontentloaded", timeout: 45000 });
      await p.waitForTimeout(1200);
      saveInfo.savedPage = await collect(p);
      await p.screenshot({ path: join(shotsDir, "retry-saved-page.png") });
    }
    surfaces.saved = saveInfo;

    // Delete menu — do not confirm
    const more = p.getByRole("button", { name: /More actions/i }).first();
    const del = { moreActions: await more.count() };
    if (await more.count()) {
      await more.click();
      await p.waitForTimeout(500);
      del.menu = await p.evaluate(() => {
        const menu = document.querySelector('[role="menu"]');
        if (!menu) return { open: false };
        const r = menu.getBoundingClientRect();
        return {
          open: true,
          text: (menu.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
          box: { x: r.x, y: r.y, w: r.width, h: r.height },
          clippedByViewport:
            r.top < 0 || r.left < 0 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1,
        };
      });
      await p.screenshot({ path: join(shotsDir, "retry-delete-menu.png") });
      await p.keyboard.press("Escape");
    } else {
      await p.goto(BASE + "/profile", { waitUntil: "domcontentloaded", timeout: 45000 });
      await p.waitForTimeout(1200);
      const more2 = p.getByRole("button", { name: /More actions/i }).first();
      del.profileMore = await more2.count();
      if (await more2.count()) {
        await more2.click();
        await p.waitForTimeout(500);
        del.menu = await p.evaluate(() => {
          const menu = document.querySelector('[role="menu"]');
          if (!menu) return { open: false };
          const r = menu.getBoundingClientRect();
          return {
            open: true,
            text: (menu.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
            box: { x: r.x, y: r.y, w: r.width, h: r.height },
            clippedByViewport:
              r.top < 0 || r.left < 0 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1,
          };
        });
        await p.screenshot({ path: join(shotsDir, "retry-delete-menu-profile.png") });
      }
    }
    surfaces.deleteMenu = del;
    report.authed = surfaces;
  }

  report.finishedAt = new Date().toISOString();
  const outPath = join(outDir, "prod-final-qa-retry.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log("WROTE", outPath);
  console.log(
    JSON.stringify({
      startUrl: report.startExploring.after?.url,
      startHops: report.startExploring.navHops,
      leftLogin: report.login.leftLogin,
      loginPath: report.login.pathname,
      loginAlerts: report.login.after?.alerts,
      authCalls: report.login.authCalls,
      follow: report.authed.follow || null,
    })
  );
  await browser.close();
}

run().catch((err) => {
  console.error(String(err && err.stack ? err.stack : err));
  process.exit(1);
});
