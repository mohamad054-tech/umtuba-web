import Link from "next/link";
import { buildLiveStreamHref } from "../../lib/nav";
import ProfileLiveBadge from "./ProfileLiveBadge";
import type { ProfileLivePreview } from "../types";

type ProfileLivePanelProps = {
  sessions: ProfileLivePreview[];
  isLive: boolean;
};

export default function ProfileLivePanel({
  sessions,
  isLive,
}: ProfileLivePanelProps) {
  if (sessions.length === 0) {
    return (
      <div className="space-y-2 rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-10 text-center">
        <p className="text-sm text-white/50">No live session right now.</p>
        <p className="text-xs text-white/35">
          Past live history isn’t available on public profiles yet.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {sessions.map((session) => {
        const showLive = Boolean(session.isLiveNow ?? isLive);
        return (
          <li key={session.streamId}>
            <Link
              href={buildLiveStreamHref(session.streamId)}
              className="watch-focus-ring group flex flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#080816]/70 transition hover:border-white/20 sm:flex-row"
            >
              <div
                className={`relative min-h-[9rem] flex-1 bg-gradient-to-br sm:min-h-0 sm:w-56 sm:shrink-0 ${session.previewGradient}`}
              >
                {showLive ? (
                  <span className="absolute left-3 top-3">
                    <ProfileLiveBadge />
                  </span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col justify-center gap-2 p-4 sm:p-5">
                <p className="text-base font-black tracking-tight group-hover:text-white">
                  {session.title}
                </p>
                <p className="text-sm text-white/50">
                  {[session.city, session.country].filter(Boolean).join(", ") ||
                    "Live"}
                  {" · "}
                  {session.viewersLabel} watching
                </p>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200/80">
                  Open live stream
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
