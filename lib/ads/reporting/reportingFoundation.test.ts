import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ADS_DELIVERY_ENABLED } from "../constants";
import * as adsIndex from "../index";
import {
  ADS_REPORTING_AUTHORITY,
  buildAdsPlaceholderAnalyticsModel,
  inspectAdsReportingRequest,
  parseAdsReportAggregationContract,
  parseAdsReportExportContract,
  parseAdsReportFilterContract,
  parseAdsReportingDomainContract,
  proposeAdsReportingExport,
  validateAdsReportingRequest,
} from "./index";

const ROOT = path.join(__dirname, "..", "..", "..");
const INDEX_SOURCE = readFileSync(path.join(ROOT, "lib/ads/index.ts"), "utf8");
const REPORTING_DIR = __dirname;

function readReporting(rel: string) {
  return readFileSync(path.join(REPORTING_DIR, rel), "utf8");
}

function validDomain(overrides: Record<string, unknown> = {}) {
  return {
    reportType: "campaign",
    reportRef: "campaign-1",
    title: "Campaign report",
    ...overrides,
  };
}

function validAggregation(overrides: Record<string, unknown> = {}) {
  return {
    granularity: "daily",
    rangeStart: "2026-07-01T00:00:00.000Z",
    rangeEnd: "2026-07-07T00:00:00.000Z",
    ...overrides,
  };
}

function validFilters(overrides: Record<string, unknown> = {}) {
  return {
    filters: [
      {
        dimension: "campaign",
        values: ["campaign-1"],
      },
    ],
    ...overrides,
  };
}

function validExport(overrides: Record<string, unknown> = {}) {
  return {
    format: "json",
    includeHeaders: true,
    ...overrides,
  };
}

function validRequest(overrides: Record<string, unknown> = {}) {
  return {
    domain: validDomain(),
    metrics: ["impressions", "clicks", "ctr", "spend"],
    aggregation: validAggregation(),
    filters: validFilters(),
    export: validExport(),
    ...overrides,
  };
}

