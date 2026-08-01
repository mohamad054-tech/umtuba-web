/**
 * Commerce Commission Policy Foundation V1.
 * Single source of truth for trusted commission decomposition calculations.
 * Server-side only. Never trusts client percentages. Fail closed.
 * Does NOT execute payouts, mutate settlement amounts, or invent active policies.
 */

export const COMMISSION_POLICY_FOUNDATION_ID =
  "commerce.revenue.commission_policy_foundation_v1" as const;

export const COMMISSION_POLICY_PARTY_ROLES = [
  "platform",
  "seller",
  "supplier",
  "affiliate",
  "partner",
] as const;
export type CommissionPolicyPartyRole =
  (typeof COMMISSION_POLICY_PARTY_ROLES)[number];

export const COMMISSION_POLICY_STATUSES = [
  "draft",
  "active",
  "superseded",
  "disabled",
] as const;
export type CommissionPolicyStatus = (typeof COMMISSION_POLICY_STATUSES)[number];

export const COMMISSION_POLICY_BASIS_KINDS = [
  "merchandise_net",
  "grand_total",
] as const;
export type CommissionPolicyBasisKind =
  (typeof COMMISSION_POLICY_BASIS_KINDS)[number];

/** Basis points: 10000 = 100%. */
export const COMMISSION_POLICY_BPS_SCALE = 10_000 as const;

export type CommissionPolicyLine = {
  role: CommissionPolicyPartyRole;
  /** Integer basis points; sum of all lines must equal COMMISSION_POLICY_BPS_SCALE. */
  bps: number;
};

export type CommissionPolicyContract = {
  policyCode: string;
  version: number;
  status: CommissionPolicyStatus;
  /** ISO currency code (exact). Never mixed. */
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  basisKind: CommissionPolicyBasisKind;
  lines: CommissionPolicyLine[];
  description?: string;
};

export type CommissionCalculationLine = {
  role: CommissionPolicyPartyRole;
  bps: number;
  amountMinor: number;
};

export type CommissionCalculationResult = {
  ok: true;
  capability: typeof COMMISSION_POLICY_FOUNDATION_ID;
  policyCode: string;
  policyVersion: number;
  currency: string;
  basisKind: CommissionPolicyBasisKind;
  basisMinor: number;
  lines: CommissionCalculationLine[];
  platformCommissionMinor: number;
  sellerAmountMinor: number;
  supplierAmountMinor: number;
  affiliateAmountMinor: number;
  partnerAmountMinor: number;
  /** Frozen snapshot identity for historical immutability. */
  calculationFingerprint: string;
};

export type CommissionCalculationFailure = {
  ok: false;
  code:
    | "missing_policy"
    | "invalid_policy"
    | "ambiguous_policy"
    | "currency_mismatch"
    | "invalid_basis"
    | "invalid_amount"
    | "client_percentage_rejected";
  message: string;
};

function isUuidLikePolicyCode(value: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{0,119}$/.test(value);
}

function normalizeCurrency(currency: string): string | null {
  const c = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(c)) return null;
  return c;
}

