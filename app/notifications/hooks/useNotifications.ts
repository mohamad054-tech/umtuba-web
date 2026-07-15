"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import {
  mapNotificationRow,
  type AppNotification,
  type NotificationFilterCategory,
} from "../../../lib/supabase/notifications";
import {
  getUnreadNotificationCountAction,
  listNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "../../actions/notifications";
import { notificationMatchesFilter } from "../lib/notificationCategories";

const PAGE_SIZE = 20;
const RECONNECT_BASE_MS = 1200;
const RECONNECT_MAX_MS = 12_000;

export type UseNotificationsResult = {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  category: NotificationFilterCategory;
  setCategory: (category: NotificationFilterCategory) => void;
  realtimeState: "connecting" | "live" | "offline";
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

export function useNotifications(enabled: boolean): UseNotificationsResult {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [category, setCategoryState] =
    useState<NotificationFilterCategory>("all");
  const [realtimeState, setRealtimeState] = useState<
    "connecting" | "live" | "offline"
  >("connecting");

  const cursorRef = useRef<string | null>(null);
  const categoryRef = useRef<NotificationFilterCategory>("all");
  const generationRef = useRef(0);

  const refresh = useCallback(async () => {
    const generation = ++generationRef.current;
    const activeCategory = categoryRef.current;
    setLoading(true);
    setError(null);

    const [listResult, countResult] = await Promise.all([
      listNotificationsAction({
        limit: PAGE_SIZE,
        category: activeCategory,
      }),
      getUnreadNotificationCountAction(),
    ]);

    if (generation !== generationRef.current) {
      return;
    }

    if (!listResult.ok) {
      setError(listResult.message);
      setLoading(false);
      return;
    }

    setNotifications(listResult.notifications);
    cursorRef.current = listResult.nextCursor;
    setNextCursor(listResult.nextCursor);
    if (countResult.ok) {
      setUnreadCount(countResult.count);
    }
    setLoading(false);
  }, []);

  const setCategory = useCallback(
    (next: NotificationFilterCategory) => {
      categoryRef.current = next;
      setCategoryState(next);
      void refresh();
    },
    [refresh]
  );

  const loadMore = useCallback(async () => {
    const before = cursorRef.current;
    if (!before || loadingMore) {
      return;
    }

    setLoadingMore(true);
    const result = await listNotificationsAction({
      limit: PAGE_SIZE,
      before,
      category: categoryRef.current,
    });
    setLoadingMore(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setNotifications((prev) => {
      const seen = new Set(prev.map((n) => n.id));
      const merged = [...prev];
      for (const item of result.notifications) {
        if (!seen.has(item.id)) {
          merged.push(item);
        }
      }
      return merged;
    });
    cursorRef.current = result.nextCursor;
    setNextCursor(result.nextCursor);
  }, [loadingMore]);

  const markRead = useCallback(
    async (id: string) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                readAt: n.readAt ?? new Date().toISOString(),
                unread: false,
              }
            : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));

      const result = await markNotificationReadAction(id);
      if (!result.ok) {
        setError(result.message);
        void refresh();
      }
    },
    [refresh]
  );

  const markAllRead = useCallback(async () => {
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        readAt: n.readAt ?? new Date().toISOString(),
        unread: false,
      }))
    );
    setUnreadCount(0);

    const result = await markAllNotificationsReadAction();
    if (!result.ok) {
      setError(result.message);
      void refresh();
    }
  }, [refresh]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let disposed = false;
    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null =
      null;
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
      setRealtimeState("offline");
      reconnectTimer = window.setTimeout(() => {
        void start();
      }, delay);
    };

    async function start() {
      if (disposed) return;
      clearReconnect();
      setRealtimeState("connecting");

      if (channel) {
        await supabase.removeChannel(channel);
        channel = null;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (disposed) return;
      if (!user) {
        setRealtimeState("offline");
        return;
      }

      channel = supabase
        .channel(`notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${user.id}`,
          },
          (payload) => {
            if (disposed) return;
            const mapped = mapNotificationRow(
              payload.new as Record<string, unknown>
            );
            if (!mapped) return;
            if (
              !notificationMatchesFilter(mapped.type, categoryRef.current)
            ) {
              if (mapped.unread) {
                setUnreadCount((c) => c + 1);
              }
              return;
            }
            setNotifications((prev) => {
              if (prev.some((n) => n.id === mapped.id)) return prev;
              return [mapped, ...prev];
            });
            if (mapped.unread) {
              setUnreadCount((c) => c + 1);
            }
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${user.id}`,
          },
          (payload) => {
            if (disposed) return;
            const mapped = mapNotificationRow(
              payload.new as Record<string, unknown>
            );
            if (!mapped) return;
            setNotifications((prev) => {
              const next = prev.map((n) =>
                n.id === mapped.id
                  ? { ...n, ...mapped, actor: mapped.actor ?? n.actor }
                  : n
              );
              const unread = next.filter((n) => n.unread).length;
              setUnreadCount(unread);
              return next;
            });
          }
        )
        .subscribe((status) => {
          if (disposed) return;
          if (status === "SUBSCRIBED") {
            reconnectAttempt = 0;
            setRealtimeState("live");
            void refresh();
            return;
          }
          if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            scheduleReconnect();
          }
        });
    }

    void start();

    return () => {
      disposed = true;
      clearReconnect();
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [enabled, refresh]);

  return {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    error,
    hasMore: Boolean(nextCursor),
    category,
    setCategory,
    realtimeState,
    refresh,
    loadMore,
    markRead,
    markAllRead,
  };
}
