/**
 * Compliance engine foundation (UM Core P3).
 *
 * Pure, deterministic, side-effect free assessment against
 * UM_CORE_SPECIFICATION_V1 / UM_CORE_ENGINEERING_STANDARDS_V1.
 *
 * No registry, persistence, networking, event bus, or product wiring.
 */

import type { UmPlatformManifest } from "../manifest/types";
import type { UmMaturityLevel } from "../maturity/types";
import type { UmSideEffectClass } from "../identity/types";
import {
  validateManifestAdmission,
  validatePlatformManifest,
} from "../validation/interfaces";
import type { UmValidationFinding, UmValidationResult } from "../validation/interfaces";
import { UmComplianceCode } from "./codes";
import type {
  UmCertificationAssessment,
  UmCertificationKind,
  UmComplianceAssessmentInput,
  UmComplianceEngine,
  UmComplianceEvidenceGap,
  UmComplianceFinding,
  UmComplianceRecommendation,
  UmComplianceResult,
  UmComplianceSeverity,
  UmComplianceStatus,
  UmComplianceWaiver,
} from "./types";

const SEVERITY_RANK: Record<UmComplianceSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const CERT_ORDER: readonly UmCertificationKind[] = [
  "core_certified",
  "production_certified",
  "enterprise_certified",
  "long_term_supported",
] as const;

const ELEVATED: ReadonlySet<UmSideEffectClass> = new Set([
  "money",
  "ai",
  "admin",
]);

const CRITICAL_PENALTY = 20;
const WARNING_PENALTY = 5;
const EVIDENCE_PENALTY = 10;

function finding(
  code: string,
  severity: UmComplianceSeverity,
  message: string,
  path: string | undefined,
  standardRef: string,
): UmComplianceFinding {
  return { code, severity, message, path, standardRef };
}

function compareFindings(a: UmComplianceFinding, b: UmComplianceFinding): number {
  const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (sev !== 0) return sev;
  const code = a.code.localeCompare(b.code);
  if (code !== 0) return code;
  return (a.path ?? "").localeCompare(b.path ?? "");
}

function compareEvidence(
  a: UmComplianceEvidenceGap,
  b: UmComplianceEvidenceGap,
): number {
  const c = a.code.localeCompare(b.code);
  if (c !== 0) return c;
  return (a.path ?? "").localeCompare(b.path ?? "");
}

