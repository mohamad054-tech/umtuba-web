"use client";

import Link from "next/link";
import { useTranslation } from "../../i18n";
import {
  LEARNING_HUB_DEEP_LINKS,
  learningHubHref,
} from "../../../../lib/learning/learningHub";
import type { DemoCourse } from "../../../../lib/learning/visualDemo";
import { loc } from "../../../../lib/learning/visualDemo";

export function UpcomingLearning({ courses }: { courses: DemoCourse[] }) {
  const { t, locale } = useTranslation();

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black">{t("learning.hub.live.upcoming")}</h2>
        <Link
          href={learningHubHref("live")}
          className="watch-focus-ring text-sm font-bold text-white/70 hover:text-white"
        >
          {t("learning.home.viewAll")}
        </Link>
      </div>
      {courses.length === 0 ? (
        <p className="text-sm text-white/55">{t("learning.hub.live.empty")}</p>
      ) : (
        <ul className="space-y-3">
          {courses.map((course) => (
            <li
              key={course.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <p className="text-sm font-bold">{loc(course.title, locale)}</p>
              <Link
                href={LEARNING_HUB_DEEP_LINKS.liveSchedule(course.id)}
                className="watch-focus-ring rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold"
              >
                {t("learning.hub.live.openSchedule")}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
