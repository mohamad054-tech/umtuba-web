"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase/client";
import { getProfileForUser } from "../../lib/supabase/auth";
import {
  MOBILE_BOTTOM_NAV_MAX_CLASS,
  MOBILE_BOTTOM_NAV_OFFSET_VAR,
  MOBILE_PRIMARY_NAV_ITEMS,
  isMobilePrimaryNavActive,
  resolveMobileProfileHref,
  shouldShowMobileBottomNav,
  type MobilePrimaryNavId,
} from "../lib/nav/mobileNav";
import { mobileNavLabelKey } from "../../lib/i18n";
import { useTranslation } from "./i18n";

function NavIcon({ id, active }: { id: MobilePrimaryNavId; active: boolean }) {
  const stroke = active ? "currentColor" : "currentColor";
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (id) {
    case "home":
      return (
        <svg {...common}>
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
        </svg>
      );
    case "sections":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "create":
      return (
        <svg {...common} strokeWidth={2.4}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "messages":
      return (
        <svg {...common}>
          <path d="M4 6h16v10H8l-4 3V6Z" />
        </svg>
      );
    case "profile":
      return (
        <svg {...common}>
          <circle cx="12" cy="9" r="3.5" />
          <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
        </svg>
      );
    default:
      return null;
  }
}

export default function AppMobileBottomNav() {
  const pathname = usePathname() || "/";
  const visible = shouldShowMobileBottomNav(pathname);
  const { t } = useTranslation();
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    if (!visible) {
      document.body.removeAttribute("data-mobile-bottom-nav");
      document.body.style.removeProperty(MOBILE_BOTTOM_NAV_OFFSET_VAR);
      return;
    }

    document.body.setAttribute("data-mobile-bottom-nav", "1");
    document.body.style.setProperty(
      MOBILE_BOTTOM_NAV_OFFSET_VAR,
      "calc(3.75rem + env(safe-area-inset-bottom, 0px))"
    );

    return () => {
      document.body.removeAttribute("data-mobile-bottom-nav");
      document.body.style.removeProperty(MOBILE_BOTTOM_NAV_OFFSET_VAR);
    };
  }, [visible]);

  useEffect(() => {
    let active = true;
    let subscription: { unsubscribe: () => void } | null = null;

    async function applyUser(user: User | null) {
      if (!active) return;
      if (!user) {
        setSignedIn(false);
        setProfileUsername(null);
        return;
      }
      setSignedIn(true);
      try {
        const profile = await getProfileForUser(user);
        if (!active) return;
        setProfileUsername(profile.username);
      } catch {
        if (!active) return;
        setProfileUsername(null);
      }
    }

    try {
      const supabase = createClient();
      void supabase.auth.getUser().then(({ data }) => {
        void applyUser(data.user ?? null);
      });
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        void applyUser(session?.user ?? null);
      });
      subscription = data.subscription;
    } catch {
      // Config/auth unavailable — Profile tab keeps login fallback href.
    }

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <nav
      aria-label={t("nav.primaryMobile")}
      style={{ bottom: "var(--analytics-consent-banner-offset, 0px)" }}
      className={`fixed inset-x-0 z-[70] border-t border-[#f0a93b]/20 bg-[#050510]/95 backdrop-blur-xl ${MOBILE_BOTTOM_NAV_MAX_CLASS}`}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-0.5 px-1 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))]">
        {MOBILE_PRIMARY_NAV_ITEMS.map((item) => {
          const href =
            item.id === "profile"
              ? resolveMobileProfileHref(profileUsername, { signedIn })
              : item.href;
          const active = isMobilePrimaryNavActive(pathname, item.id);
          const label = t(mobileNavLabelKey(item.id));
          const create = item.id === "create";

          return (
            <li key={item.id} className="min-w-0 flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                aria-label={label}
                className={`watch-focus-ring flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-bold transition ${
                  create
                    ? "text-[#f0a93b]"
                    : active
                      ? "text-[#f0a93b]"
                      : "text-white/55 hover:text-white/80"
                }`}
              >
                <span
                  className={`flex items-center justify-center rounded-full ${
                    create
                      ? "h-10 w-10 bg-[#f0a93b] text-[#0c1842]"
                      : `h-7 w-7 ${active ? "text-[#f0a93b]" : "text-white/60"}`
                  }`}
                >
                  <NavIcon id={item.id} active={active} />
                </span>
                {create ? null : <span className="truncate">{label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
