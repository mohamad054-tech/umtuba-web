import { getAiDataWorkflowService } from "../../../../lib/aiDataPlatform";
import AiDataPlatformShell from "../AiDataPlatformShell";
import { requireAiDataPlatformAdmin } from "../requireAiDataPlatformAdmin";

export const metadata = { title: "AI Data Audit Trail | UMTUBA" };

export default async function AiDataAuditPage() {
  await requireAiDataPlatformAdmin();
  const trail = getAiDataWorkflowService().listAuditTrail().slice(0, 100);

  return (
    <AiDataPlatformShell title="Audit Trail">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h1 className="text-lg font-black">Workflow audit</h1>
        <p className="mt-2 text-sm text-white/50">
          Every state transition is recorded. Never automatic.
        </p>
        <ul className="mt-4 divide-y divide-white/10">
          {trail.map((e) => (
            <li key={e.id} className="py-3 text-sm">
              <p className="font-mono text-xs text-blue-100">{e.id}</p>
              <p className="mt-1 font-semibold">
                {e.action}
                {e.previousState || e.newState
                  ? ` · ${e.previousState ?? "—"} → ${e.newState ?? "—"}`
                  : ""}
              </p>
              <p className="mt-1 text-[11px] text-white/45">
                {e.timestamp} · actor {e.actorId ?? "—"} · dataset{" "}
                {e.datasetId ?? "—"} · version {e.versionId ?? "—"}
              </p>
              {e.reason ? (
                <p className="mt-1 text-xs text-white/55">reason: {e.reason}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </AiDataPlatformShell>
  );
}