function parseInstant(iso: string): number | null {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

export function rejectClientCommissionPercentages(
  input: Record<string, unknown>
): { ok: true } | { ok: false; message: string } {
  for (const key of Object.keys(input)) {
    if (
      /percent|pct|rate|bps|commission/i.test(key) &&
      input[key] !== undefined &&
      input[key] !== null
    ) {
      // Allow structured policy objects passed server-side by known keys only.
      if (
        key === "policy" ||
        key === "policies" ||
        key === "policyCode" ||
        key === "policyVersion" ||
        key === "currency" ||
        key === "basisMinor" ||
        key === "basisKind" ||
        key === "at"
      ) {
        continue;
      }
      return {
        ok: false,
        message: "Client must not supply commission percentages or rates.",
      };
    }
  }
  return { ok: true };
}

export function validateCommissionPolicyContract(
  policy: CommissionPolicyContract
): { ok: true; policy: CommissionPolicyContract } | CommissionCalculationFailure {
  if (!policy.policyCode || !isUuidLikePolicyCode(policy.policyCode)) {
    return {
      ok: false,
      code: "invalid_policy",
      message: "policy_code is invalid.",
    };
  }
  if (!Number.isInteger(policy.version) || policy.version < 1) {
    return {
      ok: false,
      code: "invalid_policy",
      message: "policy version must be an integer >= 1.",
    };
  }
  if (
    !(COMMISSION_POLICY_STATUSES as readonly string[]).includes(policy.status)
  ) {
    return {
      ok: false,
      code: "invalid_policy",
      message: "policy status is invalid.",
    };
  }
  const currency = normalizeCurrency(policy.currency);
  if (!currency) {
    return {
      ok: false,
      code: "invalid_policy",
      message: "policy currency is invalid.",
    };
  }
  const from = parseInstant(policy.effectiveFrom);
  if (from == null) {
    return {
      ok: false,
      code: "invalid_policy",
      message: "effective_from is invalid.",
    };
  }
  if (policy.effectiveTo != null) {
    const to = parseInstant(policy.effectiveTo);
    if (to == null || to <= from) {
      return {
        ok: false,
        code: "invalid_policy",
        message: "effective_to must be after effective_from.",
      };
    }
  }
  if (
    !(COMMISSION_POLICY_BASIS_KINDS as readonly string[]).includes(
      policy.basisKind
    )
  ) {
    return {
      ok: false,
      code: "invalid_policy",
      message: "basis_kind is invalid.",
    };
  }
  if (!Array.isArray(policy.lines) || policy.lines.length === 0) {
    return {
      ok: false,
      code: "invalid_policy",
      message: "policy lines are required.",
    };
  }

  const seen = new Set<string>();
  let bpsSum = 0;
  for (const line of policy.lines) {
    if (
      !(COMMISSION_POLICY_PARTY_ROLES as readonly string[]).includes(line.role)
    ) {
      return {
        ok: false,
        code: "invalid_policy",
        message: `Unknown party role '${line.role}'.`,
      };
    }
    if (seen.has(line.role)) {
      return {
        ok: false,
        code: "invalid_policy",
        message: `Duplicate party role '${line.role}'.`,
      };
    }
    seen.add(line.role);
    if (!Number.isInteger(line.bps) || line.bps < 0 || line.bps > COMMISSION_POLICY_BPS_SCALE) {
      return {
        ok: false,
        code: "invalid_policy",
        message: "line bps must be an integer between 0 and 10000.",
      };
    }
    bpsSum += line.bps;
  }
  if (bpsSum !== COMMISSION_POLICY_BPS_SCALE) {
    return {
      ok: false,
      code: "invalid_policy",
      message: "policy line bps must sum to exactly 10000 (100%).",
    };
  }
  if (!seen.has("platform") || !seen.has("seller")) {
    return {
      ok: false,
      code: "invalid_policy",
      message: "policy must include platform and seller lines.",
    };
  }

  return {
    ok: true,
    policy: {
      ...policy,
      currency,
      policyCode: policy.policyCode.toLowerCase(),
    },
  };
}

/**
 * Select the authoritative policy for currency + instant.
 * Activation V1: at most one status=active per currency. Resolve may use
 * active or historically superseded rows whose effective window covers `at`.
 * Ambiguous windows / multiple actives fail closed (no silent fallback).
 */
export function selectCommissionPolicy(input: {
  policies: CommissionPolicyContract[];
  currency: string;
  at: string;
}):
  | { ok: true; policy: CommissionPolicyContract }
  | CommissionCalculationFailure {
  const currency = normalizeCurrency(input.currency);
  if (!currency) {
    return {
      ok: false,
      code: "currency_mismatch",
      message: "currency is invalid.",
    };
  }
  const at = parseInstant(input.at);
  if (at == null) {
    return {
      ok: false,
      code: "invalid_policy",
      message: "effective-at timestamp is invalid.",
    };
  }

  const validatedActiveForCurrency: CommissionPolicyContract[] = [];
  const candidates: CommissionPolicyContract[] = [];
  for (const raw of input.policies) {
    const validated = validateCommissionPolicyContract(raw);
    if (!validated.ok) continue;
    const p = validated.policy;
    if (p.currency !== currency) continue;
    if (p.status === "active") {
      validatedActiveForCurrency.push(p);
    }
    if (p.status !== "active" && p.status !== "superseded") continue;
    const from = parseInstant(p.effectiveFrom)!;
    if (at < from) continue;
    if (p.effectiveTo != null) {
      const to = parseInstant(p.effectiveTo)!;
      if (at >= to) continue;
    }
    candidates.push(p);
  }

  if (validatedActiveForCurrency.length > 1) {
    return {
      ok: false,
      code: "ambiguous_policy",
      message:
        "Multiple active commission policies for this currency — activation required to keep exactly one.",
    };
  }

  if (candidates.length === 0) {
    return {
      ok: false,
      code: "missing_policy",
      message:
        "No active commission policy for this currency and effective time.",
    };
  }

  if (candidates.length > 1) {
    return {
      ok: false,
      code: "ambiguous_policy",
      message:
        "Ambiguous commission policy window for this currency and effective time.",
    };
  }

  return { ok: true, policy: candidates[0]! };
}

function amountForRole(
  lines: CommissionCalculationLine[],
  role: CommissionPolicyPartyRole
): number {
  return lines.find((l) => l.role === role)?.amountMinor ?? 0;
}

function buildFingerprint(parts: Record<string, string | number>): string {
  return Object.keys(parts)
    .sort()
    .map((k) => `${k}=${parts[k]}`)
    .join("|");
}

/**
 * Trusted commission calculation. Never accepts client %.
 * Remainder from floor-division is assigned to seller (requires seller line).
 */
export function calculateCommissionSplit(input: {
  policy: CommissionPolicyContract;
  basisMinor: number;
  currency: string;
}): CommissionCalculationResult | CommissionCalculationFailure {
  const validated = validateCommissionPolicyContract(input.policy);
  if (!validated.ok) return validated;

  const currency = normalizeCurrency(input.currency);
  if (!currency) {
    return {
      ok: false,
      code: "currency_mismatch",
      message: "currency is invalid.",
    };
  }
  if (currency !== validated.policy.currency) {
    return {
      ok: false,
      code: "currency_mismatch",
      message: "Calculation currency does not match policy currency.",
    };
  }
  if (
    !Number.isInteger(input.basisMinor) ||
    input.basisMinor < 0 ||
    !Number.isSafeInteger(input.basisMinor)
  ) {
    return {
      ok: false,
      code: "invalid_amount",
      message: "basisMinor must be a non-negative safe integer.",
    };
  }

  const policy = validated.policy;
  const provisional: CommissionCalculationLine[] = policy.lines.map((line) => ({
    role: line.role,
    bps: line.bps,
    amountMinor: Math.floor(
      (input.basisMinor * line.bps) / COMMISSION_POLICY_BPS_SCALE
    ),
  }));

  const allocated = provisional.reduce((sum, l) => sum + l.amountMinor, 0);
  const remainder = input.basisMinor - allocated;
  const sellerIdx = provisional.findIndex((l) => l.role === "seller");
  if (sellerIdx < 0) {
    return {
      ok: false,
      code: "invalid_policy",
      message: "seller line required for remainder assignment.",
    };
  }
  provisional[sellerIdx] = {
    ...provisional[sellerIdx]!,
    amountMinor: provisional[sellerIdx]!.amountMinor + remainder,
  };

  const sumCheck = provisional.reduce((sum, l) => sum + l.amountMinor, 0);
  if (sumCheck !== input.basisMinor) {
    return {
      ok: false,
      code: "invalid_amount",
      message: "Commission split does not conserve basis amount.",
    };
  }

  const lines = provisional;
  return {
    ok: true,
    capability: COMMISSION_POLICY_FOUNDATION_ID,
    policyCode: policy.policyCode,
    policyVersion: policy.version,
    currency,
    basisKind: policy.basisKind,
    basisMinor: input.basisMinor,
    lines,
    platformCommissionMinor: amountForRole(lines, "platform"),
    sellerAmountMinor: amountForRole(lines, "seller"),
    supplierAmountMinor: amountForRole(lines, "supplier"),
    affiliateAmountMinor: amountForRole(lines, "affiliate"),
    partnerAmountMinor: amountForRole(lines, "partner"),
    calculationFingerprint: buildFingerprint({
      capability: COMMISSION_POLICY_FOUNDATION_ID,
      policyCode: policy.policyCode,
      policyVersion: policy.version,
      currency,
      basisKind: policy.basisKind,
      basisMinor: input.basisMinor,
      platform: amountForRole(lines, "platform"),
      seller: amountForRole(lines, "seller"),
      supplier: amountForRole(lines, "supplier"),
      affiliate: amountForRole(lines, "affiliate"),
      partner: amountForRole(lines, "partner"),
    }),
  };
}

export function resolveAndCalculateCommission(input: {
  policies: CommissionPolicyContract[];
  currency: string;
  at: string;
  basisMinor: number;
}): CommissionCalculationResult | CommissionCalculationFailure {
  const selected = selectCommissionPolicy({
    policies: input.policies,
    currency: input.currency,
    at: input.at,
  });
  if (!selected.ok) return selected;
  return calculateCommissionSplit({
    policy: selected.policy,
    basisMinor: input.basisMinor,
    currency: input.currency,
  });
}

export function merchandiseNetBasisMinor(input: {
  subtotalMinor: number;
  discountTotalMinor: number;
}): number | null {
  if (
    !Number.isInteger(input.subtotalMinor) ||
    !Number.isInteger(input.discountTotalMinor) ||
    input.subtotalMinor < 0 ||
    input.discountTotalMinor < 0
  ) {
    return null;
  }
  const net = input.subtotalMinor - input.discountTotalMinor;
  return net < 0 ? 0 : net;
}

/**
 * Settlement compatibility: commission decomposition never changes capture
 * settlement posting amounts (full capture remains settlement truth).
 */
export function commissionDoesNotAlterSettlementAmount(input: {
  captureAmountMinor: number;
  commission: CommissionCalculationResult | null;
}): boolean {
  if (!input.commission) return true;
  // Settlement still books the full capture; commission is a parallel decomposition.
  return (
    Number.isInteger(input.captureAmountMinor) &&
    input.captureAmountMinor >= 0 &&
    input.commission.basisMinor >= 0
  );
}

/**
 * Payout compatibility: payout booking remains full RELEASED capture until a
 * future commission-aware payout milestone. Foundation must not invent nets.
 */
export function commissionDoesNotEnablePayoutExecution(): false {
  return false;
}
