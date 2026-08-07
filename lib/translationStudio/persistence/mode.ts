/**
 * Translation Studio persistence mode gate V1.
 * - `json`: executable, JSON only (default)
 * - `shadow_dual_write`: executable composition (JSON authoritative + DB shadow);
 *   DB calls require request-scoped transport at save time or shadow is skipped
 * - `dual_read`: executable composition (JSON authoritative + secondary remote compare);
 *   does not enable DB writes by itself
 * - `db_primary_json_fallback`: unsupported (fail closed to JSON)
 *
 * Optional observe flag (does not change mode):
 * UMTUBA_TRANSLATION_STUDIO_DUAL_READ_OBSERVE=1 wraps dual-read over current mode
 * (e.g. shadow + dual-read) without switching persistence mode.
 */

export const TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV =
  "UMTUBA_TRANSLATION_STUDIO_PERSISTENCE_MODE";

/** When "1"/"true", nest dual-read observe over the selected mode implementation. */
export const TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ENV =
  "UMTUBA_TRANSLATION_STUDIO_DUAL_READ_OBSERVE";

export const TRANSLATION_STUDIO_PERSISTENCE_MODES = [
  "json",
  "shadow_dual_write",
  "dual_read",
  "db_primary_json_fallback",
] as const;

export type TranslationStudioPersistenceMode =
  (typeof TRANSLATION_STUDIO_PERSISTENCE_MODES)[number];

export type PersistenceModeResolution =
  | {
      kind: "executable";
      mode: "json";
      envRaw: string | null;
      implementation: "json";
    }
  | {
      kind: "executable";
      mode: "shadow_dual_write";
      envRaw: string;
      implementation: "shadow_dual_write";
    }
  | {
      kind: "executable";
      mode: "dual_read";
      envRaw: string;
      implementation: "dual_read";
    }
  | {
      kind: "unsupported";
      mode: "db_primary_json_fallback";
      envRaw: string;
      implementation: "json";
      message: string;
    }
  | {
      kind: "invalid";
      mode: null;
      envRaw: string;
      implementation: "json";
      message: string;
    };

function normalizeModeToken(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Resolve persistence mode from env.
 * Unset / blank / explicit `json` → executable JSON.
 * `shadow_dual_write` → executable shadow composition.
 * `dual_read` → executable dual-read composition (JSON + compare; no writes).
 * `db_primary_json_fallback` → unsupported (JSON).
 * Anything else → invalid (JSON).
 */
export function resolveTranslationStudioPersistenceMode(
  env: Record<string, string | undefined> = process.env
): PersistenceModeResolution {
  const envRaw = env[TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV];
  if (envRaw == null || envRaw.trim() === "") {
    return {
      kind: "executable",
      mode: "json",
      envRaw: envRaw ?? null,
      implementation: "json",
    };
  }

  const token = normalizeModeToken(envRaw);
  if (token === "json") {
    return {
      kind: "executable",
      mode: "json",
      envRaw,
      implementation: "json",
    };
  }

  if (token === "shadow_dual_write") {
    return {
      kind: "executable",
      mode: "shadow_dual_write",
      envRaw,
      implementation: "shadow_dual_write",
    };
  }

  if (token === "dual_read") {
    return {
      kind: "executable",
      mode: "dual_read",
      envRaw,
      implementation: "dual_read",
    };
  }

  if (token === "db_primary_json_fallback") {
    return {
      kind: "unsupported",
      mode: "db_primary_json_fallback",
      envRaw,
      implementation: "json",
      message:
        `Persistence mode "${token}" is not executable. ` +
        `Failing closed to JSON file store.`,
    };
  }

  return {
    kind: "invalid",
    mode: null,
    envRaw,
    implementation: "json",
    message:
      `Invalid UMTUBA_TRANSLATION_STUDIO_PERSISTENCE_MODE="${envRaw}". ` +
      `Failing closed to JSON file store; no mode activation.`,
  };
}

export function isExecutableJsonPersistenceMode(
  resolution: PersistenceModeResolution
): boolean {
  return resolution.kind === "executable" && resolution.mode === "json";
}

export function isExecutableShadowDualWriteMode(
  resolution: PersistenceModeResolution
): boolean {
  return (
    resolution.kind === "executable" && resolution.mode === "shadow_dual_write"
  );
}

export function isExecutableDualReadMode(
  resolution: PersistenceModeResolution
): boolean {
  return resolution.kind === "executable" && resolution.mode === "dual_read";
}

/** Opt-in dual-read observe nest without changing primary mode. */
export function isDualReadObserveEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  const raw = env[TRANSLATION_STUDIO_DUAL_READ_OBSERVE_ENV];
  if (raw == null) return false;
  const t = raw.trim().toLowerCase();
  return t === "1" || t === "true" || t === "yes";
}

/** True when mode implies DB participation (writes and/or dual-read). */
export function requestsDbBackedPersistence(
  resolution: PersistenceModeResolution
): boolean {
  if (resolution.kind !== "executable") {
    return (
      resolution.kind === "unsupported" &&
      resolution.mode === "db_primary_json_fallback"
    );
  }
  return (
    resolution.mode === "shadow_dual_write" || resolution.mode === "dual_read"
  );
}
