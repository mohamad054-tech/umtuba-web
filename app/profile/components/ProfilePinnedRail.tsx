"use client";

import { ContentCard } from "../../components/content-cards";
import { useTranslation } from "../../components/i18n";
import type { ContentCardViewModel } from "../../../lib/content/cards";

type ProfilePinnedRailProps = {
  cards: ContentCardViewModel[];
};

/**
 * Pinned rail above All chronology (Creator Space Experience V1 §8).
 * Caller must omit this component when cards are empty — no empty header.
 */
export default function ProfilePinnedRail({ cards }: ProfilePinnedRailProps) {
  const { t } = useTranslation();
  if (cards.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3" aria-label={t("profile.pinnedAria")}>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">
        {t("profile.pinned")}
      </p>
      <ul className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cards.map((card) => (
          <li
            key={card.registryId || card.id}
            className="w-[min(100%,18rem)] shrink-0 sm:w-[20rem]"
          >
            <ContentCard card={card} showCreator={false} />
          </li>
        ))}
      </ul>
    </section>
  );
}
