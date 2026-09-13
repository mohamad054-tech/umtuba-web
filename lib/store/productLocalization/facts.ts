const DELIVERY_WINDOW = /\b\d+\s*-\s*\d+\s*days?\b/gi;
const BOILERPLATE =
  /typically\s+\d[\d\s\-]*days?(?:\s+to\s+ireland)?|this listing is a draft and is not for sale|physical product(?: for everyday use)?|category:\s*[^.]+\.|department:\s*[^.]+\.|subcategory:\s*[^.]+\.|home\s*\/\s*kitchen/gi;

export const QUANTITY_RE =
  /(\d+(?:\.\d+)?)\s*(?:pcs|pc|pieces?|piece|l\b|ml\b|cell|cells|discs?|tips?)/gi;
export const DIMENSION_RE =
  /(\d+(?:\.\d+)?)\s*(?:mm|cm|m\b|inch|inches|in\b)/gi;

const CLAIM_RE =
  /\b(heal|heals|cure|cures|treats?|medical|clinically|fda|certified|organic|whiten(?:s|ing)?|anti-aging|therapeutic|immunity|lose weight|performance enhancing)\b|يعالج|يشفي|شفاء|طبيّ?|معتمد من|عضوي|تبييض|مضاد للشيخوخة|علاجي|يزيد الأداء/gi;

export function catalogFactText(sourceTitle: string, sourceDescription: string): string {
  return `${sourceTitle}\n${sourceDescription}`
    .replace(DELIVERY_WINDOW, " ")
    .replace(BOILERPLATE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractQuantities(text: string): string[] {
  const found = new Set<string>();
  const re = new RegExp(QUANTITY_RE.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    found.add(normalizeNumericToken(match[1] ?? ""));
  }
  return [...found].filter(Boolean);
}

export function extractDimensions(text: string): string[] {
  const found = new Set<string>();
  const re = new RegExp(DIMENSION_RE.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    found.add(`${normalizeNumericToken(match[1] ?? "")}${(match[0].match(/mm|cm|inch|inches|in\b|m\b/i) ?? [""])[0].toLowerCase()}`);
  }
  return [...found].filter((row) => /\d/.test(row));
}

export function normalizeDecimalCommas(text: string): string {
  return text.replace(/(\d),(\d)/g, "$1.$2");
}

export function extractNumericTokens(text: string): string[] {
  const cleaned = catalogFactText(normalizeDecimalCommas(text), "");
  const found = new Set<string>();
  const re = /\d+(?:\.\d+)?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(cleaned))) {
    found.add(normalizeNumericToken(match[0]));
  }
  return [...found].filter(Boolean);
}

export function normalizeNumericToken(value: string): string {
  return value.replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[۰-۹]/g, (digit) =>
    String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))
  );
}

export function localizedCopyBlob(copy: {
  title_en_clean: string;
  title_ar: string;
  description_en_clean: string;
  description_ar: string;
  specifications_en: string[];
  specifications_ar: string[];
}): string {
  return [
    copy.title_en_clean,
    copy.title_ar,
    copy.description_en_clean,
    copy.description_ar,
    ...copy.specifications_en,
    ...copy.specifications_ar,
  ].join("\n");
}

export function claimMatches(text: string): string[] {
  const found = new Set<string>();
  const normalized = text.replace(/cure-dents?/gi, " ");
  const re = new RegExp(CLAIM_RE.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(normalized))) {
    found.add(match[0].toLowerCase());
  }
  return [...found];
}

export function hasArabicScript(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

export function hasArabicIndicDigits(text: string): boolean {
  return /[٠-٩۰-۹]/.test(text);
}
