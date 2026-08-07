/**
 * Environment / mode gates for isolated shadow smoke V1.
 * Fail-closed. Does not enable shadow persistence by itself.
 */

import {
  TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV,
  isExecutableShadowDualWriteMode,
  resolveTranslationStudioPersistenceMode,
} from "../persistence/mode";
import { SHADOW_SMOKE_ALLOW_ENV } from "./shadowSmokeV1Constants";

export type ShadowSmokeGateFailureCode =
  | "SMOKE_DISABLED"
  | "SHADOW_MODE_REQUIRED";

export type ShadowSmokeGateResult =
  | { ok: true }
  | { ok: false; code: ShadowSmokeGateFailureCode; message: string };

function isExplicitTrue(raw: string | undefined): boolean {
  return (raw ?? "").trim().toLowerCase() === "true";
}

/**
 * Opt-in smoke flag must be exactly true (case-insensitive).
 * Missing / false / other → blocked.
 */
export function isShadowSmokeAllowEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  return isExplicitTrue(env[SHADOW_SMOKE_ALLOW_ENV]);
}

/**
 * Combined gates for executing the isolated smoke path.
 * Requires ALLOW_SHADOW_SMOKE=true AND persistence mode shadow_dual_write.
 */
export function assertIsolatedShadowSmokeGates(
  env: Record<string, string | undefined> = process.env
): ShadowSmokeGateResult {
  if (!isShadowSmokeAllowEnabled(env)) {
    return {
      ok: false,
      code: "SMOKE_DISABLED",
      message:
        `${SHADOW_SMOKE_ALLOW_ENV} must be "true" to run isolated shadow smoke. ` +
        `This flag does not enable shadow persistence.`,
    };
  }

  const resolution = resolveTranslationStudioPersistenceMode(env);
  if (!isExecutableShadowDualWriteMode(resolution)) {
    return {
      ok: false,
      code: "SHADOW_MODE_REQUIRED",
      message:
        `${TRANSLATION_STUDIO_PERSISTENCE_MODE_ENV} must be "shadow_dual_write" ` +
        `for isolated shadow smoke (current implementation: ${resolution.implementation}).`,
    };
  }

  return { ok: true };
}
