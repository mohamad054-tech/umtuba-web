import {
  CONVERSION_ENABLED,
  SANDBOX_IDENTITY_MAPPING,
  SANDBOX_MINTER_ID,
  TOKEN_DECIMALS,
} from "./constants";
import { CONVERSION_UNAVAILABLE_COPY } from "./copy";
import type { LabAuditTrail } from "./audit";
import type { LocalChainAdapter } from "./chainAdapter";
import {
  isComplianceHold,
  type SyntheticComplianceProfile,
} from "./compliance";
import { nowIso, pointsToTokenUnits } from "./ids";
import type { SyntheticPointsLedger } from "./pointsLedger";
import type { LabAccessControl } from "./roles";
import type { SandboxErc20 } from "./token";
import type {
  ConversionRequest,
  ConvertInput,
  ConvertResult,
} from "./types";

export class ConversionEngine {
  private conversionEnabled = CONVERSION_ENABLED;
  private readonly requests = new Map<string, ConversionRequest>();
  private readonly userBusy = new Set<string>();
  private readonly compliance = new Map<string, SyntheticComplianceProfile>();
  private readonly attempts = new Map<string, number>();

  constructor(
    private readonly points: SyntheticPointsLedger,
    private readonly token: SandboxErc20,
    private readonly chain: LocalChainAdapter,
    private readonly access: LabAccessControl,
    private readonly audit: LabAuditTrail,
    private readonly walletAddress: (userId: string) => string
  ) {}

  isConversionEnabled(): boolean {
    return this.conversionEnabled;
  }

  /**
   * Isolated-test override only. Product default remains CONVERSION_ENABLED=false.
   */
  setConversionEnabledForIsolatedTest(enabled: boolean): void {
    this.conversionEnabled = enabled;
    this.audit.record("system", "conversion.flag", { enabled });
  }

  setComplianceProfile(profile: SyntheticComplianceProfile): void {
    this.compliance.set(profile.userId, profile);
  }

  getRequest(requestId: string): ConversionRequest | null {
    const current = this.requests.get(requestId);
    return current ? { ...current } : null;
  }

  listRequests(userId?: string): ConversionRequest[] {
    return [...this.requests.values()]
      .filter((r) => !userId || r.userId === userId)
      .map((r) => ({ ...r }));
  }

  putInFlightForTest(input: ConvertInput): void {
    this.createRequest(input, "locked", null, "in flight");
  }

  runExclusiveForTest(userId: string, fn: () => void): void {
    this.userBusy.add(userId);
    try {
      fn();
    } finally {
      this.userBusy.delete(userId);
    }
  }

  convert(input: ConvertInput): ConvertResult {
    if (
      !input.requestId?.trim() ||
      !input.userId?.trim() ||
      !Number.isInteger(input.pointsAmount) ||
      input.pointsAmount <= 0
    ) {
      return this.reject(null, "INVALID", "Request is invalid.");
    }

    const existing = this.requests.get(input.requestId);
    if (existing) {
      if (existing.status === "completed") {
        return {
          code: "DUPLICATE",
          request: { ...existing },
          message: "Request already completed.",
        };
      }
      if (existing.status === "locked" || existing.status === "minted") {
        return {
          code: "RETRY",
          request: { ...existing },
          message: "Request is already in flight.",
        };
      }
      if (existing.status === "failed" || existing.status === "refunded") {
        return this.retryFailed(input, existing);
      }
      return {
        code: existing.rejectCode ?? "DUPLICATE",
        request: { ...existing },
        message: existing.message,
      };
    }

    if (!this.conversionEnabled) {
      const request = this.createRequest(
        input,
        "rejected",
        "DISABLED",
        CONVERSION_UNAVAILABLE_COPY
      );
      return {
        code: "DISABLED",
        request,
        message: CONVERSION_UNAVAILABLE_COPY,
      };
    }

    if (this.token.isPaused()) {
      const request = this.createRequest(
        input,
        "rejected",
        "PAUSED",
        "Token is paused."
      );
      return { code: "PAUSED", request, message: request.message };
    }

    const profile = this.compliance.get(input.userId);
    if (profile && isComplianceHold(profile)) {
      const request = this.createRequest(
        input,
        "rejected",
        "COMPLIANCE_HOLD",
        "Synthetic compliance hold. No real KYC was collected."
      );
      return { code: "COMPLIANCE_HOLD", request, message: request.message };
    }

    if (this.userBusy.has(input.userId)) {
      return this.reject(null, "CONCURRENT", "Another conversion is in progress.");
    }

    this.userBusy.add(input.userId);
    try {
      return this.executeConvert(input);
    } finally {
      this.userBusy.delete(input.userId);
    }
  }

