/**
 * Registration admission validation (UM Core P2).
 *
 * Ensures a manifest is legal to become a Registered (maturity ≥ 1) citizen.
 * Does not perform runtime registration or persistence.
 */

import type { UmPlatformManifest } from "../manifest/types";
import { UmManifestValidationCode } from "./codes";
import type {
  UmRegistrationValidator,
  UmValidationFinding,
  UmValidationResult,
} from "./interfaces";
import { validatePlatformManifest } from "./manifestValidator";

const SEVERITY_RANK = { error: 0, warning: 1, info: 2 } as const;

function compareFindings(a: UmValidationFinding, b: UmValidationFinding): number {
  const sev = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
  if (sev !== 0) return sev;
  const code = a.code.localeCompare(b.code);
  if (code !== 0) return code;
  return (a.path ?? "").localeCompare(b.path ?? "");
}

/**
 * Admission validation on top of manifest validation.
 * Maturity level 0 (prototype) is not admissible as a dependency target.
 */
export function validateManifestAdmission(
  manifest: UmPlatformManifest,
): UmValidationResult {
  const base = validatePlatformManifest(manifest);
  const findings: UmValidationFinding[] = [...base.findings];

  if (!base.ok) {
    findings.push({
      code: UmManifestValidationCode.ADMISSION_MANIFEST_INVALID,
      severity: "error",
      message:
        "Admission denied because the manifest failed validation (see prior findings).",
      path: "$",
      standardRef: "Standards §15 / §24",
    });
  }

  if (manifest.maturityLevel === 0) {
    findings.push({
      code: UmManifestValidationCode.ADMISSION_MATURITY_TOO_LOW,
      severity: "error",
      message:
        "Admission requires maturityLevel ≥ 1 (Registered). Level 0 is Prototype only.",
      path: "maturityLevel",
      standardRef: "Standards §15.3 / §24",
    });
  }

  const sorted = [...findings].sort(compareFindings);
  return {
    ok: sorted.every((f) => f.severity !== "error"),
    findings: sorted,
  };
}

export function createRegistrationValidator(): UmRegistrationValidator {
  return {
    validateAdmission(manifest: UmPlatformManifest): UmValidationResult {
      return validateManifestAdmission(manifest);
    },
  };
}
