/**
 * Root layout applies `%s | UMTUBA`. If a segment already names the brand
 * (or already ends with `| UMTUBA`), keep the brand once.
 */

const BRAND = "UMTUBA";
const TRAILING_PIPE_BRAND =
  /(?:\s*\|\s*UMTUBA(?:\s+[A-Za-z][A-Za-z-]*)*)+$/g;

export function stripTrailingBrandPipes(title: string): string {
  return title.replace(TRAILING_PIPE_BRAND, "").trim();
}

/**
 * Next.js metadata title: a string is wrapped by the root template.
 * An absolute title is used as-is.
 */
export function resolveMetadataTitle(
  title: string
): string | { absolute: string } {
  const cleaned = stripTrailingBrandPipes(title);
  if (new RegExp(`\\b${BRAND}\\b`).test(cleaned)) {
    return { absolute: cleaned };
  }
  return cleaned;
}
