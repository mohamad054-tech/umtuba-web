/**
 * Segment titles only. Root layout applies `%s | UMTUBA`.
 * Never include "| UMTUBA" here or the tab becomes "UMTUBA | UMTUBA".
 */

export function sandboxStoreTitle(page: string): string {
  const clean = page.replace(/\s*\|\s*UMTUBA\s*$/i, "").trim();
  return `${clean} · Sandbox Store`;
}

export function sandboxProductTitle(productTitle: string): string {
  return sandboxStoreTitle(productTitle);
}
