"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getVideoShopShelfAction,
  recordVideoCommerceEventAction,
} from "../../../actions/videoCommerce";
import {
  filterShelfItemsAtTime,
  type VideoShopShelfItem,
} from "../../../../lib/store/videoCommerce";

/**
 * Loads shelf for the active post and filters by playhead.
 * Side-loads only — never blocks the video element.
 */
export function useVideoShopShelf(
  postId: number | null | undefined,
  currentTimeMs: number
) {
  const [items, setItems] = useState<VideoShopShelfItem[]>([]);
  const [loading, setLoading] = useState(false);
  const badgeShownRef = useRef<Set<number>>(new Set());
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (postId == null) {
      setItems([]);
      return;
    }

    const requestId = ++requestIdRef.current;
    setLoading(true);

    void getVideoShopShelfAction(postId).then((result) => {
      if (requestId !== requestIdRef.current) {
        return;
      }
      setItems(result.items);
      setLoading(false);
    });
  }, [postId]);

  const activeItems = useMemo(
    () => filterShelfItemsAtTime(items, currentTimeMs),
    [items, currentTimeMs]
  );

  useEffect(() => {
    if (postId == null || activeItems.length === 0) {
      return;
    }
    if (badgeShownRef.current.has(postId)) {
      return;
    }
    badgeShownRef.current.add(postId);
    void recordVideoCommerceEventAction({
      eventType: "badge_shown",
      postId,
      clientEventId: `bs-${postId}-${Date.now()}`,
      metadata: { count: activeItems.length },
    });
  }, [postId, activeItems.length]);

  return {
    items,
    activeItems,
    activeCount: activeItems.length,
    loading,
  };
}
