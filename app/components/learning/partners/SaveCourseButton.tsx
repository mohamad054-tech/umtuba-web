"use client";

import { useEffect, useState } from "react";
import { tCopy } from "../../../../lib/learning/partners/copy";
import {
  LEARNING_SAVED_COURSES_STORAGE_KEY,
  parseSavedCourseIds,
  toggleSavedCourseId,
} from "../../../../lib/learning/partners/savedCourses";

type SaveCourseButtonProps = {
  courseId: string;
  locale: "en" | "ar";
};

export default function SaveCourseButton({
  courseId,
  locale,
}: SaveCourseButtonProps) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const ids = parseSavedCourseIds(
      window.localStorage.getItem(LEARNING_SAVED_COURSES_STORAGE_KEY)
    );
    setSaved(ids.includes(courseId));
  }, [courseId]);

  return (
    <button
      type="button"
      className="watch-focus-ring rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-white/80 hover:border-white/40"
      onClick={() => {
        const current = parseSavedCourseIds(
          window.localStorage.getItem(LEARNING_SAVED_COURSES_STORAGE_KEY)
        );
        const next = toggleSavedCourseId(current, courseId);
        window.localStorage.setItem(
          LEARNING_SAVED_COURSES_STORAGE_KEY,
          JSON.stringify(next)
        );
        setSaved(next.includes(courseId));
      }}
    >
      {saved ? tCopy("saved", locale) : tCopy("save", locale)}
    </button>
  );
}
