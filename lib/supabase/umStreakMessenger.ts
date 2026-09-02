import type { SupabaseClient } from "@supabase/supabase-js";
import type { Message, UmStreakViewerView } from "../../app/messages/types";
import { mapMessengerMessageRow } from "../../app/messages/lib/mapMessage";
import { utcDayKey } from "../umStreak/calendar";
import { viewerStatus } from "../umStreak/engine";
import type { UmStreakRecord } from "../umStreak/types";
import type { ActionResult } from "./messenger";

export async function sendVisualMessage(
  supabase: SupabaseClient,
  currentUserId: string,
  input: {
    conversationId: string;
    storagePath: string;
    mimeType: string;
    mediaType: "image" | "video";
    caption?: string | null;
    clientId?: string | null;
    byteSize?: number | null;
  }
): Promise<ActionResult<{ message: Message }>> {
  const { data, error } = await supabase.rpc("send_um_visual_message", {
    p_conversation_id: input.conversationId,
    p_storage_path: input.storagePath,
    p_mime_type: input.mimeType,
    p_media_type: input.mediaType,
    p_caption: input.caption ?? null,
    p_client_id: input.clientId ?? null,
    p_byte_size: input.byteSize ?? null,
    p_width: null,
    p_height: null,
    p_duration_ms: null,
    p_expiration_policy: "view_once",
  });

  if (error) {
    const text = (error.message || "").toLowerCase();
    if (text.includes("blocked")) {
      return { ok: false, message: "You cannot send a visual message to this person." };
    }
    if (text.includes("could not find") || text.includes("does not exist")) {
      return {
        ok: false,
        message:
          "UM Streak visual send is not available until the candidate migration is applied locally.",
      };
    }
    return { ok: false, message: "Unable to send visual message." };
  }

  const mapped = mapMessengerMessageRow(
    data as Parameters<typeof mapMessengerMessageRow>[0],
    currentUserId
  );
  if (!mapped) {
    return { ok: false, message: "Unable to send visual message." };
  }
  return { ok: true, message: mapped };
}

export async function openVisualMessage(
  supabase: SupabaseClient,
  currentUserId: string,
  messageId: string
): Promise<ActionResult<{ message: Message; signedUrl: string | null }>> {
  const { data: existing } = await supabase
    .from("messages")
    .select(
      "id, conversation_id, sender_id, body, message_type, created_at, deleted_at, deleted_for, edited_at, reply_to_message_id, client_id, visual_opened_at, visual_expires_at, visual_expiration_policy"
    )
    .eq("id", messageId)
    .maybeSingle();

  if (
    existing?.visual_opened_at &&
    existing.sender_id !== currentUserId
  ) {
    const mapped = mapMessengerMessageRow(
      existing as Parameters<typeof mapMessengerMessageRow>[0],
      currentUserId
    );
    if (!mapped) {
      return { ok: false, message: "Unable to open visual message." };
    }
    return { ok: true, message: mapped, signedUrl: null };
  }

  const { data: attachment } = await supabase
    .from("message_attachments")
    .select("storage_bucket, storage_path")
    .eq("message_id", messageId)
    .maybeSingle();

  let signedUrl: string | null = null;
  if (attachment?.storage_bucket && attachment.storage_path) {
    const signed = await supabase.storage
      .from(attachment.storage_bucket)
      .createSignedUrl(attachment.storage_path, 90);
    signedUrl = signed.data?.signedUrl ?? null;
  }

  const { data, error } = await supabase.rpc("open_um_visual_message", {
    p_message_id: messageId,
  });

  if (error) {
    const text = (error.message || "").toLowerCase();
    if (text.includes("blocked")) {
      return { ok: false, message: "This visual message is not available." };
    }
    if (text.includes("could not find") || text.includes("does not exist")) {
      return {
        ok: false,
        message:
          "View-once open is not available until the candidate migration is applied locally.",
      };
    }
    return { ok: false, message: "Unable to open visual message." };
  }

  const mapped = mapMessengerMessageRow(
    data as Parameters<typeof mapMessengerMessageRow>[0],
    currentUserId
  );
  if (!mapped) {
    return { ok: false, message: "Unable to open visual message." };
  }

  if (mapped.visual?.viewed && mapped.senderId !== currentUserId) {
    mapped.visual = {
      ...mapped.visual,
      previewUrl: signedUrl,
    };
  }

  return { ok: true, message: mapped, signedUrl };
}

export async function getConversationUmStreak(
  supabase: SupabaseClient,
  currentUserId: string,
  conversationId: string
): Promise<ActionResult<{ streak: UmStreakViewerView | null }>> {
  const { data, error } = await supabase.rpc("get_um_streak_for_conversation", {
    p_conversation_id: conversationId,
  });

  if (error) {
    const text = (error.message || "").toLowerCase();
    if (text.includes("could not find") || text.includes("does not exist")) {
      return { ok: true, streak: null };
    }
    return { ok: false, message: "Unable to load UM Streak." };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return { ok: true, streak: null };
  }

  const record: UmStreakRecord = {
    pairKey: row.pair_key,
    userLowId: row.user_low_id,
    userHighId: row.user_high_id,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    lastQualifyingDayLow: row.last_qualifying_day_low,
    lastQualifyingDayHigh: row.last_qualifying_day_high,
    lastCompletedStreakDay: row.last_completed_streak_day,
    streakState: row.streak_state,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return {
    ok: true,
    streak: viewerStatus(record, currentUserId, utcDayKey(new Date())),
  };
}
