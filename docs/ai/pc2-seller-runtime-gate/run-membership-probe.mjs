/**
 * Extra RLS probe: a brand-new normal user must not inherit store_members.
 * Does not read the previous local password file.
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
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

if (env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Refusing: service role must not be present");
}

const sbAnon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const password = `Pc2!${randomBytes(12).toString("base64url")}`;
const email = "pc2.store.seller.c.20260823@example.com";
const { data, error } = await sbAnon.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: "PC2 TEST Seller C",
      display_name: "PC2 TEST Seller C",
      username: "pc2sellerc0823",
    },
  },
});

const out = {
  email,
  hasSession: Boolean(data?.session),
  userIdPresent: Boolean(data?.user?.id),
  signupError: error ? { code: error.code ?? null, message: String(error.message).slice(0, 200) } : null,
};

if (data?.session?.access_token) {
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  });
  const members = await sb.from("store_members").select("store_id, role, status").limit(20);
  const stores = await sb.from("stores").select("id, slug").limit(20);
  const apps = await sb.from("seller_applications").select("id, status, proposed_store_slug").limit(20);
  out.storeMembers = { count: (members.data ?? []).length, error: members.error?.message?.slice(0, 160) ?? null };
  out.stores = { count: (stores.data ?? []).length, error: stores.error?.message?.slice(0, 160) ?? null };
  out.applications = {
    count: (apps.data ?? []).length,
    statuses: (apps.data ?? []).map((r) => r.status),
    slugs: (apps.data ?? []).map((r) => r.proposed_store_slug),
    error: apps.error?.message?.slice(0, 160) ?? null,
  };
}

writeFileSync(join(here, "membership-probe.json"), JSON.stringify(out, null, 2));
console.log(JSON.stringify({ ok: true, hasSession: out.hasSession, storeMembers: out.storeMembers?.count ?? null }));
