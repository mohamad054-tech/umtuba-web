import type { AppLocale } from "../locales";
import { arMessages } from "./ar";
import { deMessages } from "./de";
import { enMessages } from "./en";
import { esMessages } from "./es";
import { frMessages } from "./fr";
import { hiMessages } from "./hi";
import { idMessages } from "./id";
import { jaMessages } from "./ja";
import { koMessages } from "./ko";
import { ptMessages } from "./pt";
import { ruMessages } from "./ru";
import { trMessages } from "./tr";
import { zhCNMessages } from "./zh-CN";
import type { FoundationMessages } from "./types";

export const MESSAGE_CATALOGS: Record<AppLocale, FoundationMessages> = {
  ar: arMessages,
  en: enMessages,
  fr: frMessages,
  es: esMessages,
  de: deMessages,
  pt: ptMessages,
  id: idMessages,
  hi: hiMessages,
  ru: ruMessages,
  tr: trMessages,
  "zh-CN": zhCNMessages,
  ja: jaMessages,
  ko: koMessages,
};

export function getMessageCatalog(locale: AppLocale): FoundationMessages {
  return MESSAGE_CATALOGS[locale] ?? enMessages;
}
