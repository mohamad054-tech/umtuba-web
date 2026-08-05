import type { PrivacyFinding, PrivacyReport } from "./types";

const PATTERNS: Array<{
  kind: PrivacyFinding["kind"];
  severity: PrivacyFinding["severity"];
  re: RegExp;
  detail: string;
}> = [
  {
    kind: "api_keys",
    severity: "blocking",
    re: /\b(sk-|api[_-]?key|AIza)[A-Za-z0-9_-]{8,}\b/i,
    detail: "Possible API key pattern.",
  },
  {
    kind: "passwords",
    severity: "blocking",
    re: /\b(password|passwd)\s*[:=]\s*\S+/i,
    detail: "Possible password assignment.",
  },
  {
    kind: "secrets",
    severity: "blocking",
    re: /\b(secret|token|bearer)\s*[:=]\s*\S+/i,
    detail: "Possible secret/token material.",
  },
  {
    kind: "financial_information",
    severity: "warning",
    re: /\b(?:\d[ -]*?){13,19}\b/,
    detail: "Possible card-number-like digit sequence.",
  },
  {
    kind: "medical_information",
    severity: "warning",
    re: /\b(diagnosis|patient|prescription|medical record)\b/i,
    detail: "Possible medical terminology.",
  },
  {
    kind: "children_data",
    severity: "blocking",
    re: /\b(child|minor|under\s*1[0-7]|age\s*[:=]?\s*1[0-7])\b/i,
    detail: "Possible children-related data.",
  },
  {
    kind: "personal_information",
    severity: "warning",
    re: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    detail: "Possible email address.",
  },
  {
    kind: "restricted_information",
    severity: "blocking",
    re: /\b(classified|top secret|do not distribute)\b/i,
    detail: "Explicit restricted marking.",
  },
];

/**
 * Contractual privacy detection heuristics for acquisition governance.
 * Not a complete DLP system.
 */
export function detectPrivacyFindings(text: string): PrivacyReport {
  const findings: PrivacyFinding[] = [];
  for (const p of PATTERNS) {
    const match = text.match(p.re);
    if (match) {
      findings.push({
        kind: p.kind,
        severity: p.severity,
        detail: p.detail,
        matchedFragment: match[0]?.slice(0, 48) ?? null,
      });
    }
  }
  return {
    findings,
    blocking: findings.some((f) => f.severity === "blocking"),
    notes: "Heuristic privacy contracts — human review still required.",
  };
}
