import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isOpenDeletionStatus,
  isUniqueViolationCode,
  type AccountDeletionRequestRecord,
  type AccountDeletionStore,
  type AccountDeletionStatus,
} from "./requestAccountDeletion";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function parseRequestRow(
  value: unknown
): AccountDeletionRequestRecord | null {
  const row = asRecord(value);
  if (!row) {
    return null;
  }

  const id = typeof row.id === "string" ? row.id.trim() : "";
  const status = typeof row.status === "string" ? row.status.trim() : "";
  const requestedAt =
    typeof row.requested_at === "string" ? row.requested_at : "";

  if (!id || !status || !requestedAt) {
    return null;
  }

  return {
    id,
    status: status as AccountDeletionStatus,
    requestedAt,
  };
}

function userFacingInsertMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("row-level security") || lower.includes("permission")) {
    return "Unable to submit this request. Please sign in again.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "Network issue. Check your connection and try again.";
  }
  return "Unable to submit your deletion request. Please try again.";
}

export function createAccountDeletionStore(
  supabase: SupabaseClient
): AccountDeletionStore {
  return {
    async findOpenRequest(userId) {
      const { data, error } = await supabase
        .from("account_deletion_requests")
        .select("id, status, requested_at")
        .eq("user_id", userId)
        .in("status", ["pending", "processing"])
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("account_deletion_requests lookup failed:", error.code);
        return null;
      }

      const parsed = parseRequestRow(data);
      if (!parsed || !isOpenDeletionStatus(parsed.status)) {
        return null;
      }
      return parsed;
    },

    async insertPending({ userId, email }) {
      const { data, error } = await supabase
        .from("account_deletion_requests")
        .insert({
          user_id: userId,
          email,
          status: "pending",
          source: "web",
        })
        .select("id, status, requested_at")
        .single();

      if (error) {
        return {
          ok: false as const,
          uniqueViolation: isUniqueViolationCode(error.code),
          message: userFacingInsertMessage(error.message || ""),
        };
      }

      const record = parseRequestRow(data);
      if (!record) {
        return {
          ok: false as const,
          uniqueViolation: false,
          message: "Unable to submit your deletion request. Please try again.",
        };
      }

      return { ok: true as const, record };
    },
  };
}
