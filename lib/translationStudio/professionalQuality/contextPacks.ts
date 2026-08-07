/**
 * Translation context packs + precedence helpers.
 */

import type { StudioLanguageCode } from "../types";
import type { TerminologyDomainScope } from "./terminologyPolicy";
import type { ProfessionalQualityProfileId } from "./thresholds";
import type { StyleTone } from "./styleGuides";

export type TranslationContextPackId =
  | "global"
  | "commerce"
  | "learning"
  | "collaboration"
  | "admin"
  | (string & {});

export type TranslationContextPack = {
  id: TranslationContextPackId;
  domainDescription: string;
  intendedAudience: string;
  toneOverride?: StyleTone;
  glossaryScope: TerminologyDomainScope;
  qualityProfileId: ProfessionalQualityProfileId;
  contextualExamples: string[];
  ambiguityNotes: string[];
};

export const TRANSLATION_CONTEXT_PACKS: Record<
  string,
  TranslationContextPack
> = {
  global: {
    id: "global",
    domainDescription: "Cross-product UI chrome and shared platform copy.",
    intendedAudience: "All signed-in and public users.",
    glossaryScope: "global",
    qualityProfileId: "standard_ui",
    contextualExamples: ["Back", "Cancel", "Save", "Settings"],
    ambiguityNotes: ["Prefer concise UI phrasing over marketing flourish."],
  },
  commerce: {
    id: "commerce",
    domainDescription: "Store, seller, buyer, checkout, refunds, and orders.",
    intendedAudience: "Buyers and sellers on the commerce surfaces.",
    toneOverride: "clear_professional",
    glossaryScope: "commerce",
    qualityProfileId: "commerce_sensitive",
    contextualExamples: ["Refund", "Seller", "Buyer", "Store"],
    ambiguityNotes: [
      "Refund/payment wording is high-risk — escalate to human review.",
      "Do not invent legal/financial claims.",
    ],
  },
  learning: {
    id: "learning",
    domainDescription: "Courses, lessons, enrollments, and learning progress.",
    intendedAudience: "Learners and instructors.",
    toneOverride: "instructional",
    glossaryScope: "learning",
    qualityProfileId: "learning_content",
    contextualExamples: ["Course", "Lesson", "Points"],
    ambiguityNotes: ["Points may mean score or rewards — confirm when ambiguous."],
  },
  collaboration: {
    id: "collaboration",
    domainDescription: "Workspaces, sharing, and team collaboration surfaces.",
    intendedAudience: "Workspace members and collaborators.",
    glossaryScope: "collaboration",
    qualityProfileId: "standard_ui",
    contextualExamples: ["Workspace"],
    ambiguityNotes: [],
  },
  admin: {
    id: "admin",
    domainDescription: "Platform admin consoles including Translation Studio.",
    intendedAudience: "Platform administrators.",
    glossaryScope: "admin",
    qualityProfileId: "standard_ui",
    contextualExamples: ["Admin", "Translation Studio", "Dashboard"],
    ambiguityNotes: ["Prefer precise operator language over marketing tone."],
  },
};

/**
 * Precedence:
 * key-specific context > namespace/domain pack > global style guide/glossary
 */
export function resolveContextPack(input: {
  keyContextPackId?: string | null;
  namespaceHint?: string | null;
  domainHint?: string | null;
}): TranslationContextPack {
  if (input.keyContextPackId && TRANSLATION_CONTEXT_PACKS[input.keyContextPackId]) {
    return TRANSLATION_CONTEXT_PACKS[input.keyContextPackId]!;
  }
  const hint = `${input.domainHint ?? ""} ${input.namespaceHint ?? ""}`.toLowerCase();
  if (hint.includes("commerce") || hint.includes("store") || hint.includes("refund")) {
    return TRANSLATION_CONTEXT_PACKS.commerce!;
  }
  if (hint.includes("learning") || hint.includes("course") || hint.includes("lesson")) {
    return TRANSLATION_CONTEXT_PACKS.learning!;
  }
  if (hint.includes("collab") || hint.includes("workspace")) {
    return TRANSLATION_CONTEXT_PACKS.collaboration!;
  }
  if (
    hint.includes("admin") ||
    hint.includes("translation") ||
    hint.includes("studio")
  ) {
    return TRANSLATION_CONTEXT_PACKS.admin!;
  }
  return TRANSLATION_CONTEXT_PACKS.global!;
}

export function mapNamespaceToContextPackId(
  namespaceId: string | null | undefined
): TranslationContextPackId {
  const n = (namespaceId ?? "").toLowerCase();
  if (n.includes("commerce") || n.includes("store")) return "commerce";
  if (n.includes("learning") || n.includes("course")) return "learning";
  if (n.includes("collab") || n.includes("workspace")) return "collaboration";
  if (n.includes("admin") || n.includes("translation")) return "admin";
  return "global";
}

export type ResolvedStyleAndContext = {
  pack: TranslationContextPack;
  locale: StudioLanguageCode;
  glossaryScope: TerminologyDomainScope;
  qualityProfileId: ProfessionalQualityProfileId;
};
