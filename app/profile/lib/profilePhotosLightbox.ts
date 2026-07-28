/**
 * Creator Space Photos Lightbox V1 — index navigation helpers.
 * Wrap-around; empty / out-of-range inputs fail closed (-1).
 */

/** Next photo index with wrap. Returns -1 when length is 0 or current is invalid. */
export function nextIndex(current: number, length: number): number {
  if (!Number.isInteger(length) || length <= 0) {
    return -1;
  }
  if (!Number.isInteger(current) || current < 0 || current >= length) {
    return -1;
  }
  return (current + 1) % length;
}

/** Previous photo index with wrap. Returns -1 when length is 0 or current is invalid. */
export function prevIndex(current: number, length: number): number {
  if (!Number.isInteger(length) || length <= 0) {
    return -1;
  }
  if (!Number.isInteger(current) || current < 0 || current >= length) {
    return -1;
  }
  return (current - 1 + length) % length;
}