  private executeConvert(input: ConvertInput): ConvertResult {
    const balance = this.points.getBalance(input.userId);
    if (balance.available < input.pointsAmount) {
      const request = this.createRequest(
        input,
        "rejected",
        "INSUFFICIENT",
        "Insufficient available TEST UM POINTS."
      );
      return { code: "INSUFFICIENT", request, message: request.message };
    }

    const request = this.createRequest(input, "requested", null, "Locking.");
    const attempt = (this.attempts.get(input.requestId) ?? 0) + 1;
    this.attempts.set(input.requestId, attempt);
    const lockKey = `lock:${input.requestId}:${attempt}`;
    const locked = this.points.post({
      userId: input.userId,
      kind: "lock",
      deltaAvailable: -input.pointsAmount,
      deltaLocked: input.pointsAmount,
      deltaConverted: 0,
      reason: "conversion.lock",
      dedupeKey: lockKey,
      requestId: input.requestId,
    });
    if (!locked) {
      request.status = "rejected";
      request.rejectCode = "DUPLICATE";
      request.message = "Lock already exists.";
      request.updatedAt = nowIso();
      return { code: "DUPLICATE", request: { ...request }, message: request.message };
    }

    const lockEntry = this.points.lastEntry(input.userId, "lock");
    request.status = "locked";
    request.lockEntryId = lockEntry?.entryId ?? null;
    request.updatedAt = nowIso();
    this.audit.record(input.actorId, "conversion.locked", {
      requestId: input.requestId,
      points: input.pointsAmount,
    });

    const tokenAmount = pointsToTokenUnits(
      input.pointsAmount,
      TOKEN_DECIMALS,
      SANDBOX_IDENTITY_MAPPING
    );
    request.tokenAmount = input.pointsAmount;

    const mint = this.chain.mintTo(
      SANDBOX_MINTER_ID,
      this.walletAddress(input.userId),
      tokenAmount
    );
    if (!mint.ok) {
      const failReason =
        mint.reason === "SUCCESS" ? "CHAIN_FAILURE" : mint.reason;
      return this.failAndRefund(input, request, failReason);
    }

    request.status = "minted";
    request.mintTxId = mint.txId;
    request.updatedAt = nowIso();

    const burnKey = `burn:${input.requestId}:${attempt}`;
    const burned = this.points.post({
      userId: input.userId,
      kind: "burn_converted",
      deltaAvailable: 0,
      deltaLocked: -input.pointsAmount,
      deltaConverted: input.pointsAmount,
      reason: "conversion.burn",
      dedupeKey: burnKey,
      requestId: input.requestId,
    });
    if (!burned) {
      return this.failAndRefund(input, request, "CHAIN_FAILURE");
    }

    const burnEntry = this.points.lastEntry(input.userId, "burn_converted");
    request.status = "completed";
    request.burnEntryId = burnEntry?.entryId ?? null;
    request.message = "Synthetic conversion completed. NO REAL VALUE.";
    request.updatedAt = nowIso();
    this.audit.record(input.actorId, "conversion.completed", {
      requestId: input.requestId,
      points: input.pointsAmount,
      mapping: "NOT_A_PRODUCTION_RATE",
    });
    return { code: "SUCCESS", request: { ...request }, message: request.message };
  }

  private retryFailed(
    input: ConvertInput,
    existing: ConversionRequest
  ): ConvertResult {
    if (!this.conversionEnabled) {
      return {
        code: "DISABLED",
        request: { ...existing },
        message: CONVERSION_UNAVAILABLE_COPY,
      };
    }
    if (this.token.isPaused()) {
      return { code: "PAUSED", request: { ...existing }, message: "Token is paused." };
    }
    if (this.userBusy.has(input.userId)) {
      return {
        code: "RETRY",
        request: { ...existing },
        message: "Request is already in flight.",
      };
    }
    this.requests.delete(input.requestId);
    this.userBusy.add(input.userId);
    try {
      const result = this.executeConvert(input);
      if (result.code === "SUCCESS") {
        return { ...result, message: `${result.message} (retry)` };
      }
      return result;
    } finally {
      this.userBusy.delete(input.userId);
    }
  }

  private failAndRefund(
    input: ConvertInput,
    request: ConversionRequest,
    reason: "CHAIN_FAILURE" | "UNAUTHORIZED_MINT" | "PAUSED"
  ): ConvertResult {
    const attempt = this.attempts.get(input.requestId) ?? 1;
    const refundKey = `unlock:${input.requestId}:${attempt}`;
    this.points.post({
      userId: input.userId,
      kind: "unlock",
      deltaAvailable: input.pointsAmount,
      deltaLocked: -input.pointsAmount,
      deltaConverted: 0,
      reason: "conversion.refund",
      dedupeKey: refundKey,
      requestId: input.requestId,
    });
    const refund = this.points.lastEntry(input.userId, "unlock");
    request.status = "refunded";
    request.rejectCode = reason;
    request.refundEntryId = refund?.entryId ?? null;
    request.message =
      reason === "CHAIN_FAILURE"
        ? "Chain mint failed. Locked points were returned."
        : reason === "UNAUTHORIZED_MINT"
          ? "Mint was unauthorized. Locked points were returned."
          : "Token paused during mint. Locked points were returned.";
    request.updatedAt = nowIso();
    this.audit.record(input.actorId, "conversion.refunded", {
      requestId: input.requestId,
      reason,
    }, "error");
    return { code: reason, request: { ...request }, message: request.message };
  }

  private createRequest(
    input: ConvertInput,
    status: ConversionRequest["status"],
    rejectCode: ConversionRequest["rejectCode"],
    message: string
  ): ConversionRequest {
    const request: ConversionRequest = {
      requestId: input.requestId,
      userId: input.userId,
      pointsAmount: input.pointsAmount,
      tokenAmount: 0,
      status,
      rejectCode,
      message,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      lockEntryId: null,
      burnEntryId: null,
      mintTxId: null,
      refundEntryId: null,
    };
    this.requests.set(input.requestId, request);
    return request;
  }

  private reject(
    request: ConversionRequest | null,
    code: ConvertResult["code"],
    message: string
  ): ConvertResult {
    return { code, request, message };
  }
}
