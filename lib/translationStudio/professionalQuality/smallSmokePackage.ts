/**
 * Locked Phase-A small-smoke package — 5 cases, operator-ready, no live execution.
 */

import {
  listBenchmarkCases,
  type BenchmarkCase,
  type BenchmarkLocale,
} from "./benchmarkCorpus";
import { ARABIC_ACCEPTANCE_BAR } from "./acceptanceBars";

export const SMALL_SMOKE_PACKAGE_ID = "live_ai_provider_small_smoke_v1" as const;
export const SMALL_SMOKE_CASE_COUNT = 5 as const;

/** Exact locked order — do not expand. */
export const SMALL_SMOKE_LOCKED_CASE_IDS = [
  "appshell_back",
  "appshell_cancel",
  "collab_workspace",
  "commerce_refund",
  "ph_hello_name",
] as const;

export type SmallSmokeLockedCaseId =
  (typeof SMALL_SMOKE_LOCKED_CASE_IDS)[number];

export type SmallSmokeCasePolicy = {
  smokeIndex: 1 | 2 | 3 | 4 | 5;
  caseId: SmallSmokeLockedCaseId;
  sourceText: string;
  targetLocale: BenchmarkLocale;
  namespaceDomain: string;
  profileId: string;
  glossaryEntries: string[];
  doNotTranslate: string[];
  placeholders: string[];
  semanticRequirements: string[];
  arabicExpectations?: string[];
  humanReviewRequired: boolean;
  sensitiveReviewerPreferred: boolean;
  /** If sensitive reviewer unset: may use normal reviewer IF humanReviewRequired stays true. */
  allowNormalReviewerWhenSensitiveUnset: boolean;
  disqualifyingErrors: string[];
  /** Guidance only — not exact-only gold. */
  referenceHints?: string[];
};

export type SmallSmokePackage = {
  schemaVersion: 1;
  packageId: typeof SMALL_SMOKE_PACKAGE_ID;
  phase: "A";
  caseCount: typeof SMALL_SMOKE_CASE_COUNT;
  cases: SmallSmokeCasePolicy[];
  corpusCases: BenchmarkCase[];
  normalProviderCalls: 10;
  notes: string[];
};

const ARABIC_UI_EXPECTATIONS = [
  "Natural MSA",
  "Concise UI phrasing",
  "No literal awkward calque",
  "Glossary compliance where applicable",
  "No unnecessary transliteration",
  "Correct punctuation",
  "Context-appropriate meaning",
  ...ARABIC_ACCEPTANCE_BAR.notes,
];

/**
 * Locked policies for the first live small smoke (prep only).
 * Case 5 uses FR to exercise non-Arabic style + placeholder integrity.
 */
export function getSmallSmokeCasePolicies(): SmallSmokeCasePolicy[] {
  return [
    {
      smokeIndex: 1,
      caseId: "appshell_back",
      sourceText: "Back",
      targetLocale: "ar",
      namespaceDomain: "app_shell",
      profileId: "standard_ui",
      glossaryEntries: [],
      doNotTranslate: [],
      placeholders: [],
      semanticRequirements: ["Short UI imperative / navigation back"],
      arabicExpectations: ARABIC_UI_EXPECTATIONS,
      humanReviewRequired: false,
      sensitiveReviewerPreferred: false,
      allowNormalReviewerWhenSensitiveUnset: true,
      disqualifyingErrors: [
        "placeholder_corruption",
        "authority_violation",
        "forbidden_glossary_alternative",
        "unnatural_calque_pass",
      ],
      referenceHints: ["رجوع"],
    },
    {
      smokeIndex: 2,
      caseId: "appshell_cancel",
      sourceText: "Cancel",
      targetLocale: "ar",
      namespaceDomain: "app_shell",
      profileId: "standard_ui",
      glossaryEntries: [],
      doNotTranslate: [],
      placeholders: [],
      semanticRequirements: ["Abort action without saving"],
      arabicExpectations: ARABIC_UI_EXPECTATIONS,
      humanReviewRequired: false,
      sensitiveReviewerPreferred: false,
      allowNormalReviewerWhenSensitiveUnset: true,
      disqualifyingErrors: [
        "placeholder_corruption",
        "authority_violation",
        "unnatural_calque_pass",
      ],
      referenceHints: ["إلغاء"],
    },
    {
      smokeIndex: 3,
      caseId: "collab_workspace",
      sourceText: "Workspace",
      targetLocale: "ar",
      namespaceDomain: "collaboration",
      profileId: "standard_ui",
      glossaryEntries: ["Workspace"],
      doNotTranslate: [],
      placeholders: [],
      semanticRequirements: [
        "Team workspace container",
        "Glossary: مساحة العمل (not ورشة عمل)",
      ],
      arabicExpectations: [
        ...ARABIC_UI_EXPECTATIONS,
        "Product term per glossary (مساحة العمل)",
      ],
      humanReviewRequired: false,
      sensitiveReviewerPreferred: false,
      allowNormalReviewerWhenSensitiveUnset: true,
      disqualifyingErrors: [
        "forbidden_glossary_alternative",
        "required_terminology_missing",
        "authority_violation",
        "unnatural_calque_pass",
      ],
      referenceHints: ["مساحة العمل"],
    },
    {
      smokeIndex: 4,
      caseId: "commerce_refund",
      sourceText: "Refund",
      targetLocale: "ar",
      namespaceDomain: "commerce",
      profileId: "commerce_sensitive",
      glossaryEntries: ["Refund"],
      doNotTranslate: [],
      placeholders: [],
      semanticRequirements: [
        "Commerce refund meaning",
        "Semantic precision",
        "No misleading financial implication",
      ],
      arabicExpectations: [
        ...ARABIC_UI_EXPECTATIONS,
        "Glossary: استرداد (not ريفند)",
        "Mandatory human review regardless of AI PASS",
      ],
      humanReviewRequired: true,
      sensitiveReviewerPreferred: true,
      allowNormalReviewerWhenSensitiveUnset: true,
      disqualifyingErrors: [
        "forbidden_glossary_alternative",
        "sensitive_without_human_gate",
        "authority_violation",
        "misleading_financial_implication",
      ],
      referenceHints: ["استرداد"],
    },
    {
      smokeIndex: 5,
      caseId: "ph_hello_name",
      sourceText: "Hello {name}",
      targetLocale: "fr",
      namespaceDomain: "placeholder",
      profileId: "standard_ui",
      glossaryEntries: [],
      doNotTranslate: ["{name}"],
      placeholders: ["{name}"],
      semanticRequirements: [
        "Preserve {name} exactly (byte/logical)",
        "Native/idiomatic French greeting",
        "Locale style guide honored",
      ],
      humanReviewRequired: false,
      sensitiveReviewerPreferred: false,
      allowNormalReviewerWhenSensitiveUnset: true,
      disqualifyingErrors: [
        "placeholder_corruption",
        "placeholder_missing",
        "placeholder_extra",
        "authority_violation",
      ],
    },
  ];
}

