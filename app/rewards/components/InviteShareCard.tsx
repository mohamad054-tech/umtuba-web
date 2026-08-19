"use client";

import { useState } from "react";
import type { ReferralStats } from "../../../lib/supabase/referral";
import { buildWhatsAppShareUrl } from "../../../lib/rewards/engine";
import { sanitizeUserFacingMessage } from "../../lib/product/userFacingMessage";

export type InviteShareLabels = {
  title: string;
  body: string;
  copy: string;
  copied: string;
  copyError: string;
  shareWhatsApp: string;
  code: string;
  successful: string;
  pending: string;
  points: string;
};

type InviteShareCardProps = {
  stats: ReferralStats;
  labels: InviteShareLabels;
};

export default function InviteShareCard({ stats, labels }: InviteShareCardProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const whatsappHref = buildWhatsAppShareUrl(stats.inviteUrl, labels.body);

  async function copyLink() {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(stats.inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyError(
        sanitizeUserFacingMessage(labels.copyError, labels.copyError)
      );
    }
  }

  return (
    <div className="mt-8 rounded-2xl border border-cyan-400/20 bg-cyan-500/5 px-4 py-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-200/70">
        {labels.title}
      </p>
      <h2 className="mt-1 text-lg font-black tracking-tight text-white">
        {labels.title}
      </h2>
      <p className="mt-2 text-sm text-white/55">{labels.body}</p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 truncate rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-xs text-cyan-50">
          {stats.inviteUrl}
        </code>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="watch-focus-ring shrink-0 rounded-xl border border-cyan-300/30 bg-cyan-400/15 px-4 py-2.5 text-xs font-bold text-cyan-50 transition hover:bg-cyan-400/25"
        >
          {copied ? labels.copied : labels.copy}
        </button>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="watch-focus-ring shrink-0 rounded-xl border border-emerald-300/30 bg-emerald-400/15 px-4 py-2.5 text-center text-xs font-bold text-emerald-50 transition hover:bg-emerald-400/25"
        >
          {labels.shareWhatsApp}
        </a>
      </div>

      <p className="sr-only" aria-live="polite">
        {copied ? labels.copied : copyError ?? ""}
      </p>
      {copyError ? (
        <p className="mt-2 text-xs font-medium text-red-300" role="alert">
          {copyError}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
            {labels.code}
          </p>
          <p className="mt-1 font-mono text-sm font-black text-white">
            {stats.code}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
            {labels.successful}
          </p>
          <p className="mt-1 text-sm font-black text-white">
            {stats.successfulReferrals}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
            {labels.pending}
          </p>
          <p className="mt-1 text-sm font-black text-white">
            {stats.pendingReferrals}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
            {labels.points}
          </p>
          <p className="mt-1 text-sm font-black text-white">
            {stats.pointsEarned}
          </p>
        </div>
      </div>
    </div>
  );
}
