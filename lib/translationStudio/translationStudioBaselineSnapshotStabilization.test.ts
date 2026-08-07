import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  APP_SHELL_INGEST_AUDIT_ID,
  TRANSLATION_STUDIO_SEED_TIMESTAMP_V1,
  buildSeedPersistedState,
  createJsonStudioPersistence,
  fingerprintStudioSnapshot,
  ingestAppShellCatalog,
  stableAppShellMemoryId,
  toTranslationStudioWriteSnapshot,
} from "./index";

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length) {
    const d = tempDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

function uniq(ids: string[]) {
  return new Set(ids).size;
}

describe("baseline snapshot stabilization V1", () => {
  it("uses the fixed seed timestamp constant by default", () => {
    const state = buildSeedPersistedState();
    expect(state.updatedAt).toBe(TRANSLATION_STUDIO_SEED_TIMESTAMP_V1);
    expect(state.values.every((v) => v.createdAt === TRANSLATION_STUDIO_SEED_TIMESTAMP_V1)).toBe(
      true
    );
    expect(state.memory.every((m) => m.createdAt === TRANSLATION_STUDIO_SEED_TIMESTAMP_V1)).toBe(
      true
    );
    expect(state.auditLog[0]?.id).toBe(APP_SHELL_INGEST_AUDIT_ID);
    expect(state.auditLog[0]?.createdAt).toBe(TRANSLATION_STUDIO_SEED_TIMESTAMP_V1);
  });

  it("produces identical write snapshots and fingerprints across seed builds", () => {
    const a = buildSeedPersistedState();
    const b = buildSeedPersistedState();
    expect(toTranslationStudioWriteSnapshot(a)).toEqual(
      toTranslationStudioWriteSnapshot(b)
    );
    expect(fingerprintStudioSnapshot(a)).toBe(fingerprintStudioSnapshot(b));
    expect(fingerprintStudioSnapshot(a)).toBe(
      fingerprintStudioSnapshot(buildSeedPersistedState())
    );
  });

  it("changes fingerprint when a semantic field changes", () => {
    const a = buildSeedPersistedState();
    const mutated = {
      ...a,
      values: a.values.map((v, i) =>
        i === 0 ? { ...v, value: `${v.value}__mutated` } : v
      ),
    };
    expect(fingerprintStudioSnapshot(mutated)).not.toBe(
      fingerprintStudioSnapshot(a)
    );
  });

  it("has unique stable identities across every entity class", () => {
    const state = buildSeedPersistedState();
    const classes: Array<[string, string[]]> = [
      ["languages", state.languages.map((l) => l.code)],
      ["namespaces", state.namespaces.map((n) => n.id)],
      ["keys", state.keys.map((k) => k.id)],
      ["suggestions", state.suggestions.map((s) => s.id)],
      ["values", state.values.map((v) => v.id)],
      ["versions", state.versions.map((v) => v.id)],
      ["memory", state.memory.map((m) => m.id)],
      ["terminology", state.terminology.map((t) => t.id)],
      ["auditLog", state.auditLog.map((a) => a.id)],
    ];
    for (const [name, ids] of classes) {
      expect(uniq(ids), name).toBe(ids.length);
    }
    expect(state.memory.length).toBeGreaterThan(72);
    expect(
      state.memory.every(
        (m) =>
          m.language === "ar" &&
          m.id ===
            stableAppShellMemoryId(
              // recover catalog key from id: tm_appshell_<key>_<lang>
              m.id
                .slice("tm_appshell_".length, -"_ar".length)
                .replace(/__/g, "."),
              "ar"
            )
      )
    ).toBe(true);
  });

  it("preserves referential integrity for values and memory", () => {
    const state = buildSeedPersistedState();
    const keyIds = new Set(state.keys.map((k) => k.id));
    const nsIds = new Set(state.namespaces.map((n) => n.id));
    const langs = new Set(state.languages.map((l) => l.code));
    expect(
      state.values.every(
        (v) => keyIds.has(v.keyId) && langs.has(v.language)
      )
    ).toBe(true);
    expect(
      state.memory.every(
        (m) => !m.namespaceId || nsIds.has(m.namespaceId)
      )
    ).toBe(true);
  });

  it("does not rewrite timestamps when loading persisted store.json", () => {
    const dir = mkdtempSync(join(tmpdir(), "umtuba-seed-persist-"));
    tempDirs.push(dir);
    const stamped = buildSeedPersistedState("2025-06-01T12:00:00.000Z");
    const json = createJsonStudioPersistence({ dataDir: dir });
    json.save(stamped);
    const loaded = json.load();
    expect(loaded?.updatedAt).toBe("2025-06-01T12:00:00.000Z");
    expect(loaded?.values[0]?.createdAt).toBe("2025-06-01T12:00:00.000Z");
    // Touching seed construction must not mutate the file.
    buildSeedPersistedState();
    expect(json.load()?.updatedAt).toBe("2025-06-01T12:00:00.000Z");
  });

  it("reingest replaces ingest audit without duplicating its stable id", () => {
    const first = ingestAppShellCatalog(null, {
      now: TRANSLATION_STUDIO_SEED_TIMESTAMP_V1,
    });
    const second = ingestAppShellCatalog(first.state, {
      now: TRANSLATION_STUDIO_SEED_TIMESTAMP_V1,
    });
    const audits = second.state.auditLog.filter(
      (a) => a.id === APP_SHELL_INGEST_AUDIT_ID
    );
    expect(audits).toHaveLength(1);
  });

  it("exposes a stable canonical seed hash for readiness retries", () => {
    const hash = fingerprintStudioSnapshot(buildSeedPersistedState());
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).toBe(fingerprintStudioSnapshot(buildSeedPersistedState()));
  });
});
