"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "../../i18n";
import type { TranslationKey } from "../../../../lib/i18n/messages/types";
import { demoHref, loc } from "../../../../lib/learning/visualDemo";
import type { LearningCourseSurface } from "../../../../lib/learning/productization";
import { enrollInPublicCourseAction } from "../../../learning/catalog/actions";
import VisualShell from "./VisualShell";
import { CourseCard, SectionTitle } from "./cards";
import { FeedbackToast } from "./feedback";

const LEVEL_KEY: Record<string, TranslationKey> = {
  beginner: "learning.difficulty.beginner",
  intermediate: "learning.difficulty.intermediate",
  advanced: "learning.difficulty.advanced",
};

export default function CourseDetailView({
  model,
}: {
  model: LearningCourseSurface;
}) {
  const { t, locale } = useTranslation();
  const { course } = model;
  const hrefs = demoHref();
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const firstLesson = course.chapters[0]?.lessons[0];
  const startHref = model.startHref || (firstLesson ? hrefs.lesson(firstLesson.id) : hrefs.home);

  return (
    <VisualShell title={t("learning.course.title")} subtitle={loc(course.title, locale)} source={model.source}>
      <section className="overflow-hidden rounded-[32px] border border-white/10">
        <div className="relative min-h-[280px] md:min-h-[380px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={course.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#070714] via-[#070714]/55 to-transparent" />
          <div className="relative flex min-h-[280px] flex-col justify-end p-6 md:min-h-[380px] md:p-10">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/50">
              {course.isFree ? t("learning.course.free") : t("learning.course.paid")}
            </p>
            <h1 className="mt-2 max-w-3xl text-3xl font-black tracking-tight md:text-5xl">
              {loc(course.title, locale)}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/75 md:text-base">
              {loc(course.subtitle, locale)}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/70">
              {course.rating > 0 ? (
                <span className="rounded-full bg-white/10 px-3 py-1">
                  {t("learning.review.rating")} {course.rating.toFixed(1)}
                </span>
              ) : null}
              <span className="rounded-full bg-white/10 px-3 py-1">
                {t("learning.course.durationHours", { values: { hours: course.durationHours } })}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1">
                {t(LEVEL_KEY[course.level] ?? LEVEL_KEY.beginner)}
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1">
                {t("teacher.course.language")} · {course.language}
              </span>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {model.source === "live" && model.isGuest ? (
                <Link
                  href={model.loginHref}
                  className="watch-focus-ring inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
                >
                  {t("learning.course.start")}
                </Link>
              ) : model.source === "live" && model.enrolled ? (
                <Link
                  href={startHref}
                  className="watch-focus-ring inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
                >
                  {t("learning.course.continue")}
                </Link>
              ) : model.source === "live" && model.canSelfEnroll && model.enrollCourseId && model.enrollCourseSlug ? (
                <form action={enrollInPublicCourseAction}>
                  <input type="hidden" name="courseId" value={model.enrollCourseId} />
                  <input type="hidden" name="courseSlug" value={model.enrollCourseSlug} />
                  {firstLesson ? (
                    <input type="hidden" name="nextLessonId" value={firstLesson.id} />
                  ) : null}
                  <button
                    type="submit"
                    className="watch-focus-ring inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
                  >
                    {t("learning.course.start")}
                  </button>
                </form>
              ) : (
                <Link
                  href={startHref}
                  className="watch-focus-ring inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
                >
                  {model.enrolled ? t("learning.course.continue") : t("learning.course.start")}
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  setSaved((value) => !value);
                  setToast(t("learning.visual.saved"));
                }}
                className="watch-focus-ring inline-flex min-h-11 items-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold"
              >
                {saved ? t("learning.visual.saved") : t("home.saved")}
              </button>
            </div>
          </div>
        </div>
      </section>

      {model.teacher ? (
        <Link
          href={hrefs.teacher(model.teacher.id)}
          className="mt-6 flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/[0.04] p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={model.teacher.portrait} alt="" className="h-14 w-14 rounded-2xl object-cover" />
          <div>
            <p className="font-black">{loc(model.teacher.name, locale)}</p>
            <p className="text-xs text-white/55">{loc(model.teacher.bio, locale)}</p>
          </div>
        </Link>
      ) : null}

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-lg font-black">{t("learning.course.whatYouLearn")}</h2>
          <ul className="mt-3 list-disc space-y-2 ps-5 text-sm text-white/75">
            {course.objectives.map((item) => (
              <li key={item.en}>{loc(item, locale)}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-lg font-black">{t("learning.lesson.prerequisites")}</h2>
          <ul className="mt-3 list-disc space-y-2 ps-5 text-sm text-white/75">
            {course.prerequisites.map((item) => (
              <li key={item.en}>{loc(item, locale)}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-8">
        <SectionTitle title={t("learning.course.curriculum")} />
        <p className="mb-4 text-sm text-white/50">
          {t("learning.visual.chapters")} {course.chapterCount} · {t("learning.course.lessons")}{" "}
          {course.lessonCount}
        </p>
        <ol className="space-y-3">
          {course.chapters.map((chapter, index) => (
            <li key={chapter.id} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
              <h3 className="font-black">
                {index + 1}. {loc(chapter.title, locale)}
              </h3>
              <ol className="mt-2 space-y-1 text-sm text-white/70">
                {chapter.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <Link href={hrefs.lesson(lesson.id)} className="hover:text-white">
                      {loc(lesson.title, locale)}
                    </Link>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8">
        <SectionTitle title={t("learning.review.title")} />
        {course.reviews.length === 0 ? (
          <p className="text-sm text-white/55">{t("learning.review.empty")}</p>
        ) : (
          <ul className="space-y-3">
            {course.reviews.map((review) => (
              <li key={review.id} className="rounded-[22px] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-sm font-bold">
                  {t("learning.review.rating")} · {review.rating}
                </p>
                <p className="mt-1 text-sm text-white/70">{loc(review.comment, locale)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {model.related.length > 0 ? (
        <section className="mt-8">
          <SectionTitle title={t("learning.visual.related")} />
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {model.related.map((item) => (
              <CourseCard key={item.id} course={item} />
            ))}
          </div>
        </section>
      ) : null}

      <FeedbackToast message={toast} onDismiss={() => setToast(null)} />
    </VisualShell>
  );
}
