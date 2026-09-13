export type LabRole =
  | "DEFAULT_ADMIN"
  | "MINTER"
  | "BURNER"
  | "PAUSER"
  | "TREASURY_ADMIN"
  | "COMPLIANCE_VIEWER"
  | "USER";

export type ConversionStatus =
  | "requested"
  | "locked"
  | "minted"
  | "completed"
  | "failed"
  | "refunded"
  | "rejected";

export type ConversionRejectCode =
  | "DISABLED"
  | "PAUSED"
  | "INSUFFICIENT"
  | "UNAUTHORIZED_MINT"
  | "UNAUTHORIZED"
  | "DUPLICATE"
  | "RETRY"
  | "CHAIN_FAILURE"
  | "CONCURRENT"
  | "INVALID"
  | "COMPLIANCE_HOLD";

export type ConversionOutcomeCode =
  | "SUCCESS"
  | ConversionRejectCode;

export type PointsEntryKind =
  | "earn"
  | "lock"
  | "unlock"
  | "burn_converted"
  | "spend";

export type TokenEventKind = "Transfer" | "Approval";

export type AuditSeverity = "info" | "warn" | "error";

export type SyntheticComplianceState =
  | "NOT_COLLECTED"
  | "SYNTHETIC_CLEAR"
  | "SYNTHETIC_HOLD"
  | "SYNTHETIC_DENIED";

export type ChainFailureMode = "none" | "next_mint" | "always";

export type ConversionRequest = {
  requestId: string;
  userId: string;
  pointsAmount: number;
  tokenAmount: number;
  status: ConversionStatus;
  rejectCode: ConversionRejectCode | null;
  message: string;
  createdAt: string;
  updatedAt: string;
  lockEntryId: string | null;
  burnEntryId: string | null;
  mintTxId: string | null;
  refundEntryId: string | null;
};

export type PointsLedgerEntry = {
  entryId: string;
  userId: string;
  kind: PointsEntryKind;
  deltaAvailable: number;
  deltaLocked: number;
  deltaConverted: number;
  reason: string;
  dedupeKey: string;
  requestId: string | null;
  createdAt: string;
};

export type PointsBalance = {
  userId: string;
  available: number;
  locked: number;
  converted: number;
  earned: number;
  spent: number;
};

export type TokenAccount = {
  address: string;
  userId: string;
  balance: bigint;
};

export type TokenEvent = {
  eventId: string;
  kind: TokenEventKind;
  from: string;
  to: string;
  value: bigint;
  spender?: string;
  createdAt: string;
};

export type AuditEvent = {
  auditId: string;
  at: string;
  actorId: string;
  action: string;
  severity: AuditSeverity;
  details: Record<string, unknown>;
};

export type WalletView = {
  userId: string;
  address: string;
  pointsAvailable: number;
  pointsLocked: number;
  pointsConverted: number;
  tokenBalanceDisplay: string;
  conversionActionable: boolean;
  banner: string;
};

export type TreasuryView = {
  treasuryAddress: string;
  tokenBalanceDisplay: string;
  supplyPolicy: "UNDECIDED";
  pricePolicy: "UNDECIDED";
  conversionRatePolicy: "UNDECIDED";
};

export type ReconciliationResult = {
  ok: boolean;
  issues: string[];
  usersChecked: number;
  conversionsChecked: number;
};

export type ConvertInput = {
  actorId: string;
  userId: string;
  requestId: string;
  pointsAmount: number;
};

export type ConvertResult = {
  code: ConversionOutcomeCode;
  request: ConversionRequest | null;
  message: string;
};

export type LabFirewall = {
  PRODUCTION_ENABLED: false;
  CONVERSION_ENABLED: boolean;
  DEPOSITS_ENABLED: false;
  WITHDRAWALS_ENABLED: false;
  TRADING_ENABLED: false;
  MAINNET_DEPLOYED: false;
  PRODUCTION_CONNECTED: false;
};
