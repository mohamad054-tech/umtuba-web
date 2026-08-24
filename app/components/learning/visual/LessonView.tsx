"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslation } from "../../i18n";
import { demoHref, loc } from "../../../../lib/learning/visualDemo";
import type { LearningLessonSurface } from "../../../../lib/learning/productization";
import { completeLearningLessonAction } from "../../../learning/progressActions";
import VisualShell from "./VisualShell";
import { FeedbackToast } from "./feedback";

export default function LessonView({ model }: { model: LearningLessonSurface }) {
  const { t, locale } = useTranslation();
  const hrefs = demoHref();
  const { course, lesson } = model;
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const complete = Boolean(lesson.completed) || !model.canComplete;

  return (
    <VisualShell
      title={t("learning.lesson.title")}
      subtitle={loc(course.title, locale)}
      source={model.source}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.9fr)]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-[28px] border border-white/10 bg-black">
            <div className="relative aspect-video">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={course.cover} alt="" className="h-full w-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <p className="watch-focus-ring absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-lg font-black text-black">
                ▶
              </p>
            </div>
            <div className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
                {lesson.type}
              </p>
              <h1 className="mt-1 text-2xl font-black">{loc(lesson.title, locale)}</h1>
              <p className="mt-2 text-sm text-white/60">{loc(course.subtitle, locale)}</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-sky-300 to-violet-400 transition-all"
                  style={{ width: complete ? "100%" : "42%" }}
                />
              </div>
            </div>
          </section>

          <div className="flex flex-wrap gap-3">
            {model.source === "live" && model.canComplete ? (
              <form action={completeLearningLessonAction}>
                <input type="hidden" name="lessonId" value={lesson.id} />
                <button
                  type="submit"
                  className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
                >
                  {t("learning.lesson.markComplete")}
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setToast(t("learning.visual.lessonComplete"))}
                className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
              >
                {t("learning.lesson.markComplete")}
              </button>
            )}
            {model.previousLessonId ? (
              <Link
                href={hrefs.lesson(model.previousLessonId)}
                className="watch-focus-ring rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold"
              >
                {t("learning.lesson.previous")}
              </Link>
            ) : null}
            {model.nextLessonId ? (
              <Link
                href={hrefs.lesson(model.nextLessonId)}
                className="watch-focus-ring rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold"
              >
                {t("learning.lesson.next")}
              </Link>
            ) : (
              <Link
                href={hrefs.course(course.slug)}
                className="watch-focus-ring rounded-full border border-emerald-300/30 px-5 py-2.5 text-sm font-bold text-emerald-200"
              >
                {t("learning.visual.courseComplete")}
              </Link>
            )}
          </div>

          <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            <h2 className="font-black">{t("learning.visual.notes")}</h2>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="mt-3 min-h-28 w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-sm"
              aria-label={t("learning.visual.notes")}
            />
          </section>
        </div>

        <aside className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-lg font-black">{t("learning.lesson.courseOutline")}</h2>
          <p className="mt-1 text-xs text-white/45">{loc(course.title, locale)}</p>
          <ol className="mt-4 space-y-3">
            {course.chapters.map((chapter) => (
              <li key={chapter.id}>
                <p className="text-xs font-bold uppercase tracking-wide text-white/40">
                  {loc(chapter.title, locale)}
                </p>
                <ul className="mt-1 space-y-1">
                  {chapter.lessons.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={hrefs.lesson(item.id)}
                        className={`block rounded-xl px-3 py-2 text-sm ${
                          item.id === lesson.id
                            ? "bg-white text-black"
                            : "text-white/75 hover:bg-white/5"
                        }`}
                      >
                        {loc(item.title, locale)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <Link
            href={hrefs.course(course.slug)}
            className="watch-focus-ring mt-5 inline-flex text-sm font-bold text-sky-300"
          >
            {t("learning.lesson.backToCourse")}
          </Link>
        </aside>
      </div>
      <FeedbackToast message={toast} onDismiss={() => setToast(null)} />
    </VisualShell>
  );
}
