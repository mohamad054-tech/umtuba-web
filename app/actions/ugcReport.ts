"use server";

import {
  isReportPostId,
  isReportUuid,
  isUgcReasonCode,
  mapUgcReportRpcError,
  normalizeReasonDetail,
  type UgcReportErrorKey,
} from "../../lib/moderation/ugcReport";
import { createClient, getServerUser } from "../../lib/supabase/server";
import { consumeNamedActionRateLimit } from "../../lib/security/actionRateLimit";

export type UgcReportActionResult =
  | { ok: true }
  | { ok: false; key: UgcReportErrorKey };

export async function reportUgcContentAction(input: {
  postId: number;
  reasonCode: string;
  reasonDetail?: string | null;
}): Promise<UgcReportActionResult> {
  if (!isReportPostId(input.postId) || !isUgcReasonCode(input.reasonCode)) {
    return { ok: false, key: "report.error.generic" };
  }
  const detail = normalizeReasonDetail(input.reasonDetail);
  if (!detail.ok) return detail;

  const user = await getServerUser();
  if (!user) {
    return { ok: false, key: "report.error.auth" };
  }
  const limit = await consumeNamedActionRateLimit("report", user.id);
  if (!limit.ok) {
    return { ok: false, key: "report.error.rate" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("report_ugc_content", {
    p_post_id: input.postId,
    p_reason_code: input.reasonCode,
    p_reason_detail: detail.detail,
  });
  if (error) {
    console.error("report_ugc_content", error);
    return { ok: false, key: mapUgcReportRpcError(error.message) };
  }
  return { ok: true };
}

export async function reportUgcUserAction(input: {
  userId: string;
  reasonCode: string;
  reasonDetail?: string | null;
}): Promise<UgcReportActionResult> {
  if (!isReportUuid(input.userId) || !isUgcReasonCode(input.reasonCode)) {
    return { ok: false, key: "report.error.generic" };
  }
  const detail = normalizeReasonDetail(input.reasonDetail);
  if (!detail.ok) return detail;

  const user = await getServerUser();
  if (!user) {
    return { ok: false, key: "report.error.auth" };
  }
  const limit = await consumeNamedActionRateLimit("report", user.id);
  if (!limit.ok) {
    return { ok: false, key: "report.error.rate" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("report_ugc_user", {
    p_user_id: input.userId.trim(),
    p_reason_code: input.reasonCode,
    p_reason_detail: detail.detail,
  });
  if (error) {
    console.error("report_ugc_user", error);
    return { ok: false, key: mapUgcReportRpcError(error.message) };
  }
  return { ok: true };
}
