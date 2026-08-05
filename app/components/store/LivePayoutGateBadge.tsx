/**
 * Live payout production gate badge (Slice S6).
 * Safe redacted readiness only — never secrets or env values.
 */

import type { SellerLivePayoutGateReadinessReport } from "../../../lib/store/sellerLivePayout";

export type LivePayoutGateBadgeProps = {
  report: SellerLivePayoutGateReadinessReport;
};

function gateTone(
  report: SellerLivePayoutGateReadinessReport
): "enabled" | "disabled" | "incomplete" {
  if (report.ready) return "enabled";
  if (!report.livePayoutsEnabledFlag) return "disabled";
  return "incomplete";
}

const TONE_CLASS: Record<"enabled" | "disabled" | "incomplete", string> = {
  enabled: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
  disabled: "border-white/15 bg-white/[0.04] text-white/60",
  incomplete: "border-amber-400/30 bg-amber-500/10 text-amber-100",
};

export default function LivePayoutGateBadge({ report }: LivePayoutGateBadgeProps) {
  const tone = gateTone(report);
  const label =
    tone === "enabled"
      ? "Live payouts enabled"
      : tone === "disabled"
        ? "Live payouts disabled"
        : "Live payout gate incomplete";

  const reasons =
    tone === "enabled"
      ? []
      : report.issues.map((issue) => issue.replace(/_/g, " "));

  return (
    <div
      className={`rounded-[28px] border px-5 py-4 ${TONE_CLASS[tone]}`}
      data-live-payout-gate={tone}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">
            Production gate
          </p>
          <p className="mt-1 text-sm font-black tracking-tight">{label}</p>
        </div>
        <span className="rounded-full border border-current/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wide">
          {tone}
        </span>
      </div>
      {reasons.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs opacity-80">
          {reasons.map((reason) => (
            <li key={reason}>• {reason}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs opacity-75">
          Provider {report.v1ProviderId} · env {report.appEnvironment}
        </p>
      )}
    </div>
  );
}
