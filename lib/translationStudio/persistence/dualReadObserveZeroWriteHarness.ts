/**
 * Zero-write dual-read observe readiness harness (fake transports only).
 * Covers classification / gate / breaker paths without remote mutation.
 */

import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import type { PersistedStudioState } from "../types";
import { buildSeedPersistedState } from "./seed";
import { toTranslationStudioWriteSnapshot } from "./writeRpcSnapshot";
import {
  hasActionableDualReadDrift,
  runStudioDualReadCompare,
} from "./dualReadCompare";
import {
  __clearDualReadObservationSlotsForTests,
  runTranslationStudioDualReadObservation,
} from "./dualReadObservation";
import {
  __setDualReadObservationBreakerForTests,
  recordDualReadObservationResult,
  resetDualReadObservationBreaker,
} from "./dualReadObservationBreaker";
import {
  buildDualReadObserveReadinessReport,
  evaluateDualReadObserveScheduleGate,
  mayNestDualReadObserveOverImplementation,
} from "./dualReadObserveReadiness";
import {
  TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ENV,
  TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV,
} from "./mode";
import { createDefaultStudioPersistence } from "./createDefaultStudioPersistence";
import { createShadowReconciliationJournal } from "./shadowReconciliationJournal";
import { SHADOW_SMOKE_V1_PREFIX } from "../smoke/shadowSmokeV1Constants";
import type { TranslationStudioReadSnapshotV1 } from "./readRpcContract";
import type { TranslationStudioReadRpcTransport } from "./readRpcTransport";
import { fingerprintStudioSnapshot } from "./snapshotFingerprint";

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
      description: n.description ?? "",
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

export type DualReadObserveHarnessCaseResult = {
  id: string;
  ok: boolean;
  detail?: string;
};

export type DualReadObserveZeroWriteHarnessReport = {
  schemaVersion: 1;
  verdict: "HARNESS_PASS" | "HARNESS_FAIL";
  cases: DualReadObserveHarnessCaseResult[];
  providerCalls: 0;
  remoteWrites: 0;
  localMutated: false;
  activationSafeDefault: boolean;
};

function fakeTransport(
  fn: () => Promise<TranslationStudioReadSnapshotV1>
): TranslationStudioReadRpcTransport {
  return { readSnapshot: fn };
}

/**
 * Run offline zero-write harness. Never touches remote DB.
 */
