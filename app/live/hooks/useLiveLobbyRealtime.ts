"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "../../../lib/supabase/client";
import type { LiveRealtimeState, LiveRoom } from "../types";

const RECONNECT_BASE_MS = 1200;
const RECONNECT_MAX_MS = 12_000;

type UseLiveLobbyRealtimeOptions = {
  enabled: boolean;
  onRoomsChanged: () => void;
  onRoomUpsertPatch: (row: {
    id: string;
    status?: string;
    viewer_count?: number;
    started_at?: string | null;
    ended_at?: string | null;
    title?: string;
  }) => void;
  onRoomRemoved: (id: string) => void;
};

export function useLiveLobbyRealtime({
  enabled,
  onRoomsChanged,
  onRoomUpsertPatch,
  onRoomRemoved,
}: UseLiveLobbyRealtimeOptions) {
  const [realtimeState, setRealtimeState] =
    useState<LiveRealtimeState>("connecting");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const disposedRef = useRef(false);

  const handleInsert = useEffectEvent(() => {
    onRoomsChanged();
  });

  const handleUpdate = useEffectEvent(
    (row: {
      id?: string;
      status?: string;
      viewer_count?: number;
      started_at?: string | null;
      ended_at?: string | null;
      title?: string;
    }) => {
      if (!row.id) return;

      if (row.status && row.status !== "live") {
        onRoomRemoved(row.id);
        return;
      }

      onRoomUpsertPatch({
        id: row.id,
        status: row.status,
        viewer_count: row.viewer_count,
        started_at: row.started_at,
        ended_at: row.ended_at,
        title: row.title,
      });
    }
  );

  const handleDelete = useEffectEvent((id: string) => {
    onRoomRemoved(id);
  });

  const handleResync = useEffectEvent(() => {
    onRoomsChanged();
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    disposedRef.current = false;
    const supabase = createClient();
    let activeGeneration = 0;

    function clearReconnectTimer() {
      if (reconnectTimerRef.current != null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    }

    function teardownChannel() {
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    }

    function scheduleReconnect(generation: number) {
      if (disposedRef.current || generation !== activeGeneration) return;

      clearReconnectTimer();
      setRealtimeState("reconnecting");

      const attempt = reconnectAttemptRef.current;
      const delay = Math.min(
        RECONNECT_MAX_MS,
        RECONNECT_BASE_MS * 2 ** Math.min(attempt, 4)
      );
      reconnectAttemptRef.current = attempt + 1;

      reconnectTimerRef.current = window.setTimeout(() => {
        if (disposedRef.current || generation !== activeGeneration) return;
        subscribe(generation);
      }, delay);
    }

    function subscribe(generation: number) {
      if (disposedRef.current || generation !== activeGeneration) return;

      teardownChannel();
      setRealtimeState(
        reconnectAttemptRef.current > 0 ? "reconnecting" : "connecting"
      );

      const channel = supabase
        .channel("live-lobby")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "live_rooms",
          },
          (payload) => {
            if (disposedRef.current || generation !== activeGeneration) return;
            const row = payload.new as { status?: string };
            if (row.status !== "live") return;
            handleInsert();
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "live_rooms",
          },
          (payload) => {
            if (disposedRef.current || generation !== activeGeneration) return;
            handleUpdate(
              payload.new as {
                id?: string;
                status?: string;
                viewer_count?: number;
                started_at?: string | null;
                ended_at?: string | null;
                title?: string;
              }
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "live_rooms",
          },
          (payload) => {
            if (disposedRef.current || generation !== activeGeneration) return;
            const row = payload.old as { id?: string };
            if (!row.id) return;
            handleDelete(row.id);
          }
        )
        .subscribe((status) => {
          if (disposedRef.current || generation !== activeGeneration) return;

          if (status === "SUBSCRIBED") {
            const wasReconnect = reconnectAttemptRef.current > 0;
            reconnectAttemptRef.current = 0;
            setRealtimeState("connected");
            if (wasReconnect) {
              handleResync();
            }
            return;
          }

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setRealtimeState("error");
            scheduleReconnect(generation);
            return;
          }

          if (status === "CLOSED") {
            setRealtimeState("reconnecting");
            scheduleReconnect(generation);
          }
        });

      channelRef.current = channel;
    }

    subscribe(activeGeneration);

    return () => {
      disposedRef.current = true;
      activeGeneration += 1;
      clearReconnectTimer();
      teardownChannel();
    };
  }, [enabled]);

  return { realtimeState };
}

/** Narrow helper so lobby patch typing stays local to the hook module. */
export type LobbyRoomPatch = Parameters<
  UseLiveLobbyRealtimeOptions["onRoomUpsertPatch"]
>[0];

export function applyLobbyRoomPatch(
  rooms: LiveRoom[],
  row: LobbyRoomPatch,
  onMissing: () => void
): LiveRoom[] {
  const exists = rooms.some((room) => room.id === row.id);
  if (!exists) {
    onMissing();
    return rooms;
  }

  return rooms
    .map((room) =>
      room.id === row.id
        ? {
            ...room,
            viewerCount: row.viewer_count ?? room.viewerCount,
            status: (row.status as LiveRoom["status"]) ?? room.status,
            startedAt: row.started_at ?? room.startedAt,
            endedAt: row.ended_at ?? room.endedAt,
            title: row.title ?? room.title,
          }
        : room
    )
    .sort((a, b) => {
      const aTs = a.startedAt ?? a.createdAt;
      const bTs = b.startedAt ?? b.createdAt;
      return bTs.localeCompare(aTs);
    });
}
