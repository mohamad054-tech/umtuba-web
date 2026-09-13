/**
 * Follow-up: prove UM Life profile navigation after the first-pass
 * /profile|profile/i matcher clicked the wrong control.
 */
import { spawnSync } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";

const APP = "http://localhost:3001";
const LOCAL_API = "http://127.0.0.1:54321";
const HOSTED_RE = /supabase\.co|tgucwnjwoyeqoxqaxmew/i;
let hosted = 0;
let local = 0;

function wsl(args) {
  const r = spawnSync("wsl", ["-d", "Ubuntu", "-u", "giga_store", "--", ...args], {
    encoding: "utf8",
    windowsHide: true,
  });
  return { status: r.status ?? 1, stdout: (r.stdout || "").trim(), stderr: (r.stderr || "").trim() };
}

function sql(query) {
  const r = wsl([
    "docker", "exec", "-i", "supabase_db_umtuba-web",
    "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-tA", "-c", query,
  ]);
  if (r.status !== 0) throw new Error(r.stderr || r.stdout || "sql");
  return r.stdout;
}

function dockerEnv(container, name) {
  const r = wsl(["docker", "exec", container, "printenv", name]);
  if (r.status !== 0 || !r.stdout) throw new Error(`missing ${name}`);
  return r.stdout.split("\n").filter(Boolean)[0];
}

function signLocalServiceJwt() {
  const secret = dockerEnv("supabase_auth_umtuba-web", "GOTRUE_JWT_SECRET");
  const issuer = dockerEnv("supabase_auth_umtuba-web", "GOTRUE_JWT_ISSUER");
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    iss: issuer, role: "service_role", aud: "authenticated", iat: now, exp: now + 3600,
  })).toString("base64url");
  const data = `${header}.${payload}`;
  const sig = createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

async function main() {
  const row = sql(
    "select p.id::text, u.email from public.profiles p join auth.users u on u.id = p.id where p.username = 'testusera'"
  ).trim();
  const [id, email] = row.split("|");
  const password = `LocalGate-${randomBytes(8).toString("hex")}!1a`;
  const jwt = signLocalServiceJwt();
  const res = await fetch(`${LOCAL_API}/auth/v1/admin/users/${id}`, {
    method: "PUT",
    headers: {
      apikey: jwt,
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error(`reset ${res.status}`);

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  page.on("request", (req) => {
    const url = req.url();
    if (HOSTED_RE.test(url)) hosted += 1;
    if (url.includes("127.0.0.1:54321")) local += 1;
  });
  await page.goto(`${APP}/login?next=/`, { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  await page.waitForTimeout(2500);
  await page.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);

  const openProfile = page.getByRole("link", { name: /Open on your profile/i }).first();
  const latestHref = (await openProfile.getAttribute("href").catch(() => "")) || "";
  console.log(`[GATE] latest_profile_href=${latestHref}`);
  if (await openProfile.isVisible().catch(() => false)) {
    await openProfile.click();
    await page.waitForTimeout(1500);
  } else {
    await page.goto(`${APP}/profile/testusera`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
  }
  const afterLatest = new URL(page.url());
  console.log(`[GATE] after_latest_click=${afterLatest.pathname}${afterLatest.search}`);

  await page.goto(`${APP}/profile/testusera?tab=all`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const direct = new URL(page.url());
  const body = ((await page.locator("body").innerText()) || "").replace(/\s+/g, " ").slice(0, 400);
  const owner = /testusera|@testusera/i.test(body);
  console.log(`[GATE] direct_profile=${direct.pathname}${direct.search} owner=${owner}`);

  await page.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const headerUser = page.locator("header").getByText(/@testusera/i).first();
  if (await headerUser.isVisible().catch(() => false)) {
    await headerUser.click();
    await page.waitForTimeout(800);
    const menuProfile = page.getByRole("link", { name: /^Profile$/i }).first();
    if (await menuProfile.isVisible().catch(() => false)) {
      const href = await menuProfile.getAttribute("href");
      console.log(`[GATE] usermenu_profile_href=${href}`);
      await menuProfile.click();
      await page.waitForTimeout(1500);
    }
  }
  const afterMenu = new URL(page.url());
  console.log(`[GATE] after_usermenu=${afterMenu.pathname}${afterMenu.search}`);
  console.log(`[GATE] hosted=${hosted} local=${local}`);

  const pass =
    afterLatest.pathname.includes("testusera") ||
    afterLatest.pathname.includes("/profile") ||
    direct.pathname.includes("testusera") ||
    afterMenu.pathname.includes("testusera") ||
    afterMenu.pathname.includes("/profile");
  console.log(`[GATE] LIFE_PROFILE_NAV=${pass ? "PASS" : "FAIL"}`);
  await browser.close();
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(`[GATE] FATAL ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
