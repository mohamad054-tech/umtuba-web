"use client";

import { memo } from "react";
import type { LiveParticipant } from "../types";

type LiveParticipantsPanelProps = {
  participants: LiveParticipant[];
  loading?: boolean;
  viewerCount?: number | null;
};

const ROLE_LABEL: Record<LiveParticipant["role"], string> = {
  host: "Host",
  co_host: "Co-host",
  guest: "Guest",
  moderator: "Mod",
  viewer: "Viewer",
};

function LiveParticipantsPanelComponent({
  participants,
  loading = false,
  viewerCount,
}: LiveParticipantsPanelProps) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            In room
          </p>
          <h3 className="mt-0.5 text-sm font-black text-white">Participants</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold tabular-nums text-white/60">
          {viewerCount == null ? "…" : viewerCount}
        </span>
      </div>

      {loading ? (
        <div className="mt-3 space-y-2" aria-busy="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-10 animate-pulse rounded-2xl bg-white/5"
            />
          ))}
        </div>
      ) : participants.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-6 text-center">
          <p className="text-xs font-bold text-white/55">No one here yet</p>
          <p className="mt-1 text-[11px] text-white/35">
            Viewer count updates live as people join.
          </p>
        </div>
      ) : (
        <ul className="mt-3 max-h-56 space-y-1.5 overflow-y-auto overscroll-contain pr-1">
          {participants.map((person) => (
            <li
              key={person.userId}
              className="flex items-center gap-2.5 rounded-2xl border border-white/5 bg-white/[0.03] px-2.5 py-2"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-black text-white ${person.avatarGradient}`}
              >
                {person.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-white/90">
                  {person.displayName}
                </p>
                <p className="truncate text-[10px] text-white/40">
                  {person.handle}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white/50">
                {ROLE_LABEL[person.role]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const LiveParticipantsPanel = memo(LiveParticipantsPanelComponent);
export default LiveParticipantsPanel;
