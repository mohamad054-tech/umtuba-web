"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  LEARNING_PUBLIC_ROUTES,
  type PublicCourseCard,
} from "../../../lib/learning/publicCatalog";
import { LEARNING_COURSE_DIFFICULTIES } from "../../../lib/learning/coursesFoundation";
import LearningEmptyState from "./ui/LearningEmptyState";
import { learningBtnPrimary, learningCard, learningChip, learningInput } from "./ui/tokens";

type CatalogBrowserProps = {
  courses: PublicCourseCard[];
};

function matchesQuery(course: PublicCourseCard, query: string) {
  if (!query) return true;
  const hay = [
    course.name,
    course.description ?? "",
    course.skills.join(" "),
    course.difficulty ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return hay.includes(query);
}

export default function CatalogBrowser({ courses }: CatalogBrowserProps) {
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [price, setPrice] = useState<"all" | "free" | "paid">("all");

  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return courses.filter((course) => {
      if (!matchesQuery(course, normalizedQuery)) return false;
      if (difficulty !== "all" && course.difficulty !== difficulty) return false;
      if (price === "free" && !course.is_free) return false;
      if (price === "paid" && course.is_free) return false;
      return true;
    });
  }, [courses, difficulty, normalizedQuery, price]);

  const hasPriceMix = courses.some((c) => c.is_free) && courses.some((c) => !c.is_free);

  return (
    <div className="mt-6 space-y-6">
      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-3 sm:grid-cols-[1fr_auto_auto]"
      >
        <label className="block">
          <span className="sr-only">Search courses</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses, skills, topics…"
            className={learningInput}
          />
        </label>
        <label className="block">
          <span className="sr-only">Filter by level</span>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className={learningInput}
          >
            <option value="all">All levels</option>
            {LEARNING_COURSE_DIFFICULTIES.map((level) => (
              <option key={level} value={level}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </option>
            ))}
          </select>
        </label>
        {hasPriceMix ? (
          <label className="block">
            <span className="sr-only">Filter by price</span>
            <select
              value={price}
              onChange={(e) => setPrice(e.target.value as typeof price)}
              className={learningInput}
            >
              <option value="all">All prices</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </label>
        ) : null}
      </form>

      <p className="text-xs text-white/45" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "course" : "courses"}
        {normalizedQuery || difficulty !== "all" || price !== "all"
          ? " matching your filters"
          : " available"}
      </p>

      {filtered.length === 0 ? (
        <LearningEmptyState
          title="No matching courses"
          body="Try a different search or clear the filters to see the full catalog."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((course) => {
            const imageUrl = course.thumbnail_url ?? course.cover_url;
            return (
              <li key={course.id}>
                <article className={`${learningCard} flex h-full flex-col overflow-hidden transition hover:border-white/25`}>
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt=""
                      className="h-40 w-full object-cover"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="h-28 bg-gradient-to-br from-sky-500/20 via-indigo-500/10 to-transparent"
                    />
                  )}
                  <div className="flex flex-1 flex-col px-4 py-4">
                    <h2 className="text-lg font-bold tracking-tight text-white">
                      {course.name}
                    </h2>
                    {course.description ? (
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/65">
                        {course.description}
                      </p>
                    ) : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {course.difficulty ? (
                        <span className={learningChip}>
                          {course.difficulty}
                        </span>
                      ) : null}
                      <span className={learningChip}>
                        {course.lesson_count} lessons
                      </span>
                      <span
                        className={`${learningChip} ${
                          course.is_free
                            ? "border-emerald-400/25 text-emerald-200"
                            : ""
                        }`}
                      >
                        {course.is_free ? "Free" : "Paid"}
                      </span>
                    </div>
                    <p className="mt-auto pt-4">
                      <Link
                        href={LEARNING_PUBLIC_ROUTES.course(course.slug)}
                        className={learningBtnPrimary}
                      >
                        View Course
                      </Link>
                    </p>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
