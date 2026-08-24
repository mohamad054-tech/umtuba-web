"use client";

import { useState, type ReactNode } from "react";
import { useTranslation } from "../../i18n";
import type { LearningDataSource } from "../../../../lib/learning/productization";
import VisualShell from "./VisualShell";
import { FeedbackToast } from "./feedback";

type LessonKind = "video" | "text" | "quiz" | "resource";

type BuilderLesson = {
  id: string;
  title: string;
  type: LessonKind;
};

type BuilderChapter = {
  id: string;
  title: string;
  lessons: BuilderLesson[];
};

const TYPE_KEY: Record<LessonKind, "teacher.course.videoLesson" | "teacher.course.textLesson" | "teacher.course.quiz" | "teacher.course.resources"> = {
  video: "teacher.course.videoLesson",
  text: "teacher.course.textLesson",
  quiz: "teacher.course.quiz",
  resource: "teacher.course.resources",
};

export default function CourseBuilderView({
  source = "demo_fallback",
  courseForm,
  embedded = false,
}: {
  source?: LearningDataSource;
  courseForm?: ReactNode;
  embedded?: boolean;
}) {
  const { t } = useTranslation();
  const [toast, setToast] = useState<string | null>(null);
  const [chapters, setChapters] = useState<BuilderChapter[]>([
    {
      id: "ch-1",
      title: t("teacher.course.sections"),
      lessons: [
        { id: "ls-1", title: t("teacher.course.videoLesson"), type: "video" },
        { id: "ls-2", title: t("teacher.course.textLesson"), type: "text" },
      ],
    },
  ]);

  function addChapter() {
    setChapters((current) => [
      ...current,
      {
        id: `ch-${current.length + 1}`,
        title: `${t("learning.visual.chapters")} ${current.length + 1}`,
        lessons: [],
      },
    ]);
  }

  function addLesson(chapterId: string, type: LessonKind) {
    setChapters((current) =>
      current.map((chapter) =>
        chapter.id === chapterId
          ? {
              ...chapter,
              lessons: [
                ...chapter.lessons,
                {
                  id: `ls-${chapter.id}-${chapter.lessons.length + 1}`,
                  title: t(TYPE_KEY[type]),
                  type,
                },
              ],
            }
          : chapter
      )
    );
    setToast(t("status.success"));
  }

  function moveLesson(chapterId: string, index: number, direction: -1 | 1) {
    setChapters((current) =>
      current.map((chapter) => {
        if (chapter.id !== chapterId) return chapter;
        const next = [...chapter.lessons];
        const target = index + direction;
        if (target < 0 || target >= next.length) return chapter;
        const [row] = next.splice(index, 1);
        next.splice(target, 0, row);
        return { ...chapter, lessons: next };
      })
    );
  }

  const body = (
    <>
      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4 rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
          {courseForm ?? (
            <p className="text-sm text-white/60">{t("learning.visual.persistenceUnavailable")}</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black">{t("learning.visual.chapters")}</h2>
            <button
              type="button"
              onClick={addChapter}
              className="watch-focus-ring rounded-full border border-white/20 px-3 py-1.5 text-xs font-bold"
            >
              {t("teacher.course.sections")}
            </button>
          </div>
          {chapters.map((chapter) => (
            <section key={chapter.id} className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
              <h3 className="font-black">{chapter.title}</h3>
              <ol className="mt-3 space-y-2">
                {chapter.lessons.map((lesson, index) => (
                  <li
                    key={lesson.id}
                    className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2 text-sm"
                  >
                    <span>
                      {lesson.title} · {t(TYPE_KEY[lesson.type])}
                    </span>
                    <span className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveLesson(chapter.id, index, -1)}
                        className="watch-focus-ring rounded-full px-2 text-xs"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveLesson(chapter.id, index, 1)}
                        className="watch-focus-ring rounded-full px-2 text-xs"
                      >
                        ↓
                      </button>
                    </span>
                  </li>
                ))}
              </ol>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["video", "text", "quiz", "resource"] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addLesson(chapter.id, type)}
                    className="watch-focus-ring rounded-full border border-white/15 px-3 py-1 text-[11px] font-bold"
                  >
                    {t(TYPE_KEY[type])}
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
      <FeedbackToast message={toast} onDismiss={() => setToast(null)} />
    </>
  );

  if (embedded) return body;
  return (
    <VisualShell
      title={t("teacher.center.nav.create")}
      subtitle={t("teacher.courses.create")}
      source={source}
    >
      {body}
    </VisualShell>
  );
}
