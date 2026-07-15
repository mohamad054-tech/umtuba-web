"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "../../../lib/supabase/client";
import type { LiveRealtimeState } from "../types";

const RECONNECT_BASE_MS = 1200;
const RECONNECT_MAX_MS = 12_000;
const SUBSCRIBE_TIMEOUT_MS = 12_000;

type UseLiveRoomPresenceOptions = {
  roomId: string;
  enabled: boolean;
  presenceKey: string;
};

export type LivePresenceResult = {
  watchingCount: number | null;
  presenceState: LiveRealtimeState;
  presenceError: string | null;
};

/**
 * Public Realtime Presence for in-room "watching" count.
 * Anonymous clients use the publishable key — no user JWT / setAuth required.
 */
export function useLiveRoomPresence({
  roomId,
  enabled,
  presenceKey,
}: UseLiveRoomPresenceOptions): LivePresenceResult {
  const [watchingCount, setWatchingCount] = useState<number | null>(null);
  const [presenceState, setPresenceState] =
    useState<LiveRealtimeState>("connecting");
  const [presenceError, setPresenceError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const disposedRef = useRef(false);

  const applyPresenceCount = useEffectEvent((channel: RealtimeChannel) => {
    setWatchingCount(Object.keys(channel.presenceState()).length);
  });

  useEffect(() => {
    if (!enabled || !presenceKey || !roomId) {
      return;
    }

    disposedRef.current = false;
    const supabase = createClient();
    const topic = `live-presence:${roomId}`;
    let activeGeneration = 0;
    let reconnectAttempt = 0;
    let reconnectTimer: number | null = null;
    let subscribeTimeout: number | null = null;

    function clearTimers() {
      if (reconnectTimer != null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (subscribeTimeout != null) {
        window.clearTimeout(subscribeTimeout);
        subscribeTimeout = null;
      }
    }

    async function teardownChannel() {
      const active = channelRef.current;
      channelRef.current = null;
      if (!active) return;
      try {
        await active.untrack();
      } catch {
        // Channel may already be closed.
      }
      await supabase.removeChannel(active);
    }

    function scheduleReconnect(generation: number) {
      if (disposedRef.current || generation !== activeGeneration) return;

      clearTimers();
      setPresenceState("reconnecting");
      setPresenceError("Reconnecting viewer presence…");

      const delay = Math.min(
        RECONNECT_MAX_MS,
        RECONNECT_BASE_MS * 2 ** Math.min(reconnectAttempt, 4)
      );
      reconnectAttempt += 1;

      reconnectTimer = window.setTimeout(() => {
        if (disposedRef.current || generation !== activeGeneration) return;
        void subscribe(generation);
      }, delay);
    }

    async function subscribe(generation: number) {
      if (disposedRef.current || generation !== activeGeneration) return;

      await teardownChannel();
      if (disposedRef.current || generation !== activeGeneration) return;

      if (reconnectAttempt > 0) {
        setPresenceState("reconnecting");
      }

      const channel = supabase.channel(topic, {
        config: {
          private: false,
          presence: {
            key: presenceKey,
          },
        },
      });

      channel
        .on("presence", { event: "sync" }, () => {
          if (disposedRef.current || generation !== activeGeneration) return;
          applyPresenceCount(channel);
        })
        .on("presence", { event: "join" }, () => {
          if (disposedRef.current || generation !== activeGeneration) return;
          applyPresenceCount(channel);
        })
        .on("presence", { event: "leave" }, () => {
          if (disposedRef.current || generation !== activeGeneration) return;
          applyPresenceCount(channel);
        })
        .subscribe(async (status, err) => {
          if (disposedRef.current || generation !== activeGeneration) return;

          if (status === "SUBSCRIBED") {
            if (subscribeTimeout != null) {
              window.clearTimeout(subscribeTimeout);
              subscribeTimeout = null;
            }
            reconnectAttempt = 0;
            setPresenceState("connected");
            setPresenceError(null);
            try {
              const trackResult = await channel.track({
                online_at: new Date().toISOString(),
              });
              if (trackResult === "ok" || trackResult === undefined) {
                applyPresenceCount(channel);
              } else {
                setPresenceState("error");
                setPresenceError("Unable to publish viewer presence.");
                scheduleReconnect(generation);
              }
            } catch {
              setPresenceState("error");
              setPresenceError("Unable to publish viewer presence.");
              scheduleReconnect(generation);
            }
            return;
          }

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setPresenceState("error");
            setPresenceError(
              err?.message || "Viewer presence connection failed."
            );
            scheduleReconnect(generation);
            return;
          }

          if (status === "CLOSED") {
            setPresenceState("reconnecting");
            setPresenceError("Viewer presence disconnected.");
            scheduleReconnect(generation);
          }
        });

      channelRef.current = channel;

      subscribeTimeout = window.setTimeout(() => {
        if (disposedRef.current || generation !== activeGeneration) return;
        // Avoid stacking reconnects when subscribe already succeeded.
        if (channelRef.current?.state === "joined") {
          return;
        }
        setPresenceState((prev) => (prev === "connected" ? prev : "error"));
        setPresenceError("Viewer presence is taking too long to connect.");
        scheduleReconnect(generation);
      }, SUBSCRIBE_TIMEOUT_MS);
    }

    void subscribe(activeGeneration);

    return () => {
      disposedRef.current = true;
      activeGeneration += 1;
      clearTimers();
      void teardownChannel();
    };
  }, [roomId, enabled, presenceKey]);

  return { watchingCount, presenceState, presenceError };
}
