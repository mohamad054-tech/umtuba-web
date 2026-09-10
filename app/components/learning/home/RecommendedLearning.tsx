"use client";

import Link from "next/link";
import { useTranslation } from "../../i18n";
import { learningHubHref } from "../../../../lib/learning/learningHub";
import type { DemoCourse } from "../../../../lib/learning/visualDemo";
import { CourseCard, SectionTitle } from "../visual/cards";

export function RecommendedLearning({ courses }: { courses: DemoCourse[] }) {
  const { t } = useTranslation();
  if (courses.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SectionTitle title={t("learning.visual.recommended")} />
        <Link
          href={learningHubHref("discover")}
          className="watch-focus-ring text-sm font-bold text-white/70 hover:text-white"
        >
          {t("learning.home.viewAll")}
        </Link>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
    </section>
  );
}
