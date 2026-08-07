/**
 * Official terminology / glossary policy layer V1.
 * Application-domain only — does not require remote schema changes.
 * Complements existing TerminologyEntry storage; does not replace it.
 */

import type { StudioLanguageCode } from "../types";

export type TerminologyDomainScope =
  | "global"
  | "commerce"
  | "learning"
  | "collaboration"
  | "admin"
  | "translation_studio"
  | (string & {});

export type OfficialTerminologyEntry = {
  id: string;
  /** English (or primary) source term. */
  sourceTerm: string;
  /** Approved translations by locale. */
  approvedTranslations: Partial<Record<StudioLanguageCode, string>>;
  /** Forbidden alternatives by locale (if present in candidate → finding). */
  forbiddenAlternatives: Partial<Record<StudioLanguageCode, string[]>>;
  doNotTranslate: boolean;
  caseSensitive: boolean;
  /** Domain scopes this term applies to. Empty/`global` ⇒ all. */
  scopes: TerminologyDomainScope[];
  notes?: string;
  context?: string;
  /** Higher wins when overlapping matches. */
  priority: number;
  /** Seed may mark ambiguous terms for human confirmation. */
  reviewRequired?: boolean;
};

export type TerminologyPolicyCatalog = {
  schemaVersion: 1;
  entries: OfficialTerminologyEntry[];
};

export function normalizeGlossaryTerm(
  term: string,
  caseSensitive: boolean
): string {
  const t = term.trim();
  return caseSensitive ? t : t.toLowerCase();
}

export function terminologyAppliesToScope(
  entry: OfficialTerminologyEntry,
  scope: TerminologyDomainScope | null | undefined
): boolean {
  if (!entry.scopes.length || entry.scopes.includes("global")) return true;
  if (!scope || scope === "global") {
    return entry.scopes.includes("global");
  }
  return entry.scopes.includes(scope) || entry.scopes.includes("global");
}

/**
 * Find catalog entries whose source term appears in text (word-boundary-ish).
 * Sorted by priority desc, then term length desc.
 */
export function findApplicableTerminology(
  catalog: TerminologyPolicyCatalog,
  sourceText: string,
  scope?: TerminologyDomainScope | null
): OfficialTerminologyEntry[] {
  const hay = sourceText;
  const hits = catalog.entries.filter((e) => {
    if (!terminologyAppliesToScope(e, scope)) return false;
    const term = e.sourceTerm.trim();
    if (!term) return false;
    if (e.caseSensitive) {
      return includesTerm(hay, term, true);
    }
    return includesTerm(hay.toLowerCase(), term.toLowerCase(), false);
  });
  return hits.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return b.sourceTerm.length - a.sourceTerm.length;
  });
}

function includesTerm(
  haystack: string,
  term: string,
  caseSensitive: boolean
): boolean {
  const h = caseSensitive ? haystack : haystack.toLowerCase();
  const t = caseSensitive ? term : term.toLowerCase();
  if (!t) return false;
  if (h === t) return true;
  // Prefer word-boundary-ish for single tokens; allow substring for multi-word.
  if (t.includes(" ")) {
    return h.includes(t);
  }
  const re = new RegExp(
    `(^|[^\\p{L}\\p{N}_])${escapeRegExp(t)}([^\\p{L}\\p{N}_]|$)`,
    "u"
  );
  return re.test(h);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function getApprovedTranslation(
  entry: OfficialTerminologyEntry,
  locale: StudioLanguageCode
): string | null {
  const v = entry.approvedTranslations[locale];
  return v != null && v.trim() !== "" ? v : null;
}
