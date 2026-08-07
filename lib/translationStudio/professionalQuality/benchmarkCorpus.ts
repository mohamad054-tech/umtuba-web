/**
 * Fixed internal UMTUBA professional translation benchmark corpus V1.
 * Curated UI strings only — no PII / secrets. Non-production mass translate.
 */

export type BenchmarkDomain =
  | "app_shell"
  | "commerce"
  | "learning"
  | "collaboration"
  | "sensitive"
  | "placeholder";

export type BenchmarkLocale = "ar" | "fr" | "es" | "de" | "pt";

export type BenchmarkCase = {
  id: string;
  domain: BenchmarkDomain;
  sourceLocale: "en";
  sourceText: string;
  context: string;
  /** Locales this case should be evaluated against. */
  targetLocales: BenchmarkLocale[];
  glossaryRequirements: string[];
  prohibitedTranslations: Partial<Record<BenchmarkLocale, string[]>>;
  semanticRequirements: string[];
  /** Optional professionally known reference — guidance, not exact-only gold. */
  referenceHints?: Partial<Record<BenchmarkLocale, string>>;
  sensitive: boolean;
  hasPlaceholders: boolean;
};

const ALL: BenchmarkLocale[] = ["ar", "fr", "es", "de", "pt"];
const AR_PRIMARY: BenchmarkLocale[] = ["ar", "fr", "es", "de", "pt"];

function c(
  partial: Omit<BenchmarkCase, "sourceLocale" | "targetLocales"> & {
    targetLocales?: BenchmarkLocale[];
  }
): BenchmarkCase {
  return {
    sourceLocale: "en",
    targetLocales: partial.targetLocales ?? AR_PRIMARY,
    ...partial,
  };
}

/**
 * 40 curated cases spanning App Shell, Commerce, Learning, Collaboration,
 * sensitive/legal-financial, and placeholders.
 */
