import { describe, expect, it } from "vitest";
import {
  AUTHORIZATION_BOUNDARY,
  PROPOSED_RPC_BOUNDARY,
  PROPOSED_SCHEMA_BOUNDARY,
  READY_FOR_CENTRAL_MIGRATION_ALLOCATION,
  REVOCATION_BOUNDARY,
  UNIQUENESS_BOUNDARY,
  WAVE8_A1_PERSISTENCE,
} from "./certificationPersistenceMigrationReadiness";

describe("certification persistence migration readiness contract", () => {
  it("does not claim durable persistence exists", () => {
    expect(WAVE8_A1_PERSISTENCE.PERSISTENCE_EXISTS).toBe("NO");
    expect(WAVE8_A1_PERSISTENCE.MIGRATION_REQUIRED).toBe("YES");
  });

  it("defines schema/rpc/uniqueness/revocation/auth boundaries for Central", () => {
    expect(PROPOSED_SCHEMA_BOUNDARY.tables.length).toBeGreaterThan(0);
    expect(PROPOSED_RPC_BOUNDARY.rpcs).toContain("issue_certificate");
    expect(UNIQUENESS_BOUNDARY.length).toBeGreaterThan(0);
    expect(REVOCATION_BOUNDARY.length).toBeGreaterThan(0);
    expect(AUTHORIZATION_BOUNDARY.length).toBeGreaterThan(0);
  });

  it("is ready for Central migration allocation only", () => {
    expect(READY_FOR_CENTRAL_MIGRATION_ALLOCATION).toBe(true);
  });
});
