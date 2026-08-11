import { getAiDataPlatformService } from "../../../../lib/aiDataPlatform";
import AiDataPlatformShell from "../AiDataPlatformShell";
import { requireAiDataPlatformAdmin } from "../requireAiDataPlatformAdmin";

export const metadata = { title: "Dataset Versions | UMTUBA" };

export default async function AiDatasetVersionsPage() {
  await requireAiDataPlatformAdmin();
  const versions = getAiDataPlatformService().listVersions();

  return (
    <AiDataPlatformShell title="Dataset Versions">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h2 className="text-lg font-black">Version lineage</h2>
        <ul className="mt-4 divide-y divide-white/10">
          {versions.map((v) => (
            <li key={v.id} className="py-3">
              <p className="font-mono text-xs text-blue-100">{v.id}</p>
              <p className="mt-1 font-semibold">
                {v.datasetId} · v{v.version}
                {v.approved ? " · approved" : " · pending"}
              </p>
              <p className="mt-1 text-sm text-white/55">{v.changes}</p>
              <p className="mt-2 text-[11px] text-white/45">
                parent {v.parentVersion ?? "—"} · from {v.createdFrom ?? "—"} ·{" "}
                {v.sizeBytes} B
              </p>
            </li>
          ))}
        </ul>
      </section>
    </AiDataPlatformShell>
  );
}
