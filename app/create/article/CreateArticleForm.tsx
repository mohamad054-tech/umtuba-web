"use client";

import { useMemo, useState } from "react";
import { publishArticleAction } from "../../actions/articles";
import {
  TEASER_GRADIENT_TEMPLATES,
  type TeaserBackgroundMode,
  type TeaserGradientTemplate,
} from "../../../lib/articles/articleTeaserFoundation";
import {
  layoutTeaserTitle,
  teaserCtaForTitle,
} from "../../../lib/articles/articleTeaserTitleLayout";

type TeaserOption = { id: number; caption: string };

type CreateArticleFormProps = {
  teasers: TeaserOption[];
  authorUsername: string;
  errorMessage?: string | null;
};

const GRADIENT_CSS: Record<TeaserGradientTemplate, string> = {
  midnight: "linear-gradient(160deg,#050510 0%,#0b1a3a 45%,#12203a 100%)",
  aurora: "linear-gradient(160deg,#071a2a 0%,#0d3b4a 40%,#1a5c4a 100%)",
  ember: "linear-gradient(160deg,#1a0b0b 0%,#3a1510 45%,#4a2010 100%)",
};

export default function CreateArticleForm({
  teasers,
  authorUsername,
  errorMessage = null,
}: CreateArticleFormProps) {
  const [title, setTitle] = useState("");
  const [teaserPostId, setTeaserPostId] = useState("");
  const [backgroundMode, setBackgroundMode] =
    useState<TeaserBackgroundMode>("gradient");
  const [gradientTemplate, setGradientTemplate] =
    useState<TeaserGradientTemplate>("midnight");
  const [backgroundAssetPath, setBackgroundAssetPath] = useState("");
  const [bgPreviewUrl, setBgPreviewUrl] = useState<string | null>(null);

  const needsAutoTeaser = !teaserPostId;
  const layout = useMemo(() => layoutTeaserTitle(title || "عنوان المقالة"), [title]);
  const cta = teaserCtaForTitle(title || "عنوان المقالة");
  const author = authorUsername.replace(/^@/, "") || "creator";

  async function handleBackgroundFile(file: File | null) {
    setBgPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
    if (!file) {
      setBackgroundAssetPath("");
      return;
    }
    // Client uploads into post-images; store public URL path marker for worker download.
    try {
      const { uploadPostImage } = await import("../../../lib/supabase/posts");
      const url = await uploadPostImage(file);
      setBackgroundAssetPath(url);
      setBackgroundMode("uploaded_image");
    } catch (error) {
      console.error(error);
      setBackgroundAssetPath("");
    }
  }

  const previewBackground =
    backgroundMode === "uploaded_image" && bgPreviewUrl
      ? `center / cover no-repeat url(${bgPreviewUrl})`
      : backgroundMode === "plain"
        ? "#0a0a12"
        : GRADIENT_CSS[gradientTemplate];

  return (
    <form action={publishArticleAction} className="space-y-4 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
      {errorMessage ? (
        <p
          role="alert"
          className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
        >
          {errorMessage}
        </p>
      ) : null}

      <label className="block text-sm text-white/70">
        Title
        <input
          name="title"
          required
          maxLength={200}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-white"
          placeholder="Article title"
        />
      </label>

      <label className="block text-sm text-white/70">
        Full article
        <textarea
          name="body"
          required
          rows={12}
          maxLength={50000}
          className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-white"
          placeholder="Write the full article…"
        />
      </label>

      <label className="block text-sm text-white/70">
        Teaser video (optional)
        <select
          name="teaserPostId"
          value={teaserPostId}
          onChange={(event) => setTeaserPostId(event.target.value)}
          className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-white"
        >
          <option value="">Auto 5s teaser — generate for me</option>
          {teasers.map((video) => (
            <option key={video.id} value={video.id}>
              #{video.id} · {video.caption.slice(0, 60)}
            </option>
          ))}
        </select>
      </label>

      {needsAutoTeaser ? (
        <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">
                Auto teaser preview
              </p>
              <p className="mt-1 text-xs text-white/50">9:16 · 5 seconds · silent</p>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[220px]">
            <div
              className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
              style={{ background: previewBackground }}
              dir={layout.direction}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/20" />
              <div className="absolute inset-x-4 top-[38%] space-y-2 text-center">
                {layout.lines.map((line) => (
                  <p
                    key={line}
                    className="font-black leading-tight text-white drop-shadow"
                    style={{ fontSize: Math.max(14, layout.fontSize * 0.28) }}
                  >
                    {line}
                  </p>
                ))}
                <p className="pt-2 text-[11px] font-medium text-white/55">@{author}</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/65">
                  {cta}
                </p>
              </div>
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm text-white/70">Background</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ["gradient", "UMTUBA gradient"],
                  ["plain", "Simple dark"],
                  ["uploaded_image", "Upload image"],
                  ["article_image", "Article image (soon)"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
                    backgroundMode === value
                      ? "border-sky-300/40 bg-sky-500/10"
                      : "border-white/10 bg-white/5"
                  } ${value === "article_image" ? "opacity-50" : ""}`}
                >
                  <input
                    type="radio"
                    value={value}
                    checked={backgroundMode === value}
                    disabled={value === "article_image"}
                    onChange={() => setBackgroundMode(value)}
                  />
                  {label}
                </label>
              ))}
            </div>
            <input type="hidden" name="backgroundMode" value={backgroundMode} />
          </fieldset>

          {backgroundMode === "gradient" ? (
            <label className="block text-sm text-white/70">
              Gradient template
              <select
                name="gradientTemplate"
                value={gradientTemplate}
                onChange={(event) =>
                  setGradientTemplate(event.target.value as TeaserGradientTemplate)
                }
                className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-white"
              >
                {TEASER_GRADIENT_TEMPLATES.map((template) => (
                  <option key={template} value={template}>
                    {template}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <input type="hidden" name="gradientTemplate" value={gradientTemplate} />
          )}

          {backgroundMode === "uploaded_image" ? (
            <label className="block text-sm text-white/70">
              Background image
              <input
                type="file"
                accept="image/*"
                className="mt-1 block w-full text-sm text-white/70"
                onChange={(event) =>
                  void handleBackgroundFile(event.target.files?.[0] ?? null)
                }
              />
            </label>
          ) : null}

          <input
            type="hidden"
            name="backgroundAssetPath"
            value={backgroundAssetPath}
          />

          <p className="text-xs text-white/45">
            Audio: silent (V1). Platform music library and user audio upload are
            deferred.
          </p>
        </div>
      ) : (
        <>
          <input type="hidden" name="backgroundMode" value="plain" />
          <input type="hidden" name="gradientTemplate" value="midnight" />
          <input type="hidden" name="backgroundAssetPath" value="" />
        </>
      )}

      {teasers.length === 0 && needsAutoTeaser ? (
        <p className="text-xs text-white/45">
          No ready videos linked yet. We will generate a silent 5-second title
          teaser for Home after publish.
        </p>
      ) : null}

      <button
        type="submit"
        className="watch-focus-ring w-full rounded-full bg-white px-5 py-3 text-sm font-black text-black"
      >
        Publish article
      </button>
    </form>
  );
}
