import { SUPPLIER_TITLE_SPAM } from "./constants";

const SPAM_RE = new RegExp(
  `\\b(${SUPPLIER_TITLE_SPAM.map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`,
  "gi"
);

export function stripSupplierSpam(raw: string): string {
  return raw
    .replace(SPAM_RE, " ")
    .replace(/\b(wholesale|new|hot|ins|temperament|gadget|gadgets)\b/gi, " ")
    .replace(/[,|/]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,.\-\s]+|[,.\-\s]+$/g, "")
    .trim();
}

export function titleCaseClean(raw: string): string {
  return raw
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (/^\d/.test(word) || /^(abs|pp|usb|led|gps)$/i.test(word)) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function looksLikeKeywordStuffedTitle(title: string): boolean {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 14) return true;
  const lower = title.toLowerCase();
  const spamHits = SUPPLIER_TITLE_SPAM.filter((token) => lower.includes(token)).length;
  return spamHits >= 2;
}
