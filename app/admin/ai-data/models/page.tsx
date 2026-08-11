import { getAiDataPlatformService } from "../../../../lib/aiDataPlatform";
import AiDataPlatformShell from "../AiDataPlatformShell";
import { requireAiDataPlatformAdmin } from "../requireAiDataPlatformAdmin";

export const metadata = { title: "Model Registry | UMTUBA" };

export default async function AiModelsPage() {
  await requireAiDataPlatformAdmin();
  const models = getAiDataPlatformService().listModels();

  return (
    <AiDataPlatformShell title="Models">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h2 className="text-lg font-black">Model registry</h2>
        <p className="mt-2 text-sm text-white/50">
          Lifecycle metadata only — inference runtime unchanged.
        </p>
        <ul className="mt-4 divide-y divide-white/10">
          {models.map((m) => (
            <li key={m.id} className="py-3">
              <p className="font-mono text-xs text-blue-100">{m.id}</p>
              <p className="mt-1 font-semibold">
                {m.family} · {m.version}
              </p>
              <p className="mt-2 text-[11px] text-white/45">
                {m.provider} · {m.architecture} · lifecycle {m.lifecycle} ·
                rollback {m.rollbackTargetId ?? "—"}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </AiDataPlatformShell>
  );
}
