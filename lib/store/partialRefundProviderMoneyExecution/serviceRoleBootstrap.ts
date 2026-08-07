/**
 * Server-only bootstrap for provider-money execution repository.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  assertNotBrowserProviderMoney,
  createPartialRefundProviderExecutionRpcPort,
} from "./rpcContracts";
import { ServiceRolePartialRefundProviderExecutionRepository } from "./serviceRoleRepository";

type AnyClient = SupabaseClient;

export type ProviderMoneyServiceRoleBootstrapResult =
  | {
      ok: true;
      supabase: AnyClient;
      repository: ServiceRolePartialRefundProviderExecutionRepository;
    }
  | { ok: false; code: "unsupported"; message: string };

export function createPartialRefundProviderMoneyServiceRole(): ProviderMoneyServiceRoleBootstrapResult {
  assertNotBrowserProviderMoney();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    return {
      ok: false,
      code: "unsupported",
      message:
        "Partial-refund provider money is unavailable (server configuration).",
    };
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const rpc = createPartialRefundProviderExecutionRpcPort(async (fn, args) =>
    supabase.rpc(fn, args)
  );
  return {
    ok: true,
    supabase,
    repository: new ServiceRolePartialRefundProviderExecutionRepository(rpc),
  };
}
