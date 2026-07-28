import { installReferenceTools, listTools } from "./registry";

let bootstrapped = false;

/**
 * Shared-core tool catalog bootstrap (no Domain AI imports).
 * Domain capabilities may replace executors with authorized adapters.
 */
export function ensureReferenceToolCatalog(): void {
  if (bootstrapped || listTools().length > 0) {
    bootstrapped = true;
    return;
  }
  installReferenceTools({
    readSellerStoreSummary: async () => ({
      ok: false,
      message: "Store summary adapter not bound.",
    }),
    readProductDraft: async () => ({
      ok: false,
      message: "Product draft adapter not bound.",
    }),
    readUserPreferences: async ({ userId }) => ({
      ok: true,
      data: { userId, note: "Bounded preference stub." },
    }),
  });
  bootstrapped = true;
}

export function resetReferenceToolCatalogForTests(): void {
  bootstrapped = false;
}
