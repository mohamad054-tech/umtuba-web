/**
 * Ads Reporting & Analytics Foundation V1 — contracts only.
 * No production serving, billing, ingestion, dashboards, UI, or public endpoints.
 */

export {
  ADS_REPORTING_AUTHORITY,
  ADS_REPORTING_CONTRACT_VERSION,
  assertReportingAuthorityClosed,
  freezeReportingAuthority,
} from "./authority";
export type { AdsReportingAuthority } from "./authority";

export {
  ADS_REPORT_TYPES,
  isAdsReportType,
  parseAdsReportingDomainContract,
} from "./domain";
export type {
  AdsReportType,
  AdsReportingDomainContract,
} from "./domain";

export {
  ADS_ANALYTICS_METRIC_KEYS,
  ADS_ANALYTICS_PLACEHOLDER_METRICS,
  buildAdsPlaceholderAnalyticsModel,
  isAdsAnalyticsMetricKey,
  isAdsAnalyticsPlaceholderMetric,
  parseAdsAnalyticsModel,
} from "./analytics";
export type {
  AdsAnalyticsMetricKey,
  AdsAnalyticsMetricValue,
  AdsAnalyticsModel,
} from "./analytics";

export {
  ADS_REPORT_AGGREGATION_GRANULARITIES,
  isAdsReportAggregationGranularity,
  parseAdsReportAggregationContract,
} from "./aggregation";
export type {
  AdsReportAggregationContract,
  AdsReportAggregationGranularity,
} from "./aggregation";

export {
  ADS_REPORT_DIMENSIONS,
  isAdsReportDimension,
  parseAdsReportFilterContract,
} from "./filters";
export type {
  AdsReportDimension,
  AdsReportFilterClause,
  AdsReportFilterContract,
} from "./filters";

export {
  ADS_REPORT_EXPORT_FORMATS,
  isAdsReportExportFormat,
  parseAdsReportExportContract,
} from "./export";
export type {
  AdsReportExportContract,
  AdsReportExportFormat,
} from "./export";

export {
  ADS_REPORTING_VALIDATION_CONTRACT_VERSION,
  validateAdsReportingRequest,
} from "./validation";
export type {
  AdsReportingRequestBundle,
  AdsReportingValidationReport,
} from "./validation";

export {
  ADS_REPORTING_ADMIN_CONTRACT_VERSION,
  inspectAdsReportingRequest,
  proposeAdsReportingExport,
} from "./adminContracts";
export type {
  AdsReportingAdminActorContext,
  AdsReportingAdminInspectResult,
  AdsReportingAdminProposeExportResult,
} from "./adminContracts";
