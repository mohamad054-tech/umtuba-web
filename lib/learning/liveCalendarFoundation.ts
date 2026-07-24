/**
 * UM Learning OS — Live Learning & Calendar Foundation V1.
 *
 * Course-scoped live sessions, join gate, attendance, calendar aggregation.
 * DB-authoritative RPCs. LiveKit tokens minted only after join-gate success
 * when LiveKit env is configured; otherwise fail-closed join readiness.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { isLiveKitConfigured, getPublicLiveKitUrl } from "../livekit/env";
import { mintLiveMediaToken, type LiveMediaGrants } from "../livekit/server";

type AnyClient = SupabaseClient;

export const LEARNING_LIVE_RPCS = {
  createSession: "create_learning_live_session",
  updateSession: "update_learning_live_session",
  cancelSession: "cancel_learning_live_session",
  startSession: "start_learning_live_session",
  completeSession: "complete_learning_live_session",
  listForManage: "list_learning_live_sessions_for_manage",
  listMine: "list_my_learning_live_sessions",
  getSession: "get_learning_live_session",
  joinGate: "get_learning_live_session_join_gate",
  upsertAttendance: "upsert_learning_live_attendance",
  getMyAttendance: "get_my_learning_live_attendance",
  listAttendance: "list_learning_live_session_attendance",
  myCalendar: "get_my_learning_calendar",
  instructorCalendar: "get_instructor_learning_calendar",
} as const;

export const LEARNING_LIVE_ROUTES = {
  learnerSchedule: (courseId: string) =>
    `/learning/courses/${courseId}/live`,
  learnerSession: (courseId: string, sessionId: string) =>
    `/learning/courses/${courseId}/live/${sessionId}`,
  learnerCalendar: (courseId?: string) =>
    courseId
      ? `/learning/courses/${courseId}/calendar`
      : "/learning/calendar",
  instructorSessions: (courseId: string) =>
    `/learning/instructor/courses/${courseId}/live`,
  instructorSession: (courseId: string, sessionId: string) =>
    `/learning/instructor/courses/${courseId}/live/${sessionId}`,
  instructorCalendar: (courseId: string) =>
    `/learning/instructor/courses/${courseId}/calendar`,
} as const;

export const LEARNING_LIVE_EARLY_JOIN_MINUTES = 15;
export const LEARNING_LIVE_LATE_JOIN_MINUTES = 15;

export type LiveCalendarResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export type LearningLiveJoinResult = {
  gate: Record<string, unknown>;
  mediaReady: boolean;
  token: string | null;
  livekitUrl: string | null;
  roomName: string | null;
  identity: string | null;
  expiresAt: number | null;
  blocker: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLiveCalendarUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

export function sanitizeLiveCalendarError(
  message: string | undefined
): string {
  const raw = (message ?? "").trim();
  if (!raw) return "Live learning action could not be processed.";
  const lower = raw.toLowerCase();
  if (
    lower.includes("authentication required") ||
    lower.includes("not entitled") ||
    lower.includes("not allowed")
  ) {
    return "You are not allowed to access this live session.";
  }
  if (lower.includes("not found")) {
    return "Live session was not found.";
  }
  if (lower.includes("terminal") || lower.includes("cannot be updated")) {
    return "This session can no longer be changed.";
  }
  if (lower.includes("eligible") || lower.includes("join window") || lower.includes("too_early") || lower.includes("too_late")) {
    return "You cannot join this session right now.";
  }
  if (raw.length > 180) return "Live learning action could not be processed.";
  return raw;
}

async function callRpc(
  supabase: AnyClient,
  rpc: string,
  args?: Record<string, unknown>
): Promise<LiveCalendarResult<unknown>> {
  const { data, error } = args
    ? await supabase.rpc(rpc, args)
    : await supabase.rpc(rpc);
  if (error) {
    return { ok: false, message: sanitizeLiveCalendarError(error.message) };
  }
  return { ok: true, data };
}

function requireUuid(
  value: string,
  label: string
): { ok: false; message: string } | null {
  if (!isLiveCalendarUuid(value)) {
    return { ok: false, message: `${label} must be a valid UUID` };
  }
  return null;
}

export function formatLearningLiveInstant(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export async function createLearningLiveSession(
  supabase: AnyClient,
  input: {
    courseId: string;
    title: string;
    description?: string | null;
    startsAt: string;
    endsAt: string;
    sectionId?: string | null;
    lessonId?: string | null;
    providerKind?: string | null;
    providerRef?: string | null;
    reminderMinutesBefore?: number | null;
  }
): Promise<LiveCalendarResult<Record<string, unknown>>> {
  const bad = requireUuid(input.courseId, "course_id");
  if (bad) return bad;
  const result = await callRpc(supabase, LEARNING_LIVE_RPCS.createSession, {
    p_course_id: input.courseId,
    p_title: input.title,
    p_description: input.description ?? null,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_section_id: input.sectionId ?? null,
    p_lesson_id: input.lessonId ?? null,
    p_provider_kind: input.providerKind ?? "livekit",
    p_provider_ref: input.providerRef ?? null,
    p_reminder_minutes_before: input.reminderMinutesBefore ?? null,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function updateLearningLiveSession(
  supabase: AnyClient,
  input: {
    sessionId: string;
    title?: string | null;
    description?: string | null;
    startsAt?: string | null;
    endsAt?: string | null;
    sectionId?: string | null;
    lessonId?: string | null;
    providerKind?: string | null;
    providerRef?: string | null;
    reminderMinutesBefore?: number | null;
    clearSection?: boolean;
    clearLesson?: boolean;
  }
): Promise<LiveCalendarResult<Record<string, unknown>>> {
  const bad = requireUuid(input.sessionId, "session_id");
  if (bad) return bad;
  const result = await callRpc(supabase, LEARNING_LIVE_RPCS.updateSession, {
    p_session_id: input.sessionId,
    p_title: input.title ?? null,
    p_description: input.description ?? null,
    p_starts_at: input.startsAt ?? null,
    p_ends_at: input.endsAt ?? null,
    p_section_id: input.sectionId ?? null,
    p_lesson_id: input.lessonId ?? null,
    p_provider_kind: input.providerKind ?? null,
    p_provider_ref: input.providerRef ?? null,
    p_reminder_minutes_before: input.reminderMinutesBefore ?? null,
    p_clear_section: input.clearSection === true,
    p_clear_lesson: input.clearLesson === true,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function cancelLearningLiveSession(
  supabase: AnyClient,
  sessionId: string,
  reason?: string | null
): Promise<LiveCalendarResult<Record<string, unknown>>> {
  const bad = requireUuid(sessionId, "session_id");
  if (bad) return bad;
  const result = await callRpc(supabase, LEARNING_LIVE_RPCS.cancelSession, {
    p_session_id: sessionId,
    p_reason: reason ?? null,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function startLearningLiveSession(
  supabase: AnyClient,
  sessionId: string
): Promise<LiveCalendarResult<Record<string, unknown>>> {
  const bad = requireUuid(sessionId, "session_id");
  if (bad) return bad;
  const result = await callRpc(supabase, LEARNING_LIVE_RPCS.startSession, {
    p_session_id: sessionId,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function completeLearningLiveSession(
  supabase: AnyClient,
  sessionId: string
): Promise<LiveCalendarResult<Record<string, unknown>>> {
  const bad = requireUuid(sessionId, "session_id");
  if (bad) return bad;
  const result = await callRpc(supabase, LEARNING_LIVE_RPCS.completeSession, {
    p_session_id: sessionId,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function listLearningLiveSessionsForManage(
  supabase: AnyClient,
  courseId: string,
  scope: "upcoming" | "past" | "all" = "upcoming"
): Promise<LiveCalendarResult<Record<string, unknown>>> {
  const bad = requireUuid(courseId, "course_id");
  if (bad) return bad;
  const result = await callRpc(supabase, LEARNING_LIVE_RPCS.listForManage, {
    p_course_id: courseId,
    p_scope: scope,
  });
  if (!result.ok) return result;
  const row = asRecord(result.data);
  if (!row || asString(row.course_id) !== courseId) {
    return { ok: false, message: "Manage session list payload is malformed." };
  }
  return { ok: true, data: row };
}

export async function listMyLearningLiveSessions(
  supabase: AnyClient,
  courseId: string,
  scope: "upcoming" | "past" | "all" = "upcoming"
): Promise<LiveCalendarResult<Record<string, unknown>>> {
  const bad = requireUuid(courseId, "course_id");
  if (bad) return bad;
  const result = await callRpc(supabase, LEARNING_LIVE_RPCS.listMine, {
    p_course_id: courseId,
    p_scope: scope,
  });
  if (!result.ok) return result;
  const row = asRecord(result.data);
  if (!row || asString(row.course_id) !== courseId) {
    return { ok: false, message: "Learner session list payload is malformed." };
  }
  return { ok: true, data: row };
}

export async function getLearningLiveSession(
  supabase: AnyClient,
  sessionId: string
): Promise<LiveCalendarResult<Record<string, unknown>>> {
  const bad = requireUuid(sessionId, "session_id");
  if (bad) return bad;
  const result = await callRpc(supabase, LEARNING_LIVE_RPCS.getSession, {
    p_session_id: sessionId,
  });
  if (!result.ok) return result;
  const row = asRecord(result.data);
  if (!row || asString(row.session_id) !== sessionId) {
    return { ok: false, message: "Live session payload is malformed." };
  }
  return { ok: true, data: row };
}

export async function getLearningLiveSessionJoinGate(
  supabase: AnyClient,
  sessionId: string
): Promise<LiveCalendarResult<Record<string, unknown>>> {
  const bad = requireUuid(sessionId, "session_id");
  if (bad) return bad;
  const result = await callRpc(supabase, LEARNING_LIVE_RPCS.joinGate, {
    p_session_id: sessionId,
  });
  if (!result.ok) return result;
  const row = asRecord(result.data);
  if (!row || asString(row.session_id) !== sessionId) {
    return { ok: false, message: "Join gate payload is malformed." };
  }
  return { ok: true, data: row };
}

/**
 * Join readiness + optional LiveKit token.
 * Token minting reuses existing LiveKit server helpers only when:
 * - join gate says can_join
 * - LiveKit env is fully configured
 * Never trusts client for room identity / publish rights.
 */
