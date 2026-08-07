import { mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV,
  createDefaultStudioPersistence,
  createJsonStudioPersistence,
  createNonDurableStudioPersistence,
  createTranslationStudioWorkflow,
  isExecutableJsonPersistenceMode,
  requestsDbBackedPersistence,
  resetTranslationStudioWorkflowForTests,
  resolveTranslationStudioPersistenceMode,
  stableAppShellKeyId,
  type StudioPersistencePort,
} from "./index";
import type { PersistedStudioState } from "./types";

const tempDirs: string[] = [];

afterEach(() => {
  resetTranslationStudioWorkflowForTests();
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
  delete process.env[TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV];
  delete process.env.UMTUBA_TRANSLATION_STUDIO_DATA_DIR;
});

function tempDataDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "umtuba-ts-port-"));
  tempDirs.push(dir);
  return dir;
}

describe("Translation Studio persistence mode gate", () => {
  it("unset env => executable json", () => {
    const resolution = resolveTranslationStudioPersistenceMode({});
    expect(resolution.kind).toBe("executable");
    expect(resolution.mode).toBe("json");
    expect(resolution.implementation).toBe("json");
    expect(isExecutableJsonPersistenceMode(resolution)).toBe(true);
    expect(requestsDbBackedPersistence(resolution)).toBe(false);
  });

  it("explicit json => executable json", () => {
    const resolution = resolveTranslationStudioPersistenceMode({
      [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "json",
    });
    expect(resolution).toMatchObject({
      kind: "executable",
      mode: "json",
      implementation: "json",
    });
  });

  it("unsupported future modes cannot activate DB behavior", () => {
    for (const mode of [
      "shadow_dual_write",
      "dual_read",
      "db_primary_json_fallback",
    ] as const) {
      const resolution = resolveTranslationStudioPersistenceMode({
        [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: mode,
      });
      expect(resolution.kind).toBe("unsupported");
      expect(resolution.implementation).toBe("json");
      expect(isExecutableJsonPersistenceMode(resolution)).toBe(false);
      expect(requestsDbBackedPersistence(resolution)).toBe(true);

      const selected = createDefaultStudioPersistence({
        env: { [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: mode },
        dataDir: tempDataDir(),
      });
      expect(selected.implementation).toBe("json");
      expect(selected.resolution.kind).toBe("unsupported");
      // JSON adapter only — load returns null on empty dir (seed path).
      expect(selected.persistence.load()).toBeNull();
    }
  });

  it("invalid mode fails closed to json implementation", () => {
    const resolution = resolveTranslationStudioPersistenceMode({
      [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "postgres",
    });
    expect(resolution.kind).toBe("invalid");
    expect(resolution.implementation).toBe("json");
    expect(isExecutableJsonPersistenceMode(resolution)).toBe(false);
    expect(requestsDbBackedPersistence(resolution)).toBe(false);

    const selected = createDefaultStudioPersistence({
      env: { [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "postgres" },
      dataDir: tempDataDir(),
    });
    expect(selected.implementation).toBe("json");
    expect(selected.resolution.kind).toBe("invalid");
  });
});

describe("JSON StudioPersistencePort", () => {
  it("load/save parity with store.json serialization", () => {
    const dataDir = tempDataDir();
    const port = createJsonStudioPersistence({ dataDir });
    expect(port.load()).toBeNull();

    const wf = createTranslationStudioWorkflow({ persistence: port });
    const draftable = wf
      .getSnapshot()
      .values.find((v) => v.language === "fr" && v.status === "needs_review");
    expect(draftable).toBeTruthy();

    wf.saveDraft({
      valueId: draftable!.id,
      text: "Port draft",
      actor: { userId: "u1" },
    });

    const raw = JSON.parse(
      readFileSync(join(dataDir, "store.json"), "utf8")
    ) as { schemaVersion: number; values: Array<{ id: string; value: string }> };
    expect(raw.schemaVersion).toBe(1);
    expect(raw.values.find((v) => v.id === draftable!.id)?.value).toBe(
      "Port draft"
    );

    const reloaded = createJsonStudioPersistence({ dataDir }).load();
    expect(reloaded?.values.find((v) => v.id === draftable!.id)?.value).toBe(
      "Port draft"
    );
  });

  it("missing store still seeds via workflow", () => {
    const dataDir = tempDataDir();
    const port = createJsonStudioPersistence({ dataDir });
    expect(port.load()).toBeNull();
    const wf = createTranslationStudioWorkflow({ persistence: port });
    expect(wf.getSnapshot().keys.length).toBeGreaterThan(0);
    expect(
      wf.getSnapshot().keys.some((k) => k.id === stableAppShellKeyId("nav.home"))
    ).toBe(true);
  });

  it("honors UMTUBA_TRANSLATION_STUDIO_DATA_DIR", () => {
    const dataDir = tempDataDir();
    process.env.UMTUBA_TRANSLATION_STUDIO_DATA_DIR = dataDir;
    const port = createJsonStudioPersistence();
    const wf = createTranslationStudioWorkflow({ persistence: port });
    const value = wf.getSnapshot().values[0]!;
    wf.saveDraft({
      valueId: value.id,
      text: "env-dir",
      actor: { userId: "u2" },
    });
    expect(readFileSync(join(dataDir, "store.json"), "utf8")).toContain(
      "env-dir"
    );
  });
});

describe("Workflow via persistence port", () => {
  it("operates through injected port without fileStore imports in call path", () => {
    const calls: string[] = [];
    let stored: PersistedStudioState | null = null;
    const port: StudioPersistencePort = {
      load() {
        calls.push("load");
        return stored;
      },
      save(state) {
        calls.push("save");
        stored = state;
      },
    };

    const wf = createTranslationStudioWorkflow({ persistence: port });
    expect(calls).toContain("load");
    const value = wf.getSnapshot().values.find((v) => v.language === "de")!;
    wf.saveDraft({
      valueId: value.id,
      text: "Über Port",
      actor: { userId: "editor" },
    });
    expect(calls).toContain("save");
    expect(stored).not.toBeNull();
    expect(
      stored!.values.find((v: { id: string }) => v.id === value.id)?.value
    ).toBe("Über Port");
  });

  it("preserves stable IDs and workflow transitions", () => {
    const wf = createTranslationStudioWorkflow({
      persistence: createNonDurableStudioPersistence(),
      ephemeral: true,
    });
    const keyId = stableAppShellKeyId("actions.save");
    expect(wf.getSnapshot().keys.some((k) => k.id === keyId)).toBe(true);

    const value = wf.getSnapshot().values.find((v) => v.keyId === keyId)!;
    const drafted = wf.saveDraft({
      valueId: value.id,
      text: "Speichern",
      actor: { userId: "e1" },
    });
    expect(drafted.status).toBe("draft");
    const reviewed = wf.submitForReview({
      valueId: drafted.id,
      actor: { userId: "e1" },
    });
    expect(reviewed.status).toBe("needs_review");
    const approved = wf.approve({
      valueId: reviewed.id,
      actor: { userId: "r1" },
    });
    expect(approved.status).toBe("approved");
    expect(approved.id).toBe(value.id);
  });

  it("singleton reload remains compatible", () => {
    const dataDir = tempDataDir();
    const a = createTranslationStudioWorkflow({ dataDir });
    const draftable = a
      .getSnapshot()
      .values.find((v) => v.language === "fr" && v.status === "needs_review");
    expect(draftable).toBeTruthy();
    a.saveDraft({
      valueId: draftable!.id,
      text: "singleton-reload",
      actor: { userId: "u" },
    });

    a.reload();
    expect(a.getValue(draftable!.id)?.value).toBe("singleton-reload");

    const b = createTranslationStudioWorkflow({ dataDir });
    expect(b.getValue(draftable!.id)?.value).toBe("singleton-reload");
  });
});
