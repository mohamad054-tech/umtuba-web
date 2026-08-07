import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ENV,
  TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV,
  buildSeedPersistedState,
  createDefaultStudioPersistence,
  createDualReadStudioPersistence,
  createJsonStudioPersistence,
  createShadowReconciliationJournal,
  fingerprintStudioSnapshot,
  hasActionableDualReadDrift,
  parseShadowReconciliationJournalLine,
  runStudioDualReadCompare,
  shadowPendingForHash,
  toTranslationStudioWriteSnapshot,
  type PersistedStudioState,
  type TranslationStudioReadRpcTransport,
  type TranslationStudioReadSnapshotV1,
} from "./index";

const tempDirs: string[] = [];
afterEach(() => {
  while (tempDirs.length) {
    const d = tempDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

function tempDir() {
  const d = mkdtempSync(join(tmpdir(), "umtuba-dual-read-"));
  tempDirs.push(d);
  return d;
}

function remoteFromLocal(local: PersistedStudioState): TranslationStudioReadSnapshotV1 {
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
      // UUID-only columns: drop system refs as DB would
      createdBy:
        v.createdBy && /^[0-9a-f-]{36}$/i.test(v.createdBy) ? v.createdBy : null,
      updatedBy:
        v.updatedBy && /^[0-9a-f-]{36}$/i.test(v.updatedBy) ? v.updatedBy : null,
      approvedBy:
        v.approvedBy && /^[0-9a-f-]{36}$/i.test(v.approvedBy) ? v.approvedBy : null,
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

describe("Translation Studio dual-read implementation V1", () => {
  it("load returns authoritative JSON sync and never calls remote", async () => {
    const dir = tempDir();
    const json = createJsonStudioPersistence({ dataDir: dir });
    const local = buildSeedPersistedState();
    json.save(local);
    const readSnapshot = vi.fn(async () => remoteFromLocal(local));
    const dual = createDualReadStudioPersistence({
      authoritative: json,
      getReadTransport: () => ({ readSnapshot }),
    });
    const loaded = dual.load();
    expect(loaded?.values.length).toBe(local.values.length);
    expect(readSnapshot).not.toHaveBeenCalled();
  });

  it("exact match → IN_SYNC; no JSON mutation", async () => {
    const local = buildSeedPersistedState();
    const before = fingerprintStudioSnapshot(local);
    const readTransport: TranslationStudioReadRpcTransport = {
      readSnapshot: async () => remoteFromLocal(local),
    };
    const result = await runStudioDualReadCompare({ local, readTransport });
    expect(result.status).toBe("IN_SYNC");
    expect(fingerprintStudioSnapshot(local)).toBe(before);
  });

  it("smoke extras only → IN_SYNC", async () => {
    const local = buildSeedPersistedState();
    const remote = remoteFromLocal(local);
    remote.namespaces.push({
      stable_id: "__shadow_smoke_v1__namespace",
      name: "smoke",
      description: "",
    });
    remote.keys.push({
      stable_id: "__shadow_smoke_v1__key",
      namespaceStableId: "__shadow_smoke_v1__namespace",
      key: "smoke",
      sourceText: "s",
      description: null,
    });
    remote.values.push({
      stable_id: "__shadow_smoke_v1__value",
      keyStableId: "__shadow_smoke_v1__key",
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
      stable_id: "__shadow_smoke_v1__audit",
      entityType: "translation_value",
      entityId: "__shadow_smoke_v1__value",
      action: "smoke",
      actorId: null,
      actor_kind: "system",
      actor_ref: "system:smoke",
      detail: {},
    });
    const result = await runStudioDualReadCompare({
      local,
      readTransport: { readSnapshot: async () => remote },
    });
    expect(result.status).toBe("IN_SYNC");
    expect(hasActionableDualReadDrift(result.report!)).toBe(false);
  });

  it("missing remote / field mismatch / audit missing / unknown extra → DRIFT", async () => {
    const local = buildSeedPersistedState();
    const base = remoteFromLocal(local);

    const missing = structuredClone(base);
    missing.values = missing.values.slice(1);
    expect(
      (
        await runStudioDualReadCompare({
          local,
          readTransport: { readSnapshot: async () => missing },
        })
      ).status
    ).toBe("DRIFT_DETECTED");

    const mismatch = structuredClone(base);
    mismatch.values[0]!.value = "TAMPERED";
    expect(
      (
        await runStudioDualReadCompare({
          local,
          readTransport: { readSnapshot: async () => mismatch },
        })
      ).status
    ).toBe("DRIFT_DETECTED");

    const auditMiss = structuredClone(base);
    auditMiss.auditLog = [];
    if (local.auditLog.length > 0) {
      expect(
        (
          await runStudioDualReadCompare({
            local,
            readTransport: { readSnapshot: async () => auditMiss },
          })
        ).status
      ).toBe("DRIFT_DETECTED");
    }

    const unknownExtra = structuredClone(base);
    unknownExtra.namespaces.push({
      stable_id: "ns_unknown_extra",
      name: "x",
      description: "",
    });
    expect(
      (
        await runStudioDualReadCompare({
          local,
          readTransport: { readSnapshot: async () => unknownExtra },
        })
      ).status
    ).toBe("DRIFT_DETECTED");
  });

  it("pending shadow → TRANSIENT_LAG; hash change → STALE_DISCARDED", async () => {
    const local = buildSeedPersistedState();
    const hash = fingerprintStudioSnapshot(local);
    const remote = structuredClone(remoteFromLocal(local));
    remote.values[0]!.value = "lag-visible";

    const lag = await runStudioDualReadCompare({
      local,
      readTransport: { readSnapshot: async () => remote },
      getShadowJournalEntries: () => [
        {
          schemaVersion: 1,
          timestamp: new Date().toISOString(),
          save_seq_local: 1,
          outcome: "queued",
          snapshot_hash: hash,
        },
      ],
    });
    expect(lag.status).toBe("TRANSIENT_LAG");

    const stale = await runStudioDualReadCompare({
      local,
      readTransport: {
        readSnapshot: async () => {
          await Promise.resolve();
          return remoteFromLocal(local);
        },
      },
      getCurrentLocalHash: () => "different-hash",
    });
    expect(stale.status).toBe("STALE_DISCARDED");
  });

  it("no transport → UNAVAILABLE; auth failure → FAILED; invalid response classified", async () => {
    const local = buildSeedPersistedState();
    expect(
      (await runStudioDualReadCompare({ local, readTransport: null })).status
    ).toBe("REMOTE_READ_UNAVAILABLE");

    const auth = await runStudioDualReadCompare({
      local,
      readTransport: {
        async readSnapshot() {
          throw new Error("translation_studio_read_snapshot failed: not allowed");
        },
      },
    });
    expect(auth.status).toBe("REMOTE_READ_FAILED");
    expect(auth.category).toBe("auth");

    const bad = await runStudioDualReadCompare({
      local,
      readTransport: {
        async readSnapshot() {
          throw new Error("Studio DB read failed (response): object required");
        },
      },
    });
    expect(bad.status).toBe("REMOTE_READ_FAILED");
    expect(bad.category).toBe("invalid_response");
  });

  it("journals dual_read events; shadow lines remain parseable", async () => {
    const dir = tempDir();
    const journalPath = join(dir, "shadow-reconciliation-v1.jsonl");
    writeFileSync(
      journalPath,
      JSON.stringify({
        schemaVersion: 1,
        timestamp: "2026-01-01T00:00:00.000Z",
        save_seq_local: 1,
        outcome: "succeeded",
        snapshot_hash: "abc",
      }) + "\n"
    );
    const journal = createShadowReconciliationJournal({ filePath: journalPath });
    const local = buildSeedPersistedState();
    await runStudioDualReadCompare({
      local,
      readTransport: { readSnapshot: async () => remoteFromLocal(local) },
      dualReadJournal: journal,
    });
    const entries = journal.readEntries();
    expect(entries.some((e) => e.outcome === "succeeded")).toBe(true);
    expect(entries.some((e) => e.outcome === "dual_read_succeeded")).toBe(true);
    expect(
      parseShadowReconciliationJournalLine(
        JSON.stringify({
          schemaVersion: 1,
          event_family: "dual_read",
          timestamp: "t",
          outcome: "dual_read_unavailable",
          snapshot_hash: "h",
          compare_status: "REMOTE_READ_UNAVAILABLE",
        })
      )?.outcome
    ).toBe("dual_read_unavailable");
  });

  it("shadow_dual_write alone does not enable dual_read; observe flag nests", () => {
    const dir = tempDir();
    const shadowOnly = createDefaultStudioPersistence({
      env: { [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "shadow_dual_write" },
      dataDir: dir,
    });
    expect(shadowOnly.implementation).toBe("shadow_dual_write");
    expect(shadowOnly.dualReadEnabled).toBe(false);
    expect(shadowOnly.persistence).not.toHaveProperty("compareRemoteAsync");

    const nested = createDefaultStudioPersistence({
      env: {
        [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "shadow_dual_write",
        [TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ENV]: "1",
      },
      dataDir: tempDir(),
    });
    expect(nested.implementation).toBe("shadow_dual_write");
    expect(nested.dualReadEnabled).toBe(true);
    expect(typeof (nested.persistence as { compareRemoteAsync?: unknown }).compareRemoteAsync).toBe(
      "function"
    );
  });

  it("shadowPendingForHash detects queued without terminal", () => {
    expect(
      shadowPendingForHash(
        [
          {
            schemaVersion: 1,
            timestamp: "t",
            save_seq_local: 1,
            outcome: "queued",
            snapshot_hash: "h1",
          },
        ],
        "h1"
      )
    ).toBe(true);
    expect(
      shadowPendingForHash(
        [
          {
            schemaVersion: 1,
            timestamp: "t",
            save_seq_local: 1,
            outcome: "queued",
            snapshot_hash: "h1",
          },
          {
            schemaVersion: 1,
            timestamp: "t2",
            save_seq_local: 1,
            outcome: "succeeded",
            snapshot_hash: "h1",
          },
        ],
        "h1"
      )
    ).toBe(false);
  });
});
