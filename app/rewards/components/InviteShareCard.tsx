"use client";

import { useState } from "react";
import type { ReferralStats } from "../../../lib/supabase/referral";
import { sanitizeUserFacingMessage } from "../../lib/product/userFacingMessage";

type InviteShareCardProps = {
  stats: ReferralStats;
};

export default function InviteShareCard({ stats }: InviteShareCardProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  async function copyLink() {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(stats.inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
      setCopyError(
        sanitizeUserFacingMessage(
          "Couldn't copy the invite link. Please copy it manually.",
          "Couldn't copy the invite link. Please copy it manually."
        )
      );
    }
  }

  return (
    <div className="mt-8 rounded-2xl border border-cyan-400/20 bg-cyan-500/5 px-4 py-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-200/70">
        Invite friends
      </p>
      <h2 className="mt-1 text-lg font-black tracking-tight text-white">
        Share your invitation link
      </h2>
      <p className="mt-2 text-sm text-white/55">
        Earn {stats.pointsPerSignup} UM Points when someone creates an account
        through your link
        {stats.growthMode ? " — credited immediately." : "."}
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 truncate rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-xs text-cyan-50">
          {stats.inviteUrl}
        </code>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="watch-focus-ring shrink-0 rounded-xl border border-cyan-300/30 bg-cyan-400/15 px-4 py-2.5 text-xs font-bold text-cyan-50 transition hover:bg-cyan-400/25"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>

      <p className="sr-only" aria-live="polite">
        {copied ? "Invite link copied" : copyError ?? ""}
      </p>
      {copyError ? (
        <p className="mt-2 text-xs font-medium text-red-300" role="alert">
          {copyError}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
            Your code
          </p>
          <p className="mt-1 font-mono text-sm font-black text-white">
            {stats.code}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
            Successful invites
          </p>
          <p className="mt-1 text-sm font-black text-white">
            {stats.successfulReferrals}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 sm:col-span-1 col-span-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">
            Points from invites
          </p>
          <p className="mt-1 text-sm font-black text-white">
            {stats.pointsEarned}
          </p>
        </div>
      </div>
    </div>
  );
}
