"use client";

import Link from "next/link";
import { useTranslation } from "../../i18n";
import {
  DEMO_COURSES,
  DEMO_STUDENTS,
  DEMO_TEACHERS,
  demoHref,
  loc,
} from "../../../../lib/learning/visualDemo";
import VisualShell from "./VisualShell";
import { CourseCard, SectionTitle } from "./cards";

export default function TeacherCenterView() {
  const { t, locale } = useTranslation();
  const hrefs = demoHref();
  const teacher = DEMO_TEACHERS[0];
  const mine = DEMO_COURSES.filter((course) => course.teacherId === teacher.id);

  return (
    <VisualShell title={t("teacher.center.title")} subtitle={t("teacher.center.subtitle")}>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            [t("teacher.dashboard.courses"), mine.length],
            [t("teacher.dashboard.students"), 248],
            [t("teacher.dashboard.completions"), 91],
            [t("learning.review.rating"), "4.9"],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
              {label}
            </p>
            <p className="mt-2 text-3xl font-black">{value}</p>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SectionTitle title={t("teacher.courses.title")} />
          <Link
            href={hrefs.builder}
            className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
          >
            {t("teacher.courses.create")}
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {mine.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-lg font-black">{t("teacher.students.title")}</h2>
          <ul className="mt-4 space-y-3">
            {DEMO_STUDENTS.map((student) => (
              <li key={student.id} className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={student.portrait} alt="" className="h-10 w-10 rounded-full object-cover" />
                <div>
                  <p className="text-sm font-bold">{loc(student.name, locale)}</p>
                  <p className="text-xs text-white/45">
                    {t("learning.visual.umPoints")} {student.umPoints}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-lg font-black">{t("learning.visual.performance")}</h2>
          <p className="mt-3 text-sm text-white/65">{t("teacher.analytics.body")}</p>
          <p className="mt-4 text-sm text-white/70">{t("learning.visual.activity")}</p>
          <ul className="mt-2 space-y-2 text-sm text-white/55">
            <li>{t("learning.review.title")} · 12</li>
            <li>{t("teacher.dashboard.completions")} · 91</li>
          </ul>
        </div>
      </section>

      <section className="mt-8 rounded-[28px] border border-amber-300/20 bg-amber-500/10 p-5">
        <h2 className="text-lg font-black">{t("teacher.earnings.title")}</h2>
        <p className="mt-2 text-sm text-amber-50/85">{t("learning.visual.earningsPlaceholder")}</p>
        <p className="mt-2 text-xs text-amber-50/60">{t("teacher.earnings.disabled")}</p>
        <button
          type="button"
          disabled
          className="mt-4 cursor-not-allowed rounded-full bg-white/20 px-4 py-2 text-sm font-bold text-white/50"
        >
          {t("teacher.center.nav.earnings")}
        </button>
      </section>
    </VisualShell>
  );
}
