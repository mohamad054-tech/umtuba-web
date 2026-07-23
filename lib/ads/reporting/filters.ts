import { freezeReportingAuthority } from "./authority";

/**
 * Filtering & dimensions foundation V1 — validation only.
 */

export const ADS_REPORT_DIMENSIONS = [
  "advertiser",
  "campaign",
  "ad_set",
  "creative",
  "placement",
  "geography",
  "device",
  "language",
] as const;

export type AdsReportDimension = (typeof ADS_REPORT_DIMENSIONS)[number];

export type AdsReportFilterClause = Readonly<{
  dimension: AdsReportDimension;
  values: readonly string[];
}>;

export type AdsReportFilterContract = Readonly<{
  contractVersion: "v1";
  filters: readonly AdsReportFilterClause[];
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

const VALUE_RE = /^[A-Za-z0-9_.:-]{1,128}$/;

export function isAdsReportDimension(
  value: unknown
): value is AdsReportDimension {
  return (
    typeof value === "string" &&
    (ADS_REPORT_DIMENSIONS as readonly string[]).includes(value)
  );
}

export function parseAdsReportFilterContract(
  input: unknown
):
  | { ok: true; filters: AdsReportFilterContract }
  | { ok: false; message: string; issues: readonly string[] } {
  if (!isRecord(input)) {
    return {
      ok: false,
      message: "Filter contract must be an object.",
      issues: Object.freeze(["Filter contract must be an object."]),
    };
  }
  const issues: string[] = [];
  if (input.contractVersion != null && input.contractVersion !== "v1") {
    issues.push('contractVersion must be "v1".');
  }
  if (!Array.isArray(input.filters)) {
    issues.push("filters must be an array.");
    return {
      ok: false,
      message: "filters must be an array.",
      issues: Object.freeze(issues),
    };
  }
  if (input.filters.length > 32) {
    issues.push("filters exceeds max length of 32.");
  }

  const clauses: AdsReportFilterClause[] = [];
  const seenDimensions = new Set<string>();
  for (let i = 0; i < input.filters.length; i++) {
    const row = input.filters[i];
    if (!isRecord(row)) {
      issues.push(`filters[${i}] must be an object.`);
      continue;
    }
    if (!isAdsReportDimension(row.dimension)) {
      issues.push(`filters[${i}].dimension is invalid.`);
      continue;
    }
    if (seenDimensions.has(row.dimension)) {
      issues.push(`filters[${i}].dimension is duplicated.`);
      continue;
    }
    seenDimensions.add(row.dimension);
    if (!Array.isArray(row.values) || row.values.length === 0) {
      issues.push(`filters[${i}].values must be a non-empty array.`);
      continue;
    }
    if (row.values.length > 64) {
      issues.push(`filters[${i}].values exceeds max length of 64.`);
      continue;
    }
    const values: string[] = [];
    for (let j = 0; j < row.values.length; j++) {
      const value = row.values[j];
      if (typeof value !== "string" || !VALUE_RE.test(value.trim())) {
        issues.push(
          `filters[${i}].values[${j}] must be 1–128 chars of [A-Za-z0-9_.:-].`
        );
        continue;
      }
      values.push(value.trim());
    }
    if (values.length === 0) {
      issues.push(`filters[${i}].values has no valid entries.`);
      continue;
    }
    clauses.push(
      Object.freeze({
        dimension: row.dimension,
        values: Object.freeze(values),
      })
    );
  }

  if (issues.length > 0) {
    return {
      ok: false,
      message: issues[0] ?? "Invalid filter contract.",
      issues: Object.freeze(issues),
    };
  }

  return {
    ok: true,
    filters: freezeReportingAuthority({
      contractVersion: "v1" as const,
      filters: Object.freeze(clauses),
    }),
  };
}