export function buildSmallSmokePackage(): SmallSmokePackage {
  const policies = getSmallSmokeCasePolicies();
  const byId = new Map(listBenchmarkCases().map((c) => [c.id, c]));
  const corpusCases: BenchmarkCase[] = [];
  for (const p of policies) {
    const c = byId.get(p.caseId);
    if (!c) {
      throw new Error(`small_smoke_missing_corpus_case:${p.caseId}`);
    }
    corpusCases.push(c);
  }
  if (policies.length !== SMALL_SMOKE_CASE_COUNT) {
    throw new Error("small_smoke_case_count_mismatch");
  }
  return {
    schemaVersion: 1,
    packageId: SMALL_SMOKE_PACKAGE_ID,
    phase: "A",
    caseCount: SMALL_SMOKE_CASE_COUNT,
    cases: policies,
    corpusCases,
    normalProviderCalls: 10,
    notes: [
      "Do not require one exact translation string as sole acceptable answer",
      "Refund remains human-review gated even if AI recommends PASS",
      "Case 5 FR + {name} — placeholder corruption is immediate DQ",
      "No Studio mutation; evaluation artifacts only",
      "No live paid calls in prep milestone",
    ],
  };
}

export function calculateSmallSmokeCallBudget(input?: {
  maxRetries?: number;
}): {
  caseCount: 5;
  generatorCalls: 5;
  reviewerCalls: 5;
  normalCalls: 10;
  maxRetries: number;
  retryCeilingCalls: number;
  totalCallCeiling: number;
  requiresExplicitGo: true;
} {
  const maxRetries = Math.max(0, Math.min(2, input?.maxRetries ?? 1));
  const normalCalls = 10;
  const retryCeilingCalls = normalCalls * maxRetries;
  return {
    caseCount: 5,
    generatorCalls: 5,
    reviewerCalls: 5,
    normalCalls,
    maxRetries,
    retryCeilingCalls,
    totalCallCeiling: normalCalls + retryCeilingCalls,
    requiresExplicitGo: true,
  };
}

export function validateSmallSmokePrivacy(
  pkg: SmallSmokePackage = buildSmallSmokePackage()
): { status: "PASS" | "FAIL"; errors: string[] } {
  const errors: string[] = [];
  const forbidden = [
    /password\s*[:=]/i,
    /api[_-]?key/i,
    /bearer\s+[a-z0-9]/i,
    /authorization:/i,
    /\b\d{3}-\d{2}-\d{4}\b/,
    /@gmail\.com/i,
    /session[_-]?token/i,
    /refresh[_-]?token/i,
  ];
  for (const c of pkg.corpusCases) {
    const blob = `${c.sourceText} ${c.context} ${JSON.stringify(c)}`;
    for (const re of forbidden) {
      if (re.test(blob)) errors.push(`${c.id}: privacy ${re}`);
    }
  }
  for (const p of pkg.cases) {
    if (p.sourceText.includes("@") && /@\w+\.\w+/.test(p.sourceText)) {
      errors.push(`${p.caseId}: email-like source`);
    }
  }
  return { status: errors.length === 0 ? "PASS" : "FAIL", errors };
}
