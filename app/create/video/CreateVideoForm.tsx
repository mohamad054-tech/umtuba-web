"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { createVideoPostAction } from "../../actions/createVideoPost";
import MediaPipelineStatusBadge from "../../components/media/MediaPipelineStatusBadge";
import MediaProcessingProgress from "../../components/media/MediaProcessingProgress";
import MediaUploadProgress from "../../components/media/MediaUploadProgress";
import ProductLoadingState from "../../components/product/ProductLoadingState";
import { sanitizeUserFacingMessage } from "../../lib/product/userFacingMessage";
import { getAuthenticatedUser } from "../../../lib/supabase/auth";
import {
  deleteUploadedPostVideo,
  uploadPostVideo,
} from "../../../lib/supabase/posts";
import {
  MAX_CAPTION_LENGTH,
  VIDEO_ACCEPT_ATTR,
  VIDEO_FILE_HINT,
  validateCaption,
  validateVideoFile,
} from "../../../lib/supabase/videoPostsShared";
import { probeVideoFileMetadata } from "../../../lib/media/probeVideoMetadata";
import type {
  MediaMetadata,
  MediaPipelineStatus,
} from "../../../lib/media/pipelineTypes";
import type { VideoOverlayElement } from "../../../lib/media/videoOverlays";
import VideoOverlayEditor from "./VideoOverlayEditor";
import { APP_ROUTES } from "../../lib/nav";
import {
  CREATE_PROCESSING_MESSAGE,
  CREATE_PUBLISH_FAILED_MESSAGE,
  CREATE_SUCCESS_MESSAGE,
  CREATE_UPLOAD_CANCELLED_MESSAGE,
  CREATE_UPLOAD_COMPLETE_MESSAGE,
  CREATE_UPLOAD_FAILED_MESSAGE,
  processingProgressAfterUpload,
  processingProgressOnReady,
  processingProgressWhilePublishing,
} from "./createVideoProgress";

type UploadPhase =
  | "idle"
  | "checking-auth"
  | "ready"
  | "uploading"
  | "queued"
  | "processing"
  | "success"
  | "error";

const PENDING_ORPHAN_KEY = "umtuba_pending_video_uploads";

function readPendingOrphans(): string[] {
  try {
    if (typeof sessionStorage === "undefined") return [];
    const raw = sessionStorage.getItem(PENDING_ORPHAN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((p): p is string => typeof p === "string" && p.length > 0)
      : [];
  } catch {
    return [];
  }
}

function writePendingOrphans(paths: string[]) {
  try {
    if (typeof sessionStorage === "undefined") return;
    const unique = Array.from(new Set(paths)).slice(0, 20);
    if (unique.length === 0) {
      sessionStorage.removeItem(PENDING_ORPHAN_KEY);
      return;
    }
    sessionStorage.setItem(PENDING_ORPHAN_KEY, JSON.stringify(unique));
  } catch {
    // ignore storage failures
  }
}

function queuePendingOrphan(path: string) {
  writePendingOrphans([...readPendingOrphans(), path]);
}

async function cleanupPendingOrphans() {
  const paths = readPendingOrphans();
  if (paths.length === 0) return;
  const remaining: string[] = [];
  for (const path of paths) {
    try {
      await deleteUploadedPostVideo(path);
    } catch {
      remaining.push(path);
    }
  }
  writePendingOrphans(remaining);
}

function phaseToPipelineStatus(phase: UploadPhase): MediaPipelineStatus | null {
  switch (phase) {
    case "uploading":
      return "uploading";
    case "queued":
      return "queued";
    case "processing":
      return "processing";
    case "success":
      return "ready";
    case "error":
      return "failed";
    default:
      return null;
  }
}

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error &&
      (error.name === "AbortError" ||
        /upload cancelled/i.test(error.message)))
  );
}

