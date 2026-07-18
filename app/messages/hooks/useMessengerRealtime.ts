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
};

export function useMessengerRealtime({
  conversationId,
  currentUserId,
  enabled = true,
  onMessageInsert,
  onMessageUpdate,
  onReactionsChange,
}: UseMessengerRealtimeOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

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

  useEffect(() => {
    if (!enabled || !conversationId || !currentUserId) {
      return;
    }

    const supabase = createClient();
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
      .subscribe();

    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, enabled]);
}