export async function requestLearningLiveJoin(
  supabase: AnyClient,
  sessionId: string,
  displayName?: string | null
): Promise<LiveCalendarResult<LearningLiveJoinResult>> {
  const gateResult = await getLearningLiveSessionJoinGate(supabase, sessionId);
  if (!gateResult.ok) return gateResult;
  const gate = gateResult.data;
  const canJoin = asBoolean(gate.can_join);
  const mediaReady = isLiveKitConfigured();

  if (!canJoin) {
    return {
      ok: true,
      data: {
        gate,
        mediaReady,
        token: null,
        livekitUrl: null,
        roomName: null,
        identity: null,
        expiresAt: null,
        blocker: asString(gate.reason) ?? "unavailable",
      },
    };
  }

  const attendance = await callRpc(
    supabase,
    LEARNING_LIVE_RPCS.upsertAttendance,
    { p_session_id: sessionId, p_action: "join" }
  );
  if (!attendance.ok) return attendance;

  if (!mediaReady) {
    return {
      ok: true,
      data: {
        gate,
        mediaReady: false,
        token: null,
        livekitUrl: null,
        roomName: asString(gate.sfu_room_name),
        identity: asString(gate.identity),
        expiresAt: null,
        blocker:
          "Live media is not configured. Join readiness succeeded; token issuance is blocked.",
      },
    };
  }

  const roomName = asString(gate.sfu_room_name);
  const identity = asString(gate.identity);
  if (!roomName || !identity) {
    return {
      ok: false,
      message: "Join gate did not return safe room metadata.",
    };
  }

  const grants: LiveMediaGrants = {
    roomId: sessionId,
    status: asString(gate.status) ?? "scheduled",
    sfuRoomId: roomName,
    maxOnStage: 16,
    pinnedParticipantId: null,
    stageLayoutMode: "grid",
    currentSessionId: sessionId,
    identity,
    role: asString(gate.role) === "instructor" ? "host" : "viewer",
    stageStatus: asString(gate.role) === "instructor" ? "on_stage" : "audience",
    canSubscribe: true,
    canPublishAudio: asBoolean(gate.can_publish_audio),
    canPublishVideo: asBoolean(gate.can_publish_video),
    canShareScreen: asBoolean(gate.can_share_screen),
    mutedByHost: false,
    cameraDisabledByHost: false,
    queuePosition: null,
  };

  const minted = await mintLiveMediaToken({
    grants,
    displayName: displayName ?? null,
  });
  if ("error" in minted) {
    return {
      ok: true,
      data: {
        gate,
        mediaReady: true,
        token: null,
        livekitUrl: getPublicLiveKitUrl(),
        roomName,
        identity,
        expiresAt: null,
        blocker: minted.error,
      },
    };
  }

  return {
    ok: true,
    data: {
      gate,
      mediaReady: true,
      token: minted.token,
      livekitUrl: minted.livekitUrl,
      roomName: minted.roomName,
      identity: minted.identity,
      expiresAt: minted.expiresAt,
      blocker: null,
    },
  };
}

