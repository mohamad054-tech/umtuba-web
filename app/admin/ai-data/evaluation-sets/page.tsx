import { getAiDataPlatformService } from "../../../../lib/aiDataPlatform";
import AiDataPlatformShell from "../AiDataPlatformShell";
import { requireAiDataPlatformAdmin } from "../requireAiDataPlatformAdmin";

export const metadata = { title: "Evaluation Sets | UMTUBA" };

export default async function AiEvaluationSetsPage() {
  await requireAiDataPlatformAdmin();
  const sets = getAiDataPlatformService().listEvaluationSets();

  return (
    <AiDataPlatformShell title="Evaluation Sets">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h2 className="text-lg font-black">Evaluation set registry</h2>
        <p className="mt-2 text-sm text-white/50">
          Contracts only — benchmarks are not executed in V1.
        </p>
        <ul className="mt-4 divide-y divide-white/10">
          {sets.map((s) => (
            <li key={s.id} className="py-3">
              <p className="font-mono text-xs text-blue-100">{s.id}</p>
              <p className="mt-1 font-semibold">
                {s.name} · {s.kind}
              </p>
              <p className="mt-1 text-sm text-white/55">{s.description}</p>
              <p className="mt-2 text-[11px] text-white/45">
                {s.status} · {s.itemCount} items · {s.languages.join(", ")}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </AiDataPlatformShell>
  );
}
