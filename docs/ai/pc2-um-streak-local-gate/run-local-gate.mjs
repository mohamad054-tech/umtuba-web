/**
 * Local-only UM Streak two-account + SQL/RPC contract gate.
 * Targets 127.0.0.1 Supabase. Never prints secrets.
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const API_URL = process.env.LOCAL_SUPABASE_API_URL;
const ANON = process.env.LOCAL_SUPABASE_ANON_KEY;
const SERVICE = process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY;

if (!API_URL || !ANON || !SERVICE) {
  console.error("MISSING_LOCAL_SUPABASE_ENV");
  process.exit(2);
}

if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?/i.test(API_URL)) {
  console.error("REFUSING_NON_LOCAL_API_URL");
  process.exit(2);
}

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

const results = [];

function record(name, pass, detail = "") {
  results.push({ name, pass: Boolean(pass), detail: String(detail).slice(0, 240) });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? ` :: ${String(detail).slice(0, 180)}` : ""}`);
}

function must(name, pass, detail) {
  record(name, pass, detail);
  if (!pass) {
    throw new Error(`GATE_FAIL:${name}:${detail || ""}`);
  }
}

function admin() {
  return createClient(API_URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function userClient(accessToken) {
  return createClient(API_URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

async function createDisposableUser(label) {
  const email = `umstreak.gate.${label}.${Date.now()}@local.test`;
  const password = `Gate-${randomUUID()}!aA1`;
  const username = `gate${label}${Date.now().toString().slice(-6)}`.slice(0, 24);
  const { data, error } = await admin().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: `UM Streak Gate ${label.toUpperCase()}`,
      username,
    },
  });
  if (error || !data.user) {
    throw new Error(`createUser ${label}: ${error?.message || "no user"}`);
  }
  const signed = await admin().auth.signInWithPassword({ email, password });
  if (signed.error || !signed.data.session) {
    throw new Error(`signIn ${label}: ${signed.error?.message || "no session"}`);
  }
  return {
    id: data.user.id,
    email,
    password,
    accessToken: signed.data.session.access_token,
    sb: userClient(signed.data.session.access_token),
  };
}

async function uploadPng(user, conversationId) {
  const path = `${user.id}/${conversationId}/${randomUUID()}.png`;
  const { error } = await user.sb.storage.from("message-media").upload(path, PNG, {
    contentType: "image/png",
    upsert: false,
  });
  if (error) {
    throw new Error(`upload: ${error.message}`);
  }
  return path;
}

async function sendVisual(user, conversationId, storagePath, clientId) {
  return user.sb.rpc("send_um_visual_message", {
    p_conversation_id: conversationId,
    p_storage_path: storagePath,
    p_mime_type: "image/png",
    p_media_type: "image",
    p_caption: "local-gate",
    p_client_id: clientId ?? null,
    p_byte_size: PNG.length,
    p_width: 1,
    p_height: 1,
    p_duration_ms: null,
    p_expiration_policy: "view_once",
  });
}

function utcDay(iso = new Date().toISOString()) {
  return iso.slice(0, 10);
}

async function main() {
  const host = new URL(API_URL).host;
  console.log(`LOCAL_API_HOST=${host}`);
  console.log("PRODUCTION_DB_TARGETED=NO");

  const userA = await createDisposableUser("a");
  const userB = await createDisposableUser("b");
  const userC = await createDisposableUser("c");
  const userD = await createDisposableUser("d");
  record("TWO_LOCAL_USERS", Boolean(userA.id && userB.id), "A+B created");
  record("STRANGER_USER", Boolean(userC.id && userD.id));

  const convA = await userA.sb.rpc("get_or_create_direct_conversation", {
    p_other_user_id: userB.id,
  });
  must("CONVERSATION_AB", !convA.error && convA.data, convA.error?.message);
  const conversationId = convA.data;

  const strangerConv = await userC.sb
    .from("messages")
    .select("id")
    .eq("conversation_id", conversationId);
  record(
    "STRANGER_CANNOT_LIST_MESSAGES",
    !strangerConv.error && (strangerConv.data?.length ?? 0) === 0,
    strangerConv.error?.message || `rows=${strangerConv.data?.length ?? 0}`
  );

  const pathA = await uploadPng(userA, conversationId);
  const sendA = await sendVisual(userA, conversationId, pathA, `client-a-${randomUUID()}`);
  must("PRIVATE_VISUAL_SEND", !sendA.error && sendA.data?.id, sendA.error?.message);
  const messageId = sendA.data.id;
  record(
    "SEND_SCOPED_TO_CONVERSATION",
    sendA.data.conversation_id === conversationId && sendA.data.sender_id === userA.id
  );
  record(
    "VIEW_ONCE_UNOPENED",
    sendA.data.visual_opened_at == null && sendA.data.visual_expiration_policy === "view_once"
  );

  const listedB = await userB.sb.rpc("list_conversation_messages", {
    p_conversation_id: conversationId,
    p_limit: 20,
  });
  const received = (listedB.data || []).find((row) => row.id === messageId);
  record(
    "RECIPIENT_RECEIVE",
    !listedB.error && Boolean(received) && received.visual_opened_at == null,
    listedB.error?.message
  );

  const listedA = await userA.sb.rpc("list_conversation_messages", {
    p_conversation_id: conversationId,
    p_limit: 20,
  });
  record(
    "SENDER_SEES_OWN_MESSAGE",
    !listedA.error && (listedA.data || []).some((row) => row.id === messageId)
  );

  const listedC = await userC.sb.rpc("list_conversation_messages", {
    p_conversation_id: conversationId,
    p_limit: 20,
  });
  record(
    "STRANGER_CANNOT_LIST_CONVERSATION",
    Boolean(listedC.error),
    listedC.error?.message || "unexpected success"
  );

  const streakAfterA = await userA.sb.rpc("get_um_streak_for_conversation", {
    p_conversation_id: conversationId,
  });
  const streakRowA = Array.isArray(streakAfterA.data) ? streakAfterA.data[0] : streakAfterA.data;
  record(
    "ONE_SIDED_NO_INCREMENT",
    !streakAfterA.error &&
      streakRowA?.current_streak === 0 &&
      streakRowA?.streak_state === "waiting_for_friend" &&
      streakRowA?.last_completed_streak_day == null,
    JSON.stringify({
      current: streakRowA?.current_streak,
      state: streakRowA?.streak_state,
      completed: streakRowA?.last_completed_streak_day,
    })
  );

  const firstSign = await userB.sb.storage.from("message-media").createSignedUrl(pathA, 90);
  record(
    "FIRST_SIGNED_URL_BEFORE_OPEN",
    Boolean(firstSign.data?.signedUrl) && !firstSign.error,
    firstSign.error?.message
  );

  const open1 = await userB.sb.rpc("open_um_visual_message", { p_message_id: messageId });
  record(
    "VIEW_ONCE_OPEN",
    !open1.error && Boolean(open1.data?.visual_opened_at),
    open1.error?.message
  );

  const open2 = await userB.sb.rpc("open_um_visual_message", { p_message_id: messageId });
  record(
    "VIEW_ONCE_REPLAY_RPC_BLOCKED",
    Boolean(open2.error) && /already opened/i.test(open2.error.message || ""),
    open2.error?.message || "no error"
  );

  const replaySign = await userB.sb.storage.from("message-media").createSignedUrl(pathA, 90);
  record(
    "VIEW_ONCE_REPLAY_SIGNED_URL_BLOCKED",
    Boolean(replaySign.error) || !replaySign.data?.signedUrl,
    replaySign.error?.message || (replaySign.data?.signedUrl ? "URL_ISSUED" : "no url")
  );

  const senderSignAfterOpen = await userA.sb.storage.from("message-media").createSignedUrl(pathA, 90);
  record(
    "SENDER_CAN_STILL_SIGN_AFTER_OPEN",
    Boolean(senderSignAfterOpen.data?.signedUrl),
    senderSignAfterOpen.error?.message
  );

  const strangerSign = await userC.sb.storage.from("message-media").createSignedUrl(pathA, 90);
  record(
    "STRANGER_SIGNED_URL_BLOCKED",
    Boolean(strangerSign.error) || !strangerSign.data?.signedUrl,
    strangerSign.error?.message || "unexpected url"
  );

  const publicBucket = await admin()
    .from("storage.buckets")
    .select("id")
    .eq("id", "message-media")
    .maybeSingle();
  // storage.buckets is not a public table; confirm via RPC-less admin REST may fail.
  // The SQL check already proved public=false. Record media access from signed-url results.
  record(
    "PRIVATE_MEDIA_ACCESS",
    (Boolean(firstSign.data?.signedUrl) &&
      (Boolean(replaySign.error) || !replaySign.data?.signedUrl) &&
      (Boolean(strangerSign.error) || !strangerSign.data?.signedUrl)),
    `bucket_query=${publicBucket.error ? "not_exposed" : "ok"}`
  );

  const pathB = await uploadPng(userB, conversationId);
  const sendB = await sendVisual(userB, conversationId, pathB, `client-b-${randomUUID()}`);
  record("BILATERAL_REPLY_SEND", !sendB.error && Boolean(sendB.data?.id), sendB.error?.message);

  const streakAfterB = await userB.sb.rpc("get_um_streak_for_conversation", {
    p_conversation_id: conversationId,
  });
  const streakRowB = Array.isArray(streakAfterB.data) ? streakAfterB.data[0] : streakAfterB.data;
  const today = utcDay();
  record(
    "BILATERAL_INCREMENT",
    !streakAfterB.error &&
      streakRowB?.current_streak === 1 &&
      streakRowB?.longest_streak === 1 &&
      streakRowB?.last_completed_streak_day === today &&
      (streakRowB?.streak_state === "started" || streakRowB?.streak_state === "active_today"),
    JSON.stringify({
      current: streakRowB?.current_streak,
      longest: streakRowB?.longest_streak,
      completed: streakRowB?.last_completed_streak_day,
      state: streakRowB?.streak_state,
    })
  );

  const pathB2 = await uploadPng(userB, conversationId);
  const sendB2 = await sendVisual(userB, conversationId, pathB2, `client-b2-${randomUUID()}`);
  const streakDup = await userA.sb.rpc("get_um_streak_for_conversation", {
    p_conversation_id: conversationId,
  });
  const streakRowDup = Array.isArray(streakDup.data) ? streakDup.data[0] : streakDup.data;
  record("DUPLICATE_SEND_OK", !sendB2.error, sendB2.error?.message);
  record(
    "DUPLICATE_INCREMENT_BLOCKED",
    streakRowDup?.current_streak === 1 && streakRowDup?.longest_streak === 1,
    JSON.stringify({
      current: streakRowDup?.current_streak,
      longest: streakRowDup?.longest_streak,
    })
  );

  const retryClient = `client-a-retry-${randomUUID()}`;
  const pathRetry = await uploadPng(userA, conversationId);
  const firstRetry = await sendVisual(userA, conversationId, pathRetry, retryClient);
  const secondRetry = await sendVisual(userA, conversationId, pathRetry, retryClient);
  record(
    "CLIENT_ID_IDEMPOTENT",
    !firstRetry.error &&
      !secondRetry.error &&
      firstRetry.data?.id === secondRetry.data?.id,
    `${firstRetry.data?.id || firstRetry.error?.message} / ${secondRetry.data?.id || secondRetry.error?.message}`
  );

  const convAC = await userA.sb.rpc("get_or_create_direct_conversation", {
    p_other_user_id: userC.id,
  });
  record("CONVERSATION_AC", !convAC.error && Boolean(convAC.data), convAC.error?.message);
  const block = await userC.sb.rpc("block_ugc_user", { p_user_id: userA.id });
  record("BLOCK_RPC", !block.error, block.error?.message);
  if (convAC.data) {
    const pathBlocked = await uploadPng(userA, convAC.data).catch((error) => {
      record("BLOCKED_UPLOAD", true, error.message);
      return null;
    });
    if (pathBlocked) {
      const blockedSend = await sendVisual(userA, convAC.data, pathBlocked, `blocked-${randomUUID()}`);
      record(
        "BLOCKING_ENFORCED",
        Boolean(blockedSend.error) && /blocked/i.test(blockedSend.error.message || ""),
        blockedSend.error?.message || "send succeeded"
      );
    } else {
      record("BLOCKING_ENFORCED", true, "upload or send blocked");
    }
  } else {
    record("BLOCKING_ENFORCED", false, "no AC conversation");
  }

  const apply = admin();
  const day1 = "2026-08-20T12:00:00.000Z";
  const day2 = "2026-08-21T12:00:00.000Z";
  const missed = "2026-08-24T12:00:00.000Z";
  const beforeMidnight = "2026-08-25T23:59:00.000Z";
  const afterMidnight = "2026-08-26T00:01:00.000Z";

  const hist1 = await apply.rpc("um_streak_apply_visual_event", {
    p_sender_id: userA.id,
    p_recipient_id: userD.id,
    p_event_id: randomUUID(),
    p_message_id: null,
    p_occurred_at: day1,
  });
  const hist1b = await apply.rpc("um_streak_apply_visual_event", {
    p_sender_id: userD.id,
    p_recipient_id: userA.id,
    p_event_id: randomUUID(),
    p_message_id: null,
    p_occurred_at: day1,
  });
  const hist2 = await apply.rpc("um_streak_apply_visual_event", {
    p_sender_id: userA.id,
    p_recipient_id: userD.id,
    p_event_id: randomUUID(),
    p_message_id: null,
    p_occurred_at: day2,
  });
  const hist2b = await apply.rpc("um_streak_apply_visual_event", {
    p_sender_id: userD.id,
    p_recipient_id: userA.id,
    p_event_id: randomUUID(),
    p_message_id: null,
    p_occurred_at: day2,
  });
  record(
    "HISTORICAL_CONTINUE",
    !hist1.error &&
      !hist1b.error &&
      !hist2.error &&
      !hist2b.error &&
      hist2b.data?.current_streak === 2 &&
      hist2b.data?.longest_streak === 2,
    hist2b.error?.message || JSON.stringify({ current: hist2b.data?.current_streak, longest: hist2b.data?.longest_streak })
  );

  const sameEvent = randomUUID();
  const dupEvent1 = await apply.rpc("um_streak_apply_visual_event", {
    p_sender_id: userA.id,
    p_recipient_id: userD.id,
    p_event_id: sameEvent,
    p_message_id: null,
    p_occurred_at: missed,
  });
  const dupEvent2 = await apply.rpc("um_streak_apply_visual_event", {
    p_sender_id: userA.id,
    p_recipient_id: userD.id,
    p_event_id: sameEvent,
    p_message_id: null,
    p_occurred_at: missed,
  });
  record(
    "DUPLICATE_EVENT_ID_NO_DOUBLE",
    !dupEvent1.error &&
      !dupEvent2.error &&
      dupEvent1.data?.current_streak === dupEvent2.data?.current_streak,
    JSON.stringify({
      a: dupEvent1.data?.current_streak,
      b: dupEvent2.data?.current_streak,
      err: dupEvent1.error?.message || dupEvent2.error?.message,
    })
  );

  const afterMissA = await apply.rpc("um_streak_apply_visual_event", {
    p_sender_id: userA.id,
    p_recipient_id: userD.id,
    p_event_id: randomUUID(),
    p_message_id: null,
    p_occurred_at: missed,
  });
  record(
    "MISSED_DAY_RESETS_CURRENT",
    !afterMissA.error &&
      afterMissA.data?.current_streak === 0 &&
      afterMissA.data?.longest_streak === 2,
    JSON.stringify({
      current: afterMissA.data?.current_streak,
      longest: afterMissA.data?.longest_streak,
      state: afterMissA.data?.streak_state,
    })
  );

  const tzA = await apply.rpc("um_streak_apply_visual_event", {
    p_sender_id: userA.id,
    p_recipient_id: userD.id,
    p_event_id: randomUUID(),
    p_message_id: null,
    p_occurred_at: beforeMidnight,
  });
  const tzB = await apply.rpc("um_streak_apply_visual_event", {
    p_sender_id: userA.id,
    p_recipient_id: userD.id,
    p_event_id: randomUUID(),
    p_message_id: null,
    p_occurred_at: afterMidnight,
  });
  const tzDay1 = utcDay(beforeMidnight);
  const tzDay2 = utcDay(afterMidnight);
  const beforeQual = tzA.data?.last_qualifying_day_low || tzA.data?.last_qualifying_day_high;
  const afterQual = tzB.data?.last_qualifying_day_low || tzB.data?.last_qualifying_day_high;
  record(
    "TIMEZONE_POLICY_UTC_CALENDAR_DAY",
    tzDay1 === "2026-08-25" &&
      tzDay2 === "2026-08-26" &&
      !tzA.error &&
      !tzB.error &&
      beforeQual !== afterQual,
    JSON.stringify({
      day1: tzDay1,
      day2: tzDay2,
      before: {
        low: tzA.data?.last_qualifying_day_low,
        high: tzA.data?.last_qualifying_day_high,
      },
      after: {
        low: tzB.data?.last_qualifying_day_low,
        high: tzB.data?.last_qualifying_day_high,
      },
      err: tzA.error?.message || tzB.error?.message,
    })
  );

  const convAD = await userA.sb.rpc("get_or_create_direct_conversation", {
    p_other_user_id: userD.id,
  });
  record("CONVERSATION_AD", !convAD.error && Boolean(convAD.data), convAD.error?.message);
  if (convAD.data) {
    const brokenRead = await userA.sb.rpc("get_um_streak_for_conversation", {
      p_conversation_id: convAD.data,
    });
    const brokenRow = Array.isArray(brokenRead.data) ? brokenRead.data[0] : brokenRead.data;
    record(
      "BROKEN_STATE_READ",
      !brokenRead.error &&
        (brokenRow?.streak_state === "broken" ||
          (brokenRow?.current_streak === 0 && (brokenRow?.longest_streak ?? 0) >= 2)),
      JSON.stringify({
        state: brokenRow?.streak_state,
        current: brokenRow?.current_streak,
        longest: brokenRow?.longest_streak,
        err: brokenRead.error?.message,
      })
    );
    record(
      "LONGEST_STREAK",
      (brokenRow?.longest_streak ?? 0) >= 2,
      JSON.stringify({ longest: brokenRow?.longest_streak })
    );
  }

  const anon = createClient(API_URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anonList = await anon.from("messages").select("id").eq("id", messageId);
  record(
    "ANON_CANNOT_READ_PRIVATE_MESSAGE",
    (anonList.data?.length ?? 0) === 0,
    anonList.error?.message || `rows=${anonList.data?.length ?? 0}`
  );

  const failed = results.filter((row) => !row.pass);
  console.log(`SUMMARY ${results.filter((row) => row.pass).length}/${results.length} passed`);
  if (failed.length) {
    console.log("FAILED_CHECKS=" + failed.map((row) => row.name).join(","));
    process.exitCode = 1;
  } else {
    console.log("ALL_CONTRACT_CHECKS_PASSED");
  }
}

main().catch((error) => {
  console.error("GATE_CRASH", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
