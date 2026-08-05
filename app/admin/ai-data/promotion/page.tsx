import { getAiDataPlatformService } from "../../../../lib/aiDataPlatform";
import AiDataPlatformShell from "../AiDataPlatformShell";
import { requireAiDataPlatformAdmin } from "../requireAiDataPlatformAdmin";

export const metadata = { title: "Promotion Queue | UMTUBA" };

export default async function AiPromotionQueuePage() {
  await requireAiDataPlatformAdmin();
  const queue = getAiDataPlatformService().listPromotionQueue();

  return (
    <AiDataPlatformShell title="Promotion Queue">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h1 className="text-lg font-black">Promotion gates</h1>
        <p className="mt-2 text-sm text-white/50">
          Never automatic — dataset, rights, quality, evaluation, and human
          approval required.
        </p>
        <ul className="mt-4 divide-y divide-white/10">
          {queue.map((p) => (
            <li key={p.id} className="py-3">
              <p className="font-mono text-xs text-blue-100">{p.id}</p>
              <p className="mt-1 font-semibold">
                {p.modelId}: {p.fromStatus} → {p.toStatus}
              </p>
              <p className="mt-1 text-sm text-white/55">
                {p.eligible ? "eligible" : "blocked"}
                {p.blockers.length > 0 ? ` · ${p.blockers.join(", ")}` : ""}
              </p>
              <p className="mt-2 text-[11px] text-white/45">
                checklist: dataset {String(p.checklist.datasetApproved)} ·
                rights {String(p.checklist.rightsApproved)} · quality{" "}
                {String(p.checklist.qualityApproved)} · eval{" "}
                {String(p.checklist.evaluationApproved)} · human{" "}
                {String(p.checklist.humanApproved)}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </AiDataPlatformShell>
  );
}
