import type { SupabaseClient } from "@supabase/supabase-js";
import type { TranslationKey } from "../i18n/messages/types";
import { isReportPostId, isReportUuid } from "./ugcReport";

type AnyClient = SupabaseClient;

export const ADMIN_UGC_LIST_RPC = "admin_list_ugc_reports";
export const ADMIN_RESOLVE_REPORT_RPC = "admin_resolve_ugc_report";
export const ADMIN_SET_USER_STATUS_RPC = "admin_set_user_moderation_status";
export const ADMIN_TAKEDOWN_POST_RPC = "admin_takedown_post";
export const ADMIN_RESTORE_POST_RPC = "admin_restore_post";

export type ModerationErrorKey = Extract<
  TranslationKey,
  | "admin.moderation.error.generic"
  | "admin.moderation.error.forbidden"
  | "admin.moderation.error.notFound"
  | "admin.moderation.error.reason"
  | "admin.moderation.error.own"
  | "admin.moderation.error.adminTarget"
  | "admin.moderation.error.confirm"
  | "admin.moderation.error.noPost"
  | "admin.moderation.error.noUser"
  | "admin.moderation.loadError"
>;

export type ModerationOkKey = Extract<
  TranslationKey,
  | "admin.moderation.ok.dismissed"
  | "admin.moderation.ok.removed"
  | "admin.moderation.ok.suspended"
  | "admin.moderation.ok.banned"
>;

export function validateOperatorReason(
  note: string
): { ok: true; note: string } | { ok: false; key: ModerationErrorKey } {
  const trimmed = note.trim();
  if (trimmed.length < 3) {
    return { ok: false, key: "admin.moderation.error.reason" };
  }
  if (trimmed.length > 2000) {
    return { ok: false, key: "admin.moderation.error.reason" };
  }
  return { ok: true, note: trimmed };
}

export function mapModerationRpcError(
  message: string | undefined
): ModerationErrorKey {
  const raw = (message || "").toLowerCase();
  if (raw.includes("cannot moderate your own")) {
    return "admin.moderation.error.own";
  }
  if (raw.includes("cannot moderate a platform admin")) {
    return "admin.moderation.error.adminTarget";
  }
  if (raw.includes("platform admin") || raw.includes("authentication")) {
    return "admin.moderation.error.forbidden";
  }
  if (raw.includes("not found")) {
    return "admin.moderation.error.notFound";
  }
  if (raw.includes("reason is required") || raw.includes("note is too long")) {
    return "admin.moderation.error.reason";
  }
  return "admin.moderation.error.generic";
}

async function callAdminRpc(
  supabase: AnyClient,
  name: string,
  args: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; key: ModerationErrorKey }> {
  const { error } = await supabase.rpc(name, args);
  if (error) {
    console.error(name, error);
    return { ok: false, key: mapModerationRpcError(error.message) };
  }
  return { ok: true };
}

export async function resolveUgcReportAdmin(
  supabase: AnyClient,
  reportId: string,
  status: "reviewing" | "resolved" | "dismissed",
  note: string
) {
  if (!isReportUuid(reportId)) {
    return { ok: false as const, key: "admin.moderation.error.notFound" as const };
  }
  const reason = validateOperatorReason(note);
  if (!reason.ok) return reason;
  return callAdminRpc(supabase, ADMIN_RESOLVE_REPORT_RPC, {
    p_report_id: reportId.trim(),
    p_new_status: status,
    p_note: reason.note,
  });
}

export async function setUserModerationStatusAdmin(
  supabase: AnyClient,
  targetUserId: string,
  status: "active" | "shadowbanned" | "suspended" | "banned",
  reason: string
) {
  if (!isReportUuid(targetUserId)) {
    return { ok: false as const, key: "admin.moderation.error.noUser" as const };
  }
  const note = validateOperatorReason(reason);
  if (!note.ok) return note;
  return callAdminRpc(supabase, ADMIN_SET_USER_STATUS_RPC, {
    p_target_user_id: targetUserId.trim(),
    p_new_status: status,
    p_reason: note.note,
  });
}

export async function takedownPostAdmin(
  supabase: AnyClient,
  postId: number,
  reason: string
) {
  if (!isReportPostId(postId)) {
    return { ok: false as const, key: "admin.moderation.error.noPost" as const };
  }
  const note = validateOperatorReason(reason);
  if (!note.ok) return note;
  return callAdminRpc(supabase, ADMIN_TAKEDOWN_POST_RPC, {
    p_post_id: postId,
    p_reason: note.note,
  });
}
