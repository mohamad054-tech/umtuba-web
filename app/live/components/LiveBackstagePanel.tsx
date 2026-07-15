"use client";

import { memo } from "react";
import type {
  LiveParticipant,
  LiveStageInvitation,
  LiveStageRequest,
} from "../types";

type LiveBackstagePanelProps = {
  isStageManager: boolean;
  isHost: boolean;
  myUserId: string | null;
  myStageStatus?: string | null;
  myQueuePosition?: number | null;
  onStage: LiveParticipant[];
  maxOnStage: number;
  requests: LiveStageRequest[];
  myInvites: LiveStageInvitation[];
  seatAvailableNotify?: boolean;
  busy?: boolean;
  onRequestStage: () => void;
  onJoinStageAsHost?: () => void;
  onCancelRequest: () => void;
  onAcceptRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string) => void;
  onAcceptInvite: (inviteId: string) => void;
  onDeclineInvite: (inviteId: string) => void;
  onInvite: (userId: string) => void;
  onRemove: (userId: string) => void;
  onMute: (userId: string, muted: boolean) => void;
  onDisableCamera: (userId: string, disabled: boolean) => void;
  onPin: (userId: string | null) => void;
  onLayoutMode?: (mode: "auto" | "active_speaker" | "grid") => void;
  pinnedParticipantId?: string | null;
  layoutMode?: string;
  viewers: LiveParticipant[];
};

const btn =
  "rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold text-white/75 transition hover:bg-white/10 hover:text-white disabled:opacity-40";

