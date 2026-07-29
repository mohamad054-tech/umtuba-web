import Link from "next/link";
import {
  ContentCard,
  ContentCardEmptyState,
  ContentCardSkeleton,
} from "../../components/content-cards";
import type { ContentCardViewModel } from "../../../lib/content/cards";
import { APP_ROUTES } from "../../lib/nav";
import { applyProfileAllTimelineContract } from "../lib/profileAllTimelineContract";
import {
  PROFILE_EMPTY_STATES_COPY,
  shouldShowOwnerEmptyCreateActions,
} from "../lib/profileEmptyStates";
import ProfilePinnedRail from "./ProfilePinnedRail";

type ProfileAllPanelProps = {
  cards: ContentCardViewModel[];
  /** Explicit pins (structure readiness). Falls back to cards marked pinned. */
  pinnedCards?: ContentCardViewModel[];
  loadFailed?: boolean;
  onRetry?: () => void;
  isOwner?: boolean;
};

/**
 * Profile All — pinned rail (optional) + unified chronological feed.
 * Empty States V1: visitor copy vs owner create CTAs (§18).
 */
export default function ProfileAllPanel({
  cards,
  pinnedCards,
  loadFailed = false,
  onRetry,
  isOwner = false,
}: ProfileAllPanelProps) {
  if (loadFailed) {
    return (
      <div className="space-y-3">
        <div
          role="status"
          className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
        >
          Content couldn&apos;t be loaded right now.
        </div>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-white/80 transition hover:bg-white/10"
          >
            Try again
          </button>
        ) : null}
      </div>
    );
  }

  const { pinned, chronology, showPinnedRail } = applyProfileAllTimelineContract(
    {
      cards,
      pinned: pinnedCards,
    }
  );

  if (!showPinnedRail && chronology.length === 0) {
    const showOwnerActions = shouldShowOwnerEmptyCreateActions(isOwner);
    return (
      <ContentCardEmptyState
        title={PROFILE_EMPTY_STATES_COPY.allTitle}
        description={
          showOwnerActions
            ? PROFILE_EMPTY_STATES_COPY.allOwnerDescription
            : PROFILE_EMPTY_STATES_COPY.allVisitorDescription
        }
        action={
          showOwnerActions ? (
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href={APP_ROUTES.createArticle}
                className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black transition hover:bg-white/90"
              >
                {PROFILE_EMPTY_STATES_COPY.writeArticleCta}
              </Link>
              <Link
                href={APP_ROUTES.createVideo}
                className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-white/85 transition hover:bg-white/10"
              >
                {PROFILE_EMPTY_STATES_COPY.uploadVideoCta}
              </Link>
            </div>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {showPinnedRail ? <ProfilePinnedRail cards={pinned} /> : null}
      {chronology.length > 0 ? (
        <ul
          className="mx-auto grid max-w-[45rem] gap-3"
          aria-label="All content"
        >
          {chronology.map((card) => (
            <li key={card.registryId}>
              <ContentCard card={card} showCreator={false} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export { ContentCardSkeleton };
