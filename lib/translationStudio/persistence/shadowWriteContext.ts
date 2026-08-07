/**
 * Request-scoped transport binding for Studio shadow dual-write.
 * Uses AsyncLocalStorage so the process workflow singleton never holds a
 * user-bound Supabase client globally.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import type { TranslationStudioWriteRpcTransport } from "./writeRpcTransport";

export type StudioShadowWriteContext = {
  transport: TranslationStudioWriteRpcTransport;
};

const storage = new AsyncLocalStorage<StudioShadowWriteContext>();

/** Read the current request-bound write transport, if any. */
export function getStudioShadowWriteTransport(): TranslationStudioWriteRpcTransport | null {
  return storage.getStore()?.transport ?? null;
}

/**
 * Bind an authenticated server-side write transport for the duration of `fn`.
 * Server-only; callers must supply a platform-admin cookie/JWT client.
 */
export function runWithStudioShadowWriteTransport<T>(
  transport: TranslationStudioWriteRpcTransport,
  fn: () => T
): T {
  return storage.run({ transport }, fn);
}

export async function runWithStudioShadowWriteTransportAsync<T>(
  transport: TranslationStudioWriteRpcTransport,
  fn: () => Promise<T>
): Promise<T> {
  return storage.run({ transport }, fn);
}