function LiveBackstagePanelComponent({
  isStageManager,
  isHost,
  myUserId,
  myStageStatus,
  myQueuePosition,
  onStage,
  maxOnStage,
  requests,
  myInvites,
  seatAvailableNotify = false,
  busy = false,
  onRequestStage,
  onJoinStageAsHost,
  onCancelRequest,
  onAcceptRequest,
  onRejectRequest,
  onAcceptInvite,
  onDeclineInvite,
  onInvite,
  onRemove,
  onMute,
  onDisableCamera,
  onPin,
  onLayoutMode,
  pinnedParticipantId,
  layoutMode = "auto",
  viewers,
}: LiveBackstagePanelProps) {
  const onStageCount = onStage.length;
  const canRequest =
    Boolean(myUserId) &&
    myStageStatus !== "on_stage" &&
    myStageStatus !== "queued" &&
    !requests.some(
      (r) =>
        r.requesterId === myUserId &&
        (r.status === "pending" || r.status === "queued")
    );

  const showJoinStage =
    Boolean(myUserId) && myStageStatus !== "on_stage" && myStageStatus !== "queued";

  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            Stage
          </p>
          <h3 className="mt-0.5 text-sm font-black text-white">Backstage</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold tabular-nums text-white/60">
          {onStageCount}/{maxOnStage}
        </span>
      </div>

      {isHost && onLayoutMode ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {(
            [
              ["auto", "Auto"],
              ["active_speaker", "Active speaker"],
              ["grid", "Grid"],
            ] as const
          ).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              className={`${btn} ${
                layoutMode === mode
                  ? "border-sky-400/40 bg-sky-500/15 text-sky-50"
                  : ""
              }`}
              disabled={busy}
              onClick={() => onLayoutMode(mode)}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}

      {seatAvailableNotify && isStageManager ? (
        <p className="mt-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-[11px] font-bold text-amber-100">
          A stage seat is free — queue waiting.
        </p>
      ) : null}

      {myInvites.map((inv) => (
        <div
          key={inv.id}
          className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-sky-400/30 bg-sky-500/10 px-3 py-2"
        >
          <p className="flex-1 text-[11px] font-bold text-sky-50">
            You&apos;re invited on stage
          </p>
          <button
            type="button"
            className={btn}
            disabled={busy}
            onClick={() => onAcceptInvite(inv.id)}
          >
            Accept
          </button>
          <button
            type="button"
            className={btn}
            disabled={busy}
            onClick={() => onDeclineInvite(inv.id)}
          >
            Decline
          </button>
        </div>
      ))}

      {myStageStatus === "queued" || myQueuePosition != null ? (
        <p className="mt-3 text-[11px] text-white/60">
          In waiting queue
          {myQueuePosition != null ? ` · position ${myQueuePosition}` : ""}.
          <button
            type="button"
            className="ml-2 underline"
            disabled={busy}
            onClick={onCancelRequest}
          >
            Leave queue
          </button>
        </p>
      ) : null}

      {canRequest && !isStageManager ? (
        <button
          type="button"
          className={`mt-3 w-full ${btn}`}
          disabled={busy}
          onClick={onRequestStage}
        >
          Request to join stage
        </button>
      ) : null}

      {isStageManager && showJoinStage ? (
        <button
          type="button"
          className={`mt-3 w-full ${btn}`}
          disabled={busy}
          onClick={() => {
            if (isHost && onJoinStageAsHost) {
              onJoinStageAsHost();
              return;
            }
            onRequestStage();
          }}
        >
          {isHost ? "Start broadcasting" : "Join stage"}
        </button>
      ) : null}

      <div className="mt-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
          On stage
        </p>
        <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
          {onStage.map((p) => (
            <li
              key={p.userId}
              className="rounded-2xl border border-white/5 bg-white/[0.03] px-2.5 py-2"
            >
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br text-[9px] font-black ${p.avatarGradient}`}
                >
                  {p.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-white/90">
                    {p.displayName}
                  </p>
                  <p className="text-[9px] uppercase tracking-wider text-white/40">
                    {p.role}
                    {p.mutedByHost ? " · muted" : ""}
                    {p.cameraDisabledByHost ? " · cam off" : ""}
                  </p>
                </div>
              </div>
              {isStageManager && !p.isHost ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  <button
                    type="button"
                    className={btn}
                    disabled={busy}
                    onClick={() => onMute(p.userId, !p.mutedByHost)}
                  >
                    {p.mutedByHost ? "Unmute" : "Mute"}
                  </button>
                  <button
                    type="button"
                    className={btn}
                    disabled={busy}
                    onClick={() =>
                      onDisableCamera(p.userId, !p.cameraDisabledByHost)
                    }
                  >
                    {p.cameraDisabledByHost ? "Enable cam" : "Disable cam"}
                  </button>
                  <button
                    type="button"
                    className={btn}
                    disabled={busy}
                    onClick={() => onRemove(p.userId)}
                  >
                    Remove
                  </button>
                  {isHost ? (
                    <button
                      type="button"
                      className={btn}
                      disabled={busy}
                      onClick={() =>
                        onPin(
                          pinnedParticipantId === p.userId ? null : p.userId
                        )
                      }
                    >
                      {pinnedParticipantId === p.userId ? "Unpin" : "Pin"}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {isStageManager ? (
        <div className="mt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
            Requests / queue
          </p>
          {requests.length === 0 ? (
            <p className="mt-2 text-[11px] text-white/40">No pending requests.</p>
          ) : (
            <ul className="mt-2 max-h-44 space-y-1.5 overflow-y-auto">
              {requests.map((r) => (
                <li
                  key={r.id}
                  className="rounded-2xl border border-white/5 bg-white/[0.03] px-2.5 py-2"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br text-[9px] font-black ${r.avatarGradient ?? "from-slate-600 to-slate-900"}`}
                    >
                      {r.initials ?? "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-white/90">
                        {r.displayName ?? "Viewer"}
                      </p>
                      <p className="text-[9px] text-white/40">
                        {r.status}
                        {r.queuePosition != null
                          ? ` · #${r.queuePosition}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-1">
                    <button
                      type="button"
                      className={btn}
                      disabled={busy}
                      onClick={() => onAcceptRequest(r.id)}
                    >
                      Admit
                    </button>
                    <button
                      type="button"
                      className={btn}
                      disabled={busy}
                      onClick={() => onRejectRequest(r.id)}
                    >
                      Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">
            Invite viewer
          </p>
          <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
            {viewers
              .filter((v) => v.stageStatus !== "on_stage")
              .slice(0, 12)
              .map((v) => (
                <li
                  key={v.userId}
                  className="flex items-center justify-between gap-2 rounded-xl px-1 py-1"
                >
                  <span className="truncate text-[11px] text-white/70">
                    {v.displayName}
                  </span>
                  <button
                    type="button"
                    className={btn}
                    disabled={busy}
                    onClick={() => onInvite(v.userId)}
                  >
                    Invite
                  </button>
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

const LiveBackstagePanel = memo(LiveBackstagePanelComponent);
export default LiveBackstagePanel;