export async function upsertLearningLiveAttendance(
  supabase: AnyClient,
  sessionId: string,
  action: "join" | "heartbeat" | "leave" = "join"
): Promise<LiveCalendarResult<Record<string, unknown>>> {
  const bad = requireUuid(sessionId, "session_id");
  if (bad) return bad;
  const result = await callRpc(supabase, LEARNING_LIVE_RPCS.upsertAttendance, {
    p_session_id: sessionId,
    p_action: action,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function getMyLearningLiveAttendance(
  supabase: AnyClient,
  sessionId: string
): Promise<LiveCalendarResult<Record<string, unknown>>> {
  const bad = requireUuid(sessionId, "session_id");
  if (bad) return bad;
  const result = await callRpc(supabase, LEARNING_LIVE_RPCS.getMyAttendance, {
    p_session_id: sessionId,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function listLearningLiveSessionAttendance(
  supabase: AnyClient,
  sessionId: string
): Promise<LiveCalendarResult<Record<string, unknown>>> {
  const bad = requireUuid(sessionId, "session_id");
  if (bad) return bad;
  const result = await callRpc(supabase, LEARNING_LIVE_RPCS.listAttendance, {
    p_session_id: sessionId,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function getMyLearningCalendar(
  supabase: AnyClient,
  input: { from: string; to: string; courseId?: string | null }
): Promise<LiveCalendarResult<Record<string, unknown>>> {
  if (input.courseId) {
    const bad = requireUuid(input.courseId, "course_id");
    if (bad) return bad;
  }
  const result = await callRpc(supabase, LEARNING_LIVE_RPCS.myCalendar, {
    p_from: input.from,
    p_to: input.to,
    p_course_id: input.courseId ?? null,
  });
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export async function getInstructorLearningCalendar(
  supabase: AnyClient,
  input: { courseId: string; from: string; to: string }
): Promise<LiveCalendarResult<Record<string, unknown>>> {
  const bad = requireUuid(input.courseId, "course_id");
  if (bad) return bad;
  const result = await callRpc(
    supabase,
    LEARNING_LIVE_RPCS.instructorCalendar,
    {
      p_course_id: input.courseId,
      p_from: input.from,
      p_to: input.to,
    }
  );
  if (!result.ok) return result;
  return { ok: true, data: asRecord(result.data) ?? {} };
}

export function readLiveItems(
  payload: Record<string, unknown>,
  key: string
): Record<string, unknown>[] {
  return asArray(payload[key])
    .map(asRecord)
    .filter((row): row is Record<string, unknown> => row !== null);
}

export function readLiveString(
  row: Record<string, unknown>,
  key: string
): string | null {
  return asString(row[key]);
}

export function readLiveBoolean(
  row: Record<string, unknown>,
  key: string,
  fallback = false
): boolean {
  return asBoolean(row[key], fallback);
}
