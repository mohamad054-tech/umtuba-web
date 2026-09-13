import { extractNumericTokens, extractQuantities, hasArabicScript } from "./facts";
import { buildLocalizedCopy } from "./copyFactory";
import { PRODUCT_KINDS, type FactCtx } from "./productGlossary";
import { evaluateLocalizationQuality } from "./qualityGate";
import { looksLikeKeywordStuffedTitle } from "./titleCleanup";
import type { LocalizedProductCopy, LocalizationSourceProduct } from "./types";

export type LocalizationStatus = "gold_standard" | "local_pass" | "manual_review_required";

export type ComposeResult =
  | { status: "local_pass"; copy: LocalizedProductCopy; kind: string }
  | { status: "manual_review_required"; copy: null; kind: string; reason: string };

const ALLOWED_LATIN = new Set([
  "usb",
  "led",
  "gps",
  "abs",
  "pp",
  "pu",
  "pvc",
  "qi",
  "cat6",
  "cctv",
  "obd2",
  "usb-c",
  "type-c",
  "phofay",
  "iphone",
]);

const MANUAL_PATTERNS = [
  /heal spur|plantar|acupunct|ems foot|fisioterapia|blood circulation|callus remover|dead skin/i,
  /aliexpress|taobao|foreign trade|artifact artifact/i,
  /xhorse|obd to 6 pin|delphi motorcycle|hds cable/i,
  /baby baby baby|backpack backpack backpack/i,
  /talking watch|electrocardiogram|magic array/i,
  /foot warmer artifact|gaobang/i,
  /medicine bottle|medicine can|urine pad|physiological pants/i,
  /autism|anti-anxiety|anxiety relief|relieves stress/i,
  /tattoo makeup/i,
];

function materials(title: string): { materialEn?: string; materialAr?: string } {
  const t = title.toLowerCase();
  if (/stainless steel/.test(t)) return { materialEn: "Stainless Steel", materialAr: "الستانلس ستيل" };
  if (/liquid silicone/.test(t)) return { materialEn: "Liquid Silicone", materialAr: "السيليكون السائل" };
  if (/silicone/.test(t)) return { materialEn: "Silicone", materialAr: "السيليكون" };
  if (/ceramic/.test(t)) return { materialEn: "Ceramic", materialAr: "السيراميك" };
  if (/leather|cowhide|cowskin/.test(t)) return { materialEn: "Leather", materialAr: "الجلد" };
  if (/nylon/.test(t)) return { materialEn: "Nylon", materialAr: "النايلون" };
  if (/wood|wooden/.test(t)) return { materialEn: "Wood", materialAr: "الخشب" };
  if (/plastic/.test(t)) return { materialEn: "Plastic", materialAr: "البلاستيك" };
  if (/alloy|aluminum|aluminium/.test(t)) return { materialEn: "Alloy", materialAr: "السبيكة" };
  if (/magnetic/.test(t)) return { materialEn: "Magnetic", materialAr: "مغناطيسي" };
  if (/glass/.test(t)) return { materialEn: "Glass", materialAr: "الزجاج" };
  if (/satin|silk/.test(t)) return { materialEn: "Satin", materialAr: "الساتان" };
  return {};
}

function firstQty(title: string): string | undefined {
  const qty = extractQuantities(title)[0];
  if (qty) return qty;
  const match =
    title.match(/\b(\d+)\s*(?:-| )?(?:pcs|pc|pieces?|piece)\b/i) ||
    title.match(/\b(\d+)\s+makeup brushes\b/i);
  return match?.[1];
}

function leftoverLatin(titleAr: string): string[] {
  return titleAr
    .split(/\s+/)
    .map((word) => word.replace(/[^\w-]/g, ""))
    .filter((word) => /[A-Za-z]{4,}/.test(word) && !ALLOWED_LATIN.has(word.toLowerCase()));
}

