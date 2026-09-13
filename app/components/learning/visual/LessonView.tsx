"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "../../i18n";
import {
  DEMO_COURSES,
  demoHref,
  demoLesson,
  loc,
} from "../../../../lib/learning/visualDemo";
import VisualShell from "./VisualShell";
import { FeedbackToast } from "./feedback";

export default function LessonView({ lessonId }: { lessonId: string }) {
  const { t, locale } = useTranslation();
  const hrefs = demoHref();
  const found = demoLesson(lessonId) ?? demoLesson(DEMO_COURSES[0].chapters[0].lessons[0].id);
  const [complete, setComplete] = useState(found?.lesson.completed ?? false);
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const neighbors = useMemo(() => {
    if (!found) return { prev: null as string | null, next: null as string | null };
    const flat = found.course.chapters.flatMap((chapter) => chapter.lessons);
    const index = flat.findIndex((lesson) => lesson.id === found.lesson.id);
    return {
      prev: index > 0 ? flat[index - 1].id : null,
      next: index >= 0 && index < flat.length - 1 ? flat[index + 1].id : null,
    };
  }, [found]);

  if (!found) return null;
  const { course, lesson } = found;

  return (
    <VisualShell title={t("learning.lesson.title")} subtitle={loc(course.title, locale)}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,0.9fr)]">
        <div className="space-y-5">
          <section className="overflow-hidden rounded-[28px] border border-white/10 bg-black">
            <div className="relative aspect-video">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={course.cover} alt="" className="h-full w-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <button
                type="button"
                className="watch-focus-ring absolute inset-0 m-auto h-16 w-16 rounded-full bg-white/95 text-lg font-black text-black"
                aria-label={t("learning.course.preview")}
              >
                ▶
              </button>
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
            <button
              type="button"
              onClick={() => {
                setComplete(true);
                setToast(t("learning.visual.lessonComplete"));
              }}
              className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
            >
              {t("learning.lesson.markComplete")}
            </button>
            {neighbors.prev ? (
              <Link
                href={hrefs.lesson(neighbors.prev)}
                className="watch-focus-ring rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold"
              >
                {t("learning.lesson.previous")}
              </Link>
            ) : null}
            {neighbors.next ? (
              <Link
                href={hrefs.lesson(neighbors.next)}
                className="watch-focus-ring rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold"
              >
                {t("learning.lesson.next")}
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setToast(t("learning.visual.courseComplete"))}
                className="watch-focus-ring rounded-full border border-emerald-300/30 px-5 py-2.5 text-sm font-bold text-emerald-200"
              >
                {t("learning.visual.courseComplete")}
              </button>
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

          <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            <h2 className="font-black">{t("learning.outline.resources")}</h2>
            <p className="mt-2 text-sm text-white/60">{t("learning.lesson.transcript")}</p>
          </section>

          <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
            <h2 className="font-black">{t("learning.visual.questions")}</h2>
            <p className="mt-2 text-sm text-white/60">{t("learning.outline.community")}</p>
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
