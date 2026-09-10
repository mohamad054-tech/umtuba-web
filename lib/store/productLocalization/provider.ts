import {
  DEFAULT_PRODUCT_LOCALIZATION_PROVIDER,
  PRODUCT_LOCALIZATION_PROVIDER_IDS,
  type ProductLocalizationProviderId,
} from "./constants";
import { createLocalProductLocalizationProvider } from "./localProvider";
import {
  createGeminiProductLocalizationProvider,
  createOpenAiProductLocalizationProvider,
} from "./paidProviders";
import type { ProductLocalizationProvider } from "./types";

export function readProductLocalizationProviderId(
  env: Record<string, string | undefined> = process.env
): ProductLocalizationProviderId {
  const raw = (env.PRODUCT_LOCALIZATION_PROVIDER ?? DEFAULT_PRODUCT_LOCALIZATION_PROVIDER)
    .trim()
    .toLowerCase();
  if ((PRODUCT_LOCALIZATION_PROVIDER_IDS as readonly string[]).includes(raw)) {
    return raw as ProductLocalizationProviderId;
  }
  return DEFAULT_PRODUCT_LOCALIZATION_PROVIDER;
}

export function createProductLocalizationProvider(
  id: ProductLocalizationProviderId = readProductLocalizationProviderId()
): ProductLocalizationProvider {
  if (id === "gemini") return createGeminiProductLocalizationProvider();
  if (id === "openai") return createOpenAiProductLocalizationProvider();
  return createLocalProductLocalizationProvider();
}
