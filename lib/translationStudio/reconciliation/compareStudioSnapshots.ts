/**
 * JSON-authoritative vs remote snapshot reconciliation comparator V1.
 * Pure — no I/O, no mutations.
 */

import { createHash } from "crypto";
import { SHADOW_SMOKE_V1_PREFIX } from "../smoke/shadowSmokeV1Constants";
import type { PersistedStudioState } from "../types";
import type { TranslationStudioReadSnapshotV1 } from "../persistence/readRpcContract";
import { fingerprintStudioSnapshot } from "../persistence/snapshotFingerprint";
import { toTranslationStudioWriteSnapshot } from "../persistence/writeRpcSnapshot";

/** Hash remote read snapshot with diagnostic UUID fields stripped. */
export function fingerprintReadSnapshot(
  remote: TranslationStudioReadSnapshotV1
): string {
  const stripId = <T extends Record<string, unknown>>(row: T) => {
    const { id: _id, ...rest } = row;
    return rest;
  };
  const canonical = {
    schemaVersion: 1 as const,
    languages: [...remote.languages].sort((a, b) =>
      a.code < b.code ? -1 : a.code > b.code ? 1 : 0
    ),
    namespaces: [...remote.namespaces]
      .map((n) => stripId({ ...n }))
      .sort((a, b) =>
        String(a.stable_id) < String(b.stable_id)
          ? -1
          : String(a.stable_id) > String(b.stable_id)
            ? 1
            : 0
      ),
    keys: [...remote.keys]
      .map((k) => stripId({ ...k }))
      .sort((a, b) =>
        String(a.stable_id) < String(b.stable_id)
          ? -1
          : String(a.stable_id) > String(b.stable_id)
            ? 1
            : 0
      ),
    suggestions: [...remote.suggestions]
      .map((s) => stripId({ ...s }))
      .sort((a, b) =>
        String(a.stable_id) < String(b.stable_id)
          ? -1
          : String(a.stable_id) > String(b.stable_id)
            ? 1
            : 0
      ),
    values: [...remote.values]
      .map((v) => stripId({ ...v }))
      .sort((a, b) =>
        String(a.stable_id) < String(b.stable_id)
          ? -1
          : String(a.stable_id) > String(b.stable_id)
            ? 1
            : 0
      ),
    versions: [...remote.versions]
      .map((v) => stripId({ ...v }))
      .sort((a, b) =>
        String(a.stable_id) < String(b.stable_id)
          ? -1
          : String(a.stable_id) > String(b.stable_id)
            ? 1
            : 0
      ),
    memory: [...remote.memory]
      .map((m) => stripId({ ...m }))
      .sort((a, b) =>
        String(a.stable_id) < String(b.stable_id)
          ? -1
          : String(a.stable_id) > String(b.stable_id)
            ? 1
            : 0
      ),
    terminology: [...remote.terminology]
      .map((t) => stripId({ ...t }))
      .sort((a, b) =>
        String(a.stable_id) < String(b.stable_id)
          ? -1
          : String(a.stable_id) > String(b.stable_id)
            ? 1
            : 0
      ),
    auditLog: [...remote.auditLog]
      .map((a) => stripId({ ...a }))
      .sort((a, b) =>
        String(a.stable_id) < String(b.stable_id)
          ? -1
          : String(a.stable_id) > String(b.stable_id)
            ? 1
            : 0
      ),
  };
  return createHash("sha256")
    .update(JSON.stringify(canonical), "utf8")
    .digest("hex");
}

export type ReconciliationMismatchCategory =
  | "missing_remote"
  | "extra_remote"
  | "field_mismatch"
  | "harmless_representation_difference"
  | "audit_missing"
  | "audit_extra";

export type ReconciliationEntityType =
  | "language"
  | "namespace"
  | "key"
  | "suggestion"
  | "value"
  | "version"
  | "memory"
  | "terminology"
  | "audit";

export type ReconciliationFinding = {
  category: ReconciliationMismatchCategory;
  entityType: ReconciliationEntityType;
  identity: string;
  fields?: string[];
  smokeResidue: boolean;
  /** Extra remote rows under no-prune are expected stale. */
  expectedStaleExtra?: boolean;
};

