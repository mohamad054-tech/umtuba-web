"use server";

import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  fetchUmPointsWalletBalance,
  PRIMARY_WALLET_ASSET_ID,
  type AssetId,
  type WalletBalance,
} from "../../lib/wallet";

export type WalletActionResult<T> =
  | ({ ok: true } & T)
  | { ok: false; message: string; requiresAuth?: boolean };

export async function getPrimaryWalletBalanceAction(): Promise<
  WalletActionResult<{ balance: WalletBalance }>
> {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      message: "Sign in to view your wallet.",
      requiresAuth: true,
    };
  }

  try {
    const supabase = await createClient();
    const balance = await fetchUmPointsWalletBalance(supabase, user.id);
    return { ok: true, balance };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load wallet balance.";
    return { ok: false, message };
  }
}

export async function getWalletBalanceAction(
  assetId: AssetId = PRIMARY_WALLET_ASSET_ID
): Promise<WalletActionResult<{ balance: WalletBalance }>> {
  if (assetId !== "um_points") {
    return {
      ok: false,
      message: "This asset is not available yet.",
    };
  }

  return getPrimaryWalletBalanceAction();
}
