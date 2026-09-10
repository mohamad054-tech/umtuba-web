/**
 * Previous local CJ API key is treated as compromised.
 * Live CJ traffic requires an explicit rotation acknowledgement.
 * This module never reads `.env.local` files.
 */

import { hasCjApiKey } from "./client";

type EnvBag = Record<string, string | undefined>;

export function isCjKeyRotationAcknowledged(
  env: EnvBag = process.env
): boolean {
  return env.CJ_API_KEY_ROTATED?.trim().toLowerCase() === "true";
}

export function canUseLiveCjReadSync(
  env: EnvBag = process.env
): boolean {
  return isCjKeyRotationAcknowledged(env) && hasCjApiKey(env.CJ_API_KEY);
}

export function liveCjReadSyncBlockReason(
  env: EnvBag = process.env
): "PENDING_KEY_ROTATION" | "MISSING_SERVER_KEY" | null {
  if (!isCjKeyRotationAcknowledged(env)) return "PENDING_KEY_ROTATION";
  if (!hasCjApiKey(env.CJ_API_KEY)) return "MISSING_SERVER_KEY";
  return null;
}
