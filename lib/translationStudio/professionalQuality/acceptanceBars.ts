/**
 * Acceptance bars + structured reliability thresholds for live provider selection.
 * No winner declaration without real benchmark evidence.
 */

export const STRUCTURED_RELIABILITY_THRESHOLDS = {
  /** Ideal malformed/invalid structured rate */
  targetMalformedRate: 0,
  /** Disqualify if malformed rate exceeds this on smoke or full run */
  maxMalformedRate: 0.02,
} as const;

export const ARABIC_ACCEPTANCE_BAR = {
  minSemanticScore: 88,
  minFluencyNaturalness: 85,
  requireZeroPlaceholderBlockers: true,
  requireGlossaryCompliance: true,
  rejectUnnaturalCalquePass: true,
  sensitiveMustHumanGate: true,
  notes: [
    "Natural MSA required",
    "Anti-calque",
    "Concise UI wording",
    "Protected glossary/brand handling",
    "High automated score with unnatural Arabic must not win",
  ],
} as const;

export const MULTILINGUAL_ACCEPTANCE_FLOOR = {
  fr: { minOverall: 80, minSemantic: 85 },
  es: { minOverall: 80, minSemantic: 85 },
  de: { minOverall: 80, minSemantic: 85 },
  pt: { minOverall: 80, minSemantic: 85 },
  notes: [
    "Do not choose provider solely on Arabic if it fails other locales",
    "Per-locale routing may be justified later by evidence",
  ],
} as const;

export const LIVE_FAILURE_RETRY_POLICY = {
  generationTimeoutMsDefault: 20_000,
  reviewTimeoutMsDefault: 20_000,
  maxRetries: 1,
  retryOnlyWhenTransportSafe: true,
  invalidStructuredCountsAsFailure: true,
  noInfiniteRetries: true,
  noSilentHeuristicReplacementDuringLiveBenchmark: true,
} as const;
