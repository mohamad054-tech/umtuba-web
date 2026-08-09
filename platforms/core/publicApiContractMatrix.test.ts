/**
 * UM Core public API contract matrix — barrel export inventory.
 *
 * Verifies that every integrated foundation factory / free function listed in
 * docs/core/UM_CORE_PUBLIC_API_CONTRACT_MATRIX_V1.md is reachable from the
 * root public barrel (`platforms/core/index.ts`).
 *
 * Does not exercise runtime semantics (covered by per-foundation suites).
 */

import { describe, expect, it } from "vitest";
import * as UmCore from "./index";

const PUBLIC_CALLABLES = [
  // P2 / P13 / RI
  "validatePlatformManifest",
  "createManifestValidator",
  "validateManifestAdmission",
  "createRegistrationValidator",
  "isNonEmptyTrimmed",
  "isUmMachineId",
  "isUmVersionToken",
  "isScopedUnderPlatform",
  "validatePlatformDependencies",
  "createUmCoreValidator",
  "validateReferentialIntegrity",
  // P3
  "assessPlatformCompliance",
  "createComplianceEngine",
  // P4 / P12
  "createInMemoryPlatformRegistry",
  "createUmCoreRegistry",
  // P5 / P15
  "createInMemoryCapabilityRegistry",
  "createInMemoryCapabilityAsserter",
  // P6 / P7 / P16
  "createInMemoryEventTypeRegistry",
  "buildEventRouteId",
  "createInMemoryEventRoutingRegistry",
  "createInMemoryEventPublisher",
  // P8 / P14
  "createInMemoryFlagRegistry",
  "createInMemoryFlagEvaluator",
  // P9
  "buildDependencyEdgeId",
  "createInMemoryDependencyRegistry",
  // P10 / P17 / P18 / P20 / P22
  "createInMemoryHealthRegistry",
  "createInMemoryHealthReporter",
  "createHealthDiagnosticsJoin",
  "aggregateFleetHealthFromMembers",
  "aggregateFleetHealth",
  "createFleetHealthAggregation",
  "createInMemoryHealthObservationHistory",
  // P11
  "createInMemoryNamingRegistry",
  // P21
  "createInMemoryUmCoreSdkFactory",
] as const;

const PUBLIC_CODE_TABLES = [
  "UmManifestValidationCode",
  "UmDependencyValidationCode",
  "UmReferentialIntegrityCode",
  "UmComplianceCode",
  "UmRegistryCode",
  "UmCapabilityRegistryCode",
  "UmCapabilityAssertionCode",
  "UmEventTypeRegistryCode",
  "UmEventRoutingCode",
  "UmEventPublishCode",
  "UmFlagRegistryCode",
  "UmFlagEvaluationCode",
  "UmDependencyRegistryCode",
  "UmHealthRegistryCode",
  "UmHealthReportCode",
  "UmFleetHealthAggregationCode",
  "UmHealthHistoryCode",
] as const;

describe("UM Core public API contract matrix (root barrel)", () => {
  it("exports every integrated foundation callable from the public barrel", () => {
    for (const name of PUBLIC_CALLABLES) {
      expect(typeof (UmCore as Record<string, unknown>)[name], name).toBe(
        "function",
      );
    }
  });

  it("exports stable code tables used by fail-closed findings", () => {
    for (const name of PUBLIC_CODE_TABLES) {
      const table = (UmCore as Record<string, unknown>)[name];
      expect(table, name).toBeTypeOf("object");
      expect(table, name).not.toBeNull();
    }
  });

  it("keeps package identity + late-phase markers on the public barrel", () => {
    expect(UmCore.UM_CORE_PACKAGE_ID).toBe("um.core");
    expect(UmCore.UM_CORE_HEALTH_REPORTER_PHASE).toBe("P17");
    expect(UmCore.UM_CORE_HEALTH_DIAGNOSTICS_JOIN_PHASE).toBe("P18");
    expect(UmCore.UM_CORE_FLEET_HEALTH_AGGREGATION_PHASE).toBe("P20");
    expect(UmCore.UM_CORE_SDK_CLIENT_FACTORY_PHASE).toBe("P21");
    expect(UmCore.UM_CORE_BOUNDED_HEALTH_HISTORY_PHASE).toBe("P22");
  });
});
