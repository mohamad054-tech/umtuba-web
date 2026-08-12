import { describe, expect, it } from "vitest";
import {
  AUTHORIZATION_BOUNDARY,
  PROPOSED_RPC_BOUNDARY,
  PROPOSED_SCHEMA_BOUNDARY,
  READY_FOR_CENTRAL_MIGRATION_ALLOCATION,
  REMOTE_CERTIFICATION_MIGRATION,
  REMOTE_CERTIFICATION_PERSISTENCE_APPLIED,
  REVOCATION_BOUNDARY,
  UNIQUENESS_BOUNDARY,
  WAVE8_A1_PERSISTENCE,
} from "./certificationPersistenceMigrationReadiness";

describe("certification persistence migration readiness contract", () => {
  it("records durable persistence as applied on remote", () => {
    expect(WAVE8_A1_PERSISTENCE.PERSISTENCE_EXISTS).toBe("YES");
    expect(WAVE8_A1_PERSISTENCE.MIGRATION_REQUIRED).toBe("NO");
    expect(REMOTE_CERTIFICATION_PERSISTENCE_APPLIED).toBe(true);
    expect(REMOTE_CERTIFICATION_MIGRATION.version).toBe("20260921");
    expect(REMOTE_CERTIFICATION_MIGRATION.name).toBe(
      "learning_certification_persistence_v1",
    );
  });

  it("defines schema/rpc/uniqueness/revocation/auth boundaries", () => {
    expect(PROPOSED_SCHEMA_BOUNDARY.tables.length).toBeGreaterThan(0);
    expect(PROPOSED_RPC_BOUNDARY.rpcs).toContain("issue_certificate");
    expect(UNIQUENESS_BOUNDARY.length).toBeGreaterThan(0);
    expect(REVOCATION_BOUNDARY.length).toBeGreaterThan(0);
    expect(AUTHORIZATION_BOUNDARY.length).toBeGreaterThan(0);
  });

  it("no longer waits on Central migration allocation", () => {
    expect(READY_FOR_CENTRAL_MIGRATION_ALLOCATION).toBe(false);
  });
});
