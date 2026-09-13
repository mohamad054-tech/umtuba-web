"use client";

import Link from "next/link";
import { useTranslation } from "../i18n";
import { LEARNING_COMPLETION_ROUTES } from "../../../lib/learning/completionFoundation";
import {
  LEARNING_LEARNER_ROUTES,
  type LearningLearnerHub,
  type LearningLearnerHubCourse,
} from "../../../lib/learning/learnerDelivery";
import { LEARNING_PUBLIC_ROUTES } from "../../../lib/learning/publicCatalog";
import { LEARNING_TEACHER_ROUTES } from "../../../lib/learning/teacherPlatform";
import {
  LearningProgressBar,
  LearningStatePanel,
  LearningStatusBadge,
} from "./ds";

type LearningHubProps = {
  hub: LearningLearnerHub;
};

function progressLabel(
  status: string,
  t: (key: "learning.hub.completed" | "learning.hub.inProgress" | "learning.hub.notStarted") => string
) {
  if (status === "completed") return t("learning.hub.completed");
  if (status === "in_progress") return t("learning.hub.inProgress");
  return t("learning.hub.notStarted");
}

function statusTone(
  status: string
): "neutral" | "success" | "warning" {
  if (status === "completed") return "success";
  if (status === "in_progress") return "warning";
  return "neutral";
}

function pickContinueCourse(
  courses: LearningLearnerHubCourse[]
): LearningLearnerHubCourse | null {
  const withTarget = courses.filter((c) => c.continue_href);
  if (withTarget.length === 0) return null;

  const inProgress = withTarget.filter(
    (c) => c.progress?.status === "in_progress"
  );
  if (inProgress.length > 0) {
    return [...inProgress].sort(
      (a, b) =>
        (b.progress?.percent_complete ?? 0) - (a.progress?.percent_complete ?? 0)
    )[0];
  }

  const notStarted = withTarget.filter(
    (c) => (c.progress?.status ?? "not_started") === "not_started"
  );
  if (notStarted.length > 0) return notStarted[0];

  return withTarget[0];
}

