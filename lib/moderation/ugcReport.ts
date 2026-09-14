export const UGC_REASON_CODES = [
  "spam",
  "harassment",
  "hate",
  "sexual",
  "violence",
  "illegal",
  "impersonation",
  "other",
] as const;

export type UgcReasonCode = (typeof UGC_REASON_CODES)[number];

export const UGC_REASON_I18N_KEYS = {
  spam: "report.reason.spam",
  harassment: "report.reason.harassment",
  hate: "report.reason.hate",
  sexual: "report.reason.sexual",
  violence: "report.reason.violence",
  illegal: "report.reason.illegal",
  impersonation: "report.reason.impersonation",
  other: "report.reason.other",
} as const;

export type UgcReportErrorKey =
  | "report.error.auth"
  | "report.error.own"
  | "report.error.already"
  | "report.error.generic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUgcReasonCode(value: string): value is UgcReasonCode {
  return (UGC_REASON_CODES as readonly string[]).includes(value);
}

export function isReportUuid(value: string): boolean {
  return UUID_RE.test(value.trim());
}

export function isReportPostId(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

export function normalizeReasonDetail(
  detail: string | null | undefined
): { ok: true; detail: string | null } | { ok: false; key: UgcReportErrorKey } {
  const trimmed = typeof detail === "string" ? detail.trim() : "";
  if (!trimmed) {
    return { ok: true, detail: null };
  }
  if (trimmed.length > 1000) {
    return { ok: false, key: "report.error.generic" };
  }
  return { ok: true, detail: trimmed };
}

export function mapUgcReportRpcError(message: string | undefined): UgcReportErrorKey {
  const raw = (message || "").toLowerCase();
  if (
    raw.includes("authentication required") ||
    raw.includes("authentication")
  ) {
    return "report.error.auth";
  }
  if (
    raw.includes("cannot report your own") ||
    raw.includes("cannot report yourself")
  ) {
    return "report.error.own";
  }
  if (raw.includes("already reported")) {
    return "report.error.already";
  }
  return "report.error.generic";
}
