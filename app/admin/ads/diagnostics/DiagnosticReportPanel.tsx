"use client";

import { useMemo, useState } from "react";
import type { AdsDiagnosticReportV1 } from "../../../../lib/ads/diagnosticRunner";

type Props = {
  report: AdsDiagnosticReportV1;
};

export default function DiagnosticReportPanel({ report }: Props) {
  const [candidateFilter, setCandidateFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState("");

  const filteredCandidates = useMemo(() => {
    const q = candidateFilter.trim().toLowerCase();
    if (!q) return report.loadedCandidates;
    return report.loadedCandidates.filter((candidate) =>
      [
        candidate.candidateId,
        candidate.campaignRef,
        candidate.adSetRef,
        candidate.adRef,
        candidate.creativeRef,
        candidate.placementId,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [candidateFilter, report.loadedCandidates]);

  const filteredReasons = useMemo(() => {
    const q = reasonFilter.trim().toLowerCase();
    if (!q) return report.rejectionReasons;
    return report.rejectionReasons.filter((reason) =>
      reason.toLowerCase().includes(q)
    );
  }, [reasonFilter, report.rejectionReasons]);

  return (
    <div className="mt-6 space-y-4">
      <section className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-50">
        Diagnostics only — productionAccepted / delivery / billing remain off.
        No ads are rendered to users.
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-sm font-black uppercase tracking-[0.16em] text-white/50">
          Final canonical decision
        </h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-white/40">Stack accepted</dt>
            <dd className="font-bold">
              {String(report.finalCanonicalDecision.stackAccepted)}
            </dd>
          </div>
          <div>
            <dt className="text-white/40">Pipeline stage</dt>
            <dd className="font-bold">
              {report.finalCanonicalDecision.pipelineStage ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-white/40">Rejection</dt>
            <dd className="font-bold">
              {report.finalCanonicalDecision.rejectionReason ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-white/40">Candidate</dt>
            <dd className="font-mono text-xs">
              {report.finalCanonicalDecision.candidateId ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-white/40">productionAccepted</dt>
            <dd className="font-bold">{String(report.productionAccepted)}</dd>
          </div>
          <div>
            <dt className="text-white/40">deliveryEnabled</dt>
            <dd className="font-bold">{String(report.deliveryEnabled)}</dd>
          </div>
          <div>
            <dt className="text-white/40">billingEnabled</dt>
            <dd className="font-bold">{String(report.billingEnabled)}</dd>
          </div>
          <div>
            <dt className="text-white/40">Correlation</dt>
            <dd className="font-mono text-xs break-all">{report.correlationId}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-black uppercase tracking-[0.16em] text-white/50">
            Loaded candidates ({filteredCandidates.length})
          </h2>
          <label className="block text-xs text-white/50">
            Filter candidates
            <input
              value={candidateFilter}
              onChange={(event) => setCandidateFilter(event.target.value)}
              className="mt-1 block w-56 rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
              placeholder="id / campaign / creative"
            />
          </label>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {filteredCandidates.map((candidate) => (
            <li
              key={candidate.candidateId}
              className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs"
            >
              <div>{candidate.candidateId}</div>
              <div className="mt-1 text-white/50">
                {candidate.placementId} · campaign {candidate.campaignRef} · ad{" "}
                {candidate.adRef} · creative {candidate.creativeRef} (
                {candidate.creativeType})
              </div>
            </li>
          ))}
          {filteredCandidates.length === 0 ? (
            <li className="text-white/50">No candidates match this filter.</li>
          ) : null}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-sm font-black uppercase tracking-[0.16em] text-white/50">
            Rejection reasons ({filteredReasons.length})
          </h2>
          <label className="block text-xs text-white/50">
            Filter reasons
            <input
              value={reasonFilter}
              onChange={(event) => setReasonFilter(event.target.value)}
              className="mt-1 block w-56 rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm text-white"
              placeholder="eligibility / bridge / gate"
            />
          </label>
        </div>
        <ul className="mt-3 max-h-64 space-y-1 overflow-auto text-xs text-white/70">
          {filteredReasons.map((reason) => (
            <li key={reason} className="font-mono">
              {reason}
            </li>
          ))}
          {filteredReasons.length === 0 ? (
            <li>No rejection reasons match this filter.</li>
          ) : null}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-sm font-black uppercase tracking-[0.16em] text-white/50">
          Decision trace
        </h2>
        <ul className="mt-3 space-y-1 text-xs font-mono text-white/70">
          {(report.decisionTrace?.stages ?? []).map((stage) => (
            <li key={`${stage.stage}-${stage.status}`}>
              {stage.stage}: {stage.status}
              {stage.rejectionReason ? ` (${stage.rejectionReason})` : ""}
              {stage.candidateId ? ` · ${stage.candidateId}` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="text-sm font-black uppercase tracking-[0.16em] text-white/50">
          Provenance & handoffs
        </h2>
        <pre className="mt-3 max-h-96 overflow-auto rounded-xl bg-black/40 p-3 text-[11px] leading-relaxed text-white/70">
          {JSON.stringify(
            {
              provenance: report.provenance,
              correlation: report.correlation,
              eligibility: report.eligibility,
              rankingInputs: report.rankingInputs,
              auctionInputs: report.auctionInputs,
              fraudIvtDecision: report.fraudIvtDecision,
              renderEligibility: report.renderEligibility,
              deliveryGate: report.deliveryGate,
              measurementHandoff: report.measurementHandoff,
              billingHandoff: report.billingHandoff,
              servingLifecycle: report.servingLifecycle,
            },
            null,
            2
          )}
        </pre>
      </section>
    </div>
  );
}
