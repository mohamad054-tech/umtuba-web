"use client";

import { useTransition } from "react";
import { useState } from "react";
import {
  removeLessonBookmarkAction,
  saveLessonBookmarkAction,
} from "../../learning/lessonBookmarkActions";

type Props = {
  lessonId: string;
  initialSaved: boolean;
};

export default function LessonBookmarkControl({
  lessonId,
  initialSaved,
}: Props) {
  const [saved, setSaved] = useState(initialSaved);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onToggle() {
    startTransition(async () => {
      setError(null);
      const result = saved
        ? await removeLessonBookmarkAction(lessonId)
        : await saveLessonBookmarkAction(lessonId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSaved(result.data.saved);
    });
  }

  return (
    <div data-testid="learning-lesson-bookmark-control">
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        aria-pressed={saved}
        aria-label={saved ? "Remove from saved lessons" : "Save lesson"}
        data-testid="learning-lesson-bookmark-toggle"
        className="watch-focus-ring rounded-full border border-white/20 bg-transparent px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : saved ? "Remove from saved" : "Save lesson"}
      </button>
      {error ? (
        <p
          role="alert"
          className="mt-2 text-xs text-rose-100"
          data-testid="learning-lesson-bookmark-error"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
