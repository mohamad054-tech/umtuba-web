/**
 * CSP report-only intake helpers.
 * Compact logs only (directive, blocked host, page path). Never persist.
 */

export const CSP_REPORT_MAX_BODY_BYTES = 8192;

export type CompactCspReport = {
  directive: string;
  blockedHost: string;
  pagePath: string;
};

const TOKEN_BLOCKED = new Set([
  "inline",
  "eval",
  "data",
  "blob",
  "self",
  "none",
  "unknown",
]);

export async function readBodyCapped(
  request: Request,
  maxBytes = CSP_REPORT_MAX_BODY_BYTES
): Promise<string | null> {
  const declared = Number(request.headers.get("content-length") || "0");
  if (Number.isFinite(declared) && declared > maxBytes) {
    return null;
  }

  if (!request.body) {
    return "";
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  if (chunks.length === 0) return "";
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readString(record: Record<string, unknown> | null, keys: string[]): string {
  if (!record) return "";
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

export function blockedHostOnly(blockedUri: string): string {
  const raw = blockedUri.trim();
  if (!raw) return "unknown";
  const lower = raw.toLowerCase();
  if (TOKEN_BLOCKED.has(lower)) return lower;
  if (lower.startsWith("data:")) return "data";
  if (lower.startsWith("blob:")) return "blob";
  try {
    const url = new URL(raw);
    return url.hostname || "unknown";
  } catch {
    return "invalid";
  }
}

export function pagePathOnly(documentUri: string): string {
  const raw = documentUri.trim();
  if (!raw) return "/";
  try {
    const path = new URL(raw).pathname;
    return path || "/";
  } catch {
    if (raw.startsWith("/")) {
      return raw.split("?")[0] || "/";
    }
    return "/";
  }
}

function compactFromFields(fields: {
  directive: string;
  blocked: string;
  document: string;
}): CompactCspReport {
  return {
    directive: fields.directive || "unknown",
    blockedHost: blockedHostOnly(fields.blocked),
    pagePath: pagePathOnly(fields.document),
  };
}

function compactFromLegacyReport(value: unknown): CompactCspReport | null {
  const root = asRecord(value);
  const report = asRecord(root?.["csp-report"]) ?? root;
  if (!report) return null;
  const directive = readString(report, [
    "effective-directive",
    "violated-directive",
    "effectiveDirective",
    "violatedDirective",
  ]);
  const blocked = readString(report, [
    "blocked-uri",
    "blockedURI",
    "blocked-url",
    "blockedURL",
  ]);
  const document = readString(report, [
    "document-uri",
    "documentURI",
    "document-url",
    "documentURL",
    "source-file",
  ]);
  if (!directive && !blocked && !document) return null;
  return compactFromFields({ directive, blocked, document });
}

function compactFromReportingApi(value: unknown): CompactCspReport | null {
  const item = asRecord(value);
  if (!item) return null;
  const body = asRecord(item.body) ?? item;
  const directive = readString(body, [
    "effectiveDirective",
    "effective-directive",
    "violatedDirective",
    "violated-directive",
    "directive",
  ]);
  const blocked = readString(body, [
    "blockedURL",
    "blocked-url",
    "blockedURI",
    "blocked-uri",
  ]);
  const document = readString(body, [
    "documentURL",
    "document-url",
    "documentURI",
    "document-uri",
  ]) || readString(item, ["url"]);
  if (!directive && !blocked && !document) return null;
  return compactFromFields({ directive, blocked, document });
}

export function parseCspReports(payload: unknown): CompactCspReport[] {
  if (Array.isArray(payload)) {
    return payload
      .map((item) => compactFromReportingApi(item) ?? compactFromLegacyReport(item))
      .filter((item): item is CompactCspReport => item != null);
  }

  const reporting = compactFromReportingApi(payload);
  if (reporting) return [reporting];

  const legacy = compactFromLegacyReport(payload);
  return legacy ? [legacy] : [];
}

export function formatCspReportLogLine(report: CompactCspReport): string {
  return `[csp-report] directive=${report.directive} blocked=${report.blockedHost} path=${report.pagePath}`;
}

export function logCspReports(reports: CompactCspReport[]): void {
  if (reports.length === 0) {
    console.info("[csp-report] directive=unknown blocked=unknown path=/");
    return;
  }
  for (const report of reports) {
    console.info(formatCspReportLogLine(report));
  }
}
