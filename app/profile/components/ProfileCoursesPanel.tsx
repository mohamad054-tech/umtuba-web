"use client";

import Link from "next/link";
import { useTranslation } from "../../components/i18n";
import { APP_ROUTES } from "../../lib/nav";
import { normalizeProfileCourses } from "../lib/profileCoursesProductsStructure";
import type { ProfileCoursePreview } from "../types";

type ProfileCoursesPanelProps = {
  courses?: ProfileCoursePreview[];
  isOwner?: boolean;
};

/**
 * Courses tab — structured cards (Creator Space Experience V1 §11).
 * Structure readiness only; does not embed the LMS.
 */
export default function ProfileCoursesPanel({
  courses = [],
  isOwner = false,
}: ProfileCoursesPanelProps) {
  const { t } = useTranslation();
  const items = normalizeProfileCourses(courses);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">
          {t("profile.courses")}
        </p>
        <p className="mt-3 text-base font-bold text-white/80">
          {t("profile.emptyCourses")}
        </p>
        <p className="mt-2 text-sm text-white/45">
          {isOwner
            ? t("profile.emptyCoursesOwner")
            : t("profile.emptyCoursesVisitor")}
        </p>
        {isOwner ? (
          <Link
            href={APP_ROUTES.learning}
            className="watch-focus-ring mt-5 inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold transition hover:bg-white/10"
          >
            {t("profile.openLearning")}
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">
        {t("profile.courses")}
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {items.map((course) => (
          <li key={course.id}>
            <Link
              href={course.href}
              className="watch-focus-ring group flex h-full flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#080816]/70 transition hover:border-white/20 hover:brightness-[1.03] motion-reduce:transition-none motion-reduce:hover:brightness-100"
            >
              <div
                className={`relative aspect-[16/10] bg-gradient-to-br ${course.coverGradient}`}
              >
                {course.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- optional cover URL
                  <img
                    src={course.coverUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
                <p className="text-base font-black tracking-tight group-hover:text-white">
                  {course.title}
                </p>
                <p className="text-sm text-white/50">
                  {course.levelLabel === "Course"
                    ? t("profile.courseFallback")
                    : course.levelLabel}
                  {course.lessonCountLabel
                    ? ` · ${course.lessonCountLabel}`
                    : ""}
                </p>
                <p className="mt-auto pt-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-200/80">
                  {t("profile.viewCourse")}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
