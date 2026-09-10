"use client";

import Link from "next/link";
import { useTranslation } from "../../i18n";
import { learningHubHref } from "../../../../lib/learning/learningHub";
import { DEMO_CATEGORIES, loc } from "../../../../lib/learning/visualDemo";

export function LearningCategories() {
  const { t, locale } = useTranslation();

  return (
    <section>
      <h2 className="mb-3 text-lg font-black">{t("learning.visual.categories")}</h2>
      <div
        className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label={t("learning.visual.categories")}
      >
        {DEMO_CATEGORIES.map((item) => (
          <Link
            key={item.id}
            href={learningHubHref("discover", { category: item.id })}
            className="watch-focus-ring shrink-0 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-white/80 hover:border-white/40"
          >
            {loc(item.label, locale)}
          </Link>
        ))}
      </div>
    </section>
  );
}
