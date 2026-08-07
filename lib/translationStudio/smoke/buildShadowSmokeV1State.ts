/**
 * Deterministic isolated PersistedStudioState for shadow smoke V1.
 * Contains ONLY reserved smoke identities — never App Shell catalog data.
 */

import { LOCALE_DEFINITIONS } from "../../i18n/locales";
import type { PersistedStudioState } from "../types";
import {
  SHADOW_SMOKE_V1_IDS,
  SHADOW_SMOKE_V1_PREFIX,
} from "./shadowSmokeV1Constants";

const FIXED_UPDATED_AT = "2026-08-07T00:00:00.000Z";

export type BuildShadowSmokeV1StateOptions = {
  /** Authenticated admin actor id (auth.users UUID). */
  actorId: string;
  /** Optional ISO timestamp (defaults to fixed deterministic stamp). */
  updatedAt?: string;
  /** Optional smoke probe text (still isolated; not production copy). */
  valueText?: string;
};

export function buildShadowSmokeV1State(
  options: BuildShadowSmokeV1StateOptions
): PersistedStudioState {
  const actorId = options.actorId.trim();
  if (!actorId) {
    throw new Error("buildShadowSmokeV1State requires actorId.");
  }

  const updatedAt = options.updatedAt ?? FIXED_UPDATED_AT;
  const valueText =
    options.valueText ??
    `${SHADOW_SMOKE_V1_PREFIX}controlled_probe_text`;

  const en = LOCALE_DEFINITIONS.en;

  return {
    schemaVersion: 1,
    updatedAt,
    languages: [
      {
        code: "en",
        name: en.englishName,
        nativeName: en.nativeName,
        direction: en.direction,
        enabled: true,
      },
    ],
    namespaces: [
      {
        id: SHADOW_SMOKE_V1_IDS.namespace,
        name: SHADOW_SMOKE_V1_IDS.namespace,
        description: "Isolated shadow dual-write smoke V1 (not App Shell).",
      },
    ],
    keys: [
      {
        id: SHADOW_SMOKE_V1_IDS.key,
        namespaceId: SHADOW_SMOKE_V1_IDS.namespace,
        key: SHADOW_SMOKE_V1_IDS.keyName,
        sourceText: valueText,
        description: "Controlled smoke key — do not publish.",
      },
    ],
    values: [
      {
        id: SHADOW_SMOKE_V1_IDS.valueEn,
        keyId: SHADOW_SMOKE_V1_IDS.key,
        language: "en",
        value: valueText,
        status: "draft",
        createdAt: updatedAt,
        updatedAt,
        createdBy: actorId,
        updatedBy: actorId,
        approvedBy: null,
        suggestionId: null,
        version: 1,
      },
    ],
    suggestions: [],
    versions: [],
    memory: [],
    terminology: [],
    auditLog: [
      {
        id: SHADOW_SMOKE_V1_IDS.audit,
        entityType: "translation_value",
        entityId: SHADOW_SMOKE_V1_IDS.valueEn,
        action: "shadow_smoke_v1",
        actorId,
        detail: {
          smoke: true,
          prefix: SHADOW_SMOKE_V1_PREFIX,
        },
        createdAt: updatedAt,
      },
    ],
  };
}

/** Every string id in the smoke graph must carry the reserved prefix. */
export function listShadowSmokeV1StableIds(
  state: PersistedStudioState
): string[] {
  const ids: string[] = [
    ...state.namespaces.map((n) => n.id),
    ...state.keys.map((k) => k.id),
    ...state.values.map((v) => v.id),
    ...state.suggestions.map((s) => s.id),
    ...state.versions.map((v) => v.id),
    ...state.memory.map((m) => m.id),
    ...state.terminology.map((t) => t.id),
    ...state.auditLog.map((a) => a.id),
  ];
  return ids;
}

export function assertOnlyShadowSmokeV1Identities(
  state: PersistedStudioState
): void {
  for (const id of listShadowSmokeV1StableIds(state)) {
    if (!id.startsWith(SHADOW_SMOKE_V1_PREFIX)) {
      throw new Error(
        `Non-smoke stable id in isolated smoke state: ${id}`
      );
    }
  }
  for (const key of state.keys) {
    if (!key.key.startsWith(SHADOW_SMOKE_V1_PREFIX)) {
      throw new Error(`Non-smoke catalog key in isolated smoke state: ${key.key}`);
    }
    if (key.namespaceId !== SHADOW_SMOKE_V1_IDS.namespace) {
      throw new Error(`Unexpected smoke namespaceId: ${key.namespaceId}`);
    }
  }
}
