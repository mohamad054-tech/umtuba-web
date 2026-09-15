"use client";

import Link from "next/link";
import { useTranslation } from "../../i18n";
import type { LearningDashboardSnapshot } from "../../../../lib/learning/learningDashboard";

export function LearningSnapshot({
  snapshot,
}: {
  snapshot: LearningDashboardSnapshot;
}) {
  const { t } = useTranslation();
  const nextValue =
    snapshot.nextSessionLabel === "empty"
      ? t("learning.home.snapshot.emptySession")
      : snapshot.nextSessionLabel === "oneToOne"
        ? t("learning.hub.section.oneToOne")
        : t("learning.hub.section.live");

  const cards = [
    {
      href: snapshot.coursesHref,
      label: t("learning.home.snapshot.courses"),
      value: String(snapshot.courseCount),
    },
    {
      href: snapshot.progressHref,
      label: t("learning.home.snapshot.progress"),
      value:
        snapshot.progressPercent == null
          ? "—"
          : `${snapshot.progressPercent}%`,
    },
    {
      href: snapshot.nextSessionHref,
      label: t("learning.home.snapshot.nextSession"),
      value: nextValue,
    },
    {
      href: snapshot.certificatesHref,
      label: t("learning.home.snapshot.certificates"),
      value: String(snapshot.certificateCount),
    },
  ];

  return (
    <section
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      aria-label={t("learning.home.snapshot.progress")}
    >
      {cards.map((card) => (
        <Link
          key={card.label}
          href={card.href}
          className="watch-focus-ring rounded-[22px] border border-white/10 bg-white/[0.04] px-4 py-4 hover:border-white/30"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
            {card.label}
          </p>
          <p className="mt-2 text-lg font-black tracking-tight">{card.value}</p>
        </Link>
      ))}
    </section>
  );
}
