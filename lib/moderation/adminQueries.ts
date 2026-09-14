import type { SupabaseClient } from "@supabase/supabase-js";
import { ADMIN_UGC_LIST_RPC } from "./operatorActions";

type AnyClient = SupabaseClient;

export const UGC_REPORT_STATUS_FILTERS = [
  "open",
  "reviewing",
  "resolved",
  "dismissed",
  "all",
] as const;

export type UgcReportStatusFilter = (typeof UGC_REPORT_STATUS_FILTERS)[number];

export type AdminUgcReportRow = {
  id: string;
  reporter_id: string;
  reporter_username: string | null;
  target_type: "content" | "user" | string;
  target_user_id: string | null;
  target_username: string | null;
  target_post_id: number | null;
  post_content: string | null;
  post_author_username: string | null;
  post_deleted_at: string | null;
  reason_code: string;
  reason_detail: string | null;
  status: string;
  created_at: string;
};

export function parseUgcReportStatusFilter(raw: string | undefined): UgcReportStatusFilter {
  const value = (raw || "open").trim().toLowerCase();
  return (UGC_REPORT_STATUS_FILTERS as readonly string[]).includes(value)
    ? (value as UgcReportStatusFilter)
    : "open";
}

export async function adminListUgcReports(
  supabase: AnyClient,
  filters: { status?: string | null }
): Promise<
  { ok: true; rows: AdminUgcReportRow[] } | { ok: false; messageKey: "admin.moderation.loadError" }
> {
  const status = parseUgcReportStatusFilter(filters.status ?? undefined);
  const { data, error } = await supabase.rpc(ADMIN_UGC_LIST_RPC, {
    p_status: status,
    p_limit: 50,
    p_offset: 0,
  });
  if (error) {
    console.error(ADMIN_UGC_LIST_RPC, error);
    return { ok: false, messageKey: "admin.moderation.loadError" };
  }
  return {
    ok: true,
    rows: ((data ?? []) as AdminUgcReportRow[]).map((row) => ({
      ...row,
      target_post_id:
        row.target_post_id == null ? null : Number(row.target_post_id),
    })),
  };
}
