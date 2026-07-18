"use server";

import { createClient, getServerUser } from "../../lib/supabase/server";
import { recordVideoCommerceEvent } from "../../lib/store/videoCommerceAnalytics";
import { listPublicVideoShopShelf } from "../../lib/store/videoCommerceQueries";
import type {
  VideoCommerceEventType,
  VideoShopShelfItem,
} from "../../lib/store/videoCommerce";

export async function getVideoShopShelfAction(
  postId: number
): Promise<{ items: VideoShopShelfItem[]; error: string | null }> {
  const supabase = await createClient();
  return listPublicVideoShopShelf(supabase, postId);
}

export async function recordVideoCommerceEventAction(input: {
  eventType: VideoCommerceEventType;
  postId: number;
  productId?: string | null;
  clientEventId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const user = await getServerUser();
  const result = await recordVideoCommerceEvent(supabase, {
    ...input,
    userId: user?.id ?? null,
  });
  return { ok: result.ok };
}
