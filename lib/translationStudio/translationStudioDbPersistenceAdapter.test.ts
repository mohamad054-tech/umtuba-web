import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it, vi } from "vitest";
import {
  TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV,
  createDbStudioPersistence,
  createDefaultStudioPersistence,
  createSupabaseWriteRpcTransport,
  createTranslationStudioWorkflow,
  parseTranslationStudioUpsertSnapshotResult,
  resetTranslationStudioWorkflowForTests,
  resolveTranslationStudioPersistenceMode,
  toTranslationStudioWriteSnapshot,
  StudioDbLoadUnsupportedError,
  StudioDbSyncSaveUnsupportedError,
  type PersistedStudioState,
  type TranslationStudioWriteRpcTransport,
} from "./index";

const ROOT = join(__dirname);

function sampleState(): PersistedStudioState {
  return {
    schemaVersion: 1,
    updatedAt: "2026-08-07T00:00:00.000Z",
    languages: [
      {
        code: "ar",
        name: "Arabic",
        nativeName: "العربية",
        direction: "rtl",
        enabled: true,
      },
      {
        code: "en",
        name: "English",
        nativeName: "English",
        direction: "ltr",
        enabled: true,
      },
    ],
    namespaces: [
      { id: "ns_b", name: "B", description: "" },
      { id: "ns_a", name: "A", description: "alpha" },
    ],
    keys: [
      {
        id: "key_appshell_hello",
        namespaceId: "ns_a",
        key: "hello",
        sourceText: "Hello",
        description: "greet",
      },
    ],
    suggestions: [
      {
        id: "sug_1",
        keyId: "key_appshell_hello",
        valueId: "val_appshell_hello_ar",
        sourceText: "Hello",
        targetLanguage: "ar",
        candidateText: "مرحبا",
        status: "pending_review",
        createdAt: "2026-08-07T00:00:01.000Z",
        createdBy: "system:pipeline",
        quality: {
          confidence: 0.9,
          reusedFromMemory: false,
          terminologyHits: [],
          terminologyConflicts: [],
          providerVia: "stub",
        },
      },
    ],
    values: [
      {
        id: "val_appshell_hello_ar",
        keyId: "key_appshell_hello",
        language: "ar",
        value: "مرحبا",
        status: "needs_review",
        createdAt: "2026-08-07T00:00:02.000Z",
        updatedAt: "2026-08-07T00:00:03.000Z",
        createdBy: "system:seed",
        updatedBy: "7298bb8d-0000-4000-8000-000000006c15",
        approvedBy: null,
        suggestionId: "sug_1",
        version: 1,
      },
    ],
    versions: [
      {
        id: "ver_1",
        valueId: "val_appshell_hello_ar",
        keyId: "key_appshell_hello",
        language: "ar",
        value: "مرحبا",
        status: "needs_review",
        version: 1,
        changedBy: "system:seed",
        changeAction: "upsert",
        changeNote: null,
        createdAt: "2026-08-07T00:00:02.000Z",
      },
    ],
    memory: [
      {
        id: "tm_1",
        sourceFingerprint: "abc123",
        sourceText: "Hello",
        language: "ar",
        translatedText: "مرحبا",
        status: "approved",
        namespaceId: "ns_a",
        createdAt: "2026-08-07T00:00:04.000Z",
        createdBy: "system:app_shell_ingestion",
      },
    ],
    terminology: [
      {
        id: "term_1",
        term: "Hello",
        definition: "greeting",
        notes: "note",
        status: "approved",
        translations: { ar: "مرحبا", en: "Hello" },
      },
    ],
    auditLog: [
      {
        id: "audit_2",
        entityType: "translation_value",
        entityId: "val_appshell_hello_ar",
        action: "save_draft",
        actorId: "7298bb8d-0000-4000-8000-000000006c15",
        detail: { note: "ok" },
        createdAt: "2026-08-07T00:00:05.000Z",
      },
      {
        id: "audit_1",
        entityType: "suggestion",
        entityId: "sug_1",
        action: "ai_suggest",
        actorId: "system:pipeline",
        detail: {},
        createdAt: "2026-08-07T00:00:01.000Z",
      },
    ],
  };
}

