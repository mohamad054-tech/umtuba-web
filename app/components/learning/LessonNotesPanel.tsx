"use client";

import { useEffect, useState, useTransition } from "react";
import {
  createLessonNoteAction,
  deleteLessonNoteAction,
  listLessonNotesAction,
  updateLessonNoteAction,
} from "../../learning/lessonNotesActions";
import type { LearningLessonNote } from "../../../lib/learning/lessonNotesFoundation";
import { LEARNING_LESSON_NOTE_BODY_MAX } from "../../../lib/learning/lessonNotesFoundation";

type Props = {
  lessonId: string;
};

function formatPosition(seconds: number | null): string | null {
  if (seconds === null) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function LessonNotesPanel({ lessonId }: Props) {
  const [notes, setNotes] = useState<LearningLessonNote[]>([]);
  const [body, setBody] = useState("");
  const [position, setPosition] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editPosition, setEditPosition] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      setError(null);
      const result = await listLessonNotesAction(lessonId);
      if (cancelled) return;
      if (!result.ok) {
        setError(result.message);
        setLoaded(true);
        return;
      }
      setNotes(result.data);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  function parsePositionInput(raw: string): number | null | "invalid" {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (!/^\d+$/.test(trimmed)) return "invalid";
    return Number(trimmed);
  }

  function onCreate() {
    const pos = parsePositionInput(position);
    if (pos === "invalid") {
      setError("Lesson position must be zero or a positive number of seconds.");
      return;
    }
    startTransition(async () => {
      setError(null);
      setStatus("Saving…");
      const result = await createLessonNoteAction({
        lessonId,
        body,
        lessonPositionSeconds: pos,
      });
      if (!result.ok) {
        setError(result.message);
        setStatus(null);
        return;
      }
      setNotes((prev) => [result.data, ...prev.filter((n) => n.id !== result.data.id)]);
      setBody("");
      setPosition("");
      setStatus("Note saved.");
    });
  }

  function onStartEdit(note: LearningLessonNote) {
    setConfirmDeleteId(null);
    setEditingId(note.id);
    setEditBody(note.body);
    setEditPosition(
      note.lesson_position_seconds === null
        ? ""
        : String(note.lesson_position_seconds)
    );
    setError(null);
    setStatus(null);
  }

  function onCancelEdit() {
    setEditingId(null);
    setEditBody("");
    setEditPosition("");
  }

  function onSaveEdit() {
    if (!editingId) return;
    const pos = parsePositionInput(editPosition);
    if (pos === "invalid") {
      setError("Lesson position must be zero or a positive number of seconds.");
      return;
    }
    startTransition(async () => {
      setError(null);
      setStatus("Saving…");
      const result = await updateLessonNoteAction({
        noteId: editingId,
        body: editBody,
        lessonPositionSeconds: pos,
      });
      if (!result.ok) {
        setError(result.message);
        setStatus(null);
        return;
      }
      setNotes((prev) =>
        [result.data, ...prev.filter((n) => n.id !== result.data.id)]
      );
      onCancelEdit();
      setStatus("Note updated.");
    });
  }

  function onDelete(noteId: string) {
    startTransition(async () => {
      setError(null);
      setStatus("Deleting…");
      const result = await deleteLessonNoteAction(noteId);
      if (!result.ok) {
        setError(result.message);
        setStatus(null);
        return;
      }
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      setConfirmDeleteId(null);
      if (editingId === noteId) onCancelEdit();
      setStatus("Note deleted.");
    });
  }

  return (
    <section
      className="space-y-4 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 backdrop-blur-xl md:p-7"
      data-testid="learning-lesson-notes"
      aria-label="Personal lesson notes"
    >
      <div>
        <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          Notes
        </h2>
        <p className="mt-1 text-sm text-white/50">
          Private notes for this lesson. Only you can see them.
        </p>
      </div>

      <form
        className="space-y-3"
        data-testid="learning-lesson-notes-create"
        onSubmit={(e) => {
          e.preventDefault();
          onCreate();
        }}
      >
        <label className="block space-y-1">
          <span className="text-xs font-bold text-white/55">New note</span>
          <textarea
            aria-label="New note text"
            data-testid="learning-lesson-notes-create-body"
            className="watch-focus-ring min-h-[96px] w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            value={body}
            maxLength={LEARNING_LESSON_NOTE_BODY_MAX}
            onChange={(e) => setBody(e.target.value)}
            disabled={pending}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold text-white/55">
            Position (seconds, optional)
          </span>
          <input
            type="text"
            inputMode="numeric"
            aria-label="Optional lesson position in seconds"
            data-testid="learning-lesson-notes-create-position"
            className="watch-focus-ring w-full max-w-[12rem] rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            disabled={pending}
            placeholder="e.g. 90"
          />
        </label>
        <button
          type="submit"
          data-testid="learning-lesson-notes-create-submit"
          className="watch-focus-ring rounded-full bg-white px-5 py-2.5 text-sm font-black text-black disabled:opacity-50"
          disabled={pending || !body.trim()}
        >
          Add note
        </button>
      </form>

      {error ? (
        <p
          role="alert"
          data-testid="learning-lesson-notes-error"
          className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {error}
        </p>
      ) : null}

      {status ? (
        <p
          role="status"
          data-testid="learning-lesson-notes-status"
          className="text-sm text-white/55"
        >
          {status}
        </p>
      ) : null}

      <div data-testid="learning-lesson-notes-list" className="space-y-3">
        {!loaded ? (
          <p className="text-sm text-white/45" role="status">
            Loading notes…
          </p>
        ) : notes.length === 0 ? (
          <p
            className="text-sm text-white/45"
            data-testid="learning-lesson-notes-empty"
          >
            No notes yet. Add a private note while you study.
          </p>
        ) : (
          notes.map((note) => (
            <article
              key={note.id}
              className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
              data-testid={`learning-lesson-note-${note.id}`}
            >
              {editingId === note.id ? (
                <div className="space-y-3">
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-white/55">
                      Edit note
                    </span>
                    <textarea
                      aria-label="Edit note text"
                      data-testid="learning-lesson-notes-edit-body"
                      className="watch-focus-ring min-h-[96px] w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                      value={editBody}
                      maxLength={LEARNING_LESSON_NOTE_BODY_MAX}
                      onChange={(e) => setEditBody(e.target.value)}
                      disabled={pending}
                    />
                  </label>
                  <label className="block space-y-1">
                    <span className="text-xs font-bold text-white/55">
                      Position (seconds, optional)
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      aria-label="Edit optional lesson position in seconds"
                      data-testid="learning-lesson-notes-edit-position"
                      className="watch-focus-ring w-full max-w-[12rem] rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                      value={editPosition}
                      onChange={(e) => setEditPosition(e.target.value)}
                      disabled={pending}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      data-testid="learning-lesson-notes-edit-save"
                      className="watch-focus-ring rounded-full bg-white px-4 py-2 text-sm font-black text-black disabled:opacity-50"
                      onClick={onSaveEdit}
                      disabled={pending || !editBody.trim()}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      data-testid="learning-lesson-notes-edit-cancel"
                      className="watch-focus-ring rounded-full border border-white/20 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                      onClick={onCancelEdit}
                      disabled={pending}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-sm text-white/85">
                    {note.body}
                  </p>
                  {formatPosition(note.lesson_position_seconds) ? (
                    <p className="mt-2 text-xs text-white/40">
                      At {formatPosition(note.lesson_position_seconds)}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="watch-focus-ring text-sm font-bold text-sky-300 underline underline-offset-2 disabled:opacity-50"
                      data-testid={`learning-lesson-note-edit-${note.id}`}
                      onClick={() => onStartEdit(note)}
                      disabled={pending}
                    >
                      Edit
                    </button>
                    {confirmDeleteId === note.id ? (
                      <>
                        <button
                          type="button"
                          className="watch-focus-ring text-sm font-bold text-rose-300 underline underline-offset-2 disabled:opacity-50"
                          data-testid={`learning-lesson-note-delete-confirm-${note.id}`}
                          onClick={() => onDelete(note.id)}
                          disabled={pending}
                        >
                          Confirm delete
                        </button>
                        <button
                          type="button"
                          className="watch-focus-ring text-sm font-bold text-white/55 underline underline-offset-2 disabled:opacity-50"
                          data-testid={`learning-lesson-note-delete-cancel-${note.id}`}
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={pending}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="watch-focus-ring text-sm font-bold text-rose-300/90 underline underline-offset-2 disabled:opacity-50"
                        data-testid={`learning-lesson-note-delete-${note.id}`}
                        onClick={() => setConfirmDeleteId(note.id)}
                        disabled={pending}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