export type ReconciliationReportStatus =
  | "IN_SYNC"
  | "DRIFT_DETECTED"
  | "REMOTE_READ_FAILED";

export type ReconciliationReport = {
  status: ReconciliationReportStatus;
  localSnapshotHash: string;
  remoteSnapshotHash: string | null;
  counts: Record<ReconciliationMismatchCategory, number>;
  findings: ReconciliationFinding[];
  smokeResidueIdentities: string[];
  errorMessage?: string;
};

function emptyCounts(): Record<ReconciliationMismatchCategory, number> {
  return {
    missing_remote: 0,
    extra_remote: 0,
    field_mismatch: 0,
    harmless_representation_difference: 0,
    audit_missing: 0,
    audit_extra: 0,
  };
}

export function isReservedShadowSmokeIdentity(identity: string): boolean {
  return identity.startsWith(SHADOW_SMOKE_V1_PREFIX);
}

/** Language codes are shared catalog — never smoke-only by association. */
export function isSmokeOnlyClassifiableIdentity(
  entityType: ReconciliationEntityType,
  identity: string
): boolean {
  if (entityType === "language") return false;
  return isReservedShadowSmokeIdentity(identity);
}

function normNull(v: unknown): unknown {
  if (v === undefined) return null;
  return v;
}

function str(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

type LocalNorm = {
  languages: Map<string, Record<string, unknown>>;
  namespaces: Map<string, Record<string, unknown>>;
  keys: Map<string, Record<string, unknown>>;
  suggestions: Map<string, Record<string, unknown>>;
  values: Map<string, Record<string, unknown>>;
  versions: Map<string, Record<string, unknown>>;
  memory: Map<string, Record<string, unknown>>;
  terminology: Map<string, Record<string, unknown>>;
  audit: Map<string, Record<string, unknown>>;
};

function normalizeLocal(state: PersistedStudioState): LocalNorm {
  const snap = toTranslationStudioWriteSnapshot(state);
  const languages = new Map<string, Record<string, unknown>>();
  for (const l of snap.languages) {
    languages.set(l.code, {
      code: l.code,
      name: l.name,
      nativeName: l.nativeName,
      direction: l.direction,
      enabled: l.enabled,
    });
  }
  const namespaces = new Map<string, Record<string, unknown>>();
  for (const n of snap.namespaces) {
    namespaces.set(n.id, {
      name: n.name,
      description: n.description ?? "",
    });
  }
  const keys = new Map<string, Record<string, unknown>>();
  for (const k of snap.keys) {
    keys.set(k.id, {
      namespaceStableId: k.namespaceId,
      key: k.key,
      sourceText: k.sourceText,
      description: normNull(k.description),
    });
  }
  const suggestions = new Map<string, Record<string, unknown>>();
  for (const s of snap.suggestions) {
    suggestions.set(s.id, {
      keyStableId: s.keyId,
      valueStableId: s.valueId,
      sourceText: s.sourceText,
      targetLanguage: s.targetLanguage,
      candidateText: s.candidateText,
      status: s.status,
      createdBy: normNull(s.createdBy),
    });
  }
  const values = new Map<string, Record<string, unknown>>();
  for (const v of snap.values) {
    values.set(v.id, {
      keyStableId: v.keyId,
      language: v.language,
      value: v.value,
      status: v.status,
      version: v.version,
      suggestion_stable_id: normNull(v.suggestionId),
      createdBy: normNull(v.createdBy),
      updatedBy: normNull(v.updatedBy),
      approvedBy: normNull(v.approvedBy),
    });
  }
  const versions = new Map<string, Record<string, unknown>>();
  for (const x of snap.versions) {
    versions.set(x.id, {
      valueStableId: x.valueId,
      keyStableId: x.keyId,
      language: x.language,
      value: x.value,
      status: x.status,
      version: x.version,
      changedBy: normNull(x.changedBy),
      changeAction: x.changeAction,
      changeNote: normNull(x.changeNote),
    });
  }
  const memory = new Map<string, Record<string, unknown>>();
  for (const m of snap.memory) {
    memory.set(m.id, {
      sourceFingerprint: m.sourceFingerprint,
      sourceText: m.sourceText,
      language: m.language,
      translatedText: m.translatedText,
      status: m.status,
      namespaceStableId: normNull(m.namespaceId),
      createdBy: normNull(m.createdBy),
    });
  }
  const terminology = new Map<string, Record<string, unknown>>();
  for (const t of snap.terminology) {
    terminology.set(t.id, {
      term: t.term,
      definition: t.definition,
      notes: normNull(t.notes),
      status: t.status,
      translations: t.translations ?? {},
    });
  }
  const audit = new Map<string, Record<string, unknown>>();
  for (const a of snap.auditLog) {
    audit.set(a.id, {
      entityType: a.entityType,
      entityId: a.entityId,
      action: a.action,
      actorId: normNull(a.actorId),
    });
  }
  return {
    languages,
    namespaces,
    keys,
    suggestions,
    values,
    versions,
    memory,
    terminology,
    audit,
  };
}

function normalizeRemote(remote: TranslationStudioReadSnapshotV1): LocalNorm {
  const languages = new Map<string, Record<string, unknown>>();
  for (const l of remote.languages) {
    languages.set(l.code, {
      code: l.code,
      name: l.name,
      nativeName: l.nativeName,
      direction: l.direction,
      enabled: l.enabled,
    });
  }
  const namespaces = new Map<string, Record<string, unknown>>();
  for (const n of remote.namespaces) {
    namespaces.set(n.stable_id, {
      name: n.name,
      description: n.description ?? "",
    });
  }
  const keys = new Map<string, Record<string, unknown>>();
  for (const k of remote.keys) {
    keys.set(k.stable_id, {
      namespaceStableId: k.namespaceStableId,
      key: k.key,
      sourceText: k.sourceText,
      description: normNull(k.description),
    });
  }
  const suggestions = new Map<string, Record<string, unknown>>();
  for (const s of remote.suggestions) {
    suggestions.set(s.stable_id, {
      keyStableId: s.keyStableId,
      valueStableId: s.valueStableId,
      sourceText: s.sourceText,
      targetLanguage: s.targetLanguage,
      candidateText: s.candidateText,
      status: s.status,
      createdBy: normNull(s.createdBy),
    });
  }
  const values = new Map<string, Record<string, unknown>>();
  for (const v of remote.values) {
    values.set(v.stable_id, {
      keyStableId: v.keyStableId,
      language: v.language,
      value: v.value,
      status: v.status,
      version: v.version,
      suggestion_stable_id: normNull(v.suggestion_stable_id),
      createdBy: normNull(v.createdBy),
      updatedBy: normNull(v.updatedBy),
      approvedBy: normNull(v.approvedBy),
    });
  }
  const versions = new Map<string, Record<string, unknown>>();
  for (const x of remote.versions) {
    versions.set(x.stable_id, {
      valueStableId: x.valueStableId,
      keyStableId: x.keyStableId,
      language: x.language,
      value: x.value,
      status: x.status,
      version: x.version,
      changedBy: normNull(x.changedBy),
      changeAction: x.changeAction,
      changeNote: normNull(x.changeNote),
    });
  }
  const memory = new Map<string, Record<string, unknown>>();
  for (const m of remote.memory) {
    memory.set(m.stable_id, {
      sourceFingerprint: m.sourceFingerprint,
      sourceText: m.sourceText,
      language: m.language,
      translatedText: m.translatedText,
      status: m.status,
      namespaceStableId: normNull(m.namespaceStableId),
      createdBy: normNull(m.createdBy),
    });
  }
  const terminology = new Map<string, Record<string, unknown>>();
  for (const t of remote.terminology) {
    terminology.set(t.stable_id, {
      term: t.term,
      definition: t.definition,
      notes: normNull(t.notes),
      status: t.status,
      translations: t.translations ?? {},
    });
  }
  const audit = new Map<string, Record<string, unknown>>();
  for (const a of remote.auditLog) {
    audit.set(a.stable_id, {
      entityType: a.entityType,
      entityId: a.entityId,
      action: a.action,
      actorId: normNull(a.actorId),
    });
  }
  return {
    languages,
    namespaces,
    keys,
    suggestions,
    values,
    versions,
    memory,
    terminology,
    audit,
  };
}

function compareMaps(
  entityType: ReconciliationEntityType,
  local: Map<string, Record<string, unknown>>,
  remote: Map<string, Record<string, unknown>>,
  findings: ReconciliationFinding[],
  missingCat: ReconciliationMismatchCategory,
  extraCat: ReconciliationMismatchCategory
): void {
  for (const [id, loc] of local) {
    const rem = remote.get(id);
    if (!rem) {
      findings.push({
        category: missingCat,
        entityType,
        identity: id,
        smokeResidue: isSmokeOnlyClassifiableIdentity(entityType, id),
      });
      continue;
    }
    const fields: string[] = [];
    for (const key of Object.keys(loc)) {
      const lv = loc[key];
      const rv = rem[key];
      if (JSON.stringify(lv) !== JSON.stringify(rv)) {
        // Actor uuid string vs identical string
        if (str(lv) === str(rv) && (lv == null || rv == null || typeof lv !== "object")) {
          continue;
        }
        fields.push(key);
      }
    }
    if (fields.length > 0) {
      findings.push({
        category: "field_mismatch",
        entityType,
        identity: id,
        fields,
        smokeResidue: isSmokeOnlyClassifiableIdentity(entityType, id),
      });
    }
  }
  for (const id of remote.keys()) {
    if (!local.has(id)) {
      findings.push({
        category: extraCat,
        entityType,
        identity: id,
        smokeResidue: isSmokeOnlyClassifiableIdentity(entityType, id),
        expectedStaleExtra: extraCat === "extra_remote" || extraCat === "audit_extra",
      });
    }
  }
}

export function compareStudioSnapshots(input: {
  local: PersistedStudioState;
  remote: TranslationStudioReadSnapshotV1;
}): ReconciliationReport {
  const localHash = fingerprintStudioSnapshot(input.local);
  const remoteHash = fingerprintReadSnapshot(input.remote);

  const loc = normalizeLocal(input.local);
  const rem = normalizeRemote(input.remote);
  const findings: ReconciliationFinding[] = [];

  compareMaps("language", loc.languages, rem.languages, findings, "missing_remote", "extra_remote");
  compareMaps("namespace", loc.namespaces, rem.namespaces, findings, "missing_remote", "extra_remote");
  compareMaps("key", loc.keys, rem.keys, findings, "missing_remote", "extra_remote");
  compareMaps("suggestion", loc.suggestions, rem.suggestions, findings, "missing_remote", "extra_remote");
  compareMaps("value", loc.values, rem.values, findings, "missing_remote", "extra_remote");
  compareMaps("version", loc.versions, rem.versions, findings, "missing_remote", "extra_remote");
  compareMaps("memory", loc.memory, rem.memory, findings, "missing_remote", "extra_remote");
  compareMaps("terminology", loc.terminology, rem.terminology, findings, "missing_remote", "extra_remote");
  compareMaps("audit", loc.audit, rem.audit, findings, "audit_missing", "audit_extra");

  const counts = emptyCounts();
  for (const f of findings) {
    counts[f.category] += 1;
  }

  const smokeResidueIdentities = [
    ...new Set(
      findings
        .filter((f) => f.smokeResidue)
        .map((f) => f.identity)
        .concat(
          [...loc.namespaces.keys(), ...loc.keys.keys(), ...loc.values.keys(), ...loc.audit.keys()]
            .filter((id) => isReservedShadowSmokeIdentity(id))
        )
    ),
  ].sort();

  const driftRelevant = findings.filter(
    (f) => f.category !== "harmless_representation_difference"
  );

  return {
    status: driftRelevant.length === 0 ? "IN_SYNC" : "DRIFT_DETECTED",
    localSnapshotHash: localHash,
    remoteSnapshotHash: remoteHash,
    counts,
    findings,
    smokeResidueIdentities,
  };
}

export function createRemoteReadFailedReport(
  local: PersistedStudioState,
  errorMessage: string
): ReconciliationReport {
  return {
    status: "REMOTE_READ_FAILED",
    localSnapshotHash: fingerprintStudioSnapshot(local),
    remoteSnapshotHash: null,
    counts: emptyCounts(),
    findings: [],
    smokeResidueIdentities: [],
    errorMessage: errorMessage.slice(0, 400),
  };
}
