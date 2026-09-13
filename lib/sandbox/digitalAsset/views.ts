import { LEGAL_CLASSIFICATION } from "./constants";
import {
  COMPLIANCE_COPY,
  CONVERSION_UNAVAILABLE_COPY,
  LAB_BANNER,
  LAB_SUBTITLE,
  LEGAL_COPY,
  NO_ACTIONABLE_CONVERT_COPY,
  TREASURY_COPY,
} from "./copy";
import type { DigitalAssetLab } from "./lab";

export type AdminSandboxView = {
  banner: string;
  subtitle: string;
  firewall: ReturnType<DigitalAssetLab["productFirewall"]>;
  token: { name: string; symbol: string; paused: boolean; totalSupply: string };
  treasury: ReturnType<DigitalAssetLab["treasury"]["view"]>;
  treasuryNotice: string;
  roles: { admin: string[]; minter: string[] };
  audit: ReturnType<DigitalAssetLab["audit"]["list"]>;
  legal: string;
};

export type UserSandboxView = {
  banner: string;
  notice: string;
  wallet: ReturnType<DigitalAssetLab["wallet"]["view"]>;
  history: ReturnType<DigitalAssetLab["points"]["list"]>;
  conversions: ReturnType<DigitalAssetLab["conversion"]["listRequests"]>;
  convertActionable: false | true;
  convertLabel: string;
  complianceNotice: string;
  legalClassification: typeof LEGAL_CLASSIFICATION;
};

export function adminSandboxView(lab: DigitalAssetLab): AdminSandboxView {
  return {
    banner: LAB_BANNER,
    subtitle: LAB_SUBTITLE,
    firewall: lab.productFirewall(),
    token: {
      name: lab.token.name,
      symbol: lab.token.symbol,
      paused: lab.token.isPaused(),
      totalSupply: lab.token.totalSupply().toString(),
    },
    treasury: lab.treasury.view(),
    treasuryNotice: TREASURY_COPY,
    roles: {
      admin: lab.access.rolesOf("sandbox-admin"),
      minter: lab.access.rolesOf("sandbox-minter"),
    },
    audit: lab.audit.list(),
    legal: LEGAL_COPY,
  };
}

export function userSandboxView(
  lab: DigitalAssetLab,
  userId: string
): UserSandboxView {
  const wallet = lab.wallet.view(userId);
  const actionable = wallet.conversionActionable;
  return {
    banner: LAB_BANNER,
    notice: wallet.banner,
    wallet,
    history: lab.points.list(userId),
    conversions: lab.conversion.listRequests(userId),
    convertActionable: actionable,
    convertLabel: actionable
      ? "Isolated test convert (NO REAL VALUE)"
      : NO_ACTIONABLE_CONVERT_COPY,
    complianceNotice: COMPLIANCE_COPY,
    legalClassification: LEGAL_CLASSIFICATION,
  };
}

export function productUserPreview(lab: DigitalAssetLab, userId: string): UserSandboxView {
  const view = userSandboxView(lab, userId);
  return {
    ...view,
    convertActionable: false,
    convertLabel: `${CONVERSION_UNAVAILABLE_COPY} ${NO_ACTIONABLE_CONVERT_COPY}`,
    notice: `${LAB_BANNER}. ${CONVERSION_UNAVAILABLE_COPY}`,
  };
}
