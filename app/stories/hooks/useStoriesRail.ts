"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listActiveStoriesAction } from "../../actions/stories";
import type { StoryRailGroup } from "../../../lib/stories/types";
import { STORY_ERRORS } from "../../../lib/stories/errors";
import { createClient } from "../../../lib/supabase/client";

export type UseStoriesRailResult = {
  groups: StoryRailGroup[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markStoryViewedLocally: (ownerId: string, storyId: string) => void;
  removeStoryLocally: (storyId: string) => void;
};

/**
 * Loads the Story rail and keeps it fresh via Supabase Realtime
 * (INSERT/DELETE on public.stories). Cleanup removes the channel on unmount.
 */
export function useStoriesRail(enabled: boolean): UseStoriesRailResult {
  const [groups, setGroups] = useState<StoryRailGroup[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const generationRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setGroups([]);
      setLoading(false);
      setError(null);
      return;
    }

    const generation = ++generationRef.current;
    setLoading(true);
    setError(null);

    const result = await listActiveStoriesAction();
    if (generation !== generationRef.current) return;

    if (!result.ok) {
      setError(result.message || STORY_ERRORS.loadFailed);
      setLoading(false);
      return;
    }

    setGroups(result.groups);
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const supabase = createClient();
    const channel = supabase
      .channel(`stories-rail:${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "stories" },
        () => {
          if (!cancelled) void refresh();
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "stories" },
        () => {
          if (!cancelled) void refresh();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [enabled, refresh]);

  const markStoryViewedLocally = useCallback(
    (ownerId: string, storyId: string) => {
      setGroups((prev) =>
        prev.map((group) => {
          if (group.ownerId !== ownerId) return group;
          const stories = group.stories.map((s) =>
            s.id === storyId ? { ...s, viewedByMe: true } : s
          );
          return {
            ...group,
            stories,
            hasUnread: stories.some((s) => !s.viewedByMe),
          };
        })
      );
    },
    []
  );

  const removeStoryLocally = useCallback((storyId: string) => {
    setGroups((prev) =>
      prev
        .map((group) => {
          const stories = group.stories.filter((s) => s.id !== storyId);
          if (stories.length === 0) return null;
          return {
            ...group,
            stories,
            hasUnread: stories.some((s) => !s.viewedByMe),
            latestCreatedAt: stories.reduce(
              (max, s) =>
                Date.parse(s.createdAt) > Date.parse(max) ? s.createdAt : max,
              stories[0]!.createdAt
            ),
          };
        })
        .filter((g): g is StoryRailGroup => g != null)
    );
  }, []);

  return {
    groups,
    loading,
    error,
    refresh,
    markStoryViewedLocally,
    removeStoryLocally,
  };
}
