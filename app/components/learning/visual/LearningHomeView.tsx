"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "../../i18n";
import type { TranslationKey } from "../../../../lib/i18n/messages/types";
import {
  DEMO_CATEGORIES,
  loc,
  type DemoCategoryId,
} from "../../../../lib/learning/visualDemo";
import type { LearningHomeSurface } from "../../../../lib/learning/productization";
import VisualShell from "./VisualShell";
import { CourseCard, SectionTitle } from "./cards";

const LEVEL_KEY: Record<string, TranslationKey> = {
  beginner: "learning.difficulty.beginner",
  intermediate: "learning.difficulty.intermediate",
  advanced: "learning.difficulty.advanced",
};

export default function LearningHomeView({
  home,
  headerExtra,
  embedded = false,
  initialCategory = "all",
  isTeacher = false,
}: {
  home: LearningHomeSurface;
  headerExtra?: ReactNode;
  embedded?: boolean;
  initialCategory?: DemoCategoryId | "all";
  isTeacher?: boolean;
}) {
  const { t, locale } = useTranslation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<DemoCategoryId | "all">(
    initialCategory
  );

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

  const body = (
    <div className="space-y-12" data-learning-discover="catalog">
      <section>
        <h1 className="text-2xl font-black tracking-tight md:text-3xl">
          {t("learning.visual.discover")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/65">
          {t("learning.catalog.subtitle")}
        </p>
      </section>

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
      <p className="sr-only">{t(LEVEL_KEY.beginner)}</p>
    </div>
  );

  if (embedded) {
    return (
      <>
        {headerExtra}
        {body}
      </>
    );
  }

  return (
    <VisualShell
      title={t("learning.hub.title")}
      subtitle={t("learning.catalog.subtitle")}
      source={home.source}
      headerExtra={headerExtra}
      learningNav={{ isTeacher, activeSection: "discover" }}
    >
      {body}
    </VisualShell>
  );
}
