"use client";

import Link from "next/link";
import { useTranslation } from "../../i18n";
import { demoHref, loc } from "../../../../lib/learning/visualDemo";
import type { LearningTeacherProfileSurface } from "../../../../lib/learning/productization";
import VisualShell from "./VisualShell";
import { CourseCard, SectionTitle } from "./cards";

export default function TeacherProfileView({
  model,
}: {
  model: LearningTeacherProfileSurface;
}) {
  const { t, locale } = useTranslation();
  const { teacher, courses } = model;
  const hrefs = demoHref();

  return (
    <VisualShell title={t("teacher.public.title")} subtitle={loc(teacher.name, locale)} source={model.source}>
      <section className="grid gap-6 overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] p-6 md:grid-cols-[220px_1fr] md:p-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={teacher.portrait}
          alt=""
          className="h-52 w-full rounded-[28px] object-cover md:h-64"
        />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            {t("teacher.public.title")}
          </p>
          <h1 className="mt-2 text-3xl font-black md:text-4xl">{loc(teacher.name, locale)}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
            {loc(teacher.bio, locale)}
          </p>
          <p className="mt-4 text-sm text-violet-100/80">
            {teacher.specialties.map((item) => loc(item, locale)).join(" · ")}
          </p>
          <dl className="mt-5 flex flex-wrap gap-3 text-xs">
            {teacher.rating > 0 ? (
              <div className="rounded-full bg-white/10 px-3 py-1.5">
                {t("learning.review.rating")} {teacher.rating.toFixed(1)}
              </div>
            ) : null}
            <div className="rounded-full bg-white/10 px-3 py-1.5">
              {t("teacher.public.courses")} {courses.length}
            </div>
          </dl>
          <Link
            href={hrefs.become}
            className="watch-focus-ring mt-6 inline-flex rounded-full border border-white/20 px-4 py-2 text-sm font-bold"
          >
            {t("teacher.become.cta")}
          </Link>
        </div>
      </section>

      <section className="mt-8">
        <SectionTitle title={t("teacher.public.courses")} />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </section>
    </VisualShell>
  );
}
