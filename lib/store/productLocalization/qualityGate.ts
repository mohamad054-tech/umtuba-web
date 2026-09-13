import { SUPPLIER_TITLE_SPAM } from "./constants";
import {
  catalogFactText,
  claimMatches,
  extractDimensions,
  extractNumericTokens,
  extractQuantities,
  hasArabicIndicDigits,
  hasArabicScript,
  localizedCopyBlob,
} from "./facts";
import { looksLikeKeywordStuffedTitle } from "./titleCleanup";
import type {
  LocalizedProductCopy,
  LocalizationSourceProduct,
  QualityGateFinding,
  QualityGateResult,
} from "./types";

const MT_ARTIFACTS = [
  /\bthe ال/,
  /\bال the\b/i,
  /[-–—]\s*[-–—]/,
  /\s{3,}/,
  /kitchen gadgets/i,
  /pet supplies/i,
  /car styling/i,
];

const RTL_ISSUES = [
  /\$US/,
  /\(\s*$/,
  /^\s*\)/,
  /\u202E|\u202A|\u202B|\u202C|\u202D/,
];

function add(
  findings: QualityGateFinding[],
  finding: QualityGateFinding
): void {
  findings.push(finding);
}

export function evaluateLocalizationQuality(
  source: Pick<LocalizationSourceProduct, "source_title" | "source_description">,
  copy: LocalizedProductCopy
): QualityGateResult {
  const findings: QualityGateFinding[] = [];
  const sourceFacts = catalogFactText(source.source_title, source.source_description);
  const blob = localizedCopyBlob(copy);
  const sourceQuantities = extractQuantities(source.source_title);
  const sourceDimensions = extractDimensions(source.source_title);
  const sourceNumbers = extractNumericTokens(source.source_title);
  const localizedNumbers = extractNumericTokens(blob);

  if (!copy.title_ar.trim()) {
    add(findings, {
      code: "empty_arabic_title",
      severity: "error",
      message: "Arabic title is empty.",
      field: "title_ar",
    });
  }

  const enNorm = copy.title_en_clean.trim().toLowerCase();
  const arNorm = copy.title_ar.trim().toLowerCase();
  if (copy.title_ar.trim() && (arNorm === enNorm || !hasArabicScript(copy.title_ar))) {
    add(findings, {
      code: "identical_arabic_english_title",
      severity: "error",
      message: "Arabic title is missing Arabic script or matches the English title.",
      field: "title_ar",
    });
  }

  if (!copy.description_ar.trim() || !hasArabicScript(copy.description_ar)) {
    add(findings, {
      code: "empty_arabic_title",
      severity: "error",
      message: "Arabic description is empty or has no Arabic script.",
      field: "description_ar",
    });
  }

  const spamLeft = SUPPLIER_TITLE_SPAM.filter((token) =>
    `${copy.title_en_clean} ${copy.title_ar}`.toLowerCase().includes(token)
  );
  if (
    spamLeft.length > 0 ||
    looksLikeKeywordStuffedTitle(copy.title_en_clean) ||
    looksLikeKeywordStuffedTitle(copy.title_ar)
  ) {
    add(findings, {
      code: "untranslated_supplier_spam",
      severity: "error",
      message: `Supplier keyword spam remains in a customer title (${spamLeft.join(", ") || "long stuffed title"}).`,
      field: "title_en_clean",
    });
  }

  if (MT_ARTIFACTS.some((re) => re.test(blob))) {
    add(findings, {
      code: "suspicious_mt_artifact",
      severity: "error",
      message: "Suspicious machine-translation artifact in localized copy.",
    });
  }

  for (const qty of sourceQuantities) {
    if (!localizedNumbers.includes(qty)) {
      add(findings, {
        code: "lost_quantity",
        severity: "error",
        message: `Quantity ${qty} from the supplier title is missing in localized copy.`,
      });
    }
  }

  for (const dim of sourceDimensions) {
    const number = dim.replace(/[^\d.]/g, "");
    if (number && !localizedNumbers.includes(number)) {
      add(findings, {
        code: "lost_dimension",
        severity: "error",
        message: `Dimension ${dim} from the supplier title is missing in localized copy.`,
      });
    }
  }

  for (const num of localizedNumbers) {
    if (!sourceNumbers.includes(num)) {
      add(findings, {
        code: "changed_numeric_value",
        severity: "error",
        message: `Localized copy introduces numeric value ${num} that is not in the supplier title.`,
      });
    }
  }

  const sourceClaims = new Set(claimMatches(sourceFacts));
  for (const claim of claimMatches(blob)) {
    if (!sourceClaims.has(claim)) {
      add(findings, {
        code: "unsupported_claim",
        severity: "error",
        message: `Unsupported claim "${claim}" is not present in the supplier source.`,
      });
    }
  }

  if (
    hasArabicIndicDigits(copy.title_ar) ||
    hasArabicIndicDigits(copy.description_ar) ||
    RTL_ISSUES.some((re) => re.test(blob)) ||
    /\$US/.test(blob)
  ) {
    add(findings, {
      code: "malformed_rtl",
      severity: "error",
      message: "Malformed RTL text, Arabic-Indic digits, or $US currency artifact.",
    });
  }

  return {
    ok: findings.every((row) => row.severity !== "error"),
    findings,
  };
}

export function summarizeQualityGate(results: QualityGateResult[]): {
  status: "PASS" | "FAIL";
  error_count: number;
  warning_count: number;
} {
  const findings = results.flatMap((row) => row.findings);
  const error_count = findings.filter((row) => row.severity === "error").length;
  const warning_count = findings.filter((row) => row.severity === "warning").length;
  return {
    status: error_count === 0 ? "PASS" : "FAIL",
    error_count,
    warning_count,
  };
}
