"use client";

import Link from "next/link";
import { useTranslation } from "../../i18n";
import {
  LEARNING_HUB_DEEP_LINKS,
  learningHubHref,
} from "../../../../lib/learning/learningHub";
import { learningPartnerHref } from "../../../../lib/learning/partners/sandboxLinks";
import type { LearningPartnerCourse } from "../../../../lib/learning/partners/types";
import PartnerCourseCard from "../partners/PartnerCourseCard";

export function PartnerLearningPreview({
  courses,
  locale,
  rtl,
}: {
  courses: LearningPartnerCourse[];
  locale: "ar" | "en";
  rtl: boolean;
}) {
  const { t } = useTranslation();
  if (courses.length === 0) return null;

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black">{t("learning.home.partnerPreview")}</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href={learningHubHref("marketplace")}
            className="watch-focus-ring text-sm font-bold text-white/70 hover:text-white"
          >
            {t("learning.home.viewAll")}
          </Link>
          <Link
            href={LEARNING_HUB_DEEP_LINKS.marketplace}
            className="watch-focus-ring text-sm font-bold text-white/70 hover:text-white"
          >
            {t("learning.home.morePartners")}
          </Link>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {courses.map((course) => (
          <PartnerCourseCard
            key={course.slug}
            course={course}
            locale={locale}
            rtl={rtl}
            detailsHref={learningPartnerHref({
              slug: course.slug,
              rtl,
            })}
          />
        ))}
      </div>
    </section>
  );
}
