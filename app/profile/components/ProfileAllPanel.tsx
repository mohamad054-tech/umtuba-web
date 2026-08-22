"use client";

import Link from "next/link";
import {
  ContentCard,
  ContentCardEmptyState,
  ContentCardSkeleton,
} from "../../components/content-cards";
import type { ContentCardViewModel } from "../../../lib/content/cards";
import { APP_ROUTES } from "../../lib/nav";
import { useTranslation } from "../../components/i18n";
import { applyProfileAllTimelineContract } from "../lib/profileAllTimelineContract";
import { shouldShowOwnerEmptyCreateActions } from "../lib/profileEmptyStates";
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
  const { t } = useTranslation();
  if (loadFailed) {
    return <ProfilePanelError message={t("profile.errorAll")} onRetry={onRetry} />;
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
        title={t("profile.emptyAllTitle")}
        description={
          showOwnerActions
            ? t("profile.emptyAllOwner")
            : t("profile.emptyAllVisitor")
        }
        action={
          showOwnerActions ? (
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                href={APP_ROUTES.createArticle}
                className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black transition hover:bg-white/90"
              >
                {t("profile.writeArticleCta")}
              </Link>
              <Link
                href={APP_ROUTES.createVideo}
                className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-white/85 transition hover:bg-white/10"
              >
                {t("profile.uploadVideoCta")}
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
          aria-label={t("profile.allContentAria")}
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