export const PROFESSIONAL_BENCHMARK_CORPUS_V1: BenchmarkCase[] = [
  // A. App Shell
  c({
    id: "appshell_back",
    domain: "app_shell",
    sourceText: "Back",
    context: "Primary navigation back control",
    glossaryRequirements: [],
    prohibitedTranslations: { ar: ["باك"] },
    semanticRequirements: ["Short UI imperative / navigation back"],
    referenceHints: { ar: "رجوع" },
    sensitive: false,
    hasPlaceholders: false,
  }),
  c({
    id: "appshell_cancel",
    domain: "app_shell",
    sourceText: "Cancel",
    context: "Dialog / form cancel",
    glossaryRequirements: [],
    prohibitedTranslations: {},
    semanticRequirements: ["Abort action without saving"],
    referenceHints: { ar: "إلغاء" },
    sensitive: false,
    hasPlaceholders: false,
  }),
  c({
    id: "appshell_continue",
    domain: "app_shell",
    sourceText: "Continue",
    context: "Wizard continue",
    glossaryRequirements: [],
    prohibitedTranslations: {},
    semanticRequirements: ["Proceed to next step"],
    referenceHints: { ar: "متابعة" },
    sensitive: false,
    hasPlaceholders: false,
  }),
  c({
    id: "appshell_save",
    domain: "app_shell",
    sourceText: "Save",
    context: "Persist changes",
    glossaryRequirements: [],
    prohibitedTranslations: {},
    semanticRequirements: ["Persist current edits"],
    referenceHints: { ar: "حفظ" },
    sensitive: false,
    hasPlaceholders: false,
  }),
  c({
    id: "appshell_settings",
    domain: "app_shell",
    sourceText: "Settings",
    context: "Settings entry",
    glossaryRequirements: [],
    prohibitedTranslations: { ar: ["السيتنجز"] },
    semanticRequirements: ["Open configuration"],
    referenceHints: { ar: "الإعدادات" },
    sensitive: false,
    hasPlaceholders: false,
  }),
  c({
    id: "appshell_empty",
    domain: "app_shell",
    sourceText: "Nothing here yet",
    context: "Empty state",
    glossaryRequirements: [],
    prohibitedTranslations: {},
    semanticRequirements: ["Empty state, friendly, concise"],
    sensitive: false,
    hasPlaceholders: false,
  }),
  c({
    id: "appshell_umtuba_brand",
    domain: "app_shell",
    sourceText: "Welcome to UMTUBA",
    context: "Brand welcome",
    glossaryRequirements: ["UMTUBA"],
    prohibitedTranslations: { ar: ["امتوبا", "أمتوبا"] },
    semanticRequirements: ["Preserve UMTUBA Latin brand"],
    sensitive: false,
    hasPlaceholders: false,
  }),

  // B. Commerce
  c({
    id: "commerce_refund",
    domain: "commerce",
    sourceText: "Refund",
    context: "Commerce refund noun/action",
    glossaryRequirements: ["Refund"],
    prohibitedTranslations: { ar: ["ريفند", "الريفند"] },
    semanticRequirements: ["Commerce refund meaning"],
    referenceHints: { ar: "استرداد" },
    sensitive: true,
    hasPlaceholders: false,
  }),
  c({
    id: "commerce_partial_refund",
    domain: "commerce",
    sourceText: "Partial refund",
    context: "Partial refund notice",
    glossaryRequirements: ["Refund"],
    prohibitedTranslations: { ar: ["ريفند"] },
    semanticRequirements: ["Partial amount refunded — not full"],
    sensitive: true,
    hasPlaceholders: false,
  }),
  c({
    id: "commerce_seller",
    domain: "commerce",
    sourceText: "Seller",
    context: "Commerce role",
    glossaryRequirements: ["Seller"],
    prohibitedTranslations: { ar: ["السيلر"] },
    semanticRequirements: ["Commerce seller role"],
    referenceHints: { ar: "البائع" },
    sensitive: false,
    hasPlaceholders: false,
  }),
  c({
    id: "commerce_buyer",
    domain: "commerce",
    sourceText: "Buyer",
    context: "Commerce role",
    glossaryRequirements: ["Buyer"],
    prohibitedTranslations: {},
    semanticRequirements: ["Commerce buyer role"],
    referenceHints: { ar: "المشتري" },
    sensitive: false,
    hasPlaceholders: false,
  }),
  c({
    id: "commerce_payment_failed",
    domain: "commerce",
    sourceText: "Payment failed",
    context: "Checkout error",
    glossaryRequirements: [],
    prohibitedTranslations: {},
    semanticRequirements: ["Payment did not succeed"],
    sensitive: true,
    hasPlaceholders: false,
  }),
  c({
    id: "commerce_payout_pending",
    domain: "commerce",
    sourceText: "Payout pending",
    context: "Seller payout status",
    glossaryRequirements: [],
    prohibitedTranslations: {},
    semanticRequirements: ["Payout not yet completed"],
    sensitive: true,
    hasPlaceholders: false,
  }),
  c({
    id: "commerce_store",
    domain: "commerce",
    sourceText: "Store",
    context: "Commerce store surface",
    glossaryRequirements: ["Store"],
    prohibitedTranslations: { ar: ["ستور", "مخزن"] },
    semanticRequirements: ["Commerce store, not warehouse"],
    referenceHints: { ar: "المتجر" },
    sensitive: false,
    hasPlaceholders: false,
  }),

  // C. Learning
  c({
    id: "learning_course",
    domain: "learning",
    sourceText: "Course",
    context: "Learning course entity",
    glossaryRequirements: ["Course"],
    prohibitedTranslations: {},
    semanticRequirements: ["Educational course"],
    referenceHints: { ar: "دورة" },
    sensitive: false,
    hasPlaceholders: false,
  }),
  c({
    id: "learning_lesson",
    domain: "learning",
    sourceText: "Lesson",
    context: "Learning lesson entity",
    glossaryRequirements: ["Lesson"],
    prohibitedTranslations: {},
    semanticRequirements: ["Lesson within a course"],
    referenceHints: { ar: "درس" },
    sensitive: false,
    hasPlaceholders: false,
  }),
  c({
    id: "learning_assignment",
    domain: "learning",
    sourceText: "Assignment",
    context: "Learner assignment",
    glossaryRequirements: [],
    prohibitedTranslations: {},
    semanticRequirements: ["Task assigned to learner"],
    sensitive: false,
    hasPlaceholders: false,
  }),
  c({
    id: "learning_continue",
    domain: "learning",
    sourceText: "Continue learning",
    context: "Resume learning CTA",
    glossaryRequirements: [],
    prohibitedTranslations: {},
    semanticRequirements: ["Resume educational progress"],
    sensitive: false,
    hasPlaceholders: false,
  }),
  c({
    id: "learning_submit_answer",
    domain: "learning",
    sourceText: "Submit answer",
    context: "Assessment submit",
    glossaryRequirements: [],
    prohibitedTranslations: {},
    semanticRequirements: ["Submit assessment answer"],
    sensitive: false,
    hasPlaceholders: false,
  }),
  c({
    id: "learning_points",
    domain: "learning",
    sourceText: "Points",
    context: "Learning points / score",
    glossaryRequirements: ["Points"],
    prohibitedTranslations: {},
    semanticRequirements: ["Score or reward points — ambiguous; natural UI"],
    sensitive: false,
    hasPlaceholders: false,
  }),

  // D. Collaboration
  c({
    id: "collab_workspace",
    domain: "collaboration",
    sourceText: "Workspace",
    context: "Collaboration workspace",
    glossaryRequirements: ["Workspace"],
    prohibitedTranslations: { ar: ["ورشة", "ورشة عمل"] },
    semanticRequirements: ["Team workspace container"],
    referenceHints: { ar: "مساحة العمل" },
    sensitive: false,
    hasPlaceholders: false,
  }),
  c({
    id: "collab_member",
    domain: "collaboration",
    sourceText: "Member",
    context: "Workspace member",
    glossaryRequirements: [],
    prohibitedTranslations: {},
    semanticRequirements: ["Workspace member"],
    sensitive: false,
    hasPlaceholders: false,
  }),
  c({
    id: "collab_invite",
    domain: "collaboration",
    sourceText: "Invite",
    context: "Invite member CTA",
    glossaryRequirements: [],
    prohibitedTranslations: {},
    semanticRequirements: ["Invite person to workspace"],
    sensitive: false,
    hasPlaceholders: false,
  }),
  c({
    id: "collab_role",
    domain: "collaboration",
    sourceText: "Role",
    context: "Member role label",
    glossaryRequirements: [],
    prohibitedTranslations: {},
    semanticRequirements: ["Access role"],
    sensitive: false,
    hasPlaceholders: false,
  }),
  c({
    id: "collab_permission",
    domain: "collaboration",
    sourceText: "Permission",
    context: "Access permission",
    glossaryRequirements: [],
    prohibitedTranslations: {},
    semanticRequirements: ["Access permission"],
    sensitive: false,
    hasPlaceholders: false,
  }),

  // E. Sensitive / legal / financial / security
  c({
    id: "sensitive_refund_notice",
    domain: "sensitive",
    sourceText: "Your refund has been issued",
    context: "Refund confirmation notice",
    glossaryRequirements: ["Refund"],
    prohibitedTranslations: { ar: ["ريفند"] },
    semanticRequirements: ["Confirm refund issued — no invented legal claims"],
    sensitive: true,
    hasPlaceholders: false,
  }),
  c({
    id: "sensitive_payment_processed",
    domain: "sensitive",
    sourceText: "Payment processed successfully",
    context: "Payment success notice",
    glossaryRequirements: [],
    prohibitedTranslations: {},
    semanticRequirements: ["Payment completed successfully"],
    sensitive: true,
    hasPlaceholders: false,
  }),
  c({
    id: "sensitive_account_security",
    domain: "sensitive",
    sourceText: "Verify your account security settings",
    context: "Security settings prompt",
    glossaryRequirements: [],
    prohibitedTranslations: {},
    semanticRequirements: ["Security settings verification — careful tone"],
    sensitive: true,
    hasPlaceholders: false,
  }),
  c({
    id: "sensitive_password_reset",
    domain: "sensitive",
    sourceText: "Reset your password",
    context: "Password reset CTA",
    glossaryRequirements: [],
    prohibitedTranslations: {},
    semanticRequirements: ["Password reset action"],
    sensitive: true,
    hasPlaceholders: false,
  }),
  c({
    id: "sensitive_terms",
    domain: "sensitive",
    sourceText: "By continuing you agree to the terms",
    context: "Legal acceptance line",
    glossaryRequirements: [],
    prohibitedTranslations: {},
    semanticRequirements: ["Legal agreement notice — human review required"],
    sensitive: true,
    hasPlaceholders: false,
  }),

  // F. Placeholders / formatting
  c({
    id: "ph_hello_name",
    domain: "placeholder",
    sourceText: "Hello {name}",
    context: "Greeting with placeholder",
    glossaryRequirements: [],
    prohibitedTranslations: {},
    semanticRequirements: ["Preserve {name} exactly"],
    sensitive: false,
    hasPlaceholders: true,
  }),
  c({
    id: "ph_count_items",
    domain: "placeholder",
    sourceText: "{{count}} items",
    context: "Count of items",
    glossaryRequirements: [],
    prohibitedTranslations: {},
    semanticRequirements: ["Preserve {{count}} exactly"],
    sensitive: false,
    hasPlaceholders: true,
  }),
  c({
    id: "ph_price",
    domain: "placeholder",
    sourceText: "Total: {amount}",
    context: "Price total line",
    glossaryRequirements: [],
    prohibitedTranslations: {},
    semanticRequirements: ["Preserve {amount}; currency formatting later"],
    sensitive: true,
    hasPlaceholders: true,
  }),
  c({
    id: "ph_html_bold",
    domain: "placeholder",
    sourceText: "Click <b>Continue</b> to proceed",
    context: "HTML-tagged UI hint",
    glossaryRequirements: [],
    prohibitedTranslations: {},
    semanticRequirements: ["Preserve <b></b> tags and meaning"],
    sensitive: false,
    hasPlaceholders: true,
  }),
  c({
    id: "ph_percent_s",
    domain: "placeholder",
    sourceText: "Welcome, %s",
    context: "Printf-style placeholder",
    glossaryRequirements: [],
    prohibitedTranslations: {},
    semanticRequirements: ["Preserve %s"],
    sensitive: false,
    hasPlaceholders: true,
  }),
  c({
    id: "ph_mixed",
    domain: "placeholder",
    sourceText: "{user} paid {amount} for order #{id}",
    context: "Mixed placeholders commerce",
    glossaryRequirements: [],
    prohibitedTranslations: {},
    semanticRequirements: ["Preserve {user}, {amount}, {id}"],
    sensitive: true,
    hasPlaceholders: true,
  }),

  // Extra coverage
  c({
    id: "admin_translation_studio",
    domain: "app_shell",
    sourceText: "Translation Studio",
    context: "Admin product name",
    glossaryRequirements: ["Translation Studio"],
    prohibitedTranslations: {},
    semanticRequirements: ["Product surface name"],
    referenceHints: { ar: "استوديو الترجمة" },
    sensitive: false,
    hasPlaceholders: false,
  }),
  c({
    id: "admin_dashboard",
    domain: "app_shell",
    sourceText: "Dashboard",
    context: "Admin dashboard",
    glossaryRequirements: ["Dashboard"],
    prohibitedTranslations: { ar: ["داشبورد"] },
    semanticRequirements: ["Admin dashboard surface"],
    referenceHints: { ar: "لوحة التحكم" },
    sensitive: false,
    hasPlaceholders: false,
  }),
  c({
    id: "commerce_order_confirmed",
    domain: "commerce",
    sourceText: "Order confirmed",
    context: "Order confirmation",
    glossaryRequirements: [],
    prohibitedTranslations: {},
    semanticRequirements: ["Order successfully confirmed"],
    sensitive: false,
    hasPlaceholders: false,
  }),
  c({
    id: "learning_points_earned",
    domain: "learning",
    sourceText: "You earned {points} points",
    context: "Points earned toast",
    glossaryRequirements: ["Points"],
    prohibitedTranslations: {},
    semanticRequirements: ["Preserve {points}; pedagogical clarity"],
    sensitive: false,
    hasPlaceholders: true,
  }),
];

