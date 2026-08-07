import { describe, expect, it, vi } from "vitest";
import {
  TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV,
  createDefaultStudioPersistence,
  createEphemeralStudioPersistence,
  createShadowDualWriteStudioPersistence,
  createStudioShadowWriteQueue,
  resolveTranslationStudioPersistenceMode,
  runWithStudioShadowWriteTransport,
  type PersistedStudioState,
  type StudioShadowObserveEvent,
  type TranslationStudioWriteRpcTransport,
} from "./index";

function miniState(
  overrides: Partial<PersistedStudioState> = {}
): PersistedStudioState {
  return {
    schemaVersion: 1,
    updatedAt: "2026-08-07T00:00:00.000Z",
    languages: [
      {
        code: "en",
        name: "English",
        nativeName: "English",
        direction: "ltr",
        enabled: true,
      },
    ],
    namespaces: [],
    keys: [],
    suggestions: [],
    values: [],
    versions: [],
    memory: [],
    terminology: [],
    auditLog: [],
    ...overrides,
  };
}

function okResult(overrides: Record<string, unknown> = {}) {
  return {
    ok: true as const,
    dry_run: false,
    schema_version: 1 as const,
    inserted: 1,
    updated: 0,
    skipped: 0,
    prune_missing: false as const,
    caller_user_id: "7298bb8d-0000-4000-8000-000000006c15",
    ...overrides,
  };
}

function collectingObserver() {
  const events: StudioShadowObserveEvent[] = [];
  return {
    events,
    observer: {
      onEvent(event: StudioShadowObserveEvent) {
        events.push(event);
      },
    },
  };
}

