import { getAiDataPlatformService } from "../../../../lib/aiDataPlatform";
import AiDataPlatformShell from "../AiDataPlatformShell";
import { requireAiDataPlatformAdmin } from "../requireAiDataPlatformAdmin";

export const metadata = { title: "AI Datasets | UMTUBA" };

export default async function AiDatasetsPage() {
  await requireAiDataPlatformAdmin();
  const datasets = getAiDataPlatformService().listDatasets();

  return (
    <AiDataPlatformShell title="Datasets">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h2 className="text-lg font-black">Dataset registry</h2>
        <ul className="mt-4 divide-y divide-white/10">
          {datasets.map((d) => (
            <li key={d.id} className="py-3">
              <p className="font-mono text-xs text-blue-100">{d.id}</p>
              <p className="mt-1 font-semibold">
                {d.name} · v{d.version}
              </p>
              <p className="mt-1 text-sm text-white/55">{d.description}</p>
              <p className="mt-2 text-[11px] text-white/45">
                {d.kind} · {d.status} · rights {d.rights.status} ·{" "}
                {d.eligibility.join(", ")} · {d.languages.join(", ")}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </AiDataPlatformShell>
  );
}