describe("Ads Reporting & Analytics Foundation V1", () => {
  it("parses domain, analytics, aggregation, filters, export fail-closed", () => {
    expect(parseAdsReportingDomainContract(validDomain()).ok).toBe(true);
    expect(
      parseAdsReportingDomainContract(validDomain({ reportType: "unknown" })).ok
    ).toBe(false);

    const analytics = buildAdsPlaceholderAnalyticsModel([
      "impressions",
      "clicks",
      "spend",
      "conversions",
    ]);
    expect(analytics.ok).toBe(true);
    if (analytics.ok) {
      expect(analytics.model.computedOnly).toBe(true);
      expect(analytics.model.sourcesLiveDelivery).toBe(false);
      expect(
        analytics.model.metrics.every((m) => m.placeholder === true)
      ).toBe(true);
      expect(
        analytics.model.metrics.every((m) => m.sourcedFromLiveDelivery === false)
      ).toBe(true);
      expect(analytics.model.metrics.every((m) => m.value === 0)).toBe(true);
    }
    expect(buildAdsPlaceholderAnalyticsModel(["not_a_metric" as never]).ok).toBe(
      false
    );

    expect(parseAdsReportAggregationContract(validAggregation()).ok).toBe(true);
    expect(
      parseAdsReportAggregationContract(
        validAggregation({
          rangeEnd: "2026-06-01T00:00:00.000Z",
        })
      ).ok
    ).toBe(false);
    expect(
      parseAdsReportAggregationContract(
        validAggregation({ granularity: "minute" })
      ).ok
    ).toBe(false);

    expect(parseAdsReportFilterContract(validFilters()).ok).toBe(true);
    expect(
      parseAdsReportFilterContract({
        filters: [{ dimension: "unknown", values: ["x"] }],
      }).ok
    ).toBe(false);

    expect(parseAdsReportExportContract(validExport()).ok).toBe(true);
    expect(parseAdsReportExportContract({ format: "parquet" }).ok).toBe(false);
    expect(
      parseAdsReportExportContract({ format: "csv", generatesFile: true }).ok
    ).toBe(false);
  });

  it("validates reporting requests and rejects invalid ranges/metrics/dimensions", () => {
    const ok = validateAdsReportingRequest(validRequest());
    expect(ok.ok).toBe(true);
    expect(ok.request?.analytics.computedOnly).toBe(true);
    expect(ok.productionEnabled).toBe(false);
    expect(ok.deliveryEnabled).toBe(false);
    expect(ok.billingEnabled).toBe(false);
    expect(ok.sourcesLiveDelivery).toBe(false);

    expect(
      validateAdsReportingRequest(
        validRequest({
          aggregation: validAggregation({
            rangeEnd: "2026-01-01T00:00:00.000Z",
          }),
        })
      ).ok
    ).toBe(false);

    expect(
      validateAdsReportingRequest(
        validRequest({ metrics: ["impressions", "bogus"] })
      ).ok
    ).toBe(false);

    expect(
      validateAdsReportingRequest(
        validRequest({
          filters: {
            filters: [{ dimension: "device_type", values: ["mobile"] }],
          },
        })
      ).ok
    ).toBe(false);

    expect(
      validateAdsReportingRequest(
        validRequest({
          aggregation: validAggregation({ granularity: "secondly" }),
        })
      ).ok
    ).toBe(false);

    expect(
      validateAdsReportingRequest(
        validRequest({ productionEnabled: true })
      ).ok
    ).toBe(false);
  });

  it("admin inspect/propose never apply or generate files", () => {
    const actor = { actorRef: "admin.1", correlationId: "corr-1" };
    const inspected = inspectAdsReportingRequest({
      ...actor,
      request: validRequest(),
    });
    expect("validation" in inspected && inspected.validation.ok).toBe(true);
    if ("validation" in inspected) {
      expect(inspected.productionEnabled).toBe(false);
      expect(inspected.deliveryEnabled).toBe(false);
    }

    const proposed = proposeAdsReportingExport({
      ...actor,
      request: validRequest({ export: validExport({ format: "csv" }) }),
    });
    expect(proposed.ok).toBe(true);
    if (proposed.ok) {
      expect(proposed.applied).toBe(false);
      expect(proposed.generatesFile).toBe(false);
      expect(proposed.format).toBe("csv");
      expect(proposed.productionEnabled).toBe(false);
    }

    expect(
      proposeAdsReportingExport({
        actorRef: "bad actor",
        correlationId: "corr-1",
        request: validRequest(),
      }).ok
    ).toBe(false);
  });

  it("keeps authority flags false and does not enable delivery", () => {
    expect(ADS_REPORTING_AUTHORITY.productionEnabled).toBe(false);
    expect(ADS_REPORTING_AUTHORITY.deliveryEnabled).toBe(false);
    expect(ADS_REPORTING_AUTHORITY.billingEnabled).toBe(false);
    expect(ADS_REPORTING_AUTHORITY.productionAccepted).toBe(false);
    expect(ADS_REPORTING_AUTHORITY.authoritativeProductionServing).toBe(false);
    expect(ADS_DELIVERY_ENABLED).toBe(false);
    expect(adsIndex.ADS_DELIVERY_ENABLED).toBe(false);
  });

  it("is exported from ads index and does not touch forbidden foundations", () => {
    expect(INDEX_SOURCE).toContain('export * from "./reporting"');
    expect(typeof adsIndex.validateAdsReportingRequest).toBe("function");
    expect(typeof adsIndex.inspectAdsReportingRequest).toBe("function");

    const forbidden = [
      path.join(ROOT, "lib/ads/operations"),
      path.join(ROOT, "lib/ads/campaignManagement"),
      path.join(ROOT, "lib/ads/canonicalStack"),
      path.join(ROOT, "lib/ads/candidateProvenance"),
    ];
    // Source self-check: reporting modules must not import forbidden foundations.
    const modules = [
      "authority.ts",
      "domain.ts",
      "analytics.ts",
      "aggregation.ts",
      "filters.ts",
      "export.ts",
      "validation.ts",
      "adminContracts.ts",
      "index.ts",
    ];
    for (const mod of modules) {
      const src = readReporting(mod);
      expect(src).not.toMatch(/from ["']\.\.\/operations/);
      expect(src).not.toMatch(/from ["']\.\.\/campaignManagement/);
      expect(src).not.toMatch(/from ["']\.\.\/canonical/);
      expect(src).not.toMatch(/productionEnabled:\s*true/);
      expect(src).not.toMatch(/deliveryEnabled:\s*true/);
      expect(src).not.toMatch(/billingEnabled:\s*true/);
    }
    void forbidden;
  });
});
