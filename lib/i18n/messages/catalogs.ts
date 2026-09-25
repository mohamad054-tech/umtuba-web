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
import { uiEnglishClosures } from "./uiEnglishClosures";

export const MESSAGE_CATALOGS: Record<AppLocale, FoundationMessages> = {
  ar: arMessages,
  en: enMessages,
  fr: { ...frMessages, ...gamesV2Overlays.fr, ...uiEnglishClosures.fr },
  es: { ...esMessages, ...gamesV2Overlays.es, ...uiEnglishClosures.es },
  de: { ...deMessages, ...gamesV2Overlays.de, ...uiEnglishClosures.de },
  pt: { ...ptMessages, ...gamesV2Overlays.pt, ...uiEnglishClosures.pt },
  id: { ...idMessages, ...gamesV2Overlays.id, ...uiEnglishClosures.id },
  hi: { ...hiMessages, ...gamesV2Overlays.hi, ...uiEnglishClosures.hi },
  ru: { ...ruMessages, ...gamesV2Overlays.ru, ...uiEnglishClosures.ru },
  tr: { ...trMessages, ...gamesV2Overlays.tr, ...uiEnglishClosures.tr },
  "zh-CN": { ...zhCNMessages, ...gamesV2Overlays["zh-CN"], ...uiEnglishClosures["zh-CN"] },
  ja: { ...jaMessages, ...gamesV2Overlays.ja, ...uiEnglishClosures.ja },
  ko: { ...koMessages, ...gamesV2Overlays.ko, ...uiEnglishClosures.ko },
};

export function getMessageCatalog(locale: AppLocale): FoundationMessages {
  return MESSAGE_CATALOGS[locale] ?? enMessages;
}