export function goldStandardGaps(
  source: LocalizationSourceProduct,
  copy: LocalizedProductCopy
): string[] {
  const gaps: string[] = [];
  const quality = evaluateLocalizationQuality(source, copy);
  for (const finding of quality.findings) gaps.push(finding.code);
  if (copy.title_en_clean.trim().split(/\s+/).length > 12) gaps.push("en_title_too_long");
  if (looksLikeKeywordStuffedTitle(copy.title_en_clean)) gaps.push("en_title_stuffed");
  if (!hasArabicScript(copy.title_ar) || !hasArabicScript(copy.description_ar)) {
    gaps.push("arabic_incomplete");
  }
  if (copy.description_ar.trim().length < 40) gaps.push("ar_description_thin");
  if (copy.specifications_en.length < 2 || copy.specifications_ar.length < 2) {
    gaps.push("specs_thin");
  }
  if (leftoverLatin(copy.title_ar).length > 2) gaps.push("untranslated_english_in_arabic_title");
  return [...new Set(gaps)];
}

export function composeLocalCopy(product: LocalizationSourceProduct): ComposeResult {
  const title = product.source_title;
  const lower = title.toLowerCase();
  for (const pattern of MANUAL_PATTERNS) {
    if (pattern.test(title)) {
      return {
        status: "manual_review_required",
        copy: null,
        kind: "blocked_pattern",
        reason: `Source title needs paid-AI / human review (${pattern.source}).`,
      };
    }
  }

  const kind = PRODUCT_KINDS.find((row) => row.test(lower));
  if (!kind) {
    return {
      status: "manual_review_required",
      copy: null,
      kind: "unknown",
      reason: "No gold-standard local template matched this supplier title.",
    };
  }

  const qty = firstQty(title);
  const mats = materials(title);
  const ctx: FactCtx = { qty, ...mats, extrasEn: [], extrasAr: [] };
  const title_en_clean = kind.en(ctx);
  const title_ar = kind.ar(ctx);
  const specsEn = [
    mats.materialEn ? `Material: ${mats.materialEn}` : "Material: not supplied beyond the title wording",
    qty ? `Quantity: ${qty}` : "Quantity: not supplied",
    `Listed use: ${kind.useEn}`,
  ];
  const specsAr = [
    mats.materialAr ? `الخامة: ${mats.materialAr}` : "الخامة: غير مذكورة بما يتجاوز عنوان المورّد",
    qty ? `الكمية: ${qty}` : "الكمية: غير مذكورة",
    `الاستخدام المذكور: ${kind.useAr}`,
  ];
  const numbers = extractNumericTokens(title);
  if (numbers.length) {
    specsEn.push(`Numbers listed in the supplier title: ${numbers.join(", ")}`);
    specsAr.push(`الأرقام المذكورة في عنوان المورّد: ${numbers.join("، ")}`);
  }

  const copy = buildLocalizedCopy({
    department: product.department,
    subcategory: product.subcategory,
    title_en_clean,
    title_ar,
    description_en_clean: `${title_en_clean}. Use it for ${kind.useEn}. Facts are taken only from the supplier title. No extra size, model, or performance detail was added.`,
    description_ar: `${title_ar}. يُستخدم ل${kind.useAr}. استُخرجت الوقائع من عنوان المورّد فقط، دون إضافة مقاس أو طراز أو أداء غير مذكور.`,
    specifications_en: specsEn,
    specifications_ar: specsAr,
    search_keywords_en: [title_en_clean, kind.id.replace(/_/g, " ")],
    search_keywords_ar: [title_ar, kind.useAr],
  });

  const gaps = goldStandardGaps(product, copy);
  if (gaps.length) {
    return {
      status: "manual_review_required",
      copy: null,
      kind: kind.id,
      reason: `Local compose failed gold-standard gate: ${gaps.join(", ")}`,
    };
  }
  return { status: "local_pass", copy, kind: kind.id };
}