function isNonEmpty(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidMaturity(level: unknown): level is UmMaturityLevel {
  return level === 0 || level === 1 || level === 2 || level === 3 || level === 4;
}

function mapValidationSeverity(
  severity: UmValidationFinding["severity"],
): UmComplianceSeverity {
  if (severity === "error") return "critical";
  if (severity === "warning") return "warning";
  return "info";
}

function collectUpstreamFindings(
  validation: UmValidationResult,
  admission: UmValidationResult,
): UmComplianceFinding[] {
  const out: UmComplianceFinding[] = [];
  for (const f of validation.findings) {
    if (f.severity !== "error" && f.severity !== "warning") continue;
    out.push(
      finding(
        UmComplianceCode.VALIDATION_UPSTREAM_ERROR,
        mapValidationSeverity(f.severity),
        `Manifest validation: ${f.message}`,
        f.path ?? "manifest",
        f.standardRef ?? "Standards §3 / Spec §7",
      ),
    );
  }
  // Admission results embed base manifest findings — only map admission.* codes.
  for (const f of admission.findings) {
    if (f.severity !== "error") continue;
    if (!f.code.startsWith("admission.")) continue;
    out.push(
      finding(
        UmComplianceCode.ADMISSION_UPSTREAM_ERROR,
        "critical",
        `Admission validation: ${f.message}`,
        f.path ?? "admission",
        f.standardRef ?? "Standards §15 / §24",
      ),
    );
  }
  return out;
}

function evaluateOwnership(
  manifest: UmPlatformManifest,
): { findings: UmComplianceFinding[]; gaps: UmComplianceEvidenceGap[] } {
  const findings: UmComplianceFinding[] = [];
  const gaps: UmComplianceEvidenceGap[] = [];

  if (!manifest.owners || manifest.owners.length === 0) {
    findings.push(
      finding(
        UmComplianceCode.OWNERSHIP_MISSING,
        "critical",
        "Compliance requires at least one accountable owner.",
        "owners",
        "Standards §3.4 / §25",
      ),
    );
    gaps.push({
      code: UmComplianceCode.OWNERSHIP_MISSING,
      message: "Owner declaration evidence is missing.",
      path: "owners",
      standardRef: "Standards §3.4 / §25",
      requiredFor: [...CERT_ORDER],
    });
  }

  if (!isNonEmpty(manifest.soTStatement)) {
    findings.push(
      finding(
        UmComplianceCode.SOT_MISSING,
        "critical",
        "Source-of-truth statement is required for compliance.",
        "soTStatement",
        "Standards §3.4 / §25",
      ),
    );
    gaps.push({
      code: UmComplianceCode.SOT_MISSING,
      message: "SoT statement evidence is missing.",
      path: "soTStatement",
      standardRef: "Standards §3.4 / §25",
      requiredFor: [...CERT_ORDER],
    });
  }

  if (!isNonEmpty(manifest.nonOwnershipStatement)) {
    findings.push(
      finding(
        UmComplianceCode.NON_OWNERSHIP_MISSING,
        "critical",
        "Non-ownership statement is required for compliance.",
        "nonOwnershipStatement",
        "Standards §3.4 / §25",
      ),
    );
    gaps.push({
      code: UmComplianceCode.NON_OWNERSHIP_MISSING,
      message: "Non-ownership statement evidence is missing.",
      path: "nonOwnershipStatement",
      standardRef: "Standards §3.4 / §25",
      requiredFor: ["enterprise_certified", "long_term_supported"],
    });
  }

  return { findings, gaps };
}

function evaluateEvidence(
  manifest: UmPlatformManifest,
  extraEvidence: readonly string[],
): { findings: UmComplianceFinding[]; gaps: UmComplianceEvidenceGap[] } {
  const findings: UmComplianceFinding[] = [];
  const gaps: UmComplianceEvidenceGap[] = [];
  const docs = manifest.documentationRefs ?? [];
  const bundle = [...docs, ...extraEvidence].filter(isNonEmpty);

  if (docs.length === 0) {
    findings.push(
      finding(
        UmComplianceCode.DOCUMENTATION_MISSING,
        "critical",
        "At least one documentation reference is required.",
        "documentationRefs",
        "Standards §3.4 / §25",
      ),
    );
    gaps.push({
      code: UmComplianceCode.DOCUMENTATION_MISSING,
      message: "Documentation evidence is missing.",
      path: "documentationRefs",
      standardRef: "Standards §3.4 / §25",
      requiredFor: [...CERT_ORDER],
    });
  } else if (bundle.length < 2) {
    findings.push(
      finding(
        UmComplianceCode.EVIDENCE_BUNDLE_THIN,
        "warning",
        "Evidence bundle is thin; enterprise/LTS expect multiple evidence refs.",
        "documentationRefs",
        "Standards §25 / §26",
      ),
    );
    gaps.push({
      code: UmComplianceCode.EVIDENCE_BUNDLE_THIN,
      message: "Additional evidence refs recommended for higher certifications.",
      path: "documentationRefs",
      standardRef: "Standards §25 / §26",
      requiredFor: ["enterprise_certified", "long_term_supported"],
    });
  }

  if (!manifest.health?.reportsStatus) {
    findings.push(
      finding(
        UmComplianceCode.HEALTH_REPORTING_REQUIRED,
        "warning",
        "Health status reporting is required for production certification.",
        "health.reportsStatus",
        "Standards §18 / §26",
      ),
    );
    gaps.push({
      code: UmComplianceCode.HEALTH_REPORTING_REQUIRED,
      message: "Health reporting declaration missing or false.",
      path: "health.reportsStatus",
      standardRef: "Standards §18 / §26",
      requiredFor: [
        "production_certified",
        "enterprise_certified",
        "long_term_supported",
      ],
    });
  } else if (!isNonEmpty(manifest.health.probeRef)) {
    findings.push(
      finding(
        UmComplianceCode.HEALTH_PROBE_EVIDENCE_MISSING,
        "warning",
        "Health reports status but probe evidence reference is missing.",
        "health.probeRef",
        "Standards §18 / §25",
      ),
    );
    gaps.push({
      code: UmComplianceCode.HEALTH_PROBE_EVIDENCE_MISSING,
      message: "Health probe evidence reference is missing.",
      path: "health.probeRef",
      standardRef: "Standards §18 / §25",
      requiredFor: ["enterprise_certified", "long_term_supported"],
    });
  }

  return { findings, gaps };
}

function evaluateFlagsAndCapabilities(
  manifest: UmPlatformManifest,
): UmComplianceFinding[] {
  const findings: UmComplianceFinding[] = [];
  const flagById = new Map(manifest.flags.map((f) => [f.flagId, f]));

  for (let i = 0; i < manifest.capabilities.length; i += 1) {
    const cap = manifest.capabilities[i]!;
    const elevated = cap.sideEffectClasses.some((s) => ELEVATED.has(s));
    if (!elevated) continue;
    if (!cap.flagId || !flagById.has(cap.flagId)) {
      findings.push(
        finding(
          UmComplianceCode.ELEVATED_FLAG_REQUIRED,
          "critical",
          `Elevated capability ${cap.capabilityId} requires a declared flag.`,
          `capabilities[${i}].flagId`,
          "Standards §4 / §26",
        ),
      );
      continue;
    }
    const flag = flagById.get(cap.flagId)!;
    if (flag.defaultState === "on") {
      findings.push(
        finding(
          UmComplianceCode.ELEVATED_FLAG_DEFAULT_ON,
          "critical",
          `Elevated flag ${flag.flagId} must default off for certification.`,
          `flags[${manifest.flags.indexOf(flag)}].defaultState`,
          "Standards §16 / §26",
        ),
      );
    }
  }

  for (const flag of manifest.flags) {
    if (flag.dangerElevated && flag.defaultState === "on") {
      const already = findings.some(
        (f) =>
          f.code === UmComplianceCode.ELEVATED_FLAG_DEFAULT_ON &&
          f.message.includes(flag.flagId),
      );
      if (!already) {
        findings.push(
          finding(
            UmComplianceCode.ELEVATED_FLAG_DEFAULT_ON,
            "critical",
            `Elevated flag ${flag.flagId} must default off for certification.`,
            "flags",
            "Standards §16 / §26",
          ),
        );
      }
    }
  }

  return findings;
}

function evaluateMaturity(
  manifest: UmPlatformManifest,
): { ok: boolean; findings: UmComplianceFinding[] } {
  const findings: UmComplianceFinding[] = [];
  if (!isValidMaturity(manifest.maturityLevel)) {
    findings.push(
      finding(
        UmComplianceCode.MATURITY_LEVEL_INVALID,
        "critical",
        "Maturity level must be an integer in 0–4.",
        "maturityLevel",
        "Standards §24",
      ),
    );
    return { ok: false, findings };
  }

  if (manifest.maturityLevel === 0) {
    findings.push(
      finding(
        UmComplianceCode.MATURITY_PROTOTYPE_NOT_CERTIFIABLE,
        "warning",
        "Maturity 0 (Prototype) is not certifiable as a Core citizen.",
        "maturityLevel",
        "Standards §24 / §26",
      ),
    );
  }

  const experimentalCaps = manifest.capabilities.filter(
    (c) => c.stability === "experimental",
  );
  const experimentalEvents = manifest.providesEvents.filter(
    (e) => e.stability === "experimental",
  );
  if (
    manifest.maturityLevel >= 4 &&
    (experimentalCaps.length > 0 || experimentalEvents.length > 0)
  ) {
    findings.push(
      finding(
        UmComplianceCode.MATURITY_EXPERIMENTAL_SURFACE,
        "critical",
        "Ecosystem-critical maturity forbids experimental capabilities/events.",
        "maturityLevel",
        "Standards §24 / §26",
      ),
    );
  }

  if (manifest.maturityLevel >= 3 && !manifest.health?.reportsStatus) {
    findings.push(
      finding(
        UmComplianceCode.MATURITY_PRODUCTION_REQUIRED,
        "critical",
        "Production-exposed maturity requires health status reporting.",
        "health.reportsStatus",
        "Standards §18 / §24",
      ),
    );
  }

  const ok = findings.every((f) => f.severity !== "critical");
  return { ok, findings };
}

function activeWaivers(
  waivers: readonly UmComplianceWaiver[],
  assessedAt: string | undefined,
): {
  active: UmComplianceWaiver[];
  suppressed: Set<string>;
  findings: UmComplianceFinding[];
} {
  const findings: UmComplianceFinding[] = [];
  const active: UmComplianceWaiver[] = [];
  const suppressed = new Set<string>();

  for (let i = 0; i < waivers.length; i += 1) {
    const w = waivers[i]!;
    const complete =
      isNonEmpty(w.waiverId) &&
      isNonEmpty(w.reason) &&
      isNonEmpty(w.ownerRef) &&
      isNonEmpty(w.expiresAt) &&
      isNonEmpty(w.riskClass) &&
      isNonEmpty(w.compensatingControls);

    if (!complete) {
      findings.push(
        finding(
          UmComplianceCode.WAIVER_INCOMPLETE,
          "warning",
          `Waiver at index ${i} is incomplete and ignored.`,
          `waivers[${i}]`,
          "Standards §25",
        ),
      );
      continue;
    }

    if (assessedAt && w.expiresAt < assessedAt) {
      findings.push(
        finding(
          UmComplianceCode.WAIVER_EXPIRED,
          "warning",
          `Waiver ${w.waiverId} expired before assessment and is ignored.`,
          `waivers[${i}].expiresAt`,
          "Standards §25",
        ),
      );
      continue;
    }

    active.push(w);
    for (const code of w.suppressesCodes ?? []) {
      if (isNonEmpty(code)) suppressed.add(code);
    }
  }

  return { active, suppressed, findings };
}

function applyWaivers(
  findings: readonly UmComplianceFinding[],
  suppressed: ReadonlySet<string>,
): {
  active: UmComplianceFinding[];
  waivedCodes: string[];
  info: UmComplianceFinding[];
} {
  const active: UmComplianceFinding[] = [];
  const waivedCodes: string[] = [];
  const info: UmComplianceFinding[] = [];

  for (const f of findings) {
    if (suppressed.has(f.code)) {
      waivedCodes.push(f.code);
      info.push(
        finding(
          UmComplianceCode.WAIVER_APPLIED,
          "info",
          `Finding ${f.code} suppressed by active waiver.`,
          f.path,
          "Standards §25",
        ),
      );
      continue;
    }
    active.push(f);
  }

  waivedCodes.sort((a, b) => a.localeCompare(b));
  return { active, waivedCodes: uniqueSorted(waivedCodes), info };
}

function uniqueSorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function scoreFrom(
  findings: readonly UmComplianceFinding[],
  gaps: readonly UmComplianceEvidenceGap[],
): number {
  let score = 100;
  for (const f of findings) {
    if (f.severity === "critical") score -= CRITICAL_PENALTY;
    else if (f.severity === "warning") score -= WARNING_PENALTY;
  }
  // Penalize evidence gaps that are not already represented as findings codes.
  const findingCodes = new Set(findings.map((f) => f.code));
  for (const g of gaps) {
    if (!findingCodes.has(g.code)) score -= EVIDENCE_PENALTY;
  }
  if (score < 0) return 0;
  if (score > 100) return 100;
  return score;
}

function statusFrom(
  score: number,
  criticalCount: number,
): UmComplianceStatus {
  if (criticalCount === 0 && score >= 90) return "compliant";
  if (criticalCount === 0 && score >= 70) return "partially_compliant";
  if (criticalCount > 0) return "non_compliant";
  if (score >= 50) return "partially_compliant";
  return "non_compliant";
}

function assessCertification(
  kind: UmCertificationKind,
  manifest: UmPlatformManifest,
  activeFindings: readonly UmComplianceFinding[],
  gaps: readonly UmComplianceEvidenceGap[],
  evidenceRefs: readonly string[],
): UmCertificationAssessment {
  const blocking: string[] = [];
  const criticalCodes = new Set(
    activeFindings.filter((f) => f.severity === "critical").map((f) => f.code),
  );

  const requireAbsent = (code: string) => {
    if (criticalCodes.has(code)) blocking.push(code);
  };

  // Shared baseline for all certifications.
  requireAbsent(UmComplianceCode.VALIDATION_UPSTREAM_ERROR);
  requireAbsent(UmComplianceCode.ADMISSION_UPSTREAM_ERROR);
  requireAbsent(UmComplianceCode.OWNERSHIP_MISSING);
  requireAbsent(UmComplianceCode.SOT_MISSING);
  requireAbsent(UmComplianceCode.DOCUMENTATION_MISSING);
  requireAbsent(UmComplianceCode.MATURITY_LEVEL_INVALID);

  if (manifest.maturityLevel < 1) {
    blocking.push(UmComplianceCode.MATURITY_PROTOTYPE_NOT_CERTIFIABLE);
  }

  if (kind !== "core_certified") {
    requireAbsent(UmComplianceCode.ELEVATED_FLAG_REQUIRED);
    requireAbsent(UmComplianceCode.ELEVATED_FLAG_DEFAULT_ON);
    if (manifest.maturityLevel < 3) {
      blocking.push(UmComplianceCode.MATURITY_PRODUCTION_REQUIRED);
    }
    if (!manifest.health?.reportsStatus) {
      blocking.push(UmComplianceCode.HEALTH_REPORTING_REQUIRED);
    }
  }

  if (kind === "enterprise_certified" || kind === "long_term_supported") {
    requireAbsent(UmComplianceCode.NON_OWNERSHIP_MISSING);
    if (gaps.some((g) => g.code === UmComplianceCode.EVIDENCE_BUNDLE_THIN)) {
      blocking.push(UmComplianceCode.EVIDENCE_BUNDLE_THIN);
    }
    if (
      gaps.some((g) => g.code === UmComplianceCode.HEALTH_PROBE_EVIDENCE_MISSING)
    ) {
      blocking.push(UmComplianceCode.HEALTH_PROBE_EVIDENCE_MISSING);
    }
  }

  if (kind === "long_term_supported") {
    if (manifest.maturityLevel < 4) {
      blocking.push(UmComplianceCode.MATURITY_ECOSYSTEM_REQUIRED);
    }
    requireAbsent(UmComplianceCode.MATURITY_EXPERIMENTAL_SURFACE);
    const hasExperimental =
      manifest.capabilities.some((c) => c.stability === "experimental") ||
      manifest.providesEvents.some((e) => e.stability === "experimental");
    if (hasExperimental) {
      blocking.push(UmComplianceCode.MATURITY_EXPERIMENTAL_SURFACE);
    }
  }

  const blockingCodes = uniqueSorted(blocking);
  const eligible = blockingCodes.length === 0;
  const eligibility = eligible ? "eligible" : "blocked";

  const summaries: Record<UmCertificationKind, string> = {
    core_certified: eligible
      ? "Eligible for Core Certified."
      : "Blocked from Core Certified.",
    production_certified: eligible
      ? "Eligible for Production Certified."
      : "Blocked from Production Certified.",
    enterprise_certified: eligible
      ? "Eligible for Enterprise Certified."
      : "Blocked from Enterprise Certified.",
    long_term_supported: eligible
      ? "Eligible for Long-Term Supported."
      : "Blocked from Long-Term Supported.",
  };

  return {
    kind,
    eligibility,
    eligible,
    blockingCodes,
    evidenceRefs,
    summary: summaries[kind],
  };
}

function buildRecommendation(
  status: UmComplianceStatus,
  critical: readonly UmComplianceFinding[],
  warnings: readonly UmComplianceFinding[],
  gaps: readonly UmComplianceEvidenceGap[],
  maturityLevel: UmMaturityLevel,
  certs: readonly UmCertificationAssessment[],
): UmComplianceRecommendation {
  if (critical.length > 0) {
    return {
      code: "remediate_critical",
      summary: "Remediate critical compliance violations before certification.",
      nextActions: uniqueSorted(critical.map((f) => f.code)).slice(0, 8),
    };
  }
  if (gaps.length > 0 && status !== "compliant") {
    return {
      code: "gather_evidence",
      summary: "Gather missing required evidence for higher certification tiers.",
      nextActions: uniqueSorted(gaps.map((g) => g.code)).slice(0, 8),
    };
  }
  if (warnings.length > 0) {
    return {
      code: "remediate_warnings",
      summary: "Address compliance warnings to improve score and readiness.",
      nextActions: uniqueSorted(warnings.map((f) => f.code)).slice(0, 8),
    };
  }
  const highestEligible = [...certs].reverse().find((c) => c.eligible);
  if (!highestEligible || highestEligible.kind === "core_certified") {
    if (maturityLevel < 3) {
      return {
        code: "raise_maturity",
        summary:
          "Core baseline is sound; raise maturity and production evidence for higher certs.",
        nextActions: [
          UmComplianceCode.MATURITY_PRODUCTION_REQUIRED,
          UmComplianceCode.HEALTH_REPORTING_REQUIRED,
        ],
      };
    }
  }
  if (status === "compliant" && certs.every((c) => c.eligible)) {
    return {
      code: "maintain",
      summary: "Maintain compliance posture; all certification tiers eligible.",
      nextActions: [],
    };
  }
  if (status === "compliant") {
    return {
      code: "maintain",
      summary: "Maintain compliance; pursue next eligible certification tier.",
      nextActions: certs.filter((c) => !c.eligible).map((c) => c.kind),
    };
  }
  return {
    code: "not_ready",
    summary: "Platform is not ready for Core certification.",
    nextActions: ["review_manifest", "re_run_validation"],
  };
}

/**
 * Assess platform compliance purely and deterministically.
 */
export function assessPlatformCompliance(
  input: UmComplianceAssessmentInput,
): UmComplianceResult {
  const { manifest } = input;
  const validation =
    input.validation ?? validatePlatformManifest(manifest);
  const admission =
    input.admission ?? validateManifestAdmission(manifest);
  const extraEvidence = input.metadata?.evidenceRefs ?? [];

  const rawFindings: UmComplianceFinding[] = [];
  rawFindings.push(...collectUpstreamFindings(validation, admission));

  const ownership = evaluateOwnership(manifest);
  rawFindings.push(...ownership.findings);

  const evidence = evaluateEvidence(manifest, extraEvidence);
  rawFindings.push(...evidence.findings);

  rawFindings.push(...evaluateFlagsAndCapabilities(manifest));

  const maturity = evaluateMaturity(manifest);
  rawFindings.push(...maturity.findings);

  const waiverEval = activeWaivers(input.waivers ?? [], input.assessedAt);
  rawFindings.push(...waiverEval.findings);

  const waived = applyWaivers(rawFindings, waiverEval.suppressed);
  const activeFindings = [...waived.active].sort(compareFindings);
  const infoFindings = [...waived.info].sort(compareFindings);

  const gaps = [...ownership.gaps, ...evidence.gaps].sort(compareEvidence);

  const criticalViolations = activeFindings.filter((f) => f.severity === "critical");
  const warnings = activeFindings.filter((f) => f.severity === "warning");
  const information = [
    ...activeFindings.filter((f) => f.severity === "info"),
    ...infoFindings,
  ].sort(compareFindings);

  const score = scoreFrom(activeFindings, gaps);
  const status = statusFrom(score, criticalViolations.length);

  const evidenceRefs = uniqueSorted([
    ...(manifest.documentationRefs ?? []),
    ...extraEvidence,
  ]);

  const certificationStatus = CERT_ORDER.map((kind) =>
    assessCertification(kind, manifest, activeFindings, gaps, evidenceRefs),
  );

  // Attach certification block summaries as info when blocked (machine + human).
  const certInfos: UmComplianceFinding[] = [];
  for (const cert of certificationStatus) {
    if (cert.eligible) continue;
    const code =
      cert.kind === "core_certified"
        ? UmComplianceCode.CERT_CORE_BLOCKED
        : cert.kind === "production_certified"
          ? UmComplianceCode.CERT_PRODUCTION_BLOCKED
          : cert.kind === "enterprise_certified"
            ? UmComplianceCode.CERT_ENTERPRISE_BLOCKED
            : UmComplianceCode.CERT_LTS_BLOCKED;
    certInfos.push(
      finding(
        code,
        "info",
        `${cert.summary} Blocking: ${cert.blockingCodes.join(", ") || "none"}.`,
        "certification",
        "Standards §26",
      ),
    );
  }

  const allFindings = [...activeFindings, ...information, ...certInfos].sort(
    compareFindings,
  );

  const failedStandards = uniqueSorted(
    allFindings
      .filter((f) => f.severity === "critical" || f.severity === "warning")
      .map((f) => f.standardRef)
      .filter((s): s is string => typeof s === "string" && s.length > 0),
  );

  const recommendation = buildRecommendation(
    status,
    criticalViolations,
    warnings,
    gaps,
    isValidMaturity(manifest.maturityLevel) ? manifest.maturityLevel : 0,
    certificationStatus,
  );

  const result: UmComplianceResult = {
    platformId: manifest.platformId,
    status,
    score,
    maturityLevel: isValidMaturity(manifest.maturityLevel)
      ? manifest.maturityLevel
      : 0,
    maturityOk: maturity.ok,
    certificationStatus,
    criticalViolations,
    warnings,
    information: [...information, ...certInfos].sort(compareFindings),
    missingRequiredEvidence: gaps,
    failedStandards,
    waivers: waiverEval.active,
    waivedFindingCodes: waived.waivedCodes,
    recommendation,
    findings: allFindings,
  };

  if (input.assessedAt !== undefined) {
    return { ...result, assessedAt: input.assessedAt };
  }
  return result;
}

export function createComplianceEngine(): UmComplianceEngine {
  return {
    assess(input: UmComplianceAssessmentInput): UmComplianceResult {
      return assessPlatformCompliance(input);
    },
  };
}
