import { freezeReportingAuthority } from "./authority";

/**
 * Canonical analytics models V1.
 * Metrics are computed/placeholder only — never sourced from live delivery.
 */

export const ADS_ANALYTICS_METRIC_KEYS = [
  "impressions",
  "clicks",
  "reach",
  "frequency",
  "spend",
  "conversions",
  "engagement",
  "ctr",
  "cpm",
  "cpc",
] as const;

export type AdsAnalyticsMetricKey = (typeof ADS_ANALYTICS_METRIC_KEYS)[number];

/** Metrics that are explicit placeholders (never live-sourced in V1). */
export const ADS_ANALYTICS_PLACEHOLDER_METRICS = [
  "spend",
  "conversions",
] as const satisfies readonly AdsAnalyticsMetricKey[];

export type AdsAnalyticsMetricValue = Readonly<{
  key: AdsAnalyticsMetricKey;
  value: number;
  placeholder: boolean;
  sourcedFromLiveDelivery: false;
}>;

export type AdsAnalyticsModel = Readonly<{
  contractVersion: "v1";
  metrics: readonly AdsAnalyticsMetricValue[];
  computedOnly: true;
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

export function isAdsAnalyticsMetricKey(
  value: unknown
): value is AdsAnalyticsMetricKey {
  return (
    typeof value === "string" &&
    (ADS_ANALYTICS_METRIC_KEYS as readonly string[]).includes(value)
  );
}

export function isAdsAnalyticsPlaceholderMetric(
  key: AdsAnalyticsMetricKey
): boolean {
  return (ADS_ANALYTICS_PLACEHOLDER_METRICS as readonly string[]).includes(key);
}

/**
 * Build a placeholder analytics model from requested metric keys.
 * All values are zeroed foundation placeholders — not live delivery data.
 */
export function buildAdsPlaceholderAnalyticsModel(
  metricKeys: readonly AdsAnalyticsMetricKey[]
):
  | { ok: true; model: AdsAnalyticsModel }
  | { ok: false; message: string; issues: readonly string[] } {
  if (!Array.isArray(metricKeys) || metricKeys.length === 0) {
    return {
      ok: false,
      message: "At least one analytics metric is required.",
      issues: Object.freeze(["metricKeys must be a non-empty array."]),
    };
  }
  if (metricKeys.length > 32) {
    return {
      ok: false,
      message: "Too many analytics metrics requested.",
      issues: Object.freeze(["metricKeys exceeds max length of 32."]),
    };
  }
  const issues: string[] = [];
  const seen = new Set<string>();
  const metrics: AdsAnalyticsMetricValue[] = [];
  for (let i = 0; i < metricKeys.length; i++) {
    const key = metricKeys[i];
    if (!isAdsAnalyticsMetricKey(key)) {
      issues.push(`metricKeys[${i}] is not a supported analytics metric.`);
      continue;
    }
    if (seen.has(key)) {
      issues.push(`metricKeys[${i}] is duplicated.`);
      continue;
    }
    seen.add(key);
    metrics.push(
      Object.freeze({
        key,
        value: 0,
        placeholder: true,
        sourcedFromLiveDelivery: false as const,
      })
    );
  }
  if (issues.length > 0 || metrics.length === 0) {
    return {
      ok: false,
      message: issues[0] ?? "Invalid analytics metrics.",
      issues: Object.freeze(
        issues.length > 0 ? issues : ["No valid metrics provided."]
      ),
    };
  }
  return {
    ok: true,
    model: freezeReportingAuthority({
      contractVersion: "v1" as const,
      metrics: Object.freeze(metrics),
      computedOnly: true as const,
    }),
  };
}

export function parseAdsAnalyticsModel(
  input: unknown
):
  | { ok: true; model: AdsAnalyticsModel }
  | { ok: false; message: string; issues: readonly string[] } {
  if (!isRecord(input)) {
    return {
      ok: false,
      message: "Analytics model must be an object.",
      issues: Object.freeze(["Analytics model must be an object."]),
    };
  }
  if (!Array.isArray(input.metrics)) {
    return {
      ok: false,
      message: "metrics must be an array.",
      issues: Object.freeze(["metrics must be an array."]),
    };
  }
  const keys: AdsAnalyticsMetricKey[] = [];
  const issues: string[] = [];
  for (let i = 0; i < input.metrics.length; i++) {
    const row = input.metrics[i];
    if (!isRecord(row) || !isAdsAnalyticsMetricKey(row.key)) {
      issues.push(`metrics[${i}].key is unsupported.`);
      continue;
    }
    if (row.sourcedFromLiveDelivery === true) {
      issues.push(`metrics[${i}] cannot claim live delivery sourcing.`);
      continue;
    }
    if (typeof row.value !== "number" || !Number.isFinite(row.value) || row.value < 0) {
      issues.push(`metrics[${i}].value must be a non-negative finite number.`);
      continue;
    }
    keys.push(row.key);
  }
  if (issues.length > 0) {
    return {
      ok: false,
      message: issues[0] ?? "Invalid analytics model.",
      issues: Object.freeze(issues),
    };
  }
  // Rebuild as placeholder model — values are never trusted as live.
  return buildAdsPlaceholderAnalyticsModel(keys);
}
