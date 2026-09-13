import { createTranslator } from "../i18n/translate";
import { resolveRequestLocale } from "../i18n/server";
import { legalCompanyInterpolateValues } from "./company";
import {
  getLegalDocument,
  type LegalDocumentId,
} from "./legalDocuments";

export async function loadLegalPageProps(id: LegalDocumentId) {
  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const doc = getLegalDocument(id);
  const values = legalCompanyInterpolateValues();

  return {
    locale,
    title: t(doc.titleKey),
    description: t(doc.descriptionKey),
    body: t(doc.bodyKey, { values }),
    showDraftBanner: doc.showDraftBanner,
    draftBanner: t("legal.draft.banner"),
    translationDisclaimer: t("legal.disclaimer.translation"),
    effectiveLabel: t("legal.meta.effectiveLabel"),
    updatedLabel: t("legal.meta.updatedLabel"),
  };
}
