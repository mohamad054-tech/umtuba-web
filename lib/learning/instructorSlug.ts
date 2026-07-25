/**
 * Instructor create-flow slug helpers.
 * Normalize display names into SQL-safe slugs and allocate unique variants.
 * No schema changes — uniqueness is enforced against existing sibling slugs
 * and/or retry on duplicate RPC errors.
 */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_SLUG_LEN = 64;
const MIN_SLUG_LEN = 3;

/** Normalize a display name into a lowercase hyphenated slug (3–64 chars). */
export function slugifyInstructorName(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LEN);
  if (base.length >= MIN_SLUG_LEN && SLUG_RE.test(base)) return base;
  const padded = (base || "item").padEnd(MIN_SLUG_LEN, "x").slice(0, MAX_SLUG_LEN);
  return SLUG_RE.test(padded) ? padded : "item-x";
}

/**
 * Pick a unique slug from a base + existing set.
 * Appends -2, -3, … while staying within 64 chars.
 */
export function allocateUniqueInstructorSlug(
  baseNameOrSlug: string,
  taken: Iterable<string>
): string {
  const takenSet = new Set(
    [...taken].map((s) => s.trim().toLowerCase()).filter(Boolean)
  );
  const base = slugifyInstructorName(baseNameOrSlug);
  if (!takenSet.has(base)) return base;

  for (let n = 2; n <= 9999; n += 1) {
    const suffix = `-${n}`;
    const head = base.slice(0, Math.max(1, MAX_SLUG_LEN - suffix.length));
    const trimmed = head.replace(/-+$/g, "");
    const candidate = `${trimmed || "item"}${suffix}`;
    if (
      candidate.length >= MIN_SLUG_LEN &&
      candidate.length <= MAX_SLUG_LEN &&
      SLUG_RE.test(candidate) &&
      !takenSet.has(candidate)
    ) {
      return candidate;
    }
  }
  // Extremely unlikely exhaustion — fall back to timestamp fragment.
  const stamp = Date.now().toString(36).slice(-6);
  return slugifyInstructorName(`item-${stamp}`);
}

/** True when an RPC/error message indicates a slug uniqueness conflict. */
export function isInstructorSlugConflictError(
  message: string | undefined
): boolean {
  const lower = (message ?? "").toLowerCase();
  return (
    lower.includes("duplicate") ||
    lower.includes("unique") ||
    lower.includes("already exists") ||
    lower.includes("already in use")
  );
}

/**
 * Retry a create that takes a slug, reallocating on conflict.
 * `createOnce` receives the candidate slug for each attempt.
 */
export async function createWithUniqueInstructorSlug<T>(
  name: string,
  createOnce: (slug: string) => Promise<
    | { ok: true; data: T }
    | { ok: false; message: string }
  >,
  options?: {
    taken?: Iterable<string>;
    maxAttempts?: number;
  }
): Promise<{ ok: true; data: T } | { ok: false; message: string }> {
  const maxAttempts = options?.maxAttempts ?? 8;
  const taken = new Set(
    [...(options?.taken ?? [])].map((s) => s.trim().toLowerCase()).filter(Boolean)
  );
  let lastMessage = "Could not allocate a unique slug.";

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const slug = allocateUniqueInstructorSlug(name, taken);
    taken.add(slug);
    const result = await createOnce(slug);
    if (result.ok) return result;
    lastMessage = result.message;
    if (!isInstructorSlugConflictError(result.message)) {
      return result;
    }
  }

  return { ok: false, message: lastMessage };
}
