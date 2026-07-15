/** Country code → flag emoji (regional indicator symbols). */
export function countryCodeToFlag(code: string | null | undefined): string | null {
  const raw = (code ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(raw)) {
    return null;
  }
  const a = 0x1f1e6 - 65;
  return String.fromCodePoint(a + raw.charCodeAt(0), a + raw.charCodeAt(1));
}

export function formatMilestoneValue(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString();
  }
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n.toLocaleString();
    return value.trim();
  }
  return null;
}

export function readMetaString(
  metadata: Record<string, unknown>,
  key: string
): string | null {
  const v = metadata[key];
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

export function readMetaNumber(
  metadata: Record<string, unknown>,
  key: string
): number | null {
  const v = metadata[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
