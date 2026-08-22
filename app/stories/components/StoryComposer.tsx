"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { useTranslation } from "../../components/i18n";
import { createStoryAction } from "../../actions/stories";
import {
  STORY_ACCEPT_ATTR,
  STORY_FILE_HINT,
  STORY_ERRORS,
} from "../../../lib/stories";
import { uploadStoryMedia } from "../../../lib/stories/upload";
import { validateStoryCaption, validateStoryFile } from "../../../lib/stories/validation";
import { storyUserMessage } from "../../../lib/stories/errors";

type StoryComposerProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export default function StoryComposer({
  open,
  onClose,
  onCreated,
}: StoryComposerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [hasFile, setHasFile] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<File | null>(null);
  const { t } = useTranslation();

  if (!open) return null;

  const reset = () => {
    setCaption("");
    setFileLabel(null);
    setHasFile(false);
    setProgress(null);
    setError(null);
    fileRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleClose = () => {
    if (pending) return;
    reset();
    onClose();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setError(null);
    if (!file) {
      fileRef.current = null;
      setFileLabel(null);
      setHasFile(false);
      return;
    }
    const check = validateStoryFile({
      mimeType: file.type,
      byteSize: file.size,
      fileName: file.name,
    });
    if (!check.ok) {
      fileRef.current = null;
      setFileLabel(null);
      setHasFile(false);
      setError(check.message);
      return;
    }
    fileRef.current = file;
    setFileLabel(file.name);
    setHasFile(true);
  };

  const handleSubmit = () => {
    const file = fileRef.current;
    if (!file) {
      setError("Choose an image or video for your story.");
      return;
    }

    const captionCheck = validateStoryCaption(caption);
    if (!captionCheck.ok) {
      setError(captionCheck.message);
      return;
    }

    startTransition(async () => {
      setError(null);
      setProgress(0);
      try {
        const uploaded = await uploadStoryMedia(file, (p) => {
          setProgress(p.percent);
        });

        const result = await createStoryAction({
          mediaPath: uploaded.path,
          mediaType: uploaded.mediaType,
          mimeType: uploaded.mimeType,
          byteSize: uploaded.byteSize,
          caption: captionCheck.caption,
        });

        if (!result.ok) {
          setError(storyUserMessage(result.message, STORY_ERRORS.createFailed));
          setProgress(null);
          return;
        }

        reset();
        onCreated();
        onClose();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : STORY_ERRORS.uploadFailed;
        setError(storyUserMessage(message, STORY_ERRORS.uploadFailed));
        setProgress(null);
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={t("stories.addAria")}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close composer"
        onClick={handleClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-[#0a0a18] p-5 text-white shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-black tracking-tight">{t("stories.add")}</h2>
          <button
            type="button"
            onClick={handleClose}
            disabled={pending}
            className="rounded-full border border-white/15 px-3 py-1 text-xs font-bold text-white/70 hover:bg-white/10 disabled:opacity-50"
          >
            {t("actions.close")}
          </button>
        </div>

        <p className="mb-4 text-xs text-white/55">{STORY_FILE_HINT}</p>

        <label className="mb-3 flex cursor-pointer flex-col gap-2 rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-6 text-center transition hover:border-sky-400/40 hover:bg-white/[0.07]">
          <span className="text-sm font-bold text-white/90">
            {fileLabel ?? "Tap to choose media"}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept={STORY_ACCEPT_ATTR}
            className="sr-only"
            disabled={pending}
            onChange={handleFileChange}
          />
        </label>

        <label className="mb-3 block text-xs font-bold uppercase tracking-[0.14em] text-white/45">
          Caption
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            disabled={pending}
            rows={2}
            maxLength={500}
            placeholder="Optional"
            className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-sm font-medium text-white placeholder:text-white/30 focus:border-sky-400/50 focus:outline-none"
          />
        </label>

        {progress != null ? (
          <div className="mb-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-sky-400 transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] font-bold text-white/50">
              Uploading… {progress}%
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="mb-3 text-sm font-bold text-rose-300" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending || !hasFile}
          className="w-full rounded-full bg-white px-4 py-3 text-sm font-black text-black transition hover:bg-white/90 disabled:opacity-40"
        >
          {pending ? "Publishing…" : "Share to Story"}
        </button>
      </div>
    </div>
  );
}
