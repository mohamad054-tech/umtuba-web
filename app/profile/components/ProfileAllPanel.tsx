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
import { PROFILE_ERROR_STATES_COPY } from "../lib/profileErrorStates";
import ProfilePanelError from "./ProfilePanelError";
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
 * Empty States V1 + Error States V1 (§18 / §20).
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
      <ProfilePanelError
        message={PROFILE_ERROR_STATES_COPY.allPanel}
        onRetry={onRetry}
      />
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
