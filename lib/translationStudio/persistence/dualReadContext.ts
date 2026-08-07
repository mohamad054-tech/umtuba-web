/**
 * Request-scoped dual-read transport binding.
 * Mirrors write ALS: process workflow never holds a user-bound client globally.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import type { TranslationStudioReadRpcTransport } from "./readRpcTransport";

export type StudioDualReadContext = {
  transport: TranslationStudioReadRpcTransport;
};

const storage = new AsyncLocalStorage<StudioDualReadContext>();

/** Read the current request-bound read transport, if any. */
export function getStudioDualReadTransport(): TranslationStudioReadRpcTransport | null {
  return storage.getStore()?.transport ?? null;
}

/**
 * Bind an authenticated server-side read transport for the duration of `fn`.
 * Server-only; callers must supply a platform-admin cookie/JWT client.
 */
export function runWithStudioDualReadTransport<T>(
  transport: TranslationStudioReadRpcTransport,
  fn: () => T
): T {
  return storage.run({ transport }, fn);
}

export async function runWithStudioDualReadTransportAsync<T>(
  transport: TranslationStudioReadRpcTransport,
  fn: () => Promise<T>
): Promise<T> {
  return storage.run({ transport }, fn);
}