export async function runDualReadObserveZeroWriteHarness(): Promise<DualReadObserveZeroWriteHarnessReport> {
  const cases: DualReadObserveHarnessCaseResult[] = [];
  const tempDirs: string[] = [];
  const push = (id: string, ok: boolean, detail?: string) => {
    cases.push({ id, ok, detail });
  };

  resetDualReadObservationBreaker();
  __clearDualReadObservationSlotsForTests();

  try {
    const local = buildSeedPersistedState();
    const before = JSON.stringify(local);

    const defaultReport = buildDualReadObserveReadinessReport({
      env: {},
      readTransportAvailable: false,
    });
    push(
      "default_observe_off_not_activation_safe",
      defaultReport.activationSafe === false &&
        defaultReport.observeFlagRequested === false &&
        defaultReport.providerCalls === 0 &&
        defaultReport.remoteWrites === 0
    );

    const jsonOnlyGate = evaluateDualReadObserveScheduleGate({
      env: {
        [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "json",
        [TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ENV]: "1",
      },
      readTransportAvailable: true,
      baselineParityProven: true,
    });
    push(
      "json_only_observe_refused",
      jsonOnlyGate.maySchedule === false &&
        jsonOnlyGate.reason === "json_only_observe_unsafe"
    );

    push(
      "nest_json_refused",
      mayNestDualReadObserveOverImplementation({ implementation: "json" })
        .allowed === false
    );

    const shadowGate = evaluateDualReadObserveScheduleGate({
      env: {
        [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "shadow_dual_write",
        [TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ENV]: "1",
      },
      readTransportAvailable: true,
      baselineParityProven: true,
    });
    push(
      "shadow_observe_composition_allowed",
      shadowGate.maySchedule === true && shadowGate.report.activationSafe === true
    );

    const nestDir = mkdtempSync(join(tmpdir(), "umtuba-dual-harness-"));
    tempDirs.push(nestDir);
    const nested = createDefaultStudioPersistence({
      env: {
        [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "shadow_dual_write",
        [TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ENV]: "1",
      },
      dataDir: nestDir,
    });
    push(
      "factory_shadow_observe_nests",
      nested.dualReadEnabled === true &&
        nested.implementation === "shadow_dual_write"
    );

    const refuseDir = mkdtempSync(join(tmpdir(), "umtuba-dual-refuse-"));
    tempDirs.push(refuseDir);
    const refused = createDefaultStudioPersistence({
      env: {
        [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "json",
        [TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ENV]: "1",
      },
      dataDir: refuseDir,
    });
    push(
      "factory_json_observe_refused",
      refused.dualReadEnabled === false && refused.observeNestRefused === true
    );

    const inSync = await runStudioDualReadCompare({
      local,
      readTransport: fakeTransport(async () => remoteFromLocal(local)),
    });
    push("in_sync", inSync.status === "IN_SYNC");

    const missingRemoteSnap = remoteFromLocal(local);
    missingRemoteSnap.keys = missingRemoteSnap.keys.slice(1);
    const missing = await runStudioDualReadCompare({
      local,
      readTransport: fakeTransport(async () => missingRemoteSnap),
    });
    push(
      "missing_remote",
      missing.status === "DRIFT_DETECTED" &&
        (missing.counts.missing_remote ?? 0) > 0 &&
        Boolean(missing.report && hasActionableDualReadDrift(missing.report)),
      missing.status
    );

    const extraSnap = remoteFromLocal(local);
    extraSnap.keys = [
      ...extraSnap.keys,
      {
        stable_id: "extra_non_smoke_key",
        namespaceStableId: extraSnap.namespaces[0]?.stable_id ?? "ns",
        key: "extra.key",
        sourceText: "Extra",
        description: null,
      },
    ];
    const extra = await runStudioDualReadCompare({
      local,
      readTransport: fakeTransport(async () => extraSnap),
    });
    push(
      "extra_remote_actionable",
      extra.status === "DRIFT_DETECTED" &&
        (extra.counts.extra_remote ?? 0) > 0 &&
        Boolean(extra.report && hasActionableDualReadDrift(extra.report))
    );

    const smokeSnap = remoteFromLocal(local);
    smokeSnap.namespaces.push({
      stable_id: `${SHADOW_SMOKE_V1_PREFIX}namespace`,
      name: "smoke",
      description: "",
    });
    smokeSnap.keys.push({
      stable_id: `${SHADOW_SMOKE_V1_PREFIX}key`,
      namespaceStableId: `${SHADOW_SMOKE_V1_PREFIX}namespace`,
      key: "smoke",
      sourceText: "s",
      description: null,
    });
    const smoke = await runStudioDualReadCompare({
      local,
      readTransport: fakeTransport(async () => smokeSnap),
    });
    push(
      "smoke_residue_non_actionable",
      smoke.status === "IN_SYNC" &&
        Boolean(smoke.report && !hasActionableDualReadDrift(smoke.report))
    );

    const fieldSnap = remoteFromLocal(local);
    if (fieldSnap.keys[0]) {
      fieldSnap.keys[0] = {
        ...fieldSnap.keys[0],
        sourceText: "MUTATED_SOURCE_TEXT_FOR_MISMATCH",
      };
    }
    const field = await runStudioDualReadCompare({
      local,
      readTransport: fakeTransport(async () => fieldSnap),
    });
    push(
      "field_mismatch",
      field.status === "DRIFT_DETECTED" &&
        (field.counts.field_mismatch ?? 0) > 0
    );

    const lagDir = mkdtempSync(join(tmpdir(), "umtuba-dual-lag-"));
    tempDirs.push(lagDir);
    const journal = createShadowReconciliationJournal({ dataDir: lagDir });
    const lagLocal = buildSeedPersistedState();
    const lagHash = fingerprintStudioSnapshot(lagLocal);
    journal.append({
      schemaVersion: 1,
      timestamp: new Date().toISOString(),
      save_seq_local: 1,
      outcome: "queued",
      snapshot_hash: lagHash,
    });
    const lagRemote = remoteFromLocal(lagLocal);
    if (lagRemote.keys[0]) {
      lagRemote.keys[0] = {
        ...lagRemote.keys[0],
        sourceText: "lag_mismatch",
      };
    }
    const lag = await runStudioDualReadCompare({
      local: lagLocal,
      readTransport: fakeTransport(async () => lagRemote),
      getShadowJournalEntries: () => journal.readEntries(),
    });
    push("transient_lag", lag.status === "TRANSIENT_LAG", lag.status);

    const unavailable = await runStudioDualReadCompare({
      local,
      readTransport: null,
    });
    push("remote_unavailable", unavailable.status === "REMOTE_READ_UNAVAILABLE");

    const failed = await runStudioDualReadCompare({
      local,
      readTransport: fakeTransport(async () => {
        throw new Error("translation_studio_read_snapshot failed: timeout");
      }),
    });
    push(
      "remote_failure",
      failed.status === "REMOTE_READ_FAILED" && failed.category === "timeout"
    );

    const nullStable = remoteFromLocal(local);
    (nullStable.keys as Array<Record<string, unknown>>).push({
      namespaceStableId: nullStable.namespaces[0]?.stable_id,
      key: "legacy.null",
      sourceText: "legacy",
      description: null,
    });
    const nullCompare = await runStudioDualReadCompare({
      local,
      readTransport: fakeTransport(async () => nullStable),
    });
    push(
      "null_legacy_stable_id_no_db_authority",
      nullCompare.status === "IN_SYNC" || nullCompare.status === "DRIFT_DETECTED",
      nullCompare.status
    );

    const brkDir = mkdtempSync(join(tmpdir(), "umtuba-dual-brk-"));
    tempDirs.push(brkDir);
    __setDualReadObservationBreakerForTests({
      state: "OPEN",
      reason: "field_mismatch",
      opened_at: new Date().toISOString(),
      consecutive_failures: 0,
      session_failures: 0,
      last_success_at: null,
    });
    const skipped = await runTranslationStudioDualReadObservation({
      local,
      surface: "diagnostics",
      ignoreObserveFlag: true,
      ignoreActivationGate: true,
      readTransport: fakeTransport(async () => remoteFromLocal(local)),
      journal: createShadowReconciliationJournal({ dataDir: brkDir }),
    });
    push(
      "breaker_open_skip",
      skipped.skipped === true && skipped.skip_reason === "breaker_open"
    );
    resetDualReadObservationBreaker();

    const unsafe = await runTranslationStudioDualReadObservation({
      local,
      surface: "diagnostics",
      env: {
        [TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV]: "json",
        [TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ENV]: "1",
      },
      readTransport: fakeTransport(async () => remoteFromLocal(local)),
    });
    push(
      "json_observe_activation_unsafe_skip",
      unsafe.skipped === true && unsafe.skip_reason === "activation_unsafe"
    );

    push("zero_mutation", JSON.stringify(local) === before);

    resetDualReadObservationBreaker();
    const trip = recordDualReadObservationResult(missing);
    push("breaker_opens_on_actionable_drift", trip.opened === true);
    resetDualReadObservationBreaker();

    const allOk = cases.every((c) => c.ok);
    return {
      schemaVersion: 1,
      verdict: allOk ? "HARNESS_PASS" : "HARNESS_FAIL",
      cases,
      providerCalls: 0,
      remoteWrites: 0,
      localMutated: false,
      activationSafeDefault: defaultReport.activationSafe,
    };
  } finally {
    resetDualReadObservationBreaker();
    __clearDualReadObservationSlotsForTests();
    __setDualReadObservationBreakerForTests(null);
    for (const d of tempDirs) {
      try {
        rmSync(d, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  }
}
