"use client";

import { useEffect, useId, useRef } from "react";
import type { LiveCollabSharedItem, LiveParticipantRole } from "../types";
import {
  LIVE_COLLAB_ALLOWED_TYPES,
  LIVE_COLLAB_MAX_SIZE_LABEL,
} from "../types";

type LiveCollaborationPanelProps = {
  open: boolean;
  onClose: () => void;
  items: LiveCollabSharedItem[];
  isHost: boolean;
  myRole?: LiveParticipantRole | null;
  participantUploadsAllowed: boolean;
  onToggleParticipantUploads: () => void;
  onRemoveItem: (id: string) => void;
};

const actionBtn =
  "flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-left text-sm font-bold text-white/80 transition hover:border-white/20 hover:bg-white/[0.07]";

const actionBtnDisabled =
  "flex w-full cursor-not-allowed items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-3.5 py-3 text-left text-sm font-bold text-white/35";

function ComingSoonBadge() {
  return (
    <span className="shrink-0 rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-amber-200/90">
      Soon
    </span>
  );
}

function kindIcon(kind: LiveCollabSharedItem["kind"]) {
  switch (kind) {
    case "image":
      return "🖼";
    case "pdf":
      return "PDF";
    case "document":
      return "DOC";
    case "presentation":
      return "PPT";
    case "link":
      return "🔗";
    default:
      return "📎";
  }
}

function CollabToolButton({
  label,
  hint,
  disabled = true,
}: {
  label: string;
  hint: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={disabled ? actionBtnDisabled : actionBtn}
      title={disabled ? `${hint} — coming soon` : hint}
      aria-disabled={disabled}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate">{label}</span>
        <span className="mt-0.5 block text-[10px] font-medium text-white/35">
          {hint}
        </span>
      </span>
      {disabled ? <ComingSoonBadge /> : null}
    </button>
  );
}

function SharedFileCard({
  item,
  canRemove,
  onRemove,
}: {
  item: LiveCollabSharedItem;
  canRemove: boolean;
  onRemove: () => void;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-black/25 p-3">
      <div className="flex gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[10px] font-black text-white/70"
          aria-hidden
        >
          {kindIcon(item.kind)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-white">{item.fileName}</p>
          <p className="mt-0.5 text-[11px] text-white/45">
            {item.typeLabel} · {item.sizeLabel}
          </p>
          <p className="mt-1 text-[11px] text-white/55">
            Shared by{" "}
            <span className="font-bold text-white/80">{item.senderName}</span>
            <span className="text-white/30"> · {item.sentAtLabel}</span>
          </p>
        </div>
      </div>

      {item.canPreview && item.previewLabel ? (
        <div className="mt-3 flex h-20 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.03] px-3 text-center text-[11px] text-white/40">
          {item.previewLabel}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/40"
          title="Open requires secured signed URLs — coming soon"
        >
          Open
          <span className="ml-1.5 text-[9px] uppercase tracking-wider text-amber-200/70">
            Soon
          </span>
        </button>
        <button
          type="button"
          disabled
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/40"
          title="Download via private signed URL — coming soon"
        >
          Download
          <span className="ml-1.5 text-[9px] uppercase tracking-wider text-amber-200/70">
            Soon
          </span>
        </button>
        {canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-full border border-red-400/25 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-200/90 transition hover:bg-red-500/20"
          >
            Remove
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function LiveCollaborationPanel({
  open,
  onClose,
  items,
  isHost,
  myRole = null,
  participantUploadsAllowed,
  onToggleParticipantUploads,
  onRemoveItem,
}: LiveCollaborationPanelProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const canModerate =
    isHost || myRole === "moderator" || myRole === "co_host";

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const first = panelRef.current?.querySelector<HTMLElement>(
      "button:not([disabled])"
    );
    first?.focus();
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label="Close collaboration panel"
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[min(88vh,36rem)] w-full max-w-md flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#0b0b18] shadow-[0_-8px_40px_rgba(0,0,0,0.45)] sm:rounded-[28px]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3.5">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sky-300/90">
              Live Studio
            </p>
            <h2 id={titleId} className="mt-0.5 text-base font-black text-white">
              Collaboration
            </h2>
            <p className="mt-1 text-[11px] leading-4 text-white/45">
              Share files and tools with the room. Uploads ship in a later
              release.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {isHost ? (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
              <div className="min-w-0">
                <p className="text-xs font-black text-white">
                  Participant uploads
                </p>
                <p className="mt-0.5 text-[10px] text-white/40">
                  Host control — ready for backend wiring
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={participantUploadsAllowed}
                onClick={onToggleParticipantUploads}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                  participantUploadsAllowed
                    ? "bg-sky-500/80"
                    : "bg-white/15"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                    participantUploadsAllowed ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          ) : (
            <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[11px] text-white/50">
              {participantUploadsAllowed
                ? "Host allows participant uploads (when enabled on the server)."
                : "Only the host can share files right now."}
            </p>
          )}

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
              Tools
            </p>
            <div className="grid gap-2">
              <CollabToolButton
                label="Upload file"
                hint="Private room storage · scanned"
              />
              <CollabToolButton
                label="Share image"
                hint="PNG, JPG, WEBP, GIF"
              />
              <CollabToolButton
                label="Share PDF / document / presentation"
                hint="PDF, DOCX, PPTX"
              />
              <CollabToolButton
                label="Share link"
                hint="URL preview for the room"
              />
              <CollabToolButton
                label="Share screen"
                hint="WebRTC screen share"
              />
              <CollabToolButton
                label="Whiteboard"
                hint="Live co-draw canvas"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
                Shared in room
              </p>
              <span className="text-[10px] font-bold text-white/30">
                {items.length} item{items.length === 1 ? "" : "s"}
              </span>
            </div>

            {items.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-xs text-white/40">
                No shared items yet. Cards will list who shared each file.
              </p>
            ) : (
              <div className="space-y-2.5">
                {items.map((item) => (
                  <SharedFileCard
                    key={item.id}
                    item={item}
                    canRemove={canModerate}
                    onRemove={() => onRemoveItem(item.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
              Safety
            </p>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-4 text-white/50">
              <li>
                Allowed types: {LIVE_COLLAB_ALLOWED_TYPES.join(", ")}
              </li>
              <li>Maximum size: {LIVE_COLLAB_MAX_SIZE_LABEL} per file</li>
              <li>Malware scanning before share — coming soon</li>
              <li>
                No public storage URLs — private signed access only
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
