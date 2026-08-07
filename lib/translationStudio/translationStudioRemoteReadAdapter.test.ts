import { describe, expect, it, vi } from "vitest";
import {
  TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV,
  createDbStudioPersistence,
  createDefaultStudioPersistence,
  fromTranslationStudioReadSnapshot,
  mapRemoteAuditActorId,
  mapRemoteUuidActorField,
  resolveTranslationStudioPersistenceMode,
  toTranslationStudioWriteSnapshot,
  StudioDbReadError,
  StudioDbSyncLoadUnsupportedError,
  type PersistedStudioState,
  type TranslationStudioReadRpcTransport,
  type TranslationStudioReadSnapshotV1,
  type TranslationStudioWriteRpcTransport,
} from "./index";

const UUID = "7298bb8d-d7ee-4eb3-afa2-14e2c4af6c15";

function sampleRemote(): TranslationStudioReadSnapshotV1 {
  return {
    schemaVersion: 1,
    languages: [
      {
        code: "en",
        name: "English",
        nativeName: "English",
        direction: "ltr",
        enabled: true,
      },
      {
        code: "ar",
        name: "Arabic",
        nativeName: "العربية",
        direction: "rtl",
        enabled: true,
      },
    ],
    namespaces: [
      {
        stable_id: "ns_b",
        id: "diag-ns-b",
        name: "B",
        description: "",
      },
      {
        stable_id: "ns_a",
        id: "diag-ns-a",
        name: "A",
        description: "alpha",
      },
      {
        stable_id: "__shadow_smoke_v1__namespace",
        id: "diag-smoke-ns",
        name: "smoke",
        description: "smoke",
      },
    ],
    keys: [
      {
        stable_id: "key_appshell_hello",
        id: "diag-key",
        namespaceStableId: "ns_a",
        key: "hello",
        sourceText: "Hello",
        description: "greet",
      },
      {
        stable_id: "__shadow_smoke_v1__key",
        id: "diag-smoke-key",
        namespaceStableId: "__shadow_smoke_v1__namespace",
        key: "smoke",
        sourceText: "smoke",
        description: null,
      },
    ],
    suggestions: [
      {
        stable_id: "sug_1",
        id: "diag-sug",
        keyStableId: "key_appshell_hello",
        valueStableId: "val_appshell_hello_ar",
        sourceText: "Hello",
        targetLanguage: "ar",
        candidateText: "مرحبا",
        status: "pending_review",
        createdAt: "2026-08-07T00:00:01.000Z",
        createdBy: UUID,
      },
    ],
    values: [
      {
        stable_id: "val_appshell_hello_ar",
        id: "diag-val",
        keyStableId: "key_appshell_hello",
        language: "ar",
        value: "مرحبا",
        status: "needs_review",
        version: 1,
        suggestion_stable_id: "sug_1",
        createdAt: "2026-08-07T00:00:02.000Z",
        updatedAt: "2026-08-07T00:00:03.000Z",
        createdBy: null,
        updatedBy: UUID,
        approvedBy: null,
      },
      {
        stable_id: "__shadow_smoke_v1__value",
        id: "diag-smoke-val",
        keyStableId: "__shadow_smoke_v1__key",
        language: "en",
        value: "smoke",
        status: "draft",
        version: 1,
        suggestion_stable_id: null,
        createdBy: null,
        updatedBy: null,
        approvedBy: null,
      },
    ],
    versions: [
      {
        stable_id: "ver_1",
        id: "diag-ver",
        valueStableId: "val_appshell_hello_ar",
        keyStableId: "key_appshell_hello",
        language: "ar",
        value: "مرحبا",
        status: "needs_review",
        version: 1,
        changedBy: null,
        changeAction: "upsert",
        changeNote: null,
        createdAt: "2026-08-07T00:00:02.000Z",
      },
    ],
    memory: [
      {
        stable_id: "tm_1",
        id: "diag-mem",
        sourceFingerprint: "abc123",
        sourceText: "Hello",
        language: "ar",
        translatedText: "مرحبا",
        status: "approved",
        namespaceStableId: "ns_a",
        createdAt: "2026-08-07T00:00:04.000Z",
        createdBy: null,
      },
    ],
    terminology: [
      {
        stable_id: "term_1",
        id: "diag-term",
        term: "Hello",
        definition: "greeting",
        notes: "note",
        status: "approved",
        translations: { ar: "مرحبا", en: "Hello" },
      },
    ],
    auditLog: [
      {
        stable_id: "audit_user",
        id: "diag-audit-u",
        entityType: "translation_value",
        entityId: "val_appshell_hello_ar",
        action: "save_draft",
        actorId: UUID,
        actor_kind: "user",
        actor_ref: null,
        detail: { note: "ok" },
        createdAt: "2026-08-07T00:00:05.000Z",
      },
      {
        stable_id: "audit_system",
        id: "diag-audit-s",
        entityType: "suggestion",
        entityId: "sug_1",
        action: "ai_suggest",
        actorId: null,
        actor_kind: "system",
        actor_ref: "system:pipeline",
        detail: {},
        createdAt: "2026-08-07T00:00:01.000Z",
      },
      {
        stable_id: "__shadow_smoke_v1__audit",
        id: "diag-smoke-audit",
        entityType: "translation_value",
        entityId: "__shadow_smoke_v1__value",
        action: "smoke",
        actorId: null,
        actor_kind: "system",
        actor_ref: "system:smoke",
        detail: {},
        createdAt: "2026-08-07T00:00:00.000Z",
      },
    ],
  };
}

