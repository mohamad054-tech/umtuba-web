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
import { gamesV2Overlays } from "./gamesV2Overlays";

export const MESSAGE_CATALOGS: Record<AppLocale, FoundationMessages> = {
  ar: arMessages,
  en: enMessages,
  fr: { ...frMessages, ...gamesV2Overlays.fr },
  es: { ...esMessages, ...gamesV2Overlays.es },
  de: { ...deMessages, ...gamesV2Overlays.de },
  pt: { ...ptMessages, ...gamesV2Overlays.pt },
  id: { ...idMessages, ...gamesV2Overlays.id },
  hi: { ...hiMessages, ...gamesV2Overlays.hi },
  ru: { ...ruMessages, ...gamesV2Overlays.ru },
  tr: { ...trMessages, ...gamesV2Overlays.tr },
  "zh-CN": { ...zhCNMessages, ...gamesV2Overlays["zh-CN"] },
  ja: { ...jaMessages, ...gamesV2Overlays.ja },
  ko: { ...koMessages, ...gamesV2Overlays.ko },
};

export function getMessageCatalog(locale: AppLocale): FoundationMessages {
  return MESSAGE_CATALOGS[locale] ?? enMessages;
}
