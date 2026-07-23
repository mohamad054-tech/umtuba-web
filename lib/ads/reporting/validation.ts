import {
  parseAdsReportAggregationContract,
  type AdsReportAggregationContract,
} from "./aggregation";
import {
  buildAdsPlaceholderAnalyticsModel,
  isAdsAnalyticsMetricKey,
  type AdsAnalyticsMetricKey,
  type AdsAnalyticsModel,
} from "./analytics";
import {
  ADS_REPORTING_AUTHORITY,
  assertReportingAuthorityClosed,
} from "./authority";
import {
  parseAdsReportingDomainContract,
  type AdsReportingDomainContract,
} from "./domain";
import {
  parseAdsReportExportContract,
  type AdsReportExportContract,
} from "./export";
import {
  parseAdsReportFilterContract,
  type AdsReportFilterContract,
} from "./filters";

/**
 * Centralized Reporting & Analytics validation V1.
 * Fail closed. Never enables production serving/billing/ingestion.
 */

export const ADS_REPORTING_VALIDATION_CONTRACT_VERSION = "v1" as const;

export type AdsReportingRequestBundle = Readonly<{
  domain: AdsReportingDomainContract;
  metrics: readonly AdsAnalyticsMetricKey[];
  aggregation: AdsReportAggregationContract;
  filters: AdsReportFilterContract;
  export: AdsReportExportContract;
  analytics: AdsAnalyticsModel;
}>;

export type AdsReportingValidationReport = Readonly<{
  contractVersion: typeof ADS_REPORTING_VALIDATION_CONTRACT_VERSION;
  ok: boolean;
  issues: readonly string[];
  request: AdsReportingRequestBundle | null;
  productionEnabled: false;
  productionAccepted: false;
  authoritativeProductionServing: false;
  billingEnabled: false;
  deliveryEnabled: false;
  triggersMeasurementIngestion: false;
  sourcesLiveDelivery: false;
  mutatesDatabase: false;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validate a full reporting request bundle.
 * Accepts either `metrics: string[]` or a full analytics model under `analytics`.
 */
export function validateAdsReportingRequest(
  input: unknown
): AdsReportingValidationReport {
  if (!isRecord(input)) {
    return Object.freeze({
      contractVersion: ADS_REPORTING_VALIDATION_CONTRACT_VERSION,
      ok: false,
      issues: Object.freeze(["Reporting request must be an object."]),
      request: null,
      ...ADS_REPORTING_AUTHORITY,
    });
  }

  const issues: string[] = [];

  const authority = assertReportingAuthorityClosed(input);
  if (!authority.ok) {
    issues.push(...authority.issues);
  }

  const domainParsed = parseAdsReportingDomainContract(
    input.domain ?? {
      reportType: input.reportType,
      reportRef: input.reportRef,
      title: input.title,
      contractVersion: input.contractVersion,
    }
  );
  if (!domainParsed.ok) {
    issues.push(...domainParsed.issues);
  }

  const aggregationParsed = parseAdsReportAggregationContract(
    input.aggregation ?? {
      granularity: input.granularity,
      rangeStart: input.rangeStart,
      rangeEnd: input.rangeEnd,
      contractVersion: input.contractVersion,
    }
  );
  if (!aggregationParsed.ok) {
    issues.push(...aggregationParsed.issues);
  }

  const filtersParsed = parseAdsReportFilterContract(
    input.filters ?? { filters: [], contractVersion: "v1" }
  );
  if (!filtersParsed.ok) {
    issues.push(...filtersParsed.issues);
  }

  const exportParsed = parseAdsReportExportContract(
    input.export ?? {
      format: input.format ?? "json",
      includeHeaders: true,
      contractVersion: "v1",
    }
  );
  if (!exportParsed.ok) {
    issues.push(...exportParsed.issues);
  }

  let metricKeys: AdsAnalyticsMetricKey[] = [];
  if (Array.isArray(input.metrics)) {
    for (let i = 0; i < input.metrics.length; i++) {
      const key = input.metrics[i];
      if (!isAdsAnalyticsMetricKey(key)) {
        issues.push(`metrics[${i}] is not a supported analytics metric.`);
        continue;
      }
      metricKeys.push(key);
    }
  } else if (isRecord(input.analytics) && Array.isArray(input.analytics.metrics)) {
    for (let i = 0; i < input.analytics.metrics.length; i++) {
      const row = input.analytics.metrics[i];
      if (!isRecord(row) || !isAdsAnalyticsMetricKey(row.key)) {
        issues.push(`analytics.metrics[${i}].key is unsupported.`);
        continue;
      }
      if (row.sourcedFromLiveDelivery === true) {
        issues.push(
          `analytics.metrics[${i}] cannot claim live delivery sourcing.`
        );
        continue;
      }
      metricKeys.push(row.key);
    }
  } else {
    issues.push("metrics (or analytics.metrics) is required.");
  }

  const analyticsBuilt =
    metricKeys.length > 0
      ? buildAdsPlaceholderAnalyticsModel(metricKeys)
      : {
          ok: false as const,
          message: "No valid metrics.",
          issues: Object.freeze(["No valid metrics."]) as readonly string[],
        };
  if (!analyticsBuilt.ok) {
    issues.push(...analyticsBuilt.issues);
  }

  if (
    issues.length > 0 ||
    !domainParsed.ok ||
    !aggregationParsed.ok ||
    !filtersParsed.ok ||
    !exportParsed.ok ||
    !analyticsBuilt.ok
  ) {
    return Object.freeze({
      contractVersion: ADS_REPORTING_VALIDATION_CONTRACT_VERSION,
      ok: false,
      issues: Object.freeze(issues.length > 0 ? issues : ["Invalid reporting request."]),
      request: null,
      ...ADS_REPORTING_AUTHORITY,
    });
  }

  return Object.freeze({
    contractVersion: ADS_REPORTING_VALIDATION_CONTRACT_VERSION,
    ok: true,
    issues: Object.freeze([]) as readonly string[],
    request: Object.freeze({
      domain: domainParsed.report,
      metrics: Object.freeze([...metricKeys]),
      aggregation: aggregationParsed.aggregation,
      filters: filtersParsed.filters,
      export: exportParsed.exportContract,
      analytics: analyticsBuilt.model,
    }),
    ...ADS_REPORTING_AUTHORITY,
  });
}
