"use client";

import Link from "next/link";
import { useTranslation } from "../../i18n";
import { demoHref } from "../../../../lib/learning/visualDemo";
import type { LearningTeacherCenterSurface } from "../../../../lib/learning/productization";
import VisualShell from "./VisualShell";
import { CourseCard, SectionTitle } from "./cards";

export default function TeacherCenterView({
  model,
  embedded = false,
}: {
  model: LearningTeacherCenterSurface;
  embedded?: boolean;
}) {
  const { t } = useTranslation();
  const hrefs = demoHref();

  const body = !model.canOperate ? (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
      <h1 className="text-2xl font-black">{t("teacher.center.gatedTitle")}</h1>
      <p className="mt-2 text-sm text-white/60">{t("learning.visual.gatedCenter")}</p>
      <Link
        href={hrefs.become}
        className="watch-focus-ring mt-5 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
      >
        {t("teacher.center.applyCta")}
      </Link>
    </section>
  ) : (
    <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            [t("teacher.dashboard.courses"), model.totals.courses],
            [t("teacher.dashboard.students"), model.totals.students],
            [t("teacher.dashboard.completions"), model.totals.completions],
            [t("learning.review.rating"), model.totals.ratingLabel],
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
        {model.courses.length === 0 ? (
          <p className="text-sm text-white/55">{t("teacher.dashboard.empty")}</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {model.courses.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
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
    </>
  );

  if (embedded) return body;
  return (
    <VisualShell title={t("teacher.center.title")} subtitle={t("teacher.center.subtitle")} source={model.source}>
      {body}
    </VisualShell>
  );
}
