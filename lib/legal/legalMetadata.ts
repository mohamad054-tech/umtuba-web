import type { Metadata } from "next";
import { createTranslator } from "../i18n/translate";
import { resolveRequestLocale } from "../i18n/server";
import type { TranslationKey } from "../i18n/messages/types";
import { buildPageMetadata } from "../site/metadata";

export async function legalPageMetadata(input: {
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  path: string;
}): Promise<Metadata> {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  return buildPageMetadata({
    title: t(input.titleKey),
    description: t(input.descriptionKey),
    path: input.path,
    index: "index",
    locale,
  });
}
