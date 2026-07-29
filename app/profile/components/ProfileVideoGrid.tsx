import Link from "next/link";
import type { ProfileVideo } from "../types";
import { APP_ROUTES } from "../../lib/nav";
import ProductEmptyState from "../../components/product/ProductEmptyState";
import { CREATOR_SPACE_COPY } from "../lib/profileCreatorSpaceIa";
import {
  PROFILE_EMPTY_STATES_COPY,
  shouldShowOwnerEmptyCreateActions,
} from "../lib/profileEmptyStates";

type ProfileVideoGridProps = {
  videos: ProfileVideo[];
  hasMore?: boolean;
  loadFailed?: boolean;
  isOwner?: boolean;
};

export default function ProfileVideoGrid({
  videos,
  hasMore = false,
  loadFailed = false,
  isOwner = false,
}: ProfileVideoGridProps) {
  if (loadFailed) {
    return (
      <ProductEmptyState
        compact
        eyebrow="Videos"
        title="Couldn't load videos"
        description="Something went wrong loading this creator's videos. Please try again."
        primaryHref={APP_ROUTES.discover}
        primaryLabel={PROFILE_EMPTY_STATES_COPY.openDiscoverCta}
      />
    );
  }

  if (videos.length === 0) {
    const showOwnerActions = shouldShowOwnerEmptyCreateActions(isOwner);
    return (
      <ProductEmptyState
        compact
        eyebrow="Videos"
        title={PROFILE_EMPTY_STATES_COPY.videosTitle}
        description={
          showOwnerActions
            ? PROFILE_EMPTY_STATES_COPY.videosOwnerDescription
            : PROFILE_EMPTY_STATES_COPY.videosVisitorDescription
        }
        primaryHref={
          showOwnerActions ? APP_ROUTES.createVideo : APP_ROUTES.discover
        }
        primaryLabel={
          showOwnerActions
            ? PROFILE_EMPTY_STATES_COPY.uploadVideoCta
            : PROFILE_EMPTY_STATES_COPY.openDiscoverCta
        }
        secondaryHref={showOwnerActions ? APP_ROUTES.discover : undefined}
        secondaryLabel={
          showOwnerActions ? PROFILE_EMPTY_STATES_COPY.openDiscoverCta : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4">
        {videos.map((video) => {
          const card = (
            <article className="group overflow-hidden rounded-[22px] border border-white/10 bg-[#080816]/70 transition hover:border-white/20">
              <div
                className={`relative aspect-[3/4] overflow-hidden bg-gradient-to-br ${video.gradient}`}
              >
                {video.previewUrl ? (
                  <video
                    src={video.previewUrl}
                    className="absolute inset-0 h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                    aria-hidden
                  />
                ) : (
                  <div
                    className={`absolute inset-x-6 top-8 h-16 rounded-full blur-2xl ${video.accent}`}
                  />
                )}
                {video.durationLabel ? (
                  <span className="absolute right-2 top-2 rounded-full border border-white/10 bg-black/50 px-2 py-0.5 text-[10px] font-bold text-white/80 backdrop-blur-sm">
                    {video.durationLabel}
                  </span>
                ) : null}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-3 pt-10">
                  <p className="line-clamp-2 text-xs font-bold leading-4 text-white sm:text-sm">
                    {video.title}
                  </p>
                  <p className="mt-1 text-[11px] text-white/55">
                    {video.viewsLabel} views
                    {video.likesLabel ? ` · ${video.likesLabel} likes` : ""}
                  </p>
                </div>
              </div>
            </article>
          );

          return (
            <li key={video.id}>
              {video.href ? (
                <Link
                  href={video.href}
                  className="watch-focus-ring block rounded-[22px]"
                  aria-label={`Watch ${video.title}`}
                >
                  {card}
                </Link>
              ) : (
                card
              )}
            </li>
          );
        })}
      </ul>
      {hasMore ? (
        <p className="text-center text-xs text-white/40">
          {CREATOR_SPACE_COPY.videosShowingLatest}
        </p>
      ) : null}
    </div>
  );
}
