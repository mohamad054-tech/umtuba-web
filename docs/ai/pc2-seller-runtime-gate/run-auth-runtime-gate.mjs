/**
 * Authenticated seller runtime gate — normal user auth only.
 * Never prints passwords, JWTs, or env secret values.
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const worktree = join(here, "..", "..", "..");
const envPath = join(worktree, ".env.local");
const outPath = join(here, "evidence.json");
const credPath = join(worktree, ".seller-runtime-gate.local.json");

function loadEnv(path) {
  const env = {};
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

function redactErr(error) {
  if (!error) return null;
  return {
    code: error.code ?? null,
    message: String(error.message ?? "error").slice(0, 240),
  };
}

function client(env, accessToken) {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : {},
  });
}

function draftPayload(suffix) {
  return {
    user_id: null,
    status: "draft",
    proposed_store_name: `PC2 TEST Seller Center ${suffix} 20260823`,
    proposed_store_slug: `pc2-test-seller-${suffix}-20260823`,
    proposed_tagline: "PC2 TEST identifiable seller",
    proposed_description:
      "PC2 TEST seller application for Seller Center commerce readiness. Do not treat as a real merchant.",
    country_code: "US",
    city: "Test City",
    default_currency: "USD",
    store_template: "general",
    public_contact_email: `pc2.store.seller.${suffix}.20260823@example.com`,
    public_contact_phone: "+15555550123",
    public_contact_url: "https://example.com/pc2-test-seller",
    return_policy:
      "PC2 TEST return policy placeholder. No real merchandise ships from this store.",
    shipping_policy:
      "PC2 TEST shipping policy placeholder. No real shipments will be fulfilled.",
    privacy_policy: "PC2 TEST privacy policy placeholder for seller setup completeness.",
    wizard_step: 6,
  };
}

async function signup(env, email, password, username, fullName) {
  const sb = client(env);
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, display_name: fullName, username },
    },
  });
  return {
    email,
    username,
    error: redactErr(error),
    userId: data?.user?.id ?? null,
    hasSession: Boolean(data?.session?.access_token),
    emailConfirmPending: Boolean(data?.user && !data?.session),
    accessToken: data?.session?.access_token ?? null,
  };
}

async function signin(env, email, password) {
  const sb = client(env);
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  return {
    error: redactErr(error),
    userId: data?.user?.id ?? null,
    hasSession: Boolean(data?.session?.access_token),
    accessToken: data?.session?.access_token ?? null,
  };
}

const evidence = {
  TASK_ID: "PC2_UMTUBA_STORE_SELLER_CENTER_COMMERCE_READINESS_V1",
  AUTH_METHOD: "NORMAL_USER_AUTH",
  FAKE_SESSION_USED: "NO",
  SERVICE_ROLE_USED_CLIENT_SIDE: "NO",
  RLS_DISABLED: "NO",
  startedAt: new Date().toISOString(),
};

try {
  const env = loadEnv(envPath);
  evidence.envPresent = {
    NEXT_PUBLIC_SUPABASE_URL: Boolean(env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: Boolean(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
    SUPABASE_SERVICE_ROLE_KEY: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
  };
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("Public Supabase env missing");
  }
  if (env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Refusing to run: service role key must not be present");
  }

  const password = `Pc2!${randomBytes(12).toString("base64url")}`;
  const users = {
    A: {
      email: "pc2.store.seller.a.20260823@example.com",
      username: "pc2sellera0823",
      fullName: "PC2 TEST Seller A",
    },
    B: {
      email: "pc2.store.seller.b.20260823@example.com",
      username: "pc2sellerb0823",
      fullName: "PC2 TEST Seller B",
    },
  };

  const signed = {};
  for (const [key, u] of Object.entries(users)) {
    signed[key] = await signup(env, u.email, password, u.username, u.fullName);
    if (!signed[key].hasSession && signed[key].error) {
      const retry = await signin(env, u.email, password);
      if (retry.hasSession) {
        signed[key] = { ...signed[key], ...retry, reusedExisting: true };
      }
    }
  }

  evidence.signup = {
    A: {
      email: users.A.email,
      username: users.A.username,
      userIdPresent: Boolean(signed.A.userId),
      hasSession: signed.A.hasSession,
      emailConfirmPending: signed.A.emailConfirmPending,
      error: signed.A.error,
    },
    B: {
      email: users.B.email,
      username: users.B.username,
      userIdPresent: Boolean(signed.B.userId),
      hasSession: signed.B.hasSession,
      emailConfirmPending: signed.B.emailConfirmPending,
      error: signed.B.error,
    },
  };

  const creds = {
    createdAt: new Date().toISOString(),
    note: "Gitignored local runtime credentials. Do not commit or paste into reports.",
    A: { email: users.A.email, username: users.A.username, userId: signed.A.userId },
    B: { email: users.B.email, username: users.B.username, userId: signed.B.userId },
    password,
  };
  writeFileSync(credPath, JSON.stringify(creds, null, 2));

  if (!signed.A.hasSession || !signed.B.hasSession) {
    evidence.STATUS = "BLOCKED_EMAIL_CONFIRM_OR_SIGNUP";
    evidence.SELLER_APPLICATION_PERSISTED = "NO";
    evidence.SELLER_APPROVAL_RUNTIME = "NOT_REACHED";
    writeFileSync(outPath, JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify({ ok: false, evidencePath: outPath, status: evidence.STATUS }));
    process.exit(0);
  }

  const sbA = client(env, signed.A.accessToken);
  const sbB = client(env, signed.B.accessToken);

  const payloadA = draftPayload("a");
  payloadA.user_id = signed.A.userId;
  payloadA.public_contact_email = users.A.email;
  const insertA = await sbA.from("seller_applications").insert(payloadA).select("id,status,proposed_store_slug,user_id").single();
  evidence.applicationInsertA = {
    ok: !insertA.error && Boolean(insertA.data?.id),
    status: insertA.data?.status ?? null,
    slug: insertA.data?.proposed_store_slug ?? null,
    error: redactErr(insertA.error),
  };

  const reloadA = await sbA
    .from("seller_applications")
    .select("id,status,proposed_store_name,wizard_step")
    .eq("user_id", signed.A.userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  evidence.applicationReloadA = {
    ok: !reloadA.error && reloadA.data?.status === "draft",
    status: reloadA.data?.status ?? null,
    wizardStep: reloadA.data?.wizard_step ?? null,
    error: redactErr(reloadA.error),
  };

  const submitA = await sbA.rpc("submit_my_seller_application");
  evidence.applicationSubmitA = {
    ok: !submitA.error,
    error: redactErr(submitA.error),
  };

  const afterSubmit = await sbA
    .from("seller_applications")
    .select("id,status")
    .eq("id", insertA.data?.id ?? "")
    .maybeSingle();
  evidence.applicationStatusAfterSubmit = afterSubmit.data?.status ?? null;

  const payloadB = draftPayload("b");
  payloadB.user_id = signed.B.userId;
  payloadB.public_contact_email = users.B.email;
  const insertB = await sbB.from("seller_applications").insert(payloadB).select("id,status,user_id").single();
  evidence.applicationInsertB = {
    ok: !insertB.error && Boolean(insertB.data?.id),
    status: insertB.data?.status ?? null,
    error: redactErr(insertB.error),
  };

  const bSeesA = await sbB
    .from("seller_applications")
    .select("id,user_id,proposed_store_name,public_contact_email")
    .eq("id", insertA.data?.id ?? "00000000-0000-4000-8000-000000000000");
  evidence.rlsBCannotReadA = {
    ok: !bSeesA.error && (bSeesA.data ?? []).length === 0,
    rowCount: (bSeesA.data ?? []).length,
    error: redactErr(bSeesA.error),
  };

  const bUpdateA = await sbB
    .from("seller_applications")
    .update({ proposed_store_name: "PC2 HIJACK ATTEMPT" })
    .eq("id", insertA.data?.id ?? "00000000-0000-4000-8000-000000000000")
    .select("id");
  evidence.rlsBCannotUpdateA = {
    ok: !bUpdateA.error && (bUpdateA.data ?? []).length === 0,
    rowCount: (bUpdateA.data ?? []).length,
    error: redactErr(bUpdateA.error),
  };

  const aProducts = await sbA.from("store_products").select("id,title,store_id").limit(20);
  evidence.productListA = {
    ok: !aProducts.error,
    count: (aProducts.data ?? []).length,
    error: redactErr(aProducts.error),
  };

  const aStores = await sbA.from("stores").select("id,slug,verification_status").limit(20);
  evidence.storesVisibleToA = {
    ok: !aStores.error,
    count: (aStores.data ?? []).length,
    verification: (aStores.data ?? []).map((s) => s.verification_status),
    error: redactErr(aStores.error),
  };

  const createProduct = await sbA.from("store_products").insert({
    store_id: aStores.data?.[0]?.id ?? "00000000-0000-4000-8000-000000000001",
    slug: "pc2-test-product-20260823",
    title: "PC2 TEST Product 20260823",
    status: "draft",
    created_by: signed.A.userId,
  }).select("id").single();
  evidence.productCreateWithoutApproval = {
    ok: !createProduct.error,
    error: redactErr(createProduct.error),
  };

  const adminApprove = await sbA.rpc("admin_approve_seller_application", {
    p_application_id: insertA.data?.id ?? "00000000-0000-4000-8000-000000000000",
  });
  evidence.nonAdminCannotApprove = {
    denied: Boolean(adminApprove.error),
    error: redactErr(adminApprove.error),
  };

  const buyerPrivate = await sbA.from("orders").select("id,buyer_email,buyer_phone,shipping_address").limit(5);
  evidence.customerPrivacyProbe = {
    error: redactErr(buyerPrivate.error),
    rowCount: (buyerPrivate.data ?? []).length,
    leakedEmail: (buyerPrivate.data ?? []).some((r) => r.buyer_email),
    leakedPhone: (buyerPrivate.data ?? []).some((r) => r.buyer_phone),
  };

  // Cleanup identifiable drafts created by this run (own rows only).
  const cleanup = {};
  if (insertA.data?.id) {
    const delA = await sbA.from("seller_applications").delete().eq("id", insertA.data.id).eq("status", "draft");
    cleanup.deletedA = !delA.error;
    cleanup.deleteAError = redactErr(delA.error);
  }
  if (insertB.data?.id) {
    const delB = await sbB.from("seller_applications").delete().eq("id", insertB.data.id).eq("status", "draft");
    cleanup.deletedB = !delB.error;
    cleanup.deleteBError = redactErr(delB.error);
  }
  if (evidence.applicationStatusAfterSubmit === "pending") {
    cleanup.pendingALeftForOperator = true;
  }
  evidence.cleanup = cleanup;

  evidence.STATUS = "AUTHENTICATED_RUNTIME_PARTIAL";
  writeFileSync(outPath, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ ok: true, evidencePath: outPath, status: evidence.STATUS }));
} catch (error) {
  evidence.STATUS = "SCRIPT_ERROR";
  evidence.scriptError = String(error?.message ?? error).slice(0, 240);
  mkdirSync(here, { recursive: true });
  writeFileSync(outPath, JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ ok: false, evidencePath: outPath, status: evidence.STATUS }));
  process.exit(1);
}
