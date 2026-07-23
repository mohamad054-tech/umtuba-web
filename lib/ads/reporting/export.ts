import { freezeReportingAuthority } from "./authority";

/**
 * Export foundation V1 — contracts only.
 * No file generation, downloads, or storage writes.
 */

export const ADS_REPORT_EXPORT_FORMATS = ["csv", "json"] as const;

export type AdsReportExportFormat = (typeof ADS_REPORT_EXPORT_FORMATS)[number];

export type AdsReportExportContract = Readonly<{
  contractVersion: "v1";
  format: AdsReportExportFormat;
  includeHeaders: boolean;
  /** Always false in V1 — contracts only, no files produced. */
  generatesFile: false;
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

export function isAdsReportExportFormat(
  value: unknown
): value is AdsReportExportFormat {
  return (
    typeof value === "string" &&
    (ADS_REPORT_EXPORT_FORMATS as readonly string[]).includes(value)
  );
}

export function parseAdsReportExportContract(
  input: unknown
):
  | { ok: true; exportContract: AdsReportExportContract }
  | { ok: false; message: string; issues: readonly string[] } {
  if (!isRecord(input)) {
    return {
      ok: false,
      message: "Export contract must be an object.",
      issues: Object.freeze(["Export contract must be an object."]),
    };
  }
  const issues: string[] = [];
  if (input.contractVersion != null && input.contractVersion !== "v1") {
    issues.push('contractVersion must be "v1".');
  }
  if (!isAdsReportExportFormat(input.format)) {
    issues.push("format must be csv or json.");
  }
  if (input.includeHeaders != null && typeof input.includeHeaders !== "boolean") {
    issues.push("includeHeaders must be a boolean when provided.");
  }
  if (input.generatesFile === true) {
    issues.push("generatesFile must remain false in Export Foundation V1.");
  }
  if (issues.length > 0) {
    return {
      ok: false,
      message: issues[0] ?? "Invalid export contract.",
      issues: Object.freeze(issues),
    };
  }
  return {
    ok: true,
    exportContract: freezeReportingAuthority({
      contractVersion: "v1" as const,
      format: input.format as AdsReportExportFormat,
      includeHeaders:
        typeof input.includeHeaders === "boolean" ? input.includeHeaders : true,
      generatesFile: false as const,
    }),
  };
}
