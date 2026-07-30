import type {
  StudioLanguageCode,
  TerminologyConflict,
  TerminologyEntry,
} from "../types";

/**
 * Detect conflicts between candidate text and approved terminology.
 * Never silently replaces — returns warnings only.
 */
export function detectTerminologyConflicts(input: {
  candidateText: string;
  language: StudioLanguageCode;
  terminology: TerminologyEntry[];
}): TerminologyConflict[] {
  const conflicts: TerminologyConflict[] = [];
  const haystack = input.candidateText;

  for (const entry of input.terminology) {
    if (entry.status !== "approved") continue;
    const expected = entry.translations[input.language];
    if (!expected) continue;

    const term = entry.term;
    const termRe = new RegExp(
      `\\b${escapeRegExp(term)}\\b`,
      "i"
    );
    // If source term appears in candidate (untranslated) while approved target exists → warn
    if (termRe.test(haystack) && !haystack.includes(expected)) {
      conflicts.push({
        term,
        expected,
        foundFragment: term,
        severity: "warning",
      });
      continue;
    }

    // If a different translation for the same concept is present is hard;
    // warn when expected term is missing but near-synonym stub markers exist.
    if (
      expected &&
      !haystack.includes(expected) &&
      /\[(ar|en|fr|es|de|pt)\]/i.test(haystack)
    ) {
      conflicts.push({
        term,
        expected,
        foundFragment: null,
        severity: "warning",
      });
    }
  }

  return conflicts;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
