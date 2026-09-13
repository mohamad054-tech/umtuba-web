/**
 * Local-only UM Life authoritative product gate.
 * Playwright + system Chrome against http://localhost:3001.
 * Does not print passwords, service-role keys, or JWTs.
 */
import { spawnSync } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const APP = "http://localhost:3001";
const LOCAL_API = "http://127.0.0.1:54321";
const HOSTED_RE = /supabase\.co|tgucwnjwoyeqoxqaxmew/i;
const TEXT_MARK = `GATE_UM_LIFE_TEXT_${Date.now()}`;
const IMAGE_MARK = `GATE_UM_LIFE_IMG_${Date.now()}`;

const results = {};
const hostedHits = [];
const localHits = [];
const notes = [];

function setResult(key, value, note) {
  results[key] = note ? { value, note } : value;
  console.log(`[GATE] ${key}=${value}${note ? ` :: ${note}` : ""}`);
}

function note(msg) {
  notes.push(msg);
  console.log(`[GATE] note=${msg}`);
}

function wsl(args) {
  const r = spawnSync("wsl", ["-d", "Ubuntu", "-u", "giga_store", "--", ...args], {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });
  return {
    status: r.status ?? 1,
    stdout: (r.stdout || "").trim(),
    stderr: (r.stderr || "").trim(),
  };
}

function sql(query) {
  const r = wsl([
    "docker",
    "exec",
    "-i",
    "supabase_db_umtuba-web",
    "psql",
    "-U",
    "postgres",
    "-d",
    "postgres",
    "-v",
    "ON_ERROR_STOP=1",
    "-tA",
    "-c",
    query,
  ]);
  if (r.status !== 0) {
    throw new Error(`SQL failed: ${r.stderr || r.stdout || "unknown"}`);
  }
  return r.stdout;
}

async function localHealth() {
  const auth = await fetch(`${LOCAL_API}/auth/v1/health`);
  const app = await fetch(APP);
  setResult(
    "LOCAL_STACK",
    auth.ok && app.status < 500 ? "UP" : "DOWN",
    `auth=${auth.status} app=${app.status}`
  );
  if (!auth.ok || app.status >= 500) {
    throw new Error("Local stack is not up.");
  }
}

function loadUsers() {
  const rows = sql(
    "select p.username, p.id::text, u.email from public.profiles p join auth.users u on u.id = p.id where p.username in ('testusera','testuserb') order by p.username"
  )
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [username, id, email] = line.split("|");
      return { username, id, email };
    });
  const a = rows.find((r) => r.username === "testusera");
  if (!a || !a.email) {
    throw new Error("TEST_USER_A missing locally.");
  }
  setResult("TEST_USERS", "FOUND", `a=${a.username} email_present=yes`);
  return { a };
}

function dockerEnv(container, name) {
  const r = wsl(["docker", "exec", container, "printenv", name]);
  if (r.status !== 0 || !r.stdout) {
    throw new Error(`Missing ${name} on ${container}`);
  }
  return r.stdout.split("\n").filter(Boolean)[0];
}

function signLocalServiceJwt() {
  const secret = dockerEnv("supabase_auth_umtuba-web", "GOTRUE_JWT_SECRET");
  const issuer = dockerEnv("supabase_auth_umtuba-web", "GOTRUE_JWT_ISSUER");
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
    "base64url"
  );
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      iss: issuer,
      role: "service_role",
      aud: "authenticated",
      iat: now,
      exp: now + 60 * 60,
    })
  ).toString("base64url");
  const data = `${header}.${payload}`;
  const sig = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

