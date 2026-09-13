/**
 * Hard server-side lock on CJ fulfillment.
 * Missing / empty / any value other than the literal "true" is disabled.
 */

type EnvBag = Record<string, string | undefined>;

export function isCjOrderFulfillmentEnabled(
  env: EnvBag = process.env
): boolean {
  return env.CJ_ORDER_FULFILLMENT_ENABLED?.trim().toLowerCase() === "true";
}

export function refuseCjFulfillmentWrite(): never {
  throw new Error("CJ fulfillment is disabled. No provider write is allowed.");
}

/**
 * Only entry used by future fulfillment adapters.
 * While the flag is false this always throws — no network, no payload.
 */
export function attemptCjFulfillmentWrite(): never {
  if (!isCjOrderFulfillmentEnabled()) {
    refuseCjFulfillmentWrite();
  }
  refuseCjFulfillmentWrite();
}
