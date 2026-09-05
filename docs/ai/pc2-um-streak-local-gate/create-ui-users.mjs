import { createClient } from "@supabase/supabase-js";
import { execSync } from "node:child_process";

const raw = execSync("npx supabase status -o env", {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
const env = Object.fromEntries(
  raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes("="))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx), line.slice(idx + 1).replace(/^"|"$/g, "")];
    })
);

const url = env.API_URL;
const service = env.SERVICE_ROLE_KEY;
const anon = env.ANON_KEY;
if (!url || !/^https?:\/\/(127\.0\.0\.1|localhost)/i.test(url) || !service || !anon) {
  console.error("REFUSING_NON_LOCAL_OR_MISSING");
  process.exit(2);
}

const password = process.env.UI_GATE_PASSWORD;
if (!password) {
  console.error("MISSING_UI_GATE_PASSWORD");
  process.exit(2);
}

const admin = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function ensure(email, username, label) {
  const { data: existing } = await admin.auth.admin.listUsers();
  const found = existing.users.find((user) => user.email === email);
  if (!found) {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `UM Streak UI ${label}`, username },
    });
    if (created.error) {
      throw new Error(created.error.message);
    }
    return created.data.user.id;
  }
  const updated = await admin.auth.admin.updateUserById(found.id, { password });
  if (updated.error) {
    throw new Error(updated.error.message);
  }
  return found.id;
}

const userA = await ensure("umstreak.ui.a@local.test", "umstreakuia", "A");
const userB = await ensure("umstreak.ui.b@local.test", "umstreakuib", "B");
const client = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const signed = await client.auth.signInWithPassword({
  email: "umstreak.ui.a@local.test",
  password,
});
if (signed.error) {
  throw new Error(signed.error.message);
}
const rpc = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: { Authorization: `Bearer ${signed.data.session.access_token}` } },
});
const conversation = await rpc.rpc("get_or_create_direct_conversation", {
  p_other_user_id: userB,
});
if (conversation.error) {
  throw new Error(conversation.error.message);
}
console.log("UI_USER_A_OK");
console.log("UI_USER_B_OK");
console.log(`UI_CONVERSATION=${conversation.data}`);
console.log(`API_HOST=${new URL(url).host}`);
