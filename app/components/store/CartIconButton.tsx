"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { getCartItemCountAction } from "../../actions/storeCart";
import { createClient } from "../../../lib/supabase/client";
import { APP_ROUTES } from "../../lib/nav";
import UnreadBadge from "../../messages/components/UnreadBadge";

export default function CartIconButton() {
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
      const result = await getCartItemCountAction();
      if (!disposed && result.ok) setCount(result.count);
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
        void getCartItemCountAction().then((result) => {
          if (result.ok) setCount(result.count);
        });
      });
    });

    function onCartUpdated(event: Event) {
      const custom = event as CustomEvent<{ count?: number }>;
      if (typeof custom.detail?.count === "number") {
        setCount(custom.detail.count);
        return;
      }
      startTransition(() => {
        void getCartItemCountAction().then((result) => {
          if (result.ok) setCount(result.count);
        });
      });
    }

    window.addEventListener("umtuba:cart-updated", onCartUpdated);

    return () => {
      disposed = true;
      subscription.unsubscribe();
      window.removeEventListener("umtuba:cart-updated", onCartUpdated);
    };
  }, []);

  const href = authed
    ? APP_ROUTES.storeCart
    : `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.storeCart)}`;

  return (
    <Link
      href={href}
      aria-label={
        count > 0 ? `Cart, ${count} items` : "Cart"
      }
      className="watch-focus-ring relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-violet-400/25 bg-violet-500/10 text-violet-100 transition hover:bg-violet-500/20"
    >
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
          d="M3 3h2l.4 2M7 13h10l3-8H6.4M7 13l-1.2 6h12.4M7 13l-.6-3M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm8 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
        />
      </svg>
      <span className="absolute -right-1 -top-1">
        <UnreadBadge count={count} />
      </span>
    </Link>
  );
}
