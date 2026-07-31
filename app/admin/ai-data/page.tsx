import {
  getAiDataPlatformService,
  listDatasetBuilderContracts,
} from "../../../lib/aiDataPlatform";
import AiDataPlatformShell from "./AiDataPlatformShell";
import { requireAiDataPlatformAdmin } from "./requireAiDataPlatformAdmin";

export const metadata = {
  title: "AI Data Platform | UMTUBA",
};

export default async function AiDataPlatformOverviewPage() {
  await requireAiDataPlatformAdmin();
  const svc = getAiDataPlatformService();
  const state = svc.getState();
  const builders = listDatasetBuilderContracts();

  return (
    <AiDataPlatformShell
      title="AI Data Platform"
      subtitle="Model lifecycle registry — read-only"
    >
      <section className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h1 className="text-xl font-black">Foundation V1</h1>
          <p className="mt-2 text-sm text-white/55">
            Dataset → Builder → Evaluation → Experiment → Model → Promotion →
            Production. Registry only — no training or inference changes.
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            {[
              ["Datasets", state.datasets.length],
              ["Versions", state.versions.length],
              ["Eval sets", state.evaluationSets.length],
              ["Experiments", state.experiments.length],
              ["Models", state.models.length],
              ["Promotion queue", state.promotionQueue.length],
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
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="text-lg font-black">Dataset Builder contracts</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {builders.map((b) => (
              <li
                key={b.kind}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm"
              >
                <p className="font-bold">{b.label}</p>
                <p className="mt-1 text-xs text-white/50">{b.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </AiDataPlatformShell>
  );
}
