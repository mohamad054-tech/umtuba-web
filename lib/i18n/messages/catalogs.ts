import type { AppLocale } from "../locales";
import { arMessages } from "./ar";
import { deMessages } from "./de";
import { enMessages } from "./en";
import { esMessages } from "./es";
import { frMessages } from "./fr";
import { ptMessages } from "./pt";
import type { FoundationMessages } from "./types";

export const MESSAGE_CATALOGS: Record<AppLocale, FoundationMessages> = {
  ar: arMessages,
  en: enMessages,
  fr: frMessages,
  es: esMessages,
  de: deMessages,
  pt: ptMessages,
};

export function getMessageCatalog(locale: AppLocale): FoundationMessages {
  return MESSAGE_CATALOGS[locale] ?? enMessages;
}
