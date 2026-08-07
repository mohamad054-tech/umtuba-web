/**
 * Deterministic reason codes for UM Core P14 flag evaluation.
 *
 * FLAG EVALUATION IS NOT FLAG REGISTRATION.
 */

export const UmFlagEvaluationCode = {
  UNKNOWN: "flag.evaluation.unknown",
  DEFAULT_ON: "flag.evaluation.default_on",
  DEFAULT_OFF: "flag.evaluation.default_off",
} as const;

export type UmFlagEvaluationCodeName =
  (typeof UmFlagEvaluationCode)[keyof typeof UmFlagEvaluationCode];
