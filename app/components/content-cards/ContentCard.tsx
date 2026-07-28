"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  badgeLabel,
  detectTextDir,
  kindLabel,
  type ContentCardBadgeId,
  type ContentCardViewModel,
} from "../../../lib/content/cards";
import { buildCreatorProfileHref } from "../../lib/nav";

type ContentCardProps = {
  card: ContentCardViewModel;
  showCreator?: boolean;
};

function formatRelativeTime(iso: string | null, dir: "rtl" | "ltr"): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(dir === "rtl" ? "ar" : undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function BadgeChip({
  badge,
  dir,
}: {
  badge: ContentCardBadgeId;
  dir: "rtl" | "ltr";
}) {
  return (
    <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/70">
      {badgeLabel(badge, dir)}
    </span>
  );
}

export function ContentCardBadges({
  badges,
  dir,
}: {
  badges: ContentCardBadgeId[];
  dir: "rtl" | "ltr";
}) {
  if (!badges.length) return null;
  const shown = badges.slice(0, 3);
  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Status badges">
      {shown.map((badge) => (
        <BadgeChip key={badge} badge={badge} dir={dir} />
      ))}
    </div>
  );
}

export function ContentCardPreview({
  card,
  dir,
}: {
  card: ContentCardViewModel;
  dir: "rtl" | "ltr";
}) {
  const aspect =
    card.preview.aspect === "9:16"
      ? "aspect-[9/16] max-h-56"
      : card.preview.aspect === "1:1"
        ? "aspect-square max-h-52"
        : "aspect-video";
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 ${aspect} ${
        card.preview.gradientClass ?? "bg-white/5"
      }`}
      aria-hidden={card.preview.recipe === "gradient"}
    >
      {card.preview.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.preview.src}
          alt={card.preview.alt}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-end p-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/55">
            {kindLabel(String(card.kind), dir)}
          </p>
        </div>
      )}
      {card.preview.durationLabel ? (
        <span className="absolute bottom-2 end-2 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {card.preview.durationLabel}
        </span>
      ) : null}
    </div>
  );
}

export function ContentCardHeader({
  card,
  dir,
  showCreator,
}: {
  card: ContentCardViewModel;
  dir: "rtl" | "ltr";
  showCreator: boolean;
}) {
  const profileHref = buildCreatorProfileHref({
    username: card.creator.username,
  });
  const time = formatRelativeTime(card.publishedAt, dir);

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">
          {kindLabel(String(card.kind), dir)}
        </p>
        {showCreator ? (
          <Link
            href={profileHref}
            className="watch-focus-ring group inline-flex max-w-full items-center gap-2 rounded-lg"
            onClick={(event) => event.stopPropagation()}
          >
            {card.creator.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={card.creator.avatarUrl}
                alt=""
                className="h-7 w-7 rounded-full object-cover ring-1 ring-white/15"
              />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px] font-black">
                {card.creator.displayName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="truncate text-sm font-bold text-white/85 group-hover:text-white">
              {card.creator.displayName}
              {card.creator.verified ? (
                <span className="ms-1 text-sky-300" aria-label="Verified">
                  ✓
                </span>
              ) : null}
            </span>
          </Link>
        ) : null}
      </div>
      {time ? (
        <time
          dateTime={card.publishedAt ?? undefined}
          className="shrink-0 text-xs text-white/40"
        >
          {time}
        </time>
      ) : null}
    </div>
  );
}

export function ContentCardMetadata({
  card,
  dir,
}: {
  card: ContentCardViewModel;
  dir: "rtl" | "ltr";
}) {
  return <ContentCardBadges badges={card.badges} dir={dir} />;
}

export function ContentCardCTA({
  card,
}: {
  card: ContentCardViewModel;
}) {
  return (
    <span className="inline-flex items-center rounded-full border border-sky-300/30 bg-sky-500/15 px-3.5 py-1.5 text-xs font-bold text-sky-100 transition group-hover:bg-sky-500/25">
      {card.cta.label}
    </span>
  );
}

export function ContentCardSkeleton() {
  return (
    <div
      className="animate-pulse space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 motion-reduce:animate-none"
      aria-hidden
    >
      <div className="h-3 w-20 rounded bg-white/10" />
      <div className="aspect-video rounded-2xl bg-white/10" />
      <div className="h-4 w-3/4 rounded bg-white/10" />
      <div className="h-3 w-1/2 rounded bg-white/10" />
      <div className="h-8 w-28 rounded-full bg-white/10" />
    </div>
  );
}

export function ContentCardEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-5 py-10 text-center">
      <p className="text-sm font-bold text-white/70">{title}</p>
      {description ? (
        <p className="mt-2 text-sm text-white/45">{description}</p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export default function ContentCard({
  card,
  showCreator = true,
}: ContentCardProps) {
  const dir = detectTextDir(card.title);
  const ariaName = `${kindLabel(String(card.kind), dir)}: ${card.title} by ${card.creator.displayName}`;

  return (
    <article dir={dir} className="group">
      <Link
        href={card.canonicalHref}
        aria-label={ariaName}
        className="watch-focus-ring block space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition hover:border-white/20 hover:bg-white/[0.055] active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        <ContentCardHeader card={card} dir={dir} showCreator={showCreator} />
        <ContentCardPreview card={card} dir={dir} />
        <div className="space-y-1.5">
          <h3 className="text-base font-black tracking-tight text-white">
            {card.title}
          </h3>
          {card.summary ? (
            <p className="line-clamp-2 text-sm leading-6 text-white/55">
              {card.summary}
            </p>
          ) : null}
        </div>
        <ContentCardMetadata card={card} dir={dir} />
        <div className="flex items-center justify-end pt-1">
          <ContentCardCTA card={card} />
        </div>
      </Link>
    </article>
  );
}
