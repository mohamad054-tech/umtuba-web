import {
  SANDBOX_IDENTITY_MAPPING,
  TOKEN_DECIMALS,
} from "./constants";
import type { ConversionEngine } from "./conversionEngine";
import { pointsToTokenUnits } from "./ids";
import type { SyntheticPointsLedger } from "./pointsLedger";
import type { SandboxErc20 } from "./token";
import type { ReconciliationResult } from "./types";

export function reconcileLab(input: {
  userIds: string[];
  points: SyntheticPointsLedger;
  token: SandboxErc20;
  conversion: ConversionEngine;
  walletAddress: (userId: string) => string;
}): ReconciliationResult {
  const issues: string[] = [];
  const conversions = input.conversion.listRequests();

  for (const userId of input.userIds) {
    const balance = input.points.getBalance(userId);
    const conserved =
      balance.available +
      balance.locked +
      balance.converted +
      balance.spent;
    if (conserved !== balance.earned) {
      issues.push(
        `${userId}: conservation failed earned=${balance.earned} conserved=${conserved}`
      );
    }
    if (balance.available < 0 || balance.locked < 0) {
      issues.push(`${userId}: negative points bucket`);
    }

    const expectedTokens = pointsToTokenUnits(
      balance.converted,
      TOKEN_DECIMALS,
      SANDBOX_IDENTITY_MAPPING
    );
    const actualTokens = input.token.balanceOf(input.walletAddress(userId));
    if (actualTokens !== expectedTokens) {
      issues.push(
        `${userId}: token/points split expected=${expectedTokens.toString()} actual=${actualTokens.toString()}`
      );
    }

    if (balance.converted > 0 && balance.available + balance.locked < 0) {
      issues.push(`${userId}: converted units still spendable`);
    }
  }

  const seen = new Set<string>();
  for (const request of conversions) {
    if (request.status === "completed") {
      if (seen.has(request.requestId)) {
        issues.push(`duplicate completed request ${request.requestId}`);
      }
      seen.add(request.requestId);
      const tokenOnChain = request.mintTxId;
      if (!tokenOnChain) {
        issues.push(`${request.requestId}: completed without mint tx`);
      }
      if (request.lockEntryId && request.burnEntryId === null) {
        issues.push(`${request.requestId}: locked but never burned`);
      }
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    usersChecked: input.userIds.length,
    conversionsChecked: conversions.length,
  };
}