describe("Translation Studio shadow dual-write V1", () => {
  it("JSON success returns immediately despite pending DB write", async () => {
    let resolveWrite!: (v: ReturnType<typeof okResult>) => void;
    const writeGate = new Promise<ReturnType<typeof okResult>>((r) => {
      resolveWrite = r;
    });
    const transport: TranslationStudioWriteRpcTransport = {
      async upsertSnapshot() {
        return writeGate;
      },
    };
    const json = createEphemeralStudioPersistence();
    const { events, observer } = collectingObserver();
    const shadow = createShadowDualWriteStudioPersistence({
      json,
      getTransport: () => transport,
      observer,
      retryDelayMs: 1,
    });

    const state = miniState({ updatedAt: "t1" });
    expect(() => shadow.save(state)).not.toThrow();
    expect(json.load()?.updatedAt).toBe("t1");
    expect(events.some((e) => e.type === "queued")).toBe(true);

    resolveWrite(okResult());
    await shadow.whenShadowIdle();
    expect(events.some((e) => e.type === "succeeded")).toBe(true);
  });

  it("JSON failure prevents DB enqueue", () => {
    const transport = {
      upsertSnapshot: vi.fn(async () => okResult()),
    };
    const { events, observer } = collectingObserver();
    const shadow = createShadowDualWriteStudioPersistence({
      json: {
        load: () => null,
        save() {
          throw new Error("disk full");
        },
      },
      getTransport: () => transport,
      observer,
    });
    expect(() => shadow.save(miniState())).toThrow(/disk full/);
    expect(transport.upsertSnapshot).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it("DB failure does not fail successful JSON operation", async () => {
    const transport: TranslationStudioWriteRpcTransport = {
      async upsertSnapshot() {
        throw new Error("translation_studio_upsert_snapshot failed: boom");
      },
    };
    const json = createEphemeralStudioPersistence();
    const { events, observer } = collectingObserver();
    const shadow = createShadowDualWriteStudioPersistence({
      json,
      getTransport: () => transport,
      observer,
      maxRetries: 0,
      retryDelayMs: 1,
    });
    expect(() => shadow.save(miniState({ updatedAt: "ok" }))).not.toThrow();
    expect(json.load()?.updatedAt).toBe("ok");
    await shadow.whenShadowIdle();
    expect(events.some((e) => e.type === "failed")).toBe(true);
  });

  it("DB calls never overlap; rapid saves coalesce; latest pending wins", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const updatedAts: string[] = [];
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((r) => {
      releaseFirst = r;
    });
    let firstStarted!: () => void;
    const firstStartedGate = new Promise<void>((r) => {
      firstStarted = r;
    });

    const wrappingTransport: TranslationStudioWriteRpcTransport = {
      async upsertSnapshot(snapshot) {
        const note =
          (snapshot.terminology[0] as { notes?: string } | undefined)?.notes ??
          "";
        updatedAts.push(note);
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        if (note === "s1") {
          firstStarted();
          await firstGate;
        }
        inFlight -= 1;
        return okResult();
      },
    };

    const json = createEphemeralStudioPersistence();
    const { events, observer } = collectingObserver();
    const shadow = createShadowDualWriteStudioPersistence({
      json,
      getTransport: () => wrappingTransport,
      observer,
      retryDelayMs: 1,
    });

    shadow.save(
      miniState({
        terminology: [
          {
            id: "term_1",
            term: "a",
            definition: "",
            notes: "s1",
            status: "draft",
            translations: {},
          },
        ],
      })
    );
    await firstStartedGate;
    shadow.save(
      miniState({
        terminology: [
          {
            id: "term_1",
            term: "a",
            definition: "",
            notes: "s2",
            status: "draft",
            translations: {},
          },
        ],
      })
    );
    shadow.save(
      miniState({
        terminology: [
          {
            id: "term_1",
            term: "a",
            definition: "",
            notes: "s3",
            status: "draft",
            translations: {},
          },
        ],
      })
    );

    expect(events.filter((e) => e.type === "superseded").length).toBeGreaterThan(
      0
    );
    releaseFirst();
    await shadow.whenShadowIdle();
    expect(maxInFlight).toBe(1);
    expect(updatedAts).toEqual(["s1", "s3"]);
  });

  it("pre-flight rapid saves coalesce to latest only", async () => {
    const notes: string[] = [];
    const transport: TranslationStudioWriteRpcTransport = {
      async upsertSnapshot(snapshot) {
        notes.push(
          (snapshot.terminology[0] as { notes?: string } | undefined)?.notes ??
            ""
        );
        return okResult();
      },
    };
    const shadow = createShadowDualWriteStudioPersistence({
      json: createEphemeralStudioPersistence(),
      getTransport: () => transport,
      observer: { onEvent() {} },
      retryDelayMs: 1,
    });
    shadow.save(
      miniState({
        terminology: [
          {
            id: "t",
            term: "a",
            definition: "",
            notes: "a",
            status: "draft",
            translations: {},
          },
        ],
      })
    );
    shadow.save(
      miniState({
        terminology: [
          {
            id: "t",
            term: "a",
            definition: "",
            notes: "b",
            status: "draft",
            translations: {},
          },
        ],
      })
    );
    shadow.save(
      miniState({
        terminology: [
          {
            id: "t",
            term: "a",
            definition: "",
            notes: "c",
            status: "draft",
            translations: {},
          },
        ],
      })
    );
    await shadow.whenShadowIdle();
    expect(notes).toEqual(["c"]);
  });

  it("preserves monotonic save_seq across enqueues", async () => {
    const transport: TranslationStudioWriteRpcTransport = {
      async upsertSnapshot() {
        return okResult();
      },
    };
    const { events, observer } = collectingObserver();
    const shadow = createShadowDualWriteStudioPersistence({
      json: createEphemeralStudioPersistence(),
      getTransport: () => transport,
      observer,
      retryDelayMs: 1,
    });
    shadow.save(miniState());
    shadow.save(miniState());
    await shadow.whenShadowIdle();
    const queued = events.filter((e) => e.type === "queued");
    expect(queued.map((e) => e.save_seq)).toEqual([1, 2]);
    expect(shadow.lastShadowSeq).toBe(2);
  });

  it("transient failure retries boundedly; auth does not retry", async () => {
    let attempts = 0;
    const transport: TranslationStudioWriteRpcTransport = {
      async upsertSnapshot() {
        attempts += 1;
        throw new Error("network down");
      },
    };
    const { events, observer } = collectingObserver();
    const shadow = createShadowDualWriteStudioPersistence({
      json: createEphemeralStudioPersistence(),
      getTransport: () => transport,
      observer,
      maxRetries: 2,
      retryDelayMs: 1,
    });
    shadow.save(miniState());
    await shadow.whenShadowIdle();
    expect(attempts).toBe(3);
    expect(events.filter((e) => e.type === "retry").length).toBe(2);
    expect(events.some((e) => e.type === "failed")).toBe(true);

    attempts = 0;
    const authTransport: TranslationStudioWriteRpcTransport = {
      async upsertSnapshot() {
        attempts += 1;
        throw new Error("Not allowed: platform admin required");
      },
    };
    const obs2 = collectingObserver();
    const shadow2 = createShadowDualWriteStudioPersistence({
      json: createEphemeralStudioPersistence(),
      getTransport: () => authTransport,
      observer: obs2.observer,
      maxRetries: 2,
      retryDelayMs: 1,
    });
    shadow2.save(miniState());
    await shadow2.whenShadowIdle();
    expect(attempts).toBe(1);
    const failed = obs2.events.find((e) => e.type === "failed");
    expect(failed && failed.type === "failed" && failed.category).toBe("auth");
  });

  it("hung transport times out; queue continues with latest pending", async () => {
    let calls = 0;
    let firstStarted!: () => void;
    const firstStartedGate = new Promise<void>((r) => {
      firstStarted = r;
    });
    const transport: TranslationStudioWriteRpcTransport = {
      async upsertSnapshot(snapshot) {
        calls += 1;
        const note =
          (snapshot.terminology[0] as { notes?: string } | undefined)?.notes ??
          "";
        if (note === "first") {
          firstStarted();
          await new Promise(() => {
            // never resolves
          });
        }
        return okResult({ inserted: calls });
      },
    };
    const { events, observer } = collectingObserver();
    const shadow = createShadowDualWriteStudioPersistence({
      json: createEphemeralStudioPersistence(),
      getTransport: () => transport,
      observer,
      timeoutMs: 30,
      maxRetries: 0,
      retryDelayMs: 1,
    });
    shadow.save(
      miniState({
        terminology: [
          {
            id: "t",
            term: "a",
            definition: "",
            notes: "first",
            status: "draft",
            translations: {},
          },
        ],
      })
    );
    await firstStartedGate;
    shadow.save(
      miniState({
        terminology: [
          {
            id: "t",
            term: "a",
            definition: "",
            notes: "second",
            status: "draft",
            translations: {},
          },
        ],
      })
    );
    await shadow.whenShadowIdle();
    expect(events.some((e) => e.type === "failed")).toBe(true);
    const failed = events.find((e) => e.type === "failed");
    expect(failed && failed.type === "failed" && failed.category).toBe(
      "timeout"
    );
    expect(events.some((e) => e.type === "succeeded")).toBe(true);
    expect(calls).toBe(2);
  });

  it("missing request transport skips DB with unavailable; no anonymous RPC", async () => {
    const upsertSnapshot = vi.fn(async () => okResult());
    const { events, observer } = collectingObserver();
    const shadow = createShadowDualWriteStudioPersistence({
      json: createEphemeralStudioPersistence(),
      getTransport: () => null,
      observer,
    });
    shadow.save(miniState({ updatedAt: "local" }));
    expect(upsertSnapshot).not.toHaveBeenCalled();
    expect(events).toEqual([
      expect.objectContaining({
        type: "skipped",
        reason: "no_request_transport",
        category: "unavailable",
        save_seq: 1,
      }),
    ]);
    await shadow.whenShadowIdle();
  });

  it("ALS request binding supplies transport; observer has no secrets", async () => {
    const transport: TranslationStudioWriteRpcTransport = {
      async upsertSnapshot(_s, options) {
        expect(options?.dry_run).toBe(false);
        return okResult();
      },
    };
    const { events, observer } = collectingObserver();
    const shadow = createShadowDualWriteStudioPersistence({
      json: createEphemeralStudioPersistence(),
      observer,
      retryDelayMs: 1,
      // use default ALS getTransport
    });

    runWithStudioShadowWriteTransport(transport, () => {
      shadow.save(miniState());
    });
    await shadow.whenShadowIdle();
    expect(events.some((e) => e.type === "succeeded")).toBe(true);
    const blob = JSON.stringify(events);
    expect(blob).not.toMatch(/Bearer /i);
    expect(blob).not.toMatch(/service_role/i);
    expect(blob).not.toMatch(/eyJ/);
  });

  it("mode gate: json default; shadow executable; dual_read/db_primary unsupported", () => {
    expect(resolveTranslationStudioPersistenceMode({}).mode).toBe("json");
    expect(
      resolveTranslationStudioPersistenceMode({
        [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "shadow_dual_write",
      }).mode
    ).toBe("shadow_dual_write");
    expect(
      resolveTranslationStudioPersistenceMode({
        [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "dual_read",
      }).kind
    ).toBe("unsupported");
    expect(
      resolveTranslationStudioPersistenceMode({
        [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "db_primary_json_fallback",
      }).kind
    ).toBe("unsupported");

    const selected = createDefaultStudioPersistence({
      env: { [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "shadow_dual_write" },
      ephemeral: true,
    });
    // ephemeral forces non-durable json for tests
    expect(selected.implementation).toBe("json");
  });

  it("queue unit: older completion cannot start after newer pending supersede", async () => {
    const order: number[] = [];
    let unblock!: () => void;
    const gate = new Promise<void>((r) => {
      unblock = r;
    });
    let firstStarted!: () => void;
    const firstStartedGate = new Promise<void>((r) => {
      firstStarted = r;
    });
    const queue = createStudioShadowWriteQueue({
      maxRetries: 0,
      retryDelayMs: 1,
      timeoutMs: 5_000,
      observer: { onEvent() {} },
      write: async (state) => {
        const seq = Number(
          (state.terminology[0] as { notes?: string } | undefined)?.notes
        );
        if (seq === 1) {
          firstStarted();
          await gate;
        }
        order.push(seq);
        return okResult();
      },
    });
    const transport: TranslationStudioWriteRpcTransport = {
      async upsertSnapshot() {
        return okResult();
      },
    };
    queue.enqueue(
      miniState({
        terminology: [
          {
            id: "t",
            term: "x",
            definition: "",
            notes: "1",
            status: "draft",
            translations: {},
          },
        ],
      }),
      transport
    );
    await firstStartedGate;
    queue.enqueue(
      miniState({
        terminology: [
          {
            id: "t",
            term: "x",
            definition: "",
            notes: "2",
            status: "draft",
            translations: {},
          },
        ],
      }),
      transport
    );
    queue.enqueue(
      miniState({
        terminology: [
          {
            id: "t",
            term: "x",
            definition: "",
            notes: "3",
            status: "draft",
            translations: {},
          },
        ],
      }),
      transport
    );
    unblock();
    await queue.whenIdle();
    expect(order).toEqual([1, 3]);
  });

  it("shadow dual-write source does not construct service_role or table APIs", async () => {
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    const root = join(__dirname, "persistence");
    for (const file of [
      "shadowDualWriteStudioPersistence.ts",
      "shadowWriteQueue.ts",
      "shadowWriteContext.ts",
    ]) {
      const src = readFileSync(join(root, file), "utf8");
      expect(src).not.toMatch(/service_role/);
      expect(src).not.toMatch(/\.from\(/);
      expect(src).not.toMatch(/\.(insert|update|delete)\(/);
    }
  });
});
