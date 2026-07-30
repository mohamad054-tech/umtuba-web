import type { AppLocale } from "../../locales";
import { learningArMessages } from "./ar";
import { learningEnMessages } from "./en";
import {
  learningDeMessages,
  learningEsMessages,
  learningFrMessages,
  learningPtMessages,
} from "./otherLocales";
import type { LearningMessages } from "./types";

export const LEARNING_MESSAGE_CATALOGS: Record<AppLocale, LearningMessages> = {
  ar: learningArMessages,
  en: learningEnMessages,
  fr: learningFrMessages,
  es: learningEsMessages,
  de: learningDeMessages,
  pt: learningPtMessages,
};

export function getLearningMessageCatalog(locale: AppLocale): LearningMessages {
  return LEARNING_MESSAGE_CATALOGS[locale] ?? learningEnMessages;
}

export type { LearningMessages, LearningTranslationKey } from "./types";
export { learningEnMessages } from "./en";
export { learningArMessages } from "./ar";
