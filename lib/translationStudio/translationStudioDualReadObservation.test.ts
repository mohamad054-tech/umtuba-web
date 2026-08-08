import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ENV,
  __clearDualReadObservationSlotsForTests,
  __setDualReadObservationBreakerForTests,
  buildSeedPersistedState,
  claimDualReadObservationSlot,
  createShadowReconciliationJournal,
  fingerprintStudioSnapshot,
  getDualReadObservationBreaker,
  hasActionableDualReadDrift,
  isDualReadObservationBreakerOpen,
  recordDualReadObservationResult,
  releaseDualReadObservationSlot,
  resetDualReadObservationBreaker,
  runStudioDualReadCompare,
  runTranslationStudioDualReadObservation,
  toTranslationStudioWriteSnapshot,
  type DualReadCompareResult,
  type PersistedStudioState,
  type ReconciliationReport,
  type TranslationStudioReadSnapshotV1,
} from "./index";

const tempDirs: string[] = [];

afterEach(() => {
  resetDualReadObservationBreaker();
  __setDualReadObservationBreakerForTests(null);
  __clearDualReadObservationSlotsForTests();
  while (tempDirs.length) {
    const d = tempDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

function tempDir() {
  const d = mkdtempSync(join(tmpdir(), "umtuba-dual-obs-"));
  mkdirSync(d, { recursive: true });
  tempDirs.push(d);
  return d;
}

function remoteFromLocal(
  local: PersistedStudioState
): TranslationStudioReadSnapshotV1 {
  const snap = toTranslationStudioWriteSnapshot(local);
  return {
    schemaVersion: 1,
    languages: snap.languages.map((l) => ({ ...l })),
    namespaces: snap.namespaces.map((n) => ({
      stable_id: n.id,
      name: n.name,
      description: n.description,
    })),
    keys: snap.keys.map((k) => ({
      stable_id: k.id,
      namespaceStableId: k.namespaceId,
      key: k.key,
      sourceText: k.sourceText,
      description: k.description ?? null,
    })),
    suggestions: snap.suggestions.map((s) => ({
      stable_id: s.id,
      keyStableId: s.keyId,
      valueStableId: s.valueId,
      sourceText: s.sourceText,
      targetLanguage: s.targetLanguage,
      candidateText: s.candidateText,
      status: s.status,
      createdAt: s.createdAt,
      createdBy: s.createdBy,
    })),
    values: snap.values.map((v) => ({
      stable_id: v.id,
      keyStableId: v.keyId,
      language: v.language,
      value: v.value,
      status: v.status,
      version: v.version,
      suggestion_stable_id: v.suggestionId ?? null,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
      createdBy:
        v.createdBy && /^[0-9a-f-]{36}$/i.test(v.createdBy) ? v.createdBy : null,
      updatedBy:
        v.updatedBy && /^[0-9a-f-]{36}$/i.test(v.updatedBy) ? v.updatedBy : null,
      approvedBy:
        v.approvedBy && /^[0-9a-f-]{36}$/i.test(v.approvedBy)
          ? v.approvedBy
          : null,
    })),
    versions: snap.versions.map((x) => ({
      stable_id: x.id,
      valueStableId: x.valueId,
      keyStableId: x.keyId,
      language: x.language,
      value: x.value,
      status: x.status,
      version: x.version,
      changedBy:
        x.changedBy && /^[0-9a-f-]{36}$/i.test(x.changedBy) ? x.changedBy : null,
      changeAction: x.changeAction,
      changeNote: x.changeNote,
      createdAt: x.createdAt,
    })),
    memory: snap.memory.map((m) => ({
      stable_id: m.id,
      sourceFingerprint: m.sourceFingerprint,
      sourceText: m.sourceText,
      language: m.language,
      translatedText: m.translatedText,
      status: m.status,
      namespaceStableId: m.namespaceId ?? null,
      createdAt: m.createdAt,
      createdBy:
        m.createdBy && /^[0-9a-f-]{36}$/i.test(m.createdBy) ? m.createdBy : null,
    })),
    terminology: snap.terminology.map((t) => ({
      stable_id: t.id,
      term: t.term,
      definition: t.definition,
      notes: t.notes ?? null,
      status: t.status,
      translations: t.translations,
    })),
    auditLog: snap.auditLog.map((a) => {
      const isUuid = a.actorId && /^[0-9a-f-]{36}$/i.test(a.actorId);
      return {
        stable_id: a.id,
        entityType: a.entityType,
        entityId: a.entityId,
        action: a.action,
        actorId: isUuid ? a.actorId : null,
        actor_kind: isUuid ? "user" : "system",
        actor_ref: isUuid ? null : a.actorId,
        detail: a.detail,
        createdAt: a.createdAt,
      };
    }),
  };
}

describe("dual-read observation breaker", () => {
  it("auth / invalid_response / actionable drift → OPEN immediately", () => {
    const base: DualReadCompareResult = {
      status: "REMOTE_READ_FAILED",
      local_hash: "h",
      remote_hash: null,
      duration_ms: 1,
      counts: {},
      category: "auth",
    };
    expect(recordDualReadObservationResult(base).opened).toBe(true);
    expect(isDualReadObservationBreakerOpen()).toBe(true);
    resetDualReadObservationBreaker();

    expect(
      recordDualReadObservationResult({
        ...base,
        category: "invalid_response",
      }).opened
    ).toBe(true);
    resetDualReadObservationBreaker();

    const report: ReconciliationReport = {
      status: "DRIFT_DETECTED",
      localSnapshotHash: "h",
      remoteSnapshotHash: null,
      counts: {
        missing_remote: 1,
        extra_remote: 0,
        field_mismatch: 0,
        harmless_representation_difference: 0,
        audit_missing: 0,
        audit_extra: 0,
      },
      findings: [
        {
          category: "missing_remote",
          entityType: "value",
          identity: "x",
          smokeResidue: false,
        },
      ],
      smokeResidueIdentities: [],
    };
    expect(hasActionableDualReadDrift(report)).toBe(true);
    expect(
      recordDualReadObservationResult({
        status: "DRIFT_DETECTED",
        local_hash: "h",
        remote_hash: null,
        duration_ms: 1,
        counts: { missing_remote: 1 },
        report,
      }).opened
    ).toBe(true);
    expect(getDualReadObservationBreaker().reason).toBe("missing_remote");

    resetDualReadObservationBreaker();
    const fieldReport: ReconciliationReport = {
      ...report,
      counts: { ...report.counts, missing_remote: 0, field_mismatch: 2 },
      findings: [
        {
          category: "field_mismatch",
          entityType: "value",
          identity: "y",
          fields: ["value"],
          smokeResidue: false,
        },
      ],
    };
    expect(
      recordDualReadObservationResult({
        status: "DRIFT_DETECTED",
        local_hash: "h",
        remote_hash: null,
        duration_ms: 1,
        counts: { field_mismatch: 2 },
        report: fieldReport,
      }).opened
    ).toBe(true);
    expect(getDualReadObservationBreaker().reason).toBe("field_mismatch");
  });

  it("one transport failure stays CLOSED; second consecutive OPEN", () => {
    const fail = (n: number): DualReadCompareResult => ({
      status: "REMOTE_READ_FAILED",
      local_hash: "h",
      remote_hash: null,
      duration_ms: n,
      counts: {},
      category: "transport",
    });
    expect(recordDualReadObservationResult(fail(1)).opened).toBe(false);
    expect(isDualReadObservationBreakerOpen()).toBe(false);
    expect(getDualReadObservationBreaker().consecutive_failures).toBe(1);
    expect(recordDualReadObservationResult(fail(2)).opened).toBe(true);
    expect(getDualReadObservationBreaker().reason).toBe(
      "transport_consecutive"
    );
  });

  it("success resets consecutive; three session transport failures OPEN", () => {
    const fail = (): DualReadCompareResult => ({
      status: "REMOTE_READ_FAILED",
      local_hash: "h",
      remote_hash: null,
      duration_ms: 1,
      counts: {},
      category: "timeout",
    });
    const ok: DualReadCompareResult = {
      status: "IN_SYNC",
      local_hash: "h",
      remote_hash: "r",
      duration_ms: 1,
      counts: {},
    };
    expect(recordDualReadObservationResult(fail()).opened).toBe(false);
    expect(recordDualReadObservationResult(ok).opened).toBe(false);
    expect(getDualReadObservationBreaker().consecutive_failures).toBe(0);
    expect(getDualReadObservationBreaker().session_failures).toBe(1);
    expect(recordDualReadObservationResult(fail()).opened).toBe(false);
    expect(recordDualReadObservationResult(ok).opened).toBe(false);
    expect(recordDualReadObservationResult(fail()).opened).toBe(true);
    expect(getDualReadObservationBreaker().reason).toBe("timeout_session");
  });

  it("OPEN skips automatic observation; reset closes", async () => {
    __setDualReadObservationBreakerForTests({
      state: "OPEN",
      reason: "auth",
      opened_at: new Date().toISOString(),
      consecutive_failures: 0,
      session_failures: 0,
      last_success_at: null,
    });
    const dir = tempDir();
    const journal = createShadowReconciliationJournal({ dataDir: dir });
    const local = buildSeedPersistedState();
    const calls = { n: 0 };
    const out = await runTranslationStudioDualReadObservation({
      local,
      surface: "landing",
      ignoreObserveFlag: true,
      ignoreActivationGate: true,
      journal,
      readTransport: {
        async readSnapshot() {
          calls.n += 1;
          return remoteFromLocal(local);
        },
      },
    });
    expect(out.skipped).toBe(true);
    expect(out.skip_reason).toBe("breaker_open");
    expect(calls.n).toBe(0);
    expect(readFileSync(journal.filePath, "utf8")).toMatch(
      /dual_read_breaker_skipped/
    );
    resetDualReadObservationBreaker();
    expect(isDualReadObservationBreakerOpen()).toBe(false);
  });
});

describe("dual-read observation runner + page wiring", () => {
  it("observe=false → does not call read transport", async () => {
    const local = buildSeedPersistedState();
    const calls = { n: 0 };
    const out = await runTranslationStudioDualReadObservation({
      local,
      surface: "landing",
      env: { [TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ENV]: "0" },
      readTransport: {
        async readSnapshot() {
          calls.n += 1;
          return remoteFromLocal(local);
        },
      },
    });
    expect(out.skipped).toBe(true);
    expect(out.skip_reason).toBe("observe_disabled");
    expect(calls.n).toBe(0);
  });

  it("observe=true → one compare; journals auto success; dedupe slots", async () => {
    const dir = tempDir();
    const journal = createShadowReconciliationJournal({ dataDir: dir });
    const local = buildSeedPersistedState();
    const remote = remoteFromLocal(local);
    const calls = { n: 0 };

    const result = await runTranslationStudioDualReadObservation({
      local,
      surface: "landing",
      ignoreObserveFlag: true,
      ignoreActivationGate: true,
      journal,
      readTransport: {
        async readSnapshot() {
          calls.n += 1;
          return remote;
        },
      },
      getCurrentLocalHash: () => fingerprintStudioSnapshot(local),
    });
    expect(result.skipped).toBe(false);
    expect(result.result?.status).toBe("IN_SYNC");
    expect(calls.n).toBe(1);
    const body = readFileSync(journal.filePath, "utf8");
    expect(body).toMatch(/dual_read_auto_compare_started/);
    expect(body).toMatch(/dual_read_auto_compare_succeeded/);

    expect(claimDualReadObservationSlot("landing:h")).toBe(true);
    expect(claimDualReadObservationSlot("landing:h")).toBe(false);
    releaseDualReadObservationSlot("landing:h");
    expect(claimDualReadObservationSlot("landing:h")).toBe(true);
  });

  it("compare failure does not throw; no JSON mutation", async () => {
    const dir = tempDir();
    const local = buildSeedPersistedState();
    const before = JSON.stringify(local);
    const out = await runTranslationStudioDualReadObservation({
      local,
      surface: "key_detail",
      ignoreObserveFlag: true,
      ignoreActivationGate: true,
      journal: createShadowReconciliationJournal({ dataDir: dir }),
      readTransport: {
        async readSnapshot() {
          throw new Error(
            "translation_studio_read_snapshot failed: Authentication required"
          );
        },
      },
    });
    expect(out.skipped).toBe(false);
    expect(out.result?.status).toBe("REMOTE_READ_FAILED");
    expect(out.result?.category).toBe("auth");
    expect(JSON.stringify(local)).toBe(before);
    expect(isDualReadObservationBreakerOpen()).toBe(true);
  });

  it("page sources wire landing + key_detail; no write RPC on pages", () => {
    const landing = readFileSync(
      "app/admin/translation-studio/page.tsx",
      "utf8"
    );
    const key = readFileSync(
      "app/admin/translation-studio/keys/[keyId]/page.tsx",
      "utf8"
    );
    const schedule = readFileSync(
      "app/admin/translation-studio/scheduleDualReadObservation.ts",
      "utf8"
    );
    expect(landing).toMatch(/scheduleTranslationStudioDualReadObservation/);
    expect(landing).toMatch(/surface:\s*"landing"/);
    expect(key).toMatch(/scheduleTranslationStudioDualReadObservation/);
    expect(key).toMatch(/surface:\s*"key_detail"/);
    expect(schedule).toMatch(/from "next\/server"/);
    expect(schedule).toMatch(/\bafter\b/);
    expect(schedule).toMatch(/evaluateDualReadObserveScheduleGate/);
    expect(landing).not.toMatch(/upsert_snapshot/);
    expect(key).not.toMatch(/upsert_snapshot/);
    expect(schedule).not.toMatch(/upsert_snapshot/);
  });
});

describe("dual-read observation vs explicit compare / shadow isolation", () => {
  it("explicit compare still works while breaker OPEN", async () => {
    __setDualReadObservationBreakerForTests({
      state: "OPEN",
      reason: "auth",
      opened_at: new Date().toISOString(),
      consecutive_failures: 0,
      session_failures: 0,
      last_success_at: null,
    });
    const local = buildSeedPersistedState();
    const result = await runStudioDualReadCompare({
      local,
      readTransport: {
        async readSnapshot() {
          return remoteFromLocal(local);
        },
      },
    });
    expect(result.status).toBe("IN_SYNC");
    expect(isDualReadObservationBreakerOpen()).toBe(true);
  });
});
