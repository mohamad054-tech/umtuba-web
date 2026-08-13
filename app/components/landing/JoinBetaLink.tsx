"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { tryCreateClient } from "../../../lib/supabase/client";
import { useTranslation } from "../i18n";
import { APP_ROUTES } from "../../lib/nav";

type JoinUmtubaLinkProps = {
  className?: string;
  /** Optional override; defaults to localized Join UMTUBA CTA (UAF-06). */
  children?: ReactNode;
};

/**
 * Landing join CTA (UAF-06).
 * - Signed out → /signup
 * - Signed in → /discover (already in the product)
 * Label via i18n (`landing.joinCta`); Arabic: انضم إلى أم طوبا.
 */
export default function JoinBetaLink({
  className,
  children,
}: JoinUmtubaLinkProps) {
  const { t } = useTranslation();
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
      {children ?? t("landing.joinCta")}
    </Link>
  );
}