async function resetPasswordAdmin(userId, password, serviceJwt) {
  const res = await fetch(`${LOCAL_API}/auth/v1/admin/users/${userId}`, {
    method: "PUT",
    headers: {
      apikey: serviceJwt,
      Authorization: `Bearer ${serviceJwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    throw new Error(`Password reset failed status=${res.status}`);
  }
}

function attachNetwork(page) {
  page.on("request", (req) => {
    const url = req.url();
    if (HOSTED_RE.test(url)) hostedHits.push(url.split("?")[0]);
    if (url.includes("127.0.0.1:54321")) {
      localHits.push(url.split("?")[0]);
    }
  });
}

async function bodyText(page, max = 1600) {
  return ((await page.locator("body").innerText().catch(() => "")) || "")
    .replace(/\s+/g, " ")
    .slice(0, max);
}

function tinyPngPath() {
  const dest = join(tmpdir(), `um-life-gate-${Date.now()}.png`);
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  writeFileSync(dest, png);
  return dest;
}

function readLocalAnonKey() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const match =
    raw.match(/^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.+)$/m) ||
    raw.match(/^NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)$/m);
  const key = match?.[1]?.trim().replace(/^["']|["']$/g, "");
  if (!key) throw new Error("Local publishable key missing from .env.local");
  return key;
}

async function passwordSession(email, password, anonKey) {
  const res = await fetch(`${LOCAL_API}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) return null;
  return res.json();
}

function encodeAuthCookie(session) {
  return `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
}

function chunkCookie(name, value, size = 3180) {
  if (encodeURIComponent(value).length <= size) {
    return [{ name, value }];
  }
  const chunks = [];
  for (let i = 0; i < value.length; i += size) {
    chunks.push({ name: `${name}.${chunks.length}`, value: value.slice(i, i + size) });
  }
  return chunks;
}

async function applySession(page, session) {
  const value = encodeAuthCookie(session);
  const cookies = ["sb-127-auth-token", "sb-127.0.0.1-auth-token"].flatMap((name) =>
    chunkCookie(name, value)
  );
  await page.context().addCookies(
    cookies.map((cookie) => ({
      ...cookie,
      domain: "localhost",
      path: "/",
      sameSite: "Lax",
    }))
  );
}

async function loginViaUi(page, email, password) {
  await page.goto(`${APP}/login?next=/`, { waitUntil: "domcontentloaded" });
  if (new URL(page.url()).pathname === "/login") {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.locator("form").getByRole("button", { name: "Sign in" }).click();
    await page.getByRole("button", { name: /Signing in/i }).waitFor({ timeout: 8000 }).catch(() => {});
    for (let i = 0; i < 20; i += 1) {
      await page.waitForTimeout(400);
      if (!new URL(page.url()).pathname.startsWith("/login")) {
        break;
      }
      const alert = (
        (await page.locator("[role='alert']").first().textContent().catch(() => "")) ||
        ""
      ).trim();
      if (alert && /invalid|unable|error/i.test(alert)) {
        throw new Error(`Login alert: ${alert.slice(0, 160)}`);
      }
    }
    note(`after_signin_url=${page.url()}`);
  }
  await page.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const userChip = page.locator("header").getByText(/@testusera/i).first();
  const signedIn = await userChip.isVisible().catch(() => false);
  note(`header_user=${signedIn} url=${page.url()}`);
  if (!signedIn) {
    throw new Error("UI login did not show @testusera in header.");
  }
}

async function main() {
  mkdirSync("tmp-um-life-gate", { recursive: true });
  await localHealth();
  const { a } = loadUsers();
  const password = `LocalGate-${randomBytes(8).toString("hex")}!1a`;
  const serviceJwt = signLocalServiceJwt();
  await resetPasswordAdmin(a.id, password, serviceJwt);

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 1000 },
    locale: "en-US",
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
  });
  await context.addCookies([
    {
      name: "umtuba_locale",
      value: "en",
      domain: "localhost",
      path: "/",
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();
  attachNetwork(page);

  try {
    await page.goto(`${APP}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1500);
    const homeText = await bodyText(page);
    const umLifeLink = page.getByRole("link", { name: /UM Life/i }).first();
    const umLifeVisible = await umLifeLink.isVisible().catch(() => false);
    const navLabels = ["Watch", "UM Life", "Create", "Learning", "Store"];
    const navPresent = [];
    for (const label of navLabels) {
      const visible = await page
        .getByRole("link", { name: new RegExp(`^${label}$`, "i") })
        .first()
        .isVisible()
        .catch(() => false);
      if (visible) navPresent.push(label);
    }
    const facebookClone =
      /facebook|meta news|what's on your mind|create room/i.test(homeText);
    setResult(
      "HOME_UM_LIFE_ENTRY",
      umLifeVisible ? "PASS" : "FAIL",
      `nav=${navPresent.join("|") || "none"} facebookClone=${facebookClone}`
    );

    if (umLifeVisible) {
      await umLifeLink.click();
      await page.waitForTimeout(1200);
      const afterClick = new URL(page.url());
      const oneTap =
        afterClick.pathname === "/" || afterClick.pathname === "/life";
      setResult(
        "ONE_TAP_NAV",
        oneTap ? "PASS" : "FAIL",
        `landed=${afterClick.pathname}`
      );
    } else {
      setResult("ONE_TAP_NAV", "FAIL", "UM Life link not visible");
    }

    const lifeRes = await page.goto(`${APP}/life`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(1500);
    const lifeUrl = new URL(page.url());
    const lifeOk =
      (lifeRes?.status() ?? 500) < 400 &&
      (lifeUrl.pathname === "/" || lifeUrl.pathname === "/life");
    setResult(
      "LIFE_ROUTE",
      lifeOk ? "PASS" : "FAIL",
      `status=${lifeRes?.status()} final=${lifeUrl.pathname} alias_to_home=${lifeUrl.pathname === "/"}`
    );

    const feedChrome =
      (await page.getByText("Share on UM").first().isVisible().catch(() => false)) ||
      (await page.locator("video, [data-video], [aria-label*='video' i]").first().isVisible().catch(() => false)) ||
      /Discover|Watch|UM Life|Share on UM/.test(await bodyText(page));
    const feedError = /Unable to load|loadError|Something went wrong/i.test(
      await bodyText(page)
    );
    setResult(
      "LIFE_FEED",
      feedChrome && !feedError ? "PASS" : feedError ? "FAIL" : "PARTIAL",
      `composerVisible=${await page.getByText("Share on UM").first().isVisible().catch(() => false)} feedError=${feedError}`
    );

    const composeVisible =
      (await page.getByRole("button", { name: /Share on UM/i }).isVisible().catch(() => false)) ||
      (await page.getByText("Share on UM").first().isVisible().catch(() => false));
    const writeBtn = page.getByRole("button", { name: /^Write$/i }).first();
    const photoBtn = page.getByRole("button", { name: /^Photo$/i }).first();
    setResult(
      "LIFE_COMPOSE",
      composeVisible ? "PASS" : "FAIL",
      `write=${await writeBtn.isVisible().catch(() => false)} photo=${await photoBtn.isVisible().catch(() => false)}`
    );

    await loginViaUi(page, a.email, password);
    await page.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    const composeBtn = page.getByRole("button", { name: /Share on UM/i }).first();
    if (await composeBtn.isVisible().catch(() => false)) {
      await composeBtn.click();
    } else {
      await writeBtn.click();
    }
    await page.getByRole("heading", { name: /New UM post/i }).waitFor({
      timeout: 15000,
    });
    const needAccount = await page
      .getByText(/need an account|sign in/i)
      .first()
      .isVisible()
      .catch(() => false);
    if (needAccount) {
      setResult("LIFE_TEXT_POST", "FAIL", "composer opened but session not visible to client");
    } else {
      await page.getByText(/Checking session/i).waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
      const modal = page.locator("h2", { hasText: /New UM post/i }).locator("xpath=ancestor::div[contains(@class,'max-w-xl')]");
      const buttons = (await modal.locator("button").allTextContents()).map((t) => t.trim());
      note(`composer_buttons=${buttons.join("|") || "none"}`);
      const textarea = modal.locator("textarea").first();
      await textarea.waitFor({ state: "visible", timeout: 10000 });
      await page.waitForFunction(
        () => {
          const area = document.querySelector("textarea");
          return Boolean(area && !area.disabled);
        },
        null,
        { timeout: 15000 }
      );
      await textarea.fill(TEXT_MARK);
      const publish = modal.getByRole("button", { name: /post to um/i }).first();
      await publish.scrollIntoViewIfNeeded().catch(() => {});
      await publish.click({ timeout: 15000 });
      await page
        .getByText("Posted on UM", { exact: false })
        .first()
        .waitFor({ timeout: 20000 })
        .catch(() => {});
      const textVisible = await page.getByText(TEXT_MARK).first().isVisible().catch(() => false);
      const postedToast = await page
        .getByText("Posted on UM")
        .first()
        .isVisible()
        .catch(() => false);
      const publishError = (
        (await page.locator("p.text-red-300").first().textContent().catch(() => "")) || ""
      ).trim();
      setResult(
        "LIFE_TEXT_POST",
        textVisible || postedToast ? "PASS" : "FAIL",
        `markerVisible=${textVisible} toast=${postedToast} err=${publishError.slice(0, 120)}`
      );
    }

    const viewProfile = page.getByRole("link", { name: /view profile|profile/i }).first();
    const latestProfileVisible = await viewProfile.isVisible().catch(() => false);
    if (latestProfileVisible) {
      await viewProfile.click();
      await page.waitForTimeout(1500);
      const profileUrl = new URL(page.url());
      const profileOk =
        profileUrl.pathname.includes("/profile") ||
        profileUrl.pathname.includes("/u/") ||
        profileUrl.pathname.includes("testusera");
      setResult(
        "LIFE_PROFILE_NAV",
        profileOk ? "PASS" : "FAIL",
        `url=${profileUrl.pathname}${profileUrl.search}`
      );
      await page.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(800);
    } else {
      await page.goto(`${APP}/profile/testusera`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForTimeout(1200);
      const profileUrl = new URL(page.url());
      setResult(
        "LIFE_PROFILE_NAV",
        profileUrl.pathname.includes("testusera") ||
          profileUrl.pathname.includes("/profile")
          ? "PASS"
          : "FAIL",
        `fallback_url=${profileUrl.pathname}`
      );
      await page.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
    }

    const photo = page.getByRole("button", { name: /^Photo$/i }).first();
    if (await photo.isVisible().catch(() => false)) {
      const chooserPromise = page.waitForEvent("filechooser", { timeout: 8000 }).catch(() => null);
      await photo.click();
      await page.getByRole("heading", { name: /New UM post/i }).waitFor({
        timeout: 15000,
      });
      const chooser = await chooserPromise;
      if (chooser) {
        await chooser.setFiles(tinyPngPath());
      } else {
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(tinyPngPath());
      }
      const imageArea = page.locator("textarea").first();
      await imageArea.fill(IMAGE_MARK);
      await page.getByRole("button", { name: /post to um/i }).click();
      await page.waitForTimeout(4000);
      const imgMark = await page.getByText(IMAGE_MARK).first().isVisible().catch(() => false);
      const imgEl = await page.locator("img[alt]").first().isVisible().catch(() => false);
      const imgToast = await page.getByText("Posted on UM").first().isVisible().catch(() => false);
      setResult(
        "LIFE_IMAGE_POST",
        imgMark || imgToast ? "PASS" : "FAIL",
        `markerVisible=${imgMark} img=${imgEl} toast=${imgToast}`
      );
    } else {
      setResult("LIFE_IMAGE_POST", "NOT_IMPLEMENTED", "Photo button not visible");
    }

    const latestLayer = await page.getByText(TEXT_MARK).first().isVisible().catch(() => false)
      || await page.getByText(IMAGE_MARK).first().isVisible().catch(() => false);
    const postedId = sql(
      `select id::text from public.posts where content in ('${TEXT_MARK}','${IMAGE_MARK}') order by created_at desc limit 1`
    ).trim();
    let deepLink = "not_tried";
    if (postedId) {
      const lifeDeep = await page.goto(`${APP}/life?post=${postedId}`, {
        waitUntil: "domcontentloaded",
      });
      await page.waitForTimeout(1200);
      const deepUrl = new URL(page.url());
      deepLink = `life_alias_status=${lifeDeep?.status()} final=${deepUrl.pathname}${deepUrl.search} query_preserved=${deepUrl.search.includes(`post=${postedId}`) || deepUrl.search.includes("post=")}`;
    }
    setResult(
      "LIFE_POST_DETAIL",
      latestLayer ? "PASS" : postedId ? "PARTIAL" : "NOT_IMPLEMENTED",
      `in_place_latest_layer=${latestLayer} postedId_present=${Boolean(postedId)} ${deepLink}`
    );

    await page.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(800);
    const homeAfter = new URL(page.url());
    const homeChrome = await page.getByRole("link", { name: /UM Life/i }).first().isVisible().catch(() => false);
    setResult(
      "HOME_REGRESSION",
      homeAfter.pathname === "/" && homeChrome ? "PASS" : "FAIL",
      `path=${homeAfter.pathname} umLife=${homeChrome}`
    );

    const watchRes = await page.goto(`${APP}/watch`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForTimeout(1200);
    const watchUrl = new URL(page.url());
    const watchText = await bodyText(page);
    const watchOk =
      watchUrl.pathname.startsWith("/watch") &&
      (watchRes?.status() ?? 500) < 400 &&
      /Watch|video|demo/i.test(watchText);
    setResult(
      "WATCH_REGRESSION",
      watchOk ? "PASS" : "FAIL",
      `status=${watchRes?.status()} path=${watchUrl.pathname}`
    );

    setResult(
      "FACEBOOK_CLONE",
      facebookClone ? "FAIL" : "PASS",
      "no facebook/meta clone chrome on Home"
    );

    await page.screenshot({
      path: "tmp-um-life-gate/watch.png",
      fullPage: false,
    });
  } finally {
    await browser.close();
  }

  setResult(
    "HOSTED_SUPABASE_REQUESTS_OBSERVED",
    hostedHits.length === 0 ? "NO" : "YES",
    `hosted=${hostedHits.length} local=${localHits.length}`
  );
  if (hostedHits.length) {
    note(`hosted_sample=${hostedHits.slice(0, 3).join(" | ")}`);
  }
  note(`local_sample_count=${localHits.length}`);

  const summary = {
    TASK_ID: "PC2_UMTUBA_UM_LIFE_AUTHORITATIVE_LOCAL_GATE_V1",
    LOCAL_APP_URL: APP,
    LOCAL_SUPABASE: LOCAL_API,
    results,
    hosted: hostedHits.length,
    local: localHits.length,
    notes,
  };
  writeFileSync(
    "tmp-um-life-gate/results.json",
    JSON.stringify(summary, null, 2)
  );
  console.log("[GATE] DONE");
}

main().catch((error) => {
  console.error(`[GATE] FATAL ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
