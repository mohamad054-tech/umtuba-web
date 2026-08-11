import { getAiDataPlatformService } from "../../../../lib/aiDataPlatform";
import AiDataPlatformShell from "../AiDataPlatformShell";
import { requireAiDataPlatformAdmin } from "../requireAiDataPlatformAdmin";

export const metadata = { title: "AI Experiments | UMTUBA" };

export default async function AiExperimentsPage() {
  await requireAiDataPlatformAdmin();
  const experiments = getAiDataPlatformService().listExperiments();

  return (
    <AiDataPlatformShell title="Experiments">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h2 className="text-lg font-black">Experiment registry</h2>
        <p className="mt-2 text-sm text-white/50">
          Records only — no training runs are executed in V1.
        </p>
        <ul className="mt-4 divide-y divide-white/10">
          {experiments.map((e) => (
            <li key={e.id} className="py-3">
              <p className="font-mono text-xs text-blue-100">{e.id}</p>
              <p className="mt-1 font-semibold">
                {e.modelFamily} · {e.status}
              </p>
              <p className="mt-1 text-sm text-white/55">{e.notes || "—"}</p>
              <p className="mt-2 text-[11px] text-white/45">
                dataset version {e.datasetVersionId} · owner {e.owner ?? "—"}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </AiDataPlatformShell>
  );
}
