import {
  ContentCard,
  ContentCardEmptyState,
  ContentCardSkeleton,
} from "../../components/content-cards";
import type { ContentCardViewModel } from "../../../lib/content/cards";
import { partitionProfileAllContent } from "../lib/profilePinnedContentStructure";
import ProfilePinnedRail from "./ProfilePinnedRail";

type ProfileAllPanelProps = {
  cards: ContentCardViewModel[];
  /** Explicit pins (structure readiness). Falls back to cards marked pinned. */
  pinnedCards?: ContentCardViewModel[];
  loadFailed?: boolean;
  onRetry?: () => void;
};

/**
 * Profile All — pinned rail (optional) + unified chronological feed.
 * Pinned items are excluded from the chronological list (Creator Space §8).
 */
export default function ProfileAllPanel({
  cards,
  pinnedCards,
  loadFailed = false,
  onRetry,
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

  const { pinned, chronology, showPinnedRail } = partitionProfileAllContent({
    cards,
    pinned: pinnedCards,
  });

  if (!showPinnedRail && chronology.length === 0) {
    return (
      <ContentCardEmptyState
        title="No published content yet"
        description="Articles and independent videos will appear here in one timeline."
      />
    );
  }

  return (
    <div className="space-y-6">
      {showPinnedRail ? <ProfilePinnedRail cards={pinned} /> : null}
      {chronology.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2" aria-label="All content">
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
