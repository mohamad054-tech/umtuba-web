"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslation } from "../../i18n";
import type { TranslationKey } from "../../../../lib/i18n/messages/types";
import {
  DEMO_ACHIEVEMENTS,
  DEMO_CATEGORIES,
  DEMO_VIEWER,
  demoHref,
  loc,
  type DemoCategoryId,
} from "../../../../lib/learning/visualDemo";
import type { LearningHomeSurface } from "../../../../lib/learning/productization";
import VisualShell from "./VisualShell";
import { CourseCard, SectionTitle, TeacherCard } from "./cards";
import MyLearningView from "./MyLearningView";

const LEVEL_KEY: Record<string, TranslationKey> = {
  beginner: "learning.difficulty.beginner",
  intermediate: "learning.difficulty.intermediate",
  advanced: "learning.difficulty.advanced",
};

export default function LearningHomeView({
  home,
}: {
  home: LearningHomeSurface;
}) {
  const { t, locale } = useTranslation();
  const hrefs = demoHref();
  const resume = home.continueItem;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DemoCategoryId | "all">("all");
  const [tab, setTab] = useState<"discover" | "library">(home.surface);
  const viewer =
    home.source === "demo_fallback"
      ? loc(DEMO_VIEWER.name, locale)
      : home.viewerName ??
        (home.isGuest ? t("learning.visual.guestName") : t("nav.learning"));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return home.courses.filter((course) => {
      if (category !== "all" && course.category !== category) return false;
      if (!q) return true;
      const hay = `${loc(course.title, locale)} ${loc(course.subtitle, locale)}`.toLowerCase();
      return hay.includes(q);
    });
  }, [query, category, locale, home.courses]);

  const recommended = home.courses.filter(
    (course) => course.category === "ai" || course.category === "uiux" || course.isFree
  );
  const trending = home.courses.filter((course) => course.isTrending);
  const free = home.courses.filter((course) => course.isFree);
  const fresh = home.courses.filter((course) => course.isNew);
  const rail = (items: typeof home.courses) =>
    items.length > 0 ? items : home.courses.slice(0, 6);

  return (
    <VisualShell
      title={t("learning.hub.title")}
      subtitle={t("learning.hub.subtitle")}
      source={home.source}
    >
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("discover")}
          className={`watch-focus-ring rounded-full px-4 py-2 text-sm font-bold ${
            tab === "discover" ? "bg-white text-black" : "border border-white/15 text-white/70"
          }`}
        >
          {t("learning.visual.discover")}
        </button>
        <button
          type="button"
          onClick={() => setTab("library")}
          className={`watch-focus-ring rounded-full px-4 py-2 text-sm font-bold ${
            tab === "library" ? "bg-white text-black" : "border border-white/15 text-white/70"
          }`}
        >
          {t("learning.visual.myLibrary")}
        </button>
      </div>

      {tab === "library" ? (
        <MyLearningView embedded home={home} />
      ) : (
        <div className="space-y-12">
          <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(76,29,149,0.35),rgba(12,18,48,0.9)_48%,rgba(30,64,175,0.28))] p-6 md:p-9">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-violet-100/70">
              {t("nav.learning")}
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">
              {t("learning.visual.greeting", { values: { name: viewer } })}
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/70 md:text-base">
              {home.isGuest ? t("learning.hub.startLearning") : t("learning.hub.enrolledBody")}
            </p>
            {home.source === "demo_fallback" ? (
              <div className="mt-5 flex flex-wrap gap-3 text-xs text-white/70">
                <span className="rounded-full bg-white/10 px-3 py-1.5">
                  {t("learning.visual.streak")}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1.5">
                  {t("learning.visual.umPoints")}
                </span>
                <span className="rounded-full bg-white/10 px-3 py-1.5">
                  {t("learning.visual.achievements")} · {DEMO_ACHIEVEMENTS.length}
                </span>
              </div>
            ) : null}
          </section>

          {resume ? (
            <section
              className="grid gap-6 overflow-hidden rounded-[32px] border border-sky-400/20 bg-sky-500/10 md:grid-cols-[1.3fr_1fr]"
              aria-label={t("learning.hub.continueLearning")}
            >
              <div className="p-6 md:p-8">
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sky-100/70">
                  {t("learning.hub.continueLearning")}
                </p>
                <h2 className="mt-2 text-2xl font-black md:text-3xl">
                  {loc(resume.course.title, locale)}
                </h2>
                <p className="mt-2 text-sm text-white/65">
                  {loc(resume.course.subtitle, locale)}
                </p>
                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-sky-300 to-violet-400"
                    style={{ width: `${resume.enrollment.percent}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-white/50">
                  {t("learning.outline.courseProgress")} · {resume.enrollment.percent}%
                </p>
                <Link
                  href={
                    resume.enrollment.continueLessonId
                      ? hrefs.lesson(resume.enrollment.continueLessonId)
                      : hrefs.course(resume.course.slug)
                  }
                  className="watch-focus-ring mt-5 inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
                >
                  {t("learning.hub.resume")}
                </Link>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resume.course.cover}
                alt=""
                className="h-48 w-full object-cover md:h-full"
              />
            </section>
          ) : null}

          <section>
            <label className="sr-only" htmlFor="learning-visual-search">
              {t("learning.catalog.search")}
            </label>
            <input
              id="learning-visual-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("learning.catalog.searchPlaceholder")}
              className="watch-focus-ring w-full rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white placeholder:text-white/35"
            />
            <div
              className="mt-4 flex gap-2 overflow-x-auto pb-1"
              aria-label={t("learning.catalog.filtersAria")}
            >
              <button
                type="button"
                onClick={() => setCategory("all")}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                  category === "all" ? "bg-white text-black" : "border border-white/15 text-white/70"
                }`}
              >
                {t("learning.catalog.priceAll")}
              </button>
              {DEMO_CATEGORIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                    category === item.id
                      ? "bg-white text-black"
                      : "border border-white/15 text-white/70"
                  }`}
                >
                  {loc(item.label, locale)}
                </button>
              ))}
            </div>
          </section>

          {home.courses.length === 0 ? (
            <p className="text-sm text-white/60">{t("learning.visual.emptyCatalog")}</p>
          ) : query || category !== "all" ? (
            <section>
              <SectionTitle
                title={t("learning.catalog.showing", {
                  values: {
                    shown: String(filtered.length),
                    total: String(home.courses.length),
                  },
                })}
              />
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            </section>
          ) : (
            <>
              <section>
                <SectionTitle title={t("learning.visual.recommended")} />
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {rail(recommended).map((course) => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              </section>
              <section>
                <SectionTitle title={t("learning.visual.trending")} />
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {rail(trending).map((course) => (
                    <CourseCard key={`trend-${course.id}`} course={course} />
                  ))}
                </div>
              </section>
              <section>
                <SectionTitle title={t("learning.catalog.free")} />
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {rail(free).map((course) => (
                    <CourseCard key={`free-${course.id}`} course={course} />
                  ))}
                </div>
              </section>
              {fresh.length > 0 ? (
                <section>
                  <SectionTitle title={t("learning.visual.new")} />
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {fresh.map((course) => (
                      <CourseCard key={`new-${course.id}`} course={course} />
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}

          <section>
            <SectionTitle title={t("learning.visual.categories")} />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {DEMO_CATEGORIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCategory(item.id)}
                  className="overflow-hidden rounded-[22px] border border-white/10 text-start"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.cover} alt="" className="h-20 w-full object-cover" />
                  <p className="px-3 py-2 text-sm font-bold">{loc(item.label, locale)}</p>
                </button>
              ))}
            </div>
          </section>

          {home.teachers.length > 0 ? (
            <section>
              <SectionTitle title={t("learning.visual.featuredTeachers")} />
              <div className="flex gap-3 overflow-x-auto pb-2">
                {home.teachers.map((teacher) => (
                  <TeacherCard key={teacher.id} teacher={teacher} />
                ))}
              </div>
            </section>
          ) : null}

          {home.source === "demo_fallback" ? (
            <section className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
              <SectionTitle title={t("learning.visual.achievements")} />
              <ul className="flex flex-wrap gap-3">
                {DEMO_ACHIEVEMENTS.map((item) => (
                  <li
                    key={item.en}
                    className="rounded-full border border-violet-300/25 bg-violet-500/10 px-4 py-2 text-sm font-bold text-violet-100"
                  >
                    {loc(item, locale)}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-white/45">
                {t(LEVEL_KEY.beginner)}
              </p>
            </section>
          ) : null}
        </div>
      )}
    </VisualShell>
  );
}
