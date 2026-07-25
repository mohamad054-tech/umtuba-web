"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildActivityTierRealtimeTopic,
  createActivityTierRealtimeInstanceId,
  emptyActivityTierProgress,
  type ActivityProgressStatus,
  type ActivityTierProgress,
} from "../../../lib/activity-tiers";
import { mapActivityBalanceRow } from "../../../lib/supabase/activityTiers";
import { createClient, tryCreateClient } from "../../../lib/supabase/client";
import { getMyActivityTierAction } from "../../actions/activityTiers";

export type UseActivityTierResult = {
  status: ActivityProgressStatus;
  progress: ActivityTierProgress;
  errorMessage: string | null;
  refresh: () => Promise<void>;
};

const RECONNECT_BASE_MS = 1200;
const RECONNECT_MAX_MS = 12_000;

export function useActivityTier(): UseActivityTierResult {
  const [status, setStatus] = useState<ActivityProgressStatus>("loading");
  const [progress, setProgress] = useState<ActivityTierProgress>(
    emptyActivityTierProgress()
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const generationRef = useRef(0);

  const refresh = useCallback(async () => {
    const generation = ++generationRef.current;
    const result = await getMyActivityTierAction();
    if (generation !== generationRef.current) return;

    if (!result.ok) {
      if (result.requiresAuth) {
        setStatus("signed_out");
        setProgress(emptyActivityTierProgress());
        setErrorMessage(null);
        return;
      }
      setStatus("error");
      setErrorMessage(result.message);
      return;
    }

    setProgress(result.progress);
    setErrorMessage(null);
    setStatus("ready");
  }, []);

  useEffect(() => {
    let disposed = false;
    const maybeClient = tryCreateClient();
    if (!maybeClient) {
      setUserId(null);
      setStatus("signed_out");
      setProgress(emptyActivityTierProgress());
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
        setProgress(emptyActivityTierProgress());
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
        setProgress(emptyActivityTierProgress());
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
    // Unique topic per mount so concurrent indicators never share a subscribed channel.
    const instanceId = createActivityTierRealtimeInstanceId();
    const topic = buildActivityTierRealtimeTopic(userId, instanceId);

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
        .channel(topic)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "activity_score_balances",
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            if (disposed) return;
            const row = payload.new as {
              score?: unknown;
              tier_id?: unknown;
              updated_at?: unknown;
            } | null;
            if (row && typeof row === "object") {
              setProgress(mapActivityBalanceRow(row));
              setStatus("ready");
              setErrorMessage(null);
              return;
            }
            void refresh();
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

  useEffect(() => {
    if (!userId) return;

    function onVisibleOrOnline() {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      void refresh();
    }

    document.addEventListener("visibilitychange", onVisibleOrOnline);
    window.addEventListener("online", onVisibleOrOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisibleOrOnline);
      window.removeEventListener("online", onVisibleOrOnline);
    };
  }, [userId, refresh]);

  return { status, progress, errorMessage, refresh };
}
