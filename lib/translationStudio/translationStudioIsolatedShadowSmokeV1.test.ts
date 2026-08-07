import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  APP_SHELL_NAMESPACES,
  SHADOW_SMOKE_ALLOW_ENV,
  SHADOW_SMOKE_V1_IDS,
  SHADOW_SMOKE_V1_PREFIX,
  TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV,
  assertIsolatedShadowSmokeGates,
  assertOnlyShadowSmokeV1Identities,
  buildShadowSmokeV1State,
  cleanupShadowSmokeV1JsonLocal,
  createShadowDualWriteStudioPersistence,
  createShadowSmokeV1JsonPersistence,
  isAppShellCatalogKey,
  isShadowSmokeAllowEnabled,
  listShadowSmokeV1StableIds,
  resolveNormalStudioStoreJsonPath,
  resolveShadowSmokeV1JsonPath,
  runIsolatedShadowSmokeV1,
  runWithStudioShadowWriteTransport,
  stableAppShellKeyId,
  type StudioShadowObserveEvent,
  type TranslationStudioWriteRpcTransport,
  type TranslationStudioWriteSnapshotV1,
} from "./index";

const ACTOR = "7298bb8d-d7ee-4eb3-afa2-14e2c4af6c15";

function okResult() {
  return {
    ok: true as const,
    dry_run: false,
    schema_version: 1 as const,
    inserted: 3,
    updated: 0,
    skipped: 0,
    prune_missing: false as const,
    caller_user_id: ACTOR,
  };
}

function smokeEnv(
  overrides: Record<string, string | undefined> = {}
): Record<string, string | undefined> {
  return {
    [SHADOW_SMOKE_ALLOW_ENV]: "true",
    [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "shadow_dual_write",
    ...overrides,
  };
}

const tempDirs: string[] = [];

function tempDataDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "umtuba-shadow-smoke-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("isolated shadow smoke V1 gates", () => {
  it("blocks when smoke flag absent", () => {
    expect(isShadowSmokeAllowEnabled({})).toBe(false);
    const gate = assertIsolatedShadowSmokeGates({
      [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "shadow_dual_write",
    });
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.code).toBe("SMOKE_DISABLED");
  });

  it("blocks when smoke flag false", () => {
    const gate = assertIsolatedShadowSmokeGates(
      smokeEnv({ [SHADOW_SMOKE_ALLOW_ENV]: "false" })
    );
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.code).toBe("SMOKE_DISABLED");
  });

  it("blocks when smoke flag true but persistence mode is json", () => {
    const gate = assertIsolatedShadowSmokeGates(
      smokeEnv({ [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "json" })
    );
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.code).toBe("SHADOW_MODE_REQUIRED");
  });

  it("allows when smoke flag true and shadow_dual_write set", () => {
    expect(assertIsolatedShadowSmokeGates(smokeEnv()).ok).toBe(true);
  });
});

describe("isolated shadow smoke V1 builder", () => {
  it("emits ONLY reserved smoke identities with deterministic ids", () => {
    const a = buildShadowSmokeV1State({ actorId: ACTOR });
    const b = buildShadowSmokeV1State({ actorId: ACTOR });
    assertOnlyShadowSmokeV1Identities(a);

    expect(a.namespaces[0]?.id).toBe(SHADOW_SMOKE_V1_IDS.namespace);
    expect(a.keys[0]?.id).toBe(SHADOW_SMOKE_V1_IDS.key);
    expect(a.keys[0]?.key).toBe(SHADOW_SMOKE_V1_IDS.keyName);
    expect(a.values[0]?.id).toBe(SHADOW_SMOKE_V1_IDS.valueEn);
    expect(a.auditLog[0]?.id).toBe(SHADOW_SMOKE_V1_IDS.audit);

    expect(listShadowSmokeV1StableIds(a).sort()).toEqual(
      listShadowSmokeV1StableIds(b).sort()
    );
    expect(a.keys[0]?.id).toBe(b.keys[0]?.id);
  });

  it("excludes App Shell namespaces/keys and production catalog shapes", () => {
    const state = buildShadowSmokeV1State({ actorId: ACTOR });
    expect(state.namespaces).toHaveLength(1);
    expect(state.keys).toHaveLength(1);
    expect(state.values).toHaveLength(1);
    expect(state.languages).toHaveLength(1);
    expect(state.languages[0]?.code).toBe("en");
    expect(state.terminology).toHaveLength(0);
    expect(state.memory).toHaveLength(0);
    expect(state.suggestions).toHaveLength(0);

    for (const ns of APP_SHELL_NAMESPACES) {
      expect(state.namespaces.some((n) => n.name === ns || n.id === `ns_${ns}`)).toBe(
        false
      );
    }
    expect(isAppShellCatalogKey(state.keys[0]!.key)).toBe(false);
    expect(state.keys[0]!.id).not.toBe(stableAppShellKeyId("nav.home"));
    expect(
      listShadowSmokeV1StableIds(state).every((id) =>
        id.startsWith(SHADOW_SMOKE_V1_PREFIX)
      )
    ).toBe(true);
  });
});

