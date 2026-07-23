import { freezeReportingAuthority } from "./authority";

/**
 * Aggregation foundation V1 — contracts only, no production ingestion.
 */

export const ADS_REPORT_AGGREGATION_GRANULARITIES = [
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "custom_range",
] as const;

export type AdsReportAggregationGranularity =
  (typeof ADS_REPORT_AGGREGATION_GRANULARITIES)[number];

export type AdsReportAggregationContract = Readonly<{
  contractVersion: "v1";
  granularity: AdsReportAggregationGranularity;
  rangeStart: string;
  rangeEnd: string;
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

export function isAdsReportAggregationGranularity(
  value: unknown
): value is AdsReportAggregationGranularity {
  return (
    typeof value === "string" &&
    (ADS_REPORT_AGGREGATION_GRANULARITIES as readonly string[]).includes(value)
  );
}

export function parseAdsReportAggregationContract(
  input: unknown
):
  | { ok: true; aggregation: AdsReportAggregationContract }
  | { ok: false; message: string; issues: readonly string[] } {
  if (!isRecord(input)) {
    return {
      ok: false,
      message: "Aggregation contract must be an object.",
      issues: Object.freeze(["Aggregation contract must be an object."]),
    };
  }
  const issues: string[] = [];
  if (input.contractVersion != null && input.contractVersion !== "v1") {
    issues.push('contractVersion must be "v1".');
  }
  if (!isAdsReportAggregationGranularity(input.granularity)) {
    issues.push("granularity is not a supported aggregation.");
  }
  if (
    typeof input.rangeStart !== "string" ||
    Number.isNaN(Date.parse(input.rangeStart))
  ) {
    issues.push("rangeStart must be a valid ISO timestamp.");
  }
  if (
    typeof input.rangeEnd !== "string" ||
    Number.isNaN(Date.parse(input.rangeEnd))
  ) {
    issues.push("rangeEnd must be a valid ISO timestamp.");
  }
  if (
    typeof input.rangeStart === "string" &&
    typeof input.rangeEnd === "string" &&
    !Number.isNaN(Date.parse(input.rangeStart)) &&
    !Number.isNaN(Date.parse(input.rangeEnd)) &&
    Date.parse(input.rangeEnd) < Date.parse(input.rangeStart)
  ) {
    issues.push("rangeEnd must be >= rangeStart.");
  }
  // Soft max window: 366 days
  if (
    typeof input.rangeStart === "string" &&
    typeof input.rangeEnd === "string" &&
    !Number.isNaN(Date.parse(input.rangeStart)) &&
    !Number.isNaN(Date.parse(input.rangeEnd))
  ) {
    const span = Date.parse(input.rangeEnd) - Date.parse(input.rangeStart);
    if (span > 366 * 24 * 60 * 60 * 1000) {
      issues.push("custom/date range cannot exceed 366 days.");
    }
  }
  if (issues.length > 0) {
    return {
      ok: false,
      message: issues[0] ?? "Invalid aggregation contract.",
      issues: Object.freeze(issues),
    };
  }
  return {
    ok: true,
    aggregation: freezeReportingAuthority({
      contractVersion: "v1" as const,
      granularity: input.granularity as AdsReportAggregationGranularity,
      rangeStart: String(input.rangeStart),
      rangeEnd: String(input.rangeEnd),
    }),
  };
}
