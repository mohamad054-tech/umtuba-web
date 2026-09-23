/**
 * Token helpers for downloaded Uthmani ayah strings.
 * Never rewrite stored ayah text — only split / inspect tokens.
 */

/** Split on whitespace only; empty tokens dropped. */
export function tokenizeAyah(text: string): string[] {
  return text.split(/\s+/u).filter((token) => token.length > 0);
}

/**
 * First visible Arabic letter of a token for "first letters" mode.
 * Skips non-letter marks / Quranic annotations at the start of the token.
 * Does not mutate the stored ayah string.
 */
export function firstLetterOfToken(token: string): string {
  for (const ch of token) {
    if (/\p{L}/u.test(ch)) {
      return ch;
    }
  }
  return token.charAt(0) || "";
}

/** Last N whitespace tokens (for linking prompts). */
export function lastTokens(text: string, count: number): string {
  const tokens = tokenizeAyah(text);
  if (tokens.length === 0) return "";
  return tokens.slice(Math.max(0, tokens.length - count)).join(" ");
}

/** First N whitespace tokens (for linking options). */
export function firstTokens(text: string, count: number): string {
  const tokens = tokenizeAyah(text);
  if (tokens.length === 0) return "";
  return tokens.slice(0, count).join(" ");
}
