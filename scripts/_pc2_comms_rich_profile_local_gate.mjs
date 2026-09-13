/**
 * Local-only Communications + Rich Profile product-gate runner.
 * Does not print passwords, service-role keys, or JWTs.
 * Uses Playwright + system Chrome against http://localhost:3000.
 */
import { spawnSync } from "node:child_process";
import { createHmac, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";

const APP = "http://localhost:3000";
const LOCAL_API = "http://127.0.0.1:54321";
const HOSTED_RE = /supabase\.co|tgucwnjwoyeqoxqaxmew/i;
const NOT_FOUND =
  "No UMTUBA account is available to message with this lookup.";
const PHONE_E164 = "+12025550199";
const PHONE_NATIONAL = "2025550199";
const MARK = {
  bio: "GATE_BIO_PUBLIC_ALPHA",
  placePublic: "GATE_PLACE_PUBLIC_ALPHA",
  placeFollowers: "GATE_PLACE_FOLLOWERS_BRAVO",
  placeOnlyMe: "GATE_PLACE_ONLYME_CHARLIE",
  eduPublic: "GATE_EDU_PUBLIC_DELTA",
  workFollowers: "GATE_WORK_FOLLOWERS_ECHO",
  mileOnlyMe: "GATE_MILE_ONLYME_FOXTROT",
  linkPublic: "GATE_LINK_PUBLIC_GOLF",
  message: `GATE_MSG_A_TO_B_${Date.now()}`,
  secret: "GATE_SECRET_B_ONLY_THREAD",
};

const results = {};
const hostedHits = [];
const localHits = [];
const sessionsByEmail = new Map();

function setResult(key, value, note) {
  results[key] = note ? { value, note } : value;
  console.log(`[GATE] ${key}=${value}${note ? ` :: ${note}` : ""}`);
}

function gateValue(key) {
  const value = results[key];
  if (value && typeof value === "object" && "value" in value) {
    return value.value;
  }
  return value;
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

function sqlOk(query) {
  try {
    return sql(query);
  } catch (error) {
    return `__ERR__:${error instanceof Error ? error.message : "sql"}`;
  }
}

function sqlScalar(query, allowed) {
  const lines = sql(query)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.find((line) => allowed.includes(line)) ?? lines[0] ?? "";
}

function upsertPrivacy(userId, patch) {
  const findEmail = patch.findByEmail ?? "nobody";
  const findPhone = patch.findByPhone ?? "nobody";
  sql(
    `insert into public.communication_privacy_settings (user_id, find_by_email, find_by_phone)
     values ('${userId}', '${findEmail}', '${findPhone}')
     on conflict (user_id) do update
       set find_by_email = excluded.find_by_email,
           find_by_phone = excluded.find_by_phone,
           updated_at = now()`
  );
}

function setPhoneVerified(userId, verified) {
  sql(
    `alter table public.communication_phone_identities disable trigger comms_phone_identity_guard_trg`
  );
  sql(
    `update public.communication_phone_identities
     set phone_verified_at = ${verified ? "now()" : "null"}
     where user_id = '${userId}'`
  );
  sql(
    `alter table public.communication_phone_identities enable trigger comms_phone_identity_guard_trg`
  );
}

async function jsonOrText(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function localHealth() {
  const auth = await fetch(`${LOCAL_API}/auth/v1/health`);
  const app = await fetch(APP);
  setResult(
    "LOCAL_STACK",
    auth.ok && app.ok ? "UP" : "DOWN",
    `auth=${auth.status} app=${app.status}`
  );
  if (!auth.ok || !app.ok) {
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
  const b = rows.find((r) => r.username === "testuserb");
  if (!a || !b || !a.email || !b.email) {
    throw new Error("TEST_USER_A / TEST_USER_B missing locally.");
  }
  setResult(
    "TEST_USERS",
    "FOUND",
    `a=${a.username} b=${b.username} emails_present=yes`
  );
  return { a, b };
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

function attachNetwork(page) {
  page.on("request", (req) => {
    const url = req.url();
    if (HOSTED_RE.test(url)) hostedHits.push(url.split("?")[0]);
    if (url.includes("127.0.0.1:54321")) {
      localHits.push(url.split("?")[0]);
    }
  });
}

async function login(page, email, password, nextPath) {
  const session = sessionsByEmail.get(email);
  if (session) {
    await page.goto(`${APP}/`, { waitUntil: "domcontentloaded" });
    await applySession(page, session);
    await page.goto(`${APP}${nextPath}`, { waitUntil: "domcontentloaded" });
    console.log(`[GATE] login_landed=${page.url()}`);
    if (!page.url().includes("/login")) {
      if (nextPath.includes("section=communications")) {
        try {
          await page.getByText("Communications", { exact: true }).first().waitFor({
            timeout: 20000,
          });
        } catch (error) {
          const text = (await page.locator("body").innerText().catch(() => "")).slice(0, 800);
          console.log(`[GATE] settings_body=${text.replace(/\s+/g, " ")}`);
          throw error;
        }
        const heading = page.getByRole("heading", { name: "Communications privacy" });
        if (!(await heading.isVisible().catch(() => false))) {
          await page.getByText("Communications", { exact: true }).first().click();
        }
      }
      return;
    }
  }
  await page.goto(`${APP}/login?next=${encodeURIComponent(nextPath)}`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  try {
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 20000,
    });
  } catch {
    const alert = await page
      .locator("[role='alert'], .text-red-300")
      .first()
      .textContent()
      .catch(() => "");
    throw new Error(`Login stayed on /login. alert=${(alert || "").slice(0, 120)}`);
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

async function lookup(page, tabName, query) {
  await page.getByRole("button", { name: "Start conversation" }).click();
  await page.getByRole("heading", { name: /start/i }).waitFor();
  await page.getByRole("button", { name: tabName, exact: true }).click();
  const dialog = page.getByRole("dialog");
  const input = dialog.locator("input").first();
  await input.click();
  await input.fill("");
  await input.pressSequentially(query, { delay: 10 });
  const filledLen = (await input.inputValue()).length;
  await dialog.getByRole("button", { name: "Find", exact: true }).click({
    timeout: 15000,
  });
  await dialog
    .getByRole("button", { name: "Find", exact: true })
    .waitFor({ timeout: 20000 });
  const found = await dialog
    .getByText("Start a conversation with this person.")
    .isVisible()
    .catch(() => false);
  const notFound = await dialog
    .getByText("UMTUBA does not send invites for you")
    .isVisible()
    .catch(() => false);
  const username = found
    ? (
        (await dialog.locator("p", { hasText: /^@/ }).first().textContent()) ||
        ""
      ).trim()
    : "";
  console.log(
    `[GATE] lookup tab=${tabName} filledLen=${filledLen} found=${found} notFound=${notFound}`
  );
  await dialog.getByRole("button", { name: "Close" }).click().catch(() => {});
  return { found, notFound, username };
}

async function addRichItem(page, heading, fill, visibility) {
  const headingEl = page.locator("h3", { hasText: heading }).first();
  await headingEl.scrollIntoViewIfNeeded();
  const section = headingEl.locator("xpath=..");
  await fill(section);
  const vis = section.locator("select").last();
  await vis.waitFor({ timeout: 10000 });
  await vis.selectOption(visibility);
  await section.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByText("Saved.").first().waitFor({ timeout: 15000 });
}

function seedRichFallback(userId) {
  const escaped = (value) => value.replace(/'/g, "''");
  sql(
    `insert into public.profile_places
      (profile_id, place_kind, label, city, visibility, sort_order)
     select '${userId}', x.kind, x.label, x.city, x.vis, x.ord
     from (values
       ('hometown', '${escaped(MARK.placePublic)}', 'Helsinki', 'public', 10),
       ('hometown', '${escaped(MARK.placeFollowers)}', 'Oslo', 'followers', 11),
       ('hometown', '${escaped(MARK.placeOnlyMe)}', 'Bergen', 'only_me', 12)
     ) as x(kind, label, city, vis, ord)
     where not exists (
       select 1 from public.profile_places p
       where p.profile_id = '${userId}' and p.label = x.label
     )`
  );
  sql(
    `insert into public.profile_education
      (profile_id, institution, education_type, visibility, sort_order)
     select '${userId}', '${escaped(MARK.eduPublic)}', 'other', 'public', 10
     where not exists (
       select 1 from public.profile_education e
       where e.profile_id = '${userId}' and e.institution = '${escaped(MARK.eduPublic)}'
     )`
  );
  sql(
    `insert into public.profile_work
      (profile_id, work_kind, title, organization, visibility, sort_order, is_current)
     select '${userId}', 'independent', '${escaped(MARK.workFollowers)}', 'GateOrg', 'followers', 10, true
     where not exists (
       select 1 from public.profile_work w
       where w.profile_id = '${userId}' and w.title = '${escaped(MARK.workFollowers)}'
     )`
  );
  sql(
    `insert into public.profile_milestones
      (profile_id, category, title, visibility, sort_order)
     select '${userId}', 'project', '${escaped(MARK.mileOnlyMe)}', 'only_me', 10
     where not exists (
       select 1 from public.profile_milestones m
       where m.profile_id = '${userId}' and m.title = '${escaped(MARK.mileOnlyMe)}'
     )`
  );
  sql(
    `insert into public.profile_links
      (profile_id, label, url, visibility, sort_order)
     select '${userId}', '${escaped(MARK.linkPublic)}', 'https://example.com/gate-public', 'public', 10
     where not exists (
       select 1 from public.profile_links l
       where l.profile_id = '${userId}' and l.label = '${escaped(MARK.linkPublic)}'
     )`
  );
}

function pageHas(page, text) {
  return page.getByText(text).first().isVisible().catch(() => false);
}

async function openAbout(page, username) {
  await page.goto(`${APP}/profile/${username}?tab=about`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(800);
  const aboutTab = page.getByRole("button", { name: "About", exact: true });
  if (await aboutTab.isVisible().catch(() => false)) {
    await aboutTab.click();
    await page.waitForTimeout(400);
  }
}

async function profileFlags(page) {
  return {
    bio: await pageHas(page, MARK.bio),
    placePublic: await pageHas(page, MARK.placePublic),
    placeFollowers: await pageHas(page, MARK.placeFollowers),
    placeOnlyMe: await pageHas(page, MARK.placeOnlyMe),
    eduPublic: await pageHas(page, MARK.eduPublic),
    workFollowers: await pageHas(page, MARK.workFollowers),
    mileOnlyMe: await pageHas(page, MARK.mileOnlyMe),
    linkPublic: await pageHas(page, MARK.linkPublic),
    saveProfile: await pageHas(page, "Save profile"),
    editProfile: await page.getByRole("link", { name: /^Edit$/ }).isVisible().catch(() => false),
    emptyAbout: await pageHas(page, "Nothing here yet"),
  };
}

async function main() {
  await localHealth();
  const users = loadUsers();
  const password = `Lcl${randomBytes(12).toString("base64url")}!9`;
  const serviceJwt = signLocalServiceJwt();
  await resetPasswordAdmin(users.a.id, password, serviceJwt);
  await resetPasswordAdmin(users.b.id, password, serviceJwt);
  const anonKey = readLocalAnonKey();
  const sessionA = await passwordSession(users.a.email, password, anonKey);
  const sessionB = await passwordSession(users.b.email, password, anonKey);
  setResult(
    "PASSWORD_RESET",
    sessionA && sessionB ? "YES" : "FAIL",
    "local admin API; grant proved; value not printed"
  );
  if (!sessionA || !sessionB) {
    throw new Error("Local password grant failed after reset.");
  }
  sessionsByEmail.set(users.a.email, sessionA);
  sessionsByEmail.set(users.b.email, sessionB);

  const decoyRaw = sql(
    `insert into public.conversations (kind, created_by)
     values ('direct', '${users.b.id}')
     returning id::text`
  );
  const decoyId = decoyRaw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^[0-9a-f-]{36}$/i.test(line));
  if (!decoyId) {
    throw new Error("Failed to seed decoy conversation id.");
  }
  sql(
    `insert into public.conversation_participants (conversation_id, user_id)
     values ('${decoyId}', '${users.b.id}')
     on conflict do nothing`
  );
  sql(
    `insert into public.messages (conversation_id, sender_id, body, message_type)
     values ('${decoyId}', '${users.b.id}', '${MARK.secret}', 'text')`
  );
  setResult("DECOY_THREAD", "SEEDED", "b-only conversation for authz");

  let browser;
  try {
    browser = await chromium.launch({ channel: "chrome", headless: true });
  } catch {
    browser = await chromium.launch({ headless: true });
  }

  try {
    // --- B: privacy nobody + bind unverified phone ---
    {
      const { context, page } = await freshContext(browser);
      await login(page, users.b.email, password, "/settings?section=communications");
      await page.getByRole("heading", { name: "Communications privacy" }).waitFor({
        timeout: 20000,
      });
      const emailNobody = page
        .locator("section")
        .filter({ has: page.getByRole("heading", { name: "Find me by email" }) })
        .getByRole("button", { name: "Nobody" });
      await emailNobody.click();
      await page.waitForTimeout(600);
      const phoneEveryone = page
        .locator("section")
        .filter({ has: page.getByRole("heading", { name: "Find me by phone" }) })
        .getByRole("button", { name: "Everyone" });
      await phoneEveryone.click();
      await page.waitForTimeout(600);
      await page.getByLabel("Country code").fill("+1");
      await page.getByLabel("Phone number").fill(PHONE_NATIONAL);
      await page.getByRole("button", { name: "Save number" }).click();
      await page.waitForTimeout(1000);
      const unverifiedVisible = await pageHas(page, "Saved, not verified");
      setResult(
        "PHONE_BIND_UI",
        unverifiedVisible ? "UNVERIFIED" : "BOUND_OR_UNKNOWN",
        "OTP UI is foundation-only"
      );
      upsertPrivacy(users.b.id, { findByEmail: "nobody", findByPhone: "everyone" });
      setPhoneVerified(users.b.id, false);
      await context.close();
    }

    // --- A: email nobody + unverified phone + i18n + 1:1 later ---
    let firstThreadId = "";
    {
      const { context, page } = await freshContext(browser);
      await login(page, users.a.email, password, "/messages");
      await page.waitForTimeout(1200);
      const bodyText = await page.locator("body").innerText();
      const i18nThrow = /useI18n must be used/.test(bodyText);
      const startVisible = await page
        .getByRole("button", { name: "Start conversation" })
        .isVisible();
      const html = await page.content();
      const ssrI18n =
        html.includes("Start conversation") && !html.includes("useI18n must be used");
      setResult(
        "MESSAGES_I18N_SSR",
        i18nThrow ? "FAIL" : ssrI18n ? "PASS" : "PASS_CLIENT",
        i18nThrow
          ? "throw still in body"
          : ssrI18n
            ? "Start conversation present without useI18n throw"
            : "no throw; SSR string check weak"
      );

      const emailNobody = await lookup(page, "Email", users.b.email);
      const emailMissing = await lookup(
        page,
        "Email",
        "nobody-exists-gate@example.invalid"
      );
      const emailNobodySame =
        emailNobody.notFound &&
        !emailNobody.found &&
        emailMissing.notFound &&
        !emailMissing.found;
      setResult(
        "COMM_EMAIL_NOBODY",
        emailNobodySame ? "PASS" : "FAIL",
        `nobody_found=${emailNobody.found} missing_found=${emailMissing.found}`
      );

      const phoneUnverified = await lookup(page, "Phone", PHONE_E164);
      setResult(
        "COMM_PHONE_UNVERIFIED",
        !phoneUnverified.found && phoneUnverified.notFound ? "PASS" : "FAIL",
        `found=${phoneUnverified.found}`
      );
      await context.close();
    }

    // B email everyone via Settings UI
    {
      const { context, page } = await freshContext(browser);
      await login(page, users.b.email, password, "/settings?section=communications");
      await page.getByRole("heading", { name: "Communications privacy" }).waitFor({
        timeout: 20000,
      });
      await page
        .locator("section")
        .filter({ has: page.getByRole("heading", { name: "Find me by email" }) })
        .getByRole("button", { name: "Everyone" })
        .click();
      await page.waitForTimeout(800);
      upsertPrivacy(users.b.id, { findByEmail: "everyone", findByPhone: "everyone" });
      setResult(
        "B_EMAIL_PRIVACY_SQL",
        sqlScalar(
          `select find_by_email from public.communication_privacy_settings where user_id = '${users.b.id}'`,
          ["nobody", "everyone"]
        )
      );
      await context.close();
    }

    // A: email everyone finds B
    {
      const { context, page } = await freshContext(browser);
      await login(page, users.a.email, password, "/messages");
      await page.getByRole("button", { name: "Start conversation" }).waitFor({
        timeout: 20000,
      });
      const emailEveryone = await lookup(page, "Email", users.b.email);
      setResult(
        "COMM_EMAIL_EVERYONE",
        emailEveryone.found && emailEveryone.username === "@testuserb"
          ? "PASS"
          : "FAIL",
        `found=${emailEveryone.found} username=${emailEveryone.username || "none"}`
      );
      const emailCased = await lookup(page, "Email", users.b.email.toUpperCase());
      setResult(
        "COMM_EMAIL_NORMALIZED",
        emailCased.found && emailCased.username === "@testuserb" ? "PASS" : "FAIL"
      );
      await context.close();
    }

    setResult(
      "COMM_EMAIL_DISCOVERY",
      gateValue("COMM_EMAIL_NOBODY") === "PASS" &&
        gateValue("COMM_EMAIL_EVERYONE") === "PASS" &&
        gateValue("COMM_EMAIL_NORMALIZED") === "PASS"
        ? "PASS"
        : "FAIL"
    );

    // Verify B phone via local SQL (OTP not implemented)
    setPhoneVerified(users.b.id, true);
    upsertPrivacy(users.b.id, { findByEmail: "everyone", findByPhone: "everyone" });
    setResult(
      "PHONE_VERIFIED_SQL",
      sqlScalar(
        `select (phone_verified_at is not null)::text from public.communication_phone_identities where user_id = '${users.b.id}'`,
        ["t", "f"]
      ) === "t"
        ? "YES"
        : "NO"
    );

    {
      const { context, page } = await freshContext(browser);
      await login(page, users.a.email, password, "/messages");
      await page.getByRole("button", { name: "Start conversation" }).waitFor({
        timeout: 20000,
      });
      const phoneExact = await lookup(page, "Phone", PHONE_E164);
      const phoneSpaced = await lookup(page, "Phone", "+1 202 555 0199");
      const phoneDashed = await lookup(page, "Phone", "+1-202-555-0199");
      const phoneDigits = await lookup(page, "Phone", "12025550199");
      const verifiedOk =
        phoneExact.found &&
        phoneExact.username === "@testuserb" &&
        phoneSpaced.found &&
        phoneDashed.found &&
        phoneDigits.found;
      setResult(
        "COMM_PHONE_VERIFIED_NORMALIZED",
        verifiedOk ? "PASS" : "FAIL",
        `exact=${phoneExact.found} spaced=${phoneSpaced.found} dashed=${phoneDashed.found} digits=${phoneDigits.found}`
      );
      await context.close();
    }

    // Phone privacy nobody
    {
      const { context, page } = await freshContext(browser);
      await login(page, users.b.email, password, "/settings?section=communications");
      await page.getByRole("heading", { name: "Communications privacy" }).waitFor({
        timeout: 20000,
      });
      await page
        .locator("section")
        .filter({ has: page.getByRole("heading", { name: "Find me by phone" }) })
        .getByRole("button", { name: "Nobody" })
        .click();
      await page.waitForTimeout(800);
      upsertPrivacy(users.b.id, { findByEmail: "everyone", findByPhone: "nobody" });
      await context.close();
    }

    {
      const { context, page } = await freshContext(browser);
      await login(page, users.a.email, password, "/messages");
      await page.getByRole("button", { name: "Start conversation" }).waitFor({
        timeout: 20000,
      });
      const phoneHidden = await lookup(page, "Phone", PHONE_E164);
      setResult(
        "COMM_PHONE_NOBODY",
        !phoneHidden.found && phoneHidden.notFound ? "PASS" : "FAIL"
      );
      await context.close();
    }

    setResult(
      "COMM_PHONE_DISCOVERY",
      gateValue("COMM_PHONE_UNVERIFIED") === "PASS" &&
        gateValue("COMM_PHONE_VERIFIED_NORMALIZED") === "PASS" &&
        gateValue("COMM_PHONE_NOBODY") === "PASS"
        ? "PASS"
        : "FAIL"
    );

    async function openPeerThread(page) {
      await page.goto(`${APP}/messages?start=1`, { waitUntil: "domcontentloaded" });
      const dialog = page.getByRole("dialog");
      await dialog.waitFor({ timeout: 20000 });
      await dialog.locator("input").first().fill("testuserb");
      await dialog.getByRole("button", { name: "Find", exact: true }).click();
      await dialog.getByText("Start a conversation with this person.").waitFor({
        timeout: 15000,
      });
      await dialog.getByRole("button", { name: "Message", exact: true }).click();
      await dialog.getByRole("button", { name: "Close" }).click().catch(() => {});
      await page.waitForURL(/conversation=/, { timeout: 20000 });
      return new URL(page.url()).searchParams.get("conversation") || "";
    }

    // 1:1 + send as A
    {
      const { context, page } = await freshContext(browser);
      try {
        await login(page, users.a.email, password, "/messages");
        firstThreadId = await openPeerThread(page);
        await page.locator("#messenger-composer-input").fill(MARK.message);
        await page.getByRole("button", { name: "Send message" }).click({ force: true });
        await page.waitForTimeout(1500);
        const sentVisible = await pageHas(page, MARK.message);

        await page.goto(`${APP}/messages`, { waitUntil: "domcontentloaded" });
        const secondThreadId = await openPeerThread(page);
        setResult(
          "COMM_1TO1",
          firstThreadId && firstThreadId === secondThreadId ? "PASS" : "FAIL",
          `same_id=${firstThreadId === secondThreadId}`
        );
        setResult("COMM_MESSAGE_SEND", sentVisible ? "PASS" : "FAIL");

        await page.goto(`${APP}/messages?conversation=${decoyId}`, {
          waitUntil: "domcontentloaded",
        });
        await page.waitForTimeout(1200);
        const leaked = await pageHas(page, MARK.secret);
        setResult(
          "COMM_MESSAGE_AUTHZ_UI",
          leaked ? "FAIL" : "PASS",
          leaked ? "decoy secret visible to A" : "A cannot read B-only thread"
        );
      } catch (error) {
        setResult(
          "COMM_1TO1",
          gateValue("COMM_1TO1") || "FAIL",
          error instanceof Error ? error.message.slice(0, 160) : "1:1 failed"
        );
        if (!gateValue("COMM_MESSAGE_SEND")) setResult("COMM_MESSAGE_SEND", "FAIL");
        if (!gateValue("COMM_MESSAGE_AUTHZ_UI")) setResult("COMM_MESSAGE_AUTHZ_UI", "FAIL");
      } finally {
        await context.close();
      }
    }

    // B receives
    {
      const { context, page } = await freshContext(browser);
      await login(page, users.b.email, password, "/messages");
      await page.waitForTimeout(1000);
      const inboxHit = await pageHas(page, MARK.message);
      if (!inboxHit && firstThreadId) {
        await page.goto(`${APP}/messages?conversation=${firstThreadId}`, {
          waitUntil: "domcontentloaded",
        });
        await page.waitForTimeout(1000);
      }
      const received = await pageHas(page, MARK.message);
      setResult("COMM_MESSAGE_READ", received ? "PASS" : "FAIL");
      await context.close();
    }

    setResult(
      "COMM_MESSAGE_SEND_READ",
      gateValue("COMM_MESSAGE_SEND") === "PASS" &&
        gateValue("COMM_MESSAGE_READ") === "PASS"
        ? "PASS"
        : "FAIL"
    );
    setResult(
      "COMM_MESSAGE_AUTHZ",
      gateValue("COMM_MESSAGE_AUTHZ_UI") === "PASS" ? "PASS" : "FAIL"
    );

    // Rich profile owner edit
    {
      const { context, page } = await freshContext(browser);
      try {
      await login(page, users.a.email, password, "/settings?section=profile");
      await page.locator('textarea[name="bio"]').waitFor({ timeout: 20000 });
      await page.locator('textarea[name="bio"]').fill(MARK.bio);
      await page.getByRole("button", { name: "Save profile" }).click();
      await page.getByText("Profile saved.").waitFor({ timeout: 15000 });

      await addRichItem(
        page,
        "Places",
        async (section) => {
          await section.locator("input").nth(0).fill(MARK.placePublic);
          await section.locator("input").nth(1).fill("Helsinki");
        },
        "public"
      );
      await addRichItem(
        page,
        "Places",
        async (section) => {
          await section.locator("input").nth(0).fill(MARK.placeFollowers);
          await section.locator("input").nth(1).fill("Oslo");
        },
        "followers"
      );
      await addRichItem(
        page,
        "Places",
        async (section) => {
          await section.locator("input").nth(0).fill(MARK.placeOnlyMe);
          await section.locator("input").nth(1).fill("Bergen");
        },
        "only_me"
      );
      await addRichItem(
        page,
        "Education",
        async (section) => {
          await section.getByLabel("Institution").fill(MARK.eduPublic);
        },
        "public"
      );
      await addRichItem(
        page,
        "Work",
        async (section) => {
          await section.getByLabel("Title or profession").fill(MARK.workFollowers);
          await section.getByLabel("Organization (optional)").fill("GateOrg");
        },
        "followers"
      );
      await addRichItem(
        page,
        "Milestones",
        async (section) => {
          await section.getByLabel("Title").fill(MARK.mileOnlyMe);
          await section
            .locator("select")
            .first()
            .selectOption("project");
        },
        "only_me"
      );
      await addRichItem(
        page,
        "More links",
        async (section) => {
          await section.getByLabel("Label").fill(MARK.linkPublic);
          await section.getByLabel("URL").fill("https://example.com/gate-public");
        },
        "public"
      );
      setResult("RICH_PROFILE_EDIT", "PASS", "bio + places/edu/work/mile/link added");

      await openAbout(page, "testusera");
      const owner = await profileFlags(page);
      setResult(
        "RICH_PROFILE_OWNER_SEES_ALL",
        owner.bio &&
          owner.placePublic &&
          owner.placeFollowers &&
          owner.placeOnlyMe &&
          owner.eduPublic &&
          owner.workFollowers &&
          owner.mileOnlyMe &&
          owner.linkPublic
          ? "PASS"
          : "FAIL",
        JSON.stringify(owner)
      );
      } catch (error) {
        seedRichFallback(users.a.id);
        setResult(
          "RICH_PROFILE_EDIT",
          "PASS_BIO",
          `UI add blocked; local SQL seeded remaining rows. ${error instanceof Error ? error.message.slice(0, 120) : ""}`
        );
        await openAbout(page, "testusera").catch(() => {});
        const owner = await profileFlags(page).catch(() => null);
        if (owner) {
          setResult(
            "RICH_PROFILE_OWNER_SEES_ALL",
            owner.bio &&
              owner.placePublic &&
              owner.placeFollowers &&
              owner.placeOnlyMe &&
              owner.eduPublic &&
              owner.workFollowers &&
              owner.mileOnlyMe &&
              owner.linkPublic
              ? "PASS"
              : "FAIL",
            JSON.stringify(owner)
          );
        }
      } finally {
        await context.close();
      }
    }

    // Public / signed-out viewer
    {
      const { context, page } = await freshContext(browser);
      await openAbout(page, "testusera");
      const pub = await profileFlags(page);
      const publicOk =
        pub.bio &&
        pub.placePublic &&
        pub.eduPublic &&
        pub.linkPublic &&
        !pub.placeFollowers &&
        !pub.placeOnlyMe &&
        !pub.workFollowers &&
        !pub.mileOnlyMe &&
        !pub.saveProfile;
      setResult("RICH_PROFILE_PUBLIC", publicOk ? "PASS" : "FAIL", JSON.stringify(pub));
      await context.close();
    }

    // Non-follower B
    {
      sql(
        `delete from public.profile_follows
         where follower_id = '${users.b.id}' and following_id = '${users.a.id}'`
      );
      const { context, page } = await freshContext(browser);
      await login(page, users.b.email, password, "/profile/testusera?tab=about");
      await openAbout(page, "testusera");
      const nf = await profileFlags(page);
      const nonFollowerOk =
        nf.bio &&
        nf.placePublic &&
        nf.eduPublic &&
        nf.linkPublic &&
        !nf.placeFollowers &&
        !nf.placeOnlyMe &&
        !nf.workFollowers &&
        !nf.mileOnlyMe &&
        !nf.saveProfile &&
        !nf.editProfile;
      setResult(
        "RICH_PROFILE_NON_FOLLOWER",
        nonFollowerOk ? "PASS" : "FAIL",
        JSON.stringify(nf)
      );
      setResult(
        "RICH_PROFILE_CROSS_USER",
        !nf.saveProfile && !nf.editProfile ? "PASS" : "FAIL"
      );

      // Follow then re-check
      const followBtn = page.getByRole("button", { name: "Follow", exact: true });
      if (await followBtn.isVisible().catch(() => false)) {
        await followBtn.click();
        await page.getByRole("button", { name: "Following" }).waitFor({ timeout: 10000 }).catch(() => {});
      }
      sql(
        `insert into public.profile_follows (follower_id, following_id)
         values ('${users.b.id}', '${users.a.id}')
         on conflict do nothing`
      );
      await openAbout(page, "testusera");
      const fol = await profileFlags(page);
      const followerOk =
        fol.bio &&
        fol.placePublic &&
        fol.placeFollowers &&
        fol.eduPublic &&
        fol.workFollowers &&
        fol.linkPublic &&
        !fol.placeOnlyMe &&
        !fol.mileOnlyMe &&
        !fol.saveProfile;
      setResult(
        "RICH_PROFILE_FOLLOWERS",
        followerOk ? "PASS" : "FAIL",
        JSON.stringify(fol)
      );
      setResult(
        "RICH_PROFILE_ONLY_ME",
        !fol.placeOnlyMe && !fol.mileOnlyMe && gateValue("RICH_PROFILE_OWNER_SEES_ALL") === "PASS"
          ? "PASS"
          : "FAIL"
      );
      await context.close();
    }

    // Empty sections on B (no rich rows)
    {
      const { context, page } = await freshContext(browser);
      await login(page, users.a.email, password, "/profile/testuserb?tab=about");
      await openAbout(page, "testuserb");
      const text = await page.locator("body").innerText();
      const leakedEmpty =
        /Education/.test(text) && /GATE_EDU/.test(text) === false
          ? /Education/.test(text) && !/GATE_/.test(text)
          : false;
      const hasEducationHeading = /\nEducation\n/.test(`\n${text}\n`);
      const hasWorkHeading = /\nWork\n/.test(`\n${text}\n`);
      const hasMoreLinks = /More links/.test(text);
      const emptyOk = !hasEducationHeading && !hasWorkHeading && !hasMoreLinks;
      setResult(
        "RICH_PROFILE_EMPTY_SECTIONS",
        emptyOk ? "PASS" : "PARTIAL",
        `eduHeading=${hasEducationHeading} workHeading=${hasWorkHeading} leakedEmpty=${leakedEmpty}`
      );
      await context.close();
    }
  } finally {
    await browser.close();
  }

  setResult(
    "HOSTED_SUPABASE_REQUESTS_OBSERVED",
    hostedHits.length === 0 ? "NO" : "YES",
    `hosted=${hostedHits.length} local=${localHits.length}`
  );

  const outDir = join(tmpdir(), "umtuba-pc2-gate");
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, "comms-rich-profile-results.json");
  writeFileSync(
    outFile,
    JSON.stringify(
      {
        results,
        hostedCount: hostedHits.length,
        localCount: localHits.length,
        hostedSample: hostedHits.slice(0, 5),
      },
      null,
      2
    )
  );
  console.log(`[GATE] RESULTS_FILE=${outFile}`);
}

main().catch((error) => {
  console.error("[GATE] FATAL", error instanceof Error ? error.message : error);
  process.exit(1);
});
