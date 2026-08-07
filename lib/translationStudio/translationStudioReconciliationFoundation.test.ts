import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SHADOW_SMOKE_V1_IDS,
  SHADOW_SMOKE_V1_PREFIX,
  assessShadowResubmitEligibility,
  buildShadowSmokeV1State,
  compareStudioSnapshots,
  createEphemeralStudioPersistence,
  createRemoteReadFailedReport,
  createShadowDualWriteStudioPersistence,
  createShadowReconciliationJournal,
  fingerprintStudioSnapshot,
  isSmokeOnlyClassifiableIdentity,
  parseShadowReconciliationJournalLine,
  type PersistedStudioState,
  type TranslationStudioReadSnapshotV1,
  type TranslationStudioWriteRpcTransport,
} from "./index";

const ACTOR = "7298bb8d-d7ee-4eb3-afa2-14e2c4af6c15";
const tempDirs: string[] = [];

function tempDir(): string {
  const d = mkdtempSync(join(tmpdir(), "umtuba-recon-"));
  tempDirs.push(d);
  return d;
}

afterEach(() => {
  while (tempDirs.length) {
    const d = tempDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

function emptyRemote(): TranslationStudioReadSnapshotV1 {
  return {
    schemaVersion: 1,
    languages: [],
    namespaces: [],
    keys: [],
    suggestions: [],
    values: [],
    versions: [],
    memory: [],
    terminology: [],
    auditLog: [],
  };
}

function remoteFromSmoke(local: PersistedStudioState): TranslationStudioReadSnapshotV1 {
  const smoke = local;
  return {
    schemaVersion: 1,
    languages: smoke.languages.map((l) => ({
      code: l.code,
      name: l.name,
      nativeName: l.nativeName,
      direction: l.direction,
      enabled: l.enabled,
    })),
    namespaces: smoke.namespaces.map((n) => ({
      stable_id: n.id,
      id: "diag-ns",
      name: n.name,
      description: n.description,
    })),
    keys: smoke.keys.map((k) => ({
      stable_id: k.id,
      id: "diag-key",
      namespaceStableId: k.namespaceId,
      key: k.key,
      sourceText: k.sourceText,
      description: k.description ?? null,
    })),
    suggestions: [],
    values: smoke.values.map((v) => ({
      stable_id: v.id,
      id: "diag-val",
      keyStableId: v.keyId,
      language: v.language,
      value: v.value,
      status: v.status,
      version: v.version,
      suggestion_stable_id: v.suggestionId ?? null,
      createdBy: v.createdBy,
      updatedBy: v.updatedBy,
      approvedBy: v.approvedBy,
    })),
    versions: [],
    memory: [],
    terminology: [],
    auditLog: smoke.auditLog.map((a) => ({
      stable_id: a.id,
      id: "diag-audit",
      entityType: a.entityType,
      entityId: a.entityId,
      action: a.action,
      actorId: a.actorId,
      actor_kind: "user",
      actor_ref: null,
      detail: a.detail,
    })),
  };
}

describe("snapshot fingerprint", () => {
  it("is stable for same logical snapshot", () => {
    const a = buildShadowSmokeV1State({ actorId: ACTOR });
    const b = buildShadowSmokeV1State({ actorId: ACTOR });
    expect(fingerprintStudioSnapshot(a)).toBe(fingerprintStudioSnapshot(b));
  });

  it("changes when semantic content changes", () => {
    const a = buildShadowSmokeV1State({ actorId: ACTOR, valueText: "one" });
    const b = buildShadowSmokeV1State({ actorId: ACTOR, valueText: "two" });
    expect(fingerprintStudioSnapshot(a)).not.toBe(fingerprintStudioSnapshot(b));
  });
});

describe("reconciliation journal", () => {
  it("appends and reads deterministic schema; skips corrupt lines", () => {
    const dir = tempDir();
    const journal = createShadowReconciliationJournal({ dataDir: dir });
    journal.append({
      schemaVersion: 1,
      timestamp: "2026-08-07T00:00:00.000Z",
      save_seq_local: 1,
      outcome: "queued",
      snapshot_hash: "abc",
      entity_counts: {
        languages: 1,
        namespaces: 1,
        keys: 1,
        suggestions: 0,
        values: 1,
        versions: 0,
        memory: 0,
        terminology: 0,
        auditLog: 1,
      },
    });
    writeFileSync(
      journal.filePath,
      readFileSync(journal.filePath, "utf8") + "{bad\n",
      "utf8"
    );
    journal.append({
      schemaVersion: 1,
      timestamp: "2026-08-07T00:00:01.000Z",
      save_seq_local: 1,
      outcome: "succeeded",
      attempt: 1,
      duration_ms: 10,
      snapshot_hash: "abc",
    });
    const entries = journal.readEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0]?.outcome).toBe("queued");
    expect(entries[1]?.outcome).toBe("succeeded");
    expect(parseShadowReconciliationJournalLine('{"token":"x"}')).toBeNull();
  });

  it("journal write failure is non-fatal to Studio JSON save", () => {
    const json = createEphemeralStudioPersistence();
    const boom = vi.fn(() => {
      throw new Error("disk full");
    });
    const journal = createShadowReconciliationJournal({
      filePath: join(tempDir(), "j.jsonl"),
      appendImpl: boom,
    });
    const transport: TranslationStudioWriteRpcTransport = {
      async upsertSnapshot() {
        return {
          ok: true as const,
          dry_run: false,
          schema_version: 1 as const,
          inserted: 0,
          updated: 0,
          skipped: 0,
          prune_missing: false as const,
          caller_user_id: ACTOR,
        };
      },
    };
    const shadow = createShadowDualWriteStudioPersistence({
      json,
      getTransport: () => transport,
      observer: { onEvent() {} },
      enableReconciliationJournal: true,
      journal,
    });
    expect(() =>
      shadow.save(buildShadowSmokeV1State({ actorId: ACTOR }))
    ).not.toThrow();
    expect(json.load()?.keys[0]?.id).toBe(SHADOW_SMOKE_V1_IDS.key);
  });

  it("records queued/succeeded with snapshot hash via journaling observer", async () => {
    const dir = tempDir();
    mkdirSync(dir, { recursive: true });
    const journal = createShadowReconciliationJournal({ dataDir: dir });
    const shadow = createShadowDualWriteStudioPersistence({
      json: createEphemeralStudioPersistence(),
      getTransport: () => ({
        async upsertSnapshot() {
          return {
            ok: true as const,
            dry_run: false,
            schema_version: 1 as const,
            inserted: 1,
            updated: 0,
            skipped: 0,
            prune_missing: false as const,
            caller_user_id: ACTOR,
          };
        },
      }),
      enableReconciliationJournal: true,
      journal,
      observer: { onEvent() {} },
    });
    shadow.save(buildShadowSmokeV1State({ actorId: ACTOR }));
    await shadow.whenShadowIdle();
    const entries = journal.readEntries();
    expect(entries.some((e) => e.outcome === "queued")).toBe(true);
    expect(entries.some((e) => e.outcome === "succeeded")).toBe(true);
    expect(entries.every((e) => e.snapshot_hash.length > 10)).toBe(true);
    expect(entries.every((e) => !("token" in e))).toBe(true);
  });
});

describe("reconciliation comparator", () => {
  it("exact match → IN_SYNC even with diagnostic UUID differences", () => {
    const local = buildShadowSmokeV1State({ actorId: ACTOR });
    const remote = remoteFromSmoke(local);
    const report = compareStudioSnapshots({ local, remote });
    expect(report.status).toBe("IN_SYNC");
    expect(report.counts.missing_remote).toBe(0);
    expect(report.smokeResidueIdentities).toContain(SHADOW_SMOKE_V1_IDS.key);
  });

  it("detects missing remote and field mismatch", () => {
    const local = buildShadowSmokeV1State({ actorId: ACTOR, valueText: "alpha" });
    const remote = remoteFromSmoke(local);
    remote.values = [];
    const missing = compareStudioSnapshots({ local, remote });
    expect(missing.status).toBe("DRIFT_DETECTED");
    expect(missing.counts.missing_remote).toBeGreaterThan(0);

    const remote2 = remoteFromSmoke(local);
    remote2.values[0]!.value = "beta";
    const mismatch = compareStudioSnapshots({ local, remote: remote2 });
    expect(mismatch.counts.field_mismatch).toBeGreaterThan(0);
    expect(mismatch.findings.some((f) => f.fields?.includes("value"))).toBe(true);
  });

  it("detects extra remote / audit extra as expected stale under no-prune", () => {
    const local = buildShadowSmokeV1State({ actorId: ACTOR });
    const remote = remoteFromSmoke(local);
    remote.keys.push({
      stable_id: "orphan_key",
      namespaceStableId: SHADOW_SMOKE_V1_IDS.namespace,
      key: "orphan",
      sourceText: "x",
    });
    remote.auditLog.push({
      stable_id: "orphan_audit",
      entityType: "translation_value",
      entityId: "x",
      action: "x",
      actorId: null,
      actor_kind: null,
      actor_ref: null,
      detail: {},
    });
    const report = compareStudioSnapshots({ local, remote });
    expect(report.counts.extra_remote).toBe(1);
    expect(report.counts.audit_extra).toBe(1);
    expect(
      report.findings.some((f) => f.expectedStaleExtra && f.identity === "orphan_key")
    ).toBe(true);
  });

  it("ordering-only difference does not create drift", () => {
    const local = buildShadowSmokeV1State({ actorId: ACTOR });
    const remote = remoteFromSmoke(local);
    remote.languages = [...remote.languages].reverse();
    expect(compareStudioSnapshots({ local, remote }).status).toBe("IN_SYNC");
  });

  it("does not classify language en as smoke-only", () => {
    expect(isSmokeOnlyClassifiableIdentity("language", "en")).toBe(false);
    expect(isSmokeOnlyClassifiableIdentity("key", SHADOW_SMOKE_V1_IDS.key)).toBe(
      true
    );
    expect(SHADOW_SMOKE_V1_PREFIX.length).toBeGreaterThan(5);
  });

  it("null/absent actor fields normalize equivalently", () => {
    const local = buildShadowSmokeV1State({ actorId: ACTOR });
    local.values[0]!.approvedBy = null;
    const remote = remoteFromSmoke(local);
    remote.values[0]!.approvedBy = null;
    expect(compareStudioSnapshots({ local, remote }).status).toBe("IN_SYNC");
  });

  it("REMOTE_READ_FAILED report + resubmit eligibility", () => {
    const local = buildShadowSmokeV1State({ actorId: ACTOR });
    const report = createRemoteReadFailedReport(local, "boom");
    expect(report.status).toBe("REMOTE_READ_FAILED");
    const elig = assessShadowResubmitEligibility({ local, report });
    expect(elig.eligible).toBe(true);
  });
});

describe("empty remote vs smoke local", () => {
  it("marks all smoke entities missing_remote", () => {
    const local = buildShadowSmokeV1State({ actorId: ACTOR });
    const report = compareStudioSnapshots({ local, remote: emptyRemote() });
    expect(report.status).toBe("DRIFT_DETECTED");
    expect(report.counts.missing_remote).toBeGreaterThan(0);
    expect(
      assessShadowResubmitEligibility({ local, report }).eligible
    ).toBe(true);
  });
});
