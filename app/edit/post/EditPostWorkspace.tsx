"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { deletePostAction } from "../../actions/deletePost";
import { updateOwnedPostAction } from "../../actions/updateOwnedPost";
import VideoTrimTimeline from "../../create/video/VideoTrimTimeline";
import { sanitizeUserFacingMessage } from "../../lib/product/userFacingMessage";
import { useDialogA11y } from "../../lib/product/useDialogA11y";
import { APP_ROUTES } from "../../lib/nav";
import {
  uploadPostImage,
  uploadPostVideo,
  deleteUploadedPostVideo,
} from "../../../lib/supabase/posts";
import {
  MAX_CAPTION_LENGTH,
  VIDEO_ACCEPT_ATTR,
  VIDEO_FILE_HINT,
  validateVideoFile,
} from "../../../lib/supabase/videoPostsShared";
import {
  normalizeTrimRange,
  type VideoTrimRange,
} from "../../../lib/media/videoTrim";
import type { EditOwnedPostInput } from "../../../lib/posts/editOwnedPost";

export type EditPostWorkspaceModel = {
  postId: number;
  postType: string;
  mediaStatus: string | null;
  isDraft: boolean;
  content: string;
  imageUrl: string | null;
  videoUrl: string | null;
  videoPath: string | null;
  durationMs: number | null;
  trim: VideoTrimRange | null;
  coverUrl: string | null;
  articleId: string | null;
  articleTitle: string;
  articleBody: string;
  publicUrl: string;
};

type EditPostWorkspaceProps = {
  model: EditPostWorkspaceModel;
};

