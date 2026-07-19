/** Shared legal-document constants. Placeholders must be filled by ownership/counsel. */

export const LEGAL_LAST_UPDATED = "2026-07-19";

export const LEGAL_DRAFT_BANNER =
  "Draft for legal review. This document requires legal review before production release.";

/** Clear placeholders — do not invent entity, address, email, or governing law. */
export const LEGAL_PLACEHOLDERS = {
  entityName: "[LEGAL ENTITY NAME]",
  registeredAddress: "[REGISTERED ADDRESS]",
  legalEmail: "[LEGAL EMAIL]",
  governingLaw: "[GOVERNING LAW]",
} as const;

export const LEGAL_PLACEHOLDER_VALUES = Object.values(LEGAL_PLACEHOLDERS);

export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
};
