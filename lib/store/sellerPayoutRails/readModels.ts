import { sellerPayoutRailsEngine } from "./engine";
import { SELLER_PAYOUT_RAILS_VERSION } from "./types";
import type {
  PayoutEligibility,
  SellerPayoutHistoryEntry,
  SellerPayoutRequest,
} from "./types";

export type SellerPayoutRailsReadModel = {
  version: typeof SELLER_PAYOUT_RAILS_VERSION;
  storeId: string;
  currency: string;
  availableBalanceMinor: number;
  blockedBalanceMinor: number;
  pendingPayouts: SellerPayoutRequest[];
  history: SellerPayoutHistoryEntry[];
  eligibility: PayoutEligibility;
  bankRailsEnabled: false;
  liveTransferEnabled: false;
};

export function buildSellerPayoutRailsReadModel(input: {
  storeId: string;
  currency: string;
  accountId?: string | null;
  historyLimit?: number;
}): SellerPayoutRailsReadModel {
  const currency = input.currency.toUpperCase();
  const eligibility = sellerPayoutRailsEngine.evaluateEligibility({
    storeId: input.storeId,
    currency,
    accountId: input.accountId,
  });
  const pendingPayouts = sellerPayoutRailsEngine
    .listRequests(input.storeId)
    .filter(
      (r) =>
        r.currency === currency &&
        ["submitted", "approved", "batched", "executing"].includes(r.status)
    );
  const history = sellerPayoutRailsEngine.listHistory(
    input.storeId,
    input.historyLimit ?? 50
  );

  return {
    version: SELLER_PAYOUT_RAILS_VERSION,
    storeId: input.storeId,
    currency,
    availableBalanceMinor: eligibility.availableMinor,
    blockedBalanceMinor: eligibility.blockedMinor,
    pendingPayouts,
    history,
    eligibility,
    bankRailsEnabled: false,
    liveTransferEnabled: false,
  };
}

export type AdminPayoutRailsDiagnostics = {
  version: typeof SELLER_PAYOUT_RAILS_VERSION;
  accounts: ReturnType<typeof sellerPayoutRailsEngine.listAccounts>;
  requests: ReturnType<typeof sellerPayoutRailsEngine.listRequests>;
  batches: ReturnType<typeof sellerPayoutRailsEngine.listBatches>;
  executions: ReturnType<typeof sellerPayoutRailsEngine.listExecutions>;
  history: ReturnType<typeof sellerPayoutRailsEngine.listHistory>;
  bankRailsEnabled: false;
  liveTransferEnabled: false;
};

export function buildAdminPayoutRailsDiagnostics(): AdminPayoutRailsDiagnostics {
  return {
    version: SELLER_PAYOUT_RAILS_VERSION,
    accounts: sellerPayoutRailsEngine.listAccounts(),
    requests: sellerPayoutRailsEngine.listRequests(),
    batches: sellerPayoutRailsEngine.listBatches(),
    executions: sellerPayoutRailsEngine.listExecutions(),
    history: sellerPayoutRailsEngine.listHistory(undefined, 100),
    bankRailsEnabled: false,
    liveTransferEnabled: false,
  };
}
