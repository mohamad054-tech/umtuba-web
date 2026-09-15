"use client";

import Link from "next/link";
import { useTranslation } from "../../i18n";
import {
  LEARNING_HUB_DEEP_LINKS,
  learningHubHref,
} from "../../../../lib/learning/learningHub";
import type { LearningHomeSurface } from "../../../../lib/learning/productization";
import { loc } from "../../../../lib/learning/visualDemo";
import { CourseCard, SectionTitle } from "../visual/cards";
import MyLearningView from "../visual/MyLearningView";
import TeacherCenterView from "../visual/TeacherCenterView";
import type { LearningTeacherCenterSurface } from "../../../../lib/learning/productization";

function PanelShell({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
        <h2 className="text-2xl font-black tracking-tight">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm text-white/65">{body}</p>
      </section>
      {children}
    </div>
  );
}

export function CoursesHubPanel({ home }: { home: LearningHomeSurface }) {
  const { t } = useTranslation();
  const current = home.enrollments.map((row) => row.course);
  const catalog = home.courses.slice(0, 6);

  return (
    <PanelShell
      title={t("learning.hub.section.courses")}
      body={t("learning.hub.enrolledBody")}
    >
      <section>
        <SectionTitle title={t("learning.hub.courses.current")} />
        {current.length === 0 ? (
          <p className="text-sm text-white/55">{t("learning.hub.startLearning")}</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {current.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </section>
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SectionTitle title={t("learning.hub.browseCatalog")} />
          <Link
            href={LEARNING_HUB_DEEP_LINKS.catalog}
            className="watch-focus-ring rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/80 hover:border-white/40"
          >
            {t("learning.hub.browseCatalog")}
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {catalog.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </section>
    </PanelShell>
  );
}

export function ProgressHubPanel({ home }: { home: LearningHomeSurface }) {
  const { t } = useTranslation();
  return (
    <PanelShell
      title={t("learning.hub.section.progress")}
      body={t("learning.hub.progress.completion")}
    >
      <div className="flex flex-wrap gap-3">
        <Link
          href={LEARNING_HUB_DEEP_LINKS.transcript}
          className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
        >
          {t("learning.hub.progress.certificates")}
        </Link>
        <Link
          href={learningHubHref("myLearning")}
          className="watch-focus-ring rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-white/80"
        >
          {t("learning.catalog.myLearning")}
        </Link>
      </div>
      <MyLearningView embedded home={home} />
    </PanelShell>
  );
}

export function LiveHubPanel({ home }: { home: LearningHomeSurface }) {
  const { t, locale } = useTranslation();
  const enrolled = home.enrollments.map((row) => row.course);

  return (
    <PanelShell
      title={t("learning.hub.section.live")}
      body={t("learning.hub.live.body")}
    >
      <SectionTitle title={t("learning.hub.live.upcoming")} />
      {enrolled.length === 0 ? (
        <p className="text-sm text-white/55">{t("learning.hub.live.empty")}</p>
      ) : (
        <ul className="space-y-3">
          {enrolled.map((course) => (
            <li
              key={course.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <p className="text-sm font-bold">{loc(course.title, locale)}</p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={LEARNING_HUB_DEEP_LINKS.liveSchedule(course.id)}
                  className="watch-focus-ring rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold"
                >
                  {t("learning.hub.live.openSchedule")}
                </Link>
                <Link
                  href={LEARNING_HUB_DEEP_LINKS.liveCalendar(course.id)}
                  className="watch-focus-ring rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold"
                >
                  {t("learning.hub.live.openCalendar")}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PanelShell>
  );
}

export function AssessmentsHubPanel({ home }: { home: LearningHomeSurface }) {
  const { t, locale } = useTranslation();
  const enrolled = home.enrollments.map((row) => row.course);

  return (
    <PanelShell
      title={t("learning.hub.section.assessments")}
      body={t("learning.hub.assessments.body")}
    >
      <div className="flex flex-wrap gap-3">
        <Link
          href={LEARNING_HUB_DEEP_LINKS.transcript}
          className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black"
        >
          {t("learning.hub.assessments.results")}
        </Link>
      </div>
      {enrolled.length === 0 ? (
        <p className="text-sm text-white/55">
          {t("learning.hub.assessments.empty")}
        </p>
      ) : (
        <ul className="space-y-3">
          {enrolled.map((course) => (
            <li
              key={course.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <Link
                href={LEARNING_HUB_DEEP_LINKS.course(course.id)}
                className="watch-focus-ring text-sm font-bold hover:opacity-90"
              >
                {loc(course.title, locale)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PanelShell>
  );
}

export function MarketplaceHubPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  return (
    <PanelShell
      title={t("learning.hub.section.marketplace")}
      body={t("learning.hub.marketplace.body")}
    >
      <Link
        href={LEARNING_HUB_DEEP_LINKS.marketplace}
        className="watch-focus-ring inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-black"
      >
        {t("learning.hub.marketplace.open")}
      </Link>
      {children}
    </PanelShell>
  );
}

export function TeacherHubPanel({
  model,
}: {
  model: LearningTeacherCenterSurface | null;
}) {
  const { t } = useTranslation();
  if (!model) {
    return (
      <PanelShell
        title={t("learning.hub.teacher.tools")}
        body={t("learning.visual.gatedCenter")}
      >
        <Link
          href={LEARNING_HUB_DEEP_LINKS.becomeTeacher}
          className="watch-focus-ring inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-black"
        >
          {t("learning.hub.becomeTeacher")}
        </Link>
      </PanelShell>
    );
  }
  return (
    <PanelShell
      title={t("learning.hub.teacher.tools")}
      body={t("learning.oneToOne.manageAvailability")}
    >
      <TeacherCenterView model={model} embedded />
    </PanelShell>
  );
}
