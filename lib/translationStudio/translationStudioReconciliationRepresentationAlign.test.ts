import { describe, expect, it } from "vitest";
import {
  APP_SHELL_INGEST_AUDIT_ID,
  buildSeedPersistedState,
  canonicalizeJsonValue,
  compareStudioSnapshots,
  deriveAuditActorIdentity,
  type PersistedStudioState,
  type TranslationStudioReadSnapshotV1,
} from "./index";

const UUID_A = "7298bb8d-d7ee-4eb3-afa2-14e2c4af6c15";
const UUID_B = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function baseRemoteFromLocal(
  local: PersistedStudioState,
  opts?: {
    valueCreatedBy?: string | null;
    valueUpdatedBy?: string | null;
    valueApprovedBy?: string | null;
    memoryCreatedBy?: string | null;
    termTranslations?: Record<string, string>;
    auditActorId?: string | null;
    auditActorKind?: string | null;
    auditActorRef?: string | null;
  }
): TranslationStudioReadSnapshotV1 {
  const v0 = local.values[0]!;
  const m0 = local.memory[0]!;
  const t0 = local.terminology[0]!;
  const a0 = local.auditLog[0]!;
  return {
    schemaVersion: 1,
    languages: local.languages.map((l) => ({ ...l })),
    namespaces: local.namespaces.map((n) => ({
      stable_id: n.id,
      id: "diag-ns",
      name: n.name,
      description: n.description ?? "",
    })),
    keys: local.keys.map((k) => ({
      stable_id: k.id,
      id: "diag-key",
      namespaceStableId: k.namespaceId,
      key: k.key,
      sourceText: k.sourceText,
      description: k.description ?? null,
    })),
    suggestions: [],
    values: local.values.map((v) => ({
      stable_id: v.id,
      id: "diag-val",
      keyStableId: v.keyId,
      language: v.language,
      value: v.value,
      status: v.status,
      version: v.version,
      suggestion_stable_id: v.suggestionId ?? null,
      createdBy:
        v.id === v0.id
          ? (opts?.valueCreatedBy === undefined ? v.createdBy : opts.valueCreatedBy)
          : v.createdBy === "system:seed"
            ? null
            : v.createdBy,
      updatedBy:
        v.id === v0.id
          ? (opts?.valueUpdatedBy === undefined ? v.updatedBy : opts.valueUpdatedBy)
          : v.updatedBy === "system:seed"
            ? null
            : v.updatedBy,
      approvedBy:
        v.id === v0.id
          ? (opts?.valueApprovedBy === undefined
              ? v.approvedBy
              : opts.valueApprovedBy)
          : v.approvedBy === "system:seed"
            ? null
            : v.approvedBy,
    })),
    versions: [],
    memory: local.memory.map((m) => ({
      stable_id: m.id,
      id: "diag-mem",
      sourceFingerprint: m.sourceFingerprint,
      sourceText: m.sourceText,
      language: m.language,
      translatedText: m.translatedText,
      status: m.status,
      namespaceStableId: m.namespaceId ?? null,
      createdBy:
        m.id === m0.id
          ? (opts?.memoryCreatedBy === undefined
              ? m.createdBy === "system:seed"
                ? null
                : m.createdBy
              : opts.memoryCreatedBy)
          : m.createdBy === "system:seed"
            ? null
            : m.createdBy,
    })),
    terminology: local.terminology.map((t) => {
      const baseTranslations = t.translations as Record<string, string>;
      return {
        stable_id: t.id,
        id: "diag-term",
        term: t.term,
        definition: t.definition,
        notes: t.notes ?? null,
        status: t.status,
        translations:
          t.id === t0.id && opts?.termTranslations
            ? opts.termTranslations
            : Object.fromEntries(
                Object.keys(baseTranslations)
                  .sort()
                  .map((k) => [k, baseTranslations[k]!])
              ),
      };
    }),
    auditLog: local.auditLog.map((a) => {
      const actorId =
        a.id === a0.id && opts && "auditActorId" in (opts || {})
          ? opts.auditActorId!
          : a.actorId;
      const derived = deriveAuditActorIdentity(actorId);
      return {
        stable_id: a.id,
        id: "diag-audit",
        entityType: a.entityType,
        entityId: a.entityId,
        action: a.action,
        actorId:
          opts?.auditActorKind === "user" || derived.actor_kind === "user"
            ? derived.actor_uuid
            : null,
        actor_kind:
          a.id === a0.id && opts?.auditActorKind != null
            ? opts.auditActorKind
            : derived.actor_kind,
        actor_ref:
          a.id === a0.id && opts && "auditActorRef" in opts
            ? opts.auditActorRef!
            : derived.actor_ref,
        detail: a.detail,
      };
    }),
  };
}

