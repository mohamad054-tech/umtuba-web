"use client";

import Link from "next/link";
import { useTranslation } from "../../i18n";
import { learningHubHref } from "../../../../lib/learning/learningHub";
import type { LearningHomeSurface } from "../../../../lib/learning/productization";
import { demoHref, loc } from "../../../../lib/learning/visualDemo";

export function ContinueLearningCard({ home }: { home: LearningHomeSurface }) {
  const { t, locale } = useTranslation();
  const resume = home.continueItem;
  const hrefs = demoHref();

  if (!resume) {
    return (
      <section
        className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6"
        aria-label={t("learning.hub.continueLearning")}
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          {t("learning.hub.continueLearning")}
        </p>
        <p className="mt-3 text-sm text-white/70">{t("learning.home.continueEmpty")}</p>
        <Link
          href={learningHubHref("discover")}
          className="watch-focus-ring mt-5 inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
        >
          {t("learning.home.continueEmptyCta")}
        </Link>
      </section>
    );
  }

  const lesson = resume.enrollment.continueLessonId
    ? hrefs.lesson(resume.enrollment.continueLessonId)
    : hrefs.course(resume.course.slug);

  return (
    <section
      className="grid overflow-hidden rounded-[28px] border border-sky-400/20 bg-sky-500/10 md:grid-cols-[1.35fr_0.9fr]"
      aria-label={t("learning.hub.continueLearning")}
    >
      <div className="p-5 md:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sky-100/70">
          {t("learning.hub.continueLearning")}
        </p>
        <h2 className="mt-2 text-xl font-black md:text-2xl">
          {loc(resume.course.title, locale)}
        </h2>
        <p className="mt-2 line-clamp-2 text-sm text-white/65">
          {t("learning.home.nextLesson")} · {loc(resume.course.subtitle, locale)}
        </p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-l from-sky-300 to-violet-400"
            style={{ width: `${resume.enrollment.percent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-white/50">
          {t("learning.outline.courseProgress")} · {resume.enrollment.percent}%
        </p>
        <Link
          href={lesson}
          className="watch-focus-ring mt-5 inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
        >
          {t("learning.hub.resume")}
        </Link>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resume.course.cover}
        alt=""
        className="hidden h-full min-h-[10rem] w-full object-cover md:block"
      />
    </section>
  );
}
