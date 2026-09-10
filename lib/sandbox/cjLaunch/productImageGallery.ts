/**
 * Display-only gallery URL filter. Does not mutate catalog image data.
 * Keeps original order, including duplicate URLs (keyed by index in the UI).
 */
export function visibleGalleryUrls(
  urls: readonly (string | null | undefined)[]
): string[] {
  const visible: string[] = [];
  for (const raw of urls) {
    if (typeof raw !== "string") continue;
    const url = raw.trim();
    if (!url) continue;
    if (!/^https?:\/\//i.test(url)) continue;
    visible.push(url);
  }
  return visible;
}

export function selectedGalleryUrl(
  urls: readonly (string | null | undefined)[],
  index: number
): string | null {
  const visible = visibleGalleryUrls(urls);
  if (visible.length === 0) return null;
  if (!Number.isInteger(index) || index < 0 || index >= visible.length) {
    return visible[0];
  }
  return visible[index];
}

export function resetGalleryIndexForProduct(
  previousProductKey: string,
  nextProductKey: string
): boolean {
  return previousProductKey !== nextProductKey;
}
