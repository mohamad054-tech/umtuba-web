"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient, tryCreateClient } from "../../../lib/supabase/client";
import { getPrimaryWalletBalanceAction } from "../../actions/wallet";
import {
  mapUmPointsBalanceRow,
  PRIMARY_WALLET_ASSET_ID,
  type WalletBalance,
  type WalletBalanceStatus,
} from "../../../lib/wallet";

export type UseWalletBalanceResult = {
  status: WalletBalanceStatus;
  balance: WalletBalance | null;
  errorMessage: string | null;
  refresh: () => Promise<void>;
};

const RECONNECT_BASE_MS = 1200;
const RECONNECT_MAX_MS = 12_000;

export function useWalletBalance(): UseWalletBalanceResult {
  const [status, setStatus] = useState<WalletBalanceStatus>("loading");
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const generationRef = useRef(0);

  const refresh = useCallback(async () => {
    const generation = ++generationRef.current;
    const result = await getPrimaryWalletBalanceAction();
    if (generation !== generationRef.current) return;

    if (!result.ok) {
      if (result.requiresAuth) {
        setStatus("signed_out");
        setBalance(null);
        setErrorMessage(null);
        return;
      }
      setStatus("error");
      setErrorMessage(result.message);
      return;
    }

    setBalance(result.balance);
    setErrorMessage(null);
    setStatus("ready");
  }, []);

  useEffect(() => {
    let disposed = false;
    const maybeClient = tryCreateClient();
    if (!maybeClient) {
      setStatus("signed_out");
      setBalance(null);
      setUserId(null);
      return;
    }
    const supabase = maybeClient;

    async function boot() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (disposed) return;
      if (!user) {
        setUserId(null);
        setStatus("signed_out");
        setBalance(null);
        return;
      }
      setUserId(user.id);
      setStatus("loading");
      await refresh();
    }

    void boot();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUserId(null);
        setStatus("signed_out");
        setBalance(null);
        setErrorMessage(null);
        return;
      }
      setUserId(session.user.id);
      void refresh();
    });

    return () => {
      disposed = true;
      subscription.unsubscribe();
    };
  }, [refresh]);

  useEffect(() => {
    if (!userId) return;

    let disposed = false;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null =
      null;
    let reconnectAttempt = 0;
    let reconnectTimer: number | null = null;
    const supabase = createClient();

    const clearReconnect = () => {
      if (reconnectTimer != null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const scheduleReconnect = () => {
      if (disposed) return;
      clearReconnect();
      const delay = Math.min(
        RECONNECT_MAX_MS,
        RECONNECT_BASE_MS * 2 ** reconnectAttempt
      );
      reconnectAttempt += 1;
      reconnectTimer = window.setTimeout(() => {
        void start();
      }, delay);
    };

    async function start() {
      if (disposed) return;
      clearReconnect();

      if (channel) {
        await supabase.removeChannel(channel);
        channel = null;
      }

      channel = supabase
        .channel(`wallet-balance:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "um_point_balances",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (disposed) return;
            const row = payload.new as {
              balance?: unknown;
              updated_at?: unknown;
            } | null;
            if (row && typeof row === "object") {
              setBalance(mapUmPointsBalanceRow(row));
              setStatus("ready");
              setErrorMessage(null);
              return;
            }
            void refresh();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${userId}`,
          },
          (payload) => {
            if (disposed) return;
            const type = (payload.new as { type?: string } | null)?.type;
            if (
              type === "um_points_earned" ||
              type === "reward_milestone" ||
              type === "referral_reward"
            ) {
              void refresh();
            }
          }
        )
        .subscribe((subStatus) => {
          if (disposed) return;
          if (subStatus === "SUBSCRIBED") {
            reconnectAttempt = 0;
            void refresh();
            return;
          }
          if (
            subStatus === "CHANNEL_ERROR" ||
            subStatus === "TIMED_OUT" ||
            subStatus === "CLOSED"
          ) {
            scheduleReconnect();
          }
        });
    }

    void start();

    return () => {
      disposed = true;
      clearReconnect();
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [userId, refresh]);

  return {
    status,
    balance:
      balance ??
      (status === "ready"
        ? { assetId: PRIMARY_WALLET_ASSET_ID, amount: 0, updatedAt: null }
        : null),
    errorMessage,
    refresh,
  };
}
