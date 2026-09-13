"use client";

import Link from "next/link";
import { useTranslation } from "../../i18n";
import type { TranslationKey } from "../../../../lib/i18n/messages/types";
import {
  demoHref,
  demoTeacher,
  loc,
  type DemoCourse,
  type DemoTeacher,
} from "../../../../lib/learning/visualDemo";

const LEVEL_KEY: Record<DemoCourse["level"], TranslationKey> = {
  beginner: "learning.difficulty.beginner",
  intermediate: "learning.difficulty.intermediate",
  advanced: "learning.difficulty.advanced",
};

export function CourseCard({
  course,
  progress,
}: {
  course: DemoCourse;
  progress?: number;
}) {
  const { t, locale } = useTranslation();
  const teacher = demoTeacher(course.teacherId);
  const hrefs = demoHref();

  return (
    <Link
      href={hrefs.course(course.slug)}
      className="learning-visual-card group block overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04] shadow-[0_18px_50px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-0.5 hover:border-violet-300/30"
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={course.cover}
          alt=""
          className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070714] via-transparent to-transparent" />
        <span className="absolute start-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
          {course.isFree ? t("learning.catalog.free") : t("learning.catalog.paid")}
        </span>
      </div>
      <div className="space-y-2 p-4">
        <h3 className="text-base font-black tracking-tight text-white">
          {loc(course.title, locale)}
        </h3>
        <p className="line-clamp-2 text-sm text-white/55">
          {loc(course.subtitle, locale)}
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
          <span>{course.rating.toFixed(1)}</span>
          <span aria-hidden>·</span>
          <span>
            {course.enrollments.toLocaleString(locale === "ar" ? "ar" : "en")}
          </span>
          <span aria-hidden>·</span>
          <span>{t(LEVEL_KEY[course.level])}</span>
          <span aria-hidden>·</span>
          <span>
            {t("learning.course.lessons")} {course.lessonCount}
          </span>
        </div>
        {teacher ? (
          <p className="text-xs text-violet-200/80">{loc(teacher.name, locale)}</p>
        ) : null}
        {progress != null ? (
          <div className="pt-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-l from-sky-400 to-violet-500"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-white/45">
              {t("learning.outline.courseProgress")} · {progress}%
            </p>
          </div>
        ) : null}
      </div>
    </Link>
  );
}

export function TeacherCard({ teacher }: { teacher: DemoTeacher }) {
  const { locale, t } = useTranslation();
  const hrefs = demoHref();
  return (
    <Link
      href={hrefs.teacher(teacher.id)}
      className="learning-visual-card flex min-w-[240px] items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] p-3 transition hover:border-violet-300/30"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={teacher.portrait}
        alt=""
        className="h-16 w-16 rounded-2xl object-cover"
      />
      <div className="min-w-0">
        <p className="truncate font-black">{loc(teacher.name, locale)}</p>
        <p className="truncate text-xs text-white/50">
          {teacher.specialties.map((item) => loc(item, locale)).join(" · ")}
        </p>
        <p className="mt-1 text-[11px] text-violet-200/80">
          {teacher.rating.toFixed(1)} · {teacher.students.toLocaleString(locale === "ar" ? "ar" : "en")}{" "}
          {t("teacher.dashboard.students")}
        </p>
      </div>
    </Link>
  );
}

export function SectionTitle({
  kicker,
  title,
}: {
  kicker?: string;
  title: string;
}) {
  return (
    <header className="mb-4">
      {kicker ? (
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
          {kicker}
        </p>
      ) : null}
      <h2 className="mt-1 text-2xl font-black tracking-tight">{title}</h2>
    </header>
  );
}
