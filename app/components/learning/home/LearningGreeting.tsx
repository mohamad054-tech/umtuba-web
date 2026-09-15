"use client";

import Link from "next/link";
import { useTranslation } from "../../i18n";
import { LEARNING_HUB_DEEP_LINKS } from "../../../../lib/learning/learningHub";
import { polishLearningDisplayName } from "../../../../lib/learning/learningDashboard";
import type { LearningHomeSurface } from "../../../../lib/learning/productization";
import { loc, DEMO_VIEWER } from "../../../../lib/learning/visualDemo";

export function LearningGreeting({
  home,
  isTeacher,
}: {
  home: LearningHomeSurface;
  isTeacher: boolean;
}) {
  const { t, locale } = useTranslation();
  const rawName =
    home.source === "demo_fallback"
      ? loc(DEMO_VIEWER.name, locale)
      : home.viewerName ??
        (home.isGuest ? t("learning.visual.guestName") : t("nav.learning"));
  const name = polishLearningDisplayName(rawName);

  return (
    <section className="rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(76,29,149,0.28),rgba(12,18,48,0.88)_52%,rgba(30,64,175,0.22))] px-5 py-5 md:px-7 md:py-6">
      <h1 className="text-2xl font-black tracking-tight md:text-3xl">
        {t("learning.visual.greeting", { values: { name } })}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-white/70">
        {t("learning.home.subtitle")}
      </p>
      {!isTeacher ? (
        <Link
          href={LEARNING_HUB_DEEP_LINKS.becomeTeacher}
          className="watch-focus-ring mt-4 inline-flex text-xs font-bold text-violet-100/80 underline-offset-4 hover:underline"
        >
          {t("learning.hub.becomeTeacher")}
        </Link>
      ) : null}
    </section>
  );
}