describe("isolated shadow smoke V1 persistence isolation", () => {
  it("writes isolated JSON path and leaves store.json untouched", () => {
    const dataDir = tempDataDir();
    mkdirSync(dataDir, { recursive: true });
    const json = createShadowSmokeV1JsonPersistence({ dataDir });
    const state = buildShadowSmokeV1State({ actorId: ACTOR });
    json.save(state);

    expect(json.filePath).toBe(resolveShadowSmokeV1JsonPath(dataDir));
    expect(existsSync(json.filePath)).toBe(true);
    expect(existsSync(resolveNormalStudioStoreJsonPath(dataDir))).toBe(false);
    expect(json.load()?.keys[0]?.id).toBe(SHADOW_SMOKE_V1_IDS.key);

    const cleanup = cleanupShadowSmokeV1JsonLocal({ dataDir });
    expect(cleanup.removed).toBe(true);
    expect(existsSync(json.filePath)).toBe(false);
    expect(existsSync(resolveNormalStudioStoreJsonPath(dataDir))).toBe(false);
  });

  it("cleanup never deletes store.json even if present", () => {
    const dataDir = tempDataDir();
    mkdirSync(dataDir, { recursive: true });
    const storePath = resolveNormalStudioStoreJsonPath(dataDir);
    writeFileSync(storePath, JSON.stringify({ keep: true }), "utf8");

    const json = createShadowSmokeV1JsonPersistence({ dataDir });
    json.save(buildShadowSmokeV1State({ actorId: ACTOR }));
    cleanupShadowSmokeV1JsonLocal({ dataDir });

    expect(existsSync(json.filePath)).toBe(false);
    expect(existsSync(storePath)).toBe(true);
    expect(JSON.parse(readFileSync(storePath, "utf8"))).toEqual({ keep: true });
  });
});