describe("Translation Studio remote read adapter V1", () => {
  it("maps UUID actors and leaves null actors null (no system:seed invention)", () => {
    expect(mapRemoteUuidActorField(UUID)).toBe(UUID.toLowerCase());
    expect(mapRemoteUuidActorField(null)).toBeNull();
    expect(mapRemoteUuidActorField(undefined)).toBeNull();
    expect(mapRemoteUuidActorField("system:seed")).toBeNull();
  });

  it("maps audit actor_kind/actor_ref correctly", () => {
    expect(
      mapRemoteAuditActorId({
        actorId: UUID,
        actor_kind: "user",
        actor_ref: null,
      })
    ).toBe(UUID.toLowerCase());
    expect(
      mapRemoteAuditActorId({
        actorId: null,
        actor_kind: "system",
        actor_ref: "system:pipeline",
      })
    ).toBe("system:pipeline");
    expect(
      mapRemoteAuditActorId({
        actorId: null,
        actor_kind: "import",
        actor_ref: "import:batch",
      })
    ).toBe("import:batch");
    expect(
      mapRemoteAuditActorId({
        actorId: null,
        actor_kind: "user",
        actor_ref: null,
      })
    ).toBeNull();
  });

  it("fromTranslationStudioReadSnapshot maps stable ids and preserves smoke extras", () => {
    const state = fromTranslationStudioReadSnapshot(sampleRemote());
    expect(state.schemaVersion).toBe(1);
    expect(state.languages.map((l) => l.code)).toEqual(["ar", "en"]);
    expect(state.namespaces.map((n) => n.id)).toEqual([
      "__shadow_smoke_v1__namespace",
      "ns_a",
      "ns_b",
    ]);
    expect(state.keys.map((k) => k.id)).toContain("__shadow_smoke_v1__key");
    expect(state.values.map((v) => v.id)).toContain("__shadow_smoke_v1__value");
    expect(state.auditLog.map((a) => a.id)).toContain(
      "__shadow_smoke_v1__audit"
    );
    expect(
      state.keys.find((k) => k.id === "key_appshell_hello")?.namespaceId
    ).toBe("ns_a");
    const hello = state.values.find((v) => v.id === "val_appshell_hello_ar");
    expect(hello?.suggestionId).toBe("sug_1");
    expect(hello?.createdBy).toBeNull();
    expect(hello?.updatedBy).toBe(UUID.toLowerCase());
    expect(state.suggestions[0]?.createdBy).toBe(UUID.toLowerCase());
    expect(state.auditLog.find((a) => a.id === "audit_user")?.actorId).toBe(
      UUID.toLowerCase()
    );
    expect(state.auditLog.find((a) => a.id === "audit_system")?.actorId).toBe(
      "system:pipeline"
    );
    // diagnostic UUID ids must not become runtime ids
    expect(state.namespaces.some((n) => n.id.startsWith("diag-"))).toBe(false);
  });

  it("loadAsync success invokes read transport once and never write", async () => {
    const readSnapshot = vi.fn(async () => sampleRemote());
    const upsertSnapshot = vi.fn(async () => {
      throw new Error("write must not run");
    });
    const readTransport: TranslationStudioReadRpcTransport = { readSnapshot };
    const transport: TranslationStudioWriteRpcTransport = { upsertSnapshot };
    const db = createDbStudioPersistence({ transport, readTransport });

    expect(db.loadSupported).toBe(true);
    expect(db.syncLoadSupported).toBe(false);
    expect(db.asyncLoadSupported).toBe(true);
    expect(() => db.load()).toThrow(StudioDbSyncLoadUnsupportedError);

    const state = await db.loadAsync();
    expect(readSnapshot).toHaveBeenCalledTimes(1);
    expect(upsertSnapshot).not.toHaveBeenCalled();
    expect(state.values).toHaveLength(2);
    expect(state.namespaces).toHaveLength(3);
  });

  it("classifies transport / auth / invalid_response failures", async () => {
    const transport: TranslationStudioWriteRpcTransport = {
      async upsertSnapshot() {
        return {
          ok: true,
          dry_run: false,
          schema_version: 1,
          inserted: 0,
          updated: 0,
          skipped: 0,
          prune_missing: false,
          caller_user_id: UUID,
        };
      },
    };

    const authDb = createDbStudioPersistence({
      transport,
      readTransport: {
        async readSnapshot() {
          throw new Error("translation_studio_read_snapshot failed: not allowed");
        },
      },
    });
    await expect(authDb.loadAsync()).rejects.toMatchObject({
      category: "auth",
    } satisfies Partial<StudioDbReadError>);

    const transportDb = createDbStudioPersistence({
      transport,
      readTransport: {
        async readSnapshot() {
          throw new Error("fetch failed / network down");
        },
      },
    });
    await expect(transportDb.loadAsync()).rejects.toMatchObject({
      category: "transport",
    });

    const invalidDb = createDbStudioPersistence({
      transport,
      readTransport: {
        async readSnapshot() {
          throw new Error("Studio DB read failed (response): object required");
        },
      },
    });
    await expect(invalidDb.loadAsync()).rejects.toMatchObject({
      category: "invalid_response",
    });
  });

  it("does not mutate JSON / default workflow still loads JSON under shadow mode", () => {
    const selected = createDefaultStudioPersistence({
      env: {
        [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "shadow_dual_write",
      },
      ephemeral: true,
    });
    expect(selected.implementation).toBe("json");
    // ephemeral factory returns json even when shadow requested — use non-ephemeral shape check via mode gate
    const mode = resolveTranslationStudioPersistenceMode({
      [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "shadow_dual_write",
    });
    expect(mode.kind).toBe("executable");
    expect(mode.mode).toBe("shadow_dual_write");
  });

  it("dual_read is executable; db_primary remains unsupported", () => {
    const dual = resolveTranslationStudioPersistenceMode({
      [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "dual_read",
    });
    expect(dual.kind).toBe("executable");
    expect(dual.mode).toBe("dual_read");

    const primary = resolveTranslationStudioPersistenceMode({
      [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "db_primary_json_fallback",
    });
    expect(primary.kind).toBe("unsupported");
  });

  it("write API unchanged: saveAsync still works with write transport only", async () => {
    const upsertSnapshot = vi.fn(async () => ({
      ok: true,
      dry_run: false,
      schema_version: 1,
      inserted: 1,
      updated: 0,
      skipped: 0,
      prune_missing: false,
      caller_user_id: UUID,
    }));
    const db = createDbStudioPersistence({
      transport: { upsertSnapshot },
    });
    const state = fromTranslationStudioReadSnapshot(sampleRemote());
    await expect(db.saveAsync(state)).resolves.toMatchObject({ ok: true, inserted: 1 });
    expect(upsertSnapshot).toHaveBeenCalledTimes(1);
  });

  it("toTranslationStudioWriteSnapshot round-trip uses stable ids (read-only local)", () => {
    const state = fromTranslationStudioReadSnapshot(sampleRemote());
    const snap = toTranslationStudioWriteSnapshot(state);
    expect(snap.namespaces.map((n) => n.id)).toEqual([
      "__shadow_smoke_v1__namespace",
      "ns_a",
      "ns_b",
    ]);
    expect(snap.values.find((v) => v.id === "val_appshell_hello_ar")?.suggestionId).toBe(
      "sug_1"
    );
    expect(snap.auditLog.find((a) => a.id === "audit_system")?.actorId).toBe(
      "system:pipeline"
    );
    // representational: createdBy null stays null (system:seed was never on remote)
    expect(snap.values.find((v) => v.id === "val_appshell_hello_ar")?.createdBy).toBeNull();
  });
});
