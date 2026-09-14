/**
 * Local-only UM Streak database runtime gate.
 * Talks to 127.0.0.1 Supabase only. Never --linked. Never hosted.
 */
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

function parseStatusEnv(raw) {
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const idx = line.indexOf("=");
    if (idx > 0) env[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return env;
}

function assertLocalStatus(env) {
  if (!env.API_URL?.includes("127.0.0.1") && !env.API_URL?.includes("localhost")) {
    throw new Error("Refusing non-local API_URL");
  }
  if (!env.ANON_KEY || !env.SERVICE_ROLE_KEY) {
    throw new Error("Local supabase status missing keys");
  }
  return env;
}

function loadLocalStatus() {
  if (
    process.env.SUPABASE_LOCAL_API_URL &&
    process.env.SUPABASE_LOCAL_ANON_KEY &&
    process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY
  ) {
    return assertLocalStatus({
      API_URL: process.env.SUPABASE_LOCAL_API_URL,
      ANON_KEY: process.env.SUPABASE_LOCAL_ANON_KEY,
      SERVICE_ROLE_KEY: process.env.SUPABASE_LOCAL_SERVICE_ROLE_KEY,
    });
  }

  const cmd = process.platform === "win32" ? "npx.cmd" : "npx";
  const raw = execFileSync(cmd, ["supabase", "status", "-o", "env", "--local"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
  });
  return assertLocalStatus(parseStatusEnv(raw));
}

function admin(env) {
  return createClient(env.API_URL, env.SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function userClient(env, accessToken) {
  return createClient(env.API_URL, env.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

async function createLocalUser(env, email, password, meta) {
  const res = await fetch(`${env.API_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SERVICE_ROLE_KEY}`,
      apikey: env.SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: meta,
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`admin create user failed: ${res.status} ${JSON.stringify(body)}`);
  }
  return body;
}

async function signIn(env, email, password) {
  const anon = createClient(env.API_URL, env.ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`sign-in failed: ${error?.message || "no session"}`);
  }
  return data;
}

function record(results, name, ok, detail) {
  results[name] = { ok: Boolean(ok), detail };
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark} ${name}: ${detail}`);
}

async function sendVisual(client, conversationId, userId, suffix) {
  const path = `${userId}/${conversationId}/${suffix}.png`;
  const upload = await client.storage.from("message-media").upload(path, PNG_1X1, {
    contentType: "image/png",
    upsert: false,
  });
  if (upload.error) {
    return { ok: false, error: upload.error.message, path };
  }
  const sent = await client.rpc("send_um_visual_message", {
    p_conversation_id: conversationId,
    p_storage_path: path,
    p_mime_type: "image/png",
    p_media_type: "image",
    p_caption: suffix,
    p_client_id: `gate-${suffix}`,
    p_byte_size: PNG_1X1.length,
    p_width: 1,
    p_height: 1,
    p_duration_ms: null,
    p_expiration_policy: "view_once",
  });
  return { ok: !sent.error, error: sent.error?.message || null, data: sent.data, path };
}

async function main() {
  const results = {};
  const env = loadLocalStatus();
  record(results, "LOCAL_ENDPOINT", env.API_URL.includes("127.0.0.1"), env.API_URL);

  const svc = admin(env);
  const { data: applied, error: appliedErr } = await svc
    .from("um_streaks")
    .select("pair_key")
    .limit(1);
  record(
    results,
    "UM_STREAKS_TABLE",
    !appliedErr || appliedErr.code === "PGRST116",
    appliedErr ? appliedErr.message : `readable (rows=${applied?.length ?? 0})`
  );

  const stamp = Date.now();
  const password = `LocalGate-${randomBytes(12).toString("hex")}`;
  const users = {
    a: await createLocalUser(env, `umstreak.a.${stamp}@local.test`, password, {
      full_name: "UM Streak Alice",
      username: `streak_a_${stamp.toString(36).slice(-8)}`,
    }),
    b: await createLocalUser(env, `umstreak.b.${stamp}@local.test`, password, {
      full_name: "UM Streak Bob",
      username: `streak_b_${stamp.toString(36).slice(-8)}`,
    }),
    c: await createLocalUser(env, `umstreak.c.${stamp}@local.test`, password, {
      full_name: "UM Streak Carol",
      username: `streak_c_${stamp.toString(36).slice(-8)}`,
    }),
    d: await createLocalUser(env, `umstreak.d.${stamp}@local.test`, password, {
      full_name: "UM Streak Dana",
      username: `streak_d_${stamp.toString(36).slice(-8)}`,
    }),
    e: await createLocalUser(env, `umstreak.e.${stamp}@local.test`, password, {
      full_name: "UM Streak Evan",
      username: `streak_e_${stamp.toString(36).slice(-8)}`,
    }),
  };

  const sessions = {
    a: await signIn(env, users.a.email, password),
    b: await signIn(env, users.b.email, password),
    c: await signIn(env, users.c.email, password),
  };
  const A = userClient(env, sessions.a.session.access_token);
  const B = userClient(env, sessions.b.session.access_token);
  const C = userClient(env, sessions.c.session.access_token);

  record(
    results,
    "TWO_LOCAL_ACCOUNTS",
    Boolean(users.a.id && users.b.id && sessions.a.session && sessions.b.session),
    `local auth users created and signed in (ids withheld)`
  );

  const conv = await A.rpc("get_or_create_direct_conversation", {
    p_other_user_id: users.b.id,
  });
  if (conv.error) throw new Error(`conversation: ${conv.error.message}`);
  const conversationId = Array.isArray(conv.data) ? conv.data[0]?.id || conv.data[0] : conv.data?.id || conv.data;
  if (!conversationId) throw new Error(`conversation id missing: ${JSON.stringify(conv.data)}`);

  const first = await sendVisual(A, conversationId, users.a.id, `one-${randomUUID().slice(0, 8)}`);
  record(results, "SEND_A", first.ok, first.ok ? "A sent view-once image" : first.error);

  const streakAfterA = await A.rpc("get_um_streak_for_conversation", {
    p_conversation_id: conversationId,
  });
  const rowA = Array.isArray(streakAfterA.data) ? streakAfterA.data[0] : streakAfterA.data;
  const oneDaySet = Boolean(rowA?.last_qualifying_day_low) !== Boolean(rowA?.last_qualifying_day_high);
  const oneSided =
    !streakAfterA.error &&
    rowA &&
    rowA.current_streak === 0 &&
    rowA.last_completed_streak_day == null &&
    oneDaySet;
  record(
    results,
    "ONE_SIDED_MESSAGE_NO_INCREMENT",
    oneSided,
    streakAfterA.error
      ? streakAfterA.error.message
      : `state=${rowA?.streak_state} streak=${rowA?.current_streak} one_day_set=${oneDaySet} (SQL XOR leaves state=none when the other day is null)`
  );

  const messageId = first.data?.id;
  const opened = await B.rpc("open_um_visual_message", { p_message_id: messageId });
  const openedOk = !opened.error && opened.data?.visual_opened_at;
  record(
    results,
    "OPEN_B",
    openedOk,
    opened.error ? opened.error.message : "B opened view-once message"
  );

  const canReadB = await B.rpc("can_read_message_media", { p_message_id: messageId });
  const canReadA = await A.rpc("can_read_message_media", { p_message_id: messageId });
  const canReadC = await C.rpc("can_read_message_media", { p_message_id: messageId });
  const privateRls =
    canReadA.data === true && canReadB.data === false && canReadC.data === false;
  record(
    results,
    "PRIVATE_MEDIA_RLS",
    privateRls,
    `sender=${canReadA.data} recipient_after_open=${canReadB.data} stranger=${canReadC.data}`
  );

  const reopen = await B.rpc("open_um_visual_message", { p_message_id: messageId });
  const resign = await B.storage.from("message-media").createSignedUrl(first.path, 90);
  const viewOnce =
    !reopen.error &&
    Boolean(reopen.data?.visual_opened_at) &&
    Boolean(resign.error || !resign.data?.signedUrl);
  record(
    results,
    "VIEW_ONCE_SERVER_ENFORCED",
    viewOnce,
    `reopen_keeps_opened=${Boolean(reopen.data?.visual_opened_at)} resign_blocked=${Boolean(
      resign.error || !resign.data?.signedUrl
    )}`
  );

  const reply = await sendVisual(B, conversationId, users.b.id, `two-${randomUUID().slice(0, 8)}`);
  const streakBoth = await B.rpc("get_um_streak_for_conversation", {
    p_conversation_id: conversationId,
  });
  const rowBoth = Array.isArray(streakBoth.data) ? streakBoth.data[0] : streakBoth.data;
  const bothOk = reply.ok && rowBoth?.current_streak === 1;
  record(
    results,
    "BOTH_USERS_QUALIFY_INCREMENT",
    bothOk,
    reply.ok
      ? `state=${rowBoth?.streak_state} streak=${rowBoth?.current_streak}`
      : reply.error
  );

  const fromA = await A.rpc("get_um_streak_for_conversation", {
    p_conversation_id: conversationId,
  });
  const rowFromA = Array.isArray(fromA.data) ? fromA.data[0] : fromA.data;
  record(
    results,
    "BOTH_SIDES_SEE_STREAK",
    rowFromA?.current_streak === 1 && rowBoth?.current_streak === 1,
    `A=${rowFromA?.current_streak} B=${rowBoth?.current_streak}`
  );

  const dup = await sendVisual(A, conversationId, users.a.id, `dup-${randomUUID().slice(0, 8)}`);
  const streakDup = await A.rpc("get_um_streak_for_conversation", {
    p_conversation_id: conversationId,
  });
  const rowDup = Array.isArray(streakDup.data) ? streakDup.data[0] : streakDup.data;
  record(
    results,
    "DUPLICATE_INCREMENT_BLOCKED",
    dup.ok && rowDup?.current_streak === 1,
    dup.ok ? `still streak=${rowDup?.current_streak}` : dup.error
  );

  const dayD = await svc.rpc("um_streak_utc_day", {
    p_at: "2026-09-01T23:59:00.000Z",
  });
  const dayE = await svc.rpc("um_streak_utc_day", {
    p_at: "2026-09-02T00:00:01.000Z",
  });
  const tzSql =
    dayD.data === "2026-09-01" && dayE.data === "2026-09-02";

  const ev1 = await svc.rpc("um_streak_apply_visual_event", {
    p_sender_id: users.d.id,
    p_recipient_id: users.e.id,
    p_event_id: randomUUID(),
    p_message_id: null,
    p_occurred_at: "2026-09-01T23:59:00.000Z",
  });
  const ev2 = await svc.rpc("um_streak_apply_visual_event", {
    p_sender_id: users.e.id,
    p_recipient_id: users.d.id,
    p_event_id: randomUUID(),
    p_message_id: null,
    p_occurred_at: "2026-09-01T23:59:30.000Z",
  });
  const ev3 = await svc.rpc("um_streak_apply_visual_event", {
    p_sender_id: users.d.id,
    p_recipient_id: users.e.id,
    p_event_id: randomUUID(),
    p_message_id: null,
    p_occurred_at: "2026-09-02T00:00:01.000Z",
  });
  const tzOk =
    tzSql &&
    !ev1.error &&
    !ev2.error &&
    !ev3.error &&
    ev2.data?.current_streak === 1 &&
    ev3.data?.current_streak === 1 &&
    ev3.data?.streak_state === "waiting_for_friend" &&
    ev3.data?.last_completed_streak_day === "2026-09-01";
  record(
    results,
    "TIMEZONE_BOUNDARY",
    tzOk,
    `utc_days=${dayD.data}/${dayE.data} after_midnight_state=${ev3.data?.streak_state} streak=${ev3.data?.current_streak}`
  );

  const ev4 = await svc.rpc("um_streak_apply_visual_event", {
    p_sender_id: users.d.id,
    p_recipient_id: users.e.id,
    p_event_id: randomUUID(),
    p_message_id: null,
    p_occurred_at: "2026-09-04T10:00:00.000Z",
  });
  const ev5 = await svc.rpc("um_streak_apply_visual_event", {
    p_sender_id: users.e.id,
    p_recipient_id: users.d.id,
    p_event_id: randomUUID(),
    p_message_id: null,
    p_occurred_at: "2026-09-04T11:00:00.000Z",
  });
  const missedOk =
    !ev4.error &&
    !ev5.error &&
    ev5.data?.current_streak === 1 &&
    ev5.data?.longest_streak === 1 &&
    ev5.data?.last_completed_streak_day === "2026-09-04";
  record(
    results,
    "MISSED_DAY_BEHAVIOR",
    missedOk,
    `restart_streak=${ev5.data?.current_streak} longest=${ev5.data?.longest_streak} day=${ev5.data?.last_completed_streak_day}`
  );

  const blocked = await A.rpc("block_ugc_user", { p_user_id: users.b.id });
  const blockedSend = await sendVisual(
    B,
    conversationId,
    users.b.id,
    `blocked-${randomUUID().slice(0, 8)}`
  );
  const blockedOpen = await B.rpc("open_um_visual_message", { p_message_id: messageId });
  const blockedStreak = await B.rpc("get_um_streak_for_conversation", {
    p_conversation_id: conversationId,
  });
  const blockedRow = Array.isArray(blockedStreak.data) ? blockedStreak.data[0] : blockedStreak.data;
  const blockingOk =
    !blocked.error &&
    !blockedSend.ok &&
    /blocked/i.test(blockedSend.error || "") &&
    (blockedOpen.error ? /blocked/i.test(blockedOpen.error.message) : true) &&
    !blockedRow;
  record(
    results,
    "BLOCKING_ENFORCED",
    blockingOk,
    `block_rpc=${!blocked.error} send=${blockedSend.error || "unexpected success"} streak_hidden=${!blockedRow}`
  );

  const strangerConv = await C.rpc("get_um_streak_for_conversation", {
    p_conversation_id: conversationId,
  });
  record(
    results,
    "STRANGER_STREAK_DENIED",
    Boolean(strangerConv.error) || !strangerConv.data || (Array.isArray(strangerConv.data) && strangerConv.data.length === 0),
    strangerConv.error ? strangerConv.error.message : `data=${JSON.stringify(strangerConv.data)}`
  );

  console.log(JSON.stringify({ results, conversationIdPresent: Boolean(conversationId) }, null, 2));
  const required = [
    "TWO_LOCAL_ACCOUNTS",
    "PRIVATE_MEDIA_RLS",
    "BLOCKING_ENFORCED",
    "VIEW_ONCE_SERVER_ENFORCED",
    "DUPLICATE_INCREMENT_BLOCKED",
    "ONE_SIDED_MESSAGE_NO_INCREMENT",
    "BOTH_USERS_QUALIFY_INCREMENT",
    "MISSED_DAY_BEHAVIOR",
    "TIMEZONE_BOUNDARY",
  ];
  const failed = required.filter((k) => !results[k]?.ok);
  if (failed.length) {
    process.exitCode = 1;
    console.error(`FAILED: ${failed.join(", ")}`);
  } else {
    console.log("ALL_REQUIRED_DB_GATES_PASS");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
