/**
 * Isolated shadow dual-write smoke runner V1.
 *
 * Exercises the REAL composition:
 *   gates → fixed smoke state → isolated JSON save → shadow queue → DB adapter
 * via createShadowDualWriteStudioPersistence + request-scoped transport.
 *
 * Does NOT call translation_studio_upsert_snapshot directly.
 * Does NOT touch normal store.json or App Shell seed.
 */

import { createShadowDualWriteStudioPersistence } from "../persistence/shadowDualWriteStudioPersistence";
import { runWithStudioShadowWriteTransport } from "../persistence/shadowWriteContext";
import type { TranslationStudioWriteRpcTransport } from "../persistence/writeRpcTransport";
import type {
  StudioShadowEntityCounts,
  StudioShadowObserveEvent,
  StudioShadowObserver,
} from "../persistence/shadowObserver";
import type { StudioShadowIdleDrainResult } from "../persistence/shadowWriteQueue";
import {
  assertOnlyShadowSmokeV1Identities,
  buildShadowSmokeV1State,
} from "./buildShadowSmokeV1State";
import { assertIsolatedShadowSmokeGates } from "./shadowSmokeV1Gates";
import {
  SHADOW_SMOKE_V1_DEFAULT_DRAIN_MS,
  SHADOW_SMOKE_V1_IDS,
  SHADOW_SMOKE_V1_PREFIX,
} from "./shadowSmokeV1Constants";
import {
  cleanupShadowSmokeV1JsonLocal,
  createShadowSmokeV1JsonPersistence,
  resolveNormalStudioStoreJsonPath,
  resolveShadowSmokeV1JsonPath,
} from "./shadowSmokeV1Persistence";

export type IsolatedShadowSmokeV1SafeEvent = {
  type: StudioShadowObserveEvent["type"];
  save_seq: number;
  attempt?: number;
  category?: string;
  reason?: string;
  duration_ms?: number;
  inserted?: number;
  updated?: number;
  skipped?: number;
  message?: string;
  superseded_by?: number;
  entity_counts?: StudioShadowEntityCounts;
};

export type IsolatedShadowSmokeV1Success = {
  ok: true;
  save_seq: number;
  drain: StudioShadowIdleDrainResult;
  smokeJsonPath: string;
  normalStoreJsonPath: string;
  reservedPrefix: typeof SHADOW_SMOKE_V1_PREFIX;
  identities: typeof SHADOW_SMOKE_V1_IDS;
  events: IsolatedShadowSmokeV1SafeEvent[];
};

export type IsolatedShadowSmokeV1Failure = {
  ok: false;
  code:
    | "SMOKE_DISABLED"
    | "SHADOW_MODE_REQUIRED"
    | "MISSING_TRANSPORT"
    | "INVALID_ACTOR"
    | "UNEXPECTED";
  message: string;
};

export type IsolatedShadowSmokeV1Result =
  | IsolatedShadowSmokeV1Success
  | IsolatedShadowSmokeV1Failure;

export type RunIsolatedShadowSmokeV1Input = {
  actorId: string;
  /**
   * Authenticated request-scoped transport (platform-admin cookie client).
   * Required; smoke never fabricates JWT or uses service_role.
   */
  transport: TranslationStudioWriteRpcTransport;
  env?: Record<string, string | undefined>;
  dataDir?: string;
  smokeJsonPath?: string;
  drainTimeoutMs?: number;
  valueText?: string;
  updatedAt?: string;
  /** When true, delete smoke JSON after drain (default false — caller decides). */
  cleanupLocalJson?: boolean;
};

function toSafeEvent(
  event: StudioShadowObserveEvent
): IsolatedShadowSmokeV1SafeEvent {
  const base: IsolatedShadowSmokeV1SafeEvent = {
    type: event.type,
    save_seq: event.save_seq,
  };
  if ("attempt" in event) base.attempt = event.attempt;
  if ("category" in event) base.category = event.category;
  if ("reason" in event) base.reason = event.reason;
  if ("duration_ms" in event) base.duration_ms = event.duration_ms;
  if ("inserted" in event) base.inserted = event.inserted;
  if ("updated" in event) base.updated = event.updated;
  if ("skipped" in event) base.skipped = event.skipped;
  if ("message" in event) base.message = event.message;
  if ("superseded_by" in event) base.superseded_by = event.superseded_by;
  if ("entity_counts" in event) base.entity_counts = event.entity_counts;
  return base;
}

/**
 * Core runner — injectable/testable. Server action wraps with admin auth.
 * Binds transport via ALS exactly like Studio admin actions.
 */
export async function runIsolatedShadowSmokeV1(
  input: RunIsolatedShadowSmokeV1Input
): Promise<IsolatedShadowSmokeV1Result> {
  const env = input.env ?? process.env;
  const gate = assertIsolatedShadowSmokeGates(env);
  if (!gate.ok) {
    return { ok: false, code: gate.code, message: gate.message };
  }

  const actorId = input.actorId?.trim() ?? "";
  if (!actorId) {
    return {
      ok: false,
      code: "INVALID_ACTOR",
      message: "Isolated shadow smoke requires an authenticated actor id.",
    };
  }

  if (!input.transport) {
    return {
      ok: false,
      code: "MISSING_TRANSPORT",
      message: "Isolated shadow smoke requires request-scoped write transport.",
    };
  }

  try {
    const state = buildShadowSmokeV1State({
      actorId,
      valueText: input.valueText,
      updatedAt: input.updatedAt,
    });
    assertOnlyShadowSmokeV1Identities(state);

    const json = createShadowSmokeV1JsonPersistence({
      dataDir: input.dataDir,
      filePath: input.smokeJsonPath,
    });
    const events: StudioShadowObserveEvent[] = [];
    const observer: StudioShadowObserver = {
      onEvent(event) {
        events.push(event);
      },
    };

    // Default getTransport → ALS (same as createDefaultStudioPersistence shadow path).
    const shadow = createShadowDualWriteStudioPersistence({
      json,
      observer,
    });

    const smokeJsonPath = json.filePath;
    const normalStoreJsonPath = resolveNormalStudioStoreJsonPath(input.dataDir);

    runWithStudioShadowWriteTransport(input.transport, () => {
      shadow.save(state);
    });

    const drainTimeoutMs =
      input.drainTimeoutMs ?? SHADOW_SMOKE_V1_DEFAULT_DRAIN_MS;
    const drain = await shadow.whenShadowIdleBounded(drainTimeoutMs);

    if (input.cleanupLocalJson) {
      cleanupShadowSmokeV1JsonLocal({ filePath: smokeJsonPath });
    }

    return {
      ok: true,
      save_seq: shadow.lastShadowSeq,
      drain,
      smokeJsonPath,
      normalStoreJsonPath,
      reservedPrefix: SHADOW_SMOKE_V1_PREFIX,
      identities: SHADOW_SMOKE_V1_IDS,
      events: events.map(toSafeEvent),
    };
  } catch (err) {
    return {
      ok: false,
      code: "UNEXPECTED",
      message:
        err instanceof Error ? err.message : "Isolated shadow smoke failed.",
    };
  }
}

/** Re-export cleanup for admin action / smoke gate restore. */
export {
  cleanupShadowSmokeV1JsonLocal,
  resolveShadowSmokeV1JsonPath,
  resolveNormalStudioStoreJsonPath,
};
