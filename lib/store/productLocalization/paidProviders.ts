import type { ProductLocalizationProviderId } from "./constants";
import type { ProductLocalizationProvider } from "./types";

const PAID_DISABLED_MESSAGE =
  "Paid product localization providers are disabled for UMTUBA_STORE_PRODUCT_LOCALIZATION_V1. Use PRODUCT_LOCALIZATION_PROVIDER=local. Do not spend paid LLM credits on this pass.";

function createDisabledPaidProvider(id: Extract<ProductLocalizationProviderId, "gemini" | "openai">): ProductLocalizationProvider {
  return {
    id,
    localize() {
      throw new Error(PAID_DISABLED_MESSAGE);
    },
  };
}

export function createGeminiProductLocalizationProvider(): ProductLocalizationProvider {
  return createDisabledPaidProvider("gemini");
}

export function createOpenAiProductLocalizationProvider(): ProductLocalizationProvider {
  return createDisabledPaidProvider("openai");
}
