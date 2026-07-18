"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { tryCreateClient } from "../../../lib/supabase/client";
import { APP_ROUTES } from "../../lib/nav";

type JoinBetaLinkProps = {
  className?: string;
  children: ReactNode;
};

/**
 * Landing "Join Beta" CTA.
 * - Signed out → /signup (beta registration; /register redirects here)
 * - Signed in → /discover (already in the product)
 * Preserves caller styles; does not alter landing design.
 */
export default function JoinBetaLink({
  className,
  children,
}: JoinBetaLinkProps) {
  const [href, setHref] = useState<string>(APP_ROUTES.signup);

  useEffect(() => {
    let cancelled = false;
    const supabase = tryCreateClient();
    if (!supabase) {
      return;
    }

    void supabase.auth.getUser().then(({ data }) => {
      if (cancelled) {
        return;
      }

      if (data.user) {
        setHref(APP_ROUTES.discover);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
