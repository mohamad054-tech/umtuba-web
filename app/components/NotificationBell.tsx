"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { getUnreadNotificationCountAction } from "../actions/notifications";
import { createClient } from "../../lib/supabase/client";
import { APP_ROUTES } from "../lib/nav";
import UnreadBadge from "../messages/components/UnreadBadge";

export default function NotificationBell() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [authed, setAuthed] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let disposed = false;
    const supabase = createClient();

    async function boot() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (disposed) return;
      if (!user) {
        setAuthed(false);
        setCount(0);
        return;
      }
      setAuthed(true);
      const result = await getUnreadNotificationCountAction();
      if (!disposed && result.ok) {
        setCount(result.count);
      }
    }

    void boot();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setAuthed(false);
        setCount(0);
        return;
      }
      setAuthed(true);
      startTransition(() => {
        void getUnreadNotificationCountAction().then((result) => {
          if (result.ok) setCount(result.count);
        });
      });
    });

    return () => {
      disposed = true;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authed) return;

    let disposed = false;
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || disposed) return;

      channel = supabase
        .channel(`notifications-bell:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${user.id}`,
          },
          () => {
            setCount((c) => c + 1);
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
          () => {
            void getUnreadNotificationCountAction().then((result) => {
              if (result.ok) setCount(result.count);
            });
          }
        )
        .subscribe();
    })();

    return () => {
      disposed = true;
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [authed]);

  if (!authed) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(APP_ROUTES.notifications)}`}
        className="watch-focus-ring relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
        aria-label="Sign in to view notifications"
        title="Notifications"
      >
        <BellIcon />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => router.push(APP_ROUTES.notifications)}
      className="watch-focus-ring relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
      aria-label={
        count > 0
          ? `Notifications, ${count} unread`
          : "Notifications"
      }
      title="Notifications"
    >
      <BellIcon />
      <span className="absolute -right-1 -top-1">
        <UnreadBadge count={count} />
      </span>
    </button>
  );
}

function BellIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9"
      />
    </svg>
  );
}
