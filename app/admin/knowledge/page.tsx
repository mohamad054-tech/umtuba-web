import { getKnowledgeAcquisitionService } from "../../../lib/knowledgeAcquisition";
import KnowledgeAcquisitionShell from "./KnowledgeAcquisitionShell";
import { requireKnowledgeAcquisitionAdmin } from "./requireKnowledgeAcquisitionAdmin";

export const metadata = {
  title: "Knowledge Acquisition | UMTUBA",
};

export default async function KnowledgeAcquisitionOverviewPage() {
  await requireKnowledgeAcquisitionAdmin();
  const svc = getKnowledgeAcquisitionService();
  const state = svc.getState();

  return (
    <KnowledgeAcquisitionShell
      title="Knowledge Acquisition"
      subtitle="Platform foundation — read-only"
    >
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h1 className="text-xl font-black">Foundation V1</h1>
        <p className="mt-2 text-sm text-white/55">
          Acquire, classify, evaluate, govern, and reuse knowledge under fail-closed
          rights. Not model training. Not scraping. Not external dataset download.
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          {[
            ["Sources", state.sources.length],
            ["Assets", state.assets.length],
            ["Datasets", state.datasets.length],
            ["Graph nodes", state.graphNodes.length],
            ["Graph edges", state.graphEdges.length],
            ["History", state.history.length],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <dt className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                {label}
              </dt>
              <dd className="mt-1 text-2xl font-black">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </KnowledgeAcquisitionShell>
  );
}
