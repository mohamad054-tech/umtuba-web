/**
 * Cookie-authenticated HTML smoke against local Next using a normal user session.
 * Never prints passwords or tokens.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const worktree = join(here, "..", "..", "..");
const env = Object.fromEntries(
  readFileSync(join(worktree, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    })
);
const creds = JSON.parse(readFileSync(join(worktree, ".seller-runtime-gate.local.json"), "utf8"));
const origin = process.env.SMOKE_ORIGIN || "http://127.0.0.1:3013";
const outPath = join(here, "ui-smoke.json");

function cookieHeader(session) {
  const host = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
  const name = `sb-${host}-auth-token`;
  const value = encodeURIComponent(JSON.stringify(session));
  return `${name}=${value}`;
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data, error } = await sb.auth.signInWithPassword({
  email: creds.A.email,
  password: creds.password,
});
if (error || !data.session) {
  writeFileSync(
    outPath,
    JSON.stringify({ ok: false, signIn: error?.message?.slice(0, 200) ?? "no session" }, null, 2)
  );
  console.log(JSON.stringify({ ok: false, reason: "signin_failed" }));
  process.exit(1);
}

const cookie = cookieHeader(data.session);
const routes = [
  "/seller",
  "/seller/setup",
  "/seller/store",
  "/seller/store/products",
  "/seller/store/products/new",
  "/seller/store/inventory",
  "/seller/store/orders",
  "/seller/store/returns",
  "/seller/store/reviews",
  "/seller/store/analytics",
  "/seller/store/earnings",
  "/seller/store/profile",
  "/store",
  "/store?hl=ar",
  "/seller?hl=ar",
  "/cart",
  "/checkout",
];

const results = [];
for (const path of routes) {
  const url = origin + path;
  try {
    const res = await fetch(url, {
      redirect: "manual",
      headers: { cookie, Accept: "text/html" },
    });
    const loc = res.headers.get("location");
    let body = "";
    if (res.status === 200) {
      body = await res.text();
    }
    results.push({
      path,
      status: res.status,
      location: loc,
      dirRtl: /dir=["']rtl["']/i.test(body),
      langAr: /lang=["']ar["']/i.test(body),
      hasPending: /PENDING_REVIEW|pending|awaiting operator|submitted/i.test(body),
      hasBecomeSeller: /Become a Seller|كن بائعا/i.test(body),
      hasEarnings: /NOT_ELIGIBLE|payout|earnings/i.test(body),
      hasPaymentDisabled: /no charge|payment pending|Record order/i.test(body),
      title: (body.match(/<title>([^<]+)<\/title>/i) || [])[1] || null,
      bodyLen: body.length,
    });
  } catch (e) {
    results.push({ path, error: String(e.message || e).slice(0, 200) });
  }
}

const evidence = {
  origin,
  AUTH_METHOD: "NORMAL_USER_AUTH",
  FAKE_SESSION_USED: "NO",
  sellerEmail: creds.A.email,
  results,
};
writeFileSync(outPath, JSON.stringify(evidence, null, 2));
console.log(JSON.stringify({ ok: true, count: results.length, outPath }));