function okRpcResult(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    dry_run: false,
    schema_version: 1,
    inserted: 0,
    updated: 0,
    skipped: 0,
    prune_missing: false,
    caller_user_id: "7298bb8d-0000-4000-8000-000000006c15",
    ...overrides,
  };
}

describe("Translation Studio DB persistence adapter V1", () => {
  it("serializes PersistedStudioState to schemaVersion=1 RPC snapshot", () => {
    const snapshot = toTranslationStudioWriteSnapshot(sampleState());
    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot).not.toHaveProperty("updatedAt");
    expect(snapshot.languages.map((l) => l.code)).toEqual(["ar", "en"]);
    expect(snapshot.namespaces.map((n) => n.id)).toEqual(["ns_a", "ns_b"]);
    expect(snapshot.auditLog.map((a) => a.id)).toEqual(["audit_1", "audit_2"]);
    expect(snapshot.keys).toHaveLength(1);
    expect(snapshot.suggestions).toHaveLength(1);
    expect(snapshot.values).toHaveLength(1);
    expect(snapshot.versions).toHaveLength(1);
    expect(snapshot.memory).toHaveLength(1);
    expect(snapshot.terminology).toHaveLength(1);
  });

  it("preserves stable ids and suggestionId mapping", () => {
    const snapshot = toTranslationStudioWriteSnapshot(sampleState());
    expect(snapshot.keys[0]?.id).toBe("key_appshell_hello");
    expect(snapshot.values[0]?.id).toBe("val_appshell_hello_ar");
    expect(snapshot.values[0]?.suggestionId).toBe("sug_1");
    expect(snapshot.suggestions[0]?.id).toBe("sug_1");
    expect(snapshot.memory[0]?.id).toBe("tm_1");
    expect(snapshot.terminology[0]?.id).toBe("term_1");
  });

  it("preserves actor metadata strings for RPC actor_kind/actor_ref derivation", () => {
    const snapshot = toTranslationStudioWriteSnapshot(sampleState());
    expect(snapshot.auditLog.find((a) => a.id === "audit_1")?.actorId).toBe(
      "system:pipeline"
    );
    expect(snapshot.auditLog.find((a) => a.id === "audit_2")?.actorId).toBe(
      "7298bb8d-0000-4000-8000-000000006c15"
    );
    expect(snapshot.values[0]?.createdBy).toBe("system:seed");
    expect(snapshot.values[0]?.updatedBy).toBe(
      "7298bb8d-0000-4000-8000-000000006c15"
    );
    expect(snapshot.values[0]?.approvedBy).toBeNull();
    expect(snapshot.suggestions[0]?.createdBy).toBe("system:pipeline");
  });

  it("calls injected RPC transport with snapshot + options (no table APIs)", async () => {
    const upsertSnapshot = vi.fn(async () => okRpcResult({ inserted: 3 }));
    const transport: TranslationStudioWriteRpcTransport = { upsertSnapshot };
    const db = createDbStudioPersistence({ transport });

    const result = await db.saveAsync(sampleState(), { dry_run: true });
    expect(result.ok).toBe(true);
    expect(result.inserted).toBe(3);
    expect(upsertSnapshot).toHaveBeenCalledTimes(1);
    expect(upsertSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        schemaVersion: 1,
        values: [
          expect.objectContaining({ id: "val_appshell_hello_ar" }),
        ],
      }),
      { dry_run: true }
    );
  });

  it("accepts valid RPC response and rejects invalid responses fail-closed", async () => {
    expect(parseTranslationStudioUpsertSnapshotResult(okRpcResult())).toMatchObject(
      { ok: true, schema_version: 1, prune_missing: false }
    );

    expect(() =>
      parseTranslationStudioUpsertSnapshotResult({ ok: false })
    ).toThrow(/ok must be true/);
    expect(() =>
      parseTranslationStudioUpsertSnapshotResult({
        ...okRpcResult(),
        schema_version: 2,
      })
    ).toThrow(/schema_version/);
    expect(() => parseTranslationStudioUpsertSnapshotResult(null)).toThrow(
      /object required/
    );

    const badTransport: TranslationStudioWriteRpcTransport = {
      async upsertSnapshot() {
        return { ok: true, schema_version: 1 };
      },
    };
    const db = createDbStudioPersistence({ transport: badTransport });
    await expect(db.saveAsync(sampleState())).rejects.toThrow(
      /Studio DB save failed \(response\)/
    );
  });

  it("propagates transport errors fail-closed", async () => {
    const transport: TranslationStudioWriteRpcTransport = {
      async upsertSnapshot() {
        throw new Error("network down");
      },
    };
    const db = createDbStudioPersistence({ transport });
    await expect(db.saveAsync(sampleState())).rejects.toThrow(
      /Studio DB save failed \(transport\): network down/
    );
  });

  it("load and sync save are unsupported; saveAsync is the write path", async () => {
    const transport: TranslationStudioWriteRpcTransport = {
      async upsertSnapshot() {
        return okRpcResult();
      },
    };
    const db = createDbStudioPersistence({ transport });
    expect(db.kind).toBe("db");
    expect(db.loadSupported).toBe(false);
    expect(db.syncSaveSupported).toBe(false);
    expect(() => db.load()).toThrow(StudioDbLoadUnsupportedError);
    expect(() => db.save(sampleState())).toThrow(StudioDbSyncSaveUnsupportedError);
    await expect(db.saveAsync(sampleState())).resolves.toMatchObject({ ok: true });
  });

  it("supabase transport uses rpc only with p_snapshot / p_options", async () => {
    const rpc = vi.fn(async () => ({
      data: okRpcResult({ dry_run: true, inserted: 1 }),
      error: null,
    }));
    const transport = createSupabaseWriteRpcTransport({ rpc });

    await transport.upsertSnapshot(
      toTranslationStudioWriteSnapshot(sampleState()),
      { dry_run: true }
    );
    expect(rpc).toHaveBeenCalledWith("translation_studio_upsert_snapshot", {
      p_snapshot: expect.objectContaining({ schemaVersion: 1 }),
      p_options: { dry_run: true },
    });
  });

  it("adapter source does not use direct table mutation APIs", () => {
    const src = readFileSync(
      join(ROOT, "persistence", "dbStudioPersistence.ts"),
      "utf8"
    );
    expect(src).not.toMatch(/\.from\(/);
    expect(src).not.toMatch(/\.(insert|update|delete|upsert)\(/);
    expect(src).toMatch(/transport\.upsertSnapshot/);
  });

  it("JSON remains the only default; dual_read/db_primary stay closed; shadow is opt-in", () => {
    resetTranslationStudioWorkflowForTests();
    for (const mode of ["dual_read", "db_primary_json_fallback"] as const) {
      const resolution = resolveTranslationStudioPersistenceMode({
        [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: mode,
      });
      expect(resolution.kind).toBe("unsupported");
      expect(resolution.implementation).toBe("json");
      if (resolution.kind === "unsupported") {
        expect(resolution.message).toMatch(/not executable/i);
      }

      const selected = createDefaultStudioPersistence({
        env: { [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: mode },
        ephemeral: true,
      });
      expect(selected.implementation).toBe("json");
    }

    const shadow = resolveTranslationStudioPersistenceMode({
      [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "shadow_dual_write",
    });
    expect(shadow.kind).toBe("executable");
    expect(shadow.mode).toBe("shadow_dual_write");

    const jsonDefault = createDefaultStudioPersistence({ ephemeral: true });
    expect(jsonDefault.implementation).toBe("json");
    expect(jsonDefault.resolution.kind).toBe("executable");

    // Workflow still works with JSON/ephemeral — public API compatibility.
    const wf = createTranslationStudioWorkflow({ ephemeral: true });
    expect(wf.getSnapshot().languages.length).toBeGreaterThan(0);
    resetTranslationStudioWorkflowForTests();
  });
});
