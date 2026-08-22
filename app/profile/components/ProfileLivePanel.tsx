"use client";

import Link from "next/link";
import { useTranslation } from "../../components/i18n";
import { LIVE_BUCKET_I18N_KEYS } from "../../../lib/i18n/profileChrome";
import { buildLiveStreamHref } from "../../lib/nav";
import {
  bucketProfileLiveSessions,
  getVisibleLiveBuckets,
  type LiveBucketId,
} from "../lib/profileAboutLiveStructure";
import ProfileLiveBadge from "./ProfileLiveBadge";
import ProfilePanelError from "./ProfilePanelError";
import type { ProfileLivePreview } from "../types";

type ProfileLivePanelProps = {
  sessions: ProfileLivePreview[];
  isLive: boolean;
  loadFailed?: boolean;
  onRetry?: () => void;
};

function SessionCard({
  session,
  bucket,
}: {
  session: ProfileLivePreview;
  bucket: LiveBucketId;
}) {
  const { t } = useTranslation();
  const showLive = bucket === "now";
  const metaParts = [
    [session.city, session.country].filter(Boolean).join(", ") || t("profile.live"),
    bucket === "now"
      ? t("profile.watching", { values: { count: session.viewersLabel } })
      : bucket === "upcoming"
        ? session.scheduledLabel || t("profile.scheduled")
        : session.viewersLabel
          ? t("profile.watched", { values: { count: session.viewersLabel } })
          : t("profile.ended"),
  ];

  return (
    <Link
      href={buildLiveStreamHref(session.streamId)}
      className={`watch-focus-ring group flex flex-col overflow-hidden rounded-[24px] border bg-[#080816]/70 transition hover:border-white/20 sm:flex-row ${
        showLive
          ? "border-red-400/25 shadow-[0_0_0_1px_rgba(248,113,113,0.12)]"
          : "border-white/10"
      }`}
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
          {session.title || t("profile.liveNow")}
        </p>
        <p className="text-sm text-white/50">{metaParts.join(" · ")}</p>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-200/80">
          {bucket === "now"
            ? t("profile.joinLive")
            : bucket === "upcoming"
              ? t("profile.viewLobby")
              : t("profile.openSession")}
        </p>
      </div>
    </Link>
  );
}

/**
 * Live tab — Now / Upcoming / Past buckets (Creator Space Experience V1 §13).
 * Structure readiness only; does not invent ended history from the backend.
 * Empty buckets omit their headers.
 */
export default function ProfileLivePanel({
  sessions,
  isLive,
  loadFailed = false,
  onRetry,
}: ProfileLivePanelProps) {
  const { t } = useTranslation();
  if (loadFailed) {
    return <ProfilePanelError message={t("profile.errorLive")} onRetry={onRetry} />;
  }

  const buckets = bucketProfileLiveSessions(sessions, isLive);
  const visible = getVisibleLiveBuckets(buckets);

  if (visible.length === 0) {
    return (
      <div className="space-y-2 rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-10 text-center">
        <p className="text-sm text-white/50">{t("profile.emptyLive")}</p>
        <p className="text-xs text-white/35">{t("profile.emptyLiveHint")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {visible.map((bucketId) => (
        <section key={bucketId} className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">
              {t(LIVE_BUCKET_I18N_KEYS[bucketId])}
            </p>
            {bucketId === "now" ? <ProfileLiveBadge /> : null}
          </div>
          <ul className="space-y-3">
            {buckets[bucketId].map((session) => (
              <li key={session.streamId}>
                <SessionCard session={session} bucket={bucketId} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
