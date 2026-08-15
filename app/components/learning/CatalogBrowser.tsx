"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  LEARNING_PUBLIC_ROUTES,
  type PublicCourseCard,
} from "../../../lib/learning/publicCatalog";
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

export default function CatalogBrowser({ courses }: CatalogBrowserProps) {
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
        <LearningStatePanel title="No public courses yet">
          Published courses will appear here when available.
        </LearningStatePanel>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-5">
      <form
        className="space-y-3 rounded-[28px] border border-white/10 bg-[#080816]/60 p-4"
        role="search"
        aria-label="Catalog filters"
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="block text-sm text-white/70">
          Search
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Course name, skill, or topic"
            className="mt-1.5 min-h-11 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-sky-400/40 focus:outline-none"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-2">
          <label className="block text-sm text-white/70">
            Level
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white"
            >
              <option value="all">All levels</option>
              {difficulties.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-white/70">
            Price
            <select
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white"
            >
              <option value="all">All</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-white/45" aria-live="polite">
            Showing {filtered.length} of {courses.length}
          </p>
          {filtersActive ? (
            <button
              type="button"
              onClick={clearFilters}
              className="watch-focus-ring inline-flex min-h-11 items-center rounded-full border border-white/20 px-4 py-2 text-sm font-bold text-white/80 hover:border-white/40"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </form>

      {filtered.length === 0 ? (
        <LearningStatePanel
          title="No matches"
          action={
            <button
              type="button"
              onClick={clearFilters}
              className="watch-focus-ring inline-flex min-h-11 items-center rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
            >
              Clear filters
            </button>
          }
        >
          Try a different search or clear filters.
        </LearningStatePanel>
      ) : (
        <ul className="space-y-4">
          {filtered.map((course) => {
            const imageUrl = course.thumbnail_url ?? course.cover_url;
            const skills = course.skills.slice(0, 3);
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
                      {course.is_free ? "Free" : "Paid"}
                    </LearningStatusBadge>
                  </div>
                  {course.description ? (
                    <p className="mt-2 line-clamp-3 text-sm text-white/70">
                      {course.description}
                    </p>
                  ) : null}
                  {skills.length > 0 ? (
                    <ul className="mt-3 flex flex-wrap gap-2" aria-label="Skills">
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
                        <dt className="inline">Level: </dt>
                        <dd className="inline capitalize text-white/80">
                          {course.difficulty}
                        </dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="inline">Modules: </dt>
                      <dd className="inline text-white/80">
                        {course.module_count}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline">Lessons: </dt>
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
                      View Course
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
