"use client";

import Link from "next/link";
import { useTranslation } from "../../components/i18n";
import { APP_ROUTES, buildHomeCityFocusHref } from "../../lib/nav";
import { visibleDiscoverFeedLink } from "../discoverFeedLink";
import type { DiscoverFeedLink } from "../types";

type DiscoverLinkChipProps = {
  link?: DiscoverFeedLink | null;
};

/**
 * Gold chip above the name. Hidden unless the post carries a real place,
 * course, or product. There is no fallback city, course, or product.
 */
export default function DiscoverLinkChip({ link }: DiscoverLinkChipProps) {
  const { t } = useTranslation();
  const visible = visibleDiscoverFeedLink(link);
  if (!visible) return null;

  if (visible.kind === "place") {
    return (
      <Link
        href={buildHomeCityFocusHref(visible.city)}
        className="pointer-events-auto inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#f0a93b]/70 bg-[#f0a93b]/15 px-2.5 py-1 text-xs font-bold text-[#f0a93b]"
      >
        <PinIcon />
        <span className="truncate">{visible.city}</span>
        <span className="shrink-0">{t("home.link.explore")}</span>
      </Link>
    );
  }

  const href = visible.kind === "course" ? visible.href || APP_ROUTES.learning : visible.href || APP_ROUTES.store;

  return (
    <Link
      href={href}
      className="pointer-events-auto inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#f0a93b]/70 bg-[#f0a93b]/15 px-2.5 py-1 text-xs font-bold text-[#f0a93b]"
    >
      <span className="truncate">{visible.title}</span>
    </Link>
  );
}

function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
    </svg>
  );
}
