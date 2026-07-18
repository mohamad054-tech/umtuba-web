import type { SupabaseClient } from "@supabase/supabase-js";
import {
  VIDEO_COMMERCE_EVENT_TYPES,
  type VideoCommerceEventType,
} from "./videoCommerce";

type AnyClient = SupabaseClient;

export type RecordVideoCommerceEventInput = {
  eventType: VideoCommerceEventType;
  postId: number;
  productId?: string | null;
  clientEventId?: string | null;
  metadata?: Record<string, unknown>;
  userId?: string | null;
};

function isEventType(value: string): value is VideoCommerceEventType {
  return (VIDEO_COMMERCE_EVENT_TYPES as readonly string[]).includes(value);
}

/**
 * Persist a Watch commerce analytics event. Fail-soft: never throws to callers.
 */
export async function recordVideoCommerceEvent(
  supabase: AnyClient,
  input: RecordVideoCommerceEventInput
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isEventType(input.eventType)) {
    return { ok: false, message: "Unknown event type." };
  }
  if (!Number.isFinite(input.postId) || input.postId <= 0) {
    return { ok: false, message: "Invalid post." };
  }

  const { error } = await supabase.from("video_commerce_events").insert({
    event_type: input.eventType,
    post_id: input.postId,
    product_id: input.productId ?? null,
    user_id: input.userId ?? null,
    client_event_id: input.clientEventId?.trim() || null,
    metadata: input.metadata ?? {},
  });

  if (error) {
    // Unique client_event_id races are success for idempotency.
    if (error.code === "23505") {
      return { ok: true };
    }
    console.error("recordVideoCommerceEvent", error);
    return { ok: false, message: "Unable to record event." };
  }

  return { ok: true };
}
