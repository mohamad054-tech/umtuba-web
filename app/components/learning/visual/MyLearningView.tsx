"use client";

import Link from "next/link";
import { useTranslation } from "../../i18n";
import {
  DEMO_ACHIEVEMENTS,
  DEMO_COURSES,
  DEMO_VIEWER,
  demoHref,
  enrolledCourses,
  loc,
} from "../../../../lib/learning/visualDemo";
import VisualShell from "./VisualShell";
import { CourseCard, SectionTitle } from "./cards";

export default function MyLearningView({ embedded = false }: { embedded?: boolean }) {
  const { t, locale } = useTranslation();
  const hrefs = demoHref();
  const rows = enrolledCourses();
  const active = rows.filter((row) => row.enrollment.status === "in_progress");
  const done = rows.filter((row) => row.enrollment.status === "completed");
  const saved = rows.filter((row) => row.enrollment.saved);
  const recommended = DEMO_COURSES.filter(
    (course) => !rows.some((row) => row.course.id === course.id)
  ).slice(0, 3);

  const body = (
    <div className="space-y-10">
      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
        <h2 className="text-2xl font-black">{t("learning.catalog.myLearning")}</h2>
        <p className="mt-2 text-sm text-white/60">
          {loc(DEMO_VIEWER.name, locale)} · {t("learning.visual.streak")} {DEMO_VIEWER.streakDays}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {DEMO_ACHIEVEMENTS.map((item) => (
            <span
              key={item.en}
              className="rounded-full bg-violet-500/15 px-3 py-1 text-xs font-bold text-violet-100"
            >
              {loc(item, locale)}
            </span>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title={t("learning.hub.inProgress")} />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {active.map(({ course, enrollment }) => (
            <CourseCard key={course.id} course={course} progress={enrollment.percent} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title={t("learning.hub.completed")} />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {done.map(({ course, enrollment }) => (
            <div key={course.id} className="space-y-2">
              <CourseCard course={course} progress={enrollment.percent} />
              <p className="text-xs font-bold text-emerald-300">
                {t("learning.hub.transcript")}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title={t("learning.visual.saved")} />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {saved.map(({ course }) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title={t("learning.visual.recommended")} />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {recommended.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
        <Link
          href={hrefs.home}
          className="watch-focus-ring mt-4 inline-flex text-sm font-bold text-sky-300"
        >
          {t("learning.hub.browseCatalog")}
        </Link>
      </section>
    </div>
  );

  if (embedded) return body;
  return (
    <VisualShell title={t("learning.catalog.myLearning")}>
      {body}
    </VisualShell>
  );
}
