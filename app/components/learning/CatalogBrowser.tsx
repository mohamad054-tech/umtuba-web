"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { TranslationKey } from "../../../lib/i18n/messages/types";
import {
  LEARNING_PUBLIC_ROUTES,
  type PublicCourseCard,
} from "../../../lib/learning/publicCatalog";
import { useTranslation } from "../i18n";
import { LearningStatePanel, LearningStatusBadge } from "./ds";

type CatalogBrowserProps = {
  courses: PublicCourseCard[];
};

function matchesQuery(course: PublicCourseCard, q: string) {
  if (!q) return true;
  const hay = [
    course.name,
    course.description ?? "",
    course.difficulty ?? "",
    ...course.skills,
    ...course.outcomes,
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(q);
}

function difficultyLabelKey(difficulty: string): TranslationKey | null {
  if (difficulty === "beginner") return "learning.difficulty.beginner";
  if (difficulty === "intermediate") return "learning.difficulty.intermediate";
  if (difficulty === "advanced") return "learning.difficulty.advanced";
  if (difficulty === "expert") return "learning.difficulty.expert";
  return null;
}

export default function CatalogBrowser({ courses }: CatalogBrowserProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [price, setPrice] = useState("all");

  const difficulties = useMemo(() => {
    const set = new Set<string>();
    for (const c of courses) {
      if (c.difficulty) set.add(c.difficulty);
    }
    return Array.from(set).sort();
  }, [courses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((course) => {
      if (!matchesQuery(course, q)) return false;
      if (difficulty !== "all" && course.difficulty !== difficulty) return false;
      if (price === "free" && !course.is_free) return false;
      if (price === "paid" && course.is_free) return false;
      return true;
    });
  }, [courses, query, difficulty, price]);

  const filtersActive =
    query.trim() !== "" || difficulty !== "all" || price !== "all";

  function clearFilters() {
    setQuery("");
    setDifficulty("all");
    setPrice("all");
  }

  if (courses.length === 0) {
    return (
      <div className="mt-8">
        <LearningStatePanel title={t("learning.catalog.emptyTitle")}>
          {t("learning.catalog.emptyBody")}
        </LearningStatePanel>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-5">
      <form
        className="space-y-3 rounded-[28px] border border-white/10 bg-[#080816]/60 p-4"
        role="search"
        aria-label={t("learning.catalog.filtersAria")}
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="block text-sm text-white/70">
          {t("learning.catalog.search")}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("learning.catalog.searchPlaceholder")}
            className="mt-1.5 min-h-11 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-sky-400/40 focus:outline-none"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-2">
          <label className="block text-sm text-white/70">
            {t("learning.catalog.level")}
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white"
            >
              <option value="all">{t("learning.catalog.allLevels")}</option>
              {difficulties.map((d) => {
                const key = difficultyLabelKey(d);
                return (
                  <option key={d} value={d}>
                    {key ? t(key) : d}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="block text-sm text-white/70">
            {t("learning.catalog.price")}
            <select
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white"
            >
              <option value="all">{t("learning.catalog.priceAll")}</option>
              <option value="free">{t("learning.catalog.free")}</option>
              <option value="paid">{t("learning.catalog.paid")}</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-white/45" aria-live="polite">
            {t("learning.catalog.showing", {
              values: { shown: filtered.length, total: courses.length },
            })}
          </p>
          {filtersActive ? (
            <button
              type="button"
              onClick={clearFilters}
              className="watch-focus-ring inline-flex min-h-11 items-center rounded-full border border-white/20 px-4 py-2 text-sm font-bold text-white/80 hover:border-white/40"
            >
              {t("learning.catalog.clearFilters")}
            </button>
          ) : null}
        </div>
      </form>

      {filtered.length === 0 ? (
        <LearningStatePanel
          title={t("learning.catalog.noMatchesTitle")}
          action={
            <button
              type="button"
              onClick={clearFilters}
              className="watch-focus-ring inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
            >
              {t("learning.catalog.clearFilters")}
            </button>
          }
        >
          {t("learning.catalog.noMatchesBody")}
        </LearningStatePanel>
      ) : (
        <ul className="space-y-4">
          {filtered.map((course) => {
            const imageUrl = course.thumbnail_url ?? course.cover_url;
            const skills = course.skills.slice(0, 3);
            const levelKey = course.difficulty
              ? difficultyLabelKey(course.difficulty)
              : null;
            return (
              <li
                key={course.id}
                className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] md:flex"
              >
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt=""
                    className="h-36 w-full object-cover sm:h-44 md:h-auto md:w-44 md:shrink-0 lg:w-52"
                  />
                ) : null}
                <div className="min-w-0 flex-1 px-4 py-4 md:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-lg font-black tracking-tight text-white">
                      {course.name}
                    </h2>
                    <LearningStatusBadge
                      tone={course.is_free ? "success" : "neutral"}
                    >
                      {course.is_free
                        ? t("learning.catalog.free")
                        : t("learning.catalog.paid")}
                    </LearningStatusBadge>
                  </div>
                  {course.description ? (
                    <p className="mt-2 line-clamp-3 text-sm text-white/70">
                      {course.description}
                    </p>
                  ) : null}
                  {skills.length > 0 ? (
                    <ul
                      className="mt-3 flex flex-wrap gap-2"
                      aria-label={t("learning.catalog.skills")}
                    >
                      {skills.map((skill) => (
                        <li key={skill}>
                          <LearningStatusBadge tone="neutral">
                            {skill}
                          </LearningStatusBadge>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/55">
                    {course.difficulty ? (
                      <div>
                        <dt className="inline">{t("learning.catalog.level")}: </dt>
                        <dd className="inline text-white/80">
                          {levelKey ? t(levelKey) : course.difficulty}
                        </dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="inline">{t("learning.catalog.modules")}: </dt>
                      <dd className="inline text-white/80">
                        {course.module_count}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline">{t("learning.catalog.lessons")}: </dt>
                      <dd className="inline text-white/80">
                        {course.lesson_count}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-4">
                    <Link
                      href={LEARNING_PUBLIC_ROUTES.course(course.slug)}
                      className="watch-focus-ring inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 text-sm font-black text-black hover:bg-white/90"
                    >
                      {t("learning.catalog.viewCourse")}
                    </Link>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
