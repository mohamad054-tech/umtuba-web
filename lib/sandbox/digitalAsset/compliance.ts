import { LEGAL_CLASSIFICATION } from "./constants";
import { COMPLIANCE_COPY, LEGAL_COPY } from "./copy";
import type { SyntheticComplianceState } from "./types";

export type SyntheticComplianceProfile = {
  userId: string;
  kyc: SyntheticComplianceState;
  aml: SyntheticComplianceState;
  sanctions: SyntheticComplianceState;
  region: "UNDECIDED";
  ageGate: SyntheticComplianceState;
  legalClassification: typeof LEGAL_CLASSIFICATION;
  notice: string;
};

export function syntheticCompliance(
  userId: string,
  overrides: Partial<
    Pick<SyntheticComplianceProfile, "kyc" | "aml" | "sanctions" | "ageGate">
  > = {}
): SyntheticComplianceProfile {
  return {
    userId,
    kyc: overrides.kyc ?? "NOT_COLLECTED",
    aml: overrides.aml ?? "NOT_COLLECTED",
    sanctions: overrides.sanctions ?? "NOT_COLLECTED",
    region: "UNDECIDED",
    ageGate: overrides.ageGate ?? "NOT_COLLECTED",
    legalClassification: LEGAL_CLASSIFICATION,
    notice: `${COMPLIANCE_COPY} ${LEGAL_COPY}`,
  };
}

export function isComplianceHold(
  profile: SyntheticComplianceProfile
): boolean {
  return (
    profile.kyc === "SYNTHETIC_HOLD" ||
    profile.aml === "SYNTHETIC_HOLD" ||
    profile.sanctions === "SYNTHETIC_HOLD" ||
    profile.ageGate === "SYNTHETIC_HOLD" ||
    profile.kyc === "SYNTHETIC_DENIED" ||
    profile.aml === "SYNTHETIC_DENIED" ||
    profile.sanctions === "SYNTHETIC_DENIED" ||
    profile.ageGate === "SYNTHETIC_DENIED"
  );
}
