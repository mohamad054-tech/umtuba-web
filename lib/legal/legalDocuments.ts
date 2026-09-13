/**
 * Public legal document registry. Bodies live in i18n catalogs.
 * Beta soft-launch copy is not used.
 */

import type { TranslationKey } from "../i18n/messages/types";

export type LegalDocumentId =
  | "privacy"
  | "terms"
  | "cookies"
  | "guidelines"
  | "copyright"
  | "contact"
  | "about"
  | "delete"
  | "export";

export type LegalDocumentDefinition = {
  id: LegalDocumentId;
  path: string;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  bodyKey: TranslationKey;
  showDraftBanner: boolean;
};

export const LEGAL_DOCUMENTS: readonly LegalDocumentDefinition[] = [
  {
    id: "privacy",
    path: "/privacy",
    titleKey: "legal.privacy.title",
    descriptionKey: "legal.privacy.description",
    bodyKey: "legal.privacy.body",
    showDraftBanner: true,
  },
  {
    id: "terms",
    path: "/terms",
    titleKey: "legal.terms.title",
    descriptionKey: "legal.terms.description",
    bodyKey: "legal.terms.body",
    showDraftBanner: true,
  },
  {
    id: "cookies",
    path: "/cookies",
    titleKey: "legal.cookies.title",
    descriptionKey: "legal.cookies.description",
    bodyKey: "legal.cookies.body",
    showDraftBanner: true,
  },
  {
    id: "guidelines",
    path: "/community-guidelines",
    titleKey: "legal.guidelines.title",
    descriptionKey: "legal.guidelines.description",
    bodyKey: "legal.guidelines.body",
    showDraftBanner: true,
  },
  {
    id: "copyright",
    path: "/copyright",
    titleKey: "legal.copyright.title",
    descriptionKey: "legal.copyright.description",
    bodyKey: "legal.copyright.body",
    showDraftBanner: true,
  },
  {
    id: "contact",
    path: "/support",
    titleKey: "legal.contact.title",
    descriptionKey: "legal.contact.description",
    bodyKey: "legal.contact.body",
    showDraftBanner: false,
  },
  {
    id: "about",
    path: "/about",
    titleKey: "legal.about.title",
    descriptionKey: "legal.about.description",
    bodyKey: "legal.about.body",
    showDraftBanner: false,
  },
  {
    id: "delete",
    path: "/account-deletion",
    titleKey: "legal.delete.title",
    descriptionKey: "legal.delete.description",
    bodyKey: "legal.delete.body",
    showDraftBanner: false,
  },
  {
    id: "export",
    path: "/data-export",
    titleKey: "legal.export.title",
    descriptionKey: "legal.export.description",
    bodyKey: "legal.export.body",
    showDraftBanner: false,
  },
] as const;

export const LEGAL_FOOTER_NAV: readonly {
  href: string;
  labelKey: TranslationKey;
}[] = [
  { href: "/privacy", labelKey: "legal.nav.privacy" },
  { href: "/terms", labelKey: "legal.nav.terms" },
  { href: "/cookies", labelKey: "legal.nav.cookies" },
  { href: "/community-guidelines", labelKey: "legal.nav.guidelines" },
  { href: "/copyright", labelKey: "legal.nav.copyright" },
  { href: "/support", labelKey: "legal.nav.contact" },
  { href: "/about", labelKey: "legal.nav.about" },
  { href: "/account-deletion", labelKey: "legal.nav.deleteAccount" },
  { href: "/data-export", labelKey: "legal.nav.dataExport" },
] as const;

export function getLegalDocument(
  id: LegalDocumentId
): LegalDocumentDefinition {
  const found = LEGAL_DOCUMENTS.find((doc) => doc.id === id);
  if (!found) {
    throw new Error(`Unknown legal document: ${id}`);
  }
  return found;
}
