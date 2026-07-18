"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "../../../lib/supabase/client";
import type { Message, MessageReactionSummary } from "../types";
import { mergeReactionRealtimeEvent } from "../lib/reactionState";
import {
  mapMessengerMessageRow,
  type MessengerMessageRow,
} from "../lib/mapMessage";
import { deletedMessagePlaceholder } from "../lib/messagePermissions";

const RECONNECT_BASE_MS = 1200;
const RECONNECT_MAX_MS = 12_000;

type InboxParticipantRow = {
  conversation_id?: string;
  unread_count?: number | null;
  is_muted?: boolean | null;
  muted_until?: string | null;
};

type UseMessengerRealtimeOptions = {
  conversationId: string | null;
  currentUserId: string;
  enabled?: boolean;
  onMessageInsert: (message: Message) => void;
  onMessageUpdate: (message: Message) => void;
  onReactionsChange: (
    messageId: string,
    updater: (
      prev: MessageReactionSummary[] | undefined
    ) => MessageReactionSummary[] | undefined
  ) => void;
  /** Called after (re)subscribe succeeds — gap-fill thread + inbox. */
  onResync?: () => void;
  /** Own participant row updates (unread / mute) for inbox freshness. */
  onInboxParticipantChange?: (row: InboxParticipantRow) => void;
};

export function useMessengerRealtime({
  conversationId,
  currentUserId,
  enabled = true,
  onMessageInsert,
  onMessageUpdate,
  onReactionsChange,
  onResync,
  onInboxParticipantChange,
}: UseMessengerRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const inboxChannelRef = useRef<RealtimeChannel | null>(null);

  const handleInsert = useEffectEvent((row: MessengerMessageRow) => {
    if (row.conversation_id !== conversationId) {
      return;
    }
    onMessageInsert(mapMessengerMessageRow(row, currentUserId));
  });

  const handleUpdate = useEffectEvent((row: MessengerMessageRow) => {
    if (row.conversation_id !== conversationId) {
      return;
    }

    if (row.deleted_at) {
      onMessageUpdate({
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id ?? "system",
        text: deletedMessagePlaceholder(),
        sentAt: row.created_at,
        isMine: row.sender_id === currentUserId,
        status: "sent",
        messageType: row.message_type,
        replyToMessageId: row.reply_to_message_id ?? null,
        editedAt: row.edited_at ?? null,
        deletedAt: row.deleted_at,
        isDeleted: true,
        clientId: row.client_id ?? undefined,
      });
      return;
    }

    onMessageUpdate(mapMessengerMessageRow(row, currentUserId));
  });

  const handleReaction = useEffectEvent(
    (
      row: { message_id?: string; user_id?: string; emoji?: string },
      event: "INSERT" | "DELETE" | "UPDATE"
    ) => {
      if (!row.message_id || !row.emoji || !row.user_id) {
        return;
      }

      onReactionsChange(row.message_id, (prev) =>
        mergeReactionRealtimeEvent({
          reactions: prev,
          emoji: row.emoji!,
          userId: row.user_id!,
          currentUserId,
          event,
        })
      );
    }
  );

  const handleResync = useEffectEvent(() => {
    onResync?.();
  });

  const handleInboxParticipant = useEffectEvent((row: InboxParticipantRow) => {
    onInboxParticipantChange?.(row);
  });

  useEffect(() => {
    if (!enabled || !conversationId || !currentUserId) {
      return;
    }

    let disposed = false;
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

      if (channelRef.current) {
        await supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }

      const channel = supabase
        .channel(`messenger:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            handleInsert(payload.new as MessengerMessageRow);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            handleUpdate(payload.new as MessengerMessageRow);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "message_reactions",
          },
          (payload) => {
            const row =
              payload.eventType === "DELETE"
                ? (payload.old as {
                    message_id?: string;
                    user_id?: string;
                    emoji?: string;
                  })
                : (payload.new as {
                    message_id?: string;
                    user_id?: string;
                    emoji?: string;
                  });
            handleReaction(
              row,
              payload.eventType === "DELETE"
                ? "DELETE"
                : payload.eventType === "UPDATE"
                  ? "UPDATE"
                  : "INSERT"
            );
          }
        )
        .subscribe((subStatus) => {
          if (disposed) return;
          if (subStatus === "SUBSCRIBED") {
            const wasReconnect = reconnectAttempt > 0;
            reconnectAttempt = 0;
            if (wasReconnect) {
              handleResync();
            }
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

      channelRef.current = channel;
    }

    void start();

    return () => {
      disposed = true;
      clearReconnect();
      const active = channelRef.current;
      channelRef.current = null;
      if (active) {
        void supabase.removeChannel(active);
      }
    };
  }, [conversationId, currentUserId, enabled]);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    let disposed = false;
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

      if (inboxChannelRef.current) {
        await supabase.removeChannel(inboxChannelRef.current);
        inboxChannelRef.current = null;
      }

      const channel = supabase
        .channel(`messenger-inbox:${currentUserId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "conversation_participants",
            filter: `user_id=eq.${currentUserId}`,
          },
          (payload) => {
            handleInboxParticipant(payload.new as InboxParticipantRow);
          }
        )
        .subscribe((subStatus) => {
          if (disposed) return;
          if (subStatus === "SUBSCRIBED") {
            reconnectAttempt = 0;
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

      inboxChannelRef.current = channel;
    }

    void start();

    return () => {
      disposed = true;
      clearReconnect();
      const active = inboxChannelRef.current;
      inboxChannelRef.current = null;
      if (active) {
        void supabase.removeChannel(active);
      }
    };
  }, [currentUserId]);
}
