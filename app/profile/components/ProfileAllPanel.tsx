import {
  ContentCard,
  ContentCardEmptyState,
  ContentCardSkeleton,
} from "../../components/content-cards";
import type { ContentCardViewModel } from "../../../lib/content/cards";

type ProfileAllPanelProps = {
  cards: ContentCardViewModel[];
  loadFailed?: boolean;
  onRetry?: () => void;
};

/**
 * Profile All — unified chronological feed from content_registry.
 * Articles appear once (teaser videos are not duplicated as video items).
 */
export default function ProfileAllPanel({
  cards,
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

  if (cards.length === 0) {
    return (
      <ContentCardEmptyState
        title="No published content yet"
        description="Articles and independent videos will appear here in one timeline."
      />
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2" aria-label="All content">
      {cards.map((card) => (
        <li key={card.registryId}>
          <ContentCard card={card} showCreator={false} />
        </li>
      ))}
    </ul>
  );
}

export { ContentCardSkeleton };