export default function LearningHub({ hub }: LearningHubProps) {
  const { t } = useTranslation();
  const empty = hub.programs.length === 0 && hub.courses.length === 0;
  const continueCourse = pickContinueCourse(hub.courses);

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          {t("learning.hub.subtitle")}
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">
          {empty
            ? t("learning.hub.startLearning")
            : continueCourse
              ? t("learning.hub.continueLearning")
              : t("learning.hub.subtitle")}
        </h1>
        <p className="mt-2 text-sm text-white/50">
          {empty
            ? t("learning.hub.emptyBody")
            : t("learning.hub.enrolledBody")}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href={LEARNING_PUBLIC_ROUTES.catalog}
            className="watch-focus-ring inline-flex min-h-11 items-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold text-white/80 hover:border-white/40"
          >
            {t("learning.hub.browseCatalog")}
          </Link>
          <Link
            href={LEARNING_COMPLETION_ROUTES.transcript}
            className="watch-focus-ring inline-flex min-h-11 items-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold text-white/80 hover:border-white/40"
          >
            {t("learning.hub.transcript")}
          </Link>
          <Link
            href={LEARNING_TEACHER_ROUTES.become}
            className="watch-focus-ring inline-flex min-h-11 items-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold text-white/80 hover:border-white/40"
          >
            {t("learning.hub.becomeTeacher")}
          </Link>
          <Link
            href={LEARNING_TEACHER_ROUTES.center}
            className="watch-focus-ring inline-flex min-h-11 items-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold text-white/80 hover:border-white/40"
          >
            {t("learning.hub.teacherCenter")}
          </Link>
        </div>
      </section>

      {continueCourse && continueCourse.continue_href ? (
        <section
          className="rounded-[28px] border border-sky-400/20 bg-sky-500/10 p-5 backdrop-blur-xl md:p-7"
          aria-label={t("learning.hub.continueLearning")}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sky-100/70">
              {t("learning.hub.continueLearning")}
            </p>
            {continueCourse.progress ? (
              <LearningStatusBadge
                tone={statusTone(continueCourse.progress.status)}
              >
                {progressLabel(continueCourse.progress.status, t)}
              </LearningStatusBadge>
            ) : null}
          </div>
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            {continueCourse.name}
          </h2>
          {continueCourse.program_name ? (
            <p className="mt-1 text-xs text-white/40">
              {continueCourse.program_name}
            </p>
          ) : null}
          {continueCourse.progress ? (
            <div className="mt-4">
              <LearningProgressBar
                percent={continueCourse.progress.percent_complete}
                label={t("learning.outline.courseProgress")}
              />
            </div>
          ) : (
            <p className="mt-2 text-sm text-white/70">
              {t("learning.hub.resumeWhereLeft")}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={continueCourse.continue_href}
              className="watch-focus-ring inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
            >
              {t("learning.hub.resume")}
            </Link>
            <Link
              href={LEARNING_LEARNER_ROUTES.course(continueCourse.id)}
              className="watch-focus-ring inline-flex min-h-11 items-center rounded-full border border-white/20 px-5 py-2.5 text-sm font-bold text-white/80 hover:border-white/40"
            >
              {t("learning.hub.courseOutline")}
            </Link>
          </div>
        </section>
      ) : null}

      {empty ? (
        <LearningStatePanel
          title={t("learning.hub.nothingEnrolledTitle")}
          action={
            <Link
              href={LEARNING_PUBLIC_ROUTES.catalog}
              className="watch-focus-ring inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
            >
              {t("learning.hub.browseCatalog")}
            </Link>
          }
        >
          {t("learning.hub.nothingEnrolledBody")}
        </LearningStatePanel>
      ) : null}

      {hub.programs.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            {t("learning.hub.programs")}
          </h2>
          <ul className="space-y-3">
            {hub.programs.map((program) => (
              <li
                key={program.id}
                className="rounded-2xl border border-white/10 bg-[#080816]/60 px-4 py-4"
              >
                <p className="text-lg font-black tracking-tight">{program.name}</p>
                {program.description ? (
                  <p className="mt-1 text-sm text-white/50">
                    {program.description}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-white/35">
                  {t("learning.hub.openCourseHint")}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hub.courses.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            {t("learning.hub.courses")}
          </h2>
          <ul className="space-y-3">
            {hub.courses.map((course) => (
              <li
                key={course.id}
                className="rounded-2xl border border-white/10 bg-[#080816]/60 px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={LEARNING_LEARNER_ROUTES.course(course.id)}
                      className="watch-focus-ring block rounded-lg transition hover:opacity-90"
                    >
                      <p className="text-lg font-black tracking-tight">
                        {course.name}
                      </p>
                      {course.program_name ? (
                        <p className="mt-1 text-xs text-white/40">
                          {course.program_name}
                        </p>
                      ) : null}
                      {course.description ? (
                        <p className="mt-1 text-sm text-white/50">
                          {course.description}
                        </p>
                      ) : null}
                    </Link>
                    {course.progress ? (
                      <div className="mt-3 max-w-sm">
                        <LearningProgressBar
                          percent={course.progress.percent_complete}
                        />
                        <p className="mt-1 text-xs text-white/45">
                          {t("learning.hub.lessonsCount", {
                            values: {
                              completed: course.progress.completed_lessons_count,
                              total: course.progress.total_lessons_count,
                              status: progressLabel(course.progress.status, t),
                            },
                          })}
                        </p>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-white/45">
                        {t("learning.hub.progressUnavailable")}
                      </p>
                    )}
                  </div>
                  {course.continue_href ? (
                    <Link
                      href={course.continue_href}
                      className="watch-focus-ring inline-flex min-h-11 shrink-0 items-center rounded-full bg-white px-4 py-2 text-sm font-black text-black"
                    >
                      {t("learning.hub.resume")}
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