function extractHashtagTokens(content: string): string {
  return (content.match(/#[\p{L}\p{N}_]+/gu) ?? []).join(" ");
}

export default function EditPostWorkspace({ model }: EditPostWorkspaceProps) {
  const router = useRouter();
  const captionId = useId();
  const hashtagId = useId();
  const titleId = useId();
  const bodyId = useId();
  const errorId = useId();
  const deleteTitleId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const deleteDialogRef = useRef<HTMLDivElement | null>(null);
  const deleteConfirmRef = useRef<HTMLButtonElement | null>(null);

  const [content, setContent] = useState(model.content);
  const [hashtags, setHashtags] = useState(extractHashtagTokens(model.content));
  const [articleTitle, setArticleTitle] = useState(model.articleTitle);
  const [articleBody, setArticleBody] = useState(model.articleBody);
  const [removeArticle, setRemoveArticle] = useState(false);
  const [imagePreview, setImagePreview] = useState(model.imageUrl ?? "");
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState(model.videoUrl ?? "");
  const [durationMs, setDurationMs] = useState(model.durationMs ?? 0);
  const [trim, setTrim] = useState<VideoTrimRange>(
    model.trim ?? { inMs: 0, outMs: model.durationMs ?? 1000 }
  );
  const [coverPreview, setCoverPreview] = useState(model.coverUrl ?? "");
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null);
  const [clearCover, setClearCover] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [pending, setPending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  const isVideo = model.postType === "video" || Boolean(model.videoUrl || pendingVideoFile);
  const isImage = model.postType === "image" || Boolean(imagePreview);
  const deleteCopy = isVideo
    ? {
        label: "Delete video",
        title: "Delete this video?",
        body: "This permanently removes the video from Watch, Discover, your profile, and search. This cannot be undone.",
        confirm: "Delete video",
      }
    : {
        label: "Delete post",
        title: "Delete this post?",
        body: "This permanently removes the post from your profile and feeds. This cannot be undone.",
        confirm: "Delete post",
      };

  useDialogA11y({
    open: deleteOpen,
    onClose: () => {
      if (!pending) {
        setDeleteOpen(false);
      }
    },
    containerRef: deleteDialogRef,
    initialFocusRef: deleteConfirmRef,
  });

  useEffect(() => {
    return () => {
      if (videoPreview && videoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(videoPreview);
      }
      if (imagePreview && imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
      if (coverPreview && coverPreview.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreview);
      }
    };
  }, [coverPreview, imagePreview, videoPreview]);

  useEffect(() => {
    if (!isVideo || !videoPreview || durationMs > 0) {
      return;
    }
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.src = videoPreview;
    probe.onloadedmetadata = () => {
      const nextDuration = Math.round((probe.duration || 0) * 1000);
      if (nextDuration < 250) {
        return;
      }
      setDurationMs(nextDuration);
      setTrim((prev) =>
        prev.outMs > prev.inMs ? prev : { inMs: 0, outMs: nextDuration }
      );
    };
  }, [durationMs, isVideo, videoPreview]);

  const hashtagList = useMemo(
    () =>
      hashtags
        .split(/[\s,]+/)
        .map((tag) => tag.replace(/^#+/, "").trim())
        .filter(Boolean),
    [hashtags]
  );

  function handleCancel() {
    router.push(model.publicUrl);
  }

  async function handleConfirmDelete() {
    if (pending) {
      return;
    }
    setPending(true);
    setErrorMessage("");
    const result = await deletePostAction(model.postId);
    if (!result.ok) {
      setPending(false);
      setErrorMessage(
        sanitizeUserFacingMessage(result.message, "Unable to delete this. Please try again.")
      );
      return;
    }
    router.push(APP_ROUTES.home);
    router.refresh();
  }

  async function handleSave() {
    if (pending) return;
    setPending(true);
    setErrorMessage("");
    setStatusMessage("");

    let uploadedVideoPath: string | null = null;

    try {
      const media: EditOwnedPostInput["media"] = { kind: "none" };

      if (removeImage && !isVideo) {
        media.kind = "remove_image";
        media.validated = true;
      } else if (pendingImageFile) {
        const imageUrl = await uploadPostImage(pendingImageFile);
        media.kind = model.imageUrl ? "replace_image" : "add_image";
        media.imageUrl = imageUrl;
        media.validated = true;
      }

      if (pendingVideoFile) {
        const fileCheck = validateVideoFile({
          mimeType: pendingVideoFile.type,
          byteSize: pendingVideoFile.size,
          fileName: pendingVideoFile.name,
        });
        if (!fileCheck.ok) {
          throw new Error(fileCheck.message);
        }
        const uploaded = await uploadPostVideo(pendingVideoFile);
        uploadedVideoPath = uploaded.path;
        media.kind = "replace_video";
        media.candidatePath = uploaded.path;
        media.mimeType = uploaded.mimeType;
        media.byteSize = uploaded.byteSize;
        media.validated = true;
      }

      let coverUrl: string | null = null;
      if (pendingCoverFile) {
        coverUrl = await uploadPostImage(pendingCoverFile);
      }

      const nextTrim =
        isVideo && durationMs > 0
          ? normalizeTrimRange(trim, durationMs)
          : null;

      const result = await updateOwnedPostAction({
        postId: model.postId,
        content,
        hashtags: hashtagList,
        articleTitle: removeArticle ? null : articleTitle,
        articleBody: removeArticle ? null : articleBody,
        removeArticle,
        trim: nextTrim,
        coverUrl,
        clearCover: clearCover && !coverUrl,
        media,
      });

      if (!result.ok) {
        if (uploadedVideoPath) {
          await deleteUploadedPostVideo(uploadedVideoPath);
        }
        setErrorMessage(
          sanitizeUserFacingMessage(result.message, "Unable to save this edit.")
        );
        setPending(false);
        return;
      }

      setStatusMessage("Saved. Same post, same URL.");
      router.push(result.publicUrl);
      router.refresh();
    } catch (error) {
      if (uploadedVideoPath) {
        await deleteUploadedPostVideo(uploadedVideoPath);
      }
      setErrorMessage(
        sanitizeUserFacingMessage(
          error instanceof Error ? error.message : null,
          "Unable to save this edit."
        )
      );
      setPending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-5">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl md:p-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
          {model.isDraft ? "Draft" : "Published"} · Post #{model.postId}
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight">
          Edit {isVideo ? "video" : "post"}
        </h1>
        <p className="mt-2 text-sm text-white/55">
          Changes update this same post. Comments, likes, views, and the public
          URL stay on Post ID {model.postId}.
        </p>

        <div className="mt-5 space-y-4">
          <label htmlFor={captionId} className="block text-sm font-bold text-white/80">
            {isVideo ? "Caption" : "Text"}
          </label>
          <textarea
            id={captionId}
            value={content}
            maxLength={MAX_CAPTION_LENGTH}
            rows={5}
            onChange={(event) => setContent(event.target.value)}
            className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-white"
          />

          <label htmlFor={hashtagId} className="block text-sm font-bold text-white/80">
            Hashtags
          </label>
          <input
            id={hashtagId}
            value={hashtags}
            onChange={(event) => setHashtags(event.target.value)}
            placeholder="#umtuba #travel"
            className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-white"
          />

          <div className="space-y-2 rounded-2xl border border-white/10 bg-black/25 p-3">
            <p className="text-sm font-bold text-white/80">Article / body</p>
            <input
              id={titleId}
              value={articleTitle}
              onChange={(event) => {
                setArticleTitle(event.target.value);
                setRemoveArticle(false);
              }}
              placeholder="Title"
              maxLength={200}
              className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-white"
            />
            <textarea
              id={bodyId}
              value={articleBody}
              onChange={(event) => {
                setArticleBody(event.target.value);
                setRemoveArticle(false);
              }}
              placeholder="Add, edit, or extend the article body"
              rows={8}
              maxLength={50000}
              className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-white"
            />
            {model.articleId ? (
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={removeArticle}
                  onChange={(event) => setRemoveArticle(event.target.checked)}
                />
                Remove article from this post
              </label>
            ) : null}
          </div>

          {!isVideo ? (
            <div className="space-y-2">
              <p className="text-sm font-bold text-white/80">Image</p>
              {imagePreview && !removeImage ? (
                <img
                  src={imagePreview}
                  alt=""
                  className="h-48 w-full rounded-xl object-cover"
                />
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setPendingImageFile(file);
                  setRemoveImage(false);
                  if (file) {
                    if (imagePreview.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
                    setImagePreview(URL.createObjectURL(file));
                  }
                }}
                className="block w-full text-sm text-white/70 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-black"
              />
              {model.imageUrl || imagePreview ? (
                <button
                  type="button"
                  className="text-sm font-bold text-red-200"
                  onClick={() => {
                    setRemoveImage(true);
                    setPendingImageFile(null);
                    setImagePreview("");
                  }}
                >
                  Remove image
                </button>
              ) : null}
            </div>
          ) : null}

          {isVideo ? (
            <div className="space-y-3">
              <p className="text-sm font-bold text-white/80">Trim video (IN / OUT)</p>
              <p className="text-xs text-white/50">
                Drag the in and out points and preview here. The live post does
                not change until you save.
              </p>
              <p className="text-xs text-white/40">{VIDEO_FILE_HINT}</p>
              <input
                type="file"
                accept={VIDEO_ACCEPT_ATTR}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setPendingVideoFile(file);
                  if (file) {
                    if (videoPreview.startsWith("blob:")) URL.revokeObjectURL(videoPreview);
                    const url = URL.createObjectURL(file);
                    setVideoPreview(url);
                    const probe = document.createElement("video");
                    probe.preload = "metadata";
                    probe.src = url;
                    probe.onloadedmetadata = () => {
                      const nextDuration = Math.round((probe.duration || 0) * 1000);
                      setDurationMs(nextDuration);
                      setTrim({ inMs: 0, outMs: nextDuration });
                    };
                  }
                }}
                className="block w-full text-sm text-white/70 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-black"
              />
              {videoPreview && durationMs > 0 ? (
                <VideoTrimTimeline
                  videoSrc={videoPreview}
                  durationMs={durationMs}
                  value={trim}
                  onChange={setTrim}
                  disabled={pending}
                />
              ) : null}

              <label className="block text-sm font-bold text-white/80">
                Cover
              </label>
              {coverPreview && !clearCover ? (
                <img src={coverPreview} alt="" className="h-36 w-full rounded-xl object-cover" />
              ) : null}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setPendingCoverFile(file);
                  setClearCover(false);
                  if (file) {
                    if (coverPreview.startsWith("blob:")) URL.revokeObjectURL(coverPreview);
                    setCoverPreview(URL.createObjectURL(file));
                  }
                }}
                className="block w-full text-sm text-white/70 file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-black"
              />
              {model.coverUrl || coverPreview ? (
                <button
                  type="button"
                  className="text-sm font-bold text-red-200"
                  onClick={() => {
                    setClearCover(true);
                    setPendingCoverFile(null);
                    setCoverPreview("");
                  }}
                >
                  Remove cover
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {errorMessage ? (
          <p id={errorId} role="alert" className="mt-4 text-sm font-bold text-red-200">
            {errorMessage}
          </p>
        ) : null}
        {statusMessage ? (
          <p role="status" className="mt-4 text-sm font-bold text-emerald-200">
            {statusMessage}
          </p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={pending}
            onClick={handleCancel}
            className="min-h-[44px] rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white/80 hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setPreviewing((open) => !open)}
            className="min-h-[44px] rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white/80 hover:bg-white/10"
          >
            {previewing ? "Hide preview" : "Preview"}
          </button>
          <button
            type="button"
            disabled={pending}
            aria-busy={pending}
            onClick={() => void handleSave()}
            className="min-h-[44px] rounded-full bg-white px-4 py-2.5 text-sm font-black text-black disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>

        <div className="mt-8 border-t border-white/10 pt-5">
          <p className="text-sm font-bold text-white/70">Delete</p>
          <p className="mt-1 text-xs text-white/45">
            Delete is only available here. It uses the same owner check as
            before and does not reset other posts.
          </p>
          <button
            type="button"
            disabled={pending}
            className="mt-3 min-h-[44px] rounded-full border border-red-400/40 bg-red-500/15 px-4 py-2.5 text-sm font-black text-red-100 hover:bg-red-500/25 disabled:opacity-50"
            onClick={() => {
              setErrorMessage("");
              setDeleteOpen(true);
            }}
          >
            {deleteCopy.label}
          </button>
        </div>
      </div>

      {deleteOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[140] flex items-end justify-center p-3 sm:items-center sm:p-6">
              <button
                type="button"
                tabIndex={-1}
                className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-[2px]"
                aria-label="Cancel delete"
                disabled={pending}
                onClick={() => {
                  if (!pending) {
                    setDeleteOpen(false);
                  }
                }}
              />
              <div
                ref={deleteDialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={deleteTitleId}
                className="relative z-10 w-full max-w-md max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-t-[28px] border border-white/15 bg-[#0b0b18] p-5 text-white shadow-2xl sm:rounded-[28px]"
              >
                <h2 id={deleteTitleId} className="text-lg font-black">
                  {deleteCopy.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/70">{deleteCopy.body}</p>
                {errorMessage ? (
                  <p role="alert" className="mt-3 text-sm font-bold text-red-200">
                    {errorMessage}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={pending}
                    className="watch-focus-ring min-h-[44px] rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white/80 hover:bg-white/10 disabled:opacity-50"
                    onClick={() => setDeleteOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    ref={deleteConfirmRef}
                    type="button"
                    disabled={pending}
                    aria-busy={pending}
                    className="watch-focus-ring min-h-[44px] rounded-full border border-red-400/40 bg-red-500/90 px-4 py-2.5 text-sm font-black text-white hover:bg-red-500 disabled:cursor-wait disabled:opacity-60"
                    onClick={() => void handleConfirmDelete()}
                  >
                    {pending ? "Deleting…" : deleteCopy.confirm}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      {previewing ? (
        <div className="rounded-[28px] border border-white/10 bg-black/40 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
            Preview · not live until save
          </p>
          <p className="mt-3 whitespace-pre-wrap text-lg text-white/90">{content}</p>
          {hashtagList.length > 0 ? (
            <p className="mt-2 text-sm text-sky-200">
              {hashtagList.map((tag) => `#${tag}`).join(" ")}
            </p>
          ) : null}
          {articleTitle && !removeArticle ? (
            <div className="mt-4 rounded-2xl border border-white/10 p-3">
              <p className="font-black">{articleTitle}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-white/70">
                {articleBody}
              </p>
            </div>
          ) : null}
          {isImage && imagePreview && !removeImage ? (
            <img src={imagePreview} alt="" className="mt-4 h-56 w-full rounded-2xl object-cover" />
          ) : null}
          {isVideo && videoPreview ? (
            <video
              src={videoPreview}
              className="mt-4 max-h-80 w-full rounded-2xl bg-black object-contain"
              controls
              playsInline
            />
          ) : null}
        </div>
      ) : null}

      <p className="text-center text-xs text-white/40">
        <Link href={model.publicUrl} className="underline">
          Open live post
        </Link>
        {" · "}
        <Link href={APP_ROUTES.profile} className="underline">
          Profile
        </Link>
      </p>
    </div>
  );
}
