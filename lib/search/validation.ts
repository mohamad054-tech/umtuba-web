import { SEARCH_TABS, type SearchTab } from "./types";

export const MAX_SEARCH_QUERY_LENGTH = 80;
/** Minimum meaningful length after sanitize — reduces single-char trigram abuse. */
export const MIN_SEARCH_QUERY_LENGTH = 2;
export const DEFAULT_SEARCH_LIMIT = 12;
export const MAX_SEARCH_LIMIT = 40;

export type SearchQueryValidation =
  | { ok: true; query: string; normalized: string }
  | { ok: false; message: string; empty?: boolean };

export function normalizeSearchQuery(raw: string | null | undefined): string {
  return (raw ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, MAX_SEARCH_QUERY_LENGTH);
}

/** Strip LIKE wildcards / control characters before ilike interpolation. */
export function sanitizeSearchTerm(raw: string): string {
  return normalizeSearchQuery(raw)
    .replace(/[%_\\]/g, "")
    .replace(/[,()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function validateSearchQuery(
  raw: string | null | undefined
): SearchQueryValidation {
  const query = normalizeSearchQuery(raw);
  if (!query) {
    return {
      ok: false,
      empty: true,
      message: "Enter a search term.",
    };
  }
  const sanitized = sanitizeSearchTerm(query);
  if (!sanitized) {
    return {
      ok: false,
      message: "That search term is not valid. Try different words.",
    };
  }
  if (sanitized.length < MIN_SEARCH_QUERY_LENGTH) {
    return {
      ok: false,
      empty: true,
      message: "Type at least 2 characters to search.",
    };
  }
  return {
    ok: true,
    query,
    normalized: sanitized.toLowerCase(),
  };
}

/** Quote a sanitized term for PostgREST `ilike` filter fragments. */
export function quotedIlikePattern(sanitizedTerm: string): string {
  const safe = sanitizeSearchTerm(sanitizedTerm).replace(/"/g, "");
  return `"%${safe}%"`;
}

export function parseSearchTab(raw: string | null | undefined): SearchTab {
  const value = (raw ?? "all").trim().toLowerCase();
  return (SEARCH_TABS as readonly string[]).includes(value)
    ? (value as SearchTab)
    : "all";
}

export function clampSearchLimit(limit: number | null | undefined): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) {
    return DEFAULT_SEARCH_LIMIT;
  }
  return Math.min(MAX_SEARCH_LIMIT, Math.max(1, Math.floor(limit)));
}
