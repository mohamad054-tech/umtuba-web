"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../../components/i18n";
import type { Conversation } from "../types";

export type CapturedVisual = {
  blob: Blob;
  mimeType: string;
  mediaType: "image" | "video";
  caption: string;
  conversationIds: string[];
  previewUrl: string;
};

type QuickSocialCameraProps = {
  open: boolean;
  conversations: Conversation[];
  defaultConversationId?: string | null;
  onClose: () => void;
  onCapture: (captured: CapturedVisual) => void | Promise<void>;
  pending?: boolean;
  statusMessage?: string | null;
};

export default function QuickSocialCamera({
  open,
  conversations,
  defaultConversationId,
  onClose,
  onCapture,
  pending = false,
  statusMessage = null,
}: QuickSocialCameraProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = useState<"photo" | "video">("photo");
  const [facing, setFacing] = useState<"user" | "environment">("environment");
  const [recording, setRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewMime, setPreviewMime] = useState<string>("image/jpeg");
  const [previewType, setPreviewType] = useState<"image" | "video">("image");
  const [caption, setCaption] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(
    defaultConversationId ? [defaultConversationId] : []
  );
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultConversationId) {
      setSelectedIds([defaultConversationId]);
    }
  }, [defaultConversationId, open]);

  useEffect(() => {
    if (!open) {
      stopStream();
      return;
    }

    let cancelled = false;

    async function startCamera() {
      stopStream();
      setCameraError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(t("umStreak.cameraUnavailable"));
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing },
          audio: mode === "video",
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
      } catch {
        setCameraError(t("umStreak.cameraUnavailable"));
      }
    }

    void startCamera();
    return () => {
      cancelled = true;
    };
  }, [open, facing, mode, t]);

  useEffect(() => {
    return () => {
      stopStream();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setRecording(false);
  }

  function setPreview(blob: Blob, mimeType: string, mediaType: "image" | "video") {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewBlob(blob);
    setPreviewMime(mimeType);
    setPreviewType(mediaType);
    setPreviewUrl(URL.createObjectURL(blob));
  }

  function capturePhoto() {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setPreview(blob, "image/jpeg", "image");
        }
      },
      "image/jpeg",
      0.92
    );
  }

  function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    const stream = streamRef.current;
    if (!stream) {
      return;
    }
    const mimeType = MediaRecorder.isTypeSupported("video/webm")
      ? "video/webm"
      : "video/mp4";
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setPreview(blob, mimeType, "video");
    };
    recorder.start();
    setRecording(true);
    window.setTimeout(() => {
      if (recorderRef.current === recorder && recorder.state === "recording") {
        recorder.stop();
        setRecording(false);
      }
    }, 15000);
  }

  function toggleFriend(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    );
  }

  async function handleSend() {
    if (!previewBlob || selectedIds.length === 0) {
      return;
    }
    await onCapture({
      blob: previewBlob,
      mimeType: previewMime,
      mediaType: previewType,
      caption: caption.trim(),
      conversationIds: selectedIds,
      previewUrl: previewUrl ?? "",
    });
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 md:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={t("umStreak.camera")}
    >
      <div className="flex h-[100dvh] w-full max-w-md flex-col bg-[#050510] text-white md:h-[min(92dvh,48rem)] md:rounded-3xl md:border md:border-amber-300/20">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm font-black text-amber-200">{t("umStreak.camera")}</p>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-2xl border border-white/15 px-3 text-sm font-bold"
            aria-label={t("umStreak.closeCamera")}
          >
            {t("actions.close")}
          </button>
        </div>

        <div className="relative min-h-0 flex-1 bg-black">
          {previewUrl ? (
            previewType === "video" ? (
              <video
                src={previewUrl}
                controls
                playsInline
                className="h-full w-full object-contain"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL preview
              <img src={previewUrl} alt="" className="h-full w-full object-contain" />
            )
          ) : (
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className="h-full w-full object-cover"
            />
          )}
        </div>

        {cameraError || statusMessage ? (
          <p className="px-4 pt-2 text-center text-xs text-red-300" role="alert">
            {statusMessage || cameraError}
          </p>
        ) : null}

        <div className="space-y-3 px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setPreviewBlob(null);
                setPreviewUrl(null);
                setMode("photo");
              }}
              className={`min-h-11 flex-1 rounded-2xl border text-sm font-bold ${
                mode === "photo"
                  ? "border-amber-300/40 bg-amber-400/15 text-amber-100"
                  : "border-white/10 text-white/70"
              }`}
            >
              {t("umStreak.photo")}
            </button>
            <button
              type="button"
              onClick={() => {
                setPreviewBlob(null);
                setPreviewUrl(null);
                setMode("video");
              }}
              className={`min-h-11 flex-1 rounded-2xl border text-sm font-bold ${
                mode === "video"
                  ? "border-amber-300/40 bg-amber-400/15 text-amber-100"
                  : "border-white/10 text-white/70"
              }`}
            >
              {t("umStreak.video")}
            </button>
            <button
              type="button"
              onClick={() =>
                setFacing((value) => (value === "user" ? "environment" : "user"))
              }
              className="min-h-11 min-w-11 rounded-2xl border border-white/10 text-sm font-bold"
              aria-label={t("umStreak.flipCamera")}
            >
              ↻
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-11 rounded-2xl border border-white/10 px-3 text-sm font-bold"
              aria-label={t("umStreak.library")}
            >
              {t("umStreak.library")}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) {
                  return;
                }
                setPreview(
                  file,
                  file.type,
                  file.type.startsWith("video/") ? "video" : "image"
                );
              }}
            />
          </div>

          {!previewBlob ? (
            <button
              type="button"
              onClick={mode === "photo" ? capturePhoto : toggleRecording}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-amber-300 bg-white text-black"
              aria-label={
                mode === "photo"
                  ? t("umStreak.capture")
                  : recording
                    ? t("umStreak.stopRecording")
                    : t("umStreak.capture")
              }
            >
              {recording ? "■" : ""}
            </button>
          ) : (
            <div className="space-y-2">
              <label htmlFor="um-streak-caption" className="sr-only">
                {t("umStreak.captionPlaceholder")}
              </label>
              <input
                id="um-streak-caption"
                value={caption}
                onChange={(event) => setCaption(event.target.value.slice(0, 280))}
                placeholder={t("umStreak.captionPlaceholder")}
                className="min-h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm"
              />
              <fieldset>
                <legend className="mb-1 text-[11px] font-bold uppercase tracking-wide text-white/45">
                  {t("umStreak.selectFriends")}
                </legend>
                <div className="max-h-28 space-y-1 overflow-y-auto">
                  {conversations.map((conversation) => (
                    <label
                      key={conversation.id}
                      className="flex min-h-11 items-center gap-2 rounded-xl px-2 hover:bg-white/5"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(conversation.id)}
                        onChange={() => toggleFriend(conversation.id)}
                        className="h-5 w-5 accent-amber-400"
                      />
                      <span className="text-sm font-medium">{conversation.peerName}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={pending || selectedIds.length === 0}
                className="min-h-11 w-full rounded-2xl bg-amber-300 text-sm font-black text-black disabled:opacity-40"
              >
                {pending ? t("messages.sending") : t("umStreak.send")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