describe("reconciliation representation alignment V1", () => {
  it("deriveAuditActorIdentity matches write-RPC system/user split", () => {
    expect(deriveAuditActorIdentity("system:seed")).toEqual({
      actor_kind: "system",
      actor_ref: "system:seed",
      actor_uuid: null,
    });
    expect(deriveAuditActorIdentity(UUID_A)).toEqual({
      actor_kind: "user",
      actor_ref: null,
      actor_uuid: UUID_A,
    });
  });

  it("canonicalizeJsonValue sorts object keys recursively; arrays stay ordered", () => {
    expect(canonicalizeJsonValue({ b: 1, a: { d: 2, c: 3 } })).toEqual({
      a: { c: 3, d: 2 },
      b: 1,
    });
    expect(canonicalizeJsonValue({ a: [ { b: 1, a: 2 }, { z: 1 } ] })).toEqual({
      a: [{ a: 2, b: 1 }, { z: 1 }],
    });
    expect(
      JSON.stringify(canonicalizeJsonValue([1, 2])) ===
        JSON.stringify(canonicalizeJsonValue([2, 1]))
    ).toBe(false);
  });

  it("system:seed vs null on UUID-only value/memory actors → harmless", () => {
    const local = buildSeedPersistedState();
    const remote = baseRemoteFromLocal(local);
    const report = compareStudioSnapshots({ local, remote });
    const actorHarmless = report.findings.filter(
      (f) =>
        f.category === "harmless_representation_difference" &&
        f.reasonCodes?.includes("actor_system_ref_not_persisted")
    );
    expect(actorHarmless.length).toBeGreaterThan(0);
    expect(
      report.findings.some(
        (f) =>
          f.category === "field_mismatch" &&
          (f.fields || []).some((x) =>
            ["createdBy", "updatedBy", "approvedBy"].includes(x)
          )
      )
    ).toBe(false);
  });

  it("audit system actor equals via actor_kind/actor_ref (not UUID actorId)", () => {
    const local = buildSeedPersistedState();
    const remote = baseRemoteFromLocal(local, {
      auditActorId: "system:seed",
      auditActorKind: "system",
      auditActorRef: "system:seed",
    });
    const report = compareStudioSnapshots({ local, remote });
    expect(
      report.findings.some(
        (f) =>
          f.entityType === "audit" &&
          f.identity === APP_SHELL_INGEST_AUDIT_ID &&
          f.category !== "audit_extra"
      )
    ).toBe(false);
  });

  it("terminology same content different key order → harmless json_object_key_order", () => {
    const local = buildSeedPersistedState();
    const t0 = local.terminology[0]!;
    const base = t0.translations as Record<string, string>;
    const shuffled: Record<string, string> = {};
    for (const k of Object.keys(base).reverse()) {
      shuffled[k] = base[k]!;
    }
    const remote = baseRemoteFromLocal(local, { termTranslations: shuffled });
    const report = compareStudioSnapshots({ local, remote });
    const hit = report.findings.find(
      (f) => f.entityType === "terminology" && f.identity === t0.id
    );
    expect(hit?.category).toBe("harmless_representation_difference");
    expect(hit?.reasonCodes).toContain("json_object_key_order");
    expect(hit?.fields).toEqual(["translations"]);
  });

  it("NEGATIVE: local UUID actor vs remote null → field_mismatch", () => {
    const local = buildSeedPersistedState();
    local.values[0] = { ...local.values[0]!, createdBy: UUID_A };
    const remote = baseRemoteFromLocal(local, { valueCreatedBy: null });
    const report = compareStudioSnapshots({ local, remote });
    const hit = report.findings.find(
      (f) => f.entityType === "value" && f.identity === local.values[0]!.id
    );
    expect(hit?.category).toBe("field_mismatch");
    expect(hit?.fields).toContain("createdBy");
  });

  it("NEGATIVE: two different UUID actors → field_mismatch", () => {
    const local = buildSeedPersistedState();
    local.values[0] = { ...local.values[0]!, createdBy: UUID_A };
    const remote = baseRemoteFromLocal(local, { valueCreatedBy: UUID_B });
    const report = compareStudioSnapshots({ local, remote });
    const hit = report.findings.find(
      (f) => f.entityType === "value" && f.identity === local.values[0]!.id
    );
    expect(hit?.category).toBe("field_mismatch");
    expect(hit?.fields).toContain("createdBy");
  });

  it("NEGATIVE: audit actor_ref differs where schema supports it → field_mismatch", () => {
    const local = buildSeedPersistedState();
    const remote = baseRemoteFromLocal(local, {
      auditActorKind: "system",
      auditActorRef: "system:other",
      auditActorId: null,
    });
    const report = compareStudioSnapshots({ local, remote });
    const hit = report.findings.find(
      (f) =>
        f.entityType === "audit" && f.identity === APP_SHELL_INGEST_AUDIT_ID
    );
    expect(hit?.category).toBe("field_mismatch");
    expect(hit?.fields).toContain("actor_ref");
  });

  it("NEGATIVE: terminology missing locale → field_mismatch", () => {
    const local = buildSeedPersistedState();
    const t0 = local.terminology[0]!;
    const incomplete = { ...t0.translations };
    delete incomplete.ar;
    const remote = baseRemoteFromLocal(local, { termTranslations: incomplete });
    const report = compareStudioSnapshots({ local, remote });
    const hit = report.findings.find(
      (f) => f.entityType === "terminology" && f.identity === t0.id
    );
    expect(hit?.category).toBe("field_mismatch");
    expect(hit?.fields).toContain("translations");
  });

  it("NEGATIVE: terminology changed translation value → field_mismatch", () => {
    const local = buildSeedPersistedState();
    const t0 = local.terminology[0]!;
    const changed = { ...t0.translations, en: "CHANGED" };
    const remote = baseRemoteFromLocal(local, { termTranslations: changed });
    const report = compareStudioSnapshots({ local, remote });
    const hit = report.findings.find(
      (f) => f.entityType === "terminology" && f.identity === t0.id
    );
    expect(hit?.category).toBe("field_mismatch");
  });

  it("NEGATIVE: nested JSON object value change → field_mismatch", () => {
    const local = buildSeedPersistedState();
    local.terminology[0] = {
      ...local.terminology[0]!,
      translations: {
        en: "Home",
        bag: JSON.stringify({ z: 1, a: 2 }),
      } as PersistedStudioState["terminology"][number]["translations"],
    };
    const remote = baseRemoteFromLocal(local, {
      termTranslations: {
        en: "Home",
        bag: JSON.stringify({ z: 1, a: 3 }),
      },
    });
    const report = compareStudioSnapshots({ local, remote });
    expect(
      report.findings.some(
        (f) =>
          f.entityType === "terminology" && f.category === "field_mismatch"
      )
    ).toBe(true);
  });

  it("NEGATIVE: array order change remains field_mismatch", () => {
    const local = buildSeedPersistedState();
    // Encode array via translations using JSON strings would not test array
    // path; use terminology translations as object of arrays by piggybacking
    // canonicalize on a synthetic local/remote through definition field is string.
    // Direct unit: canonicalize preserves array inequality.
    expect(
      JSON.stringify(canonicalizeJsonValue([1, 2])) ===
        JSON.stringify(canonicalizeJsonValue([2, 1]))
    ).toBe(false);
    // And object containing arrays:
    const a = { items: [1, 2] };
    const b = { items: [2, 1] };
    expect(
      JSON.stringify(canonicalizeJsonValue(a)) ===
        JSON.stringify(canonicalizeJsonValue(b))
    ).toBe(false);
  });

  it("findings are deterministically ordered by category/entity/identity", () => {
    const local = buildSeedPersistedState();
    const remote = baseRemoteFromLocal(local);
    remote.namespaces.push({
      stable_id: "__shadow_smoke_v1__namespace",
      id: "x",
      name: "smoke",
      description: "",
    });
    const report = compareStudioSnapshots({ local, remote });
    const keys = report.findings.map(
      (f) => `${f.category}|${f.entityType}|${f.identity}`
    );
    expect(keys).toEqual([...keys].sort());
  });
});
