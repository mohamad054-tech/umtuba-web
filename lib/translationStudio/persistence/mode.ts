/**
 * Translation Studio persistence mode gate V1.
 * Only `json` is executable at runtime.
 * A DB write adapter exists for injection/tests, but modes that would use it
 * (`shadow_dual_write`, `dual_read`, `db_primary_json_fallback`) remain
 * unsupported and fail closed to JSON — never silently activate DB writes.
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
      kind: "unsupported";
      mode: Exclude<TranslationStudioPersistenceMode, "json">;
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

const FUTURE_MODES = new Set<string>([
  "shadow_dual_write",
  "dual_read",
  "db_primary_json_fallback",
]);

function normalizeModeToken(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Resolve persistence mode from env.
 * Unset / blank / explicit `json` → executable JSON.
 * Known future modes → unsupported (still implementation:"json"; no DB).
 * Anything else → invalid (still implementation:"json"; no DB).
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

  if (FUTURE_MODES.has(token)) {
    return {
      kind: "unsupported",
      mode: token as Exclude<TranslationStudioPersistenceMode, "json">,
      envRaw,
      implementation: "json",
      message:
        `Persistence mode "${token}" is recognized but not executable. ` +
        `Failing closed to JSON file store; DB adapter is injectable only ` +
        `(no dual-write / dual-read / db-primary activation).`,
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

/** True only for modes that would imply DB participation once implemented. */
export function requestsDbBackedPersistence(
  resolution: PersistenceModeResolution
): boolean {
  return (
    resolution.kind === "unsupported" &&
    (resolution.mode === "shadow_dual_write" ||
      resolution.mode === "dual_read" ||
      resolution.mode === "db_primary_json_fallback")
  );
}
