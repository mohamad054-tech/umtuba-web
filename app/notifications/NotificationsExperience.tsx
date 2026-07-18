"use client";

import Link from "next/link";
import { useCallback } from "react";
import type { AppNotification } from "../../lib/supabase/notifications";
import ProductEmptyState from "../components/product/ProductEmptyState";
import ProductErrorState from "../components/product/ProductErrorState";
import { APP_ROUTES } from "../lib/nav";
import { sanitizeUserFacingMessage } from "../lib/product/userFacingMessage";
import { useNotifications } from "./hooks/useNotifications";
import NotificationListItem from "./components/NotificationListItem";
import NotificationsSkeleton from "./components/NotificationsSkeleton";
import { NOTIFICATION_FILTERS } from "./lib/notificationCategories";

export default function NotificationsExperience() {
  const {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    error,
    hasMore,
    category,
    setCategory,
    realtimeState,
    refresh,
    loadMore,
    markRead,
    markAllRead,
  } = useNotifications(true);

  const onOpen = useCallback(
    (notification: AppNotification) => {
      if (notification.unread) {
        void markRead(notification.id);
      }
    },
    [markRead]
  );

  return (
    <section className="flex flex-1 flex-col rounded-[28px] border border-white/10 bg-[#080816]/70 p-4 backdrop-blur-xl md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            Inbox
          </p>
          <h2 className="mt-0.5 text-lg font-black tracking-tight">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`${APP_ROUTES.settings}?section=notifications`}
            className="watch-focus-ring rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Settings
          </Link>
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
              realtimeState === "live"
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                : realtimeState === "connecting"
                  ? "border-amber-400/30 bg-amber-500/10 text-amber-100"
                  : "border-white/10 bg-white/5 text-white/40"
            }`}
          >
            {realtimeState === "live"
              ? "Live"
              : realtimeState === "connecting"
                ? "Connecting"
                : "Offline"}
          </span>
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={unreadCount <= 0}
            className="watch-focus-ring rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Mark all read
          </button>
        </div>
      </div>

      <div
        className="mt-4 flex gap-1.5 overflow-x-auto pb-1"
        role="tablist"
        aria-label="Notification filters"
      >
        {NOTIFICATION_FILTERS.map((filter) => {
          const active = category === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setCategory(filter.id)}
              className={`watch-focus-ring shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                active
                  ? "border-blue-400/40 bg-blue-500/20 text-blue-100"
                  : "border-white/10 bg-white/5 text-white/55 hover:bg-white/10 hover:text-white"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex-1">
        {loading ? <NotificationsSkeleton /> : null}

        {!loading && error ? (
          <div className="flex justify-center py-4">
            <ProductErrorState
              compact
              title="Couldn’t load notifications"
              message={sanitizeUserFacingMessage(error)}
              onRetry={() => void refresh()}
            />
          </div>
        ) : null}

        {!loading && !error && notifications.length === 0 ? (
          <div className="flex justify-center py-2">
            <ProductEmptyState
              compact
              eyebrow="Inbox"
              title={
                category === "all"
                  ? "No notifications yet"
                  : `No ${category} notifications`
              }
              description="Social, Journey, Live, Rewards, and AI insights show up here."
              primaryHref={APP_ROUTES.discover}
              primaryLabel="Explore Discover"
              secondaryHref={`${APP_ROUTES.settings}?section=notifications`}
              secondaryLabel="Notification settings"
            />
          </div>
        ) : null}

        {!loading && !error && notifications.length > 0 ? (
          <div className="space-y-2.5">
            {notifications.map((notification) => (
              <NotificationListItem
                key={notification.id}
                notification={notification}
                onOpen={onOpen}
              />
            ))}

            {hasMore ? (
              <div className="pt-3 text-center">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="watch-focus-ring rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            ) : (
              <p className="pt-3 text-center text-[11px] font-medium text-white/30">
                End of notifications
              </p>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
