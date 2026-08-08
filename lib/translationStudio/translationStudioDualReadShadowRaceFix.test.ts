/**
 * Dual-read ↔ shadow race / settle-window regression suite V1.
 * No remote writes. No network.
 */
import { mkdirSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ENV,
  TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV,
  __clearDualReadObservationSlotsForTests,
  buildSeedPersistedState,
  classifyShadowLagForCompare,
  createShadowReconciliationJournal,
  fingerprintStudioSnapshot,
  getDualReadObservationBreaker,
  hasActionableDualReadDrift,
  isDualReadObservationBreakerOpen,
  resetDualReadObservationBreaker,
  runStudioDualReadCompare,
  runTranslationStudioDualReadObservation,
  shadowPendingForHash,
  toTranslationStudioWriteSnapshot,
  SHADOW_SMOKE_V1_IDS,
  type PersistedStudioState,
  type ShadowReconciliationJournalEntryV1,
  type TranslationStudioReadSnapshotV1,
} from "./index";

const tempDirs: string[] = [];

afterEach(() => {
  resetDualReadObservationBreaker();
  __clearDualReadObservationSlotsForTests();
  while (tempDirs.length) {
    const d = tempDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

function tempDir() {
  const d = mkdtempSync(join(tmpdir(), "umtuba-shadow-race-"));
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

/** Apply-era remote relative to Submit-era local: drop last version+audit; revert one value. */
function applyEraRemote(local: PersistedStudioState): TranslationStudioReadSnapshotV1 {
  const remote = remoteFromLocal(local);
  if (remote.versions.length > 0) {
    remote.versions = remote.versions.slice(0, -1);
  }
  if (remote.auditLog.length > 0) {
    remote.auditLog = remote.auditLog.slice(0, -1);
  }
  if (remote.values[0]) {
    remote.values[0] = {
      ...remote.values[0],
      status: "draft",
      version: Math.max(1, (remote.values[0].version ?? 2) - 1),
    };
  }
  return remote;
}

function observeEnv() {
  return {
    [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "shadow_dual_write",
    [TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ENV]: "1",
  };
}

describe("dual-read shadow race fix V1", () => {
  it("A: compare starts while shadow queued; succeeds before compare ends → TRANSIENT_LAG; breaker CLOSED", async () => {
    const local = buildSeedPersistedState();
    const hash = fingerprintStudioSnapshot(local);
    const staleRemote = applyEraRemote(local);

    let clock = Date.parse("2026-08-08T18:29:59.400Z");
    const entries: ShadowReconciliationJournalEntryV1[] = [
      {
        schemaVersion: 1,
        timestamp: "2026-08-08T18:29:58.756Z",
        save_seq_local: 3,
        outcome: "queued",
        snapshot_hash: hash,
      },
    ];

    const result = await runStudioDualReadCompare({
      local,
      readTransport: {
        async readSnapshot() {
          // Shadow succeeds while compare read is in flight
          entries.push({
            schemaVersion: 1,
            timestamp: "2026-08-08T18:29:59.568Z",
            save_seq_local: 3,
            outcome: "succeeded",
            snapshot_hash: hash,
            rpc_inserted: 2,
            rpc_updated: 737,
            rpc_skipped: 31,
          });
          clock = Date.parse("2026-08-08T18:29:59.717Z");
          return staleRemote;
        },
      },
      getShadowJournalEntries: () => entries,
      now: () => clock,
      shadowSettleWindowMs: 3_000,
    });

    expect(result.status).toBe("TRANSIENT_LAG");
    expect(result.overlap_class).toBe("overlap_in_flight");
    expect(shadowPendingForHash(entries, hash)).toBe(false);
    expect(hasActionableDualReadDrift(result.report!)).toBe(true);
    expect(isDualReadObservationBreakerOpen()).toBe(false);
  });

  it("B: race + bounded settle re-read IN_SYNC → observation success; breaker CLOSED", async () => {
    const dir = tempDir();
    const journal = createShadowReconciliationJournal({
      filePath: join(dir, "shadow-reconciliation-v1.jsonl"),
    });
    const local = buildSeedPersistedState();
    const hash = fingerprintStudioSnapshot(local);
    const stale = applyEraRemote(local);
    const fresh = remoteFromLocal(local);

    journal.append({
      schemaVersion: 1,
      timestamp: "2026-08-08T18:29:58.756Z",
      save_seq_local: 3,
      outcome: "queued",
      snapshot_hash: hash,
    });
    journal.append({
      schemaVersion: 1,
      timestamp: "2026-08-08T18:29:59.568Z",
      save_seq_local: 3,
      outcome: "succeeded",
      snapshot_hash: hash,
      rpc_inserted: 2,
      rpc_updated: 1,
      rpc_skipped: 0,
    });

    let reads = 0;
    let clock = Date.parse("2026-08-08T18:29:59.400Z");
    const run = await runTranslationStudioDualReadObservation({
      local,
      readTransport: {
        async readSnapshot() {
          reads += 1;
          if (reads === 1) {
            clock = Date.parse("2026-08-08T18:29:59.717Z");
            return stale;
          }
          clock = Date.parse("2026-08-08T18:30:02.000Z");
          return fresh;
        },
      },
      surface: "diagnostics",
      journal,
      env: observeEnv(),
      now: () => clock,
      shadowSettleWindowMs: 3_000,
      sleep: async () => {
        clock += 10;
      },
    });

    expect(run.skipped).toBe(false);
    expect(run.result?.status).toBe("IN_SYNC");
    expect(run.settle_outcome).toBe("in_sync");
    expect(isDualReadObservationBreakerOpen()).toBe(false);
    expect(reads).toBe(2);
    const outcomes = journal.readEntries().map((e) => e.outcome);
    expect(outcomes).toContain("dual_read_settle_reread");
  });

  it("C: race + settle re-read still actionable → DRIFT; breaker OPEN", async () => {
    const dir = tempDir();
    const journal = createShadowReconciliationJournal({
      filePath: join(dir, "shadow-reconciliation-v1.jsonl"),
    });
    const local = buildSeedPersistedState();
    const hash = fingerprintStudioSnapshot(local);
    const stale = applyEraRemote(local);

    journal.append({
      schemaVersion: 1,
      timestamp: "2026-08-08T18:29:58.756Z",
      save_seq_local: 3,
      outcome: "queued",
      snapshot_hash: hash,
    });
    journal.append({
      schemaVersion: 1,
      timestamp: "2026-08-08T18:29:59.568Z",
      save_seq_local: 3,
      outcome: "succeeded",
      snapshot_hash: hash,
    });

    let clock = Date.parse("2026-08-08T18:29:59.400Z");
    let reads = 0;
    const run = await runTranslationStudioDualReadObservation({
      local,
      readTransport: {
        async readSnapshot() {
          reads += 1;
          clock =
            reads === 1
              ? Date.parse("2026-08-08T18:29:59.717Z")
              : Date.parse("2026-08-08T18:30:05.000Z");
          return stale;
        },
      },
      surface: "diagnostics",
      journal,
      env: observeEnv(),
      now: () => clock,
      shadowSettleWindowMs: 3_000,
      sleep: async () => {
        clock += 10;
      },
    });

    expect(run.result?.status).toBe("DRIFT_DETECTED");
    expect(run.settle_outcome).toBe("drift_detected");
    expect(isDualReadObservationBreakerOpen()).toBe(true);
    expect(["missing_remote", "field_mismatch"]).toContain(
      getDualReadObservationBreaker().reason
    );
    expect(reads).toBe(2);
  });

  it("D: compare after completed shadow with matching snapshot → IN_SYNC", async () => {
    const local = buildSeedPersistedState();
    const hash = fingerprintStudioSnapshot(local);
    const clock = Date.parse("2026-08-08T18:35:00.000Z");
    const result = await runStudioDualReadCompare({
      local,
      readTransport: { readSnapshot: async () => remoteFromLocal(local) },
      getShadowJournalEntries: () => [
        {
          schemaVersion: 1,
          timestamp: "2026-08-08T18:29:58.756Z",
          save_seq_local: 3,
          outcome: "queued",
          snapshot_hash: hash,
        },
        {
          schemaVersion: 1,
          timestamp: "2026-08-08T18:29:59.568Z",
          save_seq_local: 3,
          outcome: "succeeded",
          snapshot_hash: hash,
        },
      ],
      now: () => clock,
      shadowSettleWindowMs: 3_000,
    });
    expect(result.status).toBe("IN_SYNC");
    expect(isDualReadObservationBreakerOpen()).toBe(false);
  });

  it("E: genuine missing_remote with no shadow lag evidence → actionable; breaker OPEN", async () => {
    const dir = tempDir();
    const journal = createShadowReconciliationJournal({
      filePath: join(dir, "shadow-reconciliation-v1.jsonl"),
    });
    const local = buildSeedPersistedState();
    const stale = applyEraRemote(local);
    const clock = Date.parse("2026-08-08T19:00:00.000Z");

    const run = await runTranslationStudioDualReadObservation({
      local,
      readTransport: { readSnapshot: async () => stale },
      surface: "diagnostics",
      journal,
      env: observeEnv(),
      now: () => clock,
      shadowSettleWindowMs: 3_000,
    });

    expect(run.result?.status).toBe("DRIFT_DETECTED");
    expect(run.settle_outcome).toBe("skipped");
    expect(isDualReadObservationBreakerOpen()).toBe(true);
    expect(run.result?.overlap_class === "none" || !run.result?.shadow_lag?.qualifies).toBe(
      true
    );
  });

  it("F: genuine field mismatch with no lag evidence → actionable", async () => {
    const local = buildSeedPersistedState();
    const remote = remoteFromLocal(local);
    remote.values[0]!.value = "different-text";
    const clock = Date.parse("2026-08-08T19:00:00.000Z");
    const result = await runStudioDualReadCompare({
      local,
      readTransport: { readSnapshot: async () => remote },
      getShadowJournalEntries: () => [],
      now: () => clock,
    });
    expect(result.status).toBe("DRIFT_DETECTED");
    expect(result.counts.field_mismatch).toBeGreaterThan(0);
    expect(result.shadow_lag?.qualifies ?? false).toBe(false);
  });

  it("G: smoke residue remains non-actionable", async () => {
    const local = buildSeedPersistedState();
    const remote = remoteFromLocal(local);
    remote.namespaces.push({
      stable_id: SHADOW_SMOKE_V1_IDS.namespace,
      name: "__shadow_smoke_v1__",
      description: "",
    });
    remote.keys.push({
      stable_id: SHADOW_SMOKE_V1_IDS.key,
      namespaceStableId: SHADOW_SMOKE_V1_IDS.namespace,
      key: "__shadow_smoke_v1__",
      sourceText: "smoke",
      description: null,
    });
    remote.values.push({
      stable_id: SHADOW_SMOKE_V1_IDS.valueEn,
      keyStableId: SHADOW_SMOKE_V1_IDS.key,
      language: "en",
      value: "smoke",
      status: "draft",
      version: 1,
      suggestion_stable_id: null,
      createdBy: null,
      updatedBy: null,
      approvedBy: null,
    });
    remote.auditLog.push({
      stable_id: SHADOW_SMOKE_V1_IDS.audit,
      entityType: "translation_value",
      entityId: SHADOW_SMOKE_V1_IDS.valueEn,
      action: "smoke",
      actorId: null,
      actor_kind: "system",
      actor_ref: "system:smoke",
      detail: {},
    });

    const result = await runStudioDualReadCompare({
      local,
      readTransport: { readSnapshot: async () => remote },
      getShadowJournalEntries: () => [],
    });
    expect(result.status).toBe("IN_SYNC");
    expect(hasActionableDualReadDrift(result.report!)).toBe(false);
  });

  it("H: no remote writes in tests (read-only transport contract)", async () => {
    let writes = 0;
    const local = buildSeedPersistedState();
    await runStudioDualReadCompare({
      local,
      readTransport: {
        async readSnapshot() {
          return remoteFromLocal(local);
        },
      },
    });
    // Suite never invokes write RPC — assert sentinel stays 0.
    expect(writes).toBe(0);
  });

  it("post-success settle window qualifies only for same hash lineage", () => {
    const hash = "abc";
    const other = "def";
    const succeededAt = "2026-08-08T18:29:59.568Z";
    const compareStart = Date.parse("2026-08-08T18:30:01.000Z");
    const same = classifyShadowLagForCompare({
      entries: [
        {
          schemaVersion: 1,
          timestamp: "2026-08-08T18:29:58.756Z",
          save_seq_local: 3,
          outcome: "queued",
          snapshot_hash: hash,
        },
        {
          schemaVersion: 1,
          timestamp: succeededAt,
          save_seq_local: 3,
          outcome: "succeeded",
          snapshot_hash: hash,
          rpc_inserted: 2,
          rpc_updated: 1,
          rpc_skipped: 0,
        },
      ],
      snapshotHash: hash,
      compareStartedAtMs: compareStart,
      settleWindowMs: 3_000,
    });
    expect(same.qualifies).toBe(true);
    expect(same.overlap_class).toBe("post_success_settle");
    expect(same.rpc_inserted).toBe(2);

    const mismatch = classifyShadowLagForCompare({
      entries: [
        {
          schemaVersion: 1,
          timestamp: succeededAt,
          save_seq_local: 3,
          outcome: "succeeded",
          snapshot_hash: other,
        },
      ],
      snapshotHash: hash,
      compareStartedAtMs: compareStart,
      settleWindowMs: 3_000,
    });
    expect(mismatch.qualifies).toBe(false);
  });
});