describe("isolated shadow smoke V1 runner composition", () => {
  it("JSON authoritative save precedes shadow enqueue; uses shadow queue not direct RPC", async () => {
    const dataDir = tempDataDir();
    const upsert = vi.fn(async (snapshot: TranslationStudioWriteSnapshotV1) => {
      expect(existsSync(resolveShadowSmokeV1JsonPath(dataDir))).toBe(true);
      expect(snapshot.keys.map((k) => k.id)).toEqual([SHADOW_SMOKE_V1_IDS.key]);
      expect(
        snapshot.keys.every((k) => k.id.startsWith(SHADOW_SMOKE_V1_PREFIX))
      ).toBe(true);
      expect(
        snapshot.namespaces.every((n) =>
          n.id.startsWith(SHADOW_SMOKE_V1_PREFIX)
        )
      ).toBe(true);
      return okResult();
    });
    const transport: TranslationStudioWriteRpcTransport = {
      upsertSnapshot: upsert,
    };

    const result = await runIsolatedShadowSmokeV1({
      actorId: ACTOR,
      transport,
      env: smokeEnv(),
      dataDir,
      drainTimeoutMs: 5_000,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.save_seq).toBeGreaterThanOrEqual(1);
    expect(result.events.some((e) => e.type === "queued")).toBe(true);
    expect(result.events.some((e) => e.type === "started")).toBe(true);
    expect(result.events.some((e) => e.type === "succeeded")).toBe(true);
    expect(result.drain).toBe("idle");
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(result.smokeJsonPath).toBe(resolveShadowSmokeV1JsonPath(dataDir));
    expect(existsSync(result.normalStoreJsonPath)).toBe(false);
  });

  it("runner blocked without smoke allow flag", async () => {
    const result = await runIsolatedShadowSmokeV1({
      actorId: ACTOR,
      transport: { upsertSnapshot: async () => okResult() },
      env: {
        [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "shadow_dual_write",
      },
      dataDir: tempDataDir(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("SMOKE_DISABLED");
  });

  it("missing request transport skips DB safely after JSON save", async () => {
    const dataDir = tempDataDir();
    const json = createShadowSmokeV1JsonPersistence({ dataDir });
    const events: StudioShadowObserveEvent[] = [];
    const upsert = vi.fn(async () => okResult());
    const shadow = createShadowDualWriteStudioPersistence({
      json,
      getTransport: () => null,
      observer: {
        onEvent(e) {
          events.push(e);
        },
      },
    });

    const state = buildShadowSmokeV1State({ actorId: ACTOR });
    shadow.save(state);

    expect(json.load()?.keys[0]?.id).toBe(SHADOW_SMOKE_V1_IDS.key);
    expect(events.some((e) => e.type === "skipped")).toBe(true);
    expect(upsert).not.toHaveBeenCalled();
    expect(existsSync(resolveNormalStudioStoreJsonPath(dataDir))).toBe(false);
  });

  it("bounded drain succeeds on completion", async () => {
    const dataDir = tempDataDir();
    let release!: (v: ReturnType<typeof okResult>) => void;
    const gate = new Promise<ReturnType<typeof okResult>>((r) => {
      release = r;
    });
    const json = createShadowSmokeV1JsonPersistence({ dataDir });
    const shadow = createShadowDualWriteStudioPersistence({
      json,
      getTransport: () => ({
        upsertSnapshot: async () => gate,
      }),
      observer: { onEvent() {} },
    });

    runWithStudioShadowWriteTransport(
      { upsertSnapshot: async () => gate },
      () => {
        shadow.save(buildShadowSmokeV1State({ actorId: ACTOR }));
      }
    );

    const pending = shadow.whenShadowIdleBounded(5_000);
    release(okResult());
    await expect(pending).resolves.toBe("idle");
  });

  it("bounded drain times out safely", async () => {
    const dataDir = tempDataDir();
    let release!: (v: ReturnType<typeof okResult>) => void;
    const gate = new Promise<ReturnType<typeof okResult>>((r) => {
      release = r;
    });
    const json = createShadowSmokeV1JsonPersistence({ dataDir });
    const shadow = createShadowDualWriteStudioPersistence({
      json,
      getTransport: () => ({
        upsertSnapshot: async () => gate,
      }),
      observer: { onEvent() {} },
      timeoutMs: 60_000,
      maxRetries: 0,
    });

    shadow.save(buildShadowSmokeV1State({ actorId: ACTOR }));
    await expect(shadow.whenShadowIdleBounded(25)).resolves.toBe("timeout");
    release(okResult());
    await shadow.whenShadowIdle();
  });
});

describe("isolated shadow smoke V1 admin action surface", () => {
  it("server action source requires platform-admin DB authority and fixed runner", async () => {
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    const src = readFileSync(
      join(
        process.cwd(),
        "app/actions/translationStudioShadowSmoke.ts"
      ),
      "utf8"
    );
    expect(src).toMatch(/assertPlatformAdminDb/);
    expect(src).toMatch(/runIsolatedShadowSmokeV1/);
    expect(src).toMatch(/createSupabaseWriteRpcTransport/);
    expect(src).toMatch(/createClient/);
    expect(src).not.toMatch(/createServiceRole|SERVICE_ROLE|serviceRole/);
    expect(src).not.toMatch(/upsertSnapshot\(/);
    expect(src).not.toMatch(/translation_studio_upsert_snapshot/);
    // No arbitrary caller snapshot
    expect(src).not.toMatch(/formData/);
  });
});
