import { getKnowledgeAcquisitionService } from "../../../../lib/knowledgeAcquisition";
import KnowledgeAcquisitionShell from "../KnowledgeAcquisitionShell";
import { requireKnowledgeAcquisitionAdmin } from "../requireKnowledgeAcquisitionAdmin";

export const metadata = {
  title: "Knowledge Datasets | UMTUBA",
};

export default async function KnowledgeDatasetsPage() {
  await requireKnowledgeAcquisitionAdmin();
  const datasets = getKnowledgeAcquisitionService().listDatasets();

  return (
    <KnowledgeAcquisitionShell title="Datasets">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h2 className="text-lg font-black">Dataset registry</h2>
        <p className="mt-2 text-sm text-white/50">
          Dataset eligibility is governance metadata only — no training runs.
        </p>
        <ul className="mt-4 divide-y divide-white/10">
          {datasets.map((d) => (
            <li key={d.id} className="py-3">
              <p className="font-mono text-xs text-blue-100">
                {d.id} · v{d.version}
              </p>
              <p className="mt-1 font-semibold">{d.name}</p>
              <p className="mt-2 text-[11px] text-white/45">
                source {d.sourceId} · {d.assetCount} assets · {d.sizeBytes} B ·
                quality {(d.qualitySummary.overallScore * 100).toFixed(0)}% ·{" "}
                {d.eligibility.join(", ")}
              </p>
              <p className="mt-1 text-[11px] text-white/40">
                domains {d.domains.join(", ")} · langs {d.languages.join(", ")}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </KnowledgeAcquisitionShell>
  );
}