export const BENCHMARK_CORPUS_VERSION = "umtuba_professional_benchmark_v1";

export function listBenchmarkCases(): BenchmarkCase[] {
  return PROFESSIONAL_BENCHMARK_CORPUS_V1;
}

export function getBenchmarkCase(id: string): BenchmarkCase | null {
  return PROFESSIONAL_BENCHMARK_CORPUS_V1.find((c) => c.id === id) ?? null;
}

export function assertBenchmarkCorpusIntegrity(): {
  ok: boolean;
  caseCount: number;
  locales: BenchmarkLocale[];
  domains: BenchmarkDomain[];
  placeholderCases: number;
  sensitiveCases: number;
  glossaryCases: number;
  errors: string[];
} {
  const errors: string[] = [];
  const cases = PROFESSIONAL_BENCHMARK_CORPUS_V1;
  if (cases.length < 30) errors.push("corpus must have >= 30 cases");
  const ids = new Set<string>();
  for (const item of cases) {
    if (ids.has(item.id)) errors.push(`duplicate id ${item.id}`);
    ids.add(item.id);
    if (!item.sourceText.trim()) errors.push(`${item.id}: empty source`);
    if (item.targetLocales.length === 0) {
      errors.push(`${item.id}: no target locales`);
    }
  }
  const locales = [...ALL];
  for (const loc of locales) {
    if (!cases.some((c) => c.targetLocales.includes(loc))) {
      errors.push(`locale ${loc} not represented`);
    }
  }
  const domains = [
    ...new Set(cases.map((c) => c.domain)),
  ] as BenchmarkDomain[];
  for (const d of [
    "app_shell",
    "commerce",
    "learning",
    "collaboration",
    "sensitive",
    "placeholder",
  ] as BenchmarkDomain[]) {
    if (!domains.includes(d)) errors.push(`domain ${d} missing`);
  }
  return {
    ok: errors.length === 0,
    caseCount: cases.length,
    locales,
    domains,
    placeholderCases: cases.filter((c) => c.hasPlaceholders).length,
    sensitiveCases: cases.filter((c) => c.sensitive).length,
    glossaryCases: cases.filter((c) => c.glossaryRequirements.length > 0)
      .length,
    errors,
  };
}
