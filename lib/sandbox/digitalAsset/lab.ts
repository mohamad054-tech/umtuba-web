import {
  CONVERSION_ENABLED,
  DEPOSITS_ENABLED,
  DEMO_USER_A_ID,
  DEMO_USER_A_POINTS,
  MAINNET_DEPLOYED,
  PRODUCTION_CONNECTED,
  PRODUCTION_ENABLED,
  SANDBOX_ADMIN_ID,
  TRADING_ENABLED,
  WITHDRAWALS_ENABLED,
} from "./constants";
import { LAB_BANNER } from "./copy";
import { LabAuditTrail } from "./audit";
import { LocalChainAdapter } from "./chainAdapter";
import { ConversionEngine } from "./conversionEngine";
import { resetLabIds, toAddress } from "./ids";
import { SyntheticPointsLedger } from "./pointsLedger";
import { LabAccessControl } from "./roles";
import { SandboxErc20 } from "./token";
import { SandboxTreasury } from "./treasury";
import { SandboxWallet } from "./wallet";
import { syntheticCompliance } from "./compliance";
import { reconcileLab } from "./reconciliation";
import type {
  ConvertInput,
  ConvertResult,
  LabFirewall,
  ReconciliationResult,
} from "./types";

export type CreateLabOptions = {
  seedDemoUserA?: boolean;
};

export class DigitalAssetLab {
  readonly audit: LabAuditTrail;
  readonly access: LabAccessControl;
  readonly token: SandboxErc20;
  readonly chain: LocalChainAdapter;
  readonly points: SyntheticPointsLedger;
  readonly conversion: ConversionEngine;
  readonly wallet: SandboxWallet;
  readonly treasury: SandboxTreasury;

  constructor(options: CreateLabOptions = {}) {
    resetLabIds();
    this.audit = new LabAuditTrail();
    this.access = new LabAccessControl(this.audit);
    this.token = new SandboxErc20(this.access, this.audit);
    this.chain = new LocalChainAdapter(this.token);
    this.points = new SyntheticPointsLedger(this.audit);
    this.conversion = new ConversionEngine(
      this.points,
      this.token,
      this.chain,
      this.access,
      this.audit,
      (userId) => toAddress(userId)
    );
    this.wallet = new SandboxWallet(this.points, this.token, this.conversion);
    this.treasury = new SandboxTreasury(this.token);
    this.access.assignUser(DEMO_USER_A_ID);
    this.conversion.setComplianceProfile(syntheticCompliance(DEMO_USER_A_ID));
    if (options.seedDemoUserA !== false) {
      this.points.seed(
        DEMO_USER_A_ID,
        DEMO_USER_A_POINTS,
        "seed:demo-user-a:1000"
      );
    }
    this.audit.record("system", "lab.created", {
      banner: LAB_BANNER,
      conversionEnabled: this.conversion.isConversionEnabled(),
    });
  }

  firewall(): LabFirewall {
    return {
      PRODUCTION_ENABLED,
      CONVERSION_ENABLED: this.conversion.isConversionEnabled(),
      DEPOSITS_ENABLED,
      WITHDRAWALS_ENABLED,
      TRADING_ENABLED,
      MAINNET_DEPLOYED,
      PRODUCTION_CONNECTED,
    };
  }

  productFirewall(): LabFirewall {
    return {
      PRODUCTION_ENABLED: false,
      CONVERSION_ENABLED,
      DEPOSITS_ENABLED: false,
      WITHDRAWALS_ENABLED: false,
      TRADING_ENABLED: false,
      MAINNET_DEPLOYED: false,
      PRODUCTION_CONNECTED: false,
    };
  }

  convert(input: ConvertInput): ConvertResult {
    return this.conversion.convert(input);
  }

  spendAvailable(
    userId: string,
    amount: number,
    dedupeKey: string
  ): boolean {
    return this.points.post({
      userId,
      kind: "spend",
      deltaAvailable: -amount,
      deltaLocked: 0,
      deltaConverted: 0,
      reason: "sandbox.spend",
      dedupeKey,
      requestId: null,
    });
  }

  reconcile(userIds: string[] = [DEMO_USER_A_ID]): ReconciliationResult {
    return reconcileLab({
      userIds,
      points: this.points,
      token: this.token,
      conversion: this.conversion,
      walletAddress: (userId) => this.wallet.addressFor(userId),
    });
  }

  localDeployReceipt(): Record<string, unknown> {
    return {
      network: this.chain.network,
      chainId: this.chain.chainId,
      tokenName: this.token.name,
      tokenSymbol: this.token.symbol,
      mainnet: false,
      productionConnected: false,
      conversionEnabledDefault: CONVERSION_ENABLED,
      admin: SANDBOX_ADMIN_ID,
      banner: LAB_BANNER,
    };
  }
}

export function createDigitalAssetLab(
  options: CreateLabOptions = {}
): DigitalAssetLab {
  return new DigitalAssetLab(options);
}
