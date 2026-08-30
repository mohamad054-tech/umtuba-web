"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  MOBILE_BOTTOM_NAV_MAX_CLASS,
  MOBILE_BOTTOM_NAV_OFFSET_VAR,
  MOBILE_PRIMARY_NAV_ITEMS,
  isMobilePrimaryNavActive,
  shouldShowMobileBottomNav,
  type MobilePrimaryNavId,
} from "../lib/nav/mobileNav";
import {
  resolveUmLifeActivityBadge,
} from "../lib/nav/umLifeHomeEntry";
import { mobileNavLabelKey } from "../../lib/i18n";
import { useTranslation } from "./i18n";
import UmLifeIcon from "./nav/UmLifeIcon";

function NavIcon({ id }: { id: MobilePrimaryNavId; active: boolean }) {
  const common = {
    width: 22,
    height: 22,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (id) {
    case "watch":
      return (
        <svg {...common}>
          <rect x="3.5" y="5.5" width="17" height="13" rx="3" />
          <path d="M10 9.2 16 12l-6 2.8V9.2Z" />
        </svg>
      );
    case "umLife":
      return <UmLifeIcon />;
    case "create":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.2" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
    case "learning":
      return (
        <svg {...common}>
          <path d="M4.5 7.5 12 5l7.5 2.5v8.2L12 18.5 4.5 15.7V7.5Z" />
          <path d="M12 5v13.5" />
          <path d="M8 10.2c1.2.6 2.6.9 4 .9s2.8-.3 4-.9" />
        </svg>
      );
    case "store":
      return (
        <svg {...common}>
          <path d="M6.2 9.2 7.4 19h9.2l1.2-9.8H6.2Z" />
          <path d="M9 9.2V7.6a3 3 0 0 1 6 0v1.6" />
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
  const umLifeBadge = resolveUmLifeActivityBadge();

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

  if (!visible) {
    return null;
  }

  return (
    <nav
      aria-label={t("nav.primaryMobile")}
      className={`fixed inset-x-0 bottom-0 z-[70] border-t border-white/10 bg-[#050510]/95 backdrop-blur-xl ${MOBILE_BOTTOM_NAV_MAX_CLASS}`}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-0 px-0.5 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))]">
        {MOBILE_PRIMARY_NAV_ITEMS.map((item) => {
          const active = isMobilePrimaryNavActive(pathname, item.id);
          const label =
            item.id === "umLife" ? t("nav.umLife") : t(mobileNavLabelKey(item.id));
          const ariaLabel =
            item.id === "umLife" ? t("nav.umLifeAria") : label;
          const badgeCount =
            item.id === "umLife" ? umLifeBadge.count : null;

          return (
            <li key={item.id} className="min-w-0 flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={ariaLabel}
                className={`watch-focus-ring flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 py-1 text-[10px] font-bold transition ${
                  active
                    ? "text-blue-100"
                    : "text-white/45 hover:text-white/80"
                }`}
              >
                <span
                  className={`relative flex h-7 w-7 items-center justify-center rounded-full ${
                    active ? "bg-blue-500/20 text-blue-100" : "text-white/55"
                  }`}
                >
                  <NavIcon id={item.id} active={active} />
                  {badgeCount != null ? (
                    <span
                      className="absolute -end-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-blue-500 px-1 text-[9px] font-black text-white"
                      aria-hidden
                    >
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  ) : null}
                </span>
                <span className="max-w-full truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
