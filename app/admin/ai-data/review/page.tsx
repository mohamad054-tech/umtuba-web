import { getAiDataWorkflowService } from "../../../../lib/aiDataPlatform";
import AiDataPlatformShell from "../AiDataPlatformShell";
import { requireAiDataPlatformAdmin } from "../requireAiDataPlatformAdmin";

export const metadata = { title: "AI Data Review | UMTUBA" };

function DatasetList({
  title,
  items,
}: {
  title: string;
  items: Array<{ id: string; name: string; version: string; status: string }>;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
      <h2 className="font-black">
        {title}{" "}
        <span className="text-white/40">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-white/45">None</p>
      ) : (
        <ul className="mt-3 divide-y divide-white/10">
          {items.map((d) => (
            <li key={d.id} className="py-2 text-sm">
              <p className="font-mono text-xs text-blue-100">{d.id}</p>
              <p className="mt-1">
                {d.name} · v{d.version} · {d.status}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function AiDataReviewPage() {
  await requireAiDataPlatformAdmin();
  const dash = getAiDataWorkflowService().dashboard();

  return (
    <AiDataPlatformShell title="Review Dashboard">
      <section className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h1 className="text-lg font-black">Workflow review</h1>
          <p className="mt-2 text-sm text-white/50">
            End-to-end governed dataset lifecycle — no training executed.
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            {[
              ["Draft", dash.draftDatasets.length],
              ["Review queue", dash.reviewQueue.length],
              ["Approved", dash.approvedDatasets.length],
              ["Rejected", dash.rejectedDatasets.length],
              ["Model candidates", dash.modelCandidates.length],
              ["Experiment candidates", dash.experimentCandidates.length],
              ["Promotion queue", dash.promotionQueueCount],
            ].map(([label, value]) => (
              <div key={String(label)}>
                <dt className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                  {label}
                </dt>
                <dd className="mt-1 text-2xl font-black">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <DatasetList title="Draft datasets" items={dash.draftDatasets} />
        <DatasetList title="Review queue" items={dash.reviewQueue} />
        <DatasetList title="Approved datasets" items={dash.approvedDatasets} />
        <DatasetList title="Rejected datasets" items={dash.rejectedDatasets} />

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="font-black">Model candidates</h2>
          <ul className="mt-3 divide-y divide-white/10 text-sm">
            {dash.modelCandidates.length === 0 ? (
              <li className="py-2 text-white/45">None</li>
            ) : (
              dash.modelCandidates.map((m) => (
                <li key={m.id} className="py-2">
                  <p className="font-mono text-xs text-blue-100">{m.id}</p>
                  <p className="mt-1">
                    model {m.modelId} · version {m.datasetVersionId} ·{" "}
                    {m.promotionEligible ? "promotion eligible" : "blocked"}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="font-black">Experiment candidates</h2>
          <ul className="mt-3 divide-y divide-white/10 text-sm">
            {dash.experimentCandidates.length === 0 ? (
              <li className="py-2 text-white/45">None</li>
            ) : (
              dash.experimentCandidates.map((e) => (
                <li key={e.id} className="py-2">
                  <p className="font-mono text-xs text-blue-100">{e.id}</p>
                  <p className="mt-1">
                    dataset {e.candidateDatasetId} · {e.status}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    </AiDataPlatformShell>
  );
}
