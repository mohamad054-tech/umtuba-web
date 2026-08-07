/**
 * Professional Translation Memory ranking foundation.
 * Approved-only preference; exact > domain > near; drafts never outrank approved.
 */

import { sourceFingerprint } from "../normalize";
import type { StudioLanguageCode, TranslationMemoryEntry } from "../types";

export type MemoryMatchKind = "exact" | "near" | "domain";

export type RankedMemoryCandidate = {
  entry: TranslationMemoryEntry;
  matchKind: MemoryMatchKind;
  /** 0–100 ranking score for selection — not semantic correctness. */
  rankScore: number;
  approvedOnly: true;
};

export function rankMemoryCandidates(input: {
  sourceText: string;
  targetLocale: StudioLanguageCode;
  namespaceId?: string | null;
  domainScope?: string | null;
  entries: TranslationMemoryEntry[];
}): RankedMemoryCandidate[] {
  const fp = sourceFingerprint(input.sourceText);
  const srcLower = input.sourceText.trim().toLowerCase();
  const out: RankedMemoryCandidate[] = [];

  for (const entry of input.entries) {
    // Hard rule: only approved memory may rank.
    if (entry.status !== "approved") continue;
    if (entry.language !== input.targetLocale) continue;

    let matchKind: MemoryMatchKind | null = null;
    let rankScore = 0;

    if (entry.sourceFingerprint === fp) {
      matchKind = "exact";
      rankScore = 100;
      if (
        input.namespaceId &&
        entry.namespaceId &&
        entry.namespaceId === input.namespaceId
      ) {
        rankScore = 100;
      }
    } else if (
      input.namespaceId &&
      entry.namespaceId &&
      entry.namespaceId === input.namespaceId &&
      (entry.sourceText.toLowerCase().includes(srcLower) ||
        srcLower.includes(entry.sourceText.toLowerCase()))
    ) {
      matchKind = "domain";
      rankScore = 70;
    } else {
      const a = entry.sourceText.trim().toLowerCase();
      if (
        a.length >= 4 &&
        srcLower.length >= 4 &&
        (a.startsWith(srcLower.slice(0, Math.min(8, srcLower.length))) ||
          srcLower.startsWith(a.slice(0, Math.min(8, a.length))))
      ) {
        matchKind = "near";
        rankScore = 55;
      }
    }

    if (!matchKind) continue;
    out.push({
      entry,
      matchKind,
      rankScore,
      approvedOnly: true,
    });
  }

  return out.sort((a, b) => {
    if (b.rankScore !== a.rankScore) return b.rankScore - a.rankScore;
    if (a.matchKind === "exact" && b.matchKind !== "exact") return -1;
    if (b.matchKind === "exact" && a.matchKind !== "exact") return 1;
    return 0;
  });
}
