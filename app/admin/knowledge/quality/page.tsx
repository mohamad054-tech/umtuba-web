import { getKnowledgeAcquisitionService } from "../../../../lib/knowledgeAcquisition";
import KnowledgeAcquisitionShell from "../KnowledgeAcquisitionShell";
import { requireKnowledgeAcquisitionAdmin } from "../requireKnowledgeAcquisitionAdmin";

export const metadata = {
  title: "Knowledge Quality | UMTUBA",
};

export default async function KnowledgeQualityPage() {
  await requireKnowledgeAcquisitionAdmin();
  const assets = getKnowledgeAcquisitionService().listAssets();

  return (
    <KnowledgeAcquisitionShell title="Quality">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h2 className="text-lg font-black">Quality evaluation</h2>
        <ul className="mt-4 space-y-4">
          {assets.map((a) => (
            <li
              key={a.id}
              className="rounded-xl border border-white/10 px-3 py-3"
            >
              <p className="font-semibold">{a.title}</p>
              <p className="mt-1 text-sm text-white/55">
                overall {(a.quality.overallScore * 100).toFixed(0)}% · mode{" "}
                {a.quality.scoringMode}
              </p>
              {a.quality.blockingFindings.length > 0 ? (
                <p className="mt-1 text-xs text-amber-200">
                  blocking: {a.quality.blockingFindings.join(", ")}
                </p>
              ) : null}
              <ul className="mt-2 grid gap-1 text-[11px] text-white/45 sm:grid-cols-2">
                {a.quality.dimensions.map((d) => (
                  <li key={d.id}>
                    {d.id}: {(d.score * 100).toFixed(0)}%
                    {d.blocking ? " (blocking)" : ""}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </KnowledgeAcquisitionShell>
  );
}