export default function CreateVideoForm() {
  const router = useRouter();
  const captionId = useId();
  const fileId = useId();
  const errorId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitLockRef = useRef(false);
  const uploadAbortRef = useRef<AbortController | null>(null);

  const [phase, setPhase] = useState<UploadPhase>("checking-auth");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [uploadPercent, setUploadPercent] = useState(0);
  /** null = indeterminate publishing progress (never invent mid-flight %). */
  const [processingPercent, setProcessingPercent] = useState<number | null>(
    null
  );
  const [probedMeta, setProbedMeta] = useState<MediaMetadata | null>(null);
  const [overlays, setOverlays] = useState<VideoOverlayElement[]>([]);

  useEffect(() => {
    let active = true;

    async function verifyAuth() {
      try {
        setPhase("checking-auth");
        const user = await getAuthenticatedUser();

        if (!active) {
          return;
        }

        if (!user) {
          setIsAuthenticated(false);
          setPhase("ready");
          setErrorMessage("Please sign in to upload a video.");
          return;
        }

        setIsAuthenticated(true);
        setPhase("ready");
        setErrorMessage("");
        void cleanupPendingOrphans();
      } catch (error) {
        console.error(error);

        if (active) {
          setIsAuthenticated(false);
          setPhase("error");
          setErrorMessage(
            sanitizeUserFacingMessage(
              error instanceof Error ? error.message : null,
              "Please sign in to upload a video."
            )
          );
        }
      }
    }

    void verifyAuth();

    return () => {
      active = false;
      uploadAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function clearSelectedFile() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl("");
    setProbedMeta(null);
    setOverlays([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function resetToRetryableReady() {
    submitLockRef.current = false;
    uploadAbortRef.current = null;
    setPhase("ready");
    setStatusMessage("");
    setUploadPercent(0);
    setProcessingPercent(null);
  }

  function handleCancelUpload() {
    uploadAbortRef.current?.abort();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setErrorMessage("");
    setStatusMessage("");

    const check = validateVideoFile({
      mimeType: file.type,
      byteSize: file.size,
      fileName: file.name,
    });

    if (!check.ok) {
      setErrorMessage(check.message);
      event.target.value = "";
      clearSelectedFile();
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));

    try {
      const meta = await probeVideoFileMetadata(file);
      setProbedMeta(meta);
    } catch {
      setProbedMeta({
        durationMs: null,
        width: null,
        height: null,
        fps: null,
        codec: null,
        bitrate: null,
        fileSize: file.size,
        aspectRatio: null,
      });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submitLockRef.current) {
      return;
    }

    if (!isAuthenticated) {
      setErrorMessage("Please sign in to upload a video.");
      setPhase("error");
      return;
    }

    if (!selectedFile) {
      setErrorMessage("Please select a video file.");
      setPhase("error");
      return;
    }

    const captionCheck = validateCaption(caption);

    if (!captionCheck.ok) {
      setErrorMessage(captionCheck.message);
      setPhase("error");
      return;
    }

    const fileCheck = validateVideoFile({
      mimeType: selectedFile.type,
      byteSize: selectedFile.size,
      fileName: selectedFile.name,
    });

    if (!fileCheck.ok) {
      setErrorMessage(fileCheck.message);
      setPhase("error");
      return;
    }

    submitLockRef.current = true;
    let uploadedPath: string | null = null;
    const uploadStartedAt = new Date().toISOString();
    const abortController = new AbortController();
    uploadAbortRef.current = abortController;

    try {
      setErrorMessage("");
      setPhase("uploading");
      setUploadPercent(0);
      setProcessingPercent(null);
      setStatusMessage("Uploading video to secure storage...");

      const uploaded = await uploadPostVideo(
        selectedFile,
        (progress) => {
          setUploadPercent(progress.percent);
        },
        { signal: abortController.signal }
      );
      uploadedPath = uploaded.path;
      const afterUpload = processingProgressAfterUpload();
      setUploadPercent(afterUpload.uploadPercent);
      setProcessingPercent(afterUpload.processingPercent);
      setPhase(afterUpload.phase);
      setStatusMessage(CREATE_UPLOAD_COMPLETE_MESSAGE);

      const whilePublishing = processingProgressWhilePublishing();
      setPhase(whilePublishing.phase);
      setProcessingPercent(whilePublishing.processingPercent);
      setStatusMessage(CREATE_PROCESSING_MESSAGE);

      const result = await createVideoPostAction({
        caption,
        videoPath: uploaded.path,
        mimeType: uploaded.mimeType,
        byteSize: uploaded.byteSize,
        metadata: probedMeta,
        overlays,
        uploadStartedAt,
      });

      if (!result.ok) {
        if (result.code === "auth_required") {
          queuePendingOrphan(uploaded.path);
          setPhase("error");
          setErrorMessage(
            sanitizeUserFacingMessage(
              result.message,
              "Please sign in to publish a video."
            )
          );
          setStatusMessage("");
          setProcessingPercent(null);
          submitLockRef.current = false;
          return;
        }

        await deleteUploadedPostVideo(uploaded.path);
        setPhase("error");
        setErrorMessage(
          sanitizeUserFacingMessage(
            result.message,
            CREATE_PUBLISH_FAILED_MESSAGE
          )
        );
        setStatusMessage("");
        setProcessingPercent(null);
        submitLockRef.current = false;
        return;
      }

      const ready = processingProgressOnReady();
      setProcessingPercent(ready.processingPercent);
      setPhase(ready.phase);
      setStatusMessage(CREATE_SUCCESS_MESSAGE);
      setCaption("");
      clearSelectedFile();
      setErrorMessage("");
      setUploadPercent(0);

      window.dispatchEvent(new Event("umtuba:post-created"));

      window.setTimeout(() => {
        router.push(APP_ROUTES.discover);
        router.refresh();
      }, 700);
    } catch (error) {
      console.error(error);

      if (isAbortError(error)) {
        setPhase("error");
        setStatusMessage("");
        setProcessingPercent(null);
        setUploadPercent(0);
        setErrorMessage(CREATE_UPLOAD_CANCELLED_MESSAGE);
        submitLockRef.current = false;
        return;
      }

      if (uploadedPath) {
        await deleteUploadedPostVideo(uploadedPath);
      }

      setPhase("error");
      setStatusMessage("");
      setProcessingPercent(null);
      setErrorMessage(
        sanitizeUserFacingMessage(
          error instanceof Error ? error.message : null,
          CREATE_UPLOAD_FAILED_MESSAGE
        )
      );
      submitLockRef.current = false;
    } finally {
      uploadAbortRef.current = null;
    }
  }

  const busy =
    phase === "uploading" ||
    phase === "queued" ||
    phase === "processing" ||
    phase === "success";
  const canSubmit =
    isAuthenticated &&
    Boolean(selectedFile) &&
    phase !== "checking-auth" &&
    !busy;
  const pipelineStatus = phaseToPipelineStatus(phase);
  const fileInvalid = Boolean(errorMessage && !selectedFile);
  const captionInvalid = Boolean(
    errorMessage && errorMessage.toLowerCase().includes("caption")
  );

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="mx-auto w-full max-w-xl rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl md:p-8"
      noValidate
      aria-busy={busy || undefined}
    >
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black tracking-tight text-white">
            Upload a video
          </h2>
          {pipelineStatus ? (
            <MediaPipelineStatusBadge status={pipelineStatus} />
          ) : null}
        </div>
        <p className="text-sm text-white/55">
          One video file, optional caption. Only ready clips appear on Discover,
          Watch, and Profile.
        </p>
      </div>

      {phase === "checking-auth" ? (
        <div className="mt-6">
          <ProductLoadingState label="Checking your session…" />
        </div>
      ) : null}

      {!isAuthenticated && phase !== "checking-auth" ? (
        <div
          className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70"
          role="alert"
        >
          <p>
            You need an account to upload.{" "}
            <Link
              href={`${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.createVideo)}`}
              className="font-bold text-white underline"
            >
              Sign in
            </Link>{" "}
            or{" "}
            <Link
              href={`${APP_ROUTES.signup}?next=${encodeURIComponent(APP_ROUTES.createVideo)}`}
              className="font-bold text-white underline"
            >
              create an account
            </Link>
            .
          </p>
        </div>
      ) : null}

      <div className="mt-6 space-y-2">
        <label htmlFor={fileId} className="block text-sm font-bold text-white/80">
          Video file
        </label>
        <input
          ref={fileInputRef}
          id={fileId}
          name="video"
          type="file"
          accept={VIDEO_ACCEPT_ATTR}
          onChange={(event) => void handleFileChange(event)}
          disabled={!isAuthenticated || busy || phase === "checking-auth"}
          aria-invalid={fileInvalid || undefined}
          aria-describedby={errorMessage ? errorId : undefined}
          className="watch-focus-ring block w-full text-sm text-white/70 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-bold file:text-black hover:file:bg-white/90 disabled:opacity-50"
        />
        <p className="text-xs text-white/40">{VIDEO_FILE_HINT}</p>
      </div>

      {previewUrl && selectedFile ? (
        <VideoOverlayEditor
          videoSrc={previewUrl}
          fileName={selectedFile.name}
          metaLabel={
            probedMeta?.width && probedMeta?.height ? (
              <>
                {probedMeta.width}×{probedMeta.height}
                {probedMeta.aspectRatio ? ` · ${probedMeta.aspectRatio}` : ""}
                {probedMeta.durationMs
                  ? ` · ${Math.round(probedMeta.durationMs / 1000)}s`
                  : ""}
              </>
            ) : null
          }
          elements={overlays}
          onChange={setOverlays}
          onRemoveFile={clearSelectedFile}
          disabled={busy}
        />
      ) : null}

      <div className="mt-6 space-y-2">
        <label
          htmlFor={captionId}
          className="block text-sm font-bold text-white/80"
        >
          Caption <span className="font-medium text-white/40">(optional)</span>
        </label>
        <textarea
          id={captionId}
          name="caption"
          value={caption}
          maxLength={MAX_CAPTION_LENGTH}
          onChange={(event) => {
            setCaption(event.target.value);
            setErrorMessage("");
          }}
          disabled={!isAuthenticated || busy || phase === "checking-auth"}
          rows={4}
          placeholder="Say something about this clip..."
          aria-invalid={captionInvalid || undefined}
          aria-describedby={errorMessage ? errorId : undefined}
          className="watch-focus-ring w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-base text-white outline-none focus:border-white/30 disabled:opacity-60"
        />
        <p className="text-right text-xs text-white/40">
          {caption.length}/{MAX_CAPTION_LENGTH}
        </p>
      </div>

      {phase === "uploading" ? (
        <div className="mt-4">
          <MediaUploadProgress percent={uploadPercent} label="Uploading" />
        </div>
      ) : null}

      {phase === "queued" || phase === "processing" ? (
        <div className="mt-4 space-y-3">
          <MediaUploadProgress percent={100} label="Upload complete" />
          <MediaProcessingProgress
            percent={processingPercent}
            indeterminate={processingPercent == null}
            label={phase === "queued" ? "Queued" : "Publishing"}
            detail={
              phase === "processing"
                ? "Saving your post and preparing playback…"
                : "Upload finished. Starting the media pipeline…"
            }
          />
        </div>
      ) : null}

      {phase === "success" && processingPercent === 100 ? (
        <div className="mt-4">
          <MediaProcessingProgress
            percent={100}
            label="Ready"
            detail="Your video is published."
          />
        </div>
      ) : null}

      {statusMessage ? (
        <p className="mt-4 text-sm font-medium text-sky-200/90" role="status">
          {statusMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <div className="mt-4 space-y-3" role="alert" id={errorId}>
          <p className="text-sm text-red-300">{errorMessage}</p>
          {phase === "error" && isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                setErrorMessage("");
                resetToRetryableReady();
              }}
              className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white/85 hover:bg-white/10"
            >
              Try again
            </button>
          ) : null}
          {phase === "error" && !isAuthenticated ? (
            <Link
              href={`${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.createVideo)}`}
              className="watch-focus-ring inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white/85 hover:bg-white/10"
            >
              Sign in to continue
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap justify-end gap-3">
        {phase === "uploading" ? (
          <button
            type="button"
            onClick={handleCancelUpload}
            className="watch-focus-ring rounded-2xl border border-white/10 px-5 py-3 font-bold text-white/80 hover:bg-white/10"
          >
            Cancel upload
          </button>
        ) : (
          <Link
            href={APP_ROUTES.discover}
            className={`watch-focus-ring rounded-2xl border border-white/10 px-5 py-3 font-bold text-white/80 hover:bg-white/10 ${
              busy ? "pointer-events-none opacity-50" : ""
            }`}
          >
            Cancel
          </Link>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          aria-busy={busy || undefined}
          className="watch-focus-ring rounded-2xl bg-white px-5 py-3 font-black text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {phase === "uploading"
            ? "Uploading..."
            : phase === "queued"
              ? "Queued..."
              : phase === "processing"
                ? "Processing..."
                : phase === "success"
                  ? "Ready"
                  : "Publish video"}
        </button>
      </div>
    </form>
  );
}
