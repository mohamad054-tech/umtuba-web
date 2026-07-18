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
import { APP_ROUTES } from "../../lib/nav";

type UploadPhase =
  | "idle"
  | "checking-auth"
  | "ready"
  | "uploading"
  | "queued"
  | "processing"
  | "success"
  | "error";

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

export default function CreateVideoForm() {
  const router = useRouter();
  const captionId = useId();
  const fileId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitLockRef = useRef(false);

  const [phase, setPhase] = useState<UploadPhase>("checking-auth");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [uploadPercent, setUploadPercent] = useState(0);
  const [processingPercent, setProcessingPercent] = useState(0);
  const [probedMeta, setProbedMeta] = useState<MediaMetadata | null>(null);

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
      } catch (error) {
        console.error(error);

        if (active) {
          setIsAuthenticated(false);
          setPhase("error");
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Please sign in to upload a video."
          );
        }
      }
    }

    void verifyAuth();

    return () => {
      active = false;
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

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function resetFormFields() {
    setCaption("");
    setErrorMessage("");
    setStatusMessage("");
    setUploadPercent(0);
    setProcessingPercent(0);
    clearSelectedFile();
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
    });

    if (!fileCheck.ok) {
      setErrorMessage(fileCheck.message);
      setPhase("error");
      return;
    }

    submitLockRef.current = true;
    let uploadedPath: string | null = null;
    const uploadStartedAt = new Date().toISOString();

    try {
      setErrorMessage("");
      setPhase("uploading");
      setUploadPercent(0);
      setProcessingPercent(0);
      setStatusMessage("Uploading video to secure storage...");

      const uploaded = await uploadPostVideo(selectedFile, (progress) => {
        setUploadPercent(progress.percent);
      });
      uploadedPath = uploaded.path;
      setUploadPercent(100);

      setPhase("queued");
      setStatusMessage("Upload complete. Queued for processing...");
      setProcessingPercent(10);

      await new Promise((r) => window.setTimeout(r, 280));

      setPhase("processing");
      setStatusMessage("Processing video...");
      setProcessingPercent(40);

      const result = await createVideoPostAction({
        caption,
        videoPath: uploaded.path,
        mimeType: uploaded.mimeType,
        byteSize: uploaded.byteSize,
        metadata: probedMeta,
        uploadStartedAt,
      });

      if (!result.ok) {
        await deleteUploadedPostVideo(uploaded.path);
        setPhase("error");
        setErrorMessage(result.message);
        setStatusMessage("");
        submitLockRef.current = false;
        return;
      }

      setProcessingPercent(100);
      setPhase("success");
      setStatusMessage("Video ready. Opening Discover...");
      resetFormFields();

      window.dispatchEvent(new Event("umtuba:post-created"));

      window.setTimeout(() => {
        router.push(APP_ROUTES.discover);
        router.refresh();
      }, 700);
    } catch (error) {
      console.error(error);

      if (uploadedPath) {
        await deleteUploadedPostVideo(uploadedPath);
      }

      setPhase("error");
      setStatusMessage("");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The video could not be published. Please try again."
      );
      submitLockRef.current = false;
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

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="mx-auto w-full max-w-xl rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl md:p-8"
      noValidate
    >
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-black tracking-tight text-white">
            Upload a video
          </h1>
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
        <p className="mt-6 text-sm text-white/50" role="status">
          Checking your session...
        </p>
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
              href={APP_ROUTES.signup}
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
          className="block w-full text-sm text-white/70 file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-bold file:text-black hover:file:bg-white/90 disabled:opacity-50"
        />
        <p className="text-xs text-white/40">{VIDEO_FILE_HINT}</p>
      </div>

      {previewUrl && selectedFile ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black">
          <video
            src={previewUrl}
            controls
            playsInline
            preload="metadata"
            className="max-h-80 w-full bg-black"
            aria-label={`Preview of ${selectedFile.name}`}
          />
          <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="truncate text-white/60">{selectedFile.name}</p>
              {probedMeta?.width && probedMeta?.height ? (
                <p className="text-xs text-white/35">
                  {probedMeta.width}×{probedMeta.height}
                  {probedMeta.aspectRatio ? ` · ${probedMeta.aspectRatio}` : ""}
                  {probedMeta.durationMs
                    ? ` · ${Math.round(probedMeta.durationMs / 1000)}s`
                    : ""}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={clearSelectedFile}
              disabled={busy}
              className="shrink-0 rounded-full border border-white/15 px-3 py-1.5 font-bold text-white/80 hover:bg-white/10 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
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
          className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-base text-white outline-none focus:border-white/30 disabled:opacity-60"
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
        <div className="mt-4">
          <MediaProcessingProgress
            percent={processingPercent}
            label={phase === "queued" ? "Queued" : "Processing"}
            detail={
              phase === "processing"
                ? "Preparing playback metadata and thumbnail path…"
                : "Waiting for the media pipeline…"
            }
          />
        </div>
      ) : null}

      {statusMessage ? (
        <p className="mt-4 text-sm font-medium text-sky-200/90" role="status">
          {statusMessage}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="mt-4 text-sm text-red-300" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="mt-8 flex flex-wrap justify-end gap-3">
        <Link
          href={APP_ROUTES.discover}
          className={`rounded-2xl border border-white/10 px-5 py-3 font-bold text-white/80 hover:bg-white/10 ${
            busy ? "pointer-events-none opacity-50" : ""
          }`}
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-2xl bg-white px-5 py-3 font-black text-black disabled:cursor-not-allowed disabled:opacity-50"
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
