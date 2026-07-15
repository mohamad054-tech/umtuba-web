"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "../../../lib/supabase/client";
import type {
  LiveChatMessage,
  LiveParticipant,
  LiveRealtimeState,
  LiveRoom,
} from "../types";
import {
  mapRealtimeChatRow,
  mergeRealtimeChatMessage,
  type LiveChatRealtimeRow,
} from "./mapRealtimeChat";

const RECONNECT_BASE_MS = 1200;
const RECONNECT_MAX_MS = 12_000;

type UseLiveRoomRealtimeOptions = {
  roomId: string;
  enabled: boolean;
  /** When false, skip live_participants CDC (RLS is authenticated-only). */
  isAuthenticated: boolean;
  getHostId: () => string | null;
  getAuthUserId: () => string | null;
  getParticipants: () => LiveParticipant[];
  onChatMessage: (
    updater: (prev: LiveChatMessage[]) => LiveChatMessage[]
  ) => void;
  onRoomPatch: (patch: Partial<LiveRoom>) => void;
  onRoomEnded: () => void;
  onParticipantsChanged: () => void;
  onReaction: (emoji: string, reactionId: string, userId: string | null) => void;
  onResync: () => void;
};

export function useLiveRoomRealtime({
  roomId,
  enabled,
  isAuthenticated,
  getHostId,
  getAuthUserId,
  getParticipants,
  onChatMessage,
  onRoomPatch,
  onRoomEnded,
  onParticipantsChanged,
  onReaction,
  onResync,
}: UseLiveRoomRealtimeOptions) {
  const [realtimeState, setRealtimeState] =
    useState<LiveRealtimeState>("connecting");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const disposedRef = useRef(false);

  const handleChatInsert = useEffectEvent((row: LiveChatRealtimeRow) => {
    const message = mapRealtimeChatRow(row, {
      hostId: getHostId(),
      currentUserId: getAuthUserId(),
      participants: getParticipants(),
    });
    onChatMessage((prev) => mergeRealtimeChatMessage(prev, message));
  });

  const handleChatUpdate = useEffectEvent((row: LiveChatRealtimeRow) => {
    if (!row.deleted_at) return;
    onChatMessage((prev) =>
      prev.map((m) =>
        m.id === row.id
          ? {
              ...m,
              text: "Message removed by moderation",
              deleted: true,
              userName: "Message removed",
              userInitials: "—",
            }
          : m
      )
    );
  });

  const handleRoomUpdate = useEffectEvent(
    (row: {
      id?: string;
      viewer_count?: number;
      status?: LiveRoom["status"];
      started_at?: string | null;
      ended_at?: string | null;
      chat_message_count?: number;
      peak_viewer_count?: number;
      title?: string;
    }) => {
      onRoomPatch({
        ...(typeof row.viewer_count === "number"
          ? { viewerCount: row.viewer_count }
          : {}),
        ...(typeof row.peak_viewer_count === "number"
          ? { peakViewerCount: row.peak_viewer_count }
          : {}),
        ...(row.status ? { status: row.status } : {}),
        ...(row.started_at !== undefined
          ? { startedAt: row.started_at }
          : {}),
        ...(row.ended_at !== undefined ? { endedAt: row.ended_at } : {}),
        ...(typeof row.chat_message_count === "number"
          ? { chatMessageCount: row.chat_message_count }
          : {}),
        ...(row.title ? { title: row.title } : {}),
      });

      if (row.status === "ended") {
        onRoomEnded();
      }

      onParticipantsChanged();
    }
  );

  const handleParticipantsChanged = useEffectEvent(() => {
    onParticipantsChanged();
  });

  const handleReaction = useEffectEvent(
    (row: { id?: string; emoji?: string; user_id?: string }) => {
      if (!row.id || !row.emoji) return;
      onReaction(row.emoji, row.id, row.user_id ?? null);
    }
  );

  const handleResync = useEffectEvent(() => {
    onResync();
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

      let channel = supabase.channel(`live-room-cdc:${roomId}`);

      // Authenticated: full CDC. Anonymous: only live_rooms (public SELECT).
      // Binding chat/participants/reactions as anon can leave the channel stuck
      // on Connecting when Realtime evaluates RLS on the shared socket.
      if (isAuthenticated) {
        channel = channel
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "live_chat_messages",
              filter: `room_id=eq.${roomId}`,
            },
            (payload) => {
              if (disposedRef.current || generation !== activeGeneration) return;
              handleChatInsert(payload.new as LiveChatRealtimeRow);
            }
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "live_chat_messages",
              filter: `room_id=eq.${roomId}`,
            },
            (payload) => {
              if (disposedRef.current || generation !== activeGeneration) return;
              handleChatUpdate(payload.new as LiveChatRealtimeRow);
            }
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "live_rooms",
              filter: `id=eq.${roomId}`,
            },
            (payload) => {
              if (disposedRef.current || generation !== activeGeneration) return;
              handleRoomUpdate(
                payload.new as {
                  id?: string;
                  viewer_count?: number;
                  status?: LiveRoom["status"];
                  started_at?: string | null;
                  ended_at?: string | null;
                  chat_message_count?: number;
                  peak_viewer_count?: number;
                  title?: string;
                }
              );
            }
          )
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "live_reactions",
              filter: `room_id=eq.${roomId}`,
            },
            (payload) => {
              if (disposedRef.current || generation !== activeGeneration) return;
              const row = payload.new as {
                id?: string;
                emoji?: string;
                user_id?: string;
              };
              handleReaction(row);
            }
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "live_participants",
              filter: `room_id=eq.${roomId}`,
            },
            () => {
              if (disposedRef.current || generation !== activeGeneration) return;
              handleParticipantsChanged();
            }
          );
      } else {
        channel = channel.on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "live_rooms",
            filter: `id=eq.${roomId}`,
          },
          (payload) => {
            if (disposedRef.current || generation !== activeGeneration) return;
            handleRoomUpdate(
              payload.new as {
                id?: string;
                viewer_count?: number;
                status?: LiveRoom["status"];
                started_at?: string | null;
                ended_at?: string | null;
                chat_message_count?: number;
                peak_viewer_count?: number;
                title?: string;
              }
            );
          }
        );
      }

      channel.subscribe((status) => {
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
  }, [roomId, enabled, isAuthenticated]);

  return { realtimeState };
}
