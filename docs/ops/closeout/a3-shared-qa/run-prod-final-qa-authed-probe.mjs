/**
 * After reproducing login-stuck: probe whether the session exists
 * if we navigate away manually. Then try follow/save/create/messages.
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
  };
}

async function snap(page) {
  return page.evaluate(() => {
    const body = (document.body?.innerText || "").replace(/\s+/g, " ").slice(0, 700);
    const signInVisible = /Sign in|تسجيل الدخول/i.test(body);
    const followBtns = [...document.querySelectorAll("button")]
      .map((b) => (b.textContent || "").replace(/\s+/g, " ").trim())
      .filter((t) => /^(Follow|Following|Save|More|Upload|Create)$/i.test(t));
    return {
      url: location.href,
      title: document.title,
      signInVisible,
      followBtns: followBtns.slice(0, 12),
      body,
    };
  });
}

async function run() {
  const qa = loadStoreQa();
  const report = { startedAt: new Date().toISOString(), hops: [], surfaces: {}, follow: {}, saved: {}, create: {}, messages: {}, deleteMenu: {} };
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "en-US",
    colorScheme: "dark",
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) report.hops.push(frame.url());
  });

  await page.goto(BASE + "/login", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(800);
  await page.locator("#email").fill(qa.email);
  await page.locator("#password").fill(qa.password);
  await page.locator("form button[type=submit]").click();
  await page.waitForTimeout(5000);
  report.afterSubmit = await snap(page);
  await page.screenshot({ path: join(shotsDir, "probe-after-submit.png") });

  for (const path of ["/profile", "/watch", "/create", "/messages", "/saved", "/search"]) {
    await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1400);
    report.surfaces[path] = await snap(page);
    await page.screenshot({
      path: join(shotsDir, `probe-${path.replace(/\W/g, "")}.png`),
    });
  }

  // Follow / save on whatever /watch became
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + "/watch", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(1600);
  const follow = page.getByRole("button", { name: /^Follow$/ }).first();
  report.follow.visible = await follow.count();
  if (await follow.count()) {
    await follow.click();
    await page.waitForTimeout(2000);
    report.follow.afterUrl = page.url();
    report.follow.after = await snap(page);
    await page.screenshot({ path: join(shotsDir, "probe-follow-after.png") });
  }

  const save = page.getByRole("button", { name: /^Save$/ }).first();
  report.saved.visible = await save.count();
  if (await save.count()) {
    await save.click();
    await page.waitForTimeout(2000);
    report.saved.afterUrl = page.url();
    report.saved.after = await snap(page);
    await page.screenshot({ path: join(shotsDir, "probe-save-after.png") });
    await page.goto(BASE + "/saved", { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1200);
    report.saved.savedPage = await snap(page);
    await page.screenshot({ path: join(shotsDir, "probe-saved-page.png") });
  }

  const more = page.getByRole("button", { name: /More actions/i }).first();
  report.deleteMenu.more = await more.count();
  if (await more.count()) {
    await more.click();
    await page.waitForTimeout(400);
    report.deleteMenu.menu = await page.evaluate(() => {
      const menu = document.querySelector('[role="menu"]');
      if (!menu) return { open: false };
      const r = menu.getBoundingClientRect();
      return {
        open: true,
        text: (menu.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
        box: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        clippedByViewport:
          r.top < 0 || r.left < 0 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1,
      };
    });
    await page.screenshot({ path: join(shotsDir, "probe-delete-menu.png") });
  }

  report.finishedAt = new Date().toISOString();
  const outPath = join(outDir, "prod-final-qa-authed-probe.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log("WROTE", outPath);
  console.log(
    JSON.stringify({
      afterSubmit: report.afterSubmit?.url,
      profile: report.surfaces["/profile"]?.url,
      profileSignIn: report.surfaces["/profile"]?.signInVisible,
      watch: report.surfaces["/watch"]?.url,
      create: report.surfaces["/create"]?.url,
      messages: report.surfaces["/messages"]?.url,
      saved: report.surfaces["/saved"]?.url,
      followAfter: report.follow.afterUrl || null,
    })
  );
  await browser.close();
}

run().catch((err) => {
  console.error(String(err && err.stack ? err.stack : err));
  process.exit(1);
});
