/**
 * Translation Studio persistence mode gate V1.
 * - `json`: executable, JSON only (default)
 * - `shadow_dual_write`: executable composition (JSON authoritative + DB shadow);
 *   DB calls require request-scoped transport at save time or shadow is skipped
 * - `dual_read` / `db_primary_json_fallback`: unsupported (fail closed to JSON)
 */

export const TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV =
  "UMTUBA_TRANSLATION_STUDIO_PERSISTENCE_MODE";

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
      kind: "unsupported";
      mode: "dual_read" | "db_primary_json_fallback";
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

const UNSUPPORTED_MODES = new Set<string>([
  "dual_read",
  "db_primary_json_fallback",
]);

function normalizeModeToken(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Resolve persistence mode from env.
 * Unset / blank / explicit `json` → executable JSON.
 * `shadow_dual_write` → executable shadow composition (transport still required at save).
 * Other known future modes → unsupported (JSON).
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

  if (UNSUPPORTED_MODES.has(token)) {
    return {
      kind: "unsupported",
      mode: token as "dual_read" | "db_primary_json_fallback",
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

/** True when mode implies DB participation (shadow executable or future unsupported). */
export function requestsDbBackedPersistence(
  resolution: PersistenceModeResolution
): boolean {
  if (
    resolution.kind === "executable" &&
    resolution.mode === "shadow_dual_write"
  ) {
    return true;
  }
  return (
    resolution.kind === "unsupported" &&
    (resolution.mode === "dual_read" ||
      resolution.mode === "db_primary_json_fallback")
  );
}
