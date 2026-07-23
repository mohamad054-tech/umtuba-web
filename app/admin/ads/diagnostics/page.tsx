import { AD_PLACEMENTS } from "../../../../lib/ads/constants";
import {
  ADS_DIAGNOSTIC_RUNNER_CONTRACT_VERSION,
  type AdsDiagnosticReportV1,
} from "../../../../lib/ads/diagnosticRunner";
import { executeAdsDiagnosticRunnerV1 } from "../../../../lib/ads/diagnosticRunnerServer";
import { APP_ROUTES } from "../../../lib/nav";
import AdminAdsShell, { FlashMessages } from "../AdminAdsShell";
import { requireAdminAdsSession } from "../requireAdminAds";
import DiagnosticReportPanel from "./DiagnosticReportPanel";

export const metadata = {
  title: "Ads Diagnostics | UMTUBA",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function param(value: string | string[] | undefined): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value) && typeof value[0] === "string") {
    return value[0].trim();
  }
  return "";
}

export default async function AdminAdsDiagnosticsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { supabase, user } = await requireAdminAdsSession();
  const params = await searchParams;

  const advertiserAccountId = param(params.advertiserId);
  const placement = param(params.placement) || "watch_feed";
  const campaignId = param(params.campaignId);
  const adSetId = param(params.adSetId);
  const candidateLimitRaw = param(params.candidateLimit);
  const correlationId = param(params.correlationId);
  const run = param(params.run) === "1";

  let report: AdsDiagnosticReportV1 | null = null;
  let error: string | undefined;

  if (run) {
    const candidateLimit = candidateLimitRaw
      ? Number.parseInt(candidateLimitRaw, 10)
      : null;
    const outcome = await executeAdsDiagnosticRunnerV1(supabase, {
      adminUserId: user.id,
      request: {
        contractVersion: ADS_DIAGNOSTIC_RUNNER_CONTRACT_VERSION,
        advertiserAccountId,
        placement,
        campaignId: campaignId || null,
        adSetId: adSetId || null,
        candidateLimit:
          candidateLimit != null && Number.isFinite(candidateLimit)
            ? candidateLimit
            : null,
        correlationId: correlationId || null,
        currentTimestamp: new Date().toISOString(),
      },
    });
    if (!outcome.ok) {
      error = outcome.message;
    } else {
      report = outcome.report;
    }
  }

  return (
    <AdminAdsShell title="Ads diagnostics">
      <FlashMessages error={error} />

      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h1 className="text-2xl font-black tracking-tight">
          Diagnostic Runner
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Internal operator tool. Loads persisted inventory through the Inventory
          Bridge and executes <code>runAdsCanonicalStackV1</code> for inspection
          only. Delivery, billing, measurement ingestion, and user rendering stay
          disabled. Authorization is re-checked via the platform-admin database
          RPC at the execution boundary.
        </p>

        <form
          method="get"
          action={APP_ROUTES.adminAdsDiagnostics}
          className="mt-6 grid gap-3 md:grid-cols-2"
        >
          <input type="hidden" name="run" value="1" />
          <label className="block text-xs font-bold uppercase tracking-[0.14em] text-white/40">
            Advertiser account id
            <input
              name="advertiserId"
              required
              defaultValue={advertiserAccountId}
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm font-normal normal-case tracking-normal text-white"
              placeholder="uuid"
            />
          </label>
          <label className="block text-xs font-bold uppercase tracking-[0.14em] text-white/40">
            Placement
            <select
              name="placement"
              defaultValue={placement}
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm font-normal normal-case tracking-normal text-white"
            >
              {AD_PLACEMENTS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold uppercase tracking-[0.14em] text-white/40">
            Campaign id (optional)
            <input
              name="campaignId"
              defaultValue={campaignId}
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm font-normal normal-case tracking-normal text-white"
            />
          </label>
          <label className="block text-xs font-bold uppercase tracking-[0.14em] text-white/40">
            Ad set id (optional)
            <input
              name="adSetId"
              defaultValue={adSetId}
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm font-normal normal-case tracking-normal text-white"
            />
          </label>
          <label className="block text-xs font-bold uppercase tracking-[0.14em] text-white/40">
            Candidate limit (optional)
            <input
              name="candidateLimit"
              defaultValue={candidateLimitRaw}
              inputMode="numeric"
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm font-normal normal-case tracking-normal text-white"
              placeholder="1–64"
            />
          </label>
          <label className="block text-xs font-bold uppercase tracking-[0.14em] text-white/40">
            Correlation id (optional)
            <input
              name="correlationId"
              defaultValue={correlationId}
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm font-normal normal-case tracking-normal text-white"
              placeholder="A-Za-z0-9_.:- (max 128)"
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              className="watch-focus-ring rounded-full bg-emerald-300 px-5 py-2.5 text-sm font-black text-black"
            >
              Run diagnostics
            </button>
          </div>
        </form>
      </section>

      {report ? <DiagnosticReportPanel report={report} /> : null}
    </AdminAdsShell>
  );
}
