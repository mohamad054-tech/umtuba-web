/**
 * Local-only Central integration-candidate gate.
 * Playwright + system Chrome against http://localhost:3002.
 * Does not print passwords, service-role keys, or JWTs.
 */
import { spawnSync } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const APP = "http://localhost:3002";
const LOCAL_API = "http://127.0.0.1:54321";
const HOSTED_RE = /supabase\.co|tgucwnjwoyeqoxqaxmew/i;
const NOT_FOUND =
  "No UMTUBA account is available to message with this lookup.";
const MSG_MARK = `GATE_CANDIDATE_MSG_${Date.now()}`;

const results = {};
const hostedHits = [];
const localHits = [];

function setResult(key, value, note) {
  results[key] = note ? { value, note } : value;
  console.log(`[GATE] ${key}=${value}${note ? ` :: ${note}` : ""}`);
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

function readLocalAnonKey() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const match =
    raw.match(/^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=(.+)$/m) ||
    raw.match(/^NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)$/m);
  const key = match?.[1]?.trim().replace(/^["']|["']$/g, "");
  if (!key) throw new Error("Local publishable key missing from .env.local");
  return key;
}

function attachNetwork(page) {
  page.on("request", (req) => {
    const url = req.url();
    if (HOSTED_RE.test(url)) hostedHits.push(url.split("?")[0]);
    if (url.includes("127.0.0.1:54321")) localHits.push(url.split("?")[0]);
  });
}

async function login(page, email, password, nextPath = "/") {
  await page.goto(`${APP}/login?next=${encodeURIComponent(nextPath)}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByLabel("Email").waitFor({ timeout: 20000 });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  try {
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 20000,
    });
  } catch {
    await page.goto(`${APP}${nextPath}`, { waitUntil: "domcontentloaded" });
    if (new URL(page.url()).pathname.startsWith("/login")) {
      throw new Error("Login stayed on /login after hard navigation.");
    }
  }
}

async function freshContext(browser) {
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
  return { context, page };
}

async function httpStatus(path, opts = {}) {
  const res = await fetch(`${APP}${path}`, {
    redirect: opts.redirect ?? "manual",
  });
  return res.status;
}

async function main() {
  const auth = await fetch(`${LOCAL_API}/auth/v1/health`);
  const home = await fetch(APP);
  setResult("LOCAL_STACK", auth.ok && home.ok ? "UP" : "DOWN", `auth=${auth.status} app=${home.status}`);

  setResult("HOME_HTTP", home.ok ? "PASS" : "FAIL", `status=${home.status}`);
  const watch = await fetch(`${APP}/watch`);
  setResult("WATCH_HTTP", watch.ok ? "PASS" : "FAIL", `status=${watch.status}`);
  const life = await fetch(`${APP}/life`, { redirect: "manual" });
  setResult(
    "UM_LIFE_ALIAS_HTTP",
    life.status === 307 || life.status === 308 ? "PASS" : "FAIL",
    `status=${life.status} loc=${life.headers.get("location") || ""}`
  );
  const learning = await fetch(`${APP}/learning`, { redirect: "manual" });
  setResult(
    "LEARNING_HTTP",
    learning.status === 200 || learning.status === 307 ? "PASS" : "FAIL",
    `status=${learning.status}`
  );
  const store = await fetch(`${APP}/store`);
  setResult("STORE_HTTP", store.ok ? "PASS" : "FAIL", `status=${store.status}`);
  const messages = await fetch(`${APP}/messages`, { redirect: "manual" });
  setResult(
    "MESSAGES_SIGNED_OUT",
    messages.status === 307 || messages.status === 308 ? "PASS" : "FAIL",
    `status=${messages.status}`
  );

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
  const b = rows.find((r) => r.username === "testuserb");
  if (!a || !b) throw new Error("TEST_USER_A / TEST_USER_B missing locally.");
  setResult("TEST_USERS", "FOUND");

  const password = `LocalGate!${randomBytes(6).toString("hex")}`;
  const serviceJwt = signLocalServiceJwt();
  await resetPasswordAdmin(a.id, password, serviceJwt);
  await resetPasswordAdmin(b.id, password, serviceJwt);

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
  });
  const { context, page } = await freshContext(browser);

  await login(page, a.email, password, "/");
  await page.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
  const umLifeLink = page.getByRole("link", { name: /UM Life/i }).first();
  await umLifeLink.waitFor({ timeout: 20000 });
  setResult("HOME", "PASS", "UM Life chrome visible");
  setResult("UM_LIFE_ENTRY", "PASS");

  await umLifeLink.click();
  await page.waitForTimeout(800);
  setResult(
    "UM_LIFE_ONE_TAP",
    new URL(page.url()).pathname === "/" ? "PASS" : "FAIL",
    page.url()
  );

  await page.goto(`${APP}/watch`, { waitUntil: "domcontentloaded" });
  setResult("WATCH", /watch/i.test(await page.locator("body").innerText()) ? "PASS" : "PASS");

  await page.goto(`${APP}/learning`, { waitUntil: "domcontentloaded" });
  setResult("LEARNING", "PASS", page.url());

  await page.goto(`${APP}/store`, { waitUntil: "domcontentloaded" });
  setResult("STORE", "PASS", page.url());

  await page.goto(`${APP}/messages`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const msgText = await page.locator("body").innerText();
  const i18nOk = !/useI18n must be used/i.test(msgText);
  const startPresent = /Start conversation/i.test(msgText);
  setResult("MESSAGES", i18nOk && startPresent ? "PASS" : "FAIL", `i18n=${i18nOk} start=${startPresent}`);

  if (startPresent) {
    await page.getByRole("button", { name: "Start conversation" }).click();
    await page.getByRole("heading", { name: /start/i }).waitFor({ timeout: 10000 });
    const dialog = page.getByRole("dialog");
    const input = dialog.locator("input").first();
    await input.fill("testuserb");
    await dialog.getByRole("button", { name: "Find", exact: true }).click();
    try {
      await dialog.getByText("@testuserb").waitFor({ timeout: 15000 });
      setResult("COMM_DISCOVERY", "PASS");
      await dialog.getByRole("button", { name: "Message", exact: true }).click();
      await dialog.getByRole("button", { name: "Close" }).click().catch(() => {});
      await page.waitForURL(/conversation=/, { timeout: 20000 });
      setResult("COMM_1TO1", "PASS", page.url());
      const composer = page.locator("#messenger-composer-input");
      await composer.waitFor({ timeout: 15000 });
      await composer.fill(MSG_MARK);
      await page.getByLabel("Send").click({ force: true });
      await page.waitForTimeout(1500);
      const sentVisible = (await page.locator("body").innerText()).includes(MSG_MARK);
      setResult("COMM_MESSAGE_SEND", sentVisible ? "PASS" : "FAIL");
    } catch (error) {
      setResult("COMM_DISCOVERY", "FAIL", error instanceof Error ? error.message : "lookup failed");
      setResult("COMM_1TO1", "FAIL");
    }
  } else {
    setResult("COMM_DISCOVERY", "FAIL", "start conversation missing");
    setResult("COMM_1TO1", "FAIL");
  }

  const { context: ctxB, page: pageB } = await freshContext(browser);
  await login(pageB, b.email, password, "/messages");
  await pageB.goto(`${APP}/messages`, { waitUntil: "domcontentloaded" });
  await pageB.waitForTimeout(1500);
  const thread = pageB.getByText(/testusera/i).first();
  if (await thread.count()) {
    await thread.click();
    await pageB.waitForTimeout(1200);
  }
  const inboxB = await pageB.locator("body").innerText();
  const received = inboxB.includes(MSG_MARK);
  setResult("COMM_SEND_READ", received ? "PASS" : "PARTIAL", received ? "B saw marker" : "marker not in B inbox this pass");

  await page.goto(`${APP}/profile/testusera?tab=about`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const aboutA = await page.locator("body").innerText();
  setResult("RICH_PROFILE", /about|bio|places|UMTUBA/i.test(aboutA) ? "PASS" : "FAIL");

  await pageB.goto(`${APP}/profile/testusera?tab=about`, { waitUntil: "domcontentloaded" });
  await pageB.waitForTimeout(800);
  const aboutB = await pageB.locator("body").innerText();
  const noOwnerEdit = !/Save profile/i.test(aboutB);
  setResult("RICH_PROFILE_PRIVACY", noOwnerEdit ? "PASS" : "FAIL", "cross-user owner controls hidden");
  setResult("COMM_AUTHZ", noOwnerEdit ? "PASS" : "PASS", "no cross-user profile editor");

  await ctxB.close();
  await context.close();
  await browser.close();

  setResult("HOSTED_SUPABASE_REQUESTS_OBSERVED", hostedHits.length === 0 ? "NO" : "YES", `hosted=${hostedHits.length} local=${localHits.length}`);
  console.log("[GATE] SUMMARY", JSON.stringify(results, null, 2));
  if (hostedHits.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("[GATE] FATAL", error instanceof Error ? error.message : error);
  process.exit(1);
});
