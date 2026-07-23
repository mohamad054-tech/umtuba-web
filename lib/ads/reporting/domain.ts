import { freezeReportingAuthority } from "./authority";

/**
 * Canonical reporting domain contracts V1 — read-only foundation.
 */

export const ADS_REPORT_TYPES = [
  "campaign",
  "ad_set",
  "creative",
  "placement",
  "advertiser",
  "platform",
] as const;

export type AdsReportType = (typeof ADS_REPORT_TYPES)[number];

export type AdsReportingDomainContract = Readonly<{
  contractVersion: "v1";
  reportType: AdsReportType;
  reportRef: string;
  title: string;
  readOnly: true;
  productionEnabled: false;
  deliveryEnabled: false;
  billingEnabled: false;
  productionAccepted: false;
  authoritativeProductionServing: false;
  triggersMeasurementIngestion: false;
  sourcesLiveDelivery: false;
  mutatesDatabase: false;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const REF_RE = /^[A-Za-z0-9_.:-]{1,128}$/;

export function isAdsReportType(value: unknown): value is AdsReportType {
  return (
    typeof value === "string" &&
    (ADS_REPORT_TYPES as readonly string[]).includes(value)
  );
}

export function parseAdsReportingDomainContract(
  input: unknown
):
  | { ok: true; report: AdsReportingDomainContract }
  | { ok: false; message: string; issues: readonly string[] } {
  if (!isRecord(input)) {
    return {
      ok: false,
      message: "Reporting domain contract must be an object.",
      issues: Object.freeze(["Reporting domain contract must be an object."]),
    };
  }
  const issues: string[] = [];
  if (input.contractVersion != null && input.contractVersion !== "v1") {
    issues.push('contractVersion must be "v1".');
  }
  if (!isAdsReportType(input.reportType)) {
    issues.push("reportType is not a registered Ads report type.");
  }
  if (typeof input.reportRef !== "string" || !REF_RE.test(input.reportRef.trim())) {
    issues.push("reportRef must be 1–128 chars of [A-Za-z0-9_.:-].");
  }
  if (
    typeof input.title !== "string" ||
    input.title.trim().length < 1 ||
    input.title.trim().length > 160
  ) {
    issues.push("title must be 1–160 characters.");
  }
  if (issues.length > 0) {
    return {
      ok: false,
      message: issues[0] ?? "Invalid reporting domain contract.",
      issues: Object.freeze(issues),
    };
  }
  return {
    ok: true,
    report: freezeReportingAuthority({
      contractVersion: "v1" as const,
      reportType: input.reportType as AdsReportType,
      reportRef: String(input.reportRef).trim(),
      title: String(input.title).trim(),
      readOnly: true as const,
    }),
  };
}
